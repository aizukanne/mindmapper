import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, MoreHorizontal, Reply, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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

export function CommentThread({
  comment,
  currentUserId,
  isMapOwner,
  onReply,
  onUpdate,
  onDelete,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState(comment.text);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAuthor = currentUserId === comment.user.id;
  const canModify = isAuthor || isMapOwner;

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await onReply(comment.id, replyText);
      setReplyText('');
      setIsReplying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      await onUpdate(comment.id, { text: editText });
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    await onUpdate(comment.id, { resolved: !comment.resolved });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this comment?')) {
      await onDelete(comment.id);
    }
  };

  const getInitials = (user: CommentUser) => {
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  const getDisplayName = (user: CommentUser) => {
    return user.name || user.email.split('@')[0];
  };

  return (
    <div className={`rounded-lg border ${comment.resolved ? 'bg-muted/50 border-muted' : 'bg-background border-border'}`}>
      {/* Main comment */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
            style={{ backgroundColor: '#3b82f6' }}
          >
            {comment.user.avatarUrl ? (
              <img
                src={comment.user.avatarUrl}
                alt={getDisplayName(comment.user)}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(comment.user)
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{getDisplayName(comment.user)}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.resolved && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  <CheckCircle className="h-3 w-3" />
                  Resolved
                </span>
              )}
            </div>

            {/* Node reference */}
            {comment.node && (
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
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEdit} disabled={loading}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(comment.text);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.text}</p>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-1 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsReplying(!isReplying)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>

                {canModify && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setShowMenu(!showMenu)}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>

                    {showMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute left-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[120px]">
                          <button
                            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                            onClick={() => {
                              handleResolve();
                              setShowMenu(false);
                            }}
                          >
                            <Check className="h-3 w-3" />
                            {comment.resolved ? 'Unresolve' : 'Resolve'}
                          </button>
                          {isAuthor && (
                            <button
                              className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                              onClick={() => {
                                setIsEditing(true);
                                setShowMenu(false);
                              }}
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
          </div>
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="mt-3 ml-11 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReply} disabled={loading || !replyText.trim()}>
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="border-t border-border bg-muted/30">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="p-3 ml-8 border-b border-border last:border-0">
              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                  style={{ backgroundColor: '#8b5cf6' }}
                >
                  {reply.user.avatarUrl ? (
                    <img
                      src={reply.user.avatarUrl}
                      alt={getDisplayName(reply.user)}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(reply.user)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{getDisplayName(reply.user)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{reply.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
