import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type StoryStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface LinkedPerson {
  id: string;
  personId: string;
  role?: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string | null;
  };
}

export interface StoryComment {
  id: string;
  storyId: string;
  authorId: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  replies?: StoryComment[];
}

export interface Story {
  id: string;
  treeId: string;
  personId?: string | null;
  authorId: string;
  title: string;
  content: string;
  excerpt?: string | null;
  storyDate?: string | null;
  location?: string | null;
  coverImage?: string | null;
  status: StoryStatus;
  isPublic: boolean;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string | null;
    isLiving?: boolean;
  } | null;
  author: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  linkedPersons: LinkedPerson[];
  comments?: StoryComment[];
  _count: {
    comments: number;
    likes: number;
  };
  isLikedByMe?: boolean;
}

export interface StoryFilters {
  personId?: string | null;
  status?: StoryStatus | null;
  authorId?: string | null;
  featured?: boolean;
  search?: string | null;
  sortBy?: 'createdAt' | 'publishedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

export interface StoryCreateInput {
  title: string;
  content: string;
  excerpt?: string;
  personId?: string;
  storyDate?: string;
  location?: string;
  coverImage?: string;
  status?: 'DRAFT' | 'PENDING' | 'PUBLISHED';
  isPublic?: boolean;
}

export interface StoryUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
  personId?: string | null;
  storyDate?: string | null;
  location?: string | null;
  coverImage?: string | null;
  isPublic?: boolean;
  isFeatured?: boolean;
}

export interface ReviewInput {
  action: 'approve' | 'reject';
}

interface UseStoriesResult {
  stories: Story[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: StoryFilters;
  setFilters: (filters: StoryFilters) => void;
  createStory: (input: StoryCreateInput) => Promise<Story | null>;
  updateStory: (storyId: string, input: StoryUpdateInput) => Promise<Story | null>;
  deleteStory: (storyId: string) => Promise<boolean>;
  publishStory: (storyId: string) => Promise<{ story: Story; message: string } | null>;
  reviewStory: (storyId: string, review: ReviewInput) => Promise<Story | null>;
  likeStory: (storyId: string) => Promise<{ liked: boolean; likeCount: number } | null>;
  addComment: (storyId: string, content: string, parentId?: string) => Promise<StoryComment | null>;
  deleteComment: (storyId: string, commentId: string) => Promise<boolean>;
  linkPeople: (storyId: string, personIds: string[], roles?: Record<string, string>) => Promise<boolean>;
  getPendingStories: () => Promise<Story[]>;
  getStory: (storyId: string) => Promise<Story | null>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
}

const STORIES_PER_PAGE = 20;

export function useStories(treeId: string): UseStoriesResult {
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StoryFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [offset, setOffset] = useState(0);

  const fetchStories = useCallback(
    async (append = false) => {
      if (!treeId) {
        setLoading(false);
        return;
      }

      if (!append) {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.append('limit', String(STORIES_PER_PAGE));
        params.append('offset', String(append ? offset : 0));

        if (filters.personId) params.append('personId', filters.personId);
        if (filters.status) params.append('status', filters.status);
        if (filters.authorId) params.append('authorId', filters.authorId);
        if (filters.featured) params.append('featured', 'true');
        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories?${params}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch stories');
        }

        const data = await response.json();

        if (append) {
          setStories(prev => [...prev, ...data.data.stories]);
        } else {
          setStories(data.data.stories);
        }
        setTotal(data.data.total);
        setOffset(append ? offset + STORIES_PER_PAGE : STORIES_PER_PAGE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        if (!append) {
          setStories([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [treeId, filters, offset]
  );

  useEffect(() => {
    setOffset(0);
    fetchStories(false);
  }, [treeId, filters]);

  const createStory = useCallback(
    async (input: StoryCreateInput): Promise<Story | null> => {
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/family-trees/${treeId}/stories`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create story');
        }

        const data = await response.json();
        // Add to beginning of list if published
        if (data.data.status === 'PUBLISHED') {
          setStories(prev => [data.data, ...prev]);
          setTotal(prev => prev + 1);
        }
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const updateStory = useCallback(
    async (storyId: string, input: StoryUpdateInput): Promise<Story | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update story');
        }

        const data = await response.json();
        setStories(prev => prev.map(s => (s.id === storyId ? { ...s, ...data.data } : s)));
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const deleteStory = useCallback(
    async (storyId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete story');
        }

        setStories(prev => prev.filter(s => s.id !== storyId));
        setTotal(prev => prev - 1);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const publishStory = useCallback(
    async (storyId: string): Promise<{ story: Story; message: string } | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}/publish`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to publish story');
        }

        const data = await response.json();
        setStories(prev =>
          prev.map(s => (s.id === storyId ? { ...s, status: data.data.status } : s))
        );
        return { story: data.data, message: data.message };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const reviewStory = useCallback(
    async (storyId: string, review: ReviewInput): Promise<Story | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}/review`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(review),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to review story');
        }

        const data = await response.json();
        setStories(prev =>
          prev.map(s =>
            s.id === storyId
              ? { ...s, status: review.action === 'approve' ? 'PUBLISHED' : 'REJECTED' }
              : s
          )
        );
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const likeStory = useCallback(
    async (storyId: string): Promise<{ liked: boolean; likeCount: number } | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}/like`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to like story');
        }

        const data = await response.json();
        setStories(prev =>
          prev.map(s =>
            s.id === storyId
              ? {
                  ...s,
                  isLikedByMe: data.data.liked,
                  _count: { ...s._count, likes: data.data.likeCount },
                }
              : s
          )
        );
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const addComment = useCallback(
    async (storyId: string, content: string, parentId?: string): Promise<StoryComment | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}/comments`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, parentId }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add comment');
        }

        const data = await response.json();
        // Update comment count
        setStories(prev =>
          prev.map(s =>
            s.id === storyId
              ? { ...s, _count: { ...s._count, comments: s._count.comments + 1 } }
              : s
          )
        );
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const deleteComment = useCallback(
    async (storyId: string, commentId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}/comments/${commentId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete comment');
        }

        // Update comment count
        setStories(prev =>
          prev.map(s =>
            s.id === storyId
              ? { ...s, _count: { ...s._count, comments: Math.max(0, s._count.comments - 1) } }
              : s
          )
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const linkPeople = useCallback(
    async (storyId: string, personIds: string[], roles?: Record<string, string>): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}/link`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personIds, roles }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to link people');
        }

        const data = await response.json();
        setStories(prev =>
          prev.map(s => (s.id === storyId ? { ...s, linkedPersons: data.data.linkedPersons } : s))
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const getPendingStories = useCallback(async (): Promise<Story[]> => {
    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/${treeId}/stories/pending`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get pending stories');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    }
  }, [treeId]);

  const getStory = useCallback(
    async (storyId: string): Promise<Story | null> => {
      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/stories/${storyId}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get story');
        }

        const data = await response.json();
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const loadMore = useCallback(async () => {
    if (loading || stories.length >= total) return;
    await fetchStories(true);
  }, [loading, stories.length, total, fetchStories]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchStories(false);
  }, [fetchStories]);

  return {
    stories,
    total,
    loading,
    error,
    filters,
    setFilters,
    createStory,
    updateStory,
    deleteStory,
    publishStory,
    reviewStory,
    likeStory,
    addComment,
    deleteComment,
    linkPeople,
    getPendingStories,
    getStory,
    loadMore,
    refresh,
    hasMore: stories.length < total,
  };
}

// Helper to format story status for display
export function formatStoryStatus(status: StoryStatus): string {
  const statusLabels: Record<StoryStatus, string> = {
    DRAFT: 'Draft',
    PENDING: 'Pending Review',
    PUBLISHED: 'Published',
    REJECTED: 'Rejected',
  };
  return statusLabels[status] || status;
}

// Helper to get status color
export function getStatusColor(status: StoryStatus): string {
  const colors: Record<StoryStatus, string> = {
    DRAFT: 'gray',
    PENDING: 'yellow',
    PUBLISHED: 'green',
    REJECTED: 'red',
  };
  return colors[status] || 'gray';
}

// Helper to format relative time
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
