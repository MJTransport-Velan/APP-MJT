import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response';

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
        return sendError(res, 422, 'Validation failed', err.errors);
      }
      return next(err);
    }
  };
}
