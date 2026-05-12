import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const AI_PERSONAS: Record<string, { systemPrompt: string; name: string }> = {
  summarizer: {
    name: 'Tóm tắt',
    systemPrompt: 'Bạn là trợ lý tóm tắt văn bản. Tóm tắt ngắn gọn, rõ ràng bằng tiếng Việt.',
  },
  translator_vi: {
    name: 'Dịch sang tiếng Việt',
    systemPrompt: 'Dịch nội dung sang tiếng Việt tự nhiên, giữ nghĩa gốc.',
  },
  email_drafter: {
    name: 'Soạn email',
    systemPrompt: 'Soạn email chuyên nghiệp bằng tiếng Việt theo yêu cầu.',
  },
  data_extractor: {
    name: 'Trích xuất dữ liệu',
    systemPrompt: 'Trích xuất thông tin có cấu trúc từ văn bản. Trả về JSON.',
  },
  sentiment_analyzer: {
    name: 'Phân tích cảm xúc',
    systemPrompt: 'Phân tích cảm xúc của văn bản: positive/negative/neutral và lý do.',
  },
  classifier: {
    name: 'Phân loại',
    systemPrompt: 'Phân loại nội dung vào các nhóm được cung cấp.',
  },
  qa_responder: {
    name: 'Trả lời câu hỏi',
    systemPrompt: 'Trả lời câu hỏi dựa trên ngữ cảnh được cung cấp. Bằng tiếng Việt.',
  },
};

@Injectable()
export class AiTransformerExecutor implements INodeExecutor {
  private openai: OpenAI;

  constructor(
    private expr: ExpressionEvaluator,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: config.get<string>('AI_API_KEY', ''),
      baseURL: config.get<string>('AI_BASE_URL', 'https://api.openai.com/v1'),
    });
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      persona: string;
      promptTemplate: string;
      outputVariable: string;
      model?: string;
      maxTokens?: number;
      requiresPreview?: boolean;
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
      taskResult: ctx.context['taskResult'],
    };

    const persona = AI_PERSONAS[config.persona] ?? AI_PERSONAS['summarizer'];
    const prompt = this.expr.resolveTemplate(config.promptTemplate, resolveCtx);
    const model = config.model ?? this.config.get<string>('AI_DEFAULT_MODEL', 'gpt-4o-mini');

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: persona.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens ?? 2048,
      });

      const output = completion.choices[0]?.message?.content ?? '';

      // If preview required, mark as waiting for human confirmation
      if (config.requiresPreview) {
        return {
          status: 'waiting',
          data: {
            previewOutput: output,
            persona: config.persona,
            requiresConfirmation: true,
            outputVariable: config.outputVariable,
          },
          meta: {
            nodeId: ctx.nodeId, nodeType: 'ai_transformer',
            startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
          },
        };
      }

      return {
        status: 'success',
        data: { output, persona: config.persona, tokensUsed: completion.usage?.total_tokens },
        contextPatch: { [config.outputVariable]: output },
        meta: {
          nodeId: ctx.nodeId, nodeType: 'ai_transformer',
          startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
        },
      };
    } catch (err) {
      return {
        status: 'failed',
        data: { error: (err as Error).message },
        meta: {
          nodeId: ctx.nodeId, nodeType: 'ai_transformer',
          startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
        },
      };
    }
  }
}
