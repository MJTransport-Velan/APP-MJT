import { Response } from 'express';

interface SuccessOptions<T, M = Record<string, unknown>> {
  message?: string;
  data?: T;
  meta?: M;
}

export function sendSuccess<T, M = Record<string, unknown>>(
  res: Response,
  statusCode = 200,
  options: SuccessOptions<T, M> = {}
) {
  return res.status(statusCode).json({
    success: true,
    message: options.message || 'Success',
    data: options.data ?? null,
    meta: options.meta ?? undefined,
  });
}
export function sendError(res: Response, statusCode = 500, message = 'Something went wrong', errors?: unknown) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors ?? undefined,
  });
}
