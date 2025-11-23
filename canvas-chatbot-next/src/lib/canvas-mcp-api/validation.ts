import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './errors';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      if (schema.shape && Object.keys(schema.shape).some(key => req.query[key])) {
        const queryResult = schema.safeParse(req.query);
        if (!queryResult.success) {
          throw new ValidationError('Query validation failed', queryResult.error.errors);
        }
        req.validatedQuery = queryResult.data;
      }

      // Validate body parameters
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyResult = schema.safeParse(req.body);
        if (!bodyResult.success) {
          throw new ValidationError('Body validation failed', bodyResult.error.errors);
        }
        req.validatedBody = bodyResult.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Custom validation schemas for Canvas API
export const canvasIdSchema = z.union([z.string(), z.number()]).transform(val => 
  typeof val === 'string' && /^\d+$/.test(val) ? parseInt(val, 10) : val
);

export const dateSchema = z.string().datetime().or(z.date()).transform(val => 
  typeof val === 'string' ? new Date(val) : val
);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  include_total: z.coerce.boolean().default(true)
});

export const searchSchema = z.object({
  q: z.string().min(1).max(255).optional(),
  search: z.string().min(1).max(255).optional(),
  context: z.string().optional(),
  type: z.enum(['user', 'context', 'course', 'assignment']).optional(),
  exclude: z.array(z.string()).optional(),

  ...paginationSchema.shape
});

export const includeSchema = z.array(z.enum([
  'uuid', 'last_login', 'permissions', 'email', 'effective_locale',
  'avatar_url', 'locale', 'enrollments', 'courses', 'groups'
])).optional();

export const exportTypeSchema = z.enum(['common_cartridge', 'qti', 'zip', 'json']);







// Middleware to attach validation methods to request
export const attachValidationHelpers = (req: Request, res: Response, next: NextFunction) => {
  req.validateQuery = (schema: z.ZodSchema) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ValidationError('Query validation failed', result.error.errors);
    }
    return result.data;
  };

  req.validateBody = (schema: z.ZodSchema) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Body validation failed', result.error.errors);
    }
    return result.data;
  };

  req.validateParams = (schema: z.ZodSchema) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new ValidationError('Params validation failed', result.error.errors);
    }
    return result.data;
  };

  next();
};