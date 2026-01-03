import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface GedcomIndividual {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  suffix?: string;
  nickname?: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving: boolean;
  occupation?: string;
  education?: string;
  notes?: string;
}

export interface GedcomFamily {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childIds: string[];
  marriageDate?: string;
  marriagePlace?: string;
  divorceDate?: string;
  divorcePlace?: string;
}

export interface GedcomPreview {
  previewId: string;
  filename: string;
  fileSize: number;
  summary: {
    individuals: number;
    families: number;
    marriages: number;
    warnings: number;
    errors: number;
  };
  sampleIndividuals: GedcomIndividual[];
  sampleFamilies: GedcomFamily[];
  issues: string[];
  header: {
    source?: string;
    version?: string;
    charset?: string;
  };
}

export interface ImportResult {
  treeId: string;
  isNewTree: boolean;
  summary: {
    personsCreated: number;
    relationshipsCreated: number;
    marriagesCreated: number;
    errorsCount: number;
  };
  errors: string[];
}

export type ImportStep = 'upload' | 'preview' | 'configure' | 'importing' | 'complete' | 'error';

interface UseGedcomImportResult {
  step: ImportStep;
  loading: boolean;
  error: string | null;
  preview: GedcomPreview | null;
  importResult: ImportResult | null;
  uploadFile: (file: File, existingTreeId?: string) => Promise<GedcomPreview | null>;
  confirmImport: (options: {
    treeName?: string;
    treeDescription?: string;
    treePrivacy?: 'PRIVATE' | 'FAMILY_ONLY' | 'PUBLIC';
  }) => Promise<ImportResult | null>;
  cancelImport: () => Promise<void>;
  reset: () => void;
}

export function useGedcomImport(): UseGedcomImportResult {
  const [step, setStep] = useState<ImportStep>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GedcomPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const uploadFile = useCallback(
    async (file: File, existingTreeId?: string): Promise<GedcomPreview | null> => {
      setLoading(true);
      setError(null);
      setStep('upload');

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (existingTreeId) {
          formData.append('treeId', existingTreeId);
        }

        const response = await fetch(
          `${API_URL}/api/family-trees/import/gedcom/preview`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to parse GEDCOM file');
        }

        const data = await response.json();
        setPreview(data.data);
        setStep('preview');
        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        setStep('error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const confirmImport = useCallback(
    async (options: {
      treeName?: string;
      treeDescription?: string;
      treePrivacy?: 'PRIVATE' | 'FAMILY_ONLY' | 'PUBLIC';
    }): Promise<ImportResult | null> => {
      if (!preview) {
        setError('No preview data. Please upload a file first.');
        return null;
      }

      setLoading(true);
      setError(null);
      setStep('importing');

      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/import/gedcom/confirm`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              previewId: preview.previewId,
              treeName: options.treeName,
              treeDescription: options.treeDescription,
              treePrivacy: options.treePrivacy,
            }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to import GEDCOM file');
        }

        const data = await response.json();
        setImportResult(data.data);
        setStep('complete');
        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        setStep('error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [preview]
  );

  const cancelImport = useCallback(async () => {
    if (preview?.previewId) {
      try {
        await fetch(
          `${API_URL}/api/family-trees/import/gedcom/preview/${preview.previewId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );
      } catch {
        // Ignore errors on cancel
      }
    }
    setPreview(null);
    setStep('upload');
    setError(null);
  }, [preview]);

  const reset = useCallback(() => {
    setStep('upload');
    setLoading(false);
    setError(null);
    setPreview(null);
    setImportResult(null);
  }, []);

  return {
    step,
    loading,
    error,
    preview,
    importResult,
    uploadFile,
    confirmImport,
    cancelImport,
    reset,
  };
}

// Helper functions
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatGender(gender: GedcomIndividual['gender']): string {
  switch (gender) {
    case 'MALE': return 'Male';
    case 'FEMALE': return 'Female';
    default: return 'Unknown';
  }
}

export function formatPersonName(person: GedcomIndividual): string {
  const parts = [person.firstName];
  if (person.middleName) parts.push(person.middleName);
  parts.push(person.lastName);
  if (person.suffix) parts.push(person.suffix);
  return parts.join(' ');
}
