import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileJson,
  FileText,
  FileCode,
  Loader2,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
  onImportSuccess?: (mapId: string) => void;
}

interface DetectedFormat {
  format: string;
  confidence: number;
  details: Record<string, unknown>;
  supported: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const formatIcons: Record<string, React.ReactNode> = {
  'mindmapper-json': <FileJson className="h-5 w-5 text-blue-500" />,
  'simple': <FileJson className="h-5 w-5 text-green-500" />,
  'freemind': <FileCode className="h-5 w-5 text-orange-500" />,
  'array': <FileText className="h-5 w-5 text-purple-500" />,
  'unknown': <AlertCircle className="h-5 w-5 text-yellow-500" />,
};

const formatNames: Record<string, string> = {
  'mindmapper-json': 'MindMapper Format',
  'simple': 'Simple JSON',
  'freemind': 'FreeMind XML',
  'array': 'Text Array',
  'unknown': 'Unknown Format',
};

export function ImportModal({ open, onOpenChange, folderId, onImportSuccess }: ImportModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | object | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setFileContent(null);
    setDetectedFormat(null);
    setError(null);
    setImportSuccess(false);
  }, []);

  const detectFormat = useCallback(async (data: string | object) => {
    setIsDetecting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/maps/import/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error('Format detection failed');
      }

      const result = await response.json();
      setDetectedFormat(result.data);
    } catch (err) {
      console.error('Detection error:', err);
      setError('Failed to detect file format');
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);

    try {
      const text = await file.text();
      let content: string | object;

      // Try to parse as JSON
      try {
        content = JSON.parse(text);
      } catch {
        // Keep as string (might be XML)
        content = text;
      }

      setFileContent(content);
      await detectFormat(content);
    } catch (err) {
      console.error('File processing error:', err);
      setError('Failed to read file');
    }
  }, [detectFormat]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleImport = useCallback(async () => {
    if (!fileContent || !detectedFormat?.supported) return;

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/maps/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data: fileContent,
          format: detectedFormat.format,
          folderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }

      const result = await response.json();
      setImportSuccess(true);

      // Navigate to the imported map or call callback
      setTimeout(() => {
        onOpenChange(false);
        if (onImportSuccess) {
          onImportSuccess(result.data.id);
        } else {
          navigate(`/map/${result.data.id}`);
        }
      }, 1000);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [fileContent, detectedFormat, folderId, onOpenChange, onImportSuccess, navigate]);

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetState();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Mind Map</DialogTitle>
          <DialogDescription>
            Import a mind map from a file. Supported formats: JSON, FreeMind XML.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!selectedFile ? (
            // File drop zone
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports .json, .mm (FreeMind), .txt
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.mm,.txt,.xml"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            // File info and format detection
            <div className="space-y-4">
              {/* Selected file */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileJson className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm truncate max-w-[200px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetState}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Format detection */}
              {isDetecting && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Detecting format...
                  </span>
                </div>
              )}

              {detectedFormat && !isDetecting && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    {formatIcons[detectedFormat.format] || formatIcons['unknown']}
                    <div>
                      <p className="font-medium">
                        {formatNames[detectedFormat.format] || detectedFormat.format}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Confidence: {Math.round(detectedFormat.confidence * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Format details */}
                  {detectedFormat.details && Object.keys(detectedFormat.details).length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1 mb-3">
                      {detectedFormat.details.nodeCount !== undefined && (
                        <p>Nodes: {String(detectedFormat.details.nodeCount)}</p>
                      )}
                      {detectedFormat.details.hasConnections !== undefined && (
                        <p>Has connections: {detectedFormat.details.hasConnections ? 'Yes' : 'No'}</p>
                      )}
                      {detectedFormat.details.version !== undefined && (
                        <p>Version: {String(detectedFormat.details.version)}</p>
                      )}
                    </div>
                  )}

                  {!detectedFormat.supported && (
                    <div className="flex items-center gap-2 text-yellow-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>This format may not import correctly</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {importSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Import successful! Redirecting...</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || !detectedFormat?.supported || isImporting || importSuccess}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : importSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Imported!
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
