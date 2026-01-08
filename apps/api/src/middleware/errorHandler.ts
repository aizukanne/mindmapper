import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Error codes for consistent error identification
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Extended error class for application errors with consistent structure
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(
    statusCode: number,
    message: string,
    options: {
      code?: ErrorCode;
      isOperational?: boolean;
      details?: unknown;
    } = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = options.code || this.getDefaultCode(statusCode);
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultCode(statusCode: number): ErrorCode {
    const codeMap: Record<number, ErrorCode> = {
      400: ErrorCodes.BAD_REQUEST,
      401: ErrorCodes.UNAUTHORIZED,
      403: ErrorCodes.FORBIDDEN,
      404: ErrorCodes.NOT_FOUND,
      409: ErrorCodes.CONFLICT,
      413: ErrorCodes.PAYLOAD_TOO_LARGE,
      429: ErrorCodes.RATE_LIMITED,
      500: ErrorCodes.INTERNAL_ERROR,
      503: ErrorCodes.SERVICE_UNAVAILABLE,
    };
    return codeMap[statusCode] || ErrorCodes.INTERNAL_ERROR;
  }
}

/**
 * Convenience factory functions for common error types
 */
export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(400, message, { code: ErrorCodes.BAD_REQUEST, details }),

  validation: (message: string, details?: unknown) =>
    new AppError(400, message, { code: ErrorCodes.VALIDATION_ERROR, details }),

  unauthorized: (message = 'Authentication required') =>
    new AppError(401, message, { code: ErrorCodes.UNAUTHORIZED }),

  forbidden: (message = 'Access denied') =>
    new AppError(403, message, { code: ErrorCodes.FORBIDDEN }),

  notFound: (resource = 'Resource') =>
    new AppError(404, `${resource} not found`, { code: ErrorCodes.NOT_FOUND }),

  conflict: (message: string, details?: unknown) =>
    new AppError(409, message, { code: ErrorCodes.CONFLICT, details }),

  rateLimited: (message = 'Too many requests, please try again later') =>
    new AppError(429, message, { code: ErrorCodes.RATE_LIMITED }),

  internal: (message = 'Internal server error') =>
    new AppError(500, message, { code: ErrorCodes.INTERNAL_ERROR, isOperational: false }),

  database: (message = 'Database operation failed') =>
    new AppError(500, message, { code: ErrorCodes.DATABASE_ERROR }),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new AppError(503, message, { code: ErrorCodes.SERVICE_UNAVAILABLE }),
};

/**
 * Error response interface for consistent API responses
 */
interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * Get Prisma-specific error message based on error code
 */
function getPrismaErrorMessage(code: string): { message: string; statusCode: number } {
  const prismaErrors: Record<string, { message: string; statusCode: number }> = {
    P2000: { message: 'The provided value is too long', statusCode: 400 },
    P2001: { message: 'Record not found', statusCode: 404 },
    P2002: { message: 'Unique constraint violation', statusCode: 409 },
    P2003: { message: 'Foreign key constraint failed', statusCode: 400 },
    P2014: { message: 'Relation violation', statusCode: 400 },
    P2025: { message: 'Record not found', statusCode: 404 },
  };

  return prismaErrors[code] || { message: 'Database operation failed', statusCode: 400 };
}

/**
 * Format Zod validation errors into readable details
 */
function formatZodErrors(errors: Array<{ path: (string | number)[]; message: string }>): Array<{ field: string; message: string }> {
  return errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Log error with structured format
 */
function logError(err: Error, requestId: string, req: Request): void {
  const logEntry = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
  };

  try {
    console.error('[Error]', JSON.stringify(logEntry, null, 2));
  } catch {
    // Fallback for circular reference or other JSON issues
    console.error('[Error]', requestId, err.message);
    if (err.stack) {
      console.error('[Stack]', err.stack);
    }
  }
}

/**
 * Central error handling middleware
 *
 * This middleware catches all errors and returns consistent JSON responses.
 * It handles:
 * - Custom AppError instances
 * - Prisma database errors
 * - Zod validation errors
 * - Unhandled errors (500)
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Generate unique request ID for tracking
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  // Log the error
  logError(err, requestId, req);

  // Prepare base response
  const baseResponse: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  // Handle custom AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
        timestamp: err.timestamp,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as Error & { code?: string; meta?: Record<string, unknown> };
    const { message, statusCode } = getPrismaErrorMessage(prismaError.code || '');

    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCodes.DATABASE_ERROR,
        message,
        details: process.env.NODE_ENV !== 'production' ? prismaError.meta : undefined,
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as Error & { errors: Array<{ path: (string | number)[]; message: string }> };

    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: formatZodErrors(zodError.errors),
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid JSON in request body',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle default/unknown errors
  baseResponse.error.message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json(baseResponse);
}

/**
 * 404 Not Found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(404).json(response);
}

/**
 * Async error wrapper to eliminate try-catch boilerplate in route handlers
 *
 * Usage:
 * router.get('/', asyncHandler(async (req, res) => {
 *   // Your async code here - errors are automatically caught
 * }));
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
): (req: T, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
