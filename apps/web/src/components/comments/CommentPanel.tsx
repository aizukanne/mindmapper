import { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, Filter, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CommentThread } from './CommentThread';

interface CommentUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  email: string;
}

interface Comment {
  id: string;
  text: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  node?: { id: string; text: string } | null;
  replies?: Comment[];
}

interface CommentPanelProps {
  mapId: string;
  currentUserId?: string;
  isMapOwner?: boolean;
  selectedNodeId?: string | null;
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type FilterType = 'all' | 'open' | 'resolved';

export function CommentPanel({
  mapId,
  currentUserId,
  isMapOwner,
  selectedNodeId,
  onClose,
}: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'open') params.set('resolved', 'false');
      if (filter === 'resolved') params.set('resolved', 'true');

      const response = await fetch(
        `${API_URL}/api/maps/${mapId}/comments?${params}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  }, [mapId, filter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Create a new comment
  const handleCreateComment = async () => {
    if (!newCommentText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: newCommentText,
          nodeId: selectedNodeId || null,
        }),
      });

      if (response.ok) {
        setNewCommentText('');
        setIsComposing(false);
        await fetchComments();
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Reply to a comment
  const handleReply = async (parentId: string, text: string) => {
    const response = await fetch(`${API_URL}/api/maps/${mapId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text, parentId }),
    });

    if (response.ok) {
      await fetchComments();
    }
  };

  // Update a comment
  const handleUpdate = async (
    commentId: string,
    data: { text?: string; resolved?: boolean }
  ) => {
    const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchComments();
    }
  };

  // Delete a comment
  const handleDelete = async (commentId: string) => {
    const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      await fetchComments();
    }
  };

  const openCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h2 className="font-semibold">Comments</h2>
          <span className="text-sm text-muted-foreground">
            ({openCount} open, {resolvedCount} resolved)
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1">
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <button
              key={f}
              className={`px-2 py-1 text-sm rounded ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => setIsComposing(true)}
          disabled={isComposing}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* New comment form */}
      {isComposing && (
        <div className="p-4 border-b border-border bg-muted/30">
          <Textarea
            placeholder={
              selectedNodeId
                ? 'Comment on selected node...'
                : 'Add a general comment...'
            }
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="min-h-[80px]"
            autoFocus
          />
          {selectedNodeId && (
            <p className="text-xs text-muted-foreground mt-1">
              This comment will be attached to the selected node
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={handleCreateComment}
              disabled={submitting || !newCommentText.trim()}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Post Comment
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsComposing(false);
                setNewCommentText('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {filter === 'all'
                ? 'No comments yet'
                : filter === 'open'
                ? 'No open comments'
                : 'No resolved comments'}
            </p>
            <p className="text-xs mt-1">
              Click "Add" to start a conversation
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              isMapOwner={isMapOwner}
              onReply={handleReply}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
