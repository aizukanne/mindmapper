import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const foldersRouter = Router();

// Helper to get user ID from request (with fallback for dev mode)
function getUserId(req: { userId?: string }): string {
  return req.userId || 'dev-user-id';
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
      orderBy: { name: 'asc' },
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
      orderBy: { name: 'asc' },
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
          orderBy: { name: 'asc' },
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

// Create a folder
foldersRouter.post('/folders', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { name, parentId } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Verify parent folder exists and belongs to user
    if (parentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId, userId },
      });
      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        userId,
        parentId: parentId || null,
      },
      include: {
        _count: {
          select: { children: true, mindMaps: true },
        },
      },
    });

    res.status(201).json({ data: folder });
  } catch (error) {
    next(error);
  }
});

// Update a folder
foldersRouter.put('/folders/:folderId', async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userId = getUserId(req);
    const { name, parentId } = req.body;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, userId },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Prevent moving folder to itself or its descendants
    if (parentId) {
      if (parentId === folderId) {
        return res.status(400).json({ error: 'Cannot move folder into itself' });
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
        return res.status(400).json({ error: 'Cannot move folder into its descendant' });
      }

      // Verify parent exists and belongs to user
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId, userId },
      });
      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        parentId: parentId !== undefined ? parentId : undefined,
      },
      include: {
        _count: {
          select: { children: true, mindMaps: true },
        },
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

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
