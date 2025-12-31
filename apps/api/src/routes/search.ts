import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const searchRouter = Router();

// Validation schemas
const globalSearchSchema = z.object({
  q: z.string().min(1).max(500),
  type: z.enum(['all', 'maps', 'nodes']).optional().default('all'),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

const mapSearchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

interface SearchResult {
  type: 'map' | 'node';
  id: string;
  mapId: string;
  mapTitle: string;
  text: string;
  matchedField: string;
  excerpt: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create an excerpt with highlighted matches
 */
function createExcerpt(text: string, query: string, maxLength: number = 150): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/).filter(t => t.length > 0);

  // Find the first matching term position
  let matchPosition = -1;
  for (const term of terms) {
    const pos = lowerText.indexOf(term);
    if (pos !== -1 && (matchPosition === -1 || pos < matchPosition)) {
      matchPosition = pos;
    }
  }

  if (matchPosition === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Calculate excerpt boundaries
  const start = Math.max(0, matchPosition - 40);
  const end = Math.min(text.length, matchPosition + maxLength - 40);

  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
}

/**
 * Calculate relevance score based on match quality
 */
function calculateScore(text: string, query: string, isTitle: boolean): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/).filter(t => t.length > 0);

  let score = 0;

  // Exact phrase match (highest score)
  if (lowerText.includes(lowerQuery)) {
    score += 100;
  }

  // All terms present
  const allTermsPresent = terms.every(term => lowerText.includes(term));
  if (allTermsPresent) {
    score += 50;
  }

  // Individual term matches
  for (const term of terms) {
    if (lowerText.includes(term)) {
      score += 10;
      // Bonus for word boundary matches
      const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (wordBoundaryRegex.test(text)) {
        score += 5;
      }
    }
  }

  // Title matches are worth more
  if (isTitle) {
    score *= 2;
  }

  // Shorter texts that match are usually more relevant
  if (text.length < 100 && score > 0) {
    score += 10;
  }

  return score;
}

/**
 * Check if text matches query
 */
function matchesQuery(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/).filter(t => t.length > 0);

  // Match if any term is found
  return terms.some(term => lowerText.includes(term));
}

// GET /api/search - Global search across user's maps and nodes
searchRouter.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { q, type, limit, offset } = globalSearchSchema.parse(req.query);

    const results: SearchResult[] = [];

    // Search maps if type is 'all' or 'maps'
    if (type === 'all' || type === 'maps') {
      const maps = await prisma.mindMap.findMany({
        where: {
          userId,
          isArchived: false,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
        take: limit,
      });

      for (const map of maps) {
        // Check which field matched
        const titleMatches = matchesQuery(map.title, q);
        const descMatches = map.description && matchesQuery(map.description, q);

        if (titleMatches) {
          results.push({
            type: 'map',
            id: map.id,
            mapId: map.id,
            mapTitle: map.title,
            text: map.title,
            matchedField: 'title',
            excerpt: createExcerpt(map.title, q),
            score: calculateScore(map.title, q, true),
            createdAt: map.createdAt,
            updatedAt: map.updatedAt,
          });
        }

        if (descMatches && map.description) {
          results.push({
            type: 'map',
            id: map.id,
            mapId: map.id,
            mapTitle: map.title,
            text: map.description,
            matchedField: 'description',
            excerpt: createExcerpt(map.description, q),
            score: calculateScore(map.description, q, false),
            createdAt: map.createdAt,
            updatedAt: map.updatedAt,
          });
        }
      }
    }

    // Search nodes if type is 'all' or 'nodes'
    if (type === 'all' || type === 'nodes') {
      const nodes = await prisma.node.findMany({
        where: {
          mindMap: {
            userId,
            isArchived: false,
          },
          text: { contains: q, mode: 'insensitive' },
        },
        select: {
          id: true,
          text: true,
          type: true,
          mindMapId: true,
          mindMap: {
            select: {
              title: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        take: limit * 2, // Get more nodes since they may be filtered
      });

      for (const node of nodes) {
        results.push({
          type: 'node',
          id: node.id,
          mapId: node.mindMapId,
          mapTitle: node.mindMap.title,
          text: node.text,
          matchedField: 'text',
          excerpt: createExcerpt(node.text, q),
          score: calculateScore(node.text, q, node.type === 'ROOT'),
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        });
      }
    }

    // Sort by score (descending) then by updated date (newest first)
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        total: results.length,
        limit,
        offset,
        hasMore: offset + limit < results.length,
      },
      query: q,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/:id/search - Search within a specific map
searchRouter.get('/maps/:id/search', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { id: mapId } = req.params;
    const { q, limit } = mapSearchSchema.parse(req.query);

    // Verify user has access to the map
    const map = await prisma.mindMap.findFirst({
      where: {
        id: mapId,
        OR: [
          { userId },
          { isPublic: true },
        ],
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!map) {
      throw new AppError(404, 'Mind map not found');
    }

    // Search nodes within the map
    const nodes = await prisma.node.findMany({
      where: {
        mindMapId: mapId,
        text: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        text: true,
        type: true,
        positionX: true,
        positionY: true,
        createdAt: true,
        updatedAt: true,
      },
      take: limit,
    });

    // Calculate scores and create results
    const results = nodes.map(node => ({
      id: node.id,
      text: node.text,
      type: node.type,
      position: { x: node.positionX, y: node.positionY },
      excerpt: createExcerpt(node.text, q),
      score: calculateScore(node.text, q, node.type === 'ROOT'),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    }));

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: results,
      mapId,
      mapTitle: map.title,
      query: q,
      totalMatches: results.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/search/suggestions - Get search suggestions based on recent/popular terms
searchRouter.get('/suggestions', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const q = (req.query.q as string) || '';

    // Get unique node texts that match the prefix
    const suggestions: string[] = [];

    if (q.length >= 2) {
      // Get matching map titles
      const maps = await prisma.mindMap.findMany({
        where: {
          userId,
          isArchived: false,
          title: { startsWith: q, mode: 'insensitive' },
        },
        select: { title: true },
        take: 5,
        distinct: ['title'],
      });

      for (const map of maps) {
        if (!suggestions.includes(map.title)) {
          suggestions.push(map.title);
        }
      }

      // Get matching node texts (distinct, limited)
      const nodes = await prisma.node.findMany({
        where: {
          mindMap: {
            userId,
            isArchived: false,
          },
          text: { startsWith: q, mode: 'insensitive' },
        },
        select: { text: true },
        take: 10,
        distinct: ['text'],
      });

      for (const node of nodes) {
        if (!suggestions.includes(node.text) && suggestions.length < 10) {
          suggestions.push(node.text);
        }
      }
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
});
