import { Router, type Request } from 'express';
import { z } from 'zod';
import { Prisma, RelationshipType, PersonPrivacy } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, ErrorCodes } from '../middleware/errorHandler.js';
import {
  checkTreeAccess,
  enforceMemberEditRestrictions,
  enforceMemberRelationshipRestrictions,
  type TreeRole,
} from '../lib/permissions.js';
import {
  trackPersonChange,
  trackRelationshipChange,
} from '../middleware/historyTracking.js';

export const peopleRouter = Router();

// ==========================================
// Validation Schemas
// ==========================================

// Helper to accept both date-only (YYYY-MM-DD) and datetime strings
const dateStringSchema = z.string().refine(
  (val) => {
    if (!val) return true;
    // Accept YYYY-MM-DD or full ISO datetime
    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val);
  },
  { message: 'Invalid date format. Use YYYY-MM-DD or ISO datetime.' }
).optional();

const createPersonSchema = z.object({
  treeId: z.string().cuid(),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  maidenName: z.string().max(100).optional(),
  suffix: z.string().max(20).optional(),
  nickname: z.string().max(100).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).default('UNKNOWN'),
  birthDate: dateStringSchema,
  birthPlace: z.string().max(255).optional(),
  deathDate: dateStringSchema,
  deathPlace: z.string().max(255).optional(),
  isLiving: z.boolean().default(true),
  biography: z.string().max(10000).optional(),
  occupation: z.string().max(255).optional(),
  education: z.string().max(255).optional(),
  privacy: z.enum(['PUBLIC', 'FAMILY_ONLY', 'PRIVATE']).default('PUBLIC'),
  profilePhoto: z.string().url().optional(),
  generation: z.number().int().default(0),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

const updatePersonSchema = createPersonSchema.omit({ treeId: true }).partial();

const patchPersonPrivacySchema = z.object({
  privacy: z.enum(['PUBLIC', 'FAMILY_ONLY', 'PRIVATE']),
});

const patchPersonPositionSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
});

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

// Helper to validate dates (death must be after birth)
function validateDates(birthDate?: string | null, deathDate?: string | null, isLiving?: boolean): void {
  if (deathDate && isLiving) {
    throw new AppError(400, 'Person cannot be marked as living if death date is provided', {
      code: ErrorCodes.VALIDATION_ERROR,
      details: [{ field: 'isLiving', message: 'Must be false when deathDate is provided' }]
    });
  }

  if (birthDate && deathDate) {
    const birth = new Date(birthDate);
    const death = new Date(deathDate);

    if (death < birth) {
      throw new AppError(400, 'Death date must be after birth date', {
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'deathDate', message: 'Must be after birthDate' }]
      });
    }

    // Sanity check: person shouldn't be older than 150 years
    const maxAge = 150 * 365 * 24 * 60 * 60 * 1000; // 150 years in milliseconds
    if (death.getTime() - birth.getTime() > maxAge) {
      throw new AppError(400, 'Age at death exceeds reasonable limit (150 years)', {
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'deathDate', message: 'Age at death exceeds 150 years' }]
      });
    }
  }

  // Validate birth date is not in the future
  if (birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    if (birth > today) {
      throw new AppError(400, 'Birth date cannot be in the future', {
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'birthDate', message: 'Cannot be in the future' }]
      });
    }
  }
}

// Type for person with common fields
interface PersonData {
  id: string;
  treeId: string;
  firstName: string;
  lastName: string;
  gender: string;
  privacy: string;
  isLiving: boolean;
  generation: number;
  positionX?: number | null;
  positionY?: number | null;
  createdAt: Date;
  updatedAt: Date;
  biography?: string | null;
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
  deathPlace?: string | null;
  occupation?: string | null;
  education?: string | null;
}

// Helper to filter person data based on privacy settings and viewer role
function filterPersonByPrivacy<T extends PersonData>(
  person: T,
  viewerRole: 'ADMIN' | 'MEMBER' | 'VIEWER'
): T {
  // Admins see everything
  if (viewerRole === 'ADMIN') {
    return person;
  }

  // PRIVATE: Only admins can see full details
  if (person.privacy === 'PRIVATE') {
    return {
      ...person,
      firstName: '[Private]',
      lastName: '[Private]',
      middleName: null,
      maidenName: null,
      suffix: null,
      nickname: null,
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      biography: null,
      occupation: null,
      education: null,
      profilePhoto: null,
    } as T;
  }

  // FAMILY_ONLY: Viewers see limited info
  if (person.privacy === 'FAMILY_ONLY' && viewerRole === 'VIEWER') {
    return {
      ...person,
      biography: null,
      occupation: null,
      education: null,
    } as T;
  }

  // Living person privacy protection
  if (person.isLiving && viewerRole === 'VIEWER') {
    let modifiedBirthDate = person.birthDate;
    if (person.birthDate) {
      // Only show year for living people
      const year = new Date(person.birthDate).getFullYear();
      modifiedBirthDate = new Date(`${year}-01-01`);
    }
    return {
      ...person,
      birthDate: modifiedBirthDate,
      birthPlace: null,
    } as T;
  }

  return person;
}

// ==========================================
// CRUD Endpoints
// ==========================================

// POST /api/people - Create a new person
peopleRouter.post('/', asyncHandler(async (req, res) => {
  const data = createPersonSchema.parse(req.body);
  const userId = getUserId(req);

  // Check access to tree with MEMBER role required
  await checkTreeAccess(data.treeId, userId, 'MEMBER');

  // Validate dates
  validateDates(data.birthDate, data.deathDate, data.isLiving);

  const person = await prisma.person.create({
    data: {
      treeId: data.treeId,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      maidenName: data.maidenName || null,
      suffix: data.suffix || null,
      nickname: data.nickname || null,
      gender: data.gender,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      birthPlace: data.birthPlace || null,
      deathDate: data.deathDate ? new Date(data.deathDate) : null,
      deathPlace: data.deathPlace || null,
      isLiving: data.deathDate ? false : (data.isLiving ?? true),
      biography: data.biography || null,
      occupation: data.occupation || null,
      education: data.education || null,
      privacy: data.privacy || 'PUBLIC',
      profilePhoto: data.profilePhoto || null,
      generation: data.generation ?? 0,
      positionX: data.positionX ?? null,
      positionY: data.positionY ?? null,
    },
  });

  // Track person creation
  await trackPersonChange(req, data.treeId, person.id, 'CREATE', null, person);

  res.status(201).json({
    success: true,
    data: person,
  });
}));

// GET /api/people/:personId - Get a person by ID
peopleRouter.get('/:personId', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const userId = getUserId(req);

  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      relationshipsFrom: {
        include: {
          personTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              privacy: true,
              isLiving: true,
            },
          },
        },
      },
      relationshipsTo: {
        include: {
          personFrom: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              privacy: true,
              isLiving: true,
            },
          },
        },
      },
      marriages: true,
      photos: {
        select: {
          id: true,
          url: true,
          caption: true,
          privacy: true,
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          documentType: true,
        },
      },
      stories: {
        select: {
          id: true,
          title: true,
          excerpt: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });

  if (!person) {
    throw new AppError(404, 'Person not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access and get viewer role
  const { userRole } = await checkTreeAccess(person.treeId, userId);

  // Apply privacy filtering
  const filteredPerson = filterPersonByPrivacy(person, userRole);

  res.json({
    success: true,
    data: filteredPerson,
  });
}));

// GET /api/people - List people (requires treeId query param)
peopleRouter.get('/', asyncHandler(async (req, res) => {
  const { treeId, search, privacy, isLiving, generation } = req.query;
  const userId = getUserId(req);

  if (!treeId || typeof treeId !== 'string') {
    throw new AppError(400, 'treeId query parameter is required', { code: ErrorCodes.BAD_REQUEST });
  }

  // Check tree access and get viewer role
  const { userRole } = await checkTreeAccess(treeId, userId);

  // Build where clause for filtering
  const where: Prisma.PersonWhereInput = { treeId };
  const andConditions: Prisma.PersonWhereInput[] = [];

  // Search filter
  if (search && typeof search === 'string') {
    andConditions.push({
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { maidenName: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  // Privacy filter (only for admin/member)
  if (privacy && typeof privacy === 'string' && userRole !== 'VIEWER') {
    const validPrivacy = ['PUBLIC', 'FAMILY_ONLY', 'PRIVATE'].includes(privacy)
      ? privacy as PersonPrivacy
      : undefined;
    if (validPrivacy) {
      andConditions.push({ privacy: validPrivacy });
    }
  }

  // Living status filter
  if (isLiving !== undefined) {
    andConditions.push({ isLiving: isLiving === 'true' });
  }

  // Generation filter
  if (generation !== undefined && !isNaN(Number(generation))) {
    andConditions.push({ generation: Number(generation) });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const people = await prisma.person.findMany({
    where,
    orderBy: [{ generation: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      relationshipsFrom: true,
      relationshipsTo: true,
    },
  });

  // Apply privacy filtering to each person
  const filteredPeople = people.map(person => filterPersonByPrivacy(person, userRole));

  res.json({
    success: true,
    data: filteredPeople,
    meta: {
      total: filteredPeople.length,
      treeId,
    },
  });
}));

// PUT /api/people/:personId - Update a person
peopleRouter.put('/:personId', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const data = updatePersonSchema.parse(req.body);
  const userId = getUserId(req);

  // Find person first
  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new AppError(404, 'Person not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access with MEMBER role required
  const { userRole, linkedPersonId } = await checkTreeAccess(person.treeId, userId, 'MEMBER');

  // Enforce member edit restrictions - members can only edit self and descendants
  await enforceMemberEditRestrictions(userRole, person.treeId, linkedPersonId, personId, 'edit this person');

  // Capture previous state for history
  const previousState = { ...person };

  // Merge existing values with updates for validation
  const birthDate = data.birthDate !== undefined ? data.birthDate : (person.birthDate?.toISOString() || null);
  const deathDate = data.deathDate !== undefined ? data.deathDate : (person.deathDate?.toISOString() || null);
  const isLiving = data.isLiving !== undefined ? data.isLiving : person.isLiving;

  // Validate dates
  validateDates(birthDate, deathDate, isLiving);

  const updatedPerson = await prisma.person.update({
    where: { id: personId },
    data: {
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      maidenName: data.maidenName,
      suffix: data.suffix,
      nickname: data.nickname,
      gender: data.gender,
      birthDate: data.birthDate !== undefined ? (data.birthDate ? new Date(data.birthDate) : null) : undefined,
      birthPlace: data.birthPlace,
      deathDate: data.deathDate !== undefined ? (data.deathDate ? new Date(data.deathDate) : null) : undefined,
      deathPlace: data.deathPlace,
      isLiving: data.deathDate ? false : data.isLiving,
      biography: data.biography,
      occupation: data.occupation,
      education: data.education,
      privacy: data.privacy,
      profilePhoto: data.profilePhoto,
      generation: data.generation,
      positionX: data.positionX,
      positionY: data.positionY,
    },
    include: {
      relationshipsFrom: true,
      relationshipsTo: true,
    },
  });

  // Track person update
  await trackPersonChange(req, person.treeId, personId, 'UPDATE', previousState, updatedPerson);

  res.json({
    success: true,
    data: updatedPerson,
  });
}));

// PATCH /api/people/:personId/privacy - Update person privacy
peopleRouter.patch('/:personId/privacy', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const data = patchPersonPrivacySchema.parse(req.body);
  const userId = getUserId(req);

  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new AppError(404, 'Person not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Only admins can change privacy to PRIVATE
  const requiredRole = data.privacy === 'PRIVATE' ? 'ADMIN' : 'MEMBER';
  const { userRole, linkedPersonId } = await checkTreeAccess(person.treeId, userId, requiredRole as TreeRole);

  // Enforce member edit restrictions - members can only edit self and descendants
  await enforceMemberEditRestrictions(userRole, person.treeId, linkedPersonId, personId, 'change privacy for this person');

  // Capture previous state for history
  const previousState = { ...person };

  const updatedPerson = await prisma.person.update({
    where: { id: personId },
    data: {
      privacy: data.privacy,
    },
  });

  // Track privacy update
  await trackPersonChange(req, person.treeId, personId, 'UPDATE', previousState, updatedPerson);

  res.json({
    success: true,
    data: updatedPerson,
  });
}));

// PATCH /api/people/:personId/position - Update person position on canvas
peopleRouter.patch('/:personId/position', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const data = patchPersonPositionSchema.parse(req.body);
  const userId = getUserId(req);

  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new AppError(404, 'Person not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access with MEMBER role required (any member can rearrange cards)
  await checkTreeAccess(person.treeId, userId, 'MEMBER');

  const updatedPerson = await prisma.person.update({
    where: { id: personId },
    data: {
      positionX: data.positionX,
      positionY: data.positionY,
    },
  });

  res.json({
    success: true,
    data: {
      id: updatedPerson.id,
      positionX: updatedPerson.positionX,
      positionY: updatedPerson.positionY,
    },
  });
}));

// PATCH /api/people/positions - Batch update multiple person positions
peopleRouter.patch('/positions', asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const batchSchema = z.object({
    treeId: z.string().cuid(),
    positions: z.array(z.object({
      personId: z.string().cuid(),
      positionX: z.number(),
      positionY: z.number(),
    })).min(1).max(100),
  });

  const data = batchSchema.parse(req.body);

  // Check tree access with MEMBER role required
  await checkTreeAccess(data.treeId, userId, 'MEMBER');

  // Verify all persons belong to this tree
  const personIds = data.positions.map(p => p.personId);
  const persons = await prisma.person.findMany({
    where: {
      id: { in: personIds },
      treeId: data.treeId,
    },
    select: { id: true },
  });

  const validPersonIds = new Set(persons.map(p => p.id));
  const invalidPersonIds = personIds.filter(id => !validPersonIds.has(id));

  if (invalidPersonIds.length > 0) {
    throw new AppError(400, `Some persons not found in tree: ${invalidPersonIds.join(', ')}`, {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Update all positions in a transaction
  await prisma.$transaction(
    data.positions.map(pos =>
      prisma.person.update({
        where: { id: pos.personId },
        data: {
          positionX: pos.positionX,
          positionY: pos.positionY,
        },
      })
    )
  );

  res.json({
    success: true,
    message: `Updated positions for ${data.positions.length} persons`,
    data: {
      updatedCount: data.positions.length,
    },
  });
}));

// DELETE /api/people/:personId - Delete a person
// Only ADMINs can delete people from the tree
peopleRouter.delete('/:personId', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const userId = getUserId(req);

  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new AppError(404, 'Person not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access with ADMIN role required - only admins can delete people
  await checkTreeAccess(person.treeId, userId, 'ADMIN');

  // Capture previous state for history
  const previousState = { ...person };

  await prisma.person.delete({
    where: { id: personId },
  });

  // Track person deletion
  await trackPersonChange(req, person.treeId, personId, 'DELETE', previousState, null);

  res.json({
    success: true,
    message: 'Person deleted successfully',
  });
}));

// DELETE /api/people/:personId/gdpr - GDPR compliant delete (anonymize)
peopleRouter.delete('/:personId/gdpr', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const userId = getUserId(req);

  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new AppError(404, 'Person not found', { code: ErrorCodes.NOT_FOUND });
  }

  // GDPR delete requires ADMIN role
  await checkTreeAccess(person.treeId, userId, 'ADMIN');

  // Anonymize person data while preserving relationships
  const anonymizedPerson = await prisma.person.update({
    where: { id: personId },
    data: {
      firstName: 'Removed',
      middleName: null,
      lastName: 'Member',
      maidenName: null,
      suffix: null,
      nickname: null,
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      biography: null,
      occupation: null,
      education: null,
      privacy: 'PRIVATE',
      profilePhoto: null,
      dnaTestProvider: null,
      dnaTestDate: null,
      yDnaHaplogroup: null,
      mtDnaHaplogroup: null,
      dnaKitNumber: null,
      dnaEthnicityNotes: null,
      dnaMatchNotes: null,
    },
  });

  // Delete associated personal data
  await Promise.all([
    prisma.treePhoto.deleteMany({ where: { personId } }),
    prisma.sourceDocument.deleteMany({ where: { personId } }),
    prisma.familyStory.deleteMany({ where: { personId } }),
  ]);

  res.json({
    success: true,
    message: 'Person data removed and anonymized (GDPR compliant)',
    data: anonymizedPerson,
  });
}));

// ==========================================
// Relationship Endpoints
// ==========================================

// POST /api/people/:personId/relationships - Create a relationship
peopleRouter.post('/:personId/relationships', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const data = createRelationshipSchema.parse(req.body);
  const userId = getUserId(req);

  // Validate that personId matches one of the relationship persons
  if (personId !== data.personFromId && personId !== data.personToId) {
    throw new AppError(400, 'personId in URL must match either personFromId or personToId', {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

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

  // Create the relationship
  const relationship = await prisma.relationship.create({
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

  // Track relationship creation
  await trackRelationshipChange(req, personFrom.treeId, relationship.id, 'CREATE', relationship);

  // Create reciprocal relationship for bidirectional types
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
  };

  if (reciprocalTypes[data.relationshipType]) {
    // Check if reciprocal already exists
    const existingReciprocal = await prisma.relationship.findFirst({
      where: {
        personFromId: data.personToId,
        personToId: data.personFromId,
        relationshipType: reciprocalTypes[data.relationshipType],
      },
    });

    if (!existingReciprocal) {
      await prisma.relationship.create({
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

  res.status(201).json({
    success: true,
    data: relationship,
  });
}));

// GET /api/people/:personId/relationships - List relationships for a person
peopleRouter.get('/:personId/relationships', asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const userId = getUserId(req);

  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new AppError(404, 'Person not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Check tree access
  const { userRole } = await checkTreeAccess(person.treeId, userId);

  const relationships = await prisma.relationship.findMany({
    where: {
      OR: [
        { personFromId: personId },
        { personToId: personId },
      ],
    },
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
          privacy: true,
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
          privacy: true,
        },
      },
    },
  });

  // Apply privacy filtering to related persons
  const filteredRelationships = relationships.map(rel => ({
    ...rel,
    personFrom: filterPersonByPrivacy(rel.personFrom as Parameters<typeof filterPersonByPrivacy>[0], userRole),
    personTo: filterPersonByPrivacy(rel.personTo as Parameters<typeof filterPersonByPrivacy>[0], userRole),
  }));

  res.json({
    success: true,
    data: filteredRelationships,
  });
}));

// DELETE /api/people/:personId/relationships/:relationshipId - Delete a relationship
// Only ADMINs can delete relationships
peopleRouter.delete('/:personId/relationships/:relationshipId', asyncHandler(async (req, res) => {
  const { personId, relationshipId } = req.params;
  const userId = getUserId(req);

  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
  });

  if (!relationship) {
    throw new AppError(404, 'Relationship not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Verify relationship involves the specified person
  if (relationship.personFromId !== personId && relationship.personToId !== personId) {
    throw new AppError(400, 'Relationship does not involve the specified person', {
      code: ErrorCodes.BAD_REQUEST,
    });
  }

  // Check tree access - only admins can delete relationships
  await checkTreeAccess(relationship.treeId, userId, 'ADMIN');

  // Delete the relationship and its reciprocal
  const reciprocalTypesForDelete: Record<string, RelationshipType> = {
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

  const reciprocalType = reciprocalTypesForDelete[relationship.relationshipType] || relationship.relationshipType;

  // Capture relationship state for history
  const relationshipState = { ...relationship };

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

  // Track relationship deletion
  await trackRelationshipChange(req, relationship.treeId, relationshipId, 'DELETE', relationshipState);

  res.json({
    success: true,
    message: 'Relationship deleted successfully',
  });
}));

// ==========================================
// Validation Helpers for Relationships
// ==========================================

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
