import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodIssue } from 'zod';
import { sendError } from '../utils/response';

/** "freightAmount" -> "Freight Amount", so the message names the field the way a form labels it. */
function humanizeField(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * An issue path is ["body", "freightAmount"] — or ["body", "charges", 0,
 * "amount"] for a nested list. The leading request section is noise to whoever
 * reads the message; array indices are not.
 */
function describePath(path: ZodIssue['path']): string {
  const trimmed = ['body', 'query', 'params'].includes(String(path[0])) ? path.slice(1) : path;
  return trimmed
    .map((segment) => (typeof segment === 'number' ? `#${segment + 1}` : humanizeField(String(segment))))
    .join(' ');
}

/**
 * A bare "Validation failed" tells the caller nothing about what to fix, and
 * it was all any client had to show — the detail sat unread in `errors`. The
 * full array is still sent; this just puts the first offenders where a
 * one-line message is read. Named the same way as the frontend's
 * extractErrorMessage so the two read alike.
 */
function summarizeIssues(issues: ZodIssue[]): string {
  const described = issues.map((issue) => {
    const field = describePath(issue.path);
    return field ? `${field}: ${issue.message}` : issue.message;
  });

  if (described.length === 0) return 'Validation failed';
  const shown = described.slice(0, 2).join('; ');
  return described.length > 2 ? `${shown} (+${described.length - 2} more)` : shown;
}

export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Zod's return value — not the original input — carries the effect of
      // any .coerce()/.transform()/.toUpperCase() in the schema (e.g.
      // z.coerce.date()). Discarding it here left every such field silently
      // un-coerced downstream (raw "2026-07-27" string reaching Prisma
      // instead of a real Date, "premature end of input" on create).
      if (parsed && typeof parsed === 'object' && 'body' in parsed && parsed.body !== undefined) {
        req.body = parsed.body;
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(res, 422, summarizeIssues(err.errors), err.errors);
      }
      return next(err);
    }
  };
}
