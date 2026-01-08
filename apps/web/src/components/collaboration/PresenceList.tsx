import { useMemo } from 'react';
import type { ActivityStatus } from '@mindmapper/types';

/**
 * Legacy presence state format (backwards compatibility)
 */
interface LegacyPresenceState {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

/**
 * Enhanced presence state with activity tracking
 */
interface EnhancedPresenceState {
  userId: string;
  userName: string;
  userColor: string;
  avatarUrl?: string;
  cursor: { x: number; y: number } | null;
  selectedNodeIds: string[];
  activityStatus: ActivityStatus;
  lastActiveAt: number;
  isEditingNodeId: string | null;
  viewport?: { x: number; y: number; zoom: number } | null;
}

type PresenceState = LegacyPresenceState | EnhancedPresenceState;

/**
 * Normalize presence state to handle both legacy and enhanced formats
 */
function normalizePresenceState(state: PresenceState): {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  isActive: boolean;
  activityStatus: ActivityStatus;
  isEditing: boolean;
  lastActiveAt: number;
} {
  if ('userId' in state) {
    // Enhanced format
    return {
      id: state.userId,
      name: state.userName,
      color: state.userColor,
      avatarUrl: state.avatarUrl,
      isActive: state.cursor !== null,
      activityStatus: state.activityStatus,
      isEditing: state.isEditingNodeId !== null,
      lastActiveAt: state.lastActiveAt,
    };
  } else {
    // Legacy format
    return {
      id: state.id,
      name: state.name,
      color: state.color,
      isActive: state.cursor !== null,
      activityStatus: 'active',
      isEditing: false,
      lastActiveAt: Date.now(),
    };
  }
}

/**
 * Get status indicator color
 */
function getStatusColor(status: ActivityStatus, isActive: boolean): string {
  if (!isActive) return '#9ca3af'; // gray for no cursor

  switch (status) {
    case 'active':
      return '#22c55e'; // green
    case 'idle':
      return '#eab308'; // yellow
    case 'away':
      return '#9ca3af'; // gray
    default:
      return '#22c55e';
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: ActivityStatus, isActive: boolean): string {
  if (!isActive) return 'No cursor';

  switch (status) {
    case 'active':
      return 'Active';
    case 'idle':
      return 'Idle';
    case 'away':
      return 'Away';
    default:
      return 'Active';
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface PresenceListProps {
  awarenessStates: PresenceState[];
  currentUserId?: string;
  showActivityDetails?: boolean;
}

export function PresenceList({
  awarenessStates,
  currentUserId,
  showActivityDetails = false,
}: PresenceListProps) {
  const otherUsers = useMemo(
    () =>
      awarenessStates
        .map(normalizePresenceState)
        .filter((state) => state.id !== currentUserId),
    [awarenessStates, currentUserId]
  );

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1" data-testid="presence-list">
      {/* Show avatars for up to 4 users */}
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 4).map((user) => (
          <div
            key={user.id}
            className="relative group"
            title={`${user.name} - ${getStatusLabel(user.activityStatus, user.isActive)}`}
          >
            {/* Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-background object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Status indicator */}
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background"
              style={{
                backgroundColor: getStatusColor(user.activityStatus, user.isActive),
              }}
              data-testid={`status-indicator-${user.id}`}
              data-activity-status={user.activityStatus}
            />

            {/* Editing indicator (pulse animation) */}
            {user.isEditing && (
              <span
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-blue-500 animate-pulse"
                title="Editing"
              />
            )}

            {/* Tooltip on hover (if showActivityDetails) */}
            {showActivityDetails && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-popover text-popover-foreground text-xs rounded-lg shadow-lg px-3 py-2 whitespace-nowrap border border-border">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: getStatusColor(
                          user.activityStatus,
                          user.isActive
                        ),
                      }}
                    />
                    {getStatusLabel(user.activityStatus, user.isActive)}
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {formatRelativeTime(user.lastActiveAt)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show overflow count */}
      {otherUsers.length > 4 && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          +{otherUsers.length - 4}
        </div>
      )}

      {/* Label */}
      <span className="text-sm text-muted-foreground ml-2">
        {otherUsers.length === 1
          ? '1 collaborator'
          : `${otherUsers.length} collaborators`}
      </span>
    </div>
  );
}

interface PresenceAvatarProps {
  name: string;
  color: string;
  avatarUrl?: string;
  isActive?: boolean;
  activityStatus?: ActivityStatus;
  isEditing?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

export function PresenceAvatar({
  name,
  color,
  avatarUrl,
  isActive = true,
  activityStatus = 'active',
  isEditing = false,
  size = 'md',
  showStatus = true,
}: PresenceAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const indicatorSize = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const statusColor = getStatusColor(activityStatus, isActive);

  return (
    <div className="relative" title={name}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full border-2 border-background object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-background flex items-center justify-center font-medium text-white`}
          style={{ backgroundColor: color }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Status indicator */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${indicatorSize[size]} rounded-full border-2 border-background`}
          style={{ backgroundColor: statusColor }}
        />
      )}

      {/* Editing indicator */}
      {isEditing && (
        <span
          className={`absolute -top-0.5 -right-0.5 ${indicatorSize[size]} rounded-full border border-background bg-blue-500 animate-pulse`}
          title="Editing"
        />
      )}
    </div>
  );
}

/**
 * Detailed presence panel showing all collaborators with full info
 */
interface PresencePanelProps {
  awarenessStates: PresenceState[];
  currentUserId?: string;
  onUserClick?: (userId: string) => void;
}

export function PresencePanel({
  awarenessStates,
  currentUserId,
  onUserClick,
}: PresencePanelProps) {
  const otherUsers = useMemo(
    () =>
      awarenessStates
        .map(normalizePresenceState)
        .filter((state) => state.id !== currentUserId)
        .sort((a, b) => {
          // Sort by activity status: active > idle > away
          const statusOrder = { active: 0, idle: 1, away: 2 };
          return statusOrder[a.activityStatus] - statusOrder[b.activityStatus];
        }),
    [awarenessStates, currentUserId]
  );

  if (otherUsers.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No other collaborators
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1" data-testid="presence-panel">
      {otherUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => onUserClick?.(user.id)}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
        >
          <PresenceAvatar
            name={user.name}
            color={user.color}
            avatarUrl={user.avatarUrl}
            isActive={user.isActive}
            activityStatus={user.activityStatus}
            isEditing={user.isEditing}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: getStatusColor(
                    user.activityStatus,
                    user.isActive
                  ),
                }}
              />
              <span>{getStatusLabel(user.activityStatus, user.isActive)}</span>
              {user.isEditing && (
                <span className="text-blue-500">Editing</span>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatRelativeTime(user.lastActiveAt)}
          </div>
        </button>
      ))}
    </div>
  );
}
