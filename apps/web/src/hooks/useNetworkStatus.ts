/**
 * useNetworkStatus Hook
 *
 * Centralized hook for monitoring network connectivity status.
 * Provides online/offline detection, sync status tracking, and
 * notifications when connection is restored.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';

export interface NetworkStatus {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Whether we just reconnected (for showing "Back online" notification) */
  justReconnected: boolean;
  /** Timestamp of when we went offline */
  offlineSince: Date | null;
  /** Timestamp of last successful connection */
  lastOnlineAt: Date | null;
  /** Whether we're currently attempting to reconnect */
  isReconnecting: boolean;
  /** Number of pending sync items */
  pendingSyncCount: number;
  /** Current sync status */
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
}

export interface UseNetworkStatusOptions {
  /** How long to show "just reconnected" state (ms) */
  reconnectedDuration?: number;
  /** Callback when going online */
  onOnline?: () => void;
  /** Callback when going offline */
  onOffline?: () => void;
  /** Callback when sync completes */
  onSyncComplete?: () => void;
}

/**
 * Hook for monitoring network connectivity status
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkStatus {
  const {
    reconnectedDuration = 3000,
    onOnline,
    onOffline,
    onSyncComplete,
  } = options;

  // Get state from app store
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const goOnline = useAppStore((state) => state.goOnline);
  const goOffline = useAppStore((state) => state.goOffline);

  // Local state
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null
  );

  // Track previous online state for detecting transitions
  const wasOnlineRef = useRef(isOnline);
  const reconnectedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineAt(new Date());
    setOfflineSince(null);

    // Show "just reconnected" state if we were previously offline
    if (!wasOnlineRef.current) {
      setJustReconnected(true);

      // Clear any existing timeout
      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
      }

      // Auto-hide the reconnected state after duration
      reconnectedTimeoutRef.current = setTimeout(() => {
        setJustReconnected(false);
      }, reconnectedDuration);
    }

    wasOnlineRef.current = true;
    goOnline();
    onOnline?.();
  }, [reconnectedDuration, goOnline, onOnline]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setOfflineSince(new Date());
    setJustReconnected(false);
    wasOnlineRef.current = false;

    // Clear reconnected timeout if any
    if (reconnectedTimeoutRef.current) {
      clearTimeout(reconnectedTimeoutRef.current);
      reconnectedTimeoutRef.current = null;
    }

    goOffline();
    onOffline?.();
  }, [goOffline, onOffline]);

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial state
    const initialOnline = navigator.onLine;
    setIsOnline(initialOnline);
    wasOnlineRef.current = initialOnline;

    if (!initialOnline) {
      setOfflineSince(new Date());
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Clean up timeout
      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
      }
    };
  }, [handleOnline, handleOffline]);

  // Track sync status changes
  useEffect(() => {
    if (syncStatus === 'success') {
      onSyncComplete?.();
    }
  }, [syncStatus, onSyncComplete]);

  return {
    isOnline,
    justReconnected,
    offlineSince,
    lastOnlineAt,
    isReconnecting: connectionStatus === 'reconnecting',
    pendingSyncCount,
    syncStatus,
  };
}

/**
 * Format how long we've been offline
 */
export function formatOfflineDuration(offlineSince: Date | null): string {
  if (!offlineSince) return '';

  const now = new Date();
  const diffMs = now.getTime() - offlineSince.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m offline`;
  } else if (diffMins > 0) {
    return `${diffMins}m offline`;
  } else {
    return 'Just went offline';
  }
}

export default useNetworkStatus;
