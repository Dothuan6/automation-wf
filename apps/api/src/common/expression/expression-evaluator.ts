import { Injectable, BadRequestException } from '@nestjs/common';
import { addDays, addMinutes, format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type ExpressionContext = Record<string, unknown>;

// Whitelist of safe function names
const SAFE_FUNCTIONS = new Set([
  'contains', 'starts_with', 'ends_with', 'length',
  'min', 'max', 'coalesce', 'to_number', 'to_string', 'to_bool',
  'now', 'add_days', 'add_minutes', 'format_date',
  'lower', 'upper', 'trim', 'is_empty', 'is_null',
]);

// Safe function implementations
const FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  contains: (str: unknown, sub: unknown) =>
    typeof str === 'string' && typeof sub === 'string' && str.includes(sub),
  starts_with: (str: unknown, prefix: unknown) =>
    typeof str === 'string' && typeof prefix === 'string' && str.startsWith(prefix),
  ends_with: (str: unknown, suffix: unknown) =>
    typeof str === 'string' && typeof suffix === 'string' && str.endsWith(suffix),
  length: (val: unknown) => {
    if (typeof val === 'string' || Array.isArray(val)) return val.length;
    return 0;
  },
  min: (...args: unknown[]) => Math.min(...args.map(Number)),
  max: (...args: unknown[]) => Math.max(...args.map(Number)),
  coalesce: (...args: unknown[]) => args.find((a) => a != null),
  to_number: (val: unknown) => Number(val),
  to_string: (val: unknown) => String(val ?? ''),
  to_bool: (val: unknown) => Boolean(val),
  now: () => new Date().toISOString(),
  add_days: (date: unknown, days: unknown) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date as string);
    return addDays(d, Number(days)).toISOString();
  },
  add_minutes: (date: unknown, minutes: unknown) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date as string);
    return addMinutes(d, Number(minutes)).toISOString();
  },
  format_date: (date: unknown, fmt: unknown, tz?: unknown) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date as string);
    const zonedDate = tz ? toZonedTime(d, String(tz)) : d;
    return format(zonedDate, String(fmt ?? 'dd/MM/yyyy'));
  },
  lower: (val: unknown) => String(val ?? '').toLowerCase(),
  upper: (val: unknown) => String(val ?? '').toUpperCase(),
  trim: (val: unknown) => String(val ?? '').trim(),
  is_empty: (val: unknown) => val == null || val === '' || (Array.isArray(val) && val.length === 0),
  is_null: (val: unknown) => val == null,
};

@Injectable()
export class ExpressionEvaluator {
  /**
   * Resolve template strings: "Xin chào {{ actor.name }}, task {{ task.title }}"
   */
  resolveTemplate(template: string, ctx: ExpressionContext): string {
    return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
      try {
        const val = this.evaluate(expr.trim(), ctx);
        return val == null ? '' : String(val);
      } catch {
        return '';
      }
    });
  }

  /**
   * Evaluate a condition expression like "record.amount > 1000000 AND record.status == 'active'"
   * Returns boolean for branching nodes.
   */
  evaluateCondition(expression: string, ctx: ExpressionContext): boolean {
    const result = this.evaluate(expression, ctx);
    return Boolean(result);
  }

  /**
   * Evaluate a value expression like "record.customer_name" or "add_days(record.created_at, 7)"
   */
  evaluate(expression: string, ctx: ExpressionContext): unknown {
    expression = expression.trim();

    // Null/boolean literals
    if (expression === 'null') return null;
    if (expression === 'true') return true;
    if (expression === 'false') return false;

    // String literal
    if ((expression.startsWith('"') && expression.endsWith('"')) ||
        (expression.startsWith("'") && expression.endsWith("'"))) {
      return expression.slice(1, -1);
    }

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(expression)) {
      return parseFloat(expression);
    }

    // Array literal  [...] (simplified)
    if (expression.startsWith('[') && expression.endsWith(']')) {
      return this.parseArrayLiteral(expression, ctx);
    }

    // Function call: func_name(arg1, arg2, ...)
    const funcMatch = expression.match(/^([a-z_]+)\((.*)?\)$/s);
    if (funcMatch) {
      const funcName = funcMatch[1];
      if (!SAFE_FUNCTIONS.has(funcName)) {
        throw new BadRequestException(`Hàm không được phép: ${funcName}`);
      }
      const args = this.parseArgs(funcMatch[2] ?? '', ctx);
      return FUNCTIONS[funcName](...args);
    }

    // AND / OR / NOT (simple recursive)
    const andIdx = this.findTopLevelOperator(expression, ' AND ');
    if (andIdx >= 0) {
      const left = this.evaluateCondition(expression.slice(0, andIdx), ctx);
      const right = this.evaluateCondition(expression.slice(andIdx + 5), ctx);
      return left && right;
    }
    const orIdx = this.findTopLevelOperator(expression, ' OR ');
    if (orIdx >= 0) {
      const left = this.evaluateCondition(expression.slice(0, orIdx), ctx);
      const right = this.evaluateCondition(expression.slice(orIdx + 4), ctx);
      return left || right;
    }
    if (expression.startsWith('NOT ')) {
      return !this.evaluateCondition(expression.slice(4), ctx);
    }

    // Comparison operators
    for (const op of ['>=', '<=', '!=', '==', '>', '<']) {
      const idx = this.findTopLevelOperator(expression, ` ${op} `);
      if (idx >= 0) {
        const left = this.evaluate(expression.slice(0, idx), ctx);
        const right = this.evaluate(expression.slice(idx + op.length + 2), ctx);
        return this.compare(left, right, op);
      }
    }

    // `in` operator: value in [a, b, c]
    const inMatch = expression.match(/^(.+?)\s+in\s+(.+)$/);
    if (inMatch) {
      const val = this.evaluate(inMatch[1].trim(), ctx);
      const list = this.evaluate(inMatch[2].trim(), ctx);
      return Array.isArray(list) && list.includes(val);
    }
    const notInMatch = expression.match(/^(.+?)\s+not_in\s+(.+)$/);
    if (notInMatch) {
      const val = this.evaluate(notInMatch[1].trim(), ctx);
      const list = this.evaluate(notInMatch[2].trim(), ctx);
      return Array.isArray(list) && !list.includes(val);
    }

    // Variable path: record.field_name, context.var, previousNodeOutput.data
    return this.resolvePath(expression, ctx);
  }

  private compare(left: unknown, right: unknown, op: string): boolean {
    switch (op) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return (left as number) > (right as number);
      case '>=': return (left as number) >= (right as number);
      case '<': return (left as number) < (right as number);
      case '<=': return (left as number) <= (right as number);
      default: return false;
    }
  }

  private resolvePath(path: string, ctx: ExpressionContext): unknown {
    const parts = path.split('.');
    // Validate first segment is a known source
    const allowedSources = [
      'record', 'recordBefore', 'recordAfter', 'context', 'previousNodeOutput',
      'variables', 'taskResult', 'approvalResult', 'httpResponse',
      'triggeredAt', 'businessDate', 'actor',
    ];
    if (!allowedSources.includes(parts[0])) {
      // Could be a string without quotes — treat as string literal
      return path;
    }
    let current: unknown = ctx;
    for (const part of parts) {
      if (current == null) return null;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private parseArgs(argsStr: string, ctx: ExpressionContext): unknown[] {
    if (!argsStr.trim()) return [];
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of argsStr) {
      if (char === '(' || char === '[') depth++;
      else if (char === ')' || char === ']') depth--;
      else if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) parts.push(current.trim());
    return parts.map((p) => this.evaluate(p, ctx));
  }

  private parseArrayLiteral(expr: string, ctx: ExpressionContext): unknown[] {
    const inner = expr.slice(1, -1).trim();
    if (!inner) return [];
    return this.parseArgs(inner, ctx) as unknown[];
  }

  private findTopLevelOperator(expr: string, op: string): number {
    let depth = 0;
    let inStr = false;
    let strChar = '';
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (inStr) {
        if (ch === strChar && expr[i - 1] !== '\\') inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") { inStr = true; strChar = ch; continue; }
      if (ch === '(' || ch === '[') { depth++; continue; }
      if (ch === ')' || ch === ']') { depth--; continue; }
      if (depth === 0 && expr.slice(i).startsWith(op)) return i;
    }
    return -1;
  }
}
