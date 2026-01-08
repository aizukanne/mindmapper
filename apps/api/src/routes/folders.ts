import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody, validateParams, validateQuery, type ValidatedRequest } from '../middleware/validate.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import { cuidSchema, nonEmptyString, optionalIdSchema, nonNegativeIntSchema } from '../lib/validation/schemas.js';

export const foldersRouter = Router();

// Constants
const MAX_NESTING_DEPTH = 10; // Maximum folder nesting depth

// Validation schemas
const createFolderSchema = z.object({
  name: nonEmptyString(255),
  parentId: z.string().cuid().nullable().optional(),
  order: nonNegativeIntSchema.optional(),
});

const updateFolderSchema = z.object({
  name: nonEmptyString(255).optional(),
  parentId: z.string().cuid().nullable().optional(),
  order: nonNegativeIntSchema.optional(),
});

const folderIdParamSchema = z.object({
  folderId: cuidSchema,
});

const mapIdParamSchema = z.object({
  folderId: z.string(), // Can be 'root' or cuid
  mapId: cuidSchema,
});

const reorderFoldersSchema = z.object({
  folderOrders: z.array(z.object({
    id: cuidSchema,
    order: nonNegativeIntSchema,
  })),
});

const deleteFolderQuerySchema = z.object({
  moveContentsTo: z.string().optional(),
});

const batchMoveSchema = z.object({
  mapIds: z.array(cuidSchema).min(1, 'At least one map ID is required'),
  targetFolderId: z.string().nullable(), // null means root, otherwise cuid
});

const listFoldersQuerySchema = z.object({
  parentId: z.string().optional(),
});

// Helper to get user ID from request (with fallback for dev mode)
function getUserId(req: { userId?: string }): string {
  return req.userId || 'dev-user-id';
}

/**
 * Calculate the depth of a folder in the hierarchy
 * @param folderId - The folder ID to calculate depth for
 * @param userId - The user ID for security
 * @returns The depth of the folder (0 for root-level folders)
 */
async function calculateFolderDepth(folderId: string, userId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId, userId },
      select: { parentId: true },
    });

    if (!folder) break;

    if (folder.parentId) {
      depth++;
      currentId = folder.parentId;
    } else {
      break;
    }
  }

  return depth;
}

/**
 * Calculate the maximum depth of descendants from a folder
 * @param folderId - The folder ID to start from
 * @param userId - The user ID for security
 * @returns The maximum depth of the subtree
 */
async function calculateSubtreeDepth(folderId: string, userId: string): Promise<number> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId, userId },
    select: { id: true },
  });

  if (children.length === 0) {
    return 0;
  }

  let maxChildDepth = 0;
  for (const child of children) {
    const childDepth = await calculateSubtreeDepth(child.id, userId);
    maxChildDepth = Math.max(maxChildDepth, childDepth + 1);
  }

  return maxChildDepth;
}

/**
 * Validate that moving a folder to a new parent won't exceed max nesting depth
 * @param folderId - The folder being moved (null for new folder)
 * @param newParentId - The new parent folder ID (null for root)
 * @param userId - The user ID for security
 * @returns true if the move is valid, false otherwise
 */
async function validateNestingDepth(
  folderId: string | null,
  newParentId: string | null,
  userId: string
): Promise<{ valid: boolean; currentDepth: number; maxAllowed: number }> {
  // Calculate the depth of the new parent
  let parentDepth = 0;
  if (newParentId) {
    parentDepth = await calculateFolderDepth(newParentId, userId) + 1;
  }

  // Calculate the depth of the folder's subtree (if it exists)
  let subtreeDepth = 0;
  if (folderId) {
    subtreeDepth = await calculateSubtreeDepth(folderId, userId);
  }

  // The total depth would be: parent depth + 1 (for this folder) + subtree depth
  const totalDepth = parentDepth + subtreeDepth;

  return {
    valid: totalDepth < MAX_NESTING_DEPTH,
    currentDepth: totalDepth,
    maxAllowed: MAX_NESTING_DEPTH,
  };
}

// Get all folders for the current user
foldersRouter.get('/folders', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { parentId } = req.query;

    const where: {
      userId: string;
      parentId?: string | null;
    } = { userId };

    if (parentId === 'null' || parentId === '') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId as string;
    }

    const folders = await prisma.folder.findMany({
      where,
      include: {
        _count: {
          select: {
            children: true,
            mindMaps: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    res.json({ data: folders });
  } catch (error) {
    next(error);
  }
});

// Get folder tree (all folders with hierarchy)
foldersRouter.get('/folders/tree', async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const folders = await prisma.folder.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            children: true,
            mindMaps: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    // Build tree structure
    const buildTree = (parentId: string | null): typeof folders extends (infer T)[] ? (T & { children: ReturnType<typeof buildTree> })[] : never => {
      return folders
        .filter((f) => f.parentId === parentId)
        .map((folder) => ({
          ...folder,
          children: buildTree(folder.id),
        })) as ReturnType<typeof buildTree>;
    };

    const tree = buildTree(null);

    res.json({ data: tree, flat: folders });
  } catch (error) {
    next(error);
  }
});

// Get folder hierarchy with depth information
// IMPORTANT: This route must be BEFORE /:folderId routes to avoid routing conflicts
foldersRouter.get(
  '/folders/hierarchy',
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);

    const folders = await prisma.folder.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            children: true,
            mindMaps: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    // Build hierarchy with depth information
    const folderMap = new Map<string, typeof folders[0] & { depth: number; path: string[] }>();

    // First pass: create map entries
    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, depth: 0, path: [folder.name] });
    });

    // Second pass: calculate depths and paths
    const calculateDepth = (folderId: string): { depth: number; path: string[] } => {
      const folder = folderMap.get(folderId);
      if (!folder) return { depth: 0, path: [] };

      if (folder.parentId) {
        const parentInfo = calculateDepth(folder.parentId);
        return {
          depth: parentInfo.depth + 1,
          path: [...parentInfo.path, folder.name],
        };
      }

      return { depth: 0, path: [folder.name] };
    };

    const result = folders.map((folder) => {
      const { depth, path } = calculateDepth(folder.id);
      return {
        ...folder,
        depth,
        path,
      };
    });

    res.json({
      success: true,
      data: result,
      meta: {
        maxNestingDepth: MAX_NESTING_DEPTH,
        totalFolders: folders.length,
      },
    });
  })
);

// Batch move multiple maps to a folder
// IMPORTANT: This route must be BEFORE /:folderId routes to avoid routing conflicts
foldersRouter.post(
  '/folders/batch-move-maps',
  validateBody(batchMoveSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { mapIds, targetFolderId } = (req as ValidatedRequest).validatedBody as z.infer<typeof batchMoveSchema>;

    // Verify target folder exists and belongs to user (unless moving to root)
    if (targetFolderId !== null) {
      const targetFolder = await prisma.folder.findUnique({
        where: { id: targetFolderId, userId },
      });
      if (!targetFolder) {
        throw Errors.notFound('Target folder');
      }
    }

    // Verify all maps belong to the user
    const maps = await prisma.mindMap.findMany({
      where: {
        id: { in: mapIds },
        userId,
      },
      select: { id: true },
    });

    const foundMapIds = new Set(maps.map((m) => m.id));
    const notFoundIds = mapIds.filter((id) => !foundMapIds.has(id));

    if (notFoundIds.length > 0) {
      throw Errors.notFound(`Maps with IDs: ${notFoundIds.join(', ')}`);
    }

    // Batch update all maps
    const result = await prisma.mindMap.updateMany({
      where: {
        id: { in: mapIds },
        userId,
      },
      data: {
        folderId: targetFolderId,
      },
    });

    res.json({
      success: true,
      data: {
        movedCount: result.count,
        targetFolderId: targetFolderId,
      },
    });
  })
);

// Get a specific folder
foldersRouter.get('/folders/:folderId', async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userId = getUserId(req);

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, userId },
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: { children: true, mindMaps: true },
            },
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
        mindMaps: {
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: { children: true, mindMaps: true },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ data: folder });
  } catch (error) {
    next(error);
  }
});

// Reorder folders (bulk update order) - MUST be before /:folderId routes
foldersRouter.put('/folders/reorder', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { folderOrders } = req.body;

    if (!Array.isArray(folderOrders)) {
      return res.status(400).json({ error: 'folderOrders must be an array' });
    }

    // Validate and update each folder's order
    const updates = await Promise.all(
      folderOrders.map(async ({ id, order }: { id: string; order: number }) => {
        // Verify folder belongs to user
        const folder = await prisma.folder.findUnique({
          where: { id, userId },
        });
        if (!folder) {
          throw new Error(`Folder ${id} not found`);
        }
        return prisma.folder.update({
          where: { id },
          data: { order },
        });
      })
    );

    res.json({ data: updates });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Create a folder
foldersRouter.post(
  '/folders',
  validateBody(createFolderSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { name, parentId, order } = (req as ValidatedRequest).validatedBody as z.infer<typeof createFolderSchema>;

    // Verify parent folder exists and belongs to user
    if (parentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId, userId },
      });
      if (!parentFolder) {
        throw Errors.notFound('Parent folder');
      }

      // Validate nesting depth
      const depthValidation = await validateNestingDepth(null, parentId, userId);
      if (!depthValidation.valid) {
        throw Errors.badRequest(
          `Cannot create folder: maximum nesting depth of ${depthValidation.maxAllowed} would be exceeded`,
          { currentDepth: depthValidation.currentDepth, maxAllowed: depthValidation.maxAllowed }
        );
      }
    }

    // Calculate order if not provided - place at the end
    let folderOrder = order;
    if (folderOrder === undefined || folderOrder === null) {
      const maxOrderFolder = await prisma.folder.findFirst({
        where: { userId, parentId: parentId || null },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      folderOrder = (maxOrderFolder?.order ?? -1) + 1;
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        userId,
        parentId: parentId || null,
        order: folderOrder,
      },
      include: {
        _count: {
          select: { children: true, mindMaps: true },
        },
      },
    });

    res.status(201).json({ success: true, data: folder });
  })
);

// Update a folder
foldersRouter.put(
  '/folders/:folderId',
  validateParams(folderIdParamSchema),
  validateBody(updateFolderSchema),
  asyncHandler(async (req, res) => {
    const { folderId } = (req as ValidatedRequest).validatedParams as z.infer<typeof folderIdParamSchema>;
    const userId = getUserId(req);
    const { name, parentId, order } = (req as ValidatedRequest).validatedBody as z.infer<typeof updateFolderSchema>;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, userId },
    });

    if (!folder) {
      throw Errors.notFound('Folder');
    }

    // Prevent moving folder to itself or its descendants
    if (parentId !== undefined && parentId !== null) {
      if (parentId === folderId) {
        throw Errors.badRequest('Cannot move folder into itself');
      }

      // Check if parentId is a descendant
      const isDescendant = async (checkId: string, targetId: string): Promise<boolean> => {
        const children = await prisma.folder.findMany({
          where: { parentId: checkId, userId },
          select: { id: true },
        });

        for (const child of children) {
          if (child.id === targetId) return true;
          if (await isDescendant(child.id, targetId)) return true;
        }
        return false;
      };

      if (await isDescendant(folderId, parentId)) {
        throw Errors.badRequest('Cannot move folder into its descendant');
      }

      // Verify parent exists and belongs to user
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId, userId },
      });
      if (!parentFolder) {
        throw Errors.notFound('Parent folder');
      }

      // Validate nesting depth when changing parent
      if (parentId !== folder.parentId) {
        const depthValidation = await validateNestingDepth(folderId, parentId, userId);
        if (!depthValidation.valid) {
          throw Errors.badRequest(
            `Cannot move folder: maximum nesting depth of ${depthValidation.maxAllowed} would be exceeded`,
            { currentDepth: depthValidation.currentDepth, maxAllowed: depthValidation.maxAllowed }
          );
        }
      }
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        parentId: parentId !== undefined ? parentId : undefined,
        order: order !== undefined ? order : undefined,
      },
      include: {
        _count: {
          select: { children: true, mindMaps: true },
        },
      },
    });

    res.json({ success: true, data: updated });
  })
);

// Delete a folder
foldersRouter.delete('/folders/:folderId', async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userId = getUserId(req);
    const { moveContentsTo } = req.query;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, userId },
      include: {
        _count: { select: { children: true, mindMaps: true } },
      },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // If folder has contents and moveContentsTo is specified, move them
    if (moveContentsTo) {
      const targetId = moveContentsTo === 'root' ? null : (moveContentsTo as string);

      // Verify target folder exists (if not root)
      if (targetId) {
        const targetFolder = await prisma.folder.findUnique({
          where: { id: targetId, userId },
        });
        if (!targetFolder) {
          return res.status(404).json({ error: 'Target folder not found' });
        }
      }

      // Move child folders
      await prisma.folder.updateMany({
        where: { parentId: folderId, userId },
        data: { parentId: targetId },
      });

      // Move mind maps
      await prisma.mindMap.updateMany({
        where: { folderId, userId },
        data: { folderId: targetId },
      });
    }

    // Delete folder (cascade will delete contents if not moved)
    await prisma.folder.delete({
      where: { id: folderId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Move a mind map to a folder
foldersRouter.post('/folders/:folderId/maps/:mapId', async (req, res, next) => {
  try {
    const { folderId, mapId } = req.params;
    const userId = getUserId(req);

    // Verify folder belongs to user (unless moving to root)
    if (folderId !== 'root') {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId, userId },
      });
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    // Verify map belongs to user
    const map = await prisma.mindMap.findUnique({
      where: { id: mapId, userId },
    });
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    const updated = await prisma.mindMap.update({
      where: { id: mapId },
      data: { folderId: folderId === 'root' ? null : folderId },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// Get breadcrumb path for a folder
foldersRouter.get('/folders/:folderId/breadcrumb', async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userId = getUserId(req);

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, userId },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const breadcrumb: Array<{ id: string; name: string }> = [];
    let current: typeof folder | null = folder;

    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name });
      if (current.parentId) {
        current = await prisma.folder.findUnique({
          where: { id: current.parentId, userId },
        });
      } else {
        current = null;
      }
    }

    res.json({ data: breadcrumb });
  } catch (error) {
    next(error);
  }
});
