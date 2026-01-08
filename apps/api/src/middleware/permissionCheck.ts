/**
 * Permission Check Middleware
 *
 * Middleware to verify user has required permission level for map operations.
 * Checks ownership and share permissions with proper hierarchical authorization.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError, Errors, asyncHandler } from './errorHandler.js';

// ==========================================
// Types
// ==========================================

/**
 * Permission levels for map access
 */
export type MapPermission = 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'OWNER';

/**
 * Permission check result with detailed access information
 */
export interface PermissionCheckResult {
  hasAccess: boolean;
  permission: MapPermission | null;
  isOwner: boolean;
  isPublic: boolean;
  shareId?: string;
  expiresAt?: Date | null;
}

/**
 * Extended request with permission information
 */
export interface PermissionRequest extends Request {
  mapPermission?: PermissionCheckResult;
}

// ==========================================
// Constants
// ==========================================

/**
 * Permission hierarchy: OWNER > EDITOR > COMMENTER > VIEWER
 * Higher number = more permissions
 */
export const PERMISSION_LEVEL: Record<MapPermission, number> = {
  VIEWER: 1,
  COMMENTER: 2,
  EDITOR: 3,
  OWNER: 4,
};

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get user ID from request with fallback for dev mode
 */
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

/**
 * Check if a user has the required permission level
 */
function hasRequiredPermission(
  userPermission: MapPermission,
  requiredPermission: MapPermission
): boolean {
  return PERMISSION_LEVEL[userPermission] >= PERMISSION_LEVEL[requiredPermission];
}

// ==========================================
// Core Permission Check Function
// ==========================================

/**
 * Check user's permission for a specific map
 *
 * This function checks in order:
 * 1. Map ownership (user is the owner)
 * 2. Public map access (for VIEWER permission)
 * 3. Explicit share permissions
 *
 * @param userId - The user ID to check permissions for
 * @param mapId - The map ID to check permissions on
 * @returns Permission check result with detailed information
 */
export async function getMapPermission(
  userId: string,
  mapId: string
): Promise<PermissionCheckResult> {
  // Default result - no access
  const result: PermissionCheckResult = {
    hasAccess: false,
    permission: null,
    isOwner: false,
    isPublic: false,
  };

  // Find the map
  const map = await prisma.mindMap.findUnique({
    where: { id: mapId },
    select: { userId: true, isPublic: true },
  });

  if (!map) {
    return result;
  }

  // Check ownership
  if (map.userId === userId) {
    return {
      hasAccess: true,
      permission: 'OWNER',
      isOwner: true,
      isPublic: map.isPublic,
    };
  }

  // Check if public
  result.isPublic = map.isPublic;

  // Check for explicit share
  const share = await prisma.share.findFirst({
    where: {
      mindMapId: mapId,
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      permission: true,
      expiresAt: true,
    },
  });

  if (share) {
    return {
      hasAccess: true,
      permission: share.permission as MapPermission,
      isOwner: false,
      isPublic: map.isPublic,
      shareId: share.id,
      expiresAt: share.expiresAt,
    };
  }

  // If public, allow VIEWER access
  if (map.isPublic) {
    return {
      hasAccess: true,
      permission: 'VIEWER',
      isOwner: false,
      isPublic: true,
    };
  }

  return result;
}

/**
 * Check if a user has a specific permission level for a map
 *
 * @param userId - The user ID to check
 * @param mapId - The map ID to check
 * @param requiredPermission - The minimum required permission level
 * @returns True if user has the required permission
 */
export async function checkMapPermission(
  userId: string,
  mapId: string,
  requiredPermission: MapPermission = 'VIEWER'
): Promise<boolean> {
  const permissionResult = await getMapPermission(userId, mapId);

  if (!permissionResult.hasAccess || !permissionResult.permission) {
    return false;
  }

  return hasRequiredPermission(permissionResult.permission, requiredPermission);
}

// ==========================================
// Middleware Factory Functions
// ==========================================

/**
 * Creates middleware that checks for a specific permission level
 *
 * @param requiredPermission - The minimum permission level required
 * @param options - Configuration options
 * @returns Express middleware function
 *
 * @example
 * // Require EDITOR permission for map update
 * router.put('/:id', requireMapPermission('EDITOR'), updateMapHandler);
 *
 * @example
 * // Require OWNER permission for map deletion
 * router.delete('/:id', requireMapPermission('OWNER'), deleteMapHandler);
 */
export function requireMapPermission(
  requiredPermission: MapPermission,
  options: {
    /** Parameter name for map ID (default: 'id') */
    paramName?: string;
    /** Custom error message */
    errorMessage?: string;
    /** Whether to attach permission info to request */
    attachToRequest?: boolean;
  } = {}
): RequestHandler {
  const { paramName = 'id', errorMessage, attachToRequest = true } = options;

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const mapId = req.params[paramName];
    const userId = getUserId(req);

    if (!mapId) {
      throw Errors.badRequest(`Map ID parameter '${paramName}' is required`);
    }

    // Check if map exists first
    const map = await prisma.mindMap.findUnique({
      where: { id: mapId },
      select: { id: true },
    });

    if (!map) {
      throw Errors.notFound('Mind map');
    }

    // Get user's permission level
    const permissionResult = await getMapPermission(userId, mapId);

    // Attach permission info to request if enabled
    if (attachToRequest) {
      (req as PermissionRequest).mapPermission = permissionResult;
    }

    // Check if user has access
    if (!permissionResult.hasAccess || !permissionResult.permission) {
      throw Errors.forbidden(errorMessage || 'Access denied');
    }

    // Check if user has required permission level
    if (!hasRequiredPermission(permissionResult.permission, requiredPermission)) {
      throw Errors.forbidden(
        errorMessage ||
          `Insufficient permissions. Required: ${requiredPermission}, Current: ${permissionResult.permission}`
      );
    }

    next();
  });
}

/**
 * Middleware that requires the user to be the owner of the map
 *
 * @example
 * router.delete('/:id', requireMapOwnership(), deleteMapHandler);
 */
export function requireMapOwnership(
  options: {
    paramName?: string;
    errorMessage?: string;
  } = {}
): RequestHandler {
  return requireMapPermission('OWNER', {
    ...options,
    errorMessage: options.errorMessage || 'Only the map owner can perform this action',
  });
}

/**
 * Middleware that requires at least VIEWER access (any access to the map)
 *
 * @example
 * router.get('/:id', requireMapAccess(), getMapHandler);
 */
export function requireMapAccess(
  options: {
    paramName?: string;
    errorMessage?: string;
  } = {}
): RequestHandler {
  return requireMapPermission('VIEWER', {
    ...options,
    errorMessage: options.errorMessage || 'You do not have access to this map',
  });
}

/**
 * Middleware that requires EDITOR access for modifications
 *
 * @example
 * router.put('/:id', requireMapEditor(), updateMapHandler);
 */
export function requireMapEditor(
  options: {
    paramName?: string;
    errorMessage?: string;
  } = {}
): RequestHandler {
  return requireMapPermission('EDITOR', {
    ...options,
    errorMessage: options.errorMessage || 'You do not have edit permissions for this map',
  });
}

/**
 * Middleware that requires COMMENTER access
 *
 * @example
 * router.post('/:id/comments', requireMapCommenter(), addCommentHandler);
 */
export function requireMapCommenter(
  options: {
    paramName?: string;
    errorMessage?: string;
  } = {}
): RequestHandler {
  return requireMapPermission('COMMENTER', {
    ...options,
    errorMessage: options.errorMessage || 'You do not have comment permissions for this map',
  });
}

// ==========================================
// Advanced Permission Middleware
// ==========================================

/**
 * Middleware that allows access if the user meets ANY of the conditions:
 * - Is the map owner
 * - Has explicit share permission
 * - Map is public (for VIEWER access only)
 *
 * This is useful for GET operations where public maps should be accessible.
 *
 * @example
 * router.get('/:id', requireMapAccessOrPublic(), getMapHandler);
 */
export function requireMapAccessOrPublic(
  options: {
    paramName?: string;
    requiredPermission?: MapPermission;
  } = {}
): RequestHandler {
  const { paramName = 'id', requiredPermission = 'VIEWER' } = options;

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const mapId = req.params[paramName];
    const userId = getUserId(req);

    if (!mapId) {
      throw Errors.badRequest(`Map ID parameter '${paramName}' is required`);
    }

    // Check if map exists and get its public status
    const map = await prisma.mindMap.findUnique({
      where: { id: mapId },
      select: { id: true, userId: true, isPublic: true },
    });

    if (!map) {
      throw Errors.notFound('Mind map');
    }

    // If user is owner, always allow
    if (map.userId === userId) {
      (req as PermissionRequest).mapPermission = {
        hasAccess: true,
        permission: 'OWNER',
        isOwner: true,
        isPublic: map.isPublic,
      };
      return next();
    }

    // If map is public and only VIEWER is required, allow
    if (map.isPublic && requiredPermission === 'VIEWER') {
      (req as PermissionRequest).mapPermission = {
        hasAccess: true,
        permission: 'VIEWER',
        isOwner: false,
        isPublic: true,
      };
      return next();
    }

    // Check for explicit share
    const permissionResult = await getMapPermission(userId, mapId);

    if (!permissionResult.hasAccess || !permissionResult.permission) {
      throw Errors.forbidden('You do not have access to this map');
    }

    if (!hasRequiredPermission(permissionResult.permission, requiredPermission)) {
      throw Errors.forbidden('Insufficient permissions for this operation');
    }

    (req as PermissionRequest).mapPermission = permissionResult;
    next();
  });
}

/**
 * Middleware that checks multiple permission conditions with OR logic
 *
 * @example
 * // Allow if user is EDITOR OR is the map owner
 * router.put('/:id', requireAnyMapPermission(['EDITOR', 'OWNER']), handler);
 */
export function requireAnyMapPermission(
  permissions: MapPermission[],
  options: {
    paramName?: string;
    errorMessage?: string;
  } = {}
): RequestHandler {
  const { paramName = 'id', errorMessage } = options;

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const mapId = req.params[paramName];
    const userId = getUserId(req);

    if (!mapId) {
      throw Errors.badRequest(`Map ID parameter '${paramName}' is required`);
    }

    const map = await prisma.mindMap.findUnique({
      where: { id: mapId },
      select: { id: true },
    });

    if (!map) {
      throw Errors.notFound('Mind map');
    }

    const permissionResult = await getMapPermission(userId, mapId);

    if (!permissionResult.hasAccess || !permissionResult.permission) {
      throw Errors.forbidden(errorMessage || 'Access denied');
    }

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some((required) =>
      hasRequiredPermission(permissionResult.permission!, required)
    );

    if (!hasAnyPermission) {
      throw Errors.forbidden(
        errorMessage || `Insufficient permissions. Required one of: ${permissions.join(', ')}`
      );
    }

    (req as PermissionRequest).mapPermission = permissionResult;
    next();
  });
}

// ==========================================
// Utility Middleware
// ==========================================

/**
 * Middleware that attaches permission info to request without enforcing any permission level
 * Useful when you need to check permissions within the handler
 *
 * @example
 * router.get('/:id', attachMapPermission(), (req, res) => {
 *   const perm = (req as PermissionRequest).mapPermission;
 *   // Conditional logic based on permission
 * });
 */
export function attachMapPermission(
  options: {
    paramName?: string;
  } = {}
): RequestHandler {
  const { paramName = 'id' } = options;

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const mapId = req.params[paramName];
    const userId = getUserId(req);

    if (!mapId) {
      // No map ID, skip permission check
      return next();
    }

    const permissionResult = await getMapPermission(userId, mapId);
    (req as PermissionRequest).mapPermission = permissionResult;
    next();
  });
}

/**
 * Validates that the requesting user is authenticated
 * Throws 401 if no user is found
 */
export function requireAuthentication(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    if (!userId) {
      throw Errors.unauthorized('Authentication required');
    }

    next();
  };
}
