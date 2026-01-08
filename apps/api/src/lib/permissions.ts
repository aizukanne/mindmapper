/**
 * Role-Based Permission System
 *
 * Implements the following permission rules:
 * - ADMIN: Can edit anyone in the tree
 * - MEMBER: Can edit self (linked person) and descendants only
 * - VIEWER: Read-only access
 *
 * This module provides utilities for checking and enforcing these permissions.
 */

import { prisma } from './prisma.js';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';
import type { RelationshipType } from '@prisma/client';

// Role hierarchy levels
export const ROLE_HIERARCHY = {
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
} as const;

export type TreeRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TreeAccessResult {
  tree: {
    id: string;
    createdBy: string;
    privacy: string;
  };
  userRole: TreeRole;
  linkedPersonId: string | null;
}

// Relationship types that define parent-child hierarchy
const PARENT_TYPES: RelationshipType[] = ['PARENT', 'ADOPTIVE_PARENT', 'STEP_PARENT', 'FOSTER_PARENT', 'GUARDIAN'];
const CHILD_TYPES: RelationshipType[] = ['CHILD', 'ADOPTIVE_CHILD', 'STEP_CHILD', 'FOSTER_CHILD', 'WARD'];

/**
 * Check if user has access to a tree and return their role
 * @param treeId - The tree ID to check access for
 * @param userId - The user ID to check access for
 * @param requiredRole - Optional minimum role required (throws if not met)
 * @returns Tree access result with role and linked person info
 */
export async function checkTreeAccess(
  treeId: string,
  userId: string,
  requiredRole?: TreeRole
): Promise<TreeAccessResult> {
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
    throw new AppError(404, 'Family tree not found', { code: ErrorCodes.NOT_FOUND });
  }

  // Creator is always admin
  const isCreator = tree.createdBy === userId;
  const member = tree.members[0];
  const memberRole = member?.role as TreeRole | undefined;
  const userRole: TreeRole = isCreator ? 'ADMIN' : (memberRole || 'VIEWER');
  const linkedPersonId = member?.linkedPersonId || null;

  if (requiredRole) {
    const userRoleLevel = ROLE_HIERARCHY[userRole];
    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      throw new AppError(403, 'Insufficient permissions', { code: ErrorCodes.FORBIDDEN });
    }
  }

  return {
    tree: { id: tree.id, createdBy: tree.createdBy, privacy: tree.privacy },
    userRole,
    linkedPersonId,
  };
}

/**
 * Get all descendants of a person using BFS traversal
 * Descendants are defined as children (biological, adopted, step, foster) and wards
 * @param treeId - The tree to search within
 * @param personId - The person to find descendants of
 * @returns Set of person IDs that are descendants
 */
export async function getDescendants(treeId: string, personId: string): Promise<Set<string>> {
  const descendants = new Set<string>();
  const queue: string[] = [personId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Get all child-type relationships where current person is the parent
    // This means: current person has PARENT/ADOPTIVE_PARENT/etc. relationship TO child
    const parentRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        personFromId: currentId,
        relationshipType: { in: PARENT_TYPES },
      },
      select: { personToId: true },
    });

    // Also check reverse: where current person is personFrom and type is CHILD
    // This means: current person is a CHILD OF personTo
    // But we want the opposite - where current person is parent of someone
    const childRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        personToId: currentId,
        relationshipType: { in: CHILD_TYPES },
      },
      select: { personFromId: true },
    });

    for (const rel of parentRelationships) {
      if (!descendants.has(rel.personToId) && rel.personToId !== personId) {
        descendants.add(rel.personToId);
        queue.push(rel.personToId);
      }
    }

    for (const rel of childRelationships) {
      if (!descendants.has(rel.personFromId) && rel.personFromId !== personId) {
        descendants.add(rel.personFromId);
        queue.push(rel.personFromId);
      }
    }
  }

  return descendants;
}

/**
 * Check if a person is a descendant of another person
 * @param treeId - The tree to search within
 * @param ancestorPersonId - The potential ancestor
 * @param targetPersonId - The person to check if they are a descendant
 * @returns True if targetPersonId is a descendant of ancestorPersonId
 */
export async function isDescendantOf(
  treeId: string,
  ancestorPersonId: string,
  targetPersonId: string
): Promise<boolean> {
  if (ancestorPersonId === targetPersonId) {
    return true; // A person can always edit themselves
  }

  const descendants = await getDescendants(treeId, ancestorPersonId);
  return descendants.has(targetPersonId);
}

/**
 * Check if a MEMBER user can edit a specific person
 * Members can only edit:
 * 1. Their own linked person
 * 2. Descendants of their linked person
 *
 * @param treeId - The tree ID
 * @param linkedPersonId - The person linked to the member (can be null if not linked)
 * @param targetPersonId - The person they want to edit
 * @returns True if the member can edit this person
 */
export async function canMemberEditPerson(
  treeId: string,
  linkedPersonId: string | null,
  targetPersonId: string
): Promise<boolean> {
  // If user is not linked to a person in the tree, they can't edit anyone
  if (!linkedPersonId) {
    return false;
  }

  // Can always edit self
  if (linkedPersonId === targetPersonId) {
    return true;
  }

  // Check if target is a descendant
  return await isDescendantOf(treeId, linkedPersonId, targetPersonId);
}

/**
 * Enforces member edit restrictions for a person
 * Throws an error if the member is not allowed to edit the target person
 *
 * @param userRole - The user's role in the tree
 * @param treeId - The tree ID
 * @param linkedPersonId - The person linked to the user (for members)
 * @param targetPersonId - The person they want to edit
 * @param operation - Description of the operation for error message
 */
export async function enforceMemberEditRestrictions(
  userRole: TreeRole,
  treeId: string,
  linkedPersonId: string | null,
  targetPersonId: string,
  operation: string = 'edit this person'
): Promise<void> {
  // Admins can edit anyone
  if (userRole === 'ADMIN') {
    return;
  }

  // Viewers cannot edit
  if (userRole === 'VIEWER') {
    throw new AppError(403, 'Viewers do not have edit permissions', {
      code: ErrorCodes.FORBIDDEN,
    });
  }

  // Members - check if they can edit this person
  if (userRole === 'MEMBER') {
    const canEdit = await canMemberEditPerson(treeId, linkedPersonId, targetPersonId);

    if (!canEdit) {
      throw new AppError(403, `You can only ${operation} for yourself or your descendants`, {
        code: ErrorCodes.FORBIDDEN,
        details: {
          reason: 'member_edit_restriction',
          linkedPersonId,
          targetPersonId,
        },
      });
    }
  }
}

/**
 * Check if a user can manage relationships for a person
 * This follows the same rules as editing a person
 */
export async function canMemberEditRelationship(
  treeId: string,
  linkedPersonId: string | null,
  personFromId: string,
  personToId: string
): Promise<boolean> {
  // If not linked, cannot edit
  if (!linkedPersonId) {
    return false;
  }

  // Can edit if either person in the relationship is self or descendant
  const canEditFrom = await canMemberEditPerson(treeId, linkedPersonId, personFromId);
  const canEditTo = await canMemberEditPerson(treeId, linkedPersonId, personToId);

  return canEditFrom || canEditTo;
}

/**
 * Enforces member edit restrictions for relationships
 * @param userRole - The user's role
 * @param treeId - The tree ID
 * @param linkedPersonId - The user's linked person
 * @param personFromId - One person in the relationship
 * @param personToId - The other person in the relationship
 * @param operation - Description of the operation
 */
export async function enforceMemberRelationshipRestrictions(
  userRole: TreeRole,
  treeId: string,
  linkedPersonId: string | null,
  personFromId: string,
  personToId: string,
  operation: string = 'modify this relationship'
): Promise<void> {
  // Admins can edit any relationship
  if (userRole === 'ADMIN') {
    return;
  }

  // Viewers cannot edit
  if (userRole === 'VIEWER') {
    throw new AppError(403, 'Viewers do not have edit permissions', {
      code: ErrorCodes.FORBIDDEN,
    });
  }

  // Members - check if they can edit this relationship
  if (userRole === 'MEMBER') {
    const canEdit = await canMemberEditRelationship(treeId, linkedPersonId, personFromId, personToId);

    if (!canEdit) {
      throw new AppError(403, `You can only ${operation} for yourself or your descendants`, {
        code: ErrorCodes.FORBIDDEN,
        details: {
          reason: 'member_relationship_restriction',
          linkedPersonId,
          personFromId,
          personToId,
        },
      });
    }
  }
}

/**
 * Get permission info for a user in a tree
 * Returns detailed permission flags based on role
 */
export function getPermissionFlags(userRole: TreeRole) {
  const roleLevel = ROLE_HIERARCHY[userRole];
  const isAdmin = userRole === 'ADMIN';
  const isMember = userRole === 'MEMBER';
  const isViewer = userRole === 'VIEWER';

  return {
    // Basic permissions
    canView: roleLevel >= 1,
    canEdit: roleLevel >= 2,
    canDelete: isAdmin,

    // People management
    canAddPeople: roleLevel >= 2,
    canEditPeople: roleLevel >= 2, // Subject to descendant restrictions for members
    canDeletePeople: isAdmin,

    // Relationship management
    canAddRelationships: roleLevel >= 2, // Subject to descendant restrictions for members
    canDeleteRelationships: isAdmin,

    // Member management
    canInviteMembers: isAdmin,
    canManageMembers: isAdmin,

    // Tree settings
    canChangeSettings: isAdmin,

    // Special permissions
    canAddAncestors: isAdmin, // Only admins can add root-level parents
    canAddDescendants: roleLevel >= 2, // Members+ can add children (subject to restrictions)

    // Role info
    role: userRole,
    isAdmin,
    isMember,
    isViewer,
  };
}
