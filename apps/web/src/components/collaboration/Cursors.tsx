import { useEffect, useState, useCallback } from 'react';

interface CursorState {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

interface CursorsProps {
  awarenessStates: CursorState[];
  currentUserId?: string;
}

export function Cursors({ awarenessStates, currentUserId }: CursorsProps) {

  // Filter out current user and users without cursor position
  const otherUsers = awarenessStates.filter(
    (state) => state.id !== currentUserId && state.cursor
  );

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {otherUsers.map((user) => {
        if (!user.cursor) return null;

        return (
          <div
            key={user.id}
            className="absolute transition-all duration-75 ease-out"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M5.65376 12.4563L7.23124 17.5541C7.47911 18.3452 8.24549 18.8585 9.07489 18.7925L14.8298 18.3263C15.5695 18.2664 16.2142 17.7908 16.4866 17.0939L20.2175 7.81711C20.5722 6.89555 19.8695 5.92455 18.8931 6.01258L4.60875 7.29808C3.68206 7.38136 3.13469 8.39108 3.56966 9.21277L5.34726 12.5807C5.48879 12.8419 5.56343 13.1323 5.56343 13.4281V13.4281"
                fill={user.color}
              />
              <path
                d="M5.65376 12.4563L7.23124 17.5541C7.47911 18.3452 8.24549 18.8585 9.07489 18.7925L14.8298 18.3263C15.5695 18.2664 16.2142 17.7908 16.4866 17.0939L20.2175 7.81711C20.5722 6.89555 19.8695 5.92455 18.8931 6.01258L4.60875 7.29808C3.68206 7.38136 3.13469 8.39108 3.56966 9.21277L5.34726 12.5807C5.48879 12.8419 5.56343 13.1323 5.56343 13.4281V13.4281"
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* User name label */}
            <div
              className="absolute left-5 top-3 rounded-md px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface UseRemoteCursorsOptions {
  getAwarenessStates: () => CursorState[];
  updateCursor: (x: number, y: number) => void;
}

export function useRemoteCursors({
  getAwarenessStates,
  updateCursor,
}: UseRemoteCursorsOptions) {
  const [awarenessStates, setAwarenessStates] = useState<CursorState[]>([]);

  // Poll for awareness state updates
  useEffect(() => {
    const interval = setInterval(() => {
      const states = getAwarenessStates();
      setAwarenessStates(states);
    }, 100);

    return () => clearInterval(interval);
  }, [getAwarenessStates]);

  // Track mouse movement
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      // Throttle updates
      const now = Date.now();
      if ((handleMouseMove as { lastUpdate?: number }).lastUpdate &&
          now - (handleMouseMove as { lastUpdate?: number }).lastUpdate! < 50) {
        return;
      }
      (handleMouseMove as { lastUpdate?: number }).lastUpdate = now;

      updateCursor(event.clientX, event.clientY);
    },
    [updateCursor]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return { awarenessStates };
}
