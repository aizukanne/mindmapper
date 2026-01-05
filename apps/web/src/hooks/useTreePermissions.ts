import { useMemo } from 'react';
import type { TreeRole } from '@mindmapper/types';

interface TreePermissionsContext {
  userId: string | null;
  treeCreatorId: string;
  userRole: TreeRole | null;
  isCreator: boolean;
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
}

/**
 * Hook to check user permissions within a family tree
 * @param context - Tree permission context with user and tree info
 * @returns Object with boolean flags for various permissions
 */
export function useTreePermissions(context: TreePermissionsContext): TreePermissions {
  const { userId, treeCreatorId, userRole, isCreator } = context;

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

    return {
      // Basic permissions
      canView: roleLevel >= 1,
      canEdit: roleLevel >= 2,
      canDelete: isAdmin,

      // People management
      canAddPeople: roleLevel >= 2, // MEMBER and above
      canEditPeople: roleLevel >= 2,
      canDeletePeople: isAdmin,

      // Relationship management
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
      canAddDescendants: roleLevel >= 2,

      // Role information
      role: effectiveRole,
      isAdmin,
      isMember,
      isViewer,
    };
  }, [userId, treeCreatorId, userRole, isCreator]);
}
