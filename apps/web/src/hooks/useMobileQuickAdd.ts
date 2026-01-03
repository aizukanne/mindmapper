import { useState, useCallback, useEffect } from 'react';
import type { QuickAddPersonData } from '@/components/tree/MobileQuickAdd';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const DRAFTS_STORAGE_KEY = 'mindmapper_quick_add_drafts';

export interface Draft extends QuickAddPersonData {
  id: string;
  treeId: string;
  parentId?: string;
  relationshipType?: 'CHILD' | 'SPOUSE' | 'SIBLING';
  createdAt: number;
  updatedAt: number;
}

export interface UseMobileQuickAddOptions {
  treeId: string;
  onSuccess?: (personId: string) => void;
  onError?: (error: string) => void;
}

export interface UseMobileQuickAddResult {
  isSubmitting: boolean;
  drafts: Draft[];
  addPerson: (
    data: QuickAddPersonData,
    parentId?: string,
    relationshipType?: 'CHILD' | 'SPOUSE' | 'SIBLING'
  ) => Promise<string | null>;
  saveDraft: (
    data: QuickAddPersonData,
    parentId?: string,
    relationshipType?: 'CHILD' | 'SPOUSE' | 'SIBLING'
  ) => Draft;
  loadDraft: (draftId: string) => Draft | null;
  deleteDraft: (draftId: string) => void;
  clearAllDrafts: () => void;
  submitDraft: (draftId: string) => Promise<string | null>;
}

function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function loadDraftsFromStorage(treeId: string): Draft[] {
  try {
    const allDrafts = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!allDrafts) return [];
    const drafts: Draft[] = JSON.parse(allDrafts);
    return drafts.filter(d => d.treeId === treeId);
  } catch {
    return [];
  }
}

function saveDraftsToStorage(drafts: Draft[]): void {
  try {
    // Load all drafts, remove the ones for current tree, add new ones
    const allDraftsStr = localStorage.getItem(DRAFTS_STORAGE_KEY);
    let allDrafts: Draft[] = allDraftsStr ? JSON.parse(allDraftsStr) : [];

    const treeIds = new Set(drafts.map(d => d.treeId));
    allDrafts = allDrafts.filter(d => !treeIds.has(d.treeId));
    allDrafts = [...allDrafts, ...drafts];

    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(allDrafts));
  } catch (error) {
    console.error('Failed to save drafts:', error);
  }
}

export function useMobileQuickAdd({
  treeId,
  onSuccess,
  onError,
}: UseMobileQuickAddOptions): UseMobileQuickAddResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // Load drafts on mount
  useEffect(() => {
    const loadedDrafts = loadDraftsFromStorage(treeId);
    setDrafts(loadedDrafts);
  }, [treeId]);

  // Upload photo and get URL
  const uploadPhoto = useCallback(async (blob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('photo', blob, 'photo.jpg');

      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/photos/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      return data.data?.url || null;
    } catch (error) {
      console.error('Failed to upload photo:', error);
      return null;
    }
  }, [treeId]);

  // Add person to tree
  const addPerson = useCallback(async (
    data: QuickAddPersonData,
    parentId?: string,
    relationshipType?: 'CHILD' | 'SPOUSE' | 'SIBLING'
  ): Promise<string | null> => {
    setIsSubmitting(true);

    try {
      // Upload photo first if provided
      let photoUrl = data.photoUrl;
      if (data.photoBlob) {
        const uploadedUrl = await uploadPhoto(data.photoBlob);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      // Create person
      const personData: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        isLiving: true,
        generation: 0,
      };

      // Set birth date from year
      if (data.birthYear) {
        personData.birthDate = `${data.birthYear}-01-01`;
      }

      // Add biography
      if (data.biography) {
        personData.biography = data.biography;
      }

      // Add photo URL
      if (photoUrl) {
        personData.photoUrl = photoUrl;
      }

      // Create the person
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}/people`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add person');
      }

      const result = await response.json();
      const newPersonId = result.data?.id;

      // Create relationship if parent specified
      if (parentId && newPersonId && relationshipType) {
        await createRelationship(newPersonId, parentId, relationshipType);
      }

      onSuccess?.(newPersonId);
      return newPersonId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      onError?.(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [treeId, uploadPhoto, onSuccess, onError]);

  // Create relationship between people
  const createRelationship = useCallback(async (
    personId: string,
    parentId: string,
    relationshipType: 'CHILD' | 'SPOUSE' | 'SIBLING'
  ): Promise<void> => {
    try {
      let endpoint: string;
      let body: Record<string, unknown>;

      switch (relationshipType) {
        case 'CHILD':
          endpoint = `${API_URL}/api/family-trees/${treeId}/relationships`;
          body = {
            fromPersonId: parentId,
            toPersonId: personId,
            type: 'PARENT_CHILD',
          };
          break;
        case 'SPOUSE':
          endpoint = `${API_URL}/api/family-trees/${treeId}/marriages`;
          body = {
            person1Id: parentId,
            person2Id: personId,
          };
          break;
        case 'SIBLING':
          endpoint = `${API_URL}/api/family-trees/${treeId}/relationships`;
          body = {
            fromPersonId: parentId,
            toPersonId: personId,
            type: 'SIBLING',
          };
          break;
        default:
          return;
      }

      await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('Failed to create relationship:', error);
    }
  }, [treeId]);

  // Save draft
  const saveDraft = useCallback((
    data: QuickAddPersonData,
    parentId?: string,
    relationshipType?: 'CHILD' | 'SPOUSE' | 'SIBLING'
  ): Draft => {
    const now = Date.now();
    const draft: Draft = {
      ...data,
      id: generateId(),
      treeId,
      parentId,
      relationshipType,
      createdAt: now,
      updatedAt: now,
    };

    const newDrafts = [...drafts, draft];
    setDrafts(newDrafts);
    saveDraftsToStorage(newDrafts);

    return draft;
  }, [treeId, drafts]);

  // Load a specific draft
  const loadDraft = useCallback((draftId: string): Draft | null => {
    return drafts.find(d => d.id === draftId) || null;
  }, [drafts]);

  // Delete draft
  const deleteDraft = useCallback((draftId: string): void => {
    const newDrafts = drafts.filter(d => d.id !== draftId);
    setDrafts(newDrafts);
    saveDraftsToStorage(newDrafts);
  }, [drafts]);

  // Clear all drafts for this tree
  const clearAllDrafts = useCallback((): void => {
    setDrafts([]);
    saveDraftsToStorage([]);
  }, []);

  // Submit a draft
  const submitDraft = useCallback(async (draftId: string): Promise<string | null> => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) {
      onError?.('Draft not found');
      return null;
    }

    const result = await addPerson(draft, draft.parentId, draft.relationshipType);

    if (result) {
      // Delete draft on successful submission
      deleteDraft(draftId);
    }

    return result;
  }, [drafts, addPerson, deleteDraft, onError]);

  return {
    isSubmitting,
    drafts,
    addPerson,
    saveDraft,
    loadDraft,
    deleteDraft,
    clearAllDrafts,
    submitDraft,
  };
}

export default useMobileQuickAdd;
