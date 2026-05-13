import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export type AgentIntent = 'workflow_launch' | 'qa' | 'draft' | 'analytics' | 'workflow_generate';

export interface ChatRequest {
  message: string;
  userId: string;
  conversationId?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  reply: string;
  intent: AgentIntent;
  /** Populated when intent === 'workflow_launch' and preview gate is active */
  previewPayload?: Record<string, unknown>;
  requiresConfirmation: boolean;
}

@Injectable()
export class VirtualAgentService {
  private readonly logger = new Logger(VirtualAgentService.name);
  private readonly systemPrompt = `
You are XBuild Virtual Agent, an intelligent assistant embedded in an ERP system.
You help users with: launching workflows, answering questions (qa), drafting documents (draft), retrieving analytics (analytics), and generating new workflow processes (workflow_generate).

When responding, ALWAYS begin your reply with one of these intent tags on its own line:
  [INTENT:workflow_launch]
  [INTENT:workflow_generate]
  [INTENT:qa]
  [INTENT:draft]
  [INTENT:analytics]

If the user wants to launch a workflow or perform a destructive action, also include a JSON block wrapped in <preview>...</preview> tags.
Example:
[INTENT:workflow_launch]
I will launch the "Purchase Order" workflow for you.
<preview>{"workflowSlug":"purchase_order","inputs":{"amount":5000}}</preview>

If the user wants to create or build a new workflow, use [INTENT:workflow_generate] and provide a JSON representation of the workflow containing 'name', 'description' and 'definition' (with nodes and edges) inside <preview>...</preview> tags.

Otherwise just reply normally after the intent tag.
`.trim();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const { message, userId, conversationId } = req;

    // ── 1. Get or create conversation ──────────────────────────────────────
    let conversation = conversationId
      ? await this.prisma.aiConversation.findFirst({
          where: { id: conversationId, userId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId,
          title: message.slice(0, 100),
        },
        include: { messages: true },
      });
    }

    // ── 2. Persist user message ────────────────────────────────────────────
    const userMsg = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    // ── 3. Build message history for OpenAI ────────────────────────────────
    const history = (conversation.messages ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    history.push({ role: 'user', content: message });

    // ── 4. Call OpenAI ─────────────────────────────────────────────────────
    const dbApiKey = await this.settings.get<string>('ai_api_key');
    const dbModel = await this.settings.get<string>('ai_model');
    const dbEndpoint = await this.settings.get<string>('ai_api_endpoint');

    const apiKey = dbApiKey || this.config.get<string>('OPENAI_API_KEY', '');
    const model = dbModel || this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    const baseURL = dbEndpoint || undefined;

    const openai = new OpenAI({ apiKey, baseURL });

    let rawReply = '';
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...history,
        ],
        temperature: 0.4,
        max_tokens: 2048,
      });
      rawReply = completion.choices[0]?.message?.content ?? '';
    } catch (err) {
      this.logger.error('OpenAI call failed', err);
      rawReply = '[INTENT:qa]\nXin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.';
    }

    // ── 5. Parse intent & preview payload ──────────────────────────────────
    const intent = this.parseIntent(rawReply);
    const previewPayload = this.parsePreview(rawReply);
    const requiresConfirmation = !!previewPayload;

    // Strip intent tag and preview block from user-visible reply
    const cleanReply = rawReply
      .replace(/\[INTENT:\w+\]\n?/, '')
      .replace(/<preview>[\s\S]*?<\/preview>/g, '')
      .trim();

    // ── 6. Persist assistant message ───────────────────────────────────────
    const assistantMsg = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: cleanReply,
        previewPayload: previewPayload ?? undefined,
        confirmed: requiresConfirmation ? false : null,
      },
    });

    // ── 7. Update conversation intent & timestamp ──────────────────────────
    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { intent, updatedAt: new Date() },
    });

    this.logger.debug(
      `chat: conversationId=${conversation.id} intent=${intent} requiresConfirmation=${requiresConfirmation}`,
    );

    return {
      conversationId: conversation.id,
      messageId: assistantMsg.id,
      reply: cleanReply,
      intent,
      ...(previewPayload ? { previewPayload } : {}),
      requiresConfirmation,
    };
  }

  /** Confirm (or reject) a pending action that required preview gate. */
  async confirmAction(messageId: string, userId: string, confirmed: boolean) {
    const msg = await this.prisma.aiMessage.findFirst({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!msg || msg.conversation.userId !== userId) {
      return { success: false };
    }

    await this.prisma.aiMessage.update({
      where: { id: messageId },
      data: { confirmed },
    });

    if (confirmed && msg.conversation.intent === 'workflow_generate' && msg.previewPayload) {
      const payload = msg.previewPayload as any;
      const wfDef = payload.definition || {};
      
      const newWf = await this.prisma.workflowDefinition.create({
        data: {
          name: payload.name || 'AI Generated Workflow',
          description: payload.description || 'Workflow created by AI Assistant',
          status: 'draft',
          createdBy: userId,
          versions: {
            create: {
              version: '1.0.0',
              jsonDefinition: wfDef,
            }
          }
        }
      });
      
      await this.prisma.workflowDefinition.update({
        where: { id: newWf.id },
        data: { currentVersion: '1.0.0' }
      });
    }

    return { success: true, confirmed };
  }

  async listConversations(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        intent: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) return null;
    return conv;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private parseIntent(raw: string): AgentIntent {
    const match = raw.match(/\[INTENT:(\w+)\]/);
    const tag = match?.[1] ?? '';
    const valid: AgentIntent[] = ['workflow_launch', 'qa', 'draft', 'analytics', 'workflow_generate'];
    return valid.includes(tag as AgentIntent) ? (tag as AgentIntent) : 'qa';
  }

  private parsePreview(raw: string): Record<string, unknown> | undefined {
    const match = raw.match(/<preview>([\s\S]*?)<\/preview>/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return undefined;
    }
  }
}
