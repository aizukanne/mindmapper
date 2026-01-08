import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const usersRouter = Router();

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Validation schema for user search
const searchUsersSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).optional().default(10),
});

/**
 * GET /api/users/search - Search for users by email or name
 * Used for sharing mind maps with specific users
 */
usersRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const currentUserId = getUserId(req);
    const { q, limit } = searchUsersSchema.parse(req.query);

    // Search for users by email or name (excluding current user)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
      take: limit,
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: users,
    });
  })
);

/**
 * GET /api/users/:id - Get a specific user's public info
 */
usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  })
);
