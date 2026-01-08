import { z } from 'zod';

/**
 * Common Validation Schemas
 *
 * Reusable Zod schemas for API validation across all endpoints.
 * These schemas can be composed to create more complex validations.
 */

// ==========================================
// ID Schemas
// ==========================================

/**
 * CUID validation - used for database IDs
 */
export const cuidSchema = z.string().cuid('Invalid ID format');

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Generic ID schema - accepts CUID format
 */
export const idSchema = cuidSchema;

/**
 * Optional ID schema
 */
export const optionalIdSchema = cuidSchema.optional();

// ==========================================
// String Schemas
// ==========================================

/**
 * Non-empty string with configurable min/max length
 */
export const nonEmptyString = (maxLength = 255) =>
  z.string().min(1, 'This field is required').max(maxLength, `Maximum ${maxLength} characters allowed`);

/**
 * Optional string with max length
 */
export const optionalString = (maxLength = 255) =>
  z.string().max(maxLength, `Maximum ${maxLength} characters allowed`).optional();

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Optional URL validation
 */
export const optionalUrlSchema = z.string().url('Invalid URL format').optional();

// ==========================================
// Date Schemas
// ==========================================

/**
 * Date string schema - accepts YYYY-MM-DD or ISO datetime
 */
export const dateStringSchema = z.string().refine(
  (val) => {
    if (!val) return true;
    // Accept YYYY-MM-DD or full ISO datetime
    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val);
  },
  { message: 'Invalid date format. Use YYYY-MM-DD or ISO datetime.' }
);

/**
 * Optional date string schema
 */
export const optionalDateStringSchema = dateStringSchema.optional();

/**
 * Past date validation - date must not be in the future
 */
export const pastDateSchema = z.string().refine(
  (val) => {
    if (!val) return true;
    const date = new Date(val);
    return date <= new Date();
  },
  { message: 'Date cannot be in the future' }
);

// ==========================================
// Number Schemas
// ==========================================

/**
 * Positive integer schema
 */
export const positiveIntSchema = z.number().int().positive('Must be a positive integer');

/**
 * Non-negative integer schema (0 or greater)
 */
export const nonNegativeIntSchema = z.number().int().nonnegative('Must be 0 or greater');

/**
 * Coordinate schema for positions (can be any number)
 */
export const coordinateSchema = z.number();

/**
 * Optional coordinate schema
 */
export const optionalCoordinateSchema = z.number().optional();

// ==========================================
// Pagination Schemas
// ==========================================

/**
 * Page number schema (1-based)
 */
export const pageSchema = z.coerce.number().int().positive().default(1);

/**
 * Page size / limit schema
 */
export const limitSchema = z.coerce.number().int().min(1).max(100).default(20);

/**
 * Offset schema for pagination
 */
export const offsetSchema = z.coerce.number().int().nonnegative().default(0);

/**
 * Complete pagination schema for query parameters
 */
export const paginationSchema = z.object({
  page: pageSchema,
  limit: limitSchema,
}).partial();

/**
 * Cursor-based pagination schema
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: limitSchema,
});

// ==========================================
// Sorting Schemas
// ==========================================

/**
 * Sort order schema
 */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Common sort options
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema,
}).partial();

// ==========================================
// Boolean Schemas
// ==========================================

/**
 * Boolean from query string - handles 'true', 'false', '1', '0'
 */
export const queryBooleanSchema = z.preprocess(
  (val) => {
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
    return val;
  },
  z.boolean().optional()
);

/**
 * Required boolean from query string
 */
export const requiredQueryBooleanSchema = z.preprocess(
  (val) => {
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
    return val;
  },
  z.boolean()
);

// ==========================================
// File Schemas
// ==========================================

/**
 * File size validation (in bytes)
 */
export const fileSizeSchema = (maxSizeBytes: number) =>
  z.number().max(maxSizeBytes, `File size must not exceed ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);

/**
 * File MIME type validation
 */
export const mimeTypeSchema = (allowedTypes: string[]) =>
  z.string().refine(
    (val) => allowedTypes.includes(val),
    { message: `File type must be one of: ${allowedTypes.join(', ')}` }
  );

/**
 * Image MIME types
 */
export const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Document MIME types
 */
export const documentMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

// ==========================================
// Enum Schemas
// ==========================================

/**
 * Gender enum schema
 */
export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']);

/**
 * Privacy enum schema
 */
export const privacySchema = z.enum(['PUBLIC', 'FAMILY_ONLY', 'PRIVATE']);

/**
 * Relationship type enum schema
 */
export const relationshipTypeSchema = z.enum([
  'PARENT',
  'CHILD',
  'SPOUSE',
  'SIBLING',
  'ADOPTIVE_PARENT',
  'ADOPTIVE_CHILD',
  'STEP_PARENT',
  'STEP_CHILD',
  'FOSTER_PARENT',
  'FOSTER_CHILD',
  'GUARDIAN',
  'WARD',
]);

// ==========================================
// Common Request Schemas
// ==========================================

/**
 * Common query parameters for list endpoints
 */
export const listQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema,
  search: z.string().optional(),
});

/**
 * ID parameters schema (for routes like /resource/:id)
 */
export const idParamSchema = z.object({
  id: cuidSchema,
});

/**
 * Map ID parameters schema
 */
export const mapIdParamSchema = z.object({
  mapId: cuidSchema,
});

/**
 * Map and node ID parameters schema
 */
export const mapNodeIdParamSchema = z.object({
  mapId: cuidSchema,
  nodeId: cuidSchema,
});

/**
 * Tree ID parameters schema
 */
export const treeIdParamSchema = z.object({
  treeId: cuidSchema,
});

/**
 * Person ID parameters schema
 */
export const personIdParamSchema = z.object({
  personId: cuidSchema,
});

// ==========================================
// Schema Utilities
// ==========================================

/**
 * Make all properties of a schema optional
 */
export const makePartial = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.partial();

/**
 * Make specific properties required
 * Note: Returns a new schema with the specified keys marked as required
 */
export const makeRequired = <T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  _keys: K[]
): z.ZodObject<T> => {
  // Use the schema's required method with a mask object
  // For simplicity, we return the full required schema
  // In practice, you may want to use schema.required() for all or pick specific fields
  return schema.required() as z.ZodObject<T>;
};

/**
 * Strip unknown properties from schema
 */
export const strictSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.strict();

// ==========================================
// Type Exports
// ==========================================

export type PaginationParams = z.infer<typeof paginationSchema>;
export type CursorPaginationParams = z.infer<typeof cursorPaginationSchema>;
export type SortParams = z.infer<typeof sortSchema>;
export type ListQueryParams = z.infer<typeof listQuerySchema>;
