import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface HistoryEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  previousState: unknown;
  newState: unknown;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface RestoreConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: HistoryEvent | null;
  onConfirm: () => void;
  isRestoring: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CREATE: 'creation',
  UPDATE: 'update',
  DELETE: 'deletion',
  RESTORE: 'restore',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  NODE: 'node',
  CONNECTION: 'connection',
  MAP: 'map settings',
};

export function RestoreConfirmDialog({
  open,
  onOpenChange,
  event,
  onConfirm,
  isRestoring,
}: RestoreConfirmDialogProps) {
  if (!event) return null;

  const eventTypeLabel = EVENT_TYPE_LABELS[event.eventType] || event.eventType.toLowerCase();
  const entityTypeLabel = ENTITY_TYPE_LABELS[event.entityType] || event.entityType.toLowerCase();

  // Get a readable description of what will be restored
  const getRestoreDescription = () => {
    const previousState = event.previousState as Record<string, unknown> | null;

    if (event.eventType === 'DELETE') {
      return `This will recreate the deleted ${entityTypeLabel}.`;
    }

    if (event.eventType === 'UPDATE') {
      if (event.entityType === 'NODE' && previousState?.text) {
        const text = previousState.text as string;
        const truncatedText = text.length > 50 ? `${text.substring(0, 50)}...` : text;
        return `This will restore the ${entityTypeLabel} to its previous state: "${truncatedText}"`;
      }
      return `This will restore the ${entityTypeLabel} to its previous state.`;
    }

    return `This will undo the ${eventTypeLabel} of this ${entityTypeLabel}.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="restore-confirm-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-purple-600" />
            Restore to Previous Version
          </DialogTitle>
          <DialogDescription>
            You are about to restore a {entityTypeLabel} to its previous state.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Warning message */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                This action will modify your map
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                {getRestoreDescription()}
              </p>
            </div>
          </div>

          {/* Event details */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Event type:</span>
              <span className="font-medium capitalize">{eventTypeLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Entity:</span>
              <span className="font-medium capitalize">{entityTypeLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Changed by:</span>
              <span className="font-medium">
                {event.user.name || event.user.email?.split('@')[0] || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {new Date(event.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
            data-testid="restore-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isRestoring}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="restore-confirm-button"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
