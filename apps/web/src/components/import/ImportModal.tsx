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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Network,
  MessageSquare,
  Layers,
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
  details: {
    nodeCount?: number;
    connectionCount?: number;
    commentCount?: number;
    maxDepth?: number;
    hasConnections?: boolean;
    version?: string;
    formatVersion?: string;
    title?: string;
    hasWarnings?: boolean;
    hasErrors?: boolean;
    sampleNodes?: Array<{
      text: string;
      type?: string;
      depth?: number;
      childCount?: number;
    }>;
    [key: string]: unknown;
  };
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
  const [showPreviewNodes, setShowPreviewNodes] = useState(false);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setFileContent(null);
    setDetectedFormat(null);
    setError(null);
    setImportSuccess(false);
    setShowPreviewNodes(false);
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
              data-testid="file-drop-zone"
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
                data-testid="file-input"
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
                <div className="p-4 border rounded-lg space-y-4" data-testid="format-detection-result">
                  {/* Format header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {formatIcons[detectedFormat.format] || formatIcons['unknown']}
                      <div>
                        <p className="font-medium">
                          {formatNames[detectedFormat.format] || detectedFormat.format}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {Math.round(detectedFormat.confidence * 100)}%
                          {detectedFormat.details.formatVersion && ` • v${detectedFormat.details.formatVersion}`}
                        </p>
                      </div>
                    </div>
                    {detectedFormat.supported && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Supported
                      </span>
                    )}
                  </div>

                  {/* Import statistics */}
                  {detectedFormat.details && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg" data-testid="import-statistics">
                      {detectedFormat.details.nodeCount !== undefined && (
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{detectedFormat.details.nodeCount}</p>
                            <p className="text-xs text-muted-foreground">Nodes</p>
                          </div>
                        </div>
                      )}
                      {detectedFormat.details.connectionCount !== undefined && detectedFormat.details.connectionCount > 0 && (
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{detectedFormat.details.connectionCount}</p>
                            <p className="text-xs text-muted-foreground">Connections</p>
                          </div>
                        </div>
                      )}
                      {detectedFormat.details.commentCount !== undefined && detectedFormat.details.commentCount > 0 && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{detectedFormat.details.commentCount}</p>
                            <p className="text-xs text-muted-foreground">Comments</p>
                          </div>
                        </div>
                      )}
                      {detectedFormat.details.maxDepth !== undefined && (
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{detectedFormat.details.maxDepth}</p>
                            <p className="text-xs text-muted-foreground">Max Depth</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title preview */}
                  {detectedFormat.details.title && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Title: </span>
                      <span className="font-medium">{detectedFormat.details.title}</span>
                    </div>
                  )}

                  {/* Sample nodes preview */}
                  {detectedFormat.details.sampleNodes && detectedFormat.details.sampleNodes.length > 0 && (
                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setShowPreviewNodes(!showPreviewNodes)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                        data-testid="toggle-preview-nodes"
                      >
                        {showPreviewNodes ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span>Preview nodes ({detectedFormat.details.sampleNodes.length} shown)</span>
                      </button>

                      {showPreviewNodes && (
                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto" data-testid="preview-nodes-list">
                          {detectedFormat.details.sampleNodes.map((node, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded"
                              style={{ marginLeft: `${(node.depth || 0) * 12}px` }}
                            >
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                node.type === 'ROOT'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              )}>
                                {node.type || 'NODE'}
                              </span>
                              <span className="truncate flex-1">{node.text}</span>
                              {node.childCount !== undefined && node.childCount > 0 && (
                                <span className="text-muted-foreground">
                                  +{node.childCount}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Warnings */}
                  {detectedFormat.details.hasWarnings && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Some data may not be imported correctly. Review after import.</span>
                    </div>
                  )}

                  {/* Unsupported format warning */}
                  {!detectedFormat.supported && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>This format is not supported for import</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" data-testid="import-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {importSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm" data-testid="import-success">
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
            data-testid="import-button"
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
