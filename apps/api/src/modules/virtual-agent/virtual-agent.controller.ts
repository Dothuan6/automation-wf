import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VirtualAgentService } from './virtual-agent.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent')
export class VirtualAgentController {
  constructor(private readonly service: VirtualAgentService) {}

  /**
   * POST /agent/chat
   * Send a message to the virtual agent.
   */
  @Post('chat')
  @ApiOperation({ summary: 'Send a message to the virtual agent' })
  chat(
    @Body() body: { message: string; conversationId?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.chat({
      message: body.message,
      userId,
      conversationId: body.conversationId,
    });
  }

  /**
   * PATCH /agent/messages/:messageId/confirm
   * Confirm or reject a previewed action.
   */
  @Patch('messages/:messageId/confirm')
  @ApiOperation({ summary: 'Confirm or reject a previewed agent action' })
  confirmAction(
    @Param('messageId') messageId: string,
    @Body() body: { confirmed: boolean },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.confirmAction(messageId, userId, body.confirmed);
  }

  /**
   * GET /agent/conversations
   * List recent conversations for the current user.
   */
  @Get('conversations')
  @ApiOperation({ summary: 'List recent agent conversations' })
  listConversations(@CurrentUser('sub') userId: string) {
    return this.service.listConversations(userId);
  }

  /**
   * GET /agent/conversations/:id
   * Get a conversation with its messages.
   */
  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation with message history' })
  getConversation(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.getConversation(id, userId);
  }
}
