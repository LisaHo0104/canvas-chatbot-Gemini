import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export class CanvasAPIError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'CanvasAPIError';
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CanvasAPIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        })),
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }

  // Handle rate limiting errors
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          retryAfter: err.retryAfter,
          limit: err.limit,
          window: err.window
        },
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }

  // Handle authentication errors
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'AUTHENTICATION_FAILED',
        details: err.details,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }

  // Default error handler
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
};



export class CacheError extends CanvasAPIError {
  constructor(message: string, details?: any) {
    super(message, 500, 'CACHE_ERROR', details);
  }
}

export class RateLimitError extends CanvasAPIError {
  retryAfter: number;
  limit: number;
  window: number;

  constructor(message: string, retryAfter: number, limit: number, window: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.window = window;
  }
}

export class AuthenticationError extends CanvasAPIError {
  constructor(message: string, details?: any) {
    super(message, 401, 'AUTHENTICATION_FAILED', details);
  }
}

export class AuthorizationError extends CanvasAPIError {
  constructor(message: string, details?: any) {
    super(message, 403, 'AUTHORIZATION_FAILED', details);
  }
}

export class ValidationError extends CanvasAPIError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}