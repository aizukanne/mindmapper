import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function CreateMapDialog({ open, onOpenChange, folderId }: CreateMapDialogProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    // Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a title for your mind map');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || undefined,
          folderId: folderId || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Reset form
        setTitle('');
        setDescription('');
        // Close dialog and navigate to editor
        onOpenChange(false);
        navigate(`/map/${data.data.id}`);
      } else {
        const errorData = await response.json().catch(() => null);
        setError(errorData?.message || 'Failed to create mind map. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create map:', error);
      setError('Failed to create mind map. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form when closing
      setTitle('');
      setDescription('');
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="create-map-dialog">
        <DialogHeader>
          <DialogTitle>Create New Mind Map</DialogTitle>
          <DialogDescription>
            Enter a title and optional description for your new mind map.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4" onKeyDown={handleKeyDown}>
          <div className="space-y-2">
            <Label htmlFor="map-title">Title</Label>
            <Input
              id="map-title"
              placeholder="Enter mind map title..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              disabled={creating}
              autoFocus
              data-testid="map-title-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="map-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="map-description"
              placeholder="Enter a brief description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creating}
              rows={3}
              data-testid="map-description-input"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" data-testid="create-map-error">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            data-testid="create-map-submit"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Mind Map
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
