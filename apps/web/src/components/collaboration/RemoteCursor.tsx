import { memo, useMemo, useRef, useEffect, useState } from 'react';
import type { ActivityStatus } from '@mindmapper/types';
import { cn } from '@/lib/utils';

/**
 * Props for the RemoteCursor component
 */
export interface RemoteCursorProps {
  /** Unique user identifier */
  userId: string;
  /** Display name of the user */
  userName: string;
  /** User's assigned color (hex format) */
  userColor: string;
  /** Optional avatar URL */
  avatarUrl?: string;
  /** Cursor X position on canvas */
  x: number;
  /** Cursor Y position on canvas */
  y: number;
  /** User's activity status */
  activityStatus?: ActivityStatus;
  /** Whether the user is currently editing a node */
  isEditing?: boolean;
  /** Animation duration in ms (default: 150) */
  animationDuration?: number;
  /** Whether to show the user name label */
  showLabel?: boolean;
  /** Whether to show activity status indicator */
  showActivityIndicator?: boolean;
}

/**
 * Get opacity based on activity status
 */
function getActivityOpacity(status: ActivityStatus): number {
  switch (status) {
    case 'active':
      return 1;
    case 'idle':
      return 0.7;
    case 'away':
      return 0.4;
    default:
      return 1;
  }
}

/**
 * Get status indicator color based on activity
 */
function getStatusIndicatorColor(status: ActivityStatus): string {
  switch (status) {
    case 'active':
      return '#22c55e'; // green-500
    case 'idle':
      return '#eab308'; // yellow-500
    case 'away':
      return '#9ca3af'; // gray-400
    default:
      return '#22c55e';
  }
}

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * RemoteCursor component renders a single remote user's cursor with smooth animations.
 *
 * Features:
 * - Smooth position interpolation for fluid movement
 * - Activity-based opacity and visual indicators
 * - User name label with customizable appearance
 * - Editing indicator when user is modifying content
 * - Pulse animation for idle/away states
 * - Avatar support (with fallback to initials)
 */
export const RemoteCursor = memo(function RemoteCursor({
  userId,
  userName,
  userColor,
  avatarUrl,
  x,
  y,
  activityStatus = 'active',
  isEditing = false,
  animationDuration = 150,
  showLabel = true,
  showActivityIndicator = true,
}: RemoteCursorProps) {
  // Track interpolated position for smooth animations
  const [smoothPosition, setSmoothPosition] = useState({ x, y });
  const animationFrameRef = useRef<number | null>(null);
  const targetPositionRef = useRef({ x, y });
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Update target position when props change
  useEffect(() => {
    targetPositionRef.current = { x, y };
    lastUpdateTimeRef.current = Date.now();
  }, [x, y]);

  // Smooth position interpolation using requestAnimationFrame
  useEffect(() => {
    let isActive = true;

    const interpolate = () => {
      if (!isActive) return;

      const target = targetPositionRef.current;
      const elapsed = Date.now() - lastUpdateTimeRef.current;

      // Use exponential smoothing for natural feel
      // Faster interpolation for recent updates, slower for older ones
      const factor = Math.min(1, elapsed / animationDuration);
      const smoothingFactor = 0.15 + (factor * 0.35); // Range: 0.15 to 0.5

      setSmoothPosition((current) => {
        const dx = target.x - current.x;
        const dy = target.y - current.y;

        // If very close to target, snap to it
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          return target;
        }

        return {
          x: current.x + dx * smoothingFactor,
          y: current.y + dy * smoothingFactor,
        };
      });

      animationFrameRef.current = requestAnimationFrame(interpolate);
    };

    animationFrameRef.current = requestAnimationFrame(interpolate);

    return () => {
      isActive = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationDuration]);

  // Memoize computed styles
  const opacity = useMemo(() => getActivityOpacity(activityStatus), [activityStatus]);
  const statusColor = useMemo(() => getStatusIndicatorColor(activityStatus), [activityStatus]);
  const cursorGlow = useMemo(() => lightenColor(userColor, 30), [userColor]);

  // Get user initials for avatar fallback
  const initials = useMemo(() => {
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  }, [userName]);

  // Determine if cursor should pulse (idle or away)
  const shouldPulse = activityStatus !== 'active';

  return (
    <div
      className={cn(
        'absolute pointer-events-none will-change-transform',
        shouldPulse && 'animate-pulse-soft'
      )}
      style={{
        left: smoothPosition.x,
        top: smoothPosition.y,
        transform: 'translate(-2px, -2px)',
        opacity,
        transition: `opacity ${animationDuration}ms ease-out`,
      }}
      data-testid={`remote-cursor-${userId}`}
      data-user-name={userName}
      data-activity-status={activityStatus}
      aria-label={`${userName}'s cursor`}
    >
      {/* Cursor glow effect */}
      <div
        className="absolute -inset-1 rounded-full blur-sm opacity-40"
        style={{ backgroundColor: cursorGlow }}
      />

      {/* Main cursor arrow SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="relative drop-shadow-md"
        style={{ filter: `drop-shadow(0 2px 4px ${userColor}40)` }}
      >
        {/* Cursor arrow shape */}
        <path
          d="M5.65376 12.4563L7.23124 17.5541C7.47911 18.3452 8.24549 18.8585 9.07489 18.7925L14.8298 18.3263C15.5695 18.2664 16.2142 17.7908 16.4866 17.0939L20.2175 7.81711C20.5722 6.89555 19.8695 5.92455 18.8931 6.01258L4.60875 7.29808C3.68206 7.38136 3.13469 8.39108 3.56966 9.21277L5.34726 12.5807C5.48879 12.8419 5.56343 13.1323 5.56343 13.4281V13.4281"
          fill={userColor}
        />
        {/* White outline for visibility */}
        <path
          d="M5.65376 12.4563L7.23124 17.5541C7.47911 18.3452 8.24549 18.8585 9.07489 18.7925L14.8298 18.3263C15.5695 18.2664 16.2142 17.7908 16.4866 17.0939L20.2175 7.81711C20.5722 6.89555 19.8695 5.92455 18.8931 6.01258L4.60875 7.29808C3.68206 7.38136 3.13469 8.39108 3.56966 9.21277L5.34726 12.5807C5.48879 12.8419 5.56343 13.1323 5.56343 13.4281V13.4281"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* User label with name and status */}
      {showLabel && (
        <div
          className={cn(
            'absolute left-5 top-4 flex items-center gap-1.5',
            'rounded-full px-2.5 py-1 shadow-lg',
            'text-xs font-medium text-white whitespace-nowrap',
            'transform transition-all duration-200 ease-out',
            'hover:scale-105'
          )}
          style={{
            backgroundColor: userColor,
            boxShadow: `0 2px 8px ${userColor}50`,
          }}
        >
          {/* Avatar or initials */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-4 h-4 rounded-full object-cover ring-1 ring-white/30"
            />
          ) : (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ring-1 ring-white/30"
              style={{ backgroundColor: lightenColor(userColor, -20) }}
            >
              {initials}
            </span>
          )}

          {/* Activity status indicator */}
          {showActivityIndicator && (
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                activityStatus === 'active' && 'animate-pulse'
              )}
              style={{ backgroundColor: statusColor }}
              title={`Status: ${activityStatus}`}
            />
          )}

          {/* User name */}
          <span className="max-w-[100px] truncate">{userName}</span>

          {/* Editing indicator */}
          {isEditing && (
            <span className="flex items-center gap-0.5 opacity-80" title="Editing">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="animate-bounce-soft"
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </span>
          )}
        </div>
      )}
    </div>
  );
});

RemoteCursor.displayName = 'RemoteCursor';

export default RemoteCursor;
