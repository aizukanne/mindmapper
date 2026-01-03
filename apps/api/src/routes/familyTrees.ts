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

const createPersonSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  maidenName: z.string().optional(),
  suffix: z.string().optional(),
  nickname: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).default('UNKNOWN'),
  birthDate: z.string().datetime().optional(),
  birthPlace: z.string().optional(),
  deathDate: z.string().datetime().optional(),
  deathPlace: z.string().optional(),
  isLiving: z.boolean().default(true),
  biography: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  privacy: z.enum(['PUBLIC', 'FAMILY_ONLY', 'PRIVATE']).default('PUBLIC'),
  profilePhoto: z.string().url().optional(),
  generation: z.number().int().default(0),
});

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
  marriageDate: z.string().datetime().optional(),
  marriagePlace: z.string().optional(),
  divorceDate: z.string().datetime().optional(),
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

    res.json({
      success: true,
      data: tree,
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
    const data = createPersonSchema.parse(req.body);
    const userId = getUserId(req);

    await checkTreeAccess(treeId, userId, 'MEMBER');

    const person = await prisma.person.create({
      data: {
        treeId,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        maidenName: data.maidenName,
        suffix: data.suffix,
        nickname: data.nickname,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        birthPlace: data.birthPlace,
        deathDate: data.deathDate ? new Date(data.deathDate) : null,
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

    res.status(201).json({
      success: true,
      data: person,
    });
  } catch (error) {
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

// GET /api/family-trees/:treeId/photos - List all photos in tree
familyTreesRouter.get('/:treeId/photos', async (req, res, next) => {
  try {
    const { treeId } = req.params;
    const {
      personId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = '50',
      offset = '0',
    } = req.query;
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
  dateOnDocument: z.string().datetime().optional(),
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
