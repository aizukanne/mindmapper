/**
 * SyncStatusIndicator Component
 *
 * Displays the current sync status of the mind map with the backend.
 * Shows syncing animation, error states, and pending changes count.
 */

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  isSyncing: boolean;
  syncError: string | null;
  pendingChanges: number;
  onDismissError?: () => void;
}

export function SyncStatusIndicator({
  isSyncing,
  syncError,
  pendingChanges,
  onDismissError,
}: SyncStatusIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);
  const [wassyncing, setWasSyncing] = useState(false);

  // Show "Saved" indicator briefly after sync completes
  useEffect(() => {
    if (wassyncing && !isSyncing && !syncError) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    setWasSyncing(isSyncing);
  }, [isSyncing, syncError, wassyncing]);

  // Don't show anything if no state to display
  if (!isSyncing && !syncError && !showSaved && pendingChanges === 0) {
    return null;
  }

  return (
    <>
      {/* Sync status badge in bottom-left corner */}
      <div
        className={cn(
          'fixed bottom-4 left-4 z-50',
          'flex items-center gap-2 px-3 py-2 rounded-full',
          'bg-white/90 backdrop-blur-sm border shadow-sm',
          'text-sm font-medium transition-all duration-300',
          syncError && 'border-red-200 bg-red-50/90',
          isSyncing && 'border-blue-200 bg-blue-50/90',
          showSaved && 'border-green-200 bg-green-50/90'
        )}
        data-testid="sync-status-indicator"
      >
        {/* Syncing state */}
        {isSyncing && (
          <>
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-blue-700">Saving...</span>
          </>
        )}

        {/* Error state */}
        {syncError && !isSyncing && (
          <>
            <CloudOff className="w-4 h-4 text-red-500" />
            <span className="text-red-700 max-w-[200px] truncate" title={syncError}>
              Sync failed
            </span>
            {onDismissError && (
              <button
                onClick={onDismissError}
                className="ml-1 p-0.5 rounded-full hover:bg-red-100 transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3 text-red-500" />
              </button>
            )}
          </>
        )}

        {/* Saved state */}
        {showSaved && !isSyncing && !syncError && (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-700">Saved</span>
          </>
        )}

        {/* Pending changes (when not syncing and no error) */}
        {pendingChanges > 0 && !isSyncing && !syncError && !showSaved && (
          <>
            <Cloud className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {pendingChanges} unsaved change{pendingChanges !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {/* Error toast for detailed error message */}
      {syncError && !isSyncing && (
        <div
          className={cn(
            'fixed bottom-16 left-4 z-50',
            'max-w-sm p-4 rounded-lg',
            'bg-red-50 border border-red-200 shadow-lg',
            'animate-in slide-in-from-bottom-2 fade-in duration-300'
          )}
          data-testid="sync-error-toast"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-red-800">Sync Error</p>
              <p className="mt-1 text-sm text-red-600 break-words">{syncError}</p>
              <p className="mt-2 text-xs text-red-500">
                Your changes are saved locally and will sync when connection is restored.
              </p>
            </div>
            {onDismissError && (
              <button
                onClick={onDismissError}
                className="p-1 rounded hover:bg-red-100 transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
