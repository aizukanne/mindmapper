import { useState, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type ActivityType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_ROLE_CHANGED'
  | 'PERSON_ADDED'
  | 'PERSON_UPDATED'
  | 'PERSON_DELETED'
  | 'PERSON_MERGED'
  | 'RELATIONSHIP_ADDED'
  | 'RELATIONSHIP_REMOVED'
  | 'MARRIAGE_ADDED'
  | 'MARRIAGE_REMOVED'
  | 'PHOTO_UPLOADED'
  | 'PHOTO_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'STORY_PUBLISHED'
  | 'STORY_UPDATED'
  | 'SUGGESTION_MADE'
  | 'SUGGESTION_APPROVED'
  | 'SUGGESTION_REJECTED'
  | 'TREE_UPDATED'
  | 'TREE_PRIVACY_CHANGED';

export interface ActivityActor {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Activity {
  id: string;
  type: ActivityType;
  actor: ActivityActor;
  targetPersonId: string | null;
  targetUserId: string | null;
  targetPhotoId: string | null;
  targetDocumentId: string | null;
  targetStoryId: string | null;
  metadata: Record<string, unknown>;
  isPrivate: boolean;
  createdAt: string;
  isNew: boolean;
}

export interface ActivityFeedResult {
  activities: Activity[];
  hasMore: boolean;
  nextCursor: string | null;
  unreadCount: number;
  lastSeenAt: string | null;
}

export interface ActivitySummary {
  period: {
    start: string;
    end: string;
    days: number;
  };
  byType: Record<string, number>;
  totalActivities: number;
  topContributors: Array<{
    user: {
      id: string;
      name: string | null;
      avatarUrl?: string | null;
    };
    count: number;
  }>;
}

export interface ActivityFilters {
  types?: ActivityType[];
  daysAgo?: number;
}

interface UseActivityResult {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  unreadCount: number;
  lastSeenAt: string | null;
  filters: ActivityFilters;
  setFilters: (filters: ActivityFilters) => void;
  fetchActivities: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsSeen: () => Promise<void>;
  getSummary: (daysAgo?: number) => Promise<ActivitySummary | null>;
  refresh: () => Promise<void>;
}

export function useActivity(treeId: string): UseActivityResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({});

  const fetchActivities = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (cursor) params.append('cursor', cursor);
        if (filters.types && filters.types.length > 0) {
          params.append('types', filters.types.join(','));
        }
        if (filters.daysAgo) {
          params.append('daysAgo', filters.daysAgo.toString());
        }

        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/activity?${params}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch activities');
        }

        const data = await response.json();
        const result: ActivityFeedResult = data.data;

        if (cursor) {
          // Append to existing activities
          setActivities(prev => [...prev, ...result.activities]);
        } else {
          // Replace activities
          setActivities(result.activities);
        }

        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
        setUnreadCount(result.unreadCount);
        setLastSeenAt(result.lastSeenAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    [treeId, filters]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !nextCursor) return;
    await fetchActivities(nextCursor);
  }, [hasMore, loading, nextCursor, fetchActivities]);

  const markAsSeen = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/${treeId}/activity/mark-seen`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as seen');
      }

      const data = await response.json();
      setLastSeenAt(data.data.markedAt);
      setUnreadCount(0);

      // Update all activities to not be new
      setActivities(prev =>
        prev.map(a => ({ ...a, isNew: false }))
      );
    } catch (err) {
      console.error('Failed to mark activities as seen:', err);
    }
  }, [treeId]);

  const getSummary = useCallback(
    async (daysAgo = 7): Promise<ActivitySummary | null> => {
      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/activity/summary?daysAgo=${daysAgo}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch summary');
        }

        const data = await response.json();
        return data.data;
      } catch (err) {
        console.error('Failed to fetch activity summary:', err);
        return null;
      }
    },
    [treeId]
  );

  const refresh = useCallback(async () => {
    setNextCursor(null);
    await fetchActivities();
  }, [fetchActivities]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    hasMore,
    unreadCount,
    lastSeenAt,
    filters,
    setFilters,
    fetchActivities,
    loadMore,
    markAsSeen,
    getSummary,
    refresh,
  };
}

// Activity category helpers
export const ACTIVITY_CATEGORIES = {
  members: ['MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_ROLE_CHANGED'] as ActivityType[],
  people: ['PERSON_ADDED', 'PERSON_UPDATED', 'PERSON_DELETED', 'PERSON_MERGED'] as ActivityType[],
  relationships: ['RELATIONSHIP_ADDED', 'RELATIONSHIP_REMOVED', 'MARRIAGE_ADDED', 'MARRIAGE_REMOVED'] as ActivityType[],
  content: ['PHOTO_UPLOADED', 'PHOTO_DELETED', 'DOCUMENT_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'STORY_PUBLISHED', 'STORY_UPDATED'] as ActivityType[],
  suggestions: ['SUGGESTION_MADE', 'SUGGESTION_APPROVED', 'SUGGESTION_REJECTED'] as ActivityType[],
  tree: ['TREE_UPDATED', 'TREE_PRIVACY_CHANGED'] as ActivityType[],
};

// Format activity type to human-readable string
export function formatActivityType(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    MEMBER_JOINED: 'Member Joined',
    MEMBER_LEFT: 'Member Left',
    MEMBER_ROLE_CHANGED: 'Role Changed',
    PERSON_ADDED: 'Person Added',
    PERSON_UPDATED: 'Person Updated',
    PERSON_DELETED: 'Person Deleted',
    PERSON_MERGED: 'Persons Merged',
    RELATIONSHIP_ADDED: 'Relationship Added',
    RELATIONSHIP_REMOVED: 'Relationship Removed',
    MARRIAGE_ADDED: 'Marriage Added',
    MARRIAGE_REMOVED: 'Marriage Removed',
    PHOTO_UPLOADED: 'Photo Uploaded',
    PHOTO_DELETED: 'Photo Deleted',
    DOCUMENT_UPLOADED: 'Document Uploaded',
    DOCUMENT_APPROVED: 'Document Approved',
    DOCUMENT_REJECTED: 'Document Rejected',
    STORY_PUBLISHED: 'Story Published',
    STORY_UPDATED: 'Story Updated',
    SUGGESTION_MADE: 'Suggestion Made',
    SUGGESTION_APPROVED: 'Suggestion Approved',
    SUGGESTION_REJECTED: 'Suggestion Rejected',
    TREE_UPDATED: 'Tree Updated',
    TREE_PRIVACY_CHANGED: 'Privacy Changed',
  };
  return labels[type] || type;
}

// Get icon name for activity type
export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    MEMBER_JOINED: 'user-plus',
    MEMBER_LEFT: 'user-minus',
    MEMBER_ROLE_CHANGED: 'shield',
    PERSON_ADDED: 'user-plus',
    PERSON_UPDATED: 'edit',
    PERSON_DELETED: 'user-x',
    PERSON_MERGED: 'git-merge',
    RELATIONSHIP_ADDED: 'link',
    RELATIONSHIP_REMOVED: 'unlink',
    MARRIAGE_ADDED: 'heart',
    MARRIAGE_REMOVED: 'heart-off',
    PHOTO_UPLOADED: 'image',
    PHOTO_DELETED: 'image-off',
    DOCUMENT_UPLOADED: 'file-plus',
    DOCUMENT_APPROVED: 'file-check',
    DOCUMENT_REJECTED: 'file-x',
    STORY_PUBLISHED: 'book-open',
    STORY_UPDATED: 'edit-3',
    SUGGESTION_MADE: 'message-square',
    SUGGESTION_APPROVED: 'check-circle',
    SUGGESTION_REJECTED: 'x-circle',
    TREE_UPDATED: 'settings',
    TREE_PRIVACY_CHANGED: 'lock',
  };
  return icons[type] || 'activity';
}

// Get color class for activity type
export function getActivityColor(type: ActivityType): string {
  if (ACTIVITY_CATEGORIES.members.includes(type)) return 'text-purple-600 bg-purple-50';
  if (ACTIVITY_CATEGORIES.people.includes(type)) return 'text-blue-600 bg-blue-50';
  if (ACTIVITY_CATEGORIES.relationships.includes(type)) return 'text-pink-600 bg-pink-50';
  if (ACTIVITY_CATEGORIES.content.includes(type)) return 'text-green-600 bg-green-50';
  if (ACTIVITY_CATEGORIES.suggestions.includes(type)) return 'text-yellow-600 bg-yellow-50';
  if (ACTIVITY_CATEGORIES.tree.includes(type)) return 'text-gray-600 bg-gray-50';
  return 'text-gray-600 bg-gray-50';
}

// Format relative time
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;

  return date.toLocaleDateString();
}

// Generate activity message
export function getActivityMessage(activity: Activity): string {
  const metadata = activity.metadata as Record<string, string | undefined>;
  const actorName = activity.actor.name || 'Someone';

  switch (activity.type) {
    case 'MEMBER_JOINED':
      return `${actorName} joined the family tree`;
    case 'MEMBER_LEFT':
      return metadata.memberName
        ? `${metadata.memberName} left the family tree`
        : `A member left the family tree`;
    case 'MEMBER_ROLE_CHANGED':
      return metadata.memberName
        ? `${metadata.memberName}'s role was changed to ${metadata.newRole}`
        : `A member's role was changed`;
    case 'PERSON_ADDED':
      return metadata.personName
        ? `${actorName} added ${metadata.personName}`
        : `${actorName} added a new person`;
    case 'PERSON_UPDATED':
      return metadata.personName
        ? `${actorName} updated ${metadata.personName}'s profile`
        : `${actorName} updated a profile`;
    case 'PERSON_DELETED':
      return metadata.personName
        ? `${actorName} removed ${metadata.personName}`
        : `${actorName} removed a person`;
    case 'PERSON_MERGED':
      return metadata.primaryName && metadata.mergedName
        ? `${actorName} merged ${metadata.mergedName} into ${metadata.primaryName}`
        : `${actorName} merged two profiles`;
    case 'RELATIONSHIP_ADDED':
      return metadata.person1Name && metadata.person2Name
        ? `${actorName} added a relationship between ${metadata.person1Name} and ${metadata.person2Name}`
        : `${actorName} added a relationship`;
    case 'RELATIONSHIP_REMOVED':
      return `${actorName} removed a relationship`;
    case 'MARRIAGE_ADDED':
      return metadata.person1Name && metadata.person2Name
        ? `${actorName} added a marriage between ${metadata.person1Name} and ${metadata.person2Name}`
        : `${actorName} added a marriage`;
    case 'MARRIAGE_REMOVED':
      return `${actorName} removed a marriage record`;
    case 'PHOTO_UPLOADED':
      return metadata.personName
        ? `${actorName} uploaded a photo of ${metadata.personName}`
        : `${actorName} uploaded a photo`;
    case 'PHOTO_DELETED':
      return `${actorName} deleted a photo`;
    case 'DOCUMENT_UPLOADED':
      return metadata.documentType
        ? `${actorName} uploaded a ${metadata.documentType.toLowerCase().replace('_', ' ')}`
        : `${actorName} uploaded a document`;
    case 'DOCUMENT_APPROVED':
      return `${actorName} approved a document`;
    case 'DOCUMENT_REJECTED':
      return `${actorName} rejected a document`;
    case 'STORY_PUBLISHED':
      return metadata.storyTitle
        ? `${actorName} published "${metadata.storyTitle}"`
        : `${actorName} published a story`;
    case 'STORY_UPDATED':
      return metadata.storyTitle
        ? `${actorName} updated "${metadata.storyTitle}"`
        : `${actorName} updated a story`;
    case 'SUGGESTION_MADE':
      return metadata.personName
        ? `${actorName} suggested an edit for ${metadata.personName}`
        : `${actorName} made a suggestion`;
    case 'SUGGESTION_APPROVED':
      return `${actorName} approved a suggestion`;
    case 'SUGGESTION_REJECTED':
      return `${actorName} rejected a suggestion`;
    case 'TREE_UPDATED':
      return `${actorName} updated tree settings`;
    case 'TREE_PRIVACY_CHANGED':
      return metadata.newPrivacy
        ? `${actorName} changed tree privacy to ${metadata.newPrivacy.toLowerCase()}`
        : `${actorName} changed tree privacy`;
    default:
      return `${actorName} performed an action`;
  }
}
