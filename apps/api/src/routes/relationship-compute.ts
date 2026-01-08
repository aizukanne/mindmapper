/**
 * Computed Relationship Routes
 *
 * Provides API endpoints for computing and querying relationships
 * using the @mindmapper/family-graph package.
 *
 * All relationships are computed on-demand from foundational data
 * (parent-child and spouse relationships).
 */

import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, ErrorCodes } from '../middleware/errorHandler.js';
import { checkTreeAccess } from '../lib/permissions.js';
import {
  FamilyGraph,
  computeRelationship,
  computeRelationshipsBatch,
  computeRelationshipMatrix,
  findCommonAncestors,
  getAllAncestorsWithDistance,
  getAllDescendantsWithDistance,
  findAllPaths,
  RelationshipNamer,
  getRelationshipCache,
  type PersonNode,
  type StoredRelationship,
  type ComputedRelationship,
  type CommonAncestor,
  type DerivedRelationType,
  type BatchResult,
} from '@mindmapper/family-graph';

// Initialize the relationship cache with optimized settings
const relationshipCache = getRelationshipCache({
  maxSize: 10000,
  ttlMs: 60 * 60 * 1000, // 1 hour
  trackStats: true,
});

export const relationshipComputeRouter = Router();

// ==========================================
// Graph Caching
// ==========================================

interface CachedGraph {
  graph: FamilyGraph;
  timestamp: number;
  version: number;
}

// In-memory cache for FamilyGraph instances
// Key: treeId, Value: CachedGraph
const graphCache = new Map<string, CachedGraph>();

// Tree version tracking for cache invalidation
// Incremented when relationships change
const treeVersions = new Map<string, number>();

// Cache TTL: 5 minutes (graphs are also invalidated on relationship changes)
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get the current version for a tree (for cache invalidation)
 */
export function getTreeVersion(treeId: string): number {
  return treeVersions.get(treeId) || 0;
}

/**
 * Increment tree version to invalidate cache
 * Call this when relationships are created, updated, or deleted
 */
export function invalidateTreeCache(treeId: string): void {
  const currentVersion = treeVersions.get(treeId) || 0;
  treeVersions.set(treeId, currentVersion + 1);
  // Also remove from graph cache
  graphCache.delete(treeId);
}

/**
 * Load a FamilyGraph for a tree, using cache when available
 */
async function loadFamilyGraph(treeId: string): Promise<FamilyGraph> {
  const currentVersion = getTreeVersion(treeId);
  const cached = graphCache.get(treeId);

  // Check if cache is valid
  if (cached) {
    const isVersionValid = cached.version === currentVersion;
    const isNotExpired = Date.now() - cached.timestamp < CACHE_TTL_MS;

    if (isVersionValid && isNotExpired) {
      return cached.graph;
    }
  }

  // Load fresh data from database
  const [persons, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { treeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        deathDate: true,
        isLiving: true,
        generation: true,
      },
    }),
    prisma.relationship.findMany({
      where: { treeId },
      select: {
        id: true,
        personFromId: true,
        personToId: true,
        relationshipType: true,
      },
    }),
  ]);

  // Convert to PersonNode format
  const personNodes: PersonNode[] = persons.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    gender: p.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN',
    birthDate: p.birthDate || undefined,
    deathDate: p.deathDate || undefined,
    isLiving: p.isLiving,
    generation: p.generation,
  }));

  // Convert to StoredRelationship format
  const storedRelationships: StoredRelationship[] = relationships.map((r) => ({
    id: r.id,
    fromPersonId: r.personFromId,
    toPersonId: r.personToId,
    type: r.relationshipType as StoredRelationship['type'],
  }));

  // Build graph
  const graph = FamilyGraph.fromData(personNodes, storedRelationships);

  // Cache the graph
  graphCache.set(treeId, {
    graph,
    timestamp: Date.now(),
    version: currentVersion,
  });

  return graph;
}

// ==========================================
// Validation Schemas
// ==========================================

const relativesQuerySchema = z.object({
  type: z.string().optional(),
  degree: z.coerce.number().int().min(1).max(10).optional(),
  removal: z.coerce.number().int().min(0).max(10).optional(),
  maxGenerations: z.coerce.number().int().min(1).max(20).optional(),
  includeInLaws: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const relationshipSearchSchema = z.object({
  fromPersonId: z.string().cuid(),
  query: z.string().min(1).max(100),
});

const howRelatedSchema = z.object({
  personIds: z.array(z.string().cuid()).min(2).max(10),
});

// ==========================================
// Helper Functions
// ==========================================

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

/**
 * Enrich computed relationship with person details
 */
async function enrichRelationship(
  rel: ComputedRelationship,
  treeId: string
): Promise<ComputedRelationship & { fromPerson: unknown; toPerson: unknown }> {
  const [fromPerson, toPerson] = await Promise.all([
    prisma.person.findUnique({
      where: { id: rel.fromPersonId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        profilePhoto: true,
      },
    }),
    prisma.person.findUnique({
      where: { id: rel.toPersonId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        profilePhoto: true,
      },
    }),
  ]);

  return {
    ...rel,
    fromPerson,
    toPerson,
  };
}

// ==========================================
// Endpoints
// ==========================================

/**
 * GET /api/family-trees/:treeId/computed/relationship/:personAId/:personBId
 *
 * Compute the relationship between two people in a tree.
 * Returns the relationship type, display name, and path information.
 */
relationshipComputeRouter.get(
  '/:treeId/computed/relationship/:personAId/:personBId',
  asyncHandler(async (req, res) => {
    const { treeId, personAId, personBId } = req.params;
    const userId = getUserId(req);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify both persons exist and belong to this tree
    const [personA, personB] = await Promise.all([
      prisma.person.findUnique({ where: { id: personAId } }),
      prisma.person.findUnique({ where: { id: personBId } }),
    ]);

    if (!personA || personA.treeId !== treeId) {
      throw new AppError(404, 'Person A not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    if (!personB || personB.treeId !== treeId) {
      throw new AppError(404, 'Person B not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    // Load graph and compute relationship
    const graph = await loadFamilyGraph(treeId);
    const relationship = computeRelationship(personAId, personBId, graph);

    if (!relationship) {
      res.json({
        success: true,
        data: {
          fromPersonId: personAId,
          toPersonId: personBId,
          isRelated: false,
          message: 'No relationship found between these people',
        },
      });
      return;
    }

    // Enrich with person details
    const enriched = await enrichRelationship(relationship, treeId);

    res.json({
      success: true,
      data: {
        ...enriched,
        isRelated: true,
      },
    });
  })
);

/**
 * GET /api/family-trees/:treeId/computed/people/:personId/relatives
 *
 * Find all relatives of a person, optionally filtered by type.
 * Supports pagination and filtering by cousin degree/removal.
 */
relationshipComputeRouter.get(
  '/:treeId/computed/people/:personId/relatives',
  asyncHandler(async (req, res) => {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);
    const query = relativesQuerySchema.parse(req.query);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify person exists
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.treeId !== treeId) {
      throw new AppError(404, 'Person not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Get all people in the tree
    const allPersonIds = graph.getAllPersonIds();

    // Compute relationships to all others
    const relatives: Array<ComputedRelationship & { person: unknown }> = [];

    for (const otherId of allPersonIds) {
      if (otherId === personId) continue;

      const relationship = computeRelationship(personId, otherId, graph);
      if (!relationship) continue;

      // Apply filters
      if (query.type && relationship.type !== query.type) continue;
      if (query.degree !== undefined && relationship.cousinDegree !== query.degree) continue;
      if (query.removal !== undefined && relationship.cousinRemoval !== query.removal) continue;
      if (query.includeInLaws === false && relationship.isInLaw) continue;

      // Apply max generations filter
      if (query.maxGenerations !== undefined) {
        const maxGen = query.maxGenerations;
        if (Math.abs(relationship.generationDifference) > maxGen) continue;
      }

      // Get person details
      const relatedPerson = await prisma.person.findUnique({
        where: { id: otherId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          profilePhoto: true,
        },
      });

      relatives.push({
        ...relationship,
        person: relatedPerson,
      });
    }

    // Sort by generational distance (closest relatives first)
    relatives.sort((a, b) => {
      // Blood relatives before in-laws
      if (a.isBloodRelation !== b.isBloodRelation) {
        return a.isBloodRelation ? -1 : 1;
      }
      // Then by generation difference
      const aDist = Math.abs(a.generationDifference);
      const bDist = Math.abs(b.generationDifference);
      return aDist - bDist;
    });

    // Apply pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const paginated = relatives.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginated,
      meta: {
        total: relatives.length,
        limit,
        offset,
        hasMore: offset + limit < relatives.length,
      },
    });
  })
);

/**
 * GET /api/family-trees/:treeId/computed/people/:personId/family
 *
 * Get immediate family members (parents, children, spouses, siblings).
 * Optimized for quick family overview.
 */
relationshipComputeRouter.get(
  '/:treeId/computed/people/:personId/family',
  asyncHandler(async (req, res) => {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify person exists
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.treeId !== treeId) {
      throw new AppError(404, 'Person not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Get immediate family from graph (using ID methods for efficiency)
    const parentIds = graph.getParentIds(personId);
    const childIds = graph.getChildIds(personId);
    const spouseIds = graph.getSpouseIds(personId);
    const siblings = graph.getSiblings(personId);

    // Fetch person details for each group
    const [parents, children, spouses, siblingPersons] = await Promise.all([
      prisma.person.findMany({
        where: { id: { in: parentIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          profilePhoto: true,
          isLiving: true,
        },
      }),
      prisma.person.findMany({
        where: { id: { in: childIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          profilePhoto: true,
          isLiving: true,
        },
        orderBy: { birthDate: 'asc' },
      }),
      prisma.person.findMany({
        where: { id: { in: spouseIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          profilePhoto: true,
          isLiving: true,
        },
      }),
      prisma.person.findMany({
        where: { id: { in: siblings.map((s) => s.person.id) } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          profilePhoto: true,
          isLiving: true,
        },
      }),
    ]);

    // Enrich siblings with half/full/step classification
    const enrichedSiblings = siblingPersons.map((sp) => {
      const siblingInfo = siblings.find((s) => s.person.id === sp.id);
      return {
        ...sp,
        siblingType: siblingInfo?.siblingType || 'full',
        sharedParentIds: siblingInfo?.sharedParentIds || [],
      };
    });

    // Add relationship labels based on gender
    const labeledParents = parents.map((p) => ({
      ...p,
      relationshipLabel: RelationshipNamer.nameAncestor(1, p.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN'),
    }));

    const labeledChildren = children.map((c) => ({
      ...c,
      relationshipLabel: RelationshipNamer.nameDescendant(1, c.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN'),
    }));

    res.json({
      success: true,
      data: {
        parents: labeledParents,
        children: labeledChildren,
        spouses,
        siblings: enrichedSiblings,
      },
      meta: {
        counts: {
          parents: parents.length,
          children: children.length,
          spouses: spouses.length,
          siblings: siblingPersons.length,
        },
      },
    });
  })
);

/**
 * GET /api/family-trees/:treeId/computed/relationship-path/:personAId/:personBId
 *
 * Get all paths connecting two people in the family tree.
 * Useful for visualization of how people are related.
 */
relationshipComputeRouter.get(
  '/:treeId/computed/relationship-path/:personAId/:personBId',
  asyncHandler(async (req, res) => {
    const { treeId, personAId, personBId } = req.params;
    const userId = getUserId(req);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify both persons exist
    const [personA, personB] = await Promise.all([
      prisma.person.findUnique({ where: { id: personAId } }),
      prisma.person.findUnique({ where: { id: personBId } }),
    ]);

    if (!personA || personA.treeId !== treeId) {
      throw new AppError(404, 'Person A not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    if (!personB || personB.treeId !== treeId) {
      throw new AppError(404, 'Person B not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Find all paths (limit to prevent explosion)
    const paths = findAllPaths(personAId, personBId, graph, 10);

    // Also get common ancestors for context
    const commonAncestors = findCommonAncestors(personAId, personBId, graph);

    // Enrich paths with person details
    const enrichedPaths = await Promise.all(
      paths.map(async (path) => {
        const personIds = path.edges.flatMap((e) => [e.from, e.to]);
        const uniqueIds = [...new Set(personIds)];

        const persons = await prisma.person.findMany({
          where: { id: { in: uniqueIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        });

        const personMap = new Map(persons.map((p) => [p.id, p]));

        return {
          edges: path.edges.map((e) => ({
            from: personMap.get(e.from),
            to: personMap.get(e.to),
            relationship: e.relationship,
          })),
          length: path.edges.length,
        };
      })
    );

    // Enrich common ancestors
    const enrichedAncestors = await Promise.all(
      commonAncestors.slice(0, 5).map(async (ca) => {
        const ancestor = await prisma.person.findUnique({
          where: { id: ca.ancestorId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        });
        return {
          ...ca,
          ancestor,
        };
      })
    );

    res.json({
      success: true,
      data: {
        paths: enrichedPaths,
        commonAncestors: enrichedAncestors,
      },
      meta: {
        pathCount: paths.length,
        commonAncestorCount: commonAncestors.length,
      },
    });
  })
);

/**
 * GET /api/family-trees/:treeId/computed/relationship-search
 *
 * Search for relatives by relationship type (e.g., "2nd cousin", "great-aunt").
 */
relationshipComputeRouter.get(
  '/:treeId/computed/relationship-search',
  asyncHandler(async (req, res) => {
    const { treeId } = req.params;
    const userId = getUserId(req);
    const { fromPersonId, query: searchQuery } = relationshipSearchSchema.parse(req.query);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify person exists
    const person = await prisma.person.findUnique({ where: { id: fromPersonId } });
    if (!person || person.treeId !== treeId) {
      throw new AppError(404, 'Person not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Parse the search query to extract relationship criteria
    const normalizedQuery = searchQuery.toLowerCase().trim();

    // Parse cousin queries (e.g., "1st cousin", "2nd cousin once removed")
    const cousinMatch = normalizedQuery.match(
      /(\d+)(?:st|nd|rd|th)?\s*cousin(?:\s+(once|twice|thrice|\d+\s*times?)\s+removed)?/i
    );

    // Parse ancestor/descendant queries (e.g., "great-grandfather", "2x great-grandmother")
    const ancestorMatch = normalizedQuery.match(
      /(?:(\d+)x?\s*)?(?:great[- ]*)*(grand)?(father|mother|parent|son|daughter|child)/i
    );

    // Parse sibling queries
    const siblingMatch = normalizedQuery.match(/(half[- ]?)?(brother|sister|sibling)/i);

    // Parse aunt/uncle/niece/nephew queries
    const auntUncleMatch = normalizedQuery.match(
      /(?:(\d+)x?\s*)?(?:great[- ]*)*(aunt|uncle|niece|nephew)/i
    );

    // Get all person IDs
    const allPersonIds = graph.getAllPersonIds();

    // Find matching relatives
    const matches: Array<{ person: unknown; relationship: ComputedRelationship }> = [];

    for (const otherId of allPersonIds) {
      if (otherId === fromPersonId) continue;

      const relationship = computeRelationship(fromPersonId, otherId, graph);
      if (!relationship) continue;

      let isMatch = false;

      // Check cousin match
      if (cousinMatch) {
        const degree = parseInt(cousinMatch[1], 10);
        let removal = 0;
        if (cousinMatch[2]) {
          if (cousinMatch[2] === 'once') removal = 1;
          else if (cousinMatch[2] === 'twice') removal = 2;
          else if (cousinMatch[2] === 'thrice') removal = 3;
          else removal = parseInt(cousinMatch[2], 10) || 0;
        }

        if (
          relationship.type === 'COUSIN' &&
          relationship.cousinDegree === degree &&
          relationship.cousinRemoval === removal
        ) {
          isMatch = true;
        }
      }

      // Check sibling match
      if (siblingMatch) {
        const isHalfSibling = !!siblingMatch[1];
        const siblingType = siblingMatch[2].toLowerCase();

        if (relationship.type === 'SIBLING') {
          if (isHalfSibling && !relationship.isHalf) continue;
          if (!isHalfSibling && relationship.isHalf) continue;

          // Check gender if specified
          if (siblingType === 'brother' || siblingType === 'sister') {
            const targetPerson = graph.getPerson(otherId);
            if (siblingType === 'brother' && targetPerson?.gender !== 'MALE') continue;
            if (siblingType === 'sister' && targetPerson?.gender !== 'FEMALE') continue;
          }
          isMatch = true;
        }
      }

      // Check if display name matches the query (fuzzy match)
      if (!isMatch && relationship.displayName.toLowerCase().includes(normalizedQuery)) {
        isMatch = true;
      }

      if (isMatch) {
        const relatedPerson = await prisma.person.findUnique({
          where: { id: otherId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true,
            profilePhoto: true,
          },
        });

        matches.push({
          person: relatedPerson,
          relationship,
        });
      }
    }

    res.json({
      success: true,
      data: matches,
      meta: {
        query: searchQuery,
        resultCount: matches.length,
      },
    });
  })
);

/**
 * POST /api/family-trees/:treeId/computed/how-related
 *
 * Compute relationships between multiple people.
 * Returns a matrix of relationships between all pairs.
 */
relationshipComputeRouter.post(
  '/:treeId/computed/how-related',
  asyncHandler(async (req, res) => {
    const { treeId } = req.params;
    const userId = getUserId(req);
    const { personIds } = howRelatedSchema.parse(req.body);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify all persons exist in this tree
    const persons = await prisma.person.findMany({
      where: {
        id: { in: personIds },
        treeId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
      },
    });

    if (persons.length !== personIds.length) {
      throw new AppError(400, 'One or more persons not found in this tree', {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Compute all pairwise relationships
    const relationships: Array<{
      personA: unknown;
      personB: unknown;
      relationship: ComputedRelationship | null;
      commonAncestors: CommonAncestor[];
    }> = [];

    for (let i = 0; i < personIds.length; i++) {
      for (let j = i + 1; j < personIds.length; j++) {
        const personAId = personIds[i];
        const personBId = personIds[j];

        const relationship = computeRelationship(personAId, personBId, graph);
        const commonAncestors = findCommonAncestors(personAId, personBId, graph).slice(0, 3);

        // Enrich common ancestors
        const enrichedAncestors = await Promise.all(
          commonAncestors.map(async (ca) => {
            const ancestor = await prisma.person.findUnique({
              where: { id: ca.ancestorId },
              select: { id: true, firstName: true, lastName: true },
            });
            return { ...ca, ancestor };
          })
        );

        relationships.push({
          personA: persons.find((p) => p.id === personAId),
          personB: persons.find((p) => p.id === personBId),
          relationship,
          commonAncestors: enrichedAncestors,
        });
      }
    }

    res.json({
      success: true,
      data: {
        persons,
        relationships,
      },
      meta: {
        personCount: personIds.length,
        pairCount: relationships.length,
      },
    });
  })
);

/**
 * GET /api/family-trees/:treeId/computed/people/:personId/relationship-stats
 *
 * Get relationship statistics for a person.
 * Returns counts of different relationship types and generational info.
 */
relationshipComputeRouter.get(
  '/:treeId/computed/people/:personId/relationship-stats',
  asyncHandler(async (req, res) => {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify person exists
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.treeId !== treeId) {
      throw new AppError(404, 'Person not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Get ancestors and descendants with distances
    const ancestors = getAllAncestorsWithDistance(personId, graph);
    const descendants = getAllDescendantsWithDistance(personId, graph);

    // Compute relationship stats
    const allPersonIds = graph.getAllPersonIds();
    let bloodRelatives = 0;
    let inLawRelatives = 0;
    let stepRelatives = 0;
    let closestCousinDegree: number | null = null;
    let furthestCousinDegree: number | null = null;

    const relationshipTypeCounts: Record<string, number> = {};

    for (const otherId of allPersonIds) {
      if (otherId === personId) continue;

      const relationship = computeRelationship(personId, otherId, graph);
      if (!relationship) continue;

      // Count relationship types
      relationshipTypeCounts[relationship.type] = (relationshipTypeCounts[relationship.type] || 0) + 1;

      // Count categories
      if (relationship.isBloodRelation) bloodRelatives++;
      if (relationship.isInLaw) inLawRelatives++;
      if (relationship.isStep) stepRelatives++;

      // Track cousin degrees
      if (relationship.type === 'COUSIN' && relationship.cousinDegree !== undefined) {
        if (closestCousinDegree === null || relationship.cousinDegree < closestCousinDegree) {
          closestCousinDegree = relationship.cousinDegree;
        }
        if (furthestCousinDegree === null || relationship.cousinDegree > furthestCousinDegree) {
          furthestCousinDegree = relationship.cousinDegree;
        }
      }
    }

    // Calculate generation span
    let maxGenerationsUp = 0;
    let maxGenerationsDown = 0;

    for (const [, result] of ancestors) {
      if (result.distance > maxGenerationsUp) {
        maxGenerationsUp = result.distance;
      }
    }

    for (const [, result] of descendants) {
      if (result.distance > maxGenerationsDown) {
        maxGenerationsDown = result.distance;
      }
    }

    res.json({
      success: true,
      data: {
        totalRelatives: bloodRelatives + inLawRelatives + stepRelatives,
        bloodRelatives,
        inLawRelatives,
        stepRelatives,
        ancestorCount: ancestors.size,
        descendantCount: descendants.size,
        maxGenerationsUp,
        maxGenerationsDown,
        closestCousinDegree,
        furthestCousinDegree,
        relationshipTypeCounts,
      },
    });
  })
);

/**
 * GET /api/family-trees/:treeId/computed/common-ancestors/:personAId/:personBId
 *
 * Find all common ancestors between two people.
 * Returns ancestors sorted by total distance (MRCA first).
 */
relationshipComputeRouter.get(
  '/:treeId/computed/common-ancestors/:personAId/:personBId',
  asyncHandler(async (req, res) => {
    const { treeId, personAId, personBId } = req.params;
    const userId = getUserId(req);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Verify both persons exist
    const [personA, personB] = await Promise.all([
      prisma.person.findUnique({ where: { id: personAId } }),
      prisma.person.findUnique({ where: { id: personBId } }),
    ]);

    if (!personA || personA.treeId !== treeId) {
      throw new AppError(404, 'Person A not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    if (!personB || personB.treeId !== treeId) {
      throw new AppError(404, 'Person B not found in this tree', { code: ErrorCodes.NOT_FOUND });
    }

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Find common ancestors
    const commonAncestors = findCommonAncestors(personAId, personBId, graph);

    // Enrich with person details
    const enriched = await Promise.all(
      commonAncestors.map(async (ca) => {
        const ancestor = await prisma.person.findUnique({
          where: { id: ca.ancestorId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true,
            deathDate: true,
            profilePhoto: true,
          },
        });
        return {
          ...ca,
          ancestor,
        };
      })
    );

    res.json({
      success: true,
      data: enriched,
      meta: {
        count: commonAncestors.length,
        mrca: enriched[0] || null,
      },
    });
  })
);

/**
 * POST /api/family-trees/:treeId/computed/batch
 *
 * Compute relationships for multiple pairs efficiently.
 * Optimized for bulk queries.
 */
const batchComputeSchema = z.object({
  pairs: z.array(z.tuple([z.string().cuid(), z.string().cuid()])).min(1).max(100),
});

relationshipComputeRouter.post(
  '/:treeId/computed/batch',
  asyncHandler(async (req, res) => {
    const { treeId } = req.params;
    const userId = getUserId(req);
    const { pairs } = batchComputeSchema.parse(req.body);

    // Check tree access
    await checkTreeAccess(treeId, userId);

    // Load graph
    const graph = await loadFamilyGraph(treeId);

    // Check cache first for each pair
    const results: Array<{
      fromPersonId: string;
      toPersonId: string;
      relationship: ComputedRelationship | null;
      cached: boolean;
    }> = [];

    const uncachedPairs: Array<[string, string]> = [];

    for (const [personAId, personBId] of pairs) {
      const cached = relationshipCache.get(treeId, personAId, personBId);
      if (cached) {
        results.push({
          fromPersonId: personAId,
          toPersonId: personBId,
          relationship: cached,
          cached: true,
        });
      } else {
        uncachedPairs.push([personAId, personBId]);
      }
    }

    // Compute uncached relationships in batch
    if (uncachedPairs.length > 0) {
      const batchResults = computeRelationshipsBatch(uncachedPairs, graph);

      for (const result of batchResults) {
        // Cache the result
        if (result.relationship) {
          relationshipCache.set(treeId, result.relationship);
        }

        results.push({
          ...result,
          cached: false,
        });
      }
    }

    res.json({
      success: true,
      data: results,
      meta: {
        total: pairs.length,
        cached: results.filter(r => r.cached).length,
        computed: results.filter(r => !r.cached).length,
      },
    });
  })
);

/**
 * GET /api/family-trees/:treeId/computed/cache-stats
 *
 * Get cache statistics for monitoring.
 * Admin only endpoint.
 */
relationshipComputeRouter.get(
  '/:treeId/computed/cache-stats',
  asyncHandler(async (req, res) => {
    const { treeId } = req.params;
    const userId = getUserId(req);

    // Check tree access - admin only
    await checkTreeAccess(treeId, userId, 'ADMIN');

    const stats = relationshipCache.getStats();
    const graphCacheSize = graphCache.size;
    const treeVersion = getTreeVersion(treeId);

    res.json({
      success: true,
      data: {
        relationshipCache: {
          ...stats,
          hitRatePercent: (stats.hitRate * 100).toFixed(2) + '%',
        },
        graphCache: {
          size: graphCacheSize,
          treeVersion,
        },
      },
    });
  })
);

/**
 * POST /api/family-trees/:treeId/computed/clear-cache
 *
 * Clear the cache for a tree.
 * Admin only endpoint.
 */
relationshipComputeRouter.post(
  '/:treeId/computed/clear-cache',
  asyncHandler(async (req, res) => {
    const { treeId } = req.params;
    const userId = getUserId(req);

    // Check tree access - admin only
    await checkTreeAccess(treeId, userId, 'ADMIN');

    // Clear caches
    invalidateTreeCache(treeId);
    relationshipCache.invalidateTree(treeId);

    res.json({
      success: true,
      message: 'Cache cleared for tree',
    });
  })
);
