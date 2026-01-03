import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type DocumentType =
  | 'BIRTH_CERTIFICATE'
  | 'DEATH_CERTIFICATE'
  | 'MARRIAGE_CERTIFICATE'
  | 'DIVORCE_DECREE'
  | 'CENSUS_RECORD'
  | 'MILITARY_RECORD'
  | 'IMMIGRATION_RECORD'
  | 'NEWSPAPER_ARTICLE'
  | 'PHOTO'
  | 'LETTER'
  | 'WILL'
  | 'DEED'
  | 'OTHER';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';

export interface LinkedPerson {
  id: string;
  personId: string;
  role?: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Document {
  id: string;
  treeId: string;
  personId?: string | null;
  title: string;
  description?: string | null;
  documentType: DocumentType;
  url?: string | null;
  originalUrl?: string | null;
  s3Key?: string | null;
  thumbnailKey?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  pageCount?: number | null;
  ocrText?: string | null;
  notes?: string | null;
  citation?: string | null;
  dateOnDocument?: string | null;
  status: DocumentStatus;
  isOfficial: boolean;
  hasWatermark: boolean;
  uploadedBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string | null;
  } | null;
  uploader: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  linkedPersons: LinkedPerson[];
}

export interface DocumentFilters {
  personId?: string | null;
  documentType?: DocumentType | null;
  status?: DocumentStatus | null;
  search?: string | null;
  sortBy?: 'createdAt' | 'title' | 'documentType' | 'dateOnDocument';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentUploadInput {
  url?: string;
  file?: File;
  personId?: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  notes?: string;
  citation?: string;
  dateOnDocument?: string;
  hasWatermark?: boolean;
}

export interface DocumentUpdateInput {
  title?: string;
  description?: string;
  documentType?: DocumentType;
  personId?: string | null;
  notes?: string;
  citation?: string;
  dateOnDocument?: string | null;
  hasWatermark?: boolean;
}

export interface DownloadInfo {
  downloadUrl: string;
  expiresIn: number | null;
  filename: string;
  fileSize?: number | null;
  mimeType?: string | null;
}

export interface ReviewInput {
  action: 'approve' | 'reject';
  note?: string;
  isOfficial?: boolean;
}

interface UseDocumentsResult {
  documents: Document[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: DocumentFilters;
  setFilters: (filters: DocumentFilters) => void;
  uploadDocument: (input: DocumentUploadInput) => Promise<Document | null>;
  uploadDocumentFile: (file: File, metadata: Omit<DocumentUploadInput, 'url' | 'file'>) => Promise<Document | null>;
  updateDocument: (documentId: string, input: DocumentUpdateInput) => Promise<Document | null>;
  deleteDocument: (documentId: string) => Promise<boolean>;
  submitForApproval: (documentId: string) => Promise<Document | null>;
  reviewDocument: (documentId: string, review: ReviewInput) => Promise<Document | null>;
  linkPeople: (documentId: string, personIds: string[], roles?: Record<string, string>) => Promise<boolean>;
  unlinkPerson: (documentId: string, personId: string) => Promise<boolean>;
  getDownloadUrl: (documentId: string) => Promise<DownloadInfo | null>;
  getPendingDocuments: () => Promise<Document[]>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
}

const DOCUMENTS_PER_PAGE = 20;

export function useDocuments(treeId: string): UseDocumentsResult {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [offset, setOffset] = useState(0);

  const fetchDocuments = useCallback(
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
        params.append('limit', String(DOCUMENTS_PER_PAGE));
        params.append('offset', String(append ? offset : 0));

        if (filters.personId) params.append('personId', filters.personId);
        if (filters.documentType) params.append('documentType', filters.documentType);
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents?${params}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();

        if (append) {
          setDocuments(prev => [...prev, ...data.data.documents]);
        } else {
          setDocuments(data.data.documents);
        }
        setTotal(data.data.total);
        setOffset(append ? offset + DOCUMENTS_PER_PAGE : DOCUMENTS_PER_PAGE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        if (!append) {
          setDocuments([]);
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
    fetchDocuments(false);
  }, [treeId, filters]);

  const uploadDocument = useCallback(
    async (input: DocumentUploadInput): Promise<Document | null> => {
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/family-trees/${treeId}/documents`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload document');
        }

        const data = await response.json();
        setDocuments(prev => [data.data, ...prev]);
        setTotal(prev => prev + 1);
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const uploadDocumentFile = useCallback(
    async (file: File, metadata: Omit<DocumentUploadInput, 'url' | 'file'>): Promise<Document | null> => {
      setError(null);

      try {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('title', metadata.title);
        formData.append('documentType', metadata.documentType);
        if (metadata.personId) formData.append('personId', metadata.personId);
        if (metadata.description) formData.append('description', metadata.description);
        if (metadata.notes) formData.append('notes', metadata.notes);
        if (metadata.citation) formData.append('citation', metadata.citation);
        if (metadata.dateOnDocument) formData.append('dateOnDocument', metadata.dateOnDocument);
        if (metadata.hasWatermark !== undefined) formData.append('hasWatermark', String(metadata.hasWatermark));

        const response = await fetch(`${API_URL}/api/family-trees/${treeId}/documents`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload document');
        }

        const data = await response.json();
        setDocuments(prev => [data.data, ...prev]);
        setTotal(prev => prev + 1);
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const updateDocument = useCallback(
    async (documentId: string, input: DocumentUpdateInput): Promise<Document | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents/${documentId}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update document');
        }

        const data = await response.json();
        setDocuments(prev => prev.map(d => (d.id === documentId ? { ...d, ...data.data } : d)));
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const deleteDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents/${documentId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete document');
        }

        setDocuments(prev => prev.filter(d => d.id !== documentId));
        setTotal(prev => prev - 1);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const submitForApproval = useCallback(
    async (documentId: string): Promise<Document | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents/${documentId}/submit`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit document');
        }

        const data = await response.json();
        setDocuments(prev => prev.map(d => (d.id === documentId ? { ...d, status: 'PENDING' } : d)));
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return null;
      }
    },
    [treeId]
  );

  const reviewDocument = useCallback(
    async (documentId: string, review: ReviewInput): Promise<Document | null> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents/${documentId}/review`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(review),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to review document');
        }

        const data = await response.json();
        setDocuments(prev =>
          prev.map(d =>
            d.id === documentId
              ? { ...d, status: review.action === 'approve' ? 'APPROVED' : 'REJECTED' }
              : d
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

  const linkPeople = useCallback(
    async (documentId: string, personIds: string[], roles?: Record<string, string>): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents/${documentId}/link`,
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
        setDocuments(prev =>
          prev.map(d => (d.id === documentId ? { ...d, linkedPersons: data.data.linkedPersons } : d))
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        return false;
      }
    },
    [treeId]
  );

  const unlinkPerson = useCallback(
    async (documentId: string, personId: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents/${documentId}/link/${personId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to unlink person');
        }

        setDocuments(prev =>
          prev.map(d =>
            d.id === documentId
              ? { ...d, linkedPersons: d.linkedPersons.filter(lp => lp.personId !== personId) }
              : d
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
    async (documentId: string): Promise<DownloadInfo | null> => {
      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/documents/${documentId}/download`,
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

  const getPendingDocuments = useCallback(async (): Promise<Document[]> => {
    try {
      const response = await fetch(
        `${API_URL}/api/family-trees/${treeId}/documents/pending`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get pending documents');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    }
  }, [treeId]);

  const loadMore = useCallback(async () => {
    if (loading || documents.length >= total) return;
    await fetchDocuments(true);
  }, [loading, documents.length, total, fetchDocuments]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchDocuments(false);
  }, [fetchDocuments]);

  return {
    documents,
    total,
    loading,
    error,
    filters,
    setFilters,
    uploadDocument,
    uploadDocumentFile,
    updateDocument,
    deleteDocument,
    submitForApproval,
    reviewDocument,
    linkPeople,
    unlinkPerson,
    getDownloadUrl,
    getPendingDocuments,
    loadMore,
    refresh,
    hasMore: documents.length < total,
  };
}

// Helper to format document type for display
export function formatDocumentType(type: DocumentType): string {
  const typeLabels: Record<DocumentType, string> = {
    BIRTH_CERTIFICATE: 'Birth Certificate',
    DEATH_CERTIFICATE: 'Death Certificate',
    MARRIAGE_CERTIFICATE: 'Marriage Certificate',
    DIVORCE_DECREE: 'Divorce Decree',
    CENSUS_RECORD: 'Census Record',
    MILITARY_RECORD: 'Military Record',
    IMMIGRATION_RECORD: 'Immigration Record',
    NEWSPAPER_ARTICLE: 'Newspaper Article',
    PHOTO: 'Photo',
    LETTER: 'Letter',
    WILL: 'Will',
    DEED: 'Deed',
    OTHER: 'Other',
  };
  return typeLabels[type] || type;
}

// Helper to format document status for display
export function formatDocumentStatus(status: DocumentStatus): string {
  const statusLabels: Record<DocumentStatus, string> = {
    PENDING: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    DRAFT: 'Draft',
  };
  return statusLabels[status] || status;
}

// Helper to get status color
export function getStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    PENDING: 'yellow',
    APPROVED: 'green',
    REJECTED: 'red',
    DRAFT: 'gray',
  };
  return colors[status] || 'gray';
}
