import { useState, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Check, MoreHorizontal, Reply, Trash2, Edit2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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

interface CommentThreadProps {
  comment: Comment;
  currentUserId?: string;
  isMapOwner?: boolean;
  onReply: (parentId: string, text: string) => Promise<void>;
  onUpdate: (commentId: string, data: { text?: string; resolved?: boolean }) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

// Maximum nesting depth for replies
const MAX_NESTING_DEPTH = 3;

// Format timestamp with relative time and tooltip with exact time
function formatTimestamp(dateString: string): { relative: string; exact: string } {
  const date = new Date(dateString);
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: format(date, 'MMM d, yyyy \'at\' h:mm a'),
  };
}

// Generate avatar color based on user id for consistency
function getAvatarColor(userId: string): string {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#22c55e', // green
    '#14b8a6', // teal
    '#6366f1', // indigo
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get user initials for avatar
function getInitials(user: CommentUser): string {
  if (user.name) {
    return user.name.charAt(0).toUpperCase();
  }
  return user.email.charAt(0).toUpperCase();
}

// Get display name for user
function getDisplayName(user: CommentUser): string {
  return user.name || user.email.split('@')[0];
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  isMapOwner?: boolean;
  depth: number;
  isRootComment: boolean;
  onReply: (parentId: string, text: string) => Promise<void>;
  onUpdate: (commentId: string, data: { text?: string; resolved?: boolean }) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

// Individual comment item component (used for both root and replies)
function CommentItem({
  comment,
  currentUserId,
  isMapOwner,
  depth,
  isRootComment,
  onReply,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState(comment.text);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTimestampTooltip, setShowTimestampTooltip] = useState(false);

  const isAuthor = currentUserId === comment.user.id;
  const canModify = isAuthor || isMapOwner;
  const canReply = depth < MAX_NESTING_DEPTH;
  const timestamp = formatTimestamp(comment.createdAt);
  const avatarSize = isRootComment ? 'w-8 h-8' : 'w-6 h-6';
  const avatarTextSize = isRootComment ? 'text-xs' : 'text-[10px]';

  const handleReply = useCallback(async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await onReply(comment.id, replyText);
      setReplyText('');
      setIsReplying(false);
    } finally {
      setLoading(false);
    }
  }, [replyText, comment.id, onReply]);

  const handleEdit = useCallback(async () => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      await onUpdate(comment.id, { text: editText });
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  }, [editText, comment.id, onUpdate]);

  const handleResolve = useCallback(async () => {
    await onUpdate(comment.id, { resolved: !comment.resolved });
  }, [comment.id, comment.resolved, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this comment?')) {
      await onDelete(comment.id);
    }
  }, [comment.id, onDelete]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(comment.text);
  }, [comment.text]);

  const handleCancelReply = useCallback(() => {
    setIsReplying(false);
    setReplyText('');
  }, []);

  return (
    <div className="relative">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            avatarSize,
            'rounded-full flex items-center justify-center font-medium text-white shrink-0'
          )}
          style={{ backgroundColor: getAvatarColor(comment.user.id) }}
        >
          {comment.user.avatarUrl ? (
            <img
              src={comment.user.avatarUrl}
              alt={getDisplayName(comment.user)}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className={avatarTextSize}>{getInitials(comment.user)}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with name, timestamp, and resolved badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{getDisplayName(comment.user)}</span>

            {/* Timestamp with tooltip */}
            <div
              className="relative"
              onMouseEnter={() => setShowTimestampTooltip(true)}
              onMouseLeave={() => setShowTimestampTooltip(false)}
            >
              <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                <Clock className="h-3 w-3" />
                {timestamp.relative}
              </span>
              {showTimestampTooltip && (
                <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border whitespace-nowrap z-50">
                  {timestamp.exact}
                </div>
              )}
            </div>

            {/* Resolved badge (only on root comments) */}
            {isRootComment && comment.resolved && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                <CheckCircle className="h-3 w-3" />
                Resolved
              </span>
            )}
          </div>

          {/* Node reference (only on root comments) */}
          {isRootComment && comment.node && (
            <div className="mt-1 text-xs text-muted-foreground">
              On: <span className="font-medium">{comment.node.text}</span>
            </div>
          )}

          {/* Comment text or edit form */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[60px]"
                data-testid="edit-textarea"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit} disabled={loading} data-testid="save-edit-btn">
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm whitespace-pre-wrap" data-testid="comment-text">
              {comment.text}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 mt-2">
              {canReply && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsReplying(!isReplying)}
                  data-testid="reply-btn"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}

              {canModify && (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setShowMenu(!showMenu)}
                    data-testid="menu-btn"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                      />
                      <div
                        className="absolute left-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[120px]"
                        data-testid="action-menu"
                      >
                        {/* Resolve button - only on root comments */}
                        {isRootComment && (
                          <button
                            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                            onClick={() => {
                              handleResolve();
                              setShowMenu(false);
                            }}
                            data-testid="resolve-btn"
                          >
                            <Check className="h-3 w-3" />
                            {comment.resolved ? 'Unresolve' : 'Resolve'}
                          </button>
                        )}
                        {isAuthor && (
                          <button
                            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                            onClick={() => {
                              setIsEditing(true);
                              setShowMenu(false);
                            }}
                            data-testid="edit-btn"
                          >
                            <Edit2 className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                        <button
                          className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                          onClick={() => {
                            handleDelete();
                            setShowMenu(false);
                          }}
                          data-testid="delete-btn"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px]"
                autoFocus
                data-testid="reply-textarea"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={loading || !replyText.trim()}
                  data-testid="submit-reply-btn"
                >
                  Reply
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelReply}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isMapOwner={isMapOwner}
                  depth={depth + 1}
                  isRootComment={false}
                  onReply={onReply}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main CommentThread component
export function CommentThread({
  comment,
  currentUserId,
  isMapOwner,
  onReply,
  onUpdate,
  onDelete,
}: CommentThreadProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        comment.resolved
          ? 'bg-muted/50 border-muted'
          : 'bg-background border-border'
      )}
      data-testid="comment-thread"
    >
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        isMapOwner={isMapOwner}
        depth={0}
        isRootComment={true}
        onReply={onReply}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}
