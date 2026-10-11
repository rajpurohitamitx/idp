import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/http';
import { logger } from '../utils/logger';

export const notFoundHandler: RequestHandler = (_req, res) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500; let code = 'INTERNAL_ERROR'; let message = 'Internal server error'; let details: unknown;
  if (err instanceof AppError) { status = err.status; code = err.code; message = err.message; details = err.details; }
  else if (err instanceof ZodError) { status = 400; code = 'VALIDATION_ERROR'; message = 'Invalid input'; details = err.flatten().fieldErrors; }
  else if (err instanceof multer.MulterError) { status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400; code = 'FILE_ERROR'; message = err.message; }
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { status = 409; code = 'CONFLICT'; message = 'Record already exists'; }
    else if (err.code === 'P2025') { status = 404; code = 'NOT_FOUND'; message = 'Record not found'; }
  }
  if (status >= 500) logger.error({ err, path: req.path }, 'unhandled error');
  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
};
