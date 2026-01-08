import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { AppError, ErrorCodes } from './errorHandler.js';

/**
 * Validation Middleware
 *
 * Express middleware for validating request data using Zod schemas.
 * Supports validation of body, query parameters, and URL parameters.
 */

// ==========================================
// Types
// ==========================================

/**
 * Validation targets - what part of the request to validate
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * If true, strips unknown properties from the validated data
   * @default false
   */
  stripUnknown?: boolean;

  /**
   * If true, unknown properties will cause validation to fail
   * @default false
   */
  strict?: boolean;

  /**
   * Custom error message prefix
   */
  errorMessagePrefix?: string;
}

/**
 * Validation schema configuration
 */
export interface ValidationConfig<
  TBody extends ZodSchema = ZodSchema,
  TQuery extends ZodSchema = ZodSchema,
  TParams extends ZodSchema = ZodSchema
> {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
  options?: ValidationOptions;
}

/**
 * Extended Request type with validated data
 */
export interface ValidatedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> extends Request {
  validatedBody: TBody;
  validatedQuery: TQuery;
  validatedParams: TParams;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Format Zod errors into a more user-friendly structure
 */
function formatZodError(error: ZodError, prefix?: string): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.') || 'root',
    message: prefix ? `${prefix}: ${err.message}` : err.message,
  }));
}

/**
 * Apply schema options (strip unknown, strict mode)
 */
function applySchemaOptions<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions
): T {
  if (!options) return schema;

  let processedSchema = schema;

  if (schema instanceof z.ZodObject) {
    if (options.stripUnknown) {
      processedSchema = schema.strip() as unknown as T;
    } else if (options.strict) {
      processedSchema = schema.strict() as unknown as T;
    }
  }

  return processedSchema;
}

// ==========================================
// Main Validation Middleware
// ==========================================

/**
 * Creates a validation middleware that validates body, query, and/or params
 *
 * @example
 * // Validate body only
 * router.post('/users', validate({ body: createUserSchema }), handler);
 *
 * @example
 * // Validate query parameters
 * router.get('/users', validate({ query: listUsersQuerySchema }), handler);
 *
 * @example
 * // Validate URL parameters
 * router.get('/users/:id', validate({ params: userIdSchema }), handler);
 *
 * @example
 * // Validate all three
 * router.put('/users/:id',
 *   validate({
 *     body: updateUserSchema,
 *     query: updateOptionsSchema,
 *     params: userIdSchema,
 *   }),
 *   handler
 * );
 */
export function validate<
  TBody extends ZodSchema = ZodSchema,
  TQuery extends ZodSchema = ZodSchema,
  TParams extends ZodSchema = ZodSchema
>(config: ValidationConfig<TBody, TQuery, TParams>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Array<{ field: string; message: string }> = [];

      // Validate body
      if (config.body) {
        try {
          const schema = applySchemaOptions(config.body, config.options);
          (req as ValidatedRequest).validatedBody = schema.parse(req.body);
        } catch (err) {
          if (err instanceof ZodError) {
            errors.push(...formatZodError(err, 'body'));
          } else {
            throw err;
          }
        }
      }

      // Validate query parameters
      if (config.query) {
        try {
          const schema = applySchemaOptions(config.query, config.options);
          (req as ValidatedRequest).validatedQuery = schema.parse(req.query);
        } catch (err) {
          if (err instanceof ZodError) {
            errors.push(...formatZodError(err, 'query'));
          } else {
            throw err;
          }
        }
      }

      // Validate URL parameters
      if (config.params) {
        try {
          const schema = applySchemaOptions(config.params, config.options);
          (req as ValidatedRequest).validatedParams = schema.parse(req.params);
        } catch (err) {
          if (err instanceof ZodError) {
            errors.push(...formatZodError(err, 'params'));
          } else {
            throw err;
          }
        }
      }

      // If there are validation errors, throw an AppError
      if (errors.length > 0) {
        throw new AppError(400, 'Validation failed', {
          code: ErrorCodes.VALIDATION_ERROR,
          details: errors,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ==========================================
// Convenience Middleware Functions
// ==========================================

/**
 * Validates request body only
 *
 * @example
 * router.post('/users', validateBody(createUserSchema), handler);
 */
export function validateBody<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions
): RequestHandler {
  return validate({ body: schema, options });
}

/**
 * Validates query parameters only
 *
 * @example
 * router.get('/users', validateQuery(listUsersQuerySchema), handler);
 */
export function validateQuery<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions
): RequestHandler {
  return validate({ query: schema, options });
}

/**
 * Validates URL parameters only
 *
 * @example
 * router.get('/users/:id', validateParams(userIdSchema), handler);
 */
export function validateParams<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions
): RequestHandler {
  return validate({ params: schema, options });
}

/**
 * Validates body and params together
 *
 * @example
 * router.put('/users/:id', validateBodyAndParams(updateUserSchema, userIdSchema), handler);
 */
export function validateBodyAndParams<TBody extends ZodSchema, TParams extends ZodSchema>(
  bodySchema: TBody,
  paramsSchema: TParams,
  options?: ValidationOptions
): RequestHandler {
  return validate({ body: bodySchema, params: paramsSchema, options });
}

/**
 * Validates query and params together
 *
 * @example
 * router.get('/users/:id/posts', validateQueryAndParams(paginationSchema, userIdSchema), handler);
 */
export function validateQueryAndParams<TQuery extends ZodSchema, TParams extends ZodSchema>(
  querySchema: TQuery,
  paramsSchema: TParams,
  options?: ValidationOptions
): RequestHandler {
  return validate({ query: querySchema, params: paramsSchema, options });
}

// ==========================================
// Advanced Validation Helpers
// ==========================================

/**
 * Creates a custom validator that can access the full request
 *
 * @example
 * const validateOwnership = customValidator(async (req) => {
 *   const resource = await db.resource.findById(req.params.id);
 *   if (resource.userId !== req.userId) {
 *     throw new AppError(403, 'Not authorized');
 *   }
 * });
 */
export function customValidator(
  validatorFn: (req: Request) => Promise<void> | void
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await validatorFn(req);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Combines multiple validators into a single middleware
 *
 * @example
 * router.post('/resource',
 *   combineValidators(
 *     validateBody(createSchema),
 *     customValidator(checkPermissions),
 *   ),
 *   handler
 * );
 */
export function combineValidators(...validators: RequestHandler[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validator of validators) {
      const result = await new Promise<Error | undefined>((resolve) => {
        validator(req, res, (err?: unknown) => {
          resolve(err instanceof Error ? err : undefined);
        });
      });

      if (result) {
        return next(result);
      }
    }
    next();
  };
}

// ==========================================
// Type Helpers
// ==========================================

/**
 * Helper type to infer the validated request type from a schema config
 */
export type InferValidatedRequest<TConfig extends ValidationConfig> = ValidatedRequest<
  TConfig['body'] extends ZodSchema ? z.infer<TConfig['body']> : unknown,
  TConfig['query'] extends ZodSchema ? z.infer<TConfig['query']> : unknown,
  TConfig['params'] extends ZodSchema ? z.infer<TConfig['params']> : unknown
>;

/**
 * Helper type to get validated body type from a schema
 */
export type InferBody<T extends ZodSchema> = z.infer<T>;

/**
 * Helper type to get validated query type from a schema
 */
export type InferQuery<T extends ZodSchema> = z.infer<T>;

/**
 * Helper type to get validated params type from a schema
 */
export type InferParams<T extends ZodSchema> = z.infer<T>;
