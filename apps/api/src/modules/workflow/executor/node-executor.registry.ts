import { Injectable } from '@nestjs/common';
import { NodeType } from '@prisma/client';
import { INodeExecutor } from './node-executor.interface';

@Injectable()
export class NodeExecutorRegistry {
  private readonly executors = new Map<NodeType, INodeExecutor>();

  register(type: NodeType, executor: INodeExecutor): void {
    this.executors.set(type, executor);
  }

  get(type: NodeType): INodeExecutor | undefined {
    return this.executors.get(type);
  }

  has(type: NodeType): boolean {
    return this.executors.has(type);
  }
}
