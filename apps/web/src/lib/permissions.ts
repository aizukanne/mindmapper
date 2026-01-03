import type { TreeRole, PersonPrivacy } from '@mindmapper/types';

/**
 * Permission utility functions for family tree operations
 */

interface TreeContext {
  createdBy: string;
  privacy: 'PRIVATE' | 'FAMILY_ONLY' | 'PUBLIC';
}

interface PersonContext {
  privacy: PersonPrivacy;
  isLiving: boolean;
}

interface MemberContext {
  userId: string;
  role: TreeRole | null;
  isCreator: boolean;
}

/**
 * Check if user can view a family tree
 */
export function canViewTree(tree: TreeContext, member: MemberContext | null, _isPublic: boolean = false): boolean {
  // Public trees are visible to everyone
  if (tree.privacy === 'PUBLIC') return true;

  // No member context means user is not logged in or not a member
  if (!member) return false;

  // Creator can always view
  if (member.isCreator) return true;

  // Family-only trees require membership
  if (tree.privacy === 'FAMILY_ONLY') {
    return member.role !== null;
  }

  // Private trees require membership
  if (tree.privacy === 'PRIVATE') {
    return member.role !== null;
  }

  return false;
}

/**
 * Check if user can edit a person's information
 */
export function canEditPerson(member: MemberContext | null): boolean {
  if (!member || !member.role) return false;

  const roleLevel = {
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  }[member.role] || 0;

  return roleLevel >= 2; // MEMBER and above
}

/**
 * Check if user can delete a person
 */
export function canDeletePerson(member: MemberContext | null): boolean {
  if (!member) return false;
  return member.isCreator || member.role === 'ADMIN';
}

/**
 * Check if user can add a relationship
 */
export function canAddRelationship(member: MemberContext | null): boolean {
  if (!member || !member.role) return false;

  const roleLevel = {
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  }[member.role] || 0;

  return roleLevel >= 2; // MEMBER and above
}

/**
 * Check if user can delete a relationship
 */
export function canDeleteRelationship(member: MemberContext | null): boolean {
  if (!member) return false;
  return member.isCreator || member.role === 'ADMIN';
}

/**
 * Check if user can add ancestors (root-level parents)
 * This is admin-only to maintain tree integrity
 */
export function canAddAncestor(member: MemberContext | null): boolean {
  if (!member) return false;
  return member.isCreator || member.role === 'ADMIN';
}

/**
 * Check if user can add descendants (children)
 * Members can add children to their own node
 */
export function canAddDescendants(member: MemberContext | null): boolean {
  if (!member || !member.role) return false;

  const roleLevel = {
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  }[member.role] || 0;

  return roleLevel >= 2; // MEMBER and above
}

/**
 * Check if user can invite new members to the tree
 */
export function canInviteMembers(member: MemberContext | null): boolean {
  if (!member) return false;
  return member.isCreator || member.role === 'ADMIN';
}

/**
 * Check if user can manage members (promote/demote/remove)
 */
export function canManageMembers(member: MemberContext | null): boolean {
  if (!member) return false;
  return member.isCreator || member.role === 'ADMIN';
}

/**
 * Check if user can change tree settings
 */
export function canChangeTreeSettings(member: MemberContext | null): boolean {
  if (!member) return false;
  return member.isCreator || member.role === 'ADMIN';
}

/**
 * Check if user can delete the entire tree
 */
export function canDeleteTree(member: MemberContext | null): boolean {
  if (!member) return false;
  return member.isCreator || member.role === 'ADMIN';
}

/**
 * Check if person details should be visible based on privacy settings
 */
export function canViewPersonDetails(person: PersonContext, member: MemberContext | null, _treePrivacy: 'PRIVATE' | 'FAMILY_ONLY' | 'PUBLIC'): boolean {
  // Public person info is always visible if tree is accessible
  if (person.privacy === 'PUBLIC') return true;

  // No member means not logged in or not a member
  if (!member || !member.role) return false;

  // FAMILY_ONLY person details visible to all tree members
  if (person.privacy === 'FAMILY_ONLY') {
    return member.role !== null;
  }

  // PRIVATE details only visible to admins
  if (person.privacy === 'PRIVATE') {
    return member.isCreator || member.role === 'ADMIN';
  }

  return false;
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: TreeRole | null): string {
  if (!role) return 'No Access';
  return {
    ADMIN: 'Administrator',
    MEMBER: 'Member',
    VIEWER: 'Viewer',
  }[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: TreeRole): string {
  return {
    ADMIN: 'Full access to manage tree, members, and settings',
    MEMBER: 'Can add and edit people and relationships',
    VIEWER: 'Can only view the family tree',
  }[role];
}

/**
 * Validate if role change is allowed
 * @param currentUserRole - Role of user making the change
 * @param targetMemberId - ID of member being changed
 * @param currentUserId - ID of user making the change
 * @param isCreator - Whether current user is the tree creator
 * @returns Error message if not allowed, null if allowed
 */
export function validateRoleChange(
  currentUserRole: TreeRole | null,
  targetMemberId: string,
  currentUserId: string,
  isCreator: boolean
): string | null {
  // Only admins can change roles
  if (!isCreator && currentUserRole !== 'ADMIN') {
    return 'Only administrators can change member roles';
  }

  // Cannot change your own role
  if (targetMemberId === currentUserId) {
    return 'You cannot change your own role';
  }

  return null;
}

/**
 * Check if demoting/removing member would leave tree without admins
 */
export function wouldLeaveTreeWithoutAdmin(
  currentAdminCount: number,
  targetRole: TreeRole,
  newRole: TreeRole | null
): boolean {
  // If removing or demoting an admin, check if it's the last one
  if (targetRole === 'ADMIN' && newRole !== 'ADMIN') {
    return currentAdminCount <= 1;
  }
  return false;
}
