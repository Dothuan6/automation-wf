import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class HttpRequestExecutor implements INodeExecutor {
  constructor(private expr: ExpressionEvaluator) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      headers?: Record<string, string>;
      bodyTemplate?: string;
      auth?: { type: 'none' | 'bearer' | 'basic' | 'api_key'; value?: string; header?: string };
      timeoutMs?: number;
      retryCount?: number;
      responseMapping?: Array<{ variableName: string; jsonPath: string }>;
      errorHandling?: 'continue_on_error' | 'fail_run';
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
    };

    const url = this.expr.resolveTemplate(config.url, resolveCtx);
    const headers: Record<string, string> = {};

    // Build headers
    for (const [k, v] of Object.entries(config.headers ?? {})) {
      headers[k] = this.expr.resolveTemplate(v, resolveCtx);
    }

    // Auth
    if (config.auth?.type === 'bearer' && config.auth.value) {
      headers['Authorization'] = `Bearer ${this.expr.resolveTemplate(config.auth.value, resolveCtx)}`;
    } else if (config.auth?.type === 'api_key' && config.auth.header && config.auth.value) {
      headers[config.auth.header] = this.expr.resolveTemplate(config.auth.value, resolveCtx);
    } else if (config.auth?.type === 'basic' && config.auth.value) {
      headers['Authorization'] = `Basic ${Buffer.from(config.auth.value).toString('base64')}`;
    }

    let body: unknown;
    if (config.bodyTemplate && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      const bodyStr = this.expr.resolveTemplate(config.bodyTemplate, resolveCtx);
      try { body = JSON.parse(bodyStr); } catch { body = bodyStr; }
    }

    const maxRetries = config.retryCount ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const axiosConfig: AxiosRequestConfig = {
          method: config.method,
          url,
          headers,
          data: body,
          timeout: config.timeoutMs ?? 30000,
        };

        const response = await axios(axiosConfig);

        const responseData = response.data;
        const contextPatch: Record<string, unknown> = {
          httpResponse: { status: response.status, data: responseData },
        };

        // Apply response mapping
        if (config.responseMapping?.length) {
          for (const mapping of config.responseMapping) {
            const val = this.getJsonPath(responseData, mapping.jsonPath);
            contextPatch[mapping.variableName] = val;
          }
        }

        return {
          status: 'success',
          data: { statusCode: response.status, body: responseData },
          contextPatch,
          meta: {
            nodeId: ctx.nodeId, nodeType: 'http_request',
            startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
          },
        };
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    if (config.errorHandling === 'continue_on_error') {
      return {
        status: 'success',
        data: { error: lastError?.message, skipped: true },
        contextPatch: { httpResponse: { error: lastError?.message } },
        meta: {
          nodeId: ctx.nodeId, nodeType: 'http_request',
          startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
          warnings: [lastError?.message ?? 'HTTP request failed'],
        },
      };
    }

    return {
      status: 'failed',
      data: { error: lastError?.message },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'http_request',
        startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
      },
    };
  }

  private getJsonPath(data: unknown, path: string): unknown {
    const parts = path.split('.');
    let current = data;
    for (const part of parts) {
      if (current == null) return null;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
