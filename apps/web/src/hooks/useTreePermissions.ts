import { useMemo } from 'react';
import type { TreeRole } from '@mindmapper/types';

interface TreePermissionsContext {
  userId: string | null;
  treeCreatorId: string;
  userRole: TreeRole | null;
  isCreator: boolean;
  linkedPersonId?: string | null;
}

interface TreePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddPeople: boolean;
  canEditPeople: boolean;
  canDeletePeople: boolean;
  canAddRelationships: boolean;
  canDeleteRelationships: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canChangeSettings: boolean;
  canAddAncestors: boolean;
  canAddDescendants: boolean;
  role: TreeRole | null;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  /**
   * For MEMBERs: The person they are linked to in the tree.
   * MEMBERs can only edit themselves and their descendants.
   * ADMINs can edit anyone (linkedPersonId is not relevant for them).
   */
  linkedPersonId: string | null;
  /**
   * Whether the user has restricted editing (MEMBER role).
   * If true, edits are limited to self and descendants only.
   */
  hasRestrictedEditing: boolean;
}

/**
 * Hook to check user permissions within a family tree
 *
 * Permission Rules:
 * - ADMIN: Can edit anyone in the tree
 * - MEMBER: Can edit self (linked person) and descendants only
 * - VIEWER: Read-only access
 *
 * @param context - Tree permission context with user and tree info
 * @returns Object with boolean flags for various permissions
 */
export function useTreePermissions(context: TreePermissionsContext): TreePermissions {
  const { userId, treeCreatorId, userRole, isCreator, linkedPersonId } = context;

  return useMemo(() => {
    // No user logged in
    if (!userId) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canAddPeople: false,
        canEditPeople: false,
        canDeletePeople: false,
        canAddRelationships: false,
        canDeleteRelationships: false,
        canInviteMembers: false,
        canManageMembers: false,
        canChangeSettings: false,
        canAddAncestors: false,
        canAddDescendants: false,
        role: null,
        isAdmin: false,
        isMember: false,
        isViewer: false,
        linkedPersonId: null,
        hasRestrictedEditing: false,
      };
    }

    // Determine effective role
    const effectiveRole = isCreator ? 'ADMIN' : userRole;
    const isAdmin = effectiveRole === 'ADMIN';
    const isMember = effectiveRole === 'MEMBER';
    const isViewer = effectiveRole === 'VIEWER';

    // Role hierarchy levels
    const roleHierarchy: Record<string, number> = {
      ADMIN: 3,
      MEMBER: 2,
      VIEWER: 1,
    };
    const roleLevel = roleHierarchy[effectiveRole || 'VIEWER'] || 0;

    // Members have restricted editing - they can only edit self and descendants
    const hasRestrictedEditing = isMember;

    return {
      // Basic permissions
      canView: roleLevel >= 1,
      canEdit: roleLevel >= 2,
      canDelete: isAdmin,

      // People management
      // Note: For MEMBER role, canEditPeople is subject to additional restrictions:
      // - Members can only edit their own person record or descendants
      // - This is enforced server-side; frontend should use canEditPerson(personId) helper
      canAddPeople: roleLevel >= 2, // MEMBER and above
      canEditPeople: roleLevel >= 2, // Subject to descendant restrictions for members
      canDeletePeople: isAdmin,

      // Relationship management
      // Note: For MEMBER role, canAddRelationships is subject to restrictions:
      // - Members can only add relationships involving self or descendants
      canAddRelationships: roleLevel >= 2,
      canDeleteRelationships: isAdmin,

      // Member management
      canInviteMembers: isAdmin,
      canManageMembers: isAdmin,

      // Tree settings
      canChangeSettings: isAdmin,

      // Special: Only admins can add ancestors (root-level parents)
      canAddAncestors: isAdmin,

      // Special: Members and above can add descendants (children)
      // For members, this is limited to adding descendants of their linked person
      canAddDescendants: roleLevel >= 2,

      // Role information
      role: effectiveRole,
      isAdmin,
      isMember,
      isViewer,

      // Member-specific editing info
      linkedPersonId: linkedPersonId || null,
      hasRestrictedEditing,
    };
  }, [userId, treeCreatorId, userRole, isCreator, linkedPersonId]);
}
