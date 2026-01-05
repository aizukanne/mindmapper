import { Router, type Request } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuggestionNotification, sendSuggestionReviewedNotification } from '../lib/email.js';
import {
  uploadPhoto as uploadPhotoToS3,
  getDownloadUrl,
  deletePhoto as deletePhotoFromS3,
  checkPhotoLimits,
  getUploadQuota,
  validatePhotoFile,
  getMulterLimits,
  isS3Configured,
  getStorageConfig,
} from '../lib/storage.js';
import {
  parseGedcom,
  validateGedcomData,
  generateImportPreview,
  convertGender,
  type GedcomParseResult,
  type GedcomIndividual,
  type GedcomFamily,
} from '../lib/gedcom-parser.js';

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: getMulterLimits(),
});

export const familyTreesRouter = Router();

// Validation schemas
const createTreeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  privacy: z.enum(['PRIVATE', 'FAMILY_ONLY', 'PUBLIC']).default('PRIVATE'),
  createRootPerson: z.boolean().optional().default(false),
});

const updateTreeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  privacy: z.enum(['PRIVATE', 'FAMILY_ONLY', 'PUBLIC']).optional(),
});

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
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  maidenName: z.string().optional(),
  suffix: z.string().optional(),
  nickname: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).default('UNKNOWN'),
  birthDate: dateStringSchema,
  birthPlace: z.string().optional(),
  deathDate: dateStringSchema,
  deathPlace: z.string().optional(),
  isLiving: z.boolean().default(true),
  biography: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  privacy: z.enum(['PUBLIC', 'FAMILY_ONLY', 'PRIVATE']).default('PUBLIC'),
  profilePhoto: z.string().url().optional(),
  generation: z.number().int().default(0),
  isPlaceholder: z.boolean().optional(), // For placeholder/unknown persons
}).passthrough(); // Allow extra fields

const updatePersonSchema = createPersonSchema.partial();

const patchPersonSchema = z.object({
  privacy: z.enum(['PUBLIC', 'FAMILY_ONLY', 'PRIVATE']).optional(),
});

const photoPrivacySchema = z.object({
  privacy: z.enum(['PUBLIC', 'ALL_FAMILY', 'DIRECT_RELATIVES', 'ADMINS_ONLY', 'PRIVATE', 'NONE']),
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
  notes: z.string().optional(),
  birthOrder: z.number().int().positive().optional(),
});

const createMarriageSchema = z.object({
  spouseIds: z.array(z.string().cuid()).length(2),
  marriageDate: dateStringSchema,
  marriagePlace: z.string().optional(),
  divorceDate: dateStringSchema,
  divorcePlace: z.string().optional(),
  notes: z.string().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('VIEWER'),
  expiresInDays: z.number().int().min(1).max(90).default(7),
});

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// Helper to get user ID from request (with fallback for dev)
function getUserId(req: Request): string {
  return req.userId || DEV_USER_ID;
}

// Helper to check if user has access to tree
async function checkTreeAccess(
  treeId: string,
  userId: string,
  requiredRole?: 'ADMIN' | 'MEMBER' | 'VIEWER'
) {
  const tree = await prisma.familyTree.findFirst({
    where: {
      id: treeId,
      OR: [
        { createdBy: userId },
        {
          members: {
            some: { userId },
          },
        },
      ],
    },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!tree) {
    throw new AppError(404, 'Family tree not found');
  }

  // Creator is always admin
  const isCreator = tree.createdBy === userId;
  const memberRole = tree.members[0]?.role;

  if (requiredRole) {
    const roleHierarchy = { ADMIN: 3, MEMBER: 2, VIEWER: 1 };
    const userRole = isCreator ? 'ADMIN' : memberRole;
    const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      throw new AppError(403, 'Insufficient permissions');
    }
  }

  return tree;
}

// ==========================================
// Family Tree Routes
// ==========================================

// GET /api/family-trees - List all family trees for user
familyTreesRouter.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const trees = await prisma.familyTree.findMany({
      where: {
        OR: [
          { createdBy: userId },
          {
            members: {
              some: { userId },
            },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { people: true },
        },
      },
    });

    res.json({
      success: true,
      data: trees,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees - Create new family tree
familyTreesRouter.post('/', async (req, res, next) => {
  try {
    const data = createTreeSchema.parse(req.body);
    const userId = getUserId(req);

    // Ensure user exists (create if not for development)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        clerkId: 'temp-clerk-id',
        email: 'temp@example.com',
        name: 'Temp User',
      },
    });

    // Create tree and optionally create root person for creator
    const tree = await prisma.familyTree.create({
      data: {
        name: data.name,
        description: data.description,
        privacy: data.privacy,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Auto-create root person node for creator if requested
    if (data.createRootPerson) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      if (user) {
        // Parse name into first and last name
        const nameParts = user.name?.split(' ') || ['User'];
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        await prisma.person.create({
          data: {
            treeId: tree.id,
            firstName,
            lastName,
            generation: 0,
            isLiving: true,
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:id - Get single family tree
familyTreesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(id, userId);

    const tree = await prisma.familyTree.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        people: {
          orderBy: [{ generation: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
        },
        relationships: true,
      },
    });

    // Determine the current user's role
    const isCreator = tree?.createdBy === userId;
    const membership = tree?.members.find(m => m.userId === userId);
    const userRole = isCreator ? 'ADMIN' : (membership?.role || null);

    res.json({
      success: true,
      data: {
        ...tree,
        // Include current user context for frontend permissions
        _currentUser: {
          userId,
          isCreator,
          role: userRole,
          memberId: membership?.id || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/family-trees/:id - Update family tree
familyTreesRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateTreeSchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(id, userId, 'ADMIN');

    const tree = await prisma.familyTree.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        privacy: data.privacy,
      },
    });

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:id - Delete family tree
familyTreesRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const tree = await prisma.familyTree.findFirst({
      where: { id, createdBy: userId },
    });

    if (!tree) {
      throw new AppError(404, 'Family tree not found or you are not the creator');
    }

    await prisma.familyTree.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Family tree deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Person Routes
// ==========================================

// GET /api/family-trees/:treeId/people - List all people in tree
familyTreesRouter.get('/:treeId/people', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const people = await prisma.person.findMany({
      where: { treeId },
      orderBy: [{ generation: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        relationshipsFrom: true,
        relationshipsTo: true,
        photos: true,
      },
    });

    res.json({
      success: true,
      data: people,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/people - Add person to tree
familyTreesRouter.post('/:treeId/people', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    console.log('[POST /people] Request body:', JSON.stringify(req.body, null, 2));

    const data = createPersonSchema.parse(req.body);
    console.log('[POST /people] Validated data:', JSON.stringify(data, null, 2));

    const userId = getUserId(req);
    console.log('[POST /people] User ID:', userId);

    await checkTreeAccess(treeId, userId, 'MEMBER');
    console.log('[POST /people] Access check passed');

    const person = await prisma.person.create({
      data: {
        treeId,
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
        isLiving: data.isLiving ?? true,
        biography: data.biography || null,
        occupation: data.occupation || null,
        education: data.education || null,
        privacy: data.privacy || 'PUBLIC',
        profilePhoto: data.profilePhoto || null,
        generation: data.generation ?? 0,
      },
    });
    console.log('[POST /people] Person created:', person.id);

    res.status(201).json({
      success: true,
      data: person,
    });
  } catch (error) {
    console.error('[POST /people] Error:', error instanceof Error ? error.message : String(error));
    next(error);
  }
});

// GET /api/family-trees/:treeId/people/:personId - Get person details
familyTreesRouter.get('/:treeId/people/:personId', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
      include: {
        relationshipsFrom: {
          include: {
            personTo: true,
          },
        },
        relationshipsTo: {
          include: {
            personFrom: true,
          },
        },
        marriages: true,
        photos: true,
        documents: true,
        stories: true,
      },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    res.json({
      success: true,
      data: person,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/family-trees/:treeId/people/:personId - Update person
familyTreesRouter.put('/:treeId/people/:personId', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const data = updatePersonSchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

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
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        birthPlace: data.birthPlace,
        deathDate: data.deathDate ? new Date(data.deathDate) : undefined,
        deathPlace: data.deathPlace,
        isLiving: data.isLiving,
        biography: data.biography,
        occupation: data.occupation,
        education: data.education,
        privacy: data.privacy,
        profilePhoto: data.profilePhoto,
        generation: data.generation,
      },
    });

    res.json({
      success: true,
      data: updatedPerson,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/family-trees/:treeId/people/:personId - Partial update person (privacy, etc.)
familyTreesRouter.patch('/:treeId/people/:personId', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const data = patchPersonSchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    const updatedPerson = await prisma.person.update({
      where: { id: personId },
      data: {
        privacy: data.privacy,
      },
    });

    res.json({
      success: true,
      data: updatedPerson,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/people/:personId/gdpr-delete - GDPR Delete (convert to placeholder)
familyTreesRouter.delete('/:treeId/people/:personId/gdpr-delete', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    // Convert person to anonymized placeholder
    // This preserves relationships while removing personal data
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
      },
    });

    // Delete all associated photos
    await prisma.treePhoto.deleteMany({
      where: { personId },
    });

    // Delete all associated documents
    await prisma.sourceDocument.deleteMany({
      where: { personId },
    });

    // Delete all associated stories
    await prisma.familyStory.deleteMany({
      where: { personId },
    });

    res.json({
      success: true,
      message: 'Person data removed and converted to placeholder',
      data: anonymizedPerson,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/people/:personId - Delete person
familyTreesRouter.delete('/:treeId/people/:personId', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    await prisma.person.delete({
      where: { id: personId },
    });

    res.json({
      success: true,
      message: 'Person deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Relationship Routes
// ==========================================

// POST /api/family-trees/:treeId/relationships - Create relationship
familyTreesRouter.post('/:treeId/relationships', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const data = createRelationshipSchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    // Verify both people exist in the tree
    const [personFrom, personTo] = await Promise.all([
      prisma.person.findFirst({ where: { id: data.personFromId, treeId } }),
      prisma.person.findFirst({ where: { id: data.personToId, treeId } }),
    ]);

    if (!personFrom || !personTo) {
      throw new AppError(400, 'One or both persons not found in this tree');
    }

    const relationship = await prisma.relationship.create({
      data: {
        treeId,
        personFromId: data.personFromId,
        personToId: data.personToId,
        relationshipType: data.relationshipType,
        notes: data.notes,
        birthOrder: data.birthOrder,
      },
      include: {
        personFrom: true,
        personTo: true,
      },
    });

    // Automatic sibling relationship establishment
    // When adding a CHILD relationship, automatically create SIBLING relationships
    if (data.relationshipType === 'CHILD') {
      // Find all existing children of the same parent (personFrom)
      const existingSiblings = await prisma.relationship.findMany({
        where: {
          treeId,
          personFromId: data.personFromId,
          relationshipType: 'CHILD',
          personToId: { not: data.personToId }, // Exclude the newly added child
        },
      });

      // Create bidirectional SIBLING relationships with all existing siblings
      const siblingRelationships: Array<{
        treeId: string;
        personFromId: string;
        personToId: string;
        relationshipType: 'SIBLING';
      }> = [];

      for (const sibling of existingSiblings) {
        // Check if sibling relationship already exists (in either direction)
        const existingRelationship = await prisma.relationship.findFirst({
          where: {
            treeId,
            OR: [
              {
                personFromId: data.personToId,
                personToId: sibling.personToId,
                relationshipType: 'SIBLING',
              },
              {
                personFromId: sibling.personToId,
                personToId: data.personToId,
                relationshipType: 'SIBLING',
              },
            ],
          },
        });

        if (!existingRelationship) {
          // Create sibling relationship from new child to existing sibling
          siblingRelationships.push({
            treeId,
            personFromId: data.personToId,
            personToId: sibling.personToId,
            relationshipType: 'SIBLING',
          });
        }
      }

      // Bulk create all sibling relationships
      if (siblingRelationships.length > 0) {
        await prisma.relationship.createMany({
          data: siblingRelationships,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: relationship,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/relationships/:relationshipId - Delete relationship
familyTreesRouter.delete('/:treeId/relationships/:relationshipId', async (req, res, next) => {
  try {
    const { treeId, relationshipId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const relationship = await prisma.relationship.findFirst({
      where: { id: relationshipId, treeId },
    });

    if (!relationship) {
      throw new AppError(404, 'Relationship not found');
    }

    await prisma.relationship.delete({
      where: { id: relationshipId },
    });

    res.json({
      success: true,
      message: 'Relationship deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Marriage Routes
// ==========================================

// POST /api/family-trees/:treeId/marriages - Create marriage
familyTreesRouter.post('/:treeId/marriages', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const data = createMarriageSchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    // Verify both spouses exist in the tree
    const spouses = await prisma.person.findMany({
      where: {
        id: { in: data.spouseIds },
        treeId,
      },
    });

    if (spouses.length !== 2) {
      throw new AppError(400, 'Both spouses must exist in this tree');
    }

    const marriage = await prisma.marriage.create({
      data: {
        treeId,
        marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
        marriagePlace: data.marriagePlace,
        divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
        divorcePlace: data.divorcePlace,
        notes: data.notes,
        spouses: {
          connect: data.spouseIds.map((id) => ({ id })),
        },
      },
      include: {
        spouses: true,
      },
    });

    res.status(201).json({
      success: true,
      data: marriage,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Member Management Routes
// ==========================================

// POST /api/family-trees/:treeId/invitations - Invite member
familyTreesRouter.post('/:treeId/invitations', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const data = inviteMemberSchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    const invitation = await prisma.treeInvitation.create({
      data: {
        treeId,
        email: data.email,
        role: data.role,
        inviteCode,
        invitedBy: userId,
        expiresAt,
      },
    });

    res.status(201).json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/invitations/:invitationId - Get invitation details
familyTreesRouter.get('/invitations/:invitationId', async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'Invitation token is required');
    }

    const invitation = await prisma.treeInvitation.findFirst({
      where: {
        id: invitationId,
        inviteCode: token,
        status: 'PENDING',
      },
      include: {
        tree: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new AppError(404, 'Invitation not found or already used');
    }

    // Check if invitation has expired
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new AppError(410, 'Invitation has expired');
    }

    res.json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/invitations/:invitationId/accept - Accept invitation
familyTreesRouter.post('/invitations/:invitationId/accept', async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { token } = req.body;
    const userId = getUserId(req);

    if (!token) {
      throw new AppError(400, 'Invitation token is required');
    }

    const invitation = await prisma.treeInvitation.findFirst({
      where: {
        id: invitationId,
        inviteCode: token,
        status: 'PENDING',
      },
    });

    if (!invitation) {
      throw new AppError(404, 'Invitation not found or already used');
    }

    // Check if invitation has expired
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new AppError(410, 'Invitation has expired');
    }

    // Check if user is already a member
    const existingMember = await prisma.treeMember.findFirst({
      where: {
        treeId: invitation.treeId,
        userId,
      },
    });

    if (existingMember) {
      throw new AppError(400, 'You are already a member of this tree');
    }

    // Create tree membership
    const member = await prisma.treeMember.create({
      data: {
        treeId: invitation.treeId,
        userId,
        role: invitation.role,
      },
    });

    // Update invitation status
    await prisma.treeInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: userId,
      },
    });

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/invitations/:invitationId/decline - Decline invitation
familyTreesRouter.post('/invitations/:invitationId/decline', async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { token } = req.body;
    const userId = getUserId(req);

    if (!token) {
      throw new AppError(400, 'Invitation token is required');
    }

    const invitation = await prisma.treeInvitation.findFirst({
      where: {
        id: invitationId,
        inviteCode: token,
        status: 'PENDING',
      },
    });

    if (!invitation) {
      throw new AppError(404, 'Invitation not found or already used');
    }

    // Update invitation status
    await prisma.treeInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'DECLINED',
      },
    });

    res.json({
      success: true,
      message: 'Invitation declined',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/members/:memberId - Remove member
familyTreesRouter.delete('/:treeId/members/:memberId', async (req, res, next) => {
  try {
    const { treeId, memberId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    const member = await prisma.treeMember.findFirst({
      where: { id: memberId, treeId },
    });

    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    await prisma.treeMember.delete({
      where: { id: memberId },
    });

    res.json({
      success: true,
      message: 'Member removed',
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/family-trees/:treeId/members/:memberId/role - Update member role
familyTreesRouter.patch('/:treeId/members/:memberId/role', async (req, res, next) => {
  try {
    const { treeId, memberId } = req.params;
    const { role } = req.body;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    if (!role || !['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      throw new AppError(400, 'Invalid role');
    }

    const member = await prisma.treeMember.findFirst({
      where: { id: memberId, treeId },
    });

    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    // Prevent changing own role
    if (member.userId === userId) {
      throw new AppError(400, 'You cannot change your own role');
    }

    // If demoting an admin, ensure at least one admin remains
    if (member.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.treeMember.count({
        where: {
          treeId,
          role: 'ADMIN',
        },
      });

      if (adminCount <= 1) {
        throw new AppError(400, 'Cannot demote the last administrator');
      }
    }

    const updatedMember = await prisma.treeMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Photo Routes
// ==========================================

// POST /api/family-trees/:treeId/photos - Upload photo (supports both URL and file upload)
familyTreesRouter.post('/:treeId/photos', upload.single('photo'), async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    // Check photo limits
    const limitCheck = await checkPhotoLimits(prisma, treeId, userId);
    if (!limitCheck.allowed) {
      throw new AppError(400, limitCheck.reason || 'Photo upload limit reached');
    }

    // Extract form data
    const { personId, caption, dateTaken, location, privacy } = req.body;

    // Validate personId if provided
    if (personId) {
      const person = await prisma.person.findFirst({
        where: { id: personId, treeId },
      });

      if (!person) {
        throw new AppError(400, 'Person not found in this tree');
      }
    }

    // Determine default privacy based on person's age
    let defaultPrivacy: 'PUBLIC' | 'ALL_FAMILY' | 'DIRECT_RELATIVES' | 'ADMINS_ONLY' | 'PRIVATE' | 'NONE' = 'ALL_FAMILY';

    if (personId) {
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { birthDate: true, isLiving: true },
      });

      if (person && person.birthDate && person.isLiving) {
        const age = Math.floor((Date.now() - new Date(person.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 18) {
          defaultPrivacy = 'DIRECT_RELATIVES';
        }
      }
    }

    let photoData: {
      url: string;
      originalUrl?: string;
      s3Key?: string;
      thumbnailKey?: string;
      width?: number;
      height?: number;
      fileSize?: number;
      format?: string;
    };

    // Check if file was uploaded via multipart/form-data
    const file = req.file;
    if (file && isS3Configured()) {
      // Validate file
      const validation = validatePhotoFile({ size: file.size, mimetype: file.mimetype });
      if (!validation.valid) {
        throw new AppError(400, validation.error || 'Invalid file');
      }

      // Upload to S3
      const uploadResult = await uploadPhotoToS3(
        file.buffer,
        file.originalname,
        treeId,
        userId,
        file.mimetype
      );

      photoData = {
        url: uploadResult.thumbnailUrl,
        originalUrl: uploadResult.originalUrl,
        s3Key: uploadResult.key,
        thumbnailKey: uploadResult.thumbnailKey,
        width: uploadResult.width,
        height: uploadResult.height,
        fileSize: uploadResult.size,
        format: uploadResult.format,
      };
    } else {
      // Fall back to URL-based upload (legacy behavior)
      const photoUrl = req.body.url;
      if (!photoUrl) {
        throw new AppError(400, isS3Configured()
          ? 'Photo file or URL is required'
          : 'Photo URL is required (S3 storage not configured)');
      }
      photoData = { url: photoUrl };
    }

    const photo = await prisma.treePhoto.create({
      data: {
        treeId,
        personId: personId || null,
        url: photoData.url,
        originalUrl: photoData.originalUrl || null,
        s3Key: photoData.s3Key || null,
        thumbnailKey: photoData.thumbnailKey || null,
        width: photoData.width || null,
        height: photoData.height || null,
        fileSize: photoData.fileSize || null,
        format: photoData.format || null,
        caption: caption || null,
        dateTaken: dateTaken ? new Date(dateTaken) : null,
        location: location || null,
        privacy: privacy || defaultPrivacy,
        uploadedBy: userId,
      },
    });

    res.status(201).json({
      success: true,
      data: photo,
    });
  } catch (error) {
    next(error);
  }
});

// Handler for listing photos (shared between routes)
async function handleListPhotos(req: Request, res: import('express').Response, next: import('express').NextFunction, personIdOverride?: string) {
  try {
    const { treeId } = req.params;
    const {
      personId: queryPersonId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = '50',
      offset = '0',
    } = req.query;
    const personId = personIdOverride || queryPersonId;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    // Build where clause
    const where: {
      treeId: string;
      personId?: string;
      dateTaken?: { gte?: Date; lte?: Date };
      OR?: Array<{ personId: string } | { taggedPeople: { some: { personId: string } } }>;
    } = { treeId };

    // Filter by person (includes tagged photos)
    if (personId && typeof personId === 'string') {
      where.OR = [
        { personId },
        { taggedPeople: { some: { personId } } },
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      where.dateTaken = {};
      if (startDate && typeof startDate === 'string') {
        where.dateTaken.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        where.dateTaken.lte = new Date(endDate);
      }
    }

    // Determine sort field
    const validSortFields = ['createdAt', 'dateTaken', 'caption'];
    const orderField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [photos, total] = await Promise.all([
      prisma.treePhoto.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        take: Math.min(parseInt(limit as string) || 50, 100),
        skip: parseInt(offset as string) || 0,
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          taggedPeople: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                },
              },
            },
          },
        },
      }),
      prisma.treePhoto.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        photos,
        total,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/family-trees/:treeId/people/:personId/photos - List photos for a specific person
// This route exists because the frontend expects this URL pattern
familyTreesRouter.get('/:treeId/people/:personId/photos', async (req, res, next) => {
  return handleListPhotos(req, res, next, req.params.personId);
});

// GET /api/family-trees/:treeId/photos - List all photos in tree
familyTreesRouter.get('/:treeId/photos', async (req, res, next) => {
  return handleListPhotos(req, res, next);
});

// PATCH /api/family-trees/:treeId/photos/:photoId/privacy - Update photo privacy
familyTreesRouter.patch('/:treeId/photos/:photoId/privacy', async (req, res, next) => {
  try {
    const { treeId, photoId } = req.params;
    const data = photoPrivacySchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    const updatedPhoto = await prisma.treePhoto.update({
      where: { id: photoId },
      data: {
        privacy: data.privacy,
      },
    });

    res.json({
      success: true,
      data: updatedPhoto,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/photos/:photoId/request-removal - Request photo removal
familyTreesRouter.post('/:treeId/photos/:photoId/request-removal', async (req, res, next) => {
  try {
    const { treeId, photoId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    // Mark photo for removal by setting privacy to NONE
    // In a real implementation, you might:
    // 1. Create a RemovalRequest table to track requests
    // 2. Set up a scheduled job to delete photos after 90 days
    // 3. Send notifications to admins for approval
    const updatedPhoto = await prisma.treePhoto.update({
      where: { id: photoId },
      data: {
        privacy: 'NONE',
        // In a real implementation, you might add:
        // removalRequestedAt: new Date(),
        // removalRequestedBy: userId,
      },
    });

    res.json({
      success: true,
      message: 'Photo removal request submitted. Photo will be hidden immediately and deleted after review.',
      data: updatedPhoto,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/photos/:photoId - Delete photo
familyTreesRouter.delete('/:treeId/photos/:photoId', async (req, res, next) => {
  try {
    const { treeId, photoId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    // Delete from S3 if keys exist
    if (photo.s3Key) {
      await deletePhotoFromS3(photo.s3Key, photo.thumbnailKey || undefined);
    }

    await prisma.treePhoto.delete({
      where: { id: photoId },
    });

    res.json({
      success: true,
      message: 'Photo deleted',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/photos/:photoId/download - Get download URL for original resolution
familyTreesRouter.get('/:treeId/photos/:photoId/download', async (req, res, next) => {
  try {
    const { treeId, photoId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    // Check if S3 key exists
    if (!photo.s3Key) {
      // Fall back to original URL if no S3 key
      if (photo.originalUrl) {
        res.json({
          success: true,
          data: {
            downloadUrl: photo.originalUrl,
            expiresIn: null,
            filename: `photo-${photo.id}.jpg`,
            fileSize: photo.fileSize,
            width: photo.width,
            height: photo.height,
            format: photo.format,
          },
        });
        return;
      }
      throw new AppError(400, 'Original resolution not available for this photo');
    }

    // Generate presigned download URL (expires in 1 hour)
    const downloadUrl = await getDownloadUrl(photo.s3Key, 3600);

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
        filename: photo.s3Key.split('/').pop() || `photo-${photo.id}.jpg`,
        fileSize: photo.fileSize,
        width: photo.width,
        height: photo.height,
        format: photo.format,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/photos/quota - Get upload quota for current user
familyTreesRouter.get('/:treeId/photos/quota', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const quota = await getUploadQuota(prisma, treeId, userId);
    const config = getStorageConfig();

    res.json({
      success: true,
      data: {
        ...quota,
        maxFileSizeMB: config.limits.maxFileSizeMB,
        s3Configured: isS3Configured(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/photos/:photoId/tags - Tag people in photo
familyTreesRouter.post('/:treeId/photos/:photoId/tags', async (req, res, next) => {
  try {
    const { treeId, photoId } = req.params;
    const { personIds } = req.body;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    if (!Array.isArray(personIds) || personIds.length === 0) {
      throw new AppError(400, 'personIds must be a non-empty array');
    }

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    // Verify all persons exist in tree
    const persons = await prisma.person.findMany({
      where: { id: { in: personIds }, treeId },
      select: { id: true },
    });

    const foundIds = new Set(persons.map(p => p.id));
    const missingIds = personIds.filter((id: string) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new AppError(400, `Some persons not found in tree: ${missingIds.join(', ')}`);
    }

    // Create tags (ignore duplicates)
    await prisma.photoTag.createMany({
      data: personIds.map((personId: string) => ({
        photoId,
        personId,
      })),
      skipDuplicates: true,
    });

    // Fetch updated photo with tags
    const updatedPhoto = await prisma.treePhoto.findUnique({
      where: { id: photoId },
      include: {
        taggedPeople: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: `Tagged ${personIds.length} people in photo`,
      data: updatedPhoto,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/photos/:photoId/tags/:personId - Remove tag from photo
familyTreesRouter.delete('/:treeId/photos/:photoId/tags/:personId', async (req, res, next) => {
  try {
    const { treeId, photoId, personId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    // Delete the tag
    await prisma.photoTag.deleteMany({
      where: { photoId, personId },
    });

    res.json({
      success: true,
      message: 'Tag removed',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/photos/:photoId - Get single photo with details
familyTreesRouter.get('/:treeId/photos/:photoId', async (req, res, next) => {
  try {
    const { treeId, photoId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        taggedPeople: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    res.json({
      success: true,
      data: photo,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/family-trees/:treeId/photos/:photoId - Update photo metadata
familyTreesRouter.patch('/:treeId/photos/:photoId', async (req, res, next) => {
  try {
    const { treeId, photoId } = req.params;
    const { caption, dateTaken, location } = req.body;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const photo = await prisma.treePhoto.findFirst({
      where: { id: photoId, treeId },
    });

    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    const updateData: Record<string, unknown> = {};
    if (caption !== undefined) updateData.caption = caption;
    if (location !== undefined) updateData.location = location;
    if (dateTaken !== undefined) {
      updateData.dateTaken = dateTaken ? new Date(dateTaken) : null;
    }

    const updatedPhoto = await prisma.treePhoto.update({
      where: { id: photoId },
      data: updateData,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        taggedPeople: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedPhoto,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Search Routes
// ==========================================

// GET /api/family-trees/:treeId/search - Search persons in tree
familyTreesRouter.get('/:treeId/search', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const { q, birthYear, location, limit = '20' } = req.query;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    if (!q && !birthYear && !location) {
      throw new AppError(400, 'At least one search parameter is required (q, birthYear, or location)');
    }

    // Build search conditions
    const conditions: any[] = [{ treeId }];

    if (q && typeof q === 'string') {
      const searchTerm = q.trim().toLowerCase();
      conditions.push({
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { maidenName: { contains: searchTerm, mode: 'insensitive' } },
          { nickname: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (birthYear && typeof birthYear === 'string') {
      const year = parseInt(birthYear);
      if (!isNaN(year)) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);
        conditions.push({
          birthDate: {
            gte: startDate,
            lt: endDate,
          },
        });
      }
    }

    if (location && typeof location === 'string') {
      const locationTerm = location.trim().toLowerCase();
      conditions.push({
        OR: [
          { birthPlace: { contains: locationTerm, mode: 'insensitive' } },
          { deathPlace: { contains: locationTerm, mode: 'insensitive' } },
        ],
      });
    }

    const people = await prisma.person.findMany({
      where: {
        AND: conditions,
      },
      take: Math.min(parseInt(limit as string) || 20, 50),
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        maidenName: true,
        birthDate: true,
        deathDate: true,
        birthPlace: true,
        isLiving: true,
        profilePhoto: true,
        generation: true,
      },
    });

    res.json({
      success: true,
      data: people,
      count: people.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/people/:personId/lineage - Get lineage path to a person
familyTreesRouter.get('/:treeId/people/:personId/lineage', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    // Build lineage path by traversing parent relationships
    const lineage: Array<{
      id: string;
      firstName: string;
      lastName: string;
      generation: number;
    }> = [];

    const visited = new Set<string>();
    let currentId: string | null = personId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const current = await prisma.person.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          generation: true,
        },
      });

      if (current) {
        lineage.unshift(current);
      }

      // Find parent relationship
      const parentRel = await prisma.relationship.findFirst({
        where: {
          treeId,
          personToId: currentId,
          relationshipType: {
            in: ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT'],
          },
        },
        select: {
          personFromId: true,
        },
      });

      currentId = parentRel?.personFromId || null;
    }

    res.json({
      success: true,
      data: {
        person: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
        },
        lineage,
        generations: lineage.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// User-Person Linking (Find Me)
// ==========================================

// GET /api/family-trees/:treeId/me - Get the linked person for current user
familyTreesRouter.get('/:treeId/me', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    const member = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId, userId } },
      include: {
        linkedPerson: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            maidenName: true,
            profilePhoto: true,
            generation: true,
          },
        },
      },
    });

    if (!member) {
      throw new AppError(403, 'Not a member of this tree');
    }

    res.json({
      success: true,
      data: {
        linkedPerson: member.linkedPerson,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/me/link - Link current user to a person
familyTreesRouter.post('/:treeId/me/link', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const { personId } = req.body;
    const userId = getUserId(req);

    if (!personId || typeof personId !== 'string') {
      throw new AppError(400, 'personId is required');
    }

    const member = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId, userId } },
    });

    if (!member) {
      throw new AppError(403, 'Not a member of this tree');
    }

    // Check if person exists in this tree
    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found in this tree');
    }

    // Check if person is already linked to another user
    const existingLink = await prisma.treeMember.findFirst({
      where: {
        linkedPersonId: personId,
        userId: { not: userId },
      },
    });

    if (existingLink) {
      throw new AppError(409, 'This person is already linked to another user');
    }

    // Update the member's linked person
    const updated = await prisma.treeMember.update({
      where: { treeId_userId: { treeId, userId } },
      data: { linkedPersonId: personId },
      include: {
        linkedPerson: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            maidenName: true,
            profilePhoto: true,
            generation: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Successfully linked to person',
      data: {
        linkedPerson: updated.linkedPerson,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/me/link - Unlink current user from person
familyTreesRouter.delete('/:treeId/me/link', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    const member = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId, userId } },
    });

    if (!member) {
      throw new AppError(403, 'Not a member of this tree');
    }

    if (!member.linkedPersonId) {
      throw new AppError(400, 'No person linked to unlink');
    }

    await prisma.treeMember.update({
      where: { treeId_userId: { treeId, userId } },
      data: { linkedPersonId: null },
    });

    res.json({
      success: true,
      message: 'Successfully unlinked from person',
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Generation Filter
// ==========================================

// GET /api/family-trees/:treeId/generations - Get generation statistics
familyTreesRouter.get('/:treeId/generations', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const generations = await prisma.person.groupBy({
      by: ['generation'],
      where: { treeId },
      _count: { id: true },
      orderBy: { generation: 'asc' },
    });

    const result = generations.map(g => ({
      generation: g.generation,
      count: g._count.id,
    }));

    const minGen = result.length > 0 ? Math.min(...result.map(r => r.generation)) : 0;
    const maxGen = result.length > 0 ? Math.max(...result.map(r => r.generation)) : 0;

    res.json({
      success: true,
      data: {
        generations: result,
        minGeneration: minGen,
        maxGeneration: maxGen,
        totalGenerations: maxGen - minGen + 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Branch Isolation
// ==========================================

// GET /api/family-trees/:treeId/people/:personId/branch - Get all people in a person's branch
familyTreesRouter.get('/:treeId/people/:personId/branch', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const { direction = 'both' } = req.query; // 'ancestors', 'descendants', or 'both'
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    const branchIds = new Set<string>();
    branchIds.add(personId);

    // Get ancestors (parents, grandparents, etc.)
    if (direction === 'ancestors' || direction === 'both') {
      const ancestorQueue = [personId];
      const visitedAncestors = new Set<string>();

      while (ancestorQueue.length > 0) {
        const currentId = ancestorQueue.shift()!;
        if (visitedAncestors.has(currentId)) continue;
        visitedAncestors.add(currentId);

        const parentRels = await prisma.relationship.findMany({
          where: {
            treeId,
            personToId: currentId,
            relationshipType: {
              in: ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT'],
            },
          },
          select: { personFromId: true },
        });

        for (const rel of parentRels) {
          branchIds.add(rel.personFromId);
          if (!visitedAncestors.has(rel.personFromId)) {
            ancestorQueue.push(rel.personFromId);
          }
        }
      }
    }

    // Get descendants (children, grandchildren, etc.)
    if (direction === 'descendants' || direction === 'both') {
      const descendantQueue = [personId];
      const visitedDescendants = new Set<string>();

      while (descendantQueue.length > 0) {
        const currentId = descendantQueue.shift()!;
        if (visitedDescendants.has(currentId)) continue;
        visitedDescendants.add(currentId);

        const childRels = await prisma.relationship.findMany({
          where: {
            treeId,
            personFromId: currentId,
            relationshipType: {
              in: ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT'],
            },
          },
          select: { personToId: true },
        });

        for (const rel of childRels) {
          branchIds.add(rel.personToId);
          if (!visitedDescendants.has(rel.personToId)) {
            descendantQueue.push(rel.personToId);
          }
        }
      }
    }

    // Also include spouses of people in the branch
    const spouseRels = await prisma.relationship.findMany({
      where: {
        treeId,
        relationshipType: 'SPOUSE',
        OR: [
          { personFromId: { in: Array.from(branchIds) } },
          { personToId: { in: Array.from(branchIds) } },
        ],
      },
      select: { personFromId: true, personToId: true },
    });

    for (const rel of spouseRels) {
      branchIds.add(rel.personFromId);
      branchIds.add(rel.personToId);
    }

    // Fetch all people in the branch
    const branchPeople = await prisma.person.findMany({
      where: {
        id: { in: Array.from(branchIds) },
      },
      orderBy: [
        { generation: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Fetch relationships within the branch
    const branchRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        personFromId: { in: Array.from(branchIds) },
        personToId: { in: Array.from(branchIds) },
      },
    });

    res.json({
      success: true,
      data: {
        rootPerson: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
        },
        direction,
        people: branchPeople,
        relationships: branchRelationships,
        personCount: branchPeople.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Timeline View
// ==========================================

interface TimelineEvent {
  id: string;
  type: 'birth' | 'death' | 'marriage' | 'divorce';
  date: Date;
  year: number;
  personId: string;
  personName: string;
  personPhoto?: string | null;
  details?: string;
  relatedPersonId?: string;
  relatedPersonName?: string;
}

// GET /api/family-trees/:treeId/timeline - Get chronological events
familyTreesRouter.get('/:treeId/timeline', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const {
      eventTypes,
      startYear,
      endYear,
      personId,
      limit = '100',
    } = req.query;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const events: TimelineEvent[] = [];

    // Parse event type filter
    const typeFilter = eventTypes
      ? (eventTypes as string).split(',').map(t => t.trim().toLowerCase())
      : ['birth', 'death', 'marriage', 'divorce'];

    // Parse year range
    const minYear = startYear ? parseInt(startYear as string) : null;
    const maxYear = endYear ? parseInt(endYear as string) : null;

    // Fetch all people in the tree
    const people = await prisma.person.findMany({
      where: {
        treeId,
        ...(personId ? { id: personId as string } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        birthDate: true,
        birthPlace: true,
        deathDate: true,
        deathPlace: true,
      },
    });

    // Build person lookup map
    const personMap = new Map(people.map(p => [p.id, p]));

    // Collect birth events
    if (typeFilter.includes('birth')) {
      for (const person of people) {
        if (person.birthDate) {
          const year = new Date(person.birthDate).getFullYear();
          if ((!minYear || year >= minYear) && (!maxYear || year <= maxYear)) {
            events.push({
              id: `birth-${person.id}`,
              type: 'birth',
              date: person.birthDate,
              year,
              personId: person.id,
              personName: `${person.firstName} ${person.lastName}`,
              personPhoto: person.profilePhoto,
              details: person.birthPlace || undefined,
            });
          }
        }
      }
    }

    // Collect death events
    if (typeFilter.includes('death')) {
      for (const person of people) {
        if (person.deathDate) {
          const year = new Date(person.deathDate).getFullYear();
          if ((!minYear || year >= minYear) && (!maxYear || year <= maxYear)) {
            events.push({
              id: `death-${person.id}`,
              type: 'death',
              date: person.deathDate,
              year,
              personId: person.id,
              personName: `${person.firstName} ${person.lastName}`,
              personPhoto: person.profilePhoto,
              details: person.deathPlace || undefined,
            });
          }
        }
      }
    }

    // Fetch marriages for marriage/divorce events
    if (typeFilter.includes('marriage') || typeFilter.includes('divorce')) {
      const marriages = await prisma.marriage.findMany({
        where: { treeId },
        include: {
          spouses: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
        },
      });

      for (const marriage of marriages) {
        const [spouse1, spouse2] = marriage.spouses;
        if (!spouse1 || !spouse2) continue;

        // Marriage event
        if (typeFilter.includes('marriage') && marriage.marriageDate) {
          const year = new Date(marriage.marriageDate).getFullYear();
          if ((!minYear || year >= minYear) && (!maxYear || year <= maxYear)) {
            // Only include if not filtering by personId, or if personId matches one of the spouses
            if (!personId || spouse1.id === personId || spouse2.id === personId) {
              events.push({
                id: `marriage-${marriage.id}`,
                type: 'marriage',
                date: marriage.marriageDate,
                year,
                personId: spouse1.id,
                personName: `${spouse1.firstName} ${spouse1.lastName}`,
                personPhoto: spouse1.profilePhoto,
                details: marriage.marriagePlace || undefined,
                relatedPersonId: spouse2.id,
                relatedPersonName: `${spouse2.firstName} ${spouse2.lastName}`,
              });
            }
          }
        }

        // Divorce event
        if (typeFilter.includes('divorce') && marriage.divorceDate) {
          const year = new Date(marriage.divorceDate).getFullYear();
          if ((!minYear || year >= minYear) && (!maxYear || year <= maxYear)) {
            if (!personId || spouse1.id === personId || spouse2.id === personId) {
              events.push({
                id: `divorce-${marriage.id}`,
                type: 'divorce',
                date: marriage.divorceDate,
                year,
                personId: spouse1.id,
                personName: `${spouse1.firstName} ${spouse1.lastName}`,
                personPhoto: spouse1.profilePhoto,
                details: marriage.divorcePlace || undefined,
                relatedPersonId: spouse2.id,
                relatedPersonName: `${spouse2.firstName} ${spouse2.lastName}`,
              });
            }
          }
        }
      }
    }

    // Sort events chronologically
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Apply limit
    const limitNum = Math.min(parseInt(limit as string) || 100, 500);
    const limitedEvents = events.slice(0, limitNum);

    // Group events by year for easier display
    const eventsByYear = new Map<number, TimelineEvent[]>();
    for (const event of limitedEvents) {
      const yearEvents = eventsByYear.get(event.year) || [];
      yearEvents.push(event);
      eventsByYear.set(event.year, yearEvents);
    }

    // Convert to sorted array
    const groupedEvents = Array.from(eventsByYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, yearEvents]) => ({ year, events: yearEvents }));

    // Calculate statistics
    const stats = {
      totalEvents: events.length,
      displayedEvents: limitedEvents.length,
      birthCount: events.filter(e => e.type === 'birth').length,
      deathCount: events.filter(e => e.type === 'death').length,
      marriageCount: events.filter(e => e.type === 'marriage').length,
      divorceCount: events.filter(e => e.type === 'divorce').length,
      earliestYear: events.length > 0 ? Math.min(...events.map(e => e.year)) : null,
      latestYear: events.length > 0 ? Math.max(...events.map(e => e.year)) : null,
    };

    res.json({
      success: true,
      data: {
        events: limitedEvents,
        groupedByYear: groupedEvents,
        stats,
        filters: {
          eventTypes: typeFilter,
          startYear: minYear,
          endYear: maxYear,
          personId: personId || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Suggested Edits
// ==========================================

const createSuggestionSchema = z.object({
  personId: z.string().cuid(),
  type: z.enum(['UPDATE_PERSON', 'ADD_RELATIONSHIP', 'ADD_PERSON', 'CORRECT_DATE', 'OTHER']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  suggestedData: z.record(z.unknown()), // JSON object with proposed changes
});

const reviewSuggestionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(1000).optional(),
  applyChanges: z.boolean().optional().default(false), // Whether to auto-apply on approval
});

// POST /api/family-trees/:treeId/suggestions - Create a suggestion
familyTreesRouter.post('/:treeId/suggestions', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);
    const data = createSuggestionSchema.parse(req.body);

    // Check tree access (any member can suggest)
    await checkTreeAccess(treeId, userId);

    // Verify person exists in tree
    const person = await prisma.person.findFirst({
      where: { id: data.personId, treeId },
    });

    if (!person) {
      throw new AppError(404, 'Person not found in this tree');
    }

    // Get current data for context
    const currentData = {
      firstName: person.firstName,
      lastName: person.lastName,
      middleName: person.middleName,
      maidenName: person.maidenName,
      birthDate: person.birthDate,
      birthPlace: person.birthPlace,
      deathDate: person.deathDate,
      deathPlace: person.deathPlace,
      isLiving: person.isLiving,
      occupation: person.occupation,
      biography: person.biography,
    };

    const suggestion = await prisma.suggestion.create({
      data: {
        treeId,
        personId: data.personId,
        suggesterId: userId,
        type: data.type,
        title: data.title,
        description: data.description,
        currentData: currentData as unknown as Prisma.InputJsonValue,
        suggestedData: data.suggestedData as unknown as Prisma.InputJsonValue,
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        suggester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send email notification to admins (async, don't wait)
    (async () => {
      try {
        // Get tree info and admin emails
        const tree = await prisma.familyTree.findUnique({
          where: { id: treeId },
          select: { name: true },
        });

        const adminMembers = await prisma.treeMember.findMany({
          where: { treeId, role: 'ADMIN' },
          include: {
            user: { select: { email: true } },
          },
        });

        const adminEmails = adminMembers
          .map(m => m.user.email)
          .filter(email => email !== suggestion.suggester.email); // Don't notify the suggester if they're an admin

        if (adminEmails.length > 0 && tree) {
          await sendSuggestionNotification(adminEmails, {
            treeName: tree.name,
            treeId,
            suggesterName: suggestion.suggester.name || suggestion.suggester.email,
            suggesterEmail: suggestion.suggester.email,
            personName: `${suggestion.person.firstName} ${suggestion.person.lastName}`,
            suggestionTitle: suggestion.title,
            suggestionType: suggestion.type,
            suggestionDescription: data.description,
          });
        }
      } catch (emailError) {
        console.error('[Suggestion] Failed to send admin notification:', emailError);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Suggestion submitted successfully',
      data: suggestion,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/suggestions - List suggestions
familyTreesRouter.get('/:treeId/suggestions', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const { status, personId, limit = '50', offset = '0' } = req.query;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    // Build filter conditions
    const where: {
      treeId: string;
      status?: 'PENDING' | 'APPROVED' | 'REJECTED';
      personId?: string;
    } = { treeId };

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status as string)) {
      where.status = status as 'PENDING' | 'APPROVED' | 'REJECTED';
    }

    if (personId && typeof personId === 'string') {
      where.personId = personId;
    }

    const [suggestions, total] = await Promise.all([
      prisma.suggestion.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          suggester: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit as string) || 50, 100),
        skip: parseInt(offset as string) || 0,
      }),
      prisma.suggestion.count({ where }),
    ]);

    // Get pending count for badge
    const pendingCount = await prisma.suggestion.count({
      where: { treeId, status: 'PENDING' },
    });

    res.json({
      success: true,
      data: {
        suggestions,
        total,
        pendingCount,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/suggestions/:suggestionId - Get single suggestion
familyTreesRouter.get('/:treeId/suggestions/:suggestionId', async (req, res, next) => {
  try {
    const { treeId, suggestionId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const suggestion = await prisma.suggestion.findFirst({
      where: { id: suggestionId, treeId },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            maidenName: true,
            birthDate: true,
            birthPlace: true,
            deathDate: true,
            deathPlace: true,
            isLiving: true,
            occupation: true,
            biography: true,
            profilePhoto: true,
          },
        },
        suggester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!suggestion) {
      throw new AppError(404, 'Suggestion not found');
    }

    res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/family-trees/:treeId/suggestions/:suggestionId/review - Approve/reject suggestion
familyTreesRouter.put('/:treeId/suggestions/:suggestionId/review', async (req, res, next) => {
  try {
    const { treeId, suggestionId } = req.params;
    const userId = getUserId(req);
    const data = reviewSuggestionSchema.parse(req.body);

    // Only admins can review suggestions
    await checkTreeAccess(treeId, userId, 'ADMIN');

    const suggestion = await prisma.suggestion.findFirst({
      where: { id: suggestionId, treeId },
    });

    if (!suggestion) {
      throw new AppError(404, 'Suggestion not found');
    }

    if (suggestion.status !== 'PENDING') {
      throw new AppError(400, 'Suggestion has already been reviewed');
    }

    // Update suggestion status
    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        status: data.status,
        reviewerId: userId,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        suggester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If approved and applyChanges is true, apply the changes
    if (data.status === 'APPROVED' && data.applyChanges && suggestion.type === 'UPDATE_PERSON') {
      const suggestedData = suggestion.suggestedData as Record<string, unknown>;

      // Filter to only valid person fields
      const validFields = [
        'firstName', 'lastName', 'middleName', 'maidenName',
        'birthDate', 'birthPlace', 'deathDate', 'deathPlace',
        'isLiving', 'occupation', 'biography', 'education',
      ];

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(suggestedData)) {
        if (validFields.includes(key)) {
          // Handle date fields
          if ((key === 'birthDate' || key === 'deathDate') && value) {
            updateData[key] = new Date(value as string);
          } else {
            updateData[key] = value;
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.person.update({
          where: { id: suggestion.personId },
          data: updateData,
        });
      }
    }

    // Send email notification to suggester (async, don't wait)
    (async () => {
      try {
        // Get tree info and reviewer name
        const tree = await prisma.familyTree.findUnique({
          where: { id: treeId },
          select: { name: true },
        });

        const reviewer = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });

        if (tree && updated.suggester.email) {
          await sendSuggestionReviewedNotification(updated.suggester.email, {
            treeName: tree.name,
            treeId,
            personName: `${updated.person.firstName} ${updated.person.lastName}`,
            suggestionTitle: updated.title,
            status: data.status,
            reviewerName: reviewer?.name || reviewer?.email || 'Admin',
            reviewNote: data.reviewNote,
          });
        }
      } catch (emailError) {
        console.error('[Suggestion] Failed to send review notification:', emailError);
      }
    })();

    res.json({
      success: true,
      message: `Suggestion ${data.status.toLowerCase()}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/suggestions/:suggestionId - Delete suggestion
familyTreesRouter.delete('/:treeId/suggestions/:suggestionId', async (req, res, next) => {
  try {
    const { treeId, suggestionId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const suggestion = await prisma.suggestion.findFirst({
      where: { id: suggestionId, treeId },
    });

    if (!suggestion) {
      throw new AppError(404, 'Suggestion not found');
    }

    // Only suggester or admin can delete
    const member = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId, userId } },
    });

    if (suggestion.suggesterId !== userId && member?.role !== 'ADMIN') {
      throw new AppError(403, 'Not authorized to delete this suggestion');
    }

    await prisma.suggestion.delete({
      where: { id: suggestionId },
    });

    res.json({
      success: true,
      message: 'Suggestion deleted',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/people/:personId/suggestions - Get suggestions for a person
familyTreesRouter.get('/:treeId/people/:personId/suggestions', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const { status } = req.query;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const where: {
      treeId: string;
      personId: string;
      status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    } = { treeId, personId };

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status as string)) {
      where.status = status as 'PENDING' | 'APPROVED' | 'REJECTED';
    }

    const suggestions = await prisma.suggestion.findMany({
      where,
      include: {
        suggester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Document Routes
// ==========================================

// Validation schemas for documents
const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  documentType: z.enum([
    'BIRTH_CERTIFICATE',
    'DEATH_CERTIFICATE',
    'MARRIAGE_CERTIFICATE',
    'DIVORCE_DECREE',
    'CENSUS_RECORD',
    'MILITARY_RECORD',
    'IMMIGRATION_RECORD',
    'NEWSPAPER_ARTICLE',
    'PHOTO',
    'LETTER',
    'WILL',
    'DEED',
    'OTHER',
  ]),
  personId: z.string().optional(),
  notes: z.string().max(5000).optional(),
  citation: z.string().max(1000).optional(),
  dateOnDocument: dateStringSchema,
  url: z.string().url().optional(),
  hasWatermark: z.boolean().optional(),
});

const updateDocumentSchema = createDocumentSchema.partial();

const documentReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  isOfficial: z.boolean().optional(),
  reviewNote: z.string().max(1000).optional(),
});

// POST /api/family-trees/:treeId/documents - Upload document
familyTreesRouter.post('/:treeId/documents', upload.single('document'), async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const data = createDocumentSchema.parse(req.body);

    // Validate personId if provided
    if (data.personId) {
      const person = await prisma.person.findFirst({
        where: { id: data.personId, treeId },
      });

      if (!person) {
        throw new AppError(400, 'Person not found in this tree');
      }
    }

    let documentData: {
      url?: string;
      originalUrl?: string;
      s3Key?: string;
      thumbnailKey?: string;
      fileSize?: number;
      mimeType?: string;
    } = {};

    // Check if file was uploaded
    const file = req.file;
    if (file && isS3Configured()) {
      // Validate file
      const validation = validatePhotoFile({ size: file.size, mimetype: file.mimetype });
      if (!validation.valid) {
        throw new AppError(400, validation.error || 'Invalid file');
      }

      // Upload to S3
      const uploadResult = await uploadPhotoToS3(
        file.buffer,
        file.originalname,
        treeId,
        userId,
        file.mimetype
      );

      documentData = {
        url: uploadResult.thumbnailUrl,
        originalUrl: uploadResult.originalUrl,
        s3Key: uploadResult.key,
        thumbnailKey: uploadResult.thumbnailKey,
        fileSize: uploadResult.size,
        mimeType: file.mimetype,
      };
    } else if (data.url) {
      documentData = { url: data.url };
    }

    const document = await prisma.sourceDocument.create({
      data: {
        treeId,
        personId: data.personId || null,
        title: data.title,
        description: data.description || null,
        documentType: data.documentType,
        url: documentData.url || null,
        originalUrl: documentData.originalUrl || null,
        s3Key: documentData.s3Key || null,
        thumbnailKey: documentData.thumbnailKey || null,
        fileSize: documentData.fileSize || null,
        mimeType: documentData.mimeType || null,
        notes: data.notes || null,
        citation: data.citation || null,
        dateOnDocument: data.dateOnDocument ? new Date(data.dateOnDocument) : null,
        hasWatermark: data.hasWatermark || false,
        status: 'DRAFT',
        uploadedBy: userId,
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/documents - List documents
familyTreesRouter.get('/:treeId/documents', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const {
      personId,
      documentType,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = '50',
      offset = '0',
    } = req.query;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    // Build where clause - use Prisma's SourceDocumentWhereInput type
    const where: {
      treeId: string;
      personId?: string;
      documentType?: 'BIRTH_CERTIFICATE' | 'DEATH_CERTIFICATE' | 'MARRIAGE_CERTIFICATE' | 'DIVORCE_DECREE' | 'CENSUS_RECORD' | 'MILITARY_RECORD' | 'IMMIGRATION_RECORD' | 'NEWSPAPER_ARTICLE' | 'PHOTO' | 'LETTER' | 'WILL' | 'DEED' | 'OTHER';
      status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';
      OR?: Array<{ title?: { contains: string; mode: 'insensitive' }; ocrText?: { contains: string; mode: 'insensitive' }; notes?: { contains: string; mode: 'insensitive' } }>;
    } = { treeId };

    if (personId && typeof personId === 'string') {
      where.personId = personId;
    }

    if (documentType && typeof documentType === 'string') {
      where.documentType = documentType as typeof where.documentType;
    }

    if (status && typeof status === 'string') {
      where.status = status as typeof where.status;
    }

    // Search in title, ocrText, notes
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { ocrText: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Determine sort field
    const validSortFields = ['createdAt', 'title', 'documentType', 'dateOnDocument'];
    const orderField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [documents, total] = await Promise.all([
      prisma.sourceDocument.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        take: Math.min(parseInt(limit as string) || 50, 100),
        skip: parseInt(offset as string) || 0,
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          linkedPersons: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.sourceDocument.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        documents,
        total,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/documents/:documentId - Get single document
familyTreesRouter.get('/:treeId/documents/:documentId', async (req, res, next) => {
  try {
    const { treeId, documentId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        linkedPersons: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/family-trees/:treeId/documents/:documentId - Update document
familyTreesRouter.patch('/:treeId/documents/:documentId', async (req, res, next) => {
  try {
    const { treeId, documentId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Only uploader or admin can edit
    const [membership, tree] = await Promise.all([
      prisma.treeMember.findFirst({
        where: { treeId, userId },
      }),
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { createdBy: true },
      }),
    ]);

    const isOwner = tree?.createdBy === userId;
    if (document.uploadedBy !== userId && !isOwner && membership?.role !== 'ADMIN') {
      throw new AppError(403, 'You can only edit your own documents');
    }

    const data = updateDocumentSchema.parse(req.body);

    // Validate personId if provided
    if (data.personId) {
      const person = await prisma.person.findFirst({
        where: { id: data.personId, treeId },
      });

      if (!person) {
        throw new AppError(400, 'Person not found in this tree');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.documentType !== undefined) updateData.documentType = data.documentType;
    if (data.personId !== undefined) updateData.personId = data.personId || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.citation !== undefined) updateData.citation = data.citation || null;
    if (data.dateOnDocument !== undefined) {
      updateData.dateOnDocument = data.dateOnDocument ? new Date(data.dateOnDocument) : null;
    }
    if (data.hasWatermark !== undefined) updateData.hasWatermark = data.hasWatermark;

    const updatedDocument = await prisma.sourceDocument.update({
      where: { id: documentId },
      data: updateData,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        linkedPersons: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedDocument,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/documents/:documentId - Delete document
familyTreesRouter.delete('/:treeId/documents/:documentId', async (req, res, next) => {
  try {
    const { treeId, documentId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Only uploader or admin can delete
    const [membership, tree] = await Promise.all([
      prisma.treeMember.findFirst({
        where: { treeId, userId },
      }),
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { createdBy: true },
      }),
    ]);

    const isOwner = tree?.createdBy === userId;
    if (document.uploadedBy !== userId && !isOwner && membership?.role !== 'ADMIN') {
      throw new AppError(403, 'You can only delete your own documents');
    }

    // Delete from S3 if keys exist
    if (document.s3Key) {
      await deletePhotoFromS3(document.s3Key, document.thumbnailKey || undefined);
    }

    await prisma.sourceDocument.delete({
      where: { id: documentId },
    });

    res.json({
      success: true,
      message: 'Document deleted',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/documents/:documentId/submit - Submit for approval
familyTreesRouter.post('/:treeId/documents/:documentId/submit', async (req, res, next) => {
  try {
    const { treeId, documentId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    if (document.uploadedBy !== userId) {
      throw new AppError(403, 'Only the uploader can submit for approval');
    }

    if (document.status !== 'DRAFT') {
      throw new AppError(400, 'Document has already been submitted');
    }

    const updatedDocument = await prisma.sourceDocument.update({
      where: { id: documentId },
      data: { status: 'PENDING' },
    });

    res.json({
      success: true,
      data: updatedDocument,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/documents/:documentId/review - Review document (admin)
familyTreesRouter.post('/:treeId/documents/:documentId/review', async (req, res, next) => {
  try {
    const { treeId, documentId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    if (document.status !== 'PENDING') {
      throw new AppError(400, 'Document is not pending review');
    }

    const data = documentReviewSchema.parse(req.body);

    const updatedDocument = await prisma.sourceDocument.update({
      where: { id: documentId },
      data: {
        status: data.status,
        isOfficial: data.isOfficial || false,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNote: data.reviewNote || null,
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedDocument,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/documents/:documentId/download - Download original
familyTreesRouter.get('/:treeId/documents/:documentId/download', async (req, res, next) => {
  try {
    const { treeId, documentId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    if (!document.s3Key) {
      if (document.originalUrl) {
        res.json({
          success: true,
          data: {
            downloadUrl: document.originalUrl,
            expiresIn: null,
            filename: `${document.title}.${document.mimeType?.split('/')[1] || 'pdf'}`,
            fileSize: document.fileSize,
          },
        });
        return;
      }
      throw new AppError(400, 'Original file not available for this document');
    }

    const downloadUrl = await getDownloadUrl(document.s3Key, 3600);

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
        filename: document.s3Key.split('/').pop() || `${document.title}.pdf`,
        fileSize: document.fileSize,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/documents/:documentId/link - Link document to people
familyTreesRouter.post('/:treeId/documents/:documentId/link', async (req, res, next) => {
  try {
    const { treeId, documentId } = req.params;
    const { personIds, role } = req.body;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    if (!Array.isArray(personIds) || personIds.length === 0) {
      throw new AppError(400, 'personIds must be a non-empty array');
    }

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Verify all persons exist in tree
    const persons = await prisma.person.findMany({
      where: { id: { in: personIds }, treeId },
      select: { id: true },
    });

    const foundIds = new Set(persons.map(p => p.id));
    const missingIds = personIds.filter((id: string) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new AppError(400, `Some persons not found in tree: ${missingIds.join(', ')}`);
    }

    // Create links (ignore duplicates)
    await prisma.documentPerson.createMany({
      data: personIds.map((personId: string) => ({
        documentId,
        personId,
        role: role || null,
      })),
      skipDuplicates: true,
    });

    // Fetch updated document with links
    const updatedDocument = await prisma.sourceDocument.findUnique({
      where: { id: documentId },
      include: {
        linkedPersons: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedDocument,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/documents/:documentId/link/:personId - Unlink person
familyTreesRouter.delete('/:treeId/documents/:documentId/link/:personId', async (req, res, next) => {
  try {
    const { treeId, documentId, personId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const document = await prisma.sourceDocument.findFirst({
      where: { id: documentId, treeId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    await prisma.documentPerson.deleteMany({
      where: { documentId, personId },
    });

    res.json({
      success: true,
      message: 'Person unlinked from document',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/documents/pending - Get pending documents for review
familyTreesRouter.get('/:treeId/documents/pending', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    const documents = await prisma.sourceDocument.findMany({
      where: { treeId, status: 'PENDING' },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Family Story Endpoints
// ==========================================

const STORY_MAX_LENGTH = 5000;

// Validation schemas for stories
const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(STORY_MAX_LENGTH),
  excerpt: z.string().max(500).optional(),
  personId: z.string().optional(),
  storyDate: z.string().optional(),
  location: z.string().max(200).optional(),
  coverImage: z.string().url().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED']).optional(),
  isPublic: z.boolean().optional(),
});

const updateStorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(STORY_MAX_LENGTH).optional(),
  excerpt: z.string().max(500).optional(),
  personId: z.string().nullable().optional(),
  storyDate: z.string().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

// Helper to generate excerpt from content
function generateExcerpt(content: string, maxLength = 200): string {
  // Strip HTML tags if any
  const text = content.replace(/<[^>]*>/g, '');
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// POST /api/family-trees/:treeId/stories - Create a new story
familyTreesRouter.post('/:treeId/stories', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const data = createStorySchema.parse(req.body);

    // Validate personId if provided
    if (data.personId) {
      const person = await prisma.person.findFirst({
        where: { id: data.personId, treeId },
      });
      if (!person) {
        throw new AppError(400, 'Person not found in this tree');
      }
    }

    // Generate excerpt if not provided
    const excerpt = data.excerpt || generateExcerpt(data.content);

    // Determine if this needs approval (stories about living people)
    let status: 'DRAFT' | 'PENDING' | 'PUBLISHED' = data.status || 'DRAFT';
    if (data.personId && status === 'PUBLISHED') {
      const person = await prisma.person.findUnique({
        where: { id: data.personId },
        select: { isLiving: true },
      });
      if (person?.isLiving) {
        // Stories about living people need admin approval
        const membership = await prisma.treeMember.findFirst({
          where: { treeId, userId },
        });
        const tree = await prisma.familyTree.findUnique({
          where: { id: treeId },
          select: { createdBy: true },
        });
        const isAdmin = membership?.role === 'ADMIN' || tree?.createdBy === userId;
        if (!isAdmin) {
          status = 'PENDING';
        }
      }
    }

    const story = await prisma.familyStory.create({
      data: {
        treeId,
        authorId: userId,
        personId: data.personId || null,
        title: data.title,
        content: data.content,
        excerpt,
        storyDate: data.storyDate ? new Date(data.storyDate) : null,
        location: data.location || null,
        coverImage: data.coverImage || null,
        status,
        isPublic: data.isPublic ?? false,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        linkedPersons: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: story,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/stories - List stories
familyTreesRouter.get('/:treeId/stories', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const {
      personId,
      status,
      authorId,
      featured,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = '20',
      offset = '0',
    } = req.query;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    // Check if user is admin
    const membership = await prisma.treeMember.findFirst({
      where: { treeId, userId },
    });
    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { createdBy: true },
    });
    const isAdmin = membership?.role === 'ADMIN' || tree?.createdBy === userId;

    // Build where clause - use 'any' to allow flexible Prisma query building
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { treeId };

    if (personId && typeof personId === 'string') {
      where.personId = personId;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    } else if (!isAdmin) {
      // Non-admins can only see published stories or their own
      where.OR = [
        { status: 'PUBLISHED' },
        { authorId: userId },
      ];
    }

    if (authorId && typeof authorId === 'string') {
      where.authorId = authorId;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    // Search in title and content - combine with existing OR using AND
    if (search && typeof search === 'string') {
      const searchOr = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
      if (where.OR) {
        // Combine with existing OR using AND
        where.AND = [
          { OR: where.OR },
          { OR: searchOr },
        ];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    // Determine sort field
    const validSortFields = ['createdAt', 'publishedAt', 'title', 'viewCount'];
    const orderField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [stories, total] = await Promise.all([
      prisma.familyStory.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        take: Math.min(parseInt(limit as string) || 20, 50),
        skip: parseInt(offset as string) || 0,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          linkedPersons: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.familyStory.count({ where }),
    ]);

    // Check which stories the current user has liked
    const likedStoryIds = await prisma.storyLike.findMany({
      where: {
        storyId: { in: stories.map(s => s.id) },
        userId,
      },
      select: { storyId: true },
    });
    const likedSet = new Set(likedStoryIds.map(l => l.storyId));

    const storiesWithLikeStatus = stories.map(story => ({
      ...story,
      isLikedByMe: likedSet.has(story.id),
    }));

    res.json({
      success: true,
      data: {
        stories: storiesWithLikeStatus,
        total,
        limit: parseInt(limit as string) || 20,
        offset: parseInt(offset as string) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/stories/:storyId - Get single story
familyTreesRouter.get('/:treeId/stories/:storyId', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            isLiving: true,
          },
        },
        linkedPersons: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!story) {
      throw new AppError(404, 'Story not found');
    }

    // Check access - only published stories or own stories visible to non-admins
    const membership = await prisma.treeMember.findFirst({
      where: { treeId, userId },
    });
    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { createdBy: true },
    });
    const isAdmin = membership?.role === 'ADMIN' || tree?.createdBy === userId;
    const isAuthor = story.authorId === userId;

    if (story.status !== 'PUBLISHED' && !isAdmin && !isAuthor) {
      throw new AppError(403, 'Story not accessible');
    }

    // Increment view count
    await prisma.familyStory.update({
      where: { id: storyId },
      data: { viewCount: { increment: 1 } },
    });

    // Check if user has liked this story
    const like = await prisma.storyLike.findUnique({
      where: {
        storyId_userId: { storyId, userId },
      },
    });

    res.json({
      success: true,
      data: {
        ...story,
        isLikedByMe: !!like,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/family-trees/:treeId/stories/:storyId - Update story
familyTreesRouter.patch('/:treeId/stories/:storyId', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId },
    });

    if (!story) {
      throw new AppError(404, 'Story not found');
    }

    // Only author or admin can edit
    const [membership, tree] = await Promise.all([
      prisma.treeMember.findFirst({
        where: { treeId, userId },
      }),
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { createdBy: true },
      }),
    ]);

    const isOwner = tree?.createdBy === userId;
    const isAdmin = membership?.role === 'ADMIN' || isOwner;

    if (story.authorId !== userId && !isAdmin) {
      throw new AppError(403, 'You can only edit your own stories');
    }

    const data = updateStorySchema.parse(req.body);

    // Validate personId if provided
    if (data.personId) {
      const person = await prisma.person.findFirst({
        where: { id: data.personId, treeId },
      });
      if (!person) {
        throw new AppError(400, 'Person not found in this tree');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) {
      updateData.content = data.content;
      // Regenerate excerpt if content changes
      updateData.excerpt = data.excerpt || generateExcerpt(data.content);
    }
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.personId !== undefined) updateData.personId = data.personId;
    if (data.storyDate !== undefined) {
      updateData.storyDate = data.storyDate ? new Date(data.storyDate) : null;
    }
    if (data.location !== undefined) updateData.location = data.location;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    // Only admins can set featured
    if (data.isFeatured !== undefined && isAdmin) {
      updateData.isFeatured = data.isFeatured;
    }

    const updatedStory = await prisma.familyStory.update({
      where: { id: storyId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        linkedPersons: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedStory,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/stories/:storyId - Delete story
familyTreesRouter.delete('/:treeId/stories/:storyId', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId },
    });

    if (!story) {
      throw new AppError(404, 'Story not found');
    }

    // Only author or admin can delete
    const [membership, tree] = await Promise.all([
      prisma.treeMember.findFirst({
        where: { treeId, userId },
      }),
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { createdBy: true },
      }),
    ]);

    const isOwner = tree?.createdBy === userId;
    if (story.authorId !== userId && !isOwner && membership?.role !== 'ADMIN') {
      throw new AppError(403, 'You can only delete your own stories');
    }

    await prisma.familyStory.delete({
      where: { id: storyId },
    });

    res.json({
      success: true,
      message: 'Story deleted',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/stories/:storyId/publish - Publish story
familyTreesRouter.post('/:treeId/stories/:storyId/publish', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId },
      include: {
        person: {
          select: { isLiving: true },
        },
      },
    });

    if (!story) {
      throw new AppError(404, 'Story not found');
    }

    if (story.authorId !== userId) {
      throw new AppError(403, 'You can only publish your own stories');
    }

    if (story.status === 'PUBLISHED') {
      throw new AppError(400, 'Story is already published');
    }

    // Check if approval is needed for living members
    const [membership, tree] = await Promise.all([
      prisma.treeMember.findFirst({
        where: { treeId, userId },
      }),
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { createdBy: true },
      }),
    ]);

    const isAdmin = membership?.role === 'ADMIN' || tree?.createdBy === userId;
    let newStatus: 'PENDING' | 'PUBLISHED' = 'PUBLISHED';

    if (story.person?.isLiving && !isAdmin) {
      newStatus = 'PENDING';
    }

    const updatedStory = await prisma.familyStory.update({
      where: { id: storyId },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'PUBLISHED' ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedStory,
      message: newStatus === 'PENDING'
        ? 'Story submitted for approval (contains living person)'
        : 'Story published',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/stories/:storyId/review - Admin review story
familyTreesRouter.post('/:treeId/stories/:storyId/review', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const { action } = req.body;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    if (!action || !['approve', 'reject'].includes(action)) {
      throw new AppError(400, 'Invalid action. Must be "approve" or "reject"');
    }

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId, status: 'PENDING' },
    });

    if (!story) {
      throw new AppError(404, 'Story not found or not pending review');
    }

    const newStatus = action === 'approve' ? 'PUBLISHED' : 'REJECTED';

    const updatedStory = await prisma.familyStory.update({
      where: { id: storyId },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'PUBLISHED' ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedStory,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/stories/:storyId/like - Like/unlike story
familyTreesRouter.post('/:treeId/stories/:storyId/like', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId },
    });

    if (!story) {
      throw new AppError(404, 'Story not found');
    }

    // Check if already liked
    const existingLike = await prisma.storyLike.findUnique({
      where: {
        storyId_userId: { storyId, userId },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.storyLike.delete({
        where: { id: existingLike.id },
      });

      const count = await prisma.storyLike.count({ where: { storyId } });

      res.json({
        success: true,
        data: { liked: false, likeCount: count },
      });
    } else {
      // Like
      await prisma.storyLike.create({
        data: { storyId, userId },
      });

      const count = await prisma.storyLike.count({ where: { storyId } });

      res.json({
        success: true,
        data: { liked: true, likeCount: count },
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/stories/:storyId/comments - Add comment
familyTreesRouter.post('/:treeId/stories/:storyId/comments', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId },
    });

    if (!story) {
      throw new AppError(404, 'Story not found');
    }

    const data = addCommentSchema.parse(req.body);

    // Validate parent comment if provided
    if (data.parentId) {
      const parentComment = await prisma.storyComment.findFirst({
        where: { id: data.parentId, storyId },
      });
      if (!parentComment) {
        throw new AppError(400, 'Parent comment not found');
      }
    }

    const comment = await prisma.storyComment.create({
      data: {
        storyId,
        authorId: userId,
        content: data.content,
        parentId: data.parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/stories/:storyId/comments/:commentId - Delete comment
familyTreesRouter.delete('/:treeId/stories/:storyId/comments/:commentId', async (req, res, next) => {
  try {
    const { treeId, storyId, commentId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId);

    const comment = await prisma.storyComment.findFirst({
      where: { id: commentId, storyId },
    });

    if (!comment) {
      throw new AppError(404, 'Comment not found');
    }

    // Only author or admin can delete
    const [membership, tree] = await Promise.all([
      prisma.treeMember.findFirst({
        where: { treeId, userId },
      }),
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { createdBy: true },
      }),
    ]);

    const isOwner = tree?.createdBy === userId;
    if (comment.authorId !== userId && !isOwner && membership?.role !== 'ADMIN') {
      throw new AppError(403, 'You can only delete your own comments');
    }

    await prisma.storyComment.delete({
      where: { id: commentId },
    });

    res.json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/stories/:storyId/link - Link people to story
familyTreesRouter.post('/:treeId/stories/:storyId/link', async (req, res, next) => {
  try {
    const { treeId, storyId } = req.params;
    const { personIds, roles } = req.body;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const story = await prisma.familyStory.findFirst({
      where: { id: storyId, treeId },
    });

    if (!story) {
      throw new AppError(404, 'Story not found');
    }

    // Only author or admin can link
    const [membership, tree] = await Promise.all([
      prisma.treeMember.findFirst({
        where: { treeId, userId },
      }),
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { createdBy: true },
      }),
    ]);

    const isOwner = tree?.createdBy === userId;
    if (story.authorId !== userId && !isOwner && membership?.role !== 'ADMIN') {
      throw new AppError(403, 'You can only modify links on your own stories');
    }

    if (!Array.isArray(personIds)) {
      throw new AppError(400, 'personIds must be an array');
    }

    // Validate all person IDs
    const people = await prisma.person.findMany({
      where: { id: { in: personIds }, treeId },
      select: { id: true },
    });

    const validIds = new Set(people.map(p => p.id));
    const invalidIds = personIds.filter((id: string) => !validIds.has(id));

    if (invalidIds.length > 0) {
      throw new AppError(400, `Invalid person IDs: ${invalidIds.join(', ')}`);
    }

    // Delete existing links
    await prisma.storyPerson.deleteMany({
      where: { storyId },
    });

    // Create new links
    if (personIds.length > 0) {
      await prisma.storyPerson.createMany({
        data: personIds.map((personId: string) => ({
          storyId,
          personId,
          role: roles?.[personId] || null,
        })),
      });
    }

    // Fetch updated story
    const updatedStory = await prisma.familyStory.findUnique({
      where: { id: storyId },
      include: {
        linkedPersons: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedStory,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/stories/pending - Get pending stories for review
familyTreesRouter.get('/:treeId/stories/pending', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    const stories = await prisma.familyStory.findMany({
      where: { treeId, status: 'PENDING' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isLiving: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Duplicate Detection & Merge
// ==========================================

// Duplicate detection scoring algorithm
function calculateSimilarityScore(person1: {
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
}, person2: {
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Normalize strings for comparison
  const normalize = (str: string | null | undefined) => (str || '').toLowerCase().trim();
  const levenshtein = (a: string, b: string): number => {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  };
  const stringSimilarity = (a: string, b: string): number => {
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
  };

  // First name comparison (weight: 30)
  const fn1 = normalize(person1.firstName);
  const fn2 = normalize(person2.firstName);
  if (fn1 === fn2) {
    score += 30;
    reasons.push('Exact first name match');
  } else if (stringSimilarity(fn1, fn2) > 0.8) {
    score += 20;
    reasons.push('Similar first name');
  } else if (fn1.charAt(0) === fn2.charAt(0)) {
    score += 5;
    reasons.push('First name initial match');
  }

  // Last name comparison (weight: 30)
  const ln1 = normalize(person1.lastName);
  const ln2 = normalize(person2.lastName);
  if (ln1 === ln2) {
    score += 30;
    reasons.push('Exact last name match');
  } else if (stringSimilarity(ln1, ln2) > 0.8) {
    score += 20;
    reasons.push('Similar last name');
  }

  // Maiden name comparison (weight: 10)
  const mn1 = normalize(person1.maidenName);
  const mn2 = normalize(person2.maidenName);
  if (mn1 && mn2 && mn1 === mn2) {
    score += 10;
    reasons.push('Exact maiden name match');
  } else if (mn1 && ln2 && mn1 === ln2) {
    score += 8;
    reasons.push('Maiden name matches other last name');
  } else if (mn2 && ln1 && mn2 === ln1) {
    score += 8;
    reasons.push('Maiden name matches other last name');
  }

  // Birth date comparison (weight: 20)
  if (person1.birthDate && person2.birthDate) {
    const d1 = new Date(person1.birthDate);
    const d2 = new Date(person2.birthDate);
    const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      score += 20;
      reasons.push('Exact birth date match');
    } else if (diffDays <= 365) {
      score += 10;
      reasons.push('Birth year match');
    } else if (d1.getFullYear() === d2.getFullYear()) {
      score += 10;
      reasons.push('Birth year match');
    }
  }

  // Birth place comparison (weight: 10)
  const bp1 = normalize(person1.birthPlace);
  const bp2 = normalize(person2.birthPlace);
  if (bp1 && bp2) {
    if (bp1 === bp2) {
      score += 10;
      reasons.push('Exact birth place match');
    } else if (bp1.includes(bp2) || bp2.includes(bp1)) {
      score += 5;
      reasons.push('Similar birth place');
    }
  }

  return { score, reasons };
}

// GET /api/family-trees/:treeId/duplicates - Detect potential duplicates
familyTreesRouter.get('/:treeId/duplicates', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const { minScore = '60' } = req.query;
    const minScoreNum = parseInt(minScore as string, 10);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    // Get all people in the tree
    const people = await prisma.person.findMany({
      where: { treeId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        maidenName: true,
        nickname: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        deathDate: true,
        deathPlace: true,
        isLiving: true,
        profilePhoto: true,
        generation: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Find duplicate pairs
    const duplicates: Array<{
      person1: typeof people[0];
      person2: typeof people[0];
      score: number;
      reasons: string[];
    }> = [];

    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const { score, reasons } = calculateSimilarityScore(people[i], people[j]);
        if (score >= minScoreNum) {
          duplicates.push({
            person1: people[i],
            person2: people[j],
            score,
            reasons,
          });
        }
      }
    }

    // Sort by score descending
    duplicates.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: {
        duplicates,
        total: duplicates.length,
        minScoreUsed: minScoreNum,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/people/:personId/merge-preview/:targetPersonId
// Preview what a merge would look like
familyTreesRouter.get('/:treeId/people/:personId/merge-preview/:targetPersonId', async (req, res, next) => {
  try {
    const { treeId, personId, targetPersonId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    // Get both persons with all their data
    const [person1, person2] = await Promise.all([
      prisma.person.findFirst({
        where: { id: personId, treeId },
        include: {
          relationshipsFrom: { include: { personTo: { select: { id: true, firstName: true, lastName: true } } } },
          relationshipsTo: { include: { personFrom: { select: { id: true, firstName: true, lastName: true } } } },
          marriages: { include: { spouses: { select: { id: true, firstName: true, lastName: true } } } },
          photos: { select: { id: true, url: true, caption: true } },
          photoTags: { select: { id: true, photo: { select: { id: true, url: true } } } },
          documents: { select: { id: true, title: true, documentType: true } },
          documentLinks: { select: { id: true, document: { select: { id: true, title: true } } } },
          stories: { select: { id: true, title: true } },
          storyLinks: { select: { id: true, story: { select: { id: true, title: true } } } },
          linkedMember: { select: { id: true, userId: true, user: { select: { name: true, email: true } } } },
        },
      }),
      prisma.person.findFirst({
        where: { id: targetPersonId, treeId },
        include: {
          relationshipsFrom: { include: { personTo: { select: { id: true, firstName: true, lastName: true } } } },
          relationshipsTo: { include: { personFrom: { select: { id: true, firstName: true, lastName: true } } } },
          marriages: { include: { spouses: { select: { id: true, firstName: true, lastName: true } } } },
          photos: { select: { id: true, url: true, caption: true } },
          photoTags: { select: { id: true, photo: { select: { id: true, url: true } } } },
          documents: { select: { id: true, title: true, documentType: true } },
          documentLinks: { select: { id: true, document: { select: { id: true, title: true } } } },
          stories: { select: { id: true, title: true } },
          storyLinks: { select: { id: true, story: { select: { id: true, title: true } } } },
          linkedMember: { select: { id: true, userId: true, user: { select: { name: true, email: true } } } },
        },
      }),
    ]);

    if (!person1 || !person2) {
      return res.status(404).json({ success: false, error: 'One or both persons not found' });
    }

    // Calculate similarity
    const { score, reasons } = calculateSimilarityScore(person1, person2);

    // Build field comparison
    const fieldComparison = {
      firstName: { person1: person1.firstName, person2: person2.firstName, recommended: person1.firstName },
      middleName: { person1: person1.middleName, person2: person2.middleName, recommended: person1.middleName || person2.middleName },
      lastName: { person1: person1.lastName, person2: person2.lastName, recommended: person1.lastName },
      maidenName: { person1: person1.maidenName, person2: person2.maidenName, recommended: person1.maidenName || person2.maidenName },
      nickname: { person1: person1.nickname, person2: person2.nickname, recommended: person1.nickname || person2.nickname },
      birthDate: { person1: person1.birthDate, person2: person2.birthDate, recommended: person1.birthDate || person2.birthDate },
      birthPlace: { person1: person1.birthPlace, person2: person2.birthPlace, recommended: person1.birthPlace || person2.birthPlace },
      deathDate: { person1: person1.deathDate, person2: person2.deathDate, recommended: person1.deathDate || person2.deathDate },
      deathPlace: { person1: person1.deathPlace, person2: person2.deathPlace, recommended: person1.deathPlace || person2.deathPlace },
      biography: { person1: person1.biography, person2: person2.biography, recommended: person1.biography || person2.biography },
      occupation: { person1: person1.occupation, person2: person2.occupation, recommended: person1.occupation || person2.occupation },
      education: { person1: person1.education, person2: person2.education, recommended: person1.education || person2.education },
      profilePhoto: { person1: person1.profilePhoto, person2: person2.profilePhoto, recommended: person1.profilePhoto || person2.profilePhoto },
    };

    // Count relationships and assets
    const relationshipsSummary = {
      person1: {
        parents: person1.relationshipsTo.filter(r => ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT', 'GUARDIAN'].includes(r.relationshipType)).length,
        children: person1.relationshipsFrom.filter(r => ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT', 'GUARDIAN'].includes(r.relationshipType)).length,
        siblings: person1.relationshipsFrom.filter(r => r.relationshipType === 'SIBLING').length + person1.relationshipsTo.filter(r => r.relationshipType === 'SIBLING').length,
        spouses: person1.marriages.length,
      },
      person2: {
        parents: person2.relationshipsTo.filter(r => ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT', 'GUARDIAN'].includes(r.relationshipType)).length,
        children: person2.relationshipsFrom.filter(r => ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT', 'GUARDIAN'].includes(r.relationshipType)).length,
        siblings: person2.relationshipsFrom.filter(r => r.relationshipType === 'SIBLING').length + person2.relationshipsTo.filter(r => r.relationshipType === 'SIBLING').length,
        spouses: person2.marriages.length,
      },
    };

    const assetsSummary = {
      person1: {
        photos: person1.photos.length + person1.photoTags.length,
        documents: person1.documents.length + person1.documentLinks.length,
        stories: person1.stories.length + person1.storyLinks.length,
      },
      person2: {
        photos: person2.photos.length + person2.photoTags.length,
        documents: person2.documents.length + person2.documentLinks.length,
        stories: person2.stories.length + person2.storyLinks.length,
      },
    };

    // Check for linked members
    const linkedMembers = {
      person1: person1.linkedMember,
      person2: person2.linkedMember,
    };

    res.json({
      success: true,
      data: {
        person1,
        person2,
        similarityScore: score,
        similarityReasons: reasons,
        fieldComparison,
        relationshipsSummary,
        assetsSummary,
        linkedMembers,
        warnings: [
          ...(linkedMembers.person1 ? [`${person1.firstName} ${person1.lastName} is linked to user account: ${linkedMembers.person1.user.email}`] : []),
          ...(linkedMembers.person2 ? [`${person2.firstName} ${person2.lastName} is linked to user account: ${linkedMembers.person2.user.email}`] : []),
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Merge validation schema
const mergePersonsSchema = z.object({
  primaryPersonId: z.string().min(1),
  mergedPersonId: z.string().min(1),
  fieldSelections: z.record(z.enum(['primary', 'merged'])).optional(),
});

// POST /api/family-trees/:treeId/people/merge - Merge two persons
familyTreesRouter.post('/:treeId/people/merge', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const body = mergePersonsSchema.parse(req.body);
    const userId = getUserId(req);

    const tree = await checkTreeAccess(treeId, userId, 'ADMIN');
    // Get member info for the current user
    const member = tree.members[0];

    const { primaryPersonId, mergedPersonId, fieldSelections = {} } = body;

    if (primaryPersonId === mergedPersonId) {
      return res.status(400).json({ success: false, error: 'Cannot merge a person with themselves' });
    }

    // Get both persons with full data
    const [primaryPerson, mergedPerson] = await Promise.all([
      prisma.person.findFirst({
        where: { id: primaryPersonId, treeId },
        include: {
          relationshipsFrom: true,
          relationshipsTo: true,
          marriages: true,
        },
      }),
      prisma.person.findFirst({
        where: { id: mergedPersonId, treeId },
        include: {
          relationshipsFrom: true,
          relationshipsTo: true,
          marriages: true,
          photos: true,
          photoTags: true,
          documents: true,
          documentLinks: true,
          stories: true,
          storyLinks: true,
          linkedMember: true,
        },
      }),
    ]);

    if (!primaryPerson || !mergedPerson) {
      return res.status(404).json({ success: false, error: 'One or both persons not found' });
    }

    // Can't merge if merged person is linked to a user
    if (mergedPerson.linkedMember) {
      return res.status(400).json({
        success: false,
        error: 'Cannot merge: the person to be removed is linked to a user account. Unlink them first.',
      });
    }

    // Build update data based on field selections
    const updateData: Record<string, unknown> = {};
    const mergeableFields = [
      'firstName', 'middleName', 'lastName', 'maidenName', 'nickname',
      'birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'isLiving',
      'biography', 'occupation', 'education', 'profilePhoto',
    ];

    for (const field of mergeableFields) {
      if (fieldSelections[field] === 'merged') {
        // Use value from merged person
        updateData[field] = (mergedPerson as Record<string, unknown>)[field];
      } else if (fieldSelections[field] !== 'primary') {
        // Default: use primary value, but fill in nulls from merged
        const primaryValue = (primaryPerson as Record<string, unknown>)[field];
        const mergedValue = (mergedPerson as Record<string, unknown>)[field];
        if (primaryValue === null || primaryValue === undefined) {
          updateData[field] = mergedValue;
        }
      }
    }

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store backup data for undo
    const mergedPersonData = { ...mergedPerson, relationshipsFrom: undefined, relationshipsTo: undefined, marriages: undefined };
    const transferredRelations = mergedPerson.relationshipsFrom.concat(mergedPerson.relationshipsTo);
    const transferredMarriages = mergedPerson.marriages;
    const transferredPhotos = mergedPerson.photos.map(p => p.id);
    const transferredDocuments = mergedPerson.documents.map(d => d.id);
    const transferredStories = mergedPerson.stories.map(s => s.id);

    // Perform the merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update primary person with selected fields
      if (Object.keys(updateData).length > 0) {
        await tx.person.update({
          where: { id: primaryPersonId },
          data: updateData,
        });
      }

      // 2. Transfer relationships from merged person
      // For relationships where merged person is "from"
      for (const rel of mergedPerson.relationshipsFrom) {
        if (rel.personToId === primaryPersonId) {
          // Skip relationships to the primary person (would be circular)
          await tx.relationship.delete({ where: { id: rel.id } });
        } else {
          // Check if this relationship already exists on primary
          const existing = await tx.relationship.findFirst({
            where: {
              treeId,
              personFromId: primaryPersonId,
              personToId: rel.personToId,
              relationshipType: rel.relationshipType,
            },
          });
          if (!existing) {
            // Update to point from primary person
            await tx.relationship.update({
              where: { id: rel.id },
              data: { personFromId: primaryPersonId },
            });
          } else {
            // Duplicate, delete
            await tx.relationship.delete({ where: { id: rel.id } });
          }
        }
      }

      // For relationships where merged person is "to"
      for (const rel of mergedPerson.relationshipsTo) {
        if (rel.personFromId === primaryPersonId) {
          // Skip relationships from the primary person
          await tx.relationship.delete({ where: { id: rel.id } });
        } else {
          // Check if this relationship already exists on primary
          const existing = await tx.relationship.findFirst({
            where: {
              treeId,
              personFromId: rel.personFromId,
              personToId: primaryPersonId,
              relationshipType: rel.relationshipType,
            },
          });
          if (!existing) {
            await tx.relationship.update({
              where: { id: rel.id },
              data: { personToId: primaryPersonId },
            });
          } else {
            await tx.relationship.delete({ where: { id: rel.id } });
          }
        }
      }

      // 3. Transfer marriages
      for (const marriage of mergedPerson.marriages) {
        // Disconnect merged person from marriage
        await tx.marriage.update({
          where: { id: marriage.id },
          data: {
            spouses: {
              disconnect: { id: mergedPersonId },
              connect: { id: primaryPersonId },
            },
          },
        });
      }

      // 4. Transfer photos (owned by merged person)
      await tx.treePhoto.updateMany({
        where: { id: { in: transferredPhotos } },
        data: { personId: primaryPersonId },
      });

      // 5. Transfer photo tags
      for (const tag of mergedPerson.photoTags) {
        const existingTag = await tx.photoTag.findFirst({
          where: { photoId: tag.photoId, personId: primaryPersonId },
        });
        if (!existingTag) {
          await tx.photoTag.update({
            where: { id: tag.id },
            data: { personId: primaryPersonId },
          });
        } else {
          await tx.photoTag.delete({ where: { id: tag.id } });
        }
      }

      // 6. Transfer documents
      await tx.sourceDocument.updateMany({
        where: { id: { in: transferredDocuments } },
        data: { personId: primaryPersonId },
      });

      // 7. Transfer document links
      for (const link of mergedPerson.documentLinks) {
        const existingLink = await tx.documentPerson.findFirst({
          where: { documentId: link.documentId, personId: primaryPersonId },
        });
        if (!existingLink) {
          await tx.documentPerson.update({
            where: { id: link.id },
            data: { personId: primaryPersonId },
          });
        } else {
          await tx.documentPerson.delete({ where: { id: link.id } });
        }
      }

      // 8. Transfer stories
      await tx.familyStory.updateMany({
        where: { id: { in: transferredStories } },
        data: { personId: primaryPersonId },
      });

      // 9. Transfer story links
      for (const link of mergedPerson.storyLinks) {
        const existingLink = await tx.storyPerson.findFirst({
          where: { storyId: link.storyId, personId: primaryPersonId },
        });
        if (!existingLink) {
          await tx.storyPerson.update({
            where: { id: link.id },
            data: { personId: primaryPersonId },
          });
        } else {
          await tx.storyPerson.delete({ where: { id: link.id } });
        }
      }

      // 10. Transfer suggestions
      await tx.suggestion.updateMany({
        where: { personId: mergedPersonId },
        data: { personId: primaryPersonId },
      });

      // 11. Create merge history record
      const mergeRecord = await tx.personMerge.create({
        data: {
          treeId,
          primaryPersonId,
          mergedPersonId,
          performedById: member.userId,
          mergedPersonData,
          transferredRelations,
          transferredMarriages,
          transferredPhotos,
          transferredDocuments,
          transferredStories,
          fieldSelections,
          expiresAt,
        },
      });

      // 12. Delete the merged person
      await tx.person.delete({ where: { id: mergedPersonId } });

      return mergeRecord;
    });

    // Get updated primary person
    const updatedPerson = await prisma.person.findUnique({
      where: { id: primaryPersonId },
      include: {
        relationshipsFrom: { include: { personTo: { select: { id: true, firstName: true, lastName: true } } } },
        relationshipsTo: { include: { personFrom: { select: { id: true, firstName: true, lastName: true } } } },
        marriages: { include: { spouses: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    res.json({
      success: true,
      data: {
        mergeId: result.id,
        primaryPerson: updatedPerson,
        mergedPersonName: `${mergedPerson.firstName} ${mergedPerson.lastName}`,
        canRevertUntil: result.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid request', details: error.errors });
    }
    next(error);
  }
});

// GET /api/family-trees/:treeId/merges - Get merge history
familyTreesRouter.get('/:treeId/merges', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const { status } = req.query;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'ADMIN');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { treeId };
    if (status) {
      where.status = status;
    }

    const merges = await prisma.personMerge.findMany({
      where,
      include: {
        performedBy: { select: { id: true, name: true, avatarUrl: true } },
        revertedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check for expired merges and update status
    const now = new Date();
    for (const merge of merges) {
      if (merge.status === 'COMPLETED' && merge.expiresAt < now) {
        await prisma.personMerge.update({
          where: { id: merge.id },
          data: { status: 'EXPIRED' },
        });
        merge.status = 'EXPIRED';
      }
    }

    res.json({
      success: true,
      data: merges,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/merges/:mergeId/revert - Revert a merge
familyTreesRouter.post('/:treeId/merges/:mergeId/revert', async (req, res, next) => {
  try {
    const { treeId, mergeId } = req.params;
    const userId = getUserId(req);

    const tree = await checkTreeAccess(treeId, userId, 'ADMIN');
    const member = tree.members[0];

    const merge = await prisma.personMerge.findFirst({
      where: { id: mergeId, treeId },
    });

    if (!merge) {
      return res.status(404).json({ success: false, error: 'Merge record not found' });
    }

    if (merge.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: merge.status === 'REVERTED' ? 'Merge has already been reverted' : 'Merge has expired and cannot be reverted',
      });
    }

    if (new Date() > merge.expiresAt) {
      await prisma.personMerge.update({
        where: { id: mergeId },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ success: false, error: 'Merge has expired and cannot be reverted' });
    }

    // Restore the merge in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Recreate the merged person
      const mergedData = merge.mergedPersonData as Record<string, unknown>;
      const recreatedPerson = await tx.person.create({
        data: {
          id: merge.mergedPersonId, // Keep the original ID
          treeId: merge.treeId,
          firstName: mergedData.firstName as string,
          middleName: mergedData.middleName as string | null,
          lastName: mergedData.lastName as string,
          maidenName: mergedData.maidenName as string | null,
          suffix: mergedData.suffix as string | null,
          nickname: mergedData.nickname as string | null,
          gender: mergedData.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN',
          birthDate: mergedData.birthDate ? new Date(mergedData.birthDate as string) : null,
          birthPlace: mergedData.birthPlace as string | null,
          deathDate: mergedData.deathDate ? new Date(mergedData.deathDate as string) : null,
          deathPlace: mergedData.deathPlace as string | null,
          isLiving: mergedData.isLiving as boolean,
          biography: mergedData.biography as string | null,
          occupation: mergedData.occupation as string | null,
          education: mergedData.education as string | null,
          privacy: mergedData.privacy as 'PUBLIC' | 'FAMILY_ONLY' | 'PRIVATE',
          profilePhoto: mergedData.profilePhoto as string | null,
          positionX: mergedData.positionX as number | null,
          positionY: mergedData.positionY as number | null,
          generation: mergedData.generation as number,
        },
      });

      // 2. Restore relationships
      const transferredRelations = merge.transferredRelations as Array<{
        id: string;
        treeId: string;
        personFromId: string;
        personToId: string;
        relationshipType: string;
        notes: string | null;
        birthOrder: number | null;
      }>;

      for (const rel of transferredRelations) {
        // Check if relationship was on the merged person
        const wasMergedFrom = rel.personFromId === merge.mergedPersonId;
        const wasMergedTo = rel.personToId === merge.mergedPersonId;

        if (wasMergedFrom || wasMergedTo) {
          // Find the relationship on the primary person
          const currentRel = await tx.relationship.findFirst({
            where: {
              treeId,
              personFromId: wasMergedFrom ? merge.primaryPersonId : rel.personFromId,
              personToId: wasMergedTo ? merge.primaryPersonId : rel.personToId,
              relationshipType: rel.relationshipType as 'PARENT' | 'CHILD' | 'SIBLING' | 'SPOUSE' | 'ADOPTIVE_PARENT' | 'ADOPTIVE_CHILD' | 'STEP_PARENT' | 'STEP_CHILD' | 'FOSTER_PARENT' | 'FOSTER_CHILD' | 'GUARDIAN' | 'WARD',
            },
          });

          if (currentRel) {
            // Update back to point to merged person
            await tx.relationship.update({
              where: { id: currentRel.id },
              data: {
                personFromId: wasMergedFrom ? merge.mergedPersonId : currentRel.personFromId,
                personToId: wasMergedTo ? merge.mergedPersonId : currentRel.personToId,
              },
            });
          } else {
            // Recreate the relationship
            await tx.relationship.create({
              data: {
                treeId,
                personFromId: rel.personFromId,
                personToId: rel.personToId,
                relationshipType: rel.relationshipType as 'PARENT' | 'CHILD' | 'SIBLING' | 'SPOUSE' | 'ADOPTIVE_PARENT' | 'ADOPTIVE_CHILD' | 'STEP_PARENT' | 'STEP_CHILD' | 'FOSTER_PARENT' | 'FOSTER_CHILD' | 'GUARDIAN' | 'WARD',
                notes: rel.notes,
                birthOrder: rel.birthOrder,
              },
            });
          }
        }
      }

      // 3. Restore marriages
      const transferredMarriages = merge.transferredMarriages as Array<{ id: string }>;
      for (const marriage of transferredMarriages) {
        await tx.marriage.update({
          where: { id: marriage.id },
          data: {
            spouses: {
              disconnect: { id: merge.primaryPersonId },
              connect: { id: merge.mergedPersonId },
            },
          },
        });
      }

      // 4. Restore photos
      const transferredPhotos = merge.transferredPhotos as string[];
      await tx.treePhoto.updateMany({
        where: { id: { in: transferredPhotos } },
        data: { personId: merge.mergedPersonId },
      });

      // 5. Restore documents
      const transferredDocuments = merge.transferredDocuments as string[];
      await tx.sourceDocument.updateMany({
        where: { id: { in: transferredDocuments } },
        data: { personId: merge.mergedPersonId },
      });

      // 6. Restore stories
      const transferredStories = merge.transferredStories as string[];
      await tx.familyStory.updateMany({
        where: { id: { in: transferredStories } },
        data: { personId: merge.mergedPersonId },
      });

      // 7. Update merge record
      await tx.personMerge.update({
        where: { id: mergeId },
        data: {
          status: 'REVERTED',
          revertedAt: new Date(),
          revertedById: member.userId,
        },
      });

      return recreatedPerson;
    });

    res.json({
      success: true,
      data: {
        message: 'Merge successfully reverted',
        restoredPersonId: merge.mergedPersonId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Tree Statistics
// ==========================================

interface PersonStats {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  deathDate: Date | null;
  birthPlace: string | null;
  isLiving: boolean;
  generation: number;
  profilePhoto: string | null;
}

function calculateAge(birthDate: Date, deathDate?: Date | null): number {
  const endDate = deathDate ? new Date(deathDate) : new Date();
  const birth = new Date(birthDate);
  let age = endDate.getFullYear() - birth.getFullYear();
  const monthDiff = endDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function calculateCompletenessScore(person: PersonStats & {
  middleName?: string | null;
  maidenName?: string | null;
  deathPlace?: string | null;
  biography?: string | null;
  occupation?: string | null;
  education?: string | null;
}): number {
  let score = 0;
  const fields = [
    { field: 'firstName', weight: 15 },
    { field: 'lastName', weight: 15 },
    { field: 'birthDate', weight: 15 },
    { field: 'birthPlace', weight: 10 },
    { field: 'biography', weight: 10 },
    { field: 'occupation', weight: 5 },
    { field: 'education', weight: 5 },
    { field: 'profilePhoto', weight: 10 },
  ];

  // For deceased, add death fields
  if (!person.isLiving) {
    fields.push({ field: 'deathDate', weight: 10 });
    fields.push({ field: 'deathPlace', weight: 5 });
  } else {
    // Redistribute weight for living people
    fields.forEach(f => {
      if (f.field === 'birthDate') f.weight = 20;
      if (f.field === 'birthPlace') f.weight = 15;
    });
  }

  for (const { field, weight } of fields) {
    const value = (person as unknown as Record<string, unknown>)[field];
    if (value !== null && value !== undefined && value !== '') {
      score += weight;
    }
  }

  return Math.min(100, score);
}

// GET /api/family-trees/:treeId/statistics - Get tree statistics
familyTreesRouter.get('/:treeId/statistics', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'VIEWER');

    // Get all people with relevant fields
    const people = await prisma.person.findMany({
      where: { treeId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        maidenName: true,
        birthDate: true,
        birthPlace: true,
        deathDate: true,
        deathPlace: true,
        isLiving: true,
        generation: true,
        profilePhoto: true,
        biography: true,
        occupation: true,
        education: true,
      },
    });

    // Get counts for related data
    const [photoCount, documentCount, storyCount, relationshipCount] = await Promise.all([
      prisma.treePhoto.count({ where: { treeId } }),
      prisma.sourceDocument.count({ where: { treeId } }),
      prisma.familyStory.count({ where: { treeId } }),
      prisma.relationship.count({ where: { treeId } }),
    ]);

    // Basic counts
    const totalMembers = people.length;
    const livingMembers = people.filter(p => p.isLiving).length;
    const deceasedMembers = people.filter(p => !p.isLiving).length;

    // Generation statistics
    const generations = [...new Set(people.map(p => p.generation))].sort((a, b) => a - b);
    const generationCounts = generations.map(gen => ({
      generation: gen,
      count: people.filter(p => p.generation === gen).length,
    }));
    const deepestGeneration = Math.max(...generations, 0);

    // Age statistics - only for people with birth dates
    const peopleWithBirthDates = people.filter(p => p.birthDate);
    let oldestLiving: { person: PersonStats; age: number } | null = null;
    let youngestLiving: { person: PersonStats; age: number } | null = null;
    let longestLived: { person: PersonStats; age: number } | null = null;
    let averageLifespan = 0;
    let averageLivingAge = 0;

    const livingWithDates = peopleWithBirthDates.filter(p => p.isLiving);
    const deceasedWithDates = peopleWithBirthDates.filter(p => !p.isLiving && p.deathDate);

    // Oldest and youngest living
    if (livingWithDates.length > 0) {
      const livingWithAges = livingWithDates.map(p => ({
        person: p,
        age: calculateAge(p.birthDate!),
      }));
      livingWithAges.sort((a, b) => b.age - a.age);
      oldestLiving = livingWithAges[0];
      youngestLiving = livingWithAges[livingWithAges.length - 1];
      averageLivingAge = Math.round(
        livingWithAges.reduce((sum, p) => sum + p.age, 0) / livingWithAges.length
      );
    }

    // Longest lived (deceased)
    if (deceasedWithDates.length > 0) {
      const deceasedWithAges = deceasedWithDates.map(p => ({
        person: p,
        age: calculateAge(p.birthDate!, p.deathDate),
      }));
      deceasedWithAges.sort((a, b) => b.age - a.age);
      longestLived = deceasedWithAges[0];
      averageLifespan = Math.round(
        deceasedWithAges.reduce((sum, p) => sum + p.age, 0) / deceasedWithAges.length
      );
    }

    // Geographic distribution
    const birthPlaces = people
      .filter(p => p.birthPlace)
      .map(p => p.birthPlace!)
      .reduce((acc, place) => {
        // Normalize place names - take last part (usually city or country)
        const parts = place.split(',').map(s => s.trim());
        const key = parts[parts.length - 1] || place;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const geographicDistribution = Object.entries(birthPlaces)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Most common surnames
    const surnames = people
      .map(p => p.lastName)
      .reduce((acc, name) => {
        const normalized = name.toLowerCase();
        acc[normalized] = (acc[normalized] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const commonSurnames = Object.entries(surnames)
      .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Maiden names (for married women)
    const maidenNames = people
      .filter(p => p.maidenName)
      .map(p => p.maidenName!)
      .reduce((acc, name) => {
        const normalized = name.toLowerCase();
        acc[normalized] = (acc[normalized] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const commonMaidenNames = Object.entries(maidenNames)
      .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Completeness score
    const completenessScores = people.map(p => calculateCompletenessScore(p));
    const averageCompleteness = Math.round(
      completenessScores.reduce((sum, s) => sum + s, 0) / (completenessScores.length || 1)
    );

    // Profiles by completeness tier
    const completeProfiles = completenessScores.filter(s => s >= 80).length;
    const partialProfiles = completenessScores.filter(s => s >= 40 && s < 80).length;
    const incompleteProfiles = completenessScores.filter(s => s < 40).length;

    // Birth/death date coverage
    const withBirthDate = peopleWithBirthDates.length;
    const withDeathDate = deceasedWithDates.length;
    const deceasedMissingDeathDate = deceasedMembers - withDeathDate;

    // Timeline data - births by decade
    const birthsByDecade = peopleWithBirthDates.reduce((acc, p) => {
      const decade = Math.floor(new Date(p.birthDate!).getFullYear() / 10) * 10;
      acc[decade] = (acc[decade] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const birthTimeline = Object.entries(birthsByDecade)
      .map(([decade, count]) => ({ decade: Number(decade), count }))
      .sort((a, b) => a.decade - b.decade);

    res.json({
      success: true,
      data: {
        // Overview
        overview: {
          totalMembers,
          livingMembers,
          deceasedMembers,
          generations: deepestGeneration + 1,
          photos: photoCount,
          documents: documentCount,
          stories: storyCount,
          relationships: relationshipCount,
        },

        // Generation breakdown
        generationBreakdown: generationCounts,

        // Age statistics
        ageStatistics: {
          oldestLiving: oldestLiving
            ? {
                id: oldestLiving.person.id,
                name: `${oldestLiving.person.firstName} ${oldestLiving.person.lastName}`,
                age: oldestLiving.age,
                profilePhoto: oldestLiving.person.profilePhoto,
              }
            : null,
          youngestLiving: youngestLiving
            ? {
                id: youngestLiving.person.id,
                name: `${youngestLiving.person.firstName} ${youngestLiving.person.lastName}`,
                age: youngestLiving.age,
                profilePhoto: youngestLiving.person.profilePhoto,
              }
            : null,
          longestLived: longestLived
            ? {
                id: longestLived.person.id,
                name: `${longestLived.person.firstName} ${longestLived.person.lastName}`,
                age: longestLived.age,
                profilePhoto: longestLived.person.profilePhoto,
              }
            : null,
          averageLivingAge,
          averageLifespan,
        },

        // Geographic data
        geographicDistribution,

        // Names
        commonSurnames,
        commonMaidenNames,

        // Data quality
        dataQuality: {
          averageCompleteness,
          completeProfiles,
          partialProfiles,
          incompleteProfiles,
          withBirthDate,
          withBirthDatePercent: Math.round((withBirthDate / totalMembers) * 100) || 0,
          deceasedMissingDeathDate,
        },

        // Timeline
        birthTimeline,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Activity Feed (US-FT-6.3)
// ==========================================

type ActivityType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_ROLE_CHANGED'
  | 'PERSON_ADDED'
  | 'PERSON_UPDATED'
  | 'PERSON_DELETED'
  | 'PERSON_MERGED'
  | 'RELATIONSHIP_ADDED'
  | 'RELATIONSHIP_REMOVED'
  | 'MARRIAGE_ADDED'
  | 'MARRIAGE_REMOVED'
  | 'PHOTO_UPLOADED'
  | 'PHOTO_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'STORY_PUBLISHED'
  | 'STORY_UPDATED'
  | 'SUGGESTION_MADE'
  | 'SUGGESTION_APPROVED'
  | 'SUGGESTION_REJECTED'
  | 'TREE_UPDATED'
  | 'TREE_PRIVACY_CHANGED';

interface RecordActivityInput {
  treeId: string;
  actorId: string;
  type: ActivityType;
  targetPersonId?: string | null;
  targetUserId?: string | null;
  targetPhotoId?: string | null;
  targetDocumentId?: string | null;
  targetStoryId?: string | null;
  metadata?: Record<string, unknown>;
  isPrivate?: boolean;
}

// Helper function to record activities
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await prisma.treeActivity.create({
      data: {
        treeId: input.treeId,
        actorId: input.actorId,
        type: input.type,
        targetPersonId: input.targetPersonId || null,
        targetUserId: input.targetUserId || null,
        targetPhotoId: input.targetPhotoId || null,
        targetDocumentId: input.targetDocumentId || null,
        targetStoryId: input.targetStoryId || null,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
        isPrivate: input.isPrivate || false,
      },
    });
  } catch (error) {
    // Log but don't throw - activity recording shouldn't break main operations
    console.error('Failed to record activity:', error);
  }
}

// GET /api/family-trees/:treeId/activity - Get activity feed
familyTreesRouter.get('/:treeId/activity', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    const tree = await checkTreeAccess(treeId, userId, 'VIEWER');
    const member = tree.members[0];
    const isAdmin = member.role === 'ADMIN';

    // Query params
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;
    const types = req.query.types
      ? (req.query.types as string).split(',') as ActivityType[]
      : undefined;
    const daysAgo = parseInt(req.query.daysAgo as string) || 90;

    // Calculate date cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    // Build where clause
    const where: {
      treeId: string;
      createdAt: { gte: Date };
      type?: { in: ActivityType[] };
      isPrivate?: boolean;
      id?: { lt: string };
    } = {
      treeId,
      createdAt: { gte: cutoffDate },
    };

    if (types && types.length > 0) {
      where.type = { in: types };
    }

    // Non-admins can't see private activities
    if (!isAdmin) {
      where.isPrivate = false;
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor };
    }

    const activities = await prisma.treeActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Get one extra to check for more
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Check if there are more results
    const hasMore = activities.length > limit;
    if (hasMore) {
      activities.pop();
    }

    // Get read status for this user
    const readStatus = await prisma.activityReadStatus.findUnique({
      where: {
        treeId_userId: {
          treeId,
          userId,
        },
      },
    });

    // Count unread activities
    const unreadCount = await prisma.treeActivity.count({
      where: {
        treeId,
        createdAt: {
          gte: cutoffDate,
          ...(readStatus?.lastSeenAt ? { gt: readStatus.lastSeenAt } : {}),
        },
        isPrivate: isAdmin ? undefined : false,
      },
    });

    res.json({
      success: true,
      data: {
        activities: activities.map(a => ({
          id: a.id,
          type: a.type,
          actor: a.actor,
          targetPersonId: a.targetPersonId,
          targetUserId: a.targetUserId,
          targetPhotoId: a.targetPhotoId,
          targetDocumentId: a.targetDocumentId,
          targetStoryId: a.targetStoryId,
          metadata: a.metadata,
          isPrivate: a.isPrivate,
          createdAt: a.createdAt.toISOString(),
          isNew: readStatus ? a.createdAt > readStatus.lastSeenAt : true,
        })),
        hasMore,
        nextCursor: hasMore ? activities[activities.length - 1].id : null,
        unreadCount,
        lastSeenAt: readStatus?.lastSeenAt?.toISOString() || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/family-trees/:treeId/activity/mark-seen - Mark activities as seen
familyTreesRouter.post('/:treeId/activity/mark-seen', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'VIEWER');

    await prisma.activityReadStatus.upsert({
      where: {
        treeId_userId: {
          treeId,
          userId,
        },
      },
      update: {
        lastSeenAt: new Date(),
      },
      create: {
        treeId,
        userId,
        lastSeenAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        markedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/activity/summary - Get activity summary
familyTreesRouter.get('/:treeId/activity/summary', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    const tree = await checkTreeAccess(treeId, userId, 'VIEWER');
    const member = tree.members[0];
    const isAdmin = member.role === 'ADMIN';

    const daysAgo = parseInt(req.query.daysAgo as string) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    // Get counts by type
    const typeCounts = await prisma.treeActivity.groupBy({
      by: ['type'],
      where: {
        treeId,
        createdAt: { gte: cutoffDate },
        isPrivate: isAdmin ? undefined : false,
      },
      _count: {
        _all: true,
      },
    });

    // Get top contributors
    const contributorCounts = await prisma.treeActivity.groupBy({
      by: ['actorId'],
      where: {
        treeId,
        createdAt: { gte: cutoffDate },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          actorId: 'desc',
        },
      },
      take: 5,
    });

    // Get contributor details
    const contributorIds = contributorCounts.map(c => c.actorId);
    const contributors = await prisma.user.findMany({
      where: { id: { in: contributorIds } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    });

    const contributorMap = new Map(contributors.map(c => [c.id, c]));

    res.json({
      success: true,
      data: {
        period: {
          start: cutoffDate.toISOString(),
          end: new Date().toISOString(),
          days: daysAgo,
        },
        byType: typeCounts.reduce(
          (acc, tc) => {
            acc[tc.type] = tc._count._all;
            return acc;
          },
          {} as Record<string, number>
        ),
        totalActivities: typeCounts.reduce((sum, tc) => sum + tc._count._all, 0),
        topContributors: contributorCounts.map(c => ({
          user: contributorMap.get(c.actorId) || { id: c.actorId, name: 'Unknown' },
          count: c._count._all,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GEDCOM Import (US-FT-6.4)
// ==========================================

// Configure multer for GEDCOM file uploads (up to 50MB)
const gedcomUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    // Accept .ged files and text files
    if (
      file.originalname.endsWith('.ged') ||
      file.originalname.endsWith('.gedcom') ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/x-gedcom'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only GEDCOM files (.ged, .gedcom) are allowed'));
    }
  },
});

// Store parsed GEDCOM data temporarily for preview -> import flow
const gedcomPreviewCache = new Map<string, {
  result: GedcomParseResult;
  userId: string;
  treeId: string | null;
  expiresAt: number;
}>();

// Clean up expired previews every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of gedcomPreviewCache.entries()) {
    if (value.expiresAt < now) {
      gedcomPreviewCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// POST /api/family-trees/import/gedcom/preview - Parse and preview GEDCOM file
familyTreesRouter.post(
  '/import/gedcom/preview',
  gedcomUpload.single('file'),
  async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const treeId = req.body.treeId as string | undefined;

      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      // If importing to existing tree, check access
      if (treeId) {
        await checkTreeAccess(treeId, userId, 'ADMIN');
      }

      // Parse the GEDCOM file
      const content = req.file.buffer.toString('utf-8');
      let result = parseGedcom(content);
      result = validateGedcomData(result);

      // Generate preview
      const preview = generateImportPreview(result);

      // Store in cache for later import
      const previewId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      gedcomPreviewCache.set(previewId, {
        result,
        userId,
        treeId: treeId || null,
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
      });

      res.json({
        success: true,
        data: {
          previewId,
          filename: req.file.originalname,
          fileSize: req.file.size,
          ...preview,
          header: result.header,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/family-trees/import/gedcom/confirm - Execute the import
familyTreesRouter.post('/import/gedcom/confirm', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { previewId, treeName, treeDescription, treePrivacy } = req.body;

    if (!previewId) {
      throw new AppError(400, 'Preview ID is required');
    }

    // Get cached preview data
    const cached = gedcomPreviewCache.get(previewId);
    if (!cached) {
      throw new AppError(404, 'Preview expired or not found. Please upload the file again.');
    }

    if (cached.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    const { result, treeId: existingTreeId } = cached;

    // Start a transaction for the entire import
    const importResult = await prisma.$transaction(async (tx) => {
      let treeId: string;
      let isNewTree = false;

      // Create new tree or use existing
      if (existingTreeId) {
        treeId = existingTreeId;
      } else {
        // Create new tree
        const newTree = await tx.familyTree.create({
          data: {
            name: treeName || 'Imported Family Tree',
            description: treeDescription || `Imported from GEDCOM on ${new Date().toLocaleDateString()}`,
            privacy: treePrivacy || 'PRIVATE',
            createdBy: userId,
            members: {
              create: {
                userId,
                role: 'ADMIN',
              },
            },
          },
        });
        treeId = newTree.id;
        isNewTree = true;
      }

      // Map GEDCOM IDs to database IDs
      const personIdMap = new Map<string, string>();
      const stats = {
        personsCreated: 0,
        relationshipsCreated: 0,
        marriagesCreated: 0,
        errors: [] as string[],
      };

      // Create all individuals first
      for (const ind of result.individuals) {
        try {
          const person = await tx.person.create({
            data: {
              treeId,
              firstName: ind.firstName || 'Unknown',
              middleName: ind.middleName,
              lastName: ind.lastName || 'Unknown',
              maidenName: ind.maidenName,
              suffix: ind.suffix,
              nickname: ind.nickname,
              gender: convertGender(ind.gender),
              birthDate: ind.birthDate ? new Date(ind.birthDate) : null,
              birthPlace: ind.birthPlace,
              deathDate: ind.deathDate ? new Date(ind.deathDate) : null,
              deathPlace: ind.deathPlace,
              isLiving: ind.isLiving,
              occupation: ind.occupation,
              education: ind.education,
              biography: ind.notes,
            },
          });
          personIdMap.set(ind.id, person.id);
          stats.personsCreated++;
        } catch (err) {
          stats.errors.push(`Failed to create person ${ind.id}: ${(err as Error).message}`);
        }
      }

      // Create relationships from families
      for (const fam of result.families) {
        const husbandDbId = fam.husbandId ? personIdMap.get(fam.husbandId) : null;
        const wifeDbId = fam.wifeId ? personIdMap.get(fam.wifeId) : null;

        // Create marriage if both spouses exist
        if (husbandDbId && wifeDbId) {
          try {
            await tx.marriage.create({
              data: {
                treeId,
                marriageDate: fam.marriageDate ? new Date(fam.marriageDate) : null,
                marriagePlace: fam.marriagePlace,
                divorceDate: fam.divorceDate ? new Date(fam.divorceDate) : null,
                divorcePlace: fam.divorcePlace,
                notes: fam.divorceDate ? 'DIVORCED' : undefined,
                spouses: {
                  connect: [{ id: husbandDbId }, { id: wifeDbId }],
                },
              },
            });
            stats.marriagesCreated++;
          } catch (err) {
            stats.errors.push(`Failed to create marriage for family ${fam.id}: ${(err as Error).message}`);
          }
        }

        // Create parent-child relationships
        for (const childGedcomId of fam.childIds) {
          const childDbId = personIdMap.get(childGedcomId);
          if (!childDbId) continue;

          // Relationship with father
          if (husbandDbId) {
            try {
              await tx.relationship.create({
                data: {
                  treeId,
                  personFromId: husbandDbId,
                  personToId: childDbId,
                  relationshipType: 'PARENT',
                },
              });
              stats.relationshipsCreated++;
            } catch (err) {
              // Might be duplicate, ignore
            }
          }

          // Relationship with mother
          if (wifeDbId) {
            try {
              await tx.relationship.create({
                data: {
                  treeId,
                  personFromId: wifeDbId,
                  personToId: childDbId,
                  relationshipType: 'PARENT',
                },
              });
              stats.relationshipsCreated++;
            } catch (err) {
              // Might be duplicate, ignore
            }
          }
        }
      }

      return {
        treeId,
        isNewTree,
        stats,
      };
    }, {
      timeout: 60000, // 60 second timeout for large imports
    });

    // Remove from cache
    gedcomPreviewCache.delete(previewId);

    res.json({
      success: true,
      data: {
        treeId: importResult.treeId,
        isNewTree: importResult.isNewTree,
        stats: importResult.stats,
        summary: {
          personsCreated: importResult.stats.personsCreated,
          relationshipsCreated: importResult.stats.relationshipsCreated,
          marriagesCreated: importResult.stats.marriagesCreated,
          errorsCount: importResult.stats.errors.length,
        },
        errors: importResult.stats.errors.slice(0, 50), // Return first 50 errors
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/import/gedcom/preview/:previewId - Cancel preview
familyTreesRouter.delete('/import/gedcom/preview/:previewId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { previewId } = req.params;

    const cached = gedcomPreviewCache.get(previewId);
    if (!cached) {
      throw new AppError(404, 'Preview not found');
    }

    if (cached.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    gedcomPreviewCache.delete(previewId);

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// COMPLETENESS & BADGES ENDPOINTS
// ============================================================

// Badge definitions
const BADGE_DEFINITIONS = [
  // Data completeness badges
  {
    id: 'first_photo',
    name: 'Shutterbug',
    description: 'Add your first photo',
    longDescription: 'Upload the first photo to your family tree. Photos bring your ancestors to life!',
    icon: 'camera' as const,
    category: 'data' as const,
    requirement: 1,
    requirementType: 'photos',
    tier: 'bronze' as const,
  },
  {
    id: 'photographer',
    name: 'Family Photographer',
    description: 'Add 10 photos',
    longDescription: 'Build a visual history by adding 10 photos to your family tree.',
    icon: 'camera' as const,
    category: 'data' as const,
    requirement: 10,
    requirementType: 'photos',
    tier: 'silver' as const,
  },
  {
    id: 'archivist',
    name: 'Family Archivist',
    description: 'Add 50 photos',
    longDescription: 'Create a comprehensive photo archive with 50 photos.',
    icon: 'camera' as const,
    category: 'data' as const,
    requirement: 50,
    requirementType: 'photos',
    tier: 'gold' as const,
  },
  {
    id: 'first_story',
    name: 'Storyteller',
    description: 'Write your first family story',
    longDescription: 'Preserve family memories by writing your first story.',
    icon: 'book' as const,
    category: 'data' as const,
    requirement: 1,
    requirementType: 'stories',
    tier: 'bronze' as const,
  },
  {
    id: 'historian',
    name: 'Family Historian',
    description: 'Write 5 family stories',
    longDescription: 'Become the family historian by recording 5 stories.',
    icon: 'book' as const,
    category: 'data' as const,
    requirement: 5,
    requirementType: 'stories',
    tier: 'silver' as const,
  },
  // Milestone badges
  {
    id: 'starter',
    name: 'Tree Starter',
    description: 'Add 5 family members',
    longDescription: 'Begin your journey by adding 5 family members to your tree.',
    icon: 'users' as const,
    category: 'milestone' as const,
    requirement: 5,
    requirementType: 'members',
    tier: 'bronze' as const,
  },
  {
    id: 'growing_tree',
    name: 'Growing Tree',
    description: 'Add 25 family members',
    longDescription: 'Your tree is growing! Add 25 family members.',
    icon: 'users' as const,
    category: 'milestone' as const,
    requirement: 25,
    requirementType: 'members',
    tier: 'silver' as const,
  },
  {
    id: 'family_forest',
    name: 'Family Forest',
    description: 'Add 100 family members',
    longDescription: 'Create a forest of family connections with 100 members.',
    icon: 'users' as const,
    category: 'milestone' as const,
    requirement: 100,
    requirementType: 'members',
    tier: 'gold' as const,
  },
  {
    id: 'dynasty',
    name: 'Dynasty Builder',
    description: 'Add 500 family members',
    longDescription: 'Build a dynasty spanning generations with 500 members.',
    icon: 'crown' as const,
    category: 'milestone' as const,
    requirement: 500,
    requirementType: 'members',
    tier: 'platinum' as const,
  },
  {
    id: 'three_generations',
    name: 'Three Generations',
    description: 'Record 3 generations',
    longDescription: 'Connect three generations of your family.',
    icon: 'users' as const,
    category: 'milestone' as const,
    requirement: 3,
    requirementType: 'generations',
    tier: 'bronze' as const,
  },
  {
    id: 'five_generations',
    name: 'Five Generations',
    description: 'Record 5 generations',
    longDescription: 'Trace your family through five generations.',
    icon: 'users' as const,
    category: 'milestone' as const,
    requirement: 5,
    requirementType: 'generations',
    tier: 'silver' as const,
  },
  {
    id: 'deep_roots',
    name: 'Deep Roots',
    description: 'Record 8+ generations',
    longDescription: 'Uncover your deep roots with 8 or more generations.',
    icon: 'trophy' as const,
    category: 'milestone' as const,
    requirement: 8,
    requirementType: 'generations',
    tier: 'gold' as const,
  },
  // Engagement badges
  {
    id: 'connector',
    name: 'Connector',
    description: 'Add 10 relationships',
    longDescription: 'Build family connections by adding 10 relationships.',
    icon: 'heart' as const,
    category: 'engagement' as const,
    requirement: 10,
    requirementType: 'relationships',
    tier: 'bronze' as const,
  },
  {
    id: 'web_weaver',
    name: 'Web Weaver',
    description: 'Add 50 relationships',
    longDescription: 'Weave a complex web of family connections with 50 relationships.',
    icon: 'heart' as const,
    category: 'engagement' as const,
    requirement: 50,
    requirementType: 'relationships',
    tier: 'silver' as const,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Achieve 100% tree completeness',
    longDescription: 'Complete every profile in your tree to perfection.',
    icon: 'star' as const,
    category: 'engagement' as const,
    requirement: 100,
    requirementType: 'completeness',
    tier: 'platinum' as const,
  },
];

// Calculate person completeness score
function calculatePersonCompleteness(person: {
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  deathDate: Date | null;
  isLiving: boolean;
  birthPlace: string | null;
  deathPlace: string | null;
  biography: string | null;
  occupation: string | null;
  profilePhoto: string | null;
}): { score: number; missingFields: string[] } {
  const fields = [
    { name: 'First Name', value: person.firstName, weight: 15 },
    { name: 'Last Name', value: person.lastName, weight: 15 },
    { name: 'Birth Date', value: person.birthDate, weight: 15 },
    { name: 'Birth Place', value: person.birthPlace, weight: 10 },
    { name: 'Photo', value: person.profilePhoto, weight: 10 },
    { name: 'Biography', value: person.biography, weight: 10 },
    { name: 'Occupation', value: person.occupation, weight: 5 },
  ];

  // Death date/place only matters for deceased
  if (!person.isLiving) {
    fields.push(
      { name: 'Death Date', value: person.deathDate, weight: 10 },
      { name: 'Death Place', value: person.deathPlace, weight: 10 }
    );
  } else {
    // Redistribute weight for living people
    fields[0].weight = 18;
    fields[1].weight = 18;
    fields[2].weight = 18;
    fields[3].weight = 13;
    fields[4].weight = 13;
    fields[5].weight = 13;
    fields[6].weight = 7;
  }

  let totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  let earnedWeight = 0;
  const missingFields: string[] = [];

  for (const field of fields) {
    if (field.value) {
      earnedWeight += field.weight;
    } else {
      missingFields.push(field.name);
    }
  }

  return {
    score: Math.round((earnedWeight / totalWeight) * 100),
    missingFields,
  };
}

// GET /api/family-trees/:treeId/completeness - Get tree completeness data
familyTreesRouter.get('/:treeId/completeness', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'VIEWER');

    // Get all people in tree
    const people = await prisma.person.findMany({
      where: { treeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        deathDate: true,
        isLiving: true,
        birthPlace: true,
        deathPlace: true,
        biography: true,
        occupation: true,
        profilePhoto: true,
      },
    });

    // Get counts for stats
    const [photoCount, storyCount, relationshipCount, documentCount] = await Promise.all([
      prisma.treePhoto.count({ where: { treeId } }),
      prisma.familyStory.count({ where: { treeId } }),
      prisma.relationship.count({ where: { treeId } }),
      prisma.sourceDocument.count({ where: { treeId } }),
    ]);

    // Calculate individual completeness scores
    const personScores = people.map(person => {
      const { score, missingFields } = calculatePersonCompleteness(person);
      return {
        id: person.id,
        name: `${person.firstName} ${person.lastName}`.trim(),
        photoUrl: person.profilePhoto,
        completeness: score,
        missingFields,
      };
    });

    // Calculate field coverage
    const totalPeople = people.length || 1;
    const deceasedCount = people.filter(p => !p.isLiving).length || 1;
    const fieldCoverage = {
      birthDates: Math.round((people.filter(p => p.birthDate).length / totalPeople) * 100),
      deathDates: Math.round((people.filter(p => !p.isLiving && p.deathDate).length / deceasedCount) * 100),
      birthPlaces: Math.round((people.filter(p => p.birthPlace).length / totalPeople) * 100),
      photos: Math.round((people.filter(p => p.profilePhoto).length / totalPeople) * 100),
      biographies: Math.round((people.filter(p => p.biography).length / totalPeople) * 100),
      occupations: Math.round((people.filter(p => p.occupation).length / totalPeople) * 100),
      relationships: relationshipCount > 0 ? Math.min(100, Math.round((relationshipCount / (totalPeople * 2)) * 100)) : 0,
    };

    // Calculate overall score
    const averageCompleteness = personScores.length > 0
      ? Math.round(personScores.reduce((sum, p) => sum + p.completeness, 0) / personScores.length)
      : 0;

    // Categorize profiles
    const completeProfiles = personScores.filter(p => p.completeness >= 80).length;
    const partialProfiles = personScores.filter(p => p.completeness >= 40 && p.completeness < 80).length;
    const incompleteProfiles = personScores.filter(p => p.completeness < 40).length;

    // Generate suggestions
    const suggestions: Array<{
      id: string;
      type: string;
      priority: string;
      title: string;
      description: string;
      personId?: string;
      personName?: string;
      action: string;
    }> = [];

    // Add suggestions for incomplete profiles
    const incompletePeople = personScores
      .filter(p => p.completeness < 80)
      .sort((a, b) => a.completeness - b.completeness)
      .slice(0, 10);

    for (const person of incompletePeople) {
      if (person.missingFields.includes('Birth Date')) {
        suggestions.push({
          id: `${person.id}_birthdate`,
          type: 'add_date',
          priority: person.completeness < 40 ? 'high' : 'medium',
          title: 'Add birth date',
          description: `Add birth date for ${person.name} to improve their profile completeness.`,
          personId: person.id,
          personName: person.name,
          action: 'Edit Profile',
        });
      }
      if (person.missingFields.includes('Photo')) {
        suggestions.push({
          id: `${person.id}_photo`,
          type: 'add_photo',
          priority: 'medium',
          title: 'Add photo',
          description: `Add a photo for ${person.name} to bring their profile to life.`,
          personId: person.id,
          personName: person.name,
          action: 'Add Photo',
        });
      }
      if (person.missingFields.includes('Biography')) {
        suggestions.push({
          id: `${person.id}_bio`,
          type: 'add_bio',
          priority: 'low',
          title: 'Add biography',
          description: `Write a biography for ${person.name} to preserve their story.`,
          personId: person.id,
          personName: person.name,
          action: 'Edit Profile',
        });
      }
    }

    // Limit suggestions
    const limitedSuggestions = suggestions.slice(0, 15);

    // Get generations for badges
    const generations = new Set(people.map(p => p.birthDate ? new Date(p.birthDate).getFullYear() : null).filter(Boolean));
    const generationCount = Math.ceil(generations.size / 25); // Rough approximation: 25 years per generation

    // Calculate badge progress
    const badgeMetrics = {
      photos: photoCount,
      stories: storyCount,
      members: people.length,
      relationships: relationshipCount,
      generations: generationCount,
      completeness: averageCompleteness,
      documents: documentCount,
    };

    const badges = BADGE_DEFINITIONS.map(badge => {
      const progress = badgeMetrics[badge.requirementType as keyof typeof badgeMetrics] || 0;
      return {
        ...badge,
        progress,
        earned: progress >= badge.requirement,
      };
    });

    res.json({
      success: true,
      data: {
        overallScore: averageCompleteness,
        totalMembers: people.length,
        completeProfiles,
        partialProfiles,
        incompleteProfiles,
        fieldCoverage,
        suggestions: limitedSuggestions,
        badges,
        incompleteMembers: personScores
          .filter(p => p.completeness < 80)
          .sort((a, b) => a.completeness - b.completeness)
          .slice(0, 20),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/family-trees/:treeId/badges - Get badge progress
familyTreesRouter.get('/:treeId/badges', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'VIEWER');

    // Get counts for badge calculation
    const [peopleCount, photoCount, storyCount, relationshipCount] = await Promise.all([
      prisma.person.count({ where: { treeId } }),
      prisma.treePhoto.count({ where: { treeId } }),
      prisma.familyStory.count({ where: { treeId } }),
      prisma.relationship.count({ where: { treeId } }),
    ]);

    // Get people for generation calculation
    const people = await prisma.person.findMany({
      where: { treeId },
      select: {
        birthDate: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        biography: true,
        occupation: true,
        birthPlace: true,
        deathDate: true,
        deathPlace: true,
        isLiving: true,
      },
    });

    // Calculate average completeness
    const completenessScores = people.map(p => calculatePersonCompleteness(p).score);
    const averageCompleteness = completenessScores.length > 0
      ? Math.round(completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length)
      : 0;

    // Estimate generations (rough: 25-year spans)
    const years = people
      .map(p => p.birthDate ? new Date(p.birthDate).getFullYear() : null)
      .filter((y): y is number => y !== null);
    const yearSpan = years.length > 1 ? Math.max(...years) - Math.min(...years) : 0;
    const generationCount = Math.max(1, Math.ceil(yearSpan / 25));

    const badgeMetrics = {
      photos: photoCount,
      stories: storyCount,
      members: peopleCount,
      relationships: relationshipCount,
      generations: generationCount,
      completeness: averageCompleteness,
      yearSpan,
    };

    const badges = BADGE_DEFINITIONS.map(badge => {
      const progress = badgeMetrics[badge.requirementType as keyof typeof badgeMetrics] || 0;
      return {
        ...badge,
        progress,
        earned: progress >= badge.requirement,
        earnedAt: progress >= badge.requirement ? new Date().toISOString() : undefined,
      };
    });

    res.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DNA INTEGRATION ENDPOINTS (US-FT-8.2)
// ============================================================

// DNA data validation schema
const dnaDataSchema = z.object({
  dnaTestProvider: z.string().max(100).nullable().optional(),
  dnaTestDate: dateStringSchema.nullable(),
  yDnaHaplogroup: z.string().max(50).nullable().optional(),
  mtDnaHaplogroup: z.string().max(50).nullable().optional(),
  dnaKitNumber: z.string().max(100).nullable().optional(),
  dnaEthnicityNotes: z.string().max(2000).nullable().optional(),
  dnaMatchNotes: z.string().max(2000).nullable().optional(),
  dnaPrivacy: z.enum(['PRIVATE', 'FAMILY_ONLY']).optional(),
});

// GET /api/family-trees/:treeId/people/:personId/dna - Get DNA information
familyTreesRouter.get('/:treeId/people/:personId/dna', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    const tree = await checkTreeAccess(treeId, userId, 'VIEWER');
    const membership = tree.members[0];

    // Get person with DNA data
    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        dnaTestProvider: true,
        dnaTestDate: true,
        yDnaHaplogroup: true,
        mtDnaHaplogroup: true,
        dnaKitNumber: true,
        dnaEthnicityNotes: true,
        dnaMatchNotes: true,
        dnaPrivacy: true,
      },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    // Check DNA privacy
    const isCreator = tree.createdBy === userId;
    const isAdmin = isCreator || membership?.role === 'ADMIN';
    const isLinkedToPerson = membership?.linkedPersonId === personId;
    const canView = isAdmin || isLinkedToPerson || person.dnaPrivacy === 'FAMILY_ONLY';

    if (!canView) {
      // Return limited data
      res.json({
        success: true,
        data: {
          person: {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            gender: person.gender,
          },
          dnaData: null,
          canView: false,
          canEdit: false,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        person: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
        },
        dnaData: {
          dnaTestProvider: person.dnaTestProvider,
          dnaTestDate: person.dnaTestDate,
          yDnaHaplogroup: person.yDnaHaplogroup,
          mtDnaHaplogroup: person.mtDnaHaplogroup,
          dnaKitNumber: person.dnaKitNumber,
          dnaEthnicityNotes: person.dnaEthnicityNotes,
          dnaMatchNotes: person.dnaMatchNotes,
          dnaPrivacy: person.dnaPrivacy || 'PRIVATE',
        },
        canView: true,
        canEdit: isAdmin || isLinkedToPerson,
        isAdmin,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/family-trees/:treeId/people/:personId/dna - Update DNA information
familyTreesRouter.put('/:treeId/people/:personId/dna', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    const tree = await checkTreeAccess(treeId, userId, 'MEMBER');
    const membership = tree.members[0];

    // Verify person exists
    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
      select: { id: true, dnaPrivacy: true },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    // Check edit permissions
    const isCreator = tree.createdBy === userId;
    const isAdmin = isCreator || membership?.role === 'ADMIN';
    const isLinkedToPerson = membership?.linkedPersonId === personId;

    if (!isAdmin && !isLinkedToPerson) {
      throw new AppError(403, 'You can only edit DNA information for yourself or as an admin');
    }

    // Validate input
    const data = dnaDataSchema.parse(req.body);

    // Update DNA fields
    const updated = await prisma.person.update({
      where: { id: personId },
      data: {
        dnaTestProvider: data.dnaTestProvider,
        dnaTestDate: data.dnaTestDate ? new Date(data.dnaTestDate) : null,
        yDnaHaplogroup: data.yDnaHaplogroup,
        mtDnaHaplogroup: data.mtDnaHaplogroup,
        dnaKitNumber: data.dnaKitNumber,
        dnaEthnicityNotes: data.dnaEthnicityNotes,
        dnaMatchNotes: data.dnaMatchNotes,
        dnaPrivacy: data.dnaPrivacy || 'PRIVATE',
      },
      select: {
        id: true,
        dnaTestProvider: true,
        dnaTestDate: true,
        yDnaHaplogroup: true,
        mtDnaHaplogroup: true,
        dnaKitNumber: true,
        dnaEthnicityNotes: true,
        dnaMatchNotes: true,
        dnaPrivacy: true,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/family-trees/:treeId/people/:personId/dna - Clear DNA information
familyTreesRouter.delete('/:treeId/people/:personId/dna', async (req, res, next) => {
  try {
    const { treeId, personId } = req.params;
    const userId = getUserId(req);

    const tree = await checkTreeAccess(treeId, userId, 'MEMBER');
    const membership = tree.members[0];

    // Verify person exists
    const person = await prisma.person.findFirst({
      where: { id: personId, treeId },
      select: { id: true },
    });

    if (!person) {
      throw new AppError(404, 'Person not found');
    }

    // Check edit permissions
    const isCreator = tree.createdBy === userId;
    const isAdmin = isCreator || membership?.role === 'ADMIN';
    const isLinkedToPerson = membership?.linkedPersonId === personId;

    if (!isAdmin && !isLinkedToPerson) {
      throw new AppError(403, 'You can only delete DNA information for yourself or as an admin');
    }

    // Clear all DNA fields
    await prisma.person.update({
      where: { id: personId },
      data: {
        dnaTestProvider: null,
        dnaTestDate: null,
        yDnaHaplogroup: null,
        mtDnaHaplogroup: null,
        dnaKitNumber: null,
        dnaEthnicityNotes: null,
        dnaMatchNotes: null,
        dnaPrivacy: 'PRIVATE',
      },
    });

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    next(error);
  }
});
