import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertCircle, Cloud, CloudOff, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNetworkStatus, formatOfflineDuration } from '@/hooks/useNetworkStatus';
import type { OfflineSyncState } from '@/lib/offline-sync-manager';

interface OfflineIndicatorProps {
  className?: string;
  syncState?: OfflineSyncState | null;
  /** Whether to show as a full-width banner (for global usage) */
  variant?: 'banner' | 'pill';
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Whether the indicator can be dismissed */
  dismissible?: boolean;
}

export function OfflineIndicator({
  className,
  syncState,
  variant = 'pill',
  position = 'top',
  dismissible = false,
}: OfflineIndicatorProps) {
  const { isOnline, justReconnected, offlineSince, pendingSyncCount, syncStatus } = useNetworkStatus();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showSyncComplete, setShowSyncComplete] = useState(false);
  const [prevSyncStatus, setPrevSyncStatus] = useState<string | null>(null);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  // Show sync complete notification when syncing finishes
  useEffect(() => {
    // Check if we transitioned from syncing to synced
    if (syncState?.status === 'synced' && prevSyncStatus === 'syncing') {
      setShowSyncComplete(true);
      const timer = setTimeout(() => setShowSyncComplete(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevSyncStatus(syncState?.status || null);
  }, [syncState?.status, prevSyncStatus]);

  // Also track global sync status
  useEffect(() => {
    if (syncStatus === 'success' && pendingSyncCount === 0) {
      setShowSyncComplete(true);
      const timer = setTimeout(() => setShowSyncComplete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus, pendingSyncCount]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Determine what to display based on network and sync state
  const getDisplayState = () => {
    // Priority 1: Show offline state
    if (!isOnline || syncState?.status === 'offline') {
      const pendingCount = syncState?.pendingChanges || pendingSyncCount;
      const offlineTimeStr = formatOfflineDuration(offlineSince);

      return {
        show: true,
        type: 'offline' as const,
        icon: <WifiOff className="h-4 w-4" />,
        message: pendingCount
          ? `You're offline - ${pendingCount} change${pendingCount > 1 ? 's' : ''} saved locally`
          : "You're offline - changes will be saved locally",
        subMessage: offlineTimeStr || undefined,
        bgClass: variant === 'banner'
          ? 'bg-amber-500 text-white border-amber-600'
          : 'bg-yellow-100 text-yellow-800 border-yellow-200',
        iconClass: 'text-current',
        priority: 1,
      };
    }

    // Priority 2: Show syncing state
    if (syncState?.status === 'syncing' || (syncStatus === 'syncing' && pendingSyncCount > 0)) {
      const pendingCount = syncState?.pendingChanges || pendingSyncCount;
      return {
        show: true,
        type: 'syncing' as const,
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        message: pendingCount > 0
          ? `Syncing ${pendingCount} change${pendingCount > 1 ? 's' : ''}...`
          : 'Syncing...',
        bgClass: variant === 'banner'
          ? 'bg-blue-500 text-white border-blue-600'
          : 'bg-blue-100 text-blue-800 border-blue-200',
        iconClass: 'text-current',
        priority: 2,
      };
    }

    // Priority 3: Show error state
    if (syncState?.status === 'error' || syncStatus === 'error') {
      return {
        show: true,
        type: 'error' as const,
        icon: <AlertCircle className="h-4 w-4" />,
        message: syncState?.lastError || 'Sync error - changes saved locally',
        bgClass: variant === 'banner'
          ? 'bg-red-500 text-white border-red-600'
          : 'bg-red-100 text-red-800 border-red-200',
        iconClass: 'text-current',
        priority: 3,
      };
    }

    // Priority 4: Show sync complete
    if (showSyncComplete) {
      return {
        show: true,
        type: 'synced' as const,
        icon: <CheckCircle2 className="h-4 w-4" />,
        message: 'All changes synced',
        bgClass: variant === 'banner'
          ? 'bg-green-500 text-white border-green-600'
          : 'bg-green-100 text-green-800 border-green-200',
        iconClass: 'text-current',
        priority: 4,
      };
    }

    // Priority 5: Show reconnected
    if (justReconnected) {
      return {
        show: true,
        type: 'reconnected' as const,
        icon: <Wifi className="h-4 w-4" />,
        message: 'Back online',
        subMessage: pendingSyncCount > 0 ? `Syncing ${pendingSyncCount} pending changes...` : undefined,
        bgClass: variant === 'banner'
          ? 'bg-green-500 text-white border-green-600'
          : 'bg-green-100 text-green-800 border-green-200',
        iconClass: 'text-current',
        priority: 5,
      };
    }

    return { show: false, type: null, icon: null, message: '', bgClass: '', iconClass: '', priority: 99 };
  };

  const displayState = getDisplayState();

  // Don't show anything if nothing to display or dismissed (only allow dismissing non-critical states)
  if (!displayState.show || (isDismissed && displayState.type !== 'offline' && displayState.type !== 'error')) {
    return null;
  }

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'fixed z-50 transition-all duration-300 animate-in slide-in-from-top-2',
          positionClasses,
          className
        )}
        role="alert"
        aria-live="polite"
        data-testid="offline-banner"
      >
        <div
          className={cn(
            'flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium border-b shadow-sm',
            displayState.bgClass
          )}
        >
          <div className="flex items-center gap-2">
            {displayState.icon}
            <span>{displayState.message}</span>
            {displayState.subMessage && (
              <span className="opacity-80 text-xs">({displayState.subMessage})</span>
            )}
          </div>
          {dismissible && displayState.type !== 'offline' && displayState.type !== 'error' && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Pill variant (original style)
  return (
    <div
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-2',
        position === 'top' ? 'top-4' : 'bottom-4',
        className
      )}
      role="alert"
      aria-live="polite"
      data-testid="offline-indicator"
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium border backdrop-blur-sm',
          displayState.bgClass
        )}
      >
        {displayState.icon}
        <span>{displayState.message}</span>
        {displayState.subMessage && (
          <span className="text-xs opacity-75">- {displayState.subMessage}</span>
        )}
        {dismissible && displayState.type !== 'offline' && displayState.type !== 'error' && (
          <button
            onClick={handleDismiss}
            className="ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for embedding in toolbars
 */
interface CompactSyncStatusProps {
  syncState?: OfflineSyncState | null;
  className?: string;
}

export function CompactSyncStatus({ syncState, className }: CompactSyncStatusProps) {
  const { isOnline, pendingSyncCount, syncStatus } = useNetworkStatus();

  // Determine icon and color based on state
  const getStatus = () => {
    if (!isOnline || syncState?.status === 'offline') {
      const pendingCount = syncState?.pendingChanges || pendingSyncCount;
      return {
        icon: <CloudOff className="h-4 w-4" />,
        color: 'text-yellow-600',
        title: pendingCount
          ? `Offline - ${pendingCount} pending changes`
          : 'Offline',
      };
    }

    if (syncState?.status === 'syncing' || syncStatus === 'syncing') {
      const pendingCount = syncState?.pendingChanges || pendingSyncCount;
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        color: 'text-blue-600',
        title: pendingCount > 0 ? `Syncing ${pendingCount} changes...` : 'Syncing...',
      };
    }

    if (syncState?.status === 'error' || syncStatus === 'error') {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'text-red-600',
        title: syncState?.lastError || 'Sync error',
      };
    }

    return {
      icon: <Cloud className="h-4 w-4" />,
      color: 'text-green-600',
      title: 'Synced',
    };
  };

  const status = getStatus();

  return (
    <div
      className={cn('flex items-center', status.color, className)}
      title={status.title}
      data-testid="compact-sync-status"
    >
      {status.icon}
    </div>
  );
}

/**
 * Global offline banner component for app-wide usage
 * Use this in App.tsx or layout components
 */
export function GlobalOfflineBanner() {
  return <OfflineIndicator variant="banner" position="top" dismissible />;
}
