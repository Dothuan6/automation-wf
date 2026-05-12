import { Module, forwardRef } from '@nestjs/common';
import { WorkflowExecutorService } from './executor/workflow-executor.service';
import { NodeExecutorRegistry } from './executor/node-executor.registry';
import { WorkflowDefinitionsService } from './definitions/workflow-definitions.service';
import { WorkflowRunsService } from './runs/workflow-runs.service';
import { ExpressionEvaluator } from '../../common/expression/expression-evaluator';
import { CollectionsModule } from '../collections/collections.module';

// Node Executors
import { ManualTriggerExecutor } from './nodes/manual-trigger/manual-trigger.executor';
import { RecordTriggerExecutor } from './nodes/record-trigger/record-trigger.executor';
import { UserTaskExecutor } from './nodes/user-task/user-task.executor';
import { ApprovalTaskExecutor } from './nodes/approval-task/approval-task.executor';
import { ParallelTasksExecutor } from './nodes/parallel-tasks/parallel-tasks.executor';
import { RecordActionExecutor } from './nodes/record-action/record-action.executor';
import { HttpRequestExecutor } from './nodes/http-request/http-request.executor';
import { NotificationExecutor } from './nodes/notification/notification.executor';
import { AiTransformerExecutor } from './nodes/ai-transformer/ai-transformer.executor';
import { BusinessRuleExecutor } from './nodes/business-rule/business-rule.executor';
import { IfElseExecutor } from './nodes/if-else/if-else.executor';
import { TimerWaitExecutor } from './nodes/timer-wait/timer-wait.executor';
import { ReminderExecutor } from './nodes/reminder/reminder.executor';
import { SubWorkflowExecutor } from './nodes/sub-workflow/sub-workflow.executor';
import { EndExecutor } from './nodes/end/end.executor';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [forwardRef(() => CollectionsModule)],
  controllers: [WorkflowController],
  providers: [
    ExpressionEvaluator,
    NodeExecutorRegistry,
    WorkflowExecutorService,
    WorkflowDefinitionsService,
    WorkflowRunsService,
    ManualTriggerExecutor,
    RecordTriggerExecutor,
    UserTaskExecutor,
    ApprovalTaskExecutor,
    ParallelTasksExecutor,
    RecordActionExecutor,
    HttpRequestExecutor,
    NotificationExecutor,
    AiTransformerExecutor,
    BusinessRuleExecutor,
    IfElseExecutor,
    TimerWaitExecutor,
    ReminderExecutor,
    SubWorkflowExecutor,
    EndExecutor,
    {
      provide: 'REGISTER_EXECUTORS',
      useFactory: (
        registry: NodeExecutorRegistry,
        manualTrigger: ManualTriggerExecutor,
        recordTrigger: RecordTriggerExecutor,
        userTask: UserTaskExecutor,
        approvalTask: ApprovalTaskExecutor,
        parallelTasks: ParallelTasksExecutor,
        recordAction: RecordActionExecutor,
        httpRequest: HttpRequestExecutor,
        notification: NotificationExecutor,
        aiTransformer: AiTransformerExecutor,
        businessRule: BusinessRuleExecutor,
        ifElse: IfElseExecutor,
        timerWait: TimerWaitExecutor,
        reminder: ReminderExecutor,
        subWorkflow: SubWorkflowExecutor,
        end: EndExecutor,
      ) => {
        registry.register('manual_trigger', manualTrigger);
        registry.register('record_trigger', recordTrigger);
        registry.register('user_task', userTask);
        registry.register('approval_task', approvalTask);
        registry.register('parallel_tasks', parallelTasks);
        registry.register('record_action', recordAction);
        registry.register('http_request', httpRequest);
        registry.register('notification', notification);
        registry.register('ai_transformer', aiTransformer);
        registry.register('business_rule', businessRule);
        registry.register('if_else', ifElse);
        registry.register('timer_wait', timerWait);
        registry.register('reminder', reminder);
        registry.register('sub_workflow', subWorkflow);
        registry.register('end', end);
        return registry;
      },
      inject: [
        NodeExecutorRegistry,
        ManualTriggerExecutor, RecordTriggerExecutor, UserTaskExecutor,
        ApprovalTaskExecutor, ParallelTasksExecutor, RecordActionExecutor,
        HttpRequestExecutor, NotificationExecutor, AiTransformerExecutor,
        BusinessRuleExecutor, IfElseExecutor, TimerWaitExecutor,
        ReminderExecutor, SubWorkflowExecutor, EndExecutor,
      ],
    },
  ],
  exports: [WorkflowExecutorService, WorkflowRunsService, WorkflowDefinitionsService],
})
export class WorkflowModule {}
