import { useState } from 'react';
import {
  MessageSquare,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  usePendingSuggestions,
  useSuggestions,
  type Suggestion,
  type SuggestionStatus,
  type SuggestionType,
} from '@/hooks/useSuggestions';

export interface SuggestionReviewProps {
  treeId: string;
  onPersonClick?: (personId: string) => void;
  className?: string;
}

const TYPE_LABELS: Record<SuggestionType, string> = {
  UPDATE_PERSON: 'Update Information',
  ADD_RELATIONSHIP: 'Add Relationship',
  ADD_PERSON: 'Add Family Member',
  CORRECT_DATE: 'Date Correction',
  OTHER: 'Other',
};

const STATUS_CONFIG: Record<
  SuggestionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: <Clock className="w-3 h-3" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: <XCircle className="w-3 h-3" />,
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  return String(value);
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApprove: (id: string, note: string, applyChanges: boolean) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPersonClick?: (personId: string) => void;
  isAdmin: boolean;
}

function SuggestionCard({
  suggestion,
  onApprove,
  onReject,
  onDelete,
  onPersonClick,
  isAdmin,
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [applyChanges, setApplyChanges] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);

  const statusConfig = STATUS_CONFIG[suggestion.status];
  const isPending = suggestion.status === 'PENDING';

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove(suggestion.id, reviewNote, applyChanges);
      setShowReviewForm(false);
      setReviewNote('');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await onReject(suggestion.id, reviewNote);
      setShowReviewForm(false);
      setReviewNote('');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this suggestion?')) return;
    setProcessing(true);
    try {
      await onDelete(suggestion.id);
    } finally {
      setProcessing(false);
    }
  };

  const suggestedData = suggestion.suggestedData as Record<string, unknown>;
  const currentData = (suggestion.currentData as Record<string, unknown>) || {};
  const changedFields = Object.keys(suggestedData);

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {/* Person avatar */}
          {suggestion.person.profilePhoto ? (
            <img
              src={suggestion.person.profilePhoto}
              alt={`${suggestion.person.firstName} ${suggestion.person.lastName}`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-gray-900 truncate">{suggestion.title}</h4>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusConfig.color}`}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span className="text-blue-600">
                {suggestion.person.firstName} {suggestion.person.lastName}
              </span>
              <span>•</span>
              <span>{TYPE_LABELS[suggestion.type]}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>
                Suggested by {suggestion.suggester.name || suggestion.suggester.email}
              </span>
              <span>•</span>
              <Calendar className="w-3 h-3" />
              <span>{formatDate(suggestion.createdAt)}</span>
            </div>
          </div>

          {/* Expand icon */}
          <div className="text-gray-400">
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 pb-4">
          {/* Description */}
          {suggestion.description && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Description</h5>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {suggestion.description}
              </p>
            </div>
          )}

          {/* Suggested changes */}
          {changedFields.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Suggested Changes</h5>
              <div className="space-y-2">
                {changedFields.map(key => (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium text-gray-700 min-w-[120px]">
                      {formatFieldName(key)}:
                    </span>
                    <span className="text-red-600 line-through">
                      {formatFieldValue(currentData[key])}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-medium">
                      {formatFieldValue(suggestedData[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review info (for reviewed suggestions) */}
          {suggestion.reviewer && suggestion.reviewedAt && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Reviewed by</span>
                <span className="font-medium">
                  {suggestion.reviewer.name || suggestion.reviewer.email}
                </span>
                <span className="text-gray-400">on</span>
                <span>{formatDate(suggestion.reviewedAt)}</span>
              </div>
              {suggestion.reviewNote && (
                <p className="mt-2 text-sm text-gray-600 italic">
                  "{suggestion.reviewNote}"
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            {onPersonClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPersonClick(suggestion.personId)}
              >
                View Person
              </Button>
            )}

            {isAdmin && isPending && !showReviewForm && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => {
                    setReviewAction('approve');
                    setShowReviewForm(true);
                  }}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    setReviewAction('reject');
                    setShowReviewForm(true);
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-red-600 ml-auto"
                onClick={handleDelete}
                disabled={processing}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Review form */}
          {showReviewForm && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Note (optional)
                </label>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Add a note about your decision..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {reviewAction === 'approve' && changedFields.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applyChanges}
                    onChange={e => setApplyChanges(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Automatically apply changes to the person record</span>
                </label>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReviewForm(false);
                    setReviewNote('');
                    setReviewAction(null);
                  }}
                >
                  Cancel
                </Button>
                {reviewAction === 'approve' ? (
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Confirm Approval
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleReject}
                    disabled={processing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Confirm Rejection
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SuggestionReview({
  treeId,
  onPersonClick,
  className = '',
}: SuggestionReviewProps) {
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'ALL'>('PENDING');

  // Use different hooks based on filter
  const pendingHook = usePendingSuggestions(treeId);
  const allHook = useSuggestions(treeId);

  const { suggestions, loading, error, reviewSuggestion, deleteSuggestion, refresh } =
    statusFilter === 'PENDING' ? pendingHook : allHook;

  // Filter suggestions if showing ALL
  const displayedSuggestions =
    statusFilter === 'ALL'
      ? suggestions
      : suggestions.filter(s => s.status === statusFilter);

  const handleApprove = async (id: string, note: string, applyChanges: boolean) => {
    await reviewSuggestion(id, {
      status: 'APPROVED',
      reviewNote: note || undefined,
      applyChanges,
    });
  };

  const handleReject = async (id: string, note: string) => {
    await reviewSuggestion(id, {
      status: 'REJECTED',
      reviewNote: note || undefined,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteSuggestion(id);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Suggested Edits</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 mt-3">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? 'All' : STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions list */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {displayedSuggestions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No suggestions</p>
            <p className="text-sm mt-1">
              {statusFilter === 'PENDING'
                ? 'No pending suggestions to review'
                : 'No suggestions match the current filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedSuggestions.map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
                onPersonClick={onPersonClick}
                isAdmin={true} // TODO: Get from tree permissions
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
