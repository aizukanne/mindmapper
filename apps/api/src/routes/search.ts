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
 * Create an excerpt with highlighted matches using ts_headline
 * Falls back to simple excerpt for non-FTS scenarios
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
 * Escape special characters for tsquery
 */
function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could break tsquery
  return query
    .replace(/[<>():&|!*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert search query to PostgreSQL tsquery format with prefix matching
 */
function toTsQueryWithPrefix(query: string): string {
  const sanitized = sanitizeSearchQuery(query);
  const terms = sanitized.split(' ').filter(t => t.length > 0);

  if (terms.length === 0) return '';

  // Add :* for prefix matching on all words
  return terms.map(term => `${term}:*`).join(' & ');
}

// GET /api/search - Global search across user's maps and nodes using PostgreSQL Full-Text Search
searchRouter.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { q, type, limit, offset } = globalSearchSchema.parse(req.query);

    const results: SearchResult[] = [];
    const tsQuery = toTsQueryWithPrefix(q);

    if (!tsQuery) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
        query: q,
      });
    }

    // Search maps if type is 'all' or 'maps'
    if (type === 'all' || type === 'maps') {
      // Use raw query for full-text search with ranking
      const maps = await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
        headline_title: string;
        headline_desc: string | null;
      }>>`
        SELECT
          id,
          title,
          description,
          "createdAt",
          "updatedAt",
          ts_rank_cd("searchVector", to_tsquery('english', ${tsQuery}), 32) as rank,
          ts_headline('english', title, to_tsquery('english', ${tsQuery}),
            'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline_title,
          ts_headline('english', COALESCE(description, ''), to_tsquery('english', ${tsQuery}),
            'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline_desc
        FROM "MindMap"
        WHERE "userId" = ${userId}
          AND "isArchived" = false
          AND "searchVector" @@ to_tsquery('english', ${tsQuery})
        ORDER BY rank DESC
        LIMIT ${limit * 2}
      `;

      for (const map of maps) {
        // Add title match result
        results.push({
          type: 'map',
          id: map.id,
          mapId: map.id,
          mapTitle: map.title,
          text: map.title,
          matchedField: 'title',
          excerpt: map.headline_title || createExcerpt(map.title, q),
          score: map.rank * 2, // Title matches are weighted higher
          createdAt: map.createdAt,
          updatedAt: map.updatedAt,
        });

        // Add description match if there's a description and it contributes to ranking
        if (map.description && map.headline_desc && map.headline_desc.includes('<mark>')) {
          results.push({
            type: 'map',
            id: map.id,
            mapId: map.id,
            mapTitle: map.title,
            text: map.description,
            matchedField: 'description',
            excerpt: map.headline_desc || createExcerpt(map.description, q),
            score: map.rank,
            createdAt: map.createdAt,
            updatedAt: map.updatedAt,
          });
        }
      }
    }

    // Search nodes if type is 'all' or 'nodes'
    if (type === 'all' || type === 'nodes') {
      const nodes = await prisma.$queryRaw<Array<{
        id: string;
        text: string;
        type: string;
        mindMapId: string;
        mapTitle: string;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
        headline: string;
      }>>`
        SELECT
          n.id,
          n.text,
          n.type,
          n."mindMapId",
          m.title as "mapTitle",
          n."createdAt",
          n."updatedAt",
          ts_rank_cd(n."searchVector", to_tsquery('english', ${tsQuery}), 32) as rank,
          ts_headline('english', n.text, to_tsquery('english', ${tsQuery}),
            'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline
        FROM "Node" n
        JOIN "MindMap" m ON n."mindMapId" = m.id
        WHERE m."userId" = ${userId}
          AND m."isArchived" = false
          AND n."searchVector" @@ to_tsquery('english', ${tsQuery})
        ORDER BY rank DESC
        LIMIT ${limit * 2}
      `;

      for (const node of nodes) {
        results.push({
          type: 'node',
          id: node.id,
          mapId: node.mindMapId,
          mapTitle: node.mapTitle,
          text: node.text,
          matchedField: 'text',
          excerpt: node.headline || createExcerpt(node.text, q),
          score: node.rank * (node.type === 'ROOT' ? 1.5 : 1), // ROOT nodes get slight boost
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

// GET /api/maps/:id/search - Search within a specific map using Full-Text Search
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

    const tsQuery = toTsQueryWithPrefix(q);

    if (!tsQuery) {
      return res.json({
        success: true,
        data: [],
        mapId,
        mapTitle: map.title,
        query: q,
        totalMatches: 0,
      });
    }

    // Search nodes within the map using full-text search
    const nodes = await prisma.$queryRaw<Array<{
      id: string;
      text: string;
      type: string;
      positionX: number;
      positionY: number;
      createdAt: Date;
      updatedAt: Date;
      rank: number;
      headline: string;
    }>>`
      SELECT
        id,
        text,
        type,
        "positionX",
        "positionY",
        "createdAt",
        "updatedAt",
        ts_rank_cd("searchVector", to_tsquery('english', ${tsQuery}), 32) as rank,
        ts_headline('english', text, to_tsquery('english', ${tsQuery}),
          'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline
      FROM "Node"
      WHERE "mindMapId" = ${mapId}
        AND "searchVector" @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    // Calculate scores and create results
    const results = nodes.map(node => ({
      id: node.id,
      text: node.text,
      type: node.type,
      position: { x: node.positionX, y: node.positionY },
      excerpt: node.headline || createExcerpt(node.text, q),
      score: node.rank * (node.type === 'ROOT' ? 1.5 : 1),
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

// GET /api/search/suggestions - Get search suggestions using full-text search
searchRouter.get('/suggestions', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const q = (req.query.q as string) || '';

    // Get unique node texts that match the prefix
    const suggestions: string[] = [];

    if (q.length >= 2) {
      const sanitized = sanitizeSearchQuery(q);

      // Use prefix matching for suggestions
      const tsQuery = sanitized.split(' ').filter(t => t.length > 0)
        .map(term => `${term}:*`).join(' & ');

      if (tsQuery) {
        // Get matching map titles using full-text search
        const maps = await prisma.$queryRaw<Array<{ title: string }>>`
          SELECT DISTINCT title
          FROM "MindMap"
          WHERE "userId" = ${userId}
            AND "isArchived" = false
            AND "searchVector" @@ to_tsquery('english', ${tsQuery})
          LIMIT 5
        `;

        for (const map of maps) {
          if (!suggestions.includes(map.title)) {
            suggestions.push(map.title);
          }
        }

        // Get matching node texts using full-text search
        const nodes = await prisma.$queryRaw<Array<{ text: string }>>`
          SELECT DISTINCT n.text
          FROM "Node" n
          JOIN "MindMap" m ON n."mindMapId" = m.id
          WHERE m."userId" = ${userId}
            AND m."isArchived" = false
            AND n."searchVector" @@ to_tsquery('english', ${tsQuery})
          LIMIT 10
        `;

        for (const node of nodes) {
          if (!suggestions.includes(node.text) && suggestions.length < 10) {
            suggestions.push(node.text);
          }
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

// GET /api/search/advanced - Advanced search with additional options
searchRouter.get('/advanced', async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const advancedSearchSchema = z.object({
      q: z.string().min(1).max(500),
      type: z.enum(['all', 'maps', 'nodes', 'connections']).optional().default('all'),
      matchType: z.enum(['any', 'all', 'phrase']).optional().default('any'),
      limit: z.coerce.number().min(1).max(100).optional().default(20),
      offset: z.coerce.number().min(0).optional().default(0),
    });

    const { q, type, matchType, limit, offset } = advancedSearchSchema.parse(req.query);

    const sanitized = sanitizeSearchQuery(q);
    const terms = sanitized.split(' ').filter(t => t.length > 0);

    if (terms.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
        query: q,
      });
    }

    // Build tsquery based on match type
    let tsQuery: string;
    switch (matchType) {
      case 'phrase':
        // Phrase search: all words in order
        tsQuery = terms.map(term => `${term}`).join(' <-> ');
        break;
      case 'all':
        // All words must match
        tsQuery = terms.map(term => `${term}:*`).join(' & ');
        break;
      case 'any':
      default:
        // Any word can match
        tsQuery = terms.map(term => `${term}:*`).join(' | ');
        break;
    }

    const results: Array<{
      type: string;
      id: string;
      mapId: string;
      mapTitle: string;
      text: string;
      matchedField: string;
      excerpt: string;
      score: number;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    // Search maps
    if (type === 'all' || type === 'maps') {
      const maps = await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
        headline: string;
      }>>`
        SELECT
          id,
          title,
          description,
          "createdAt",
          "updatedAt",
          ts_rank_cd("searchVector", to_tsquery('english', ${tsQuery}), 32) as rank,
          ts_headline('english', title || ' ' || COALESCE(description, ''),
            to_tsquery('english', ${tsQuery}),
            'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>') as headline
        FROM "MindMap"
        WHERE "userId" = ${userId}
          AND "isArchived" = false
          AND "searchVector" @@ to_tsquery('english', ${tsQuery})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

      for (const map of maps) {
        results.push({
          type: 'map',
          id: map.id,
          mapId: map.id,
          mapTitle: map.title,
          text: map.title,
          matchedField: 'title',
          excerpt: map.headline,
          score: map.rank * 2,
          createdAt: map.createdAt,
          updatedAt: map.updatedAt,
        });
      }
    }

    // Search nodes
    if (type === 'all' || type === 'nodes') {
      const nodes = await prisma.$queryRaw<Array<{
        id: string;
        text: string;
        type: string;
        mindMapId: string;
        mapTitle: string;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
        headline: string;
      }>>`
        SELECT
          n.id,
          n.text,
          n.type,
          n."mindMapId",
          m.title as "mapTitle",
          n."createdAt",
          n."updatedAt",
          ts_rank_cd(n."searchVector", to_tsquery('english', ${tsQuery}), 32) as rank,
          ts_headline('english', n.text, to_tsquery('english', ${tsQuery}),
            'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>') as headline
        FROM "Node" n
        JOIN "MindMap" m ON n."mindMapId" = m.id
        WHERE m."userId" = ${userId}
          AND m."isArchived" = false
          AND n."searchVector" @@ to_tsquery('english', ${tsQuery})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

      for (const node of nodes) {
        results.push({
          type: 'node',
          id: node.id,
          mapId: node.mindMapId,
          mapTitle: node.mapTitle,
          text: node.text,
          matchedField: 'text',
          excerpt: node.headline,
          score: node.rank,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        });
      }
    }

    // Search connections
    if (type === 'all' || type === 'connections') {
      const connections = await prisma.$queryRaw<Array<{
        id: string;
        label: string;
        mindMapId: string;
        mapTitle: string;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
        headline: string;
      }>>`
        SELECT
          c.id,
          c.label,
          c."mindMapId",
          m.title as "mapTitle",
          c."createdAt",
          c."updatedAt",
          ts_rank_cd(c."searchVector", to_tsquery('english', ${tsQuery}), 32) as rank,
          ts_headline('english', c.label, to_tsquery('english', ${tsQuery}),
            'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>') as headline
        FROM "Connection" c
        JOIN "MindMap" m ON c."mindMapId" = m.id
        WHERE m."userId" = ${userId}
          AND m."isArchived" = false
          AND c.label IS NOT NULL
          AND c."searchVector" @@ to_tsquery('english', ${tsQuery})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

      for (const conn of connections) {
        results.push({
          type: 'connection',
          id: conn.id,
          mapId: conn.mindMapId,
          mapTitle: conn.mapTitle,
          text: conn.label,
          matchedField: 'label',
          excerpt: conn.headline,
          score: conn.rank * 0.8, // Connections are slightly less important
          createdAt: conn.createdAt,
          updatedAt: conn.updatedAt,
        });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

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
      matchType,
    });
  } catch (error) {
    next(error);
  }
});
