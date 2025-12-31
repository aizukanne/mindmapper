import { useMemo } from 'react';

interface PresenceState {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

interface PresenceListProps {
  awarenessStates: PresenceState[];
  currentUserId?: string;
}

export function PresenceList({ awarenessStates, currentUserId }: PresenceListProps) {
  const otherUsers = useMemo(
    () => awarenessStates.filter((state) => state.id !== currentUserId),
    [awarenessStates, currentUserId]
  );

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {/* Show avatars for up to 4 users */}
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 4).map((user) => (
          <div
            key={user.id}
            className="relative"
            title={user.name}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            {/* Online indicator */}
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background"
              style={{ backgroundColor: user.cursor ? '#22c55e' : '#9ca3af' }}
            />
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
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PresenceAvatar({
  name,
  color,
  isActive = true,
  size = 'md',
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

  return (
    <div className="relative" title={name}>
      <div
        className={`${sizeClasses[size]} rounded-full border-2 border-background flex items-center justify-center font-medium text-white`}
        style={{ backgroundColor: color }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <span
        className={`absolute bottom-0 right-0 ${indicatorSize[size]} rounded-full border-2 border-background`}
        style={{ backgroundColor: isActive ? '#22c55e' : '#9ca3af' }}
      />
    </div>
  );
}
