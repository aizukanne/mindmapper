import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type PhotoPrivacy =
  | 'PUBLIC'
  | 'ALL_FAMILY'
  | 'DIRECT_RELATIVES'
  | 'ADMINS_ONLY'
  | 'PRIVATE'
  | 'NONE';

export interface TaggedPerson {
  id: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string | null;
}

export interface PhotoTag {
  id: string;
  personId: string;
  person: TaggedPerson;
}

export interface Photo {
  id: string;
  treeId: string;
  url: string;
  originalUrl?: string | null;
  s3Key?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  format?: string | null;
  caption?: string | null;
  dateTaken?: string | null;
  location?: string | null;
  privacy: PhotoPrivacy;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  person?: TaggedPerson | null;
  uploader: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  taggedPeople: PhotoTag[];
}

export interface PhotoQuota {
  memberRemaining: number;
  treeRemaining: number;
  memberLimit: number;
  treeLimit: number;
  maxFileSizeMB: number;
  s3Configured: boolean;
}

export interface DownloadInfo {
  downloadUrl: string;
  expiresIn: number | null;
  filename: string;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
}

export interface PhotoFilters {
  personId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sortBy?: 'createdAt' | 'dateTaken' | 'caption';
  sortOrder?: 'asc' | 'desc';
}

export interface PhotoUploadInput {
  url?: string;
  file?: File;
  personId?: string;
  caption?: string;
  dateTaken?: string;
  location?: string;
  privacy?: PhotoPrivacy;
}

export interface PhotoUpdateInput {
  caption?: string;
  dateTaken?: string | null;
  location?: string;
}

interface UsePhotosResult {
  photos: Photo[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: PhotoFilters;
  setFilters: (filters: PhotoFilters) => void;
  uploadPhoto: (input: PhotoUploadInput) => Promise<Photo | null>;
  uploadPhotoFile: (file: File, metadata?: Omit<PhotoUploadInput, 'url' | 'file'>) => Promise<Photo | null>;
  updatePhoto: (photoId: string, input: PhotoUpdateInput) => Promise<Photo | null>;
  updatePrivacy: (photoId: string, privacy: PhotoPrivacy) => Promise<boolean>;
  deletePhoto: (photoId: string) => Promise<boolean>;
  tagPeople: (photoId: string, personIds: string[]) => Promise<boolean>;
  removeTag: (photoId: string, personId: string) => Promise<boolean>;
  getDownloadUrl: (photoId: string) => Promise<DownloadInfo | null>;
  getQuota: () => Promise<PhotoQuota | null>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
}

const PHOTOS_PER_PAGE = 20;

export function usePhotos(treeId: string): UsePhotosResult {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PhotoFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [offset, setOffset] = useState(0);

  const fetchPhotos = useCallback(
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
        params.append('limit', String(PHOTOS_PER_PAGE));
        params.append('offset', String(append ? offset : 0));

        if (filters.personId) params.append('personId', filters.personId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/photos?${params}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }

        const data = await response.json();

        if (append) {
          setPhotos(prev => [...prev, ...data.data.photos]);
        } else {
          setPhotos(data.data.photos);
        }
        setTotal(data.data.total);
        setOffset(append ? offset + PHOTOS_PER_PAGE : PHOTOS_PER_PAGE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        if (!append) {
          setPhotos([]);
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
    fetchPhotos(false);
  }, [treeId, filters]);

  const uploadPhoto = useCallback(
    async (input: PhotoUploadInput): Promise<Photo | null> => {
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/family-trees/${treeId}/photos`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload photo');
        }

        const data = await response.json();
        // Add to beginning of list
        setPhotos(prev => [data.data, ...prev]);
        setTotal(prev => prev + 1);
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const uploadPhotoFile = useCallback(
    async (file: File, metadata?: Omit<PhotoUploadInput, 'url' | 'file'>): Promise<Photo | null> => {
      setError(null);

      try {
        const formData = new FormData();
        formData.append('photo', file);
        if (metadata?.personId) formData.append('personId', metadata.personId);
        if (metadata?.caption) formData.append('caption', metadata.caption);
        if (metadata?.dateTaken) formData.append('dateTaken', metadata.dateTaken);
        if (metadata?.location) formData.append('location', metadata.location);
        if (metadata?.privacy) formData.append('privacy', metadata.privacy);

        const response = await fetch(`${API_URL}/api/family-trees/${treeId}/photos`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload photo');
        }

        const data = await response.json();
        // Add to beginning of list
        setPhotos(prev => [data.data, ...prev]);
        setTotal(prev => prev + 1);
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const updatePhoto = useCallback(
    async (photoId: string, input: PhotoUpdateInput): Promise<Photo | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/photos/${photoId}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update photo');
        }

        const data = await response.json();
        setPhotos(prev => prev.map(p => (p.id === photoId ? { ...p, ...data.data } : p)));
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const updatePrivacy = useCallback(
    async (photoId: string, privacy: PhotoPrivacy): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/photos/${photoId}/privacy`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ privacy }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update privacy');
        }

        setPhotos(prev => prev.map(p => (p.id === photoId ? { ...p, privacy } : p)));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const deletePhoto = useCallback(
    async (photoId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/photos/${photoId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete photo');
        }

        setPhotos(prev => prev.filter(p => p.id !== photoId));
        setTotal(prev => prev - 1);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const tagPeople = useCallback(
    async (photoId: string, personIds: string[]): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/photos/${photoId}/tags`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personIds }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to tag people');
        }

        const data = await response.json();
        setPhotos(prev =>
          prev.map(p => (p.id === photoId ? { ...p, taggedPeople: data.data.taggedPeople } : p))
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const removeTag = useCallback(
    async (photoId: string, personId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/photos/${photoId}/tags/${personId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove tag');
        }

        setPhotos(prev =>
          prev.map(p =>
            p.id === photoId
              ? { ...p, taggedPeople: p.taggedPeople.filter(t => t.personId !== personId) }
              : p
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

  const getDownloadUrl = useCallback(
    async (photoId: string): Promise<DownloadInfo | null> => {
      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/photos/${photoId}/download`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get download URL');
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

  const getQuota = useCallback(async (): Promise<PhotoQuota | null> => {
    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/${treeId}/photos/quota`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get quota');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [treeId]);

  const loadMore = useCallback(async () => {
    if (loading || photos.length >= total) return;
    await fetchPhotos(true);
  }, [loading, photos.length, total, fetchPhotos]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchPhotos(false);
  }, [fetchPhotos]);

  return {
    photos,
    total,
    loading,
    error,
    filters,
    setFilters,
    uploadPhoto,
    uploadPhotoFile,
    updatePhoto,
    updatePrivacy,
    deletePhoto,
    tagPeople,
    removeTag,
    getDownloadUrl,
    getQuota,
    loadMore,
    refresh,
    hasMore: photos.length < total,
  };
}
