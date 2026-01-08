import { useMemo } from 'react';
import type { ActivityStatus } from '@mindmapper/types';
import { RemoteCursor } from './RemoteCursor';

/**
 * Legacy cursor state format (backwards compatibility)
 */
interface LegacyCursorState {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
  avatarUrl?: string;
}

/**
 * Enhanced cursor state with activity tracking
 */
interface EnhancedCursorState {
  userId: string;
  userName: string;
  userColor: string;
  avatarUrl?: string;
  cursor: { x: number; y: number; canvasX?: number; canvasY?: number } | null;
  selectedNodeIds: string[];
  activityStatus: ActivityStatus;
  lastActiveAt: number;
  isEditingNodeId: string | null;
}

type CursorState = LegacyCursorState | EnhancedCursorState;

/**
 * Normalized cursor state for rendering
 */
interface NormalizedCursorState {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  cursor: { x: number; y: number } | null;
  activityStatus: ActivityStatus;
  isEditing: boolean;
}

/**
 * Normalize cursor state to handle both legacy and enhanced formats
 */
function normalizeCursorState(state: CursorState): NormalizedCursorState {
  if ('userId' in state) {
    // Enhanced format
    return {
      id: state.userId,
      name: state.userName,
      color: state.userColor,
      avatarUrl: state.avatarUrl,
      cursor: state.cursor,
      activityStatus: state.activityStatus,
      isEditing: state.isEditingNodeId !== null,
    };
  } else {
    // Legacy format
    return {
      id: state.id,
      name: state.name,
      color: state.color,
      avatarUrl: state.avatarUrl,
      cursor: state.cursor,
      activityStatus: 'active',
      isEditing: false,
    };
  }
}

interface CursorsProps {
  /** Array of awareness states from other users */
  awarenessStates: CursorState[];
  /** Current user's ID to exclude from rendering */
  currentUserId?: string;
  /** Whether to show activity status indicators (default: true) */
  showActivityStatus?: boolean;
  /** Animation duration in ms for smooth cursor movement (default: 150) */
  animationDuration?: number;
  /** Whether to show user name labels (default: true) */
  showLabels?: boolean;
}

/**
 * Cursors component renders all remote user cursors on the canvas.
 *
 * This component serves as the container for all RemoteCursor components,
 * handling the filtering of the current user and normalization of different
 * cursor state formats (legacy and enhanced).
 *
 * Features:
 * - Supports both legacy and enhanced cursor state formats
 * - Filters out the current user's cursor
 * - Renders smooth animated cursors for all remote users
 * - Shows activity status, editing indicators, and user names
 */
export function Cursors({
  awarenessStates,
  currentUserId,
  showActivityStatus = true,
  animationDuration = 150,
  showLabels = true,
}: CursorsProps) {
  // Normalize and filter states - exclude current user and users without cursor
  const otherUsers = useMemo(() => {
    return awarenessStates
      .map(normalizeCursorState)
      .filter((state): state is NormalizedCursorState & { cursor: { x: number; y: number } } =>
        state.id !== currentUserId && state.cursor !== null
      );
  }, [awarenessStates, currentUserId]);

  // Don't render anything if no other users have cursors
  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
      data-testid="remote-cursors"
      aria-live="polite"
      aria-label={`${otherUsers.length} other user${otherUsers.length === 1 ? '' : 's'} connected`}
    >
      {otherUsers.map((user) => (
        <RemoteCursor
          key={user.id}
          userId={user.id}
          userName={user.name}
          userColor={user.color}
          avatarUrl={user.avatarUrl}
          x={user.cursor.x}
          y={user.cursor.y}
          activityStatus={user.activityStatus}
          isEditing={user.isEditing}
          animationDuration={animationDuration}
          showLabel={showLabels}
          showActivityIndicator={showActivityStatus}
        />
      ))}
    </div>
  );
}

interface UseRemoteCursorsOptions {
  getAwarenessStates: () => CursorState[];
  updateCursor?: (x: number, y: number) => void;
}

export function useRemoteCursors({
  getAwarenessStates,
  // updateCursor is kept for backwards compatibility but not used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateCursor: _updateCursor,
}: UseRemoteCursorsOptions) {
  // This hook is now mostly handled by usePresence
  // Keeping for backwards compatibility
  return {
    awarenessStates: getAwarenessStates(),
  };
}
