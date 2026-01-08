import { Router, type Request } from 'express';
import { z } from 'zod';
import { RelationshipType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, ErrorCodes } from '../middleware/errorHandler.js';
import {
  checkTreeAccess,
  enforceMemberRelationshipRestrictions,
} from '../lib/permissions.js';

export const relationshipsRouter = Router();

// ==========================================
// Validation Schemas
// ==========================================

const createRelationshipSchema = z.object({
  personFromId: z.string().cuid(),
  personToId: z.string().cuid(),
  relationshipType: z.enum([
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
  ]),
  notes: z.string().max(1000).optional(),
  birthOrder: z.number().int().positive().optional(),
});

const updateRelationshipSchema = z.object({
  notes: z.string().max(1000).optional(),
  birthOrder: z.number().int().positive().optional(),
  relationshipType: z.enum([
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
  ]).optional(),
});

const bulkCreateRelationshipsSchema = z.object({
  relationships: z.array(createRelationshipSchema).min(1).max(50),
});

// ==========================================
// Helper Functions
// ==========================================

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Reciprocal relationship types mapping
const reciprocalTypes: Record<string, RelationshipType> = {
  PARENT: 'CHILD',
  CHILD: 'PARENT',
  ADOPTIVE_PARENT: 'ADOPTIVE_CHILD',
  ADOPTIVE_CHILD: 'ADOPTIVE_PARENT',
  STEP_PARENT: 'STEP_CHILD',
  STEP_CHILD: 'STEP_PARENT',
  FOSTER_PARENT: 'FOSTER_CHILD',
  FOSTER_CHILD: 'FOSTER_PARENT',
  GUARDIAN: 'WARD',
  WARD: 'GUARDIAN',
  SPOUSE: 'SPOUSE',
  SIBLING: 'SIBLING',
};

// Relationship types that define parent-child hierarchy
const parentTypes = ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT', 'GUARDIAN'];
const childTypes = ['CHILD', 'ADOPTIVE_CHILD', 'STEP_CHILD', 'FOSTER_CHILD', 'WARD'];

/**
 * Check for circular references in parent-child relationships
 * A circular reference would create a situation where a person is their own ancestor
 */
async function checkCircularReference(
  treeId: string,
  personFromId: string,
  personToId: string,
  relationshipType: string
): Promise<{ isCircular: boolean; path?: string[] }> {
  // Only check for parent-child type relationships
  if (!parentTypes.includes(relationshipType) && !childTypes.includes(relationshipType)) {
    return { isCircular: false };
  }

  // Determine the direction of the relationship
  // If creating a PARENT relationship from A to B, A is the parent of B
  // This means B should not be an ancestor of A
  let potentialChild: string;
  let potentialParent: string;

  if (parentTypes.includes(relationshipType)) {
    potentialParent = personFromId;
    potentialChild = personToId;
  } else {
    potentialParent = personToId;
    potentialChild = personFromId;
  }

  // Get all ancestors of the potential parent
  const ancestors = await getAncestors(treeId, potentialParent);

  // If the potential child is already an ancestor of the potential parent,
  // creating this relationship would create a circular reference
  if (ancestors.has(potentialChild)) {
    const path = await getPathToAncestor(treeId, potentialParent, potentialChild);
    return { isCircular: true, path };
  }

  return { isCircular: false };
}

/**
 * Get all ancestors of a person using BFS
 */
async function getAncestors(treeId: string, personId: string): Promise<Set<string>> {
  const ancestors = new Set<string>();
  const queue: string[] = [personId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Get all parent-type relationships where current person is the child
    const parentRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        personFromId: currentId,
        relationshipType: { in: childTypes as RelationshipType[] },
      },
      select: { personToId: true },
    });

    // Also check reverse: where current person is personTo and type is PARENT
    const directParentRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        personToId: currentId,
        relationshipType: { in: parentTypes as RelationshipType[] },
      },
      select: { personFromId: true },
    });

    for (const rel of parentRelationships) {
      if (!ancestors.has(rel.personToId)) {
        ancestors.add(rel.personToId);
        queue.push(rel.personToId);
      }
    }

    for (const rel of directParentRelationships) {
      if (!ancestors.has(rel.personFromId)) {
        ancestors.add(rel.personFromId);
        queue.push(rel.personFromId);
      }
    }
  }

  return ancestors;
}

/**
 * Get the path from a person to an ancestor
 */
async function getPathToAncestor(
  treeId: string,
  personId: string,
  ancestorId: string
): Promise<string[]> {
  const path: string[] = [];
  const queue: { id: string; path: string[] }[] = [{ id: personId, path: [personId] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id: currentId, path: currentPath } = queue.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === ancestorId) {
      return currentPath;
    }

    // Get all parent relationships
    const parentRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        personFromId: currentId,
        relationshipType: { in: childTypes as RelationshipType[] },
      },
      select: { personToId: true },
    });

    const directParentRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        personToId: currentId,
        relationshipType: { in: parentTypes as RelationshipType[] },
      },
      select: { personFromId: true },
    });

    for (const rel of parentRelationships) {
      if (!visited.has(rel.personToId)) {
        queue.push({ id: rel.personToId, path: [...currentPath, rel.personToId] });
      }
    }

    for (const rel of directParentRelationships) {
      if (!visited.has(rel.personFromId)) {
        queue.push({ id: rel.personFromId, path: [...currentPath, rel.personFromId] });
      }
    }
  }

  return path;
}

/**
 * Validate relationship dates based on birth dates
 */
function validateRelationshipDates(
  personFrom: { birthDate: Date | null; firstName: string; lastName: string },
  personTo: { birthDate: Date | null; firstName: string; lastName: string },
  relationshipType: string
): void {
  // Skip validation if birth dates are not available
  if (!personFrom.birthDate || !personTo.birthDate) {
    return;
  }

  const fromBirth = personFrom.birthDate.getTime();
  const toBirth = personTo.birthDate.getTime();
  const yearInMs = 365.25 * 24 * 60 * 60 * 1000;
  const minParentAge = 12 * yearInMs; // Minimum age to be a parent
  const maxParentAge = 80 * yearInMs; // Maximum reasonable age difference

  switch (relationshipType) {
    case 'PARENT':
    case 'ADOPTIVE_PARENT':
    case 'STEP_PARENT':
    case 'FOSTER_PARENT':
    case 'GUARDIAN':
      // Parent should be older than child by at least 12 years
      if (fromBirth > toBirth - minParentAge) {
        throw new AppError(400, `${personFrom.firstName} ${personFrom.lastName} is not old enough to be a parent of ${personTo.firstName} ${personTo.lastName}`, {
          code: ErrorCodes.VALIDATION_ERROR,
          details: [{ field: 'relationshipType', message: 'Parent must be at least 12 years older than child' }],
        });
      }
      // Parent shouldn't be more than 80 years older
      if (fromBirth < toBirth - maxParentAge) {
        throw new AppError(400, `Age difference between ${personFrom.firstName} and ${personTo.firstName} exceeds reasonable limit for a parent-child relationship`, {
          code: ErrorCodes.VALIDATION_ERROR,
          details: [{ field: 'relationshipType', message: 'Age difference exceeds 80 years' }],
        });
      }
      break;

    case 'CHILD':
    case 'ADOPTIVE_CHILD':
    case 'STEP_CHILD':
    case 'FOSTER_CHILD':
    case 'WARD':
      // Child should be younger than parent by at least 12 years
      if (toBirth > fromBirth - minParentAge) {
        throw new AppError(400, `${personTo.firstName} ${personTo.lastName} is not old enough to be a parent of ${personFrom.firstName} ${personFrom.lastName}`, {
          code: ErrorCodes.VALIDATION_ERROR,
          details: [{ field: 'relationshipType', message: 'Parent must be at least 12 years older than child' }],
        });
      }
      break;

    case 'SPOUSE':
      // Spouses should have reasonable age difference (max 50 years)
      const ageDiff = Math.abs(fromBirth - toBirth);
      if (ageDiff > 50 * yearInMs) {
        // Just a warning, not an error - unusual but possible
        console.warn(`Unusual age difference (${Math.round(ageDiff / yearInMs)} years) for spouse relationship`);
      }
      break;

    case 'SIBLING':
      // Siblings can have various age differences, but more than 30 years is unusual
      const siblingAgeDiff = Math.abs(fromBirth - toBirth);
      if (siblingAgeDiff > 30 * yearInMs) {
        console.warn(`Unusual age difference (${Math.round(siblingAgeDiff / yearInMs)} years) for sibling relationship`);
      }
      break;
  }
}

/**
 * Find relationship path between two persons using BFS
 */
async function findRelationshipPath(
  treeId: string,
  personAId: string,
  personBId: string,
  maxDepth: number = 10
): Promise<{
  path: Array<{
    personId: string;
    firstName: string;
    lastName: string;
    relationshipType?: string;
  }>;
  found: boolean;
}> {
  if (personAId === personBId) {
    const person = await prisma.person.findUnique({
      where: { id: personAId },
      select: { id: true, firstName: true, lastName: true },
    });
    return {
      path: person ? [{ personId: person.id, firstName: person.firstName, lastName: person.lastName }] : [],
      found: true,
    };
  }

  interface PathNode {
    personId: string;
    firstName: string;
    lastName: string;
    relationshipType?: string;
  }

  const queue: { personId: string; path: PathNode[]; depth: number }[] = [];
  const visited = new Set<string>();

  // Get starting person info
  const startPerson = await prisma.person.findUnique({
    where: { id: personAId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!startPerson) {
    return { path: [], found: false };
  }

  queue.push({
    personId: personAId,
    path: [{ personId: startPerson.id, firstName: startPerson.firstName, lastName: startPerson.lastName }],
    depth: 0,
  });

  while (queue.length > 0) {
    const { personId, path, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;
    if (visited.has(personId)) continue;
    visited.add(personId);

    // Get all relationships for this person
    const relationships = await prisma.relationship.findMany({
      where: {
        treeId,
        OR: [
          { personFromId: personId },
          { personToId: personId },
        ],
      },
      include: {
        personFrom: { select: { id: true, firstName: true, lastName: true } },
        personTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const rel of relationships) {
      const nextPersonId = rel.personFromId === personId ? rel.personToId : rel.personFromId;
      const nextPerson = rel.personFromId === personId ? rel.personTo : rel.personFrom;

      if (visited.has(nextPersonId)) continue;

      const newPath: PathNode[] = [
        ...path,
        {
          personId: nextPerson.id,
          firstName: nextPerson.firstName,
          lastName: nextPerson.lastName,
          relationshipType: rel.relationshipType,
        },
      ];

      if (nextPersonId === personBId) {
        return { path: newPath, found: true };
      }

      queue.push({ personId: nextPersonId, path: newPath, depth: depth + 1 });
    }
  }

  return { path: [], found: false };
}

// ==========================================
// Relationship Endpoints
// ==========================================

// GET /api/relationships?treeId=xxx - List all relationships in a tree
relationshipsRouter.get('/', asyncHandler(async (req, res) => {
  const { treeId, type, personId } = req.query;
  const userId = getUserId(req);

  if (!treeId || typeof treeId !== 'string') {
    throw new AppError(400, 'treeId query parameter is required', { code: ErrorCodes.BAD_REQUEST });
  }

  // Check tree access
  await checkTreeAccess(treeId, userId);

  // Build where clause
  const where: {
    treeId: string;
    relationshipType?: RelationshipType;
    OR?: Array<{ personFromId: string } | { personToId: string }>;
  } = { treeId };

  // Filter by relationship type
  if (type && typeof type === 'string') {
    const validTypes = Object.values(RelationshipType);
    if (validTypes.includes(type as RelationshipType)) {
      where.relationshipType = type as RelationshipType;
    }
  }

  // Filter by person (either as from or to)
  if (personId && typeof personId === 'string') {
    where.OR = [
      { personFromId: personId },
      { personToId: personId },
    ];
  }

  const relationships = await prisma.relationship.findMany({
    where,
    include: {
      personFrom: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          isLiving: true,
          generation: true,
        },
      },
      personTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          isLiving: true,
          generation: true,
        },
      },
    },
    orderBy: [
      { personFromId: 'asc' },
      { relationshipType: 'asc' },
    ],
  });

  res.json({
    success: true,
    data: relationships,
    meta: {
      total: relationships.length,
      treeId,
    },
  });
}));

// GET /api/relationships/:relationshipId - Get a single relationship
relationshipsRouter.get('/:relationshipId', asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const userId = getUserId(req);

  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    include: {
      personFrom: {
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
      },
      personTo: {
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
      },
    },
  });

  if (!relationship) {
    throw new AppError(404, 'Relationship not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access
  await checkTreeAccess(relationship.treeId, userId);

  res.json({
    success: true,
    data: relationship,
  });
}));

// POST /api/relationships - Create a new relationship
relationshipsRouter.post('/', asyncHandler(async (req, res) => {
  const data = createRelationshipSchema.parse(req.body);
  const userId = getUserId(req);

  // Cannot create relationship with self
  if (data.personFromId === data.personToId) {
    throw new AppError(400, 'Cannot create a relationship between a person and themselves', {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Get both persons and verify they exist in the same tree
  const [personFrom, personTo] = await Promise.all([
    prisma.person.findUnique({ where: { id: data.personFromId } }),
    prisma.person.findUnique({ where: { id: data.personToId } }),
  ]);

  if (!personFrom) {
    throw new AppError(404, 'Person (from) not found', { code: ErrorCodes.NOT_FOUND });
  }

  if (!personTo) {
    throw new AppError(404, 'Person (to) not found', { code: ErrorCodes.NOT_FOUND });
  }

  if (personFrom.treeId !== personTo.treeId) {
    throw new AppError(400, 'Both persons must be in the same family tree', {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Check tree access
  const { userRole, linkedPersonId } = await checkTreeAccess(personFrom.treeId, userId, 'MEMBER');

  // Enforce member edit restrictions - members can only create relationships for self and descendants
  await enforceMemberRelationshipRestrictions(
    userRole,
    personFrom.treeId,
    linkedPersonId,
    data.personFromId,
    data.personToId,
    'create relationships'
  );

  // Check for circular reference
  const circularCheck = await checkCircularReference(
    personFrom.treeId,
    data.personFromId,
    data.personToId,
    data.relationshipType
  );

  if (circularCheck.isCircular) {
    throw new AppError(400, 'Creating this relationship would create a circular reference in the family tree', {
      code: ErrorCodes.VALIDATION_ERROR,
      details: {
        message: 'A person cannot be their own ancestor',
        path: circularCheck.path,
      },
    });
  }

  // Validate relationship based on birth dates
  validateRelationshipDates(personFrom, personTo, data.relationshipType);

  // Check for duplicate relationship
  const existingRelationship = await prisma.relationship.findFirst({
    where: {
      personFromId: data.personFromId,
      personToId: data.personToId,
      relationshipType: data.relationshipType,
    },
  });

  if (existingRelationship) {
    throw new AppError(409, 'This relationship already exists', {
      code: ErrorCodes.CONFLICT,
    });
  }

  // Create the relationship and reciprocal in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create main relationship
    const relationship = await tx.relationship.create({
      data: {
        treeId: personFrom.treeId,
        personFromId: data.personFromId,
        personToId: data.personToId,
        relationshipType: data.relationshipType,
        notes: data.notes || null,
        birthOrder: data.birthOrder || null,
      },
      include: {
        personFrom: {
          select: { id: true, firstName: true, lastName: true },
        },
        personTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create reciprocal relationship if applicable
    if (reciprocalTypes[data.relationshipType]) {
      // Check if reciprocal already exists
      const existingReciprocal = await tx.relationship.findFirst({
        where: {
          personFromId: data.personToId,
          personToId: data.personFromId,
          relationshipType: reciprocalTypes[data.relationshipType],
        },
      });

      if (!existingReciprocal) {
        await tx.relationship.create({
          data: {
            treeId: personFrom.treeId,
            personFromId: data.personToId,
            personToId: data.personFromId,
            relationshipType: reciprocalTypes[data.relationshipType],
            notes: data.notes || null,
          },
        });
      }
    }

    return relationship;
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}));

// PUT /api/relationships/:relationshipId - Update a relationship
relationshipsRouter.put('/:relationshipId', asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const data = updateRelationshipSchema.parse(req.body);
  const userId = getUserId(req);

  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    include: {
      personFrom: true,
      personTo: true,
    },
  });

  if (!relationship) {
    throw new AppError(404, 'Relationship not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access
  const { userRole, linkedPersonId } = await checkTreeAccess(relationship.treeId, userId, 'MEMBER');

  // Enforce member edit restrictions - members can only update relationships for self and descendants
  await enforceMemberRelationshipRestrictions(
    userRole,
    relationship.treeId,
    linkedPersonId,
    relationship.personFromId,
    relationship.personToId,
    'update relationships'
  );

  // If changing relationship type, validate dates and check for circular references
  if (data.relationshipType && data.relationshipType !== relationship.relationshipType) {
    // Check for circular reference with new type
    const circularCheck = await checkCircularReference(
      relationship.treeId,
      relationship.personFromId,
      relationship.personToId,
      data.relationshipType
    );

    if (circularCheck.isCircular) {
      throw new AppError(400, 'Changing to this relationship type would create a circular reference', {
        code: ErrorCodes.VALIDATION_ERROR,
        details: {
          message: 'A person cannot be their own ancestor',
          path: circularCheck.path,
        },
      });
    }

    // Validate dates for new type
    validateRelationshipDates(relationship.personFrom, relationship.personTo, data.relationshipType);

    // Check if relationship with new type already exists
    const existingWithNewType = await prisma.relationship.findFirst({
      where: {
        personFromId: relationship.personFromId,
        personToId: relationship.personToId,
        relationshipType: data.relationshipType,
        NOT: { id: relationshipId },
      },
    });

    if (existingWithNewType) {
      throw new AppError(409, 'A relationship with this type already exists between these persons', {
        code: ErrorCodes.CONFLICT,
      });
    }
  }

  // Update the relationship
  const updatedRelationship = await prisma.$transaction(async (tx) => {
    const updated = await tx.relationship.update({
      where: { id: relationshipId },
      data: {
        notes: data.notes !== undefined ? data.notes : undefined,
        birthOrder: data.birthOrder !== undefined ? data.birthOrder : undefined,
        relationshipType: data.relationshipType,
      },
      include: {
        personFrom: {
          select: { id: true, firstName: true, lastName: true },
        },
        personTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // If relationship type changed, update the reciprocal too
    if (data.relationshipType && data.relationshipType !== relationship.relationshipType) {
      const oldReciprocalType = reciprocalTypes[relationship.relationshipType];
      const newReciprocalType = reciprocalTypes[data.relationshipType];

      if (oldReciprocalType && newReciprocalType) {
        await tx.relationship.updateMany({
          where: {
            personFromId: relationship.personToId,
            personToId: relationship.personFromId,
            relationshipType: oldReciprocalType,
          },
          data: {
            relationshipType: newReciprocalType,
          },
        });
      }
    }

    // Update notes on reciprocal if notes changed
    if (data.notes !== undefined) {
      const currentReciprocalType = data.relationshipType
        ? reciprocalTypes[data.relationshipType]
        : reciprocalTypes[relationship.relationshipType];

      if (currentReciprocalType) {
        await tx.relationship.updateMany({
          where: {
            personFromId: relationship.personToId,
            personToId: relationship.personFromId,
            relationshipType: currentReciprocalType,
          },
          data: {
            notes: data.notes,
          },
        });
      }
    }

    return updated;
  });

  res.json({
    success: true,
    data: updatedRelationship,
  });
}));

// DELETE /api/relationships/:relationshipId - Delete a relationship
// Only ADMINs can delete relationships
relationshipsRouter.delete('/:relationshipId', asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const userId = getUserId(req);

  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
  });

  if (!relationship) {
    throw new AppError(404, 'Relationship not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access - only admins can delete relationships
  await checkTreeAccess(relationship.treeId, userId, 'ADMIN');

  // Delete the relationship and its reciprocal
  const reciprocalType = reciprocalTypes[relationship.relationshipType] || relationship.relationshipType;

  await prisma.$transaction([
    prisma.relationship.delete({ where: { id: relationshipId } }),
    // Delete reciprocal if exists
    prisma.relationship.deleteMany({
      where: {
        personFromId: relationship.personToId,
        personToId: relationship.personFromId,
        relationshipType: reciprocalType,
      },
    }),
  ]);

  res.json({
    success: true,
    message: 'Relationship deleted successfully',
  });
}));

// POST /api/relationships/bulk - Create multiple relationships at once
relationshipsRouter.post('/bulk', asyncHandler(async (req, res) => {
  const data = bulkCreateRelationshipsSchema.parse(req.body);
  const userId = getUserId(req);

  // Collect all unique person IDs
  const personIds = new Set<string>();
  for (const rel of data.relationships) {
    personIds.add(rel.personFromId);
    personIds.add(rel.personToId);
  }

  // Fetch all persons at once
  const persons = await prisma.person.findMany({
    where: { id: { in: Array.from(personIds) } },
  });

  const personMap = new Map(persons.map(p => [p.id, p]));

  // Validate all relationships
  const treeIds = new Set<string>();
  for (const rel of data.relationships) {
    const personFrom = personMap.get(rel.personFromId);
    const personTo = personMap.get(rel.personToId);

    if (!personFrom) {
      throw new AppError(404, `Person (from) not found: ${rel.personFromId}`, { code: ErrorCodes.NOT_FOUND });
    }

    if (!personTo) {
      throw new AppError(404, `Person (to) not found: ${rel.personToId}`, { code: ErrorCodes.NOT_FOUND });
    }

    if (personFrom.treeId !== personTo.treeId) {
      throw new AppError(400, 'All persons must be in the same family tree', {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (rel.personFromId === rel.personToId) {
      throw new AppError(400, 'Cannot create a relationship between a person and themselves', {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    treeIds.add(personFrom.treeId);

    // Check for circular references
    const circularCheck = await checkCircularReference(
      personFrom.treeId,
      rel.personFromId,
      rel.personToId,
      rel.relationshipType
    );

    if (circularCheck.isCircular) {
      throw new AppError(400, `Creating relationship between ${personFrom.firstName} and ${personTo.firstName} would create a circular reference`, {
        code: ErrorCodes.VALIDATION_ERROR,
        details: { path: circularCheck.path },
      });
    }

    validateRelationshipDates(personFrom, personTo, rel.relationshipType);
  }

  // All persons should be in the same tree
  if (treeIds.size > 1) {
    throw new AppError(400, 'All relationships must be within the same family tree', {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  const treeId = Array.from(treeIds)[0];

  // Check tree access
  const { userRole, linkedPersonId } = await checkTreeAccess(treeId, userId, 'MEMBER');

  // Enforce member edit restrictions for bulk create
  // Members can only create relationships for self and descendants
  for (const rel of data.relationships) {
    await enforceMemberRelationshipRestrictions(
      userRole,
      treeId,
      linkedPersonId,
      rel.personFromId,
      rel.personToId,
      'create relationships'
    );
  }

  // Create all relationships in a transaction
  const createdRelationships = await prisma.$transaction(async (tx) => {
    const results: Array<{
      id: string;
      treeId: string;
      personFromId: string;
      personToId: string;
      relationshipType: string;
      notes: string | null;
      birthOrder: number | null;
      createdAt: Date;
      updatedAt: Date;
      personFrom: { id: string; firstName: string; lastName: string };
      personTo: { id: string; firstName: string; lastName: string };
    }> = [];

    for (const rel of data.relationships) {
      // Check for duplicate
      const existing = await tx.relationship.findFirst({
        where: {
          personFromId: rel.personFromId,
          personToId: rel.personToId,
          relationshipType: rel.relationshipType,
        },
      });

      if (existing) {
        // Skip duplicates in bulk operation
        continue;
      }

      // Create main relationship
      const relationship = await tx.relationship.create({
        data: {
          treeId,
          personFromId: rel.personFromId,
          personToId: rel.personToId,
          relationshipType: rel.relationshipType,
          notes: rel.notes || null,
          birthOrder: rel.birthOrder || null,
        },
        include: {
          personFrom: {
            select: { id: true, firstName: true, lastName: true },
          },
          personTo: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      results.push(relationship);

      // Create reciprocal
      if (reciprocalTypes[rel.relationshipType]) {
        const existingReciprocal = await tx.relationship.findFirst({
          where: {
            personFromId: rel.personToId,
            personToId: rel.personFromId,
            relationshipType: reciprocalTypes[rel.relationshipType],
          },
        });

        if (!existingReciprocal) {
          await tx.relationship.create({
            data: {
              treeId,
              personFromId: rel.personToId,
              personToId: rel.personFromId,
              relationshipType: reciprocalTypes[rel.relationshipType],
              notes: rel.notes || null,
            },
          });
        }
      }
    }

    return results;
  });

  res.status(201).json({
    success: true,
    data: createdRelationships,
    meta: {
      created: createdRelationships.length,
      requested: data.relationships.length,
    },
  });
}));

// GET /api/relationships/path - Find relationship path between two persons
relationshipsRouter.get('/path/:personAId/:personBId', asyncHandler(async (req, res) => {
  const { personAId, personBId } = req.params;
  const { maxDepth } = req.query;
  const userId = getUserId(req);

  // Validate persons exist
  const [personA, personB] = await Promise.all([
    prisma.person.findUnique({ where: { id: personAId } }),
    prisma.person.findUnique({ where: { id: personBId } }),
  ]);

  if (!personA) {
    throw new AppError(404, 'Person A not found', { code: ErrorCodes.NOT_FOUND });
  }

  if (!personB) {
    throw new AppError(404, 'Person B not found', { code: ErrorCodes.NOT_FOUND });
  }

  if (personA.treeId !== personB.treeId) {
    throw new AppError(400, 'Both persons must be in the same family tree', {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Check tree access
  await checkTreeAccess(personA.treeId, userId);

  const depth = maxDepth && typeof maxDepth === 'string' ? parseInt(maxDepth, 10) : 10;
  const result = await findRelationshipPath(personA.treeId, personAId, personBId, depth);

  res.json({
    success: true,
    data: result,
    meta: {
      personA: { id: personA.id, firstName: personA.firstName, lastName: personA.lastName },
      personB: { id: personB.id, firstName: personB.firstName, lastName: personB.lastName },
      pathLength: result.path.length,
    },
  });
}));

// GET /api/relationships/validate-circular - Check if adding a relationship would create a circular reference
relationshipsRouter.get('/validate-circular', asyncHandler(async (req, res) => {
  const { personFromId, personToId, relationshipType } = req.query;
  const userId = getUserId(req);

  if (!personFromId || typeof personFromId !== 'string') {
    throw new AppError(400, 'personFromId query parameter is required', { code: ErrorCodes.BAD_REQUEST });
  }

  if (!personToId || typeof personToId !== 'string') {
    throw new AppError(400, 'personToId query parameter is required', { code: ErrorCodes.BAD_REQUEST });
  }

  if (!relationshipType || typeof relationshipType !== 'string') {
    throw new AppError(400, 'relationshipType query parameter is required', { code: ErrorCodes.BAD_REQUEST });
  }

  // Validate relationship type
  const validTypes = Object.values(RelationshipType);
  if (!validTypes.includes(relationshipType as RelationshipType)) {
    throw new AppError(400, 'Invalid relationship type', {
      code: ErrorCodes.VALIDATION_ERROR,
      details: { validTypes },
    });
  }

  // Get persons
  const [personFrom, personTo] = await Promise.all([
    prisma.person.findUnique({ where: { id: personFromId } }),
    prisma.person.findUnique({ where: { id: personToId } }),
  ]);

  if (!personFrom) {
    throw new AppError(404, 'Person (from) not found', { code: ErrorCodes.NOT_FOUND });
  }

  if (!personTo) {
    throw new AppError(404, 'Person (to) not found', { code: ErrorCodes.NOT_FOUND });
  }

  if (personFrom.treeId !== personTo.treeId) {
    throw new AppError(400, 'Both persons must be in the same family tree', {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Check tree access
  await checkTreeAccess(personFrom.treeId, userId);

  const circularCheck = await checkCircularReference(
    personFrom.treeId,
    personFromId,
    personToId,
    relationshipType
  );

  res.json({
    success: true,
    data: {
      isValid: !circularCheck.isCircular,
      isCircular: circularCheck.isCircular,
      path: circularCheck.path || null,
    },
  });
}));

// GET /api/relationships/types - Get available relationship types
relationshipsRouter.get('/types/list', asyncHandler(async (_req, res) => {
  const types = Object.values(RelationshipType).map(type => ({
    type,
    reciprocal: reciprocalTypes[type] || null,
    isParentType: parentTypes.includes(type),
    isChildType: childTypes.includes(type),
  }));

  res.json({
    success: true,
    data: types,
  });
}));
