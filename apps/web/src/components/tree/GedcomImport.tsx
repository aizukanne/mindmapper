import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Users,
  Heart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useGedcomImport,
  formatFileSize,
  formatPersonName,
  formatGender,
  type GedcomIndividual,
} from '@/hooks/useGedcomImport';

interface GedcomImportProps {
  existingTreeId?: string;
  onComplete?: (treeId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function GedcomImport({
  existingTreeId,
  onComplete,
  onCancel,
  className = '',
}: GedcomImportProps) {
  const {
    step,
    loading,
    error,
    preview,
    importResult,
    uploadFile,
    confirmImport,
    cancelImport,
    reset,
  } = useGedcomImport();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [treeName, setTreeName] = useState('');
  const [treeDescription, setTreeDescription] = useState('');
  const [treePrivacy, setTreePrivacy] = useState<'PRIVATE' | 'FAMILY_ONLY' | 'PUBLIC'>('PRIVATE');
  const [showAllIndividuals, setShowAllIndividuals] = useState(false);
  const [showIssues, setShowIssues] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        await uploadFile(files[0], existingTreeId);
      }
    },
    [uploadFile, existingTreeId]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        await uploadFile(files[0], existingTreeId);
      }
    },
    [uploadFile, existingTreeId]
  );

  const handleConfirm = async () => {
    const result = await confirmImport({
      treeName: treeName || undefined,
      treeDescription: treeDescription || undefined,
      treePrivacy,
    });
    if (result && onComplete) {
      onComplete(result.treeId);
    }
  };

  const handleCancel = async () => {
    await cancelImport();
    onCancel?.();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Import GEDCOM</h2>
        {onCancel && step !== 'complete' && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {['upload', 'preview', 'configure', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : step === 'complete' || ['upload', 'preview', 'configure'].indexOf(step) > i
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step === 'complete' || ['upload', 'preview', 'configure'].indexOf(step) > i ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  ['upload', 'preview', 'configure'].indexOf(step) > i || step === 'complete'
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Import Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && !error && (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".ged,.gedcom"
            onChange={handleFileSelect}
            className="hidden"
          />

          {loading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Parsing GEDCOM file...</p>
              <p className="text-sm text-gray-400 mt-1">This may take a moment for large files</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your GEDCOM file here
              </p>
              <p className="text-gray-500 mb-4">or</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Select File
              </Button>
              <p className="text-sm text-gray-400 mt-4">
                Supports GEDCOM 5.5+ format (.ged, .gedcom)
              </p>
              <p className="text-sm text-gray-400">
                Maximum file size: 50MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
            <FileText className="w-10 h-10 text-blue-500" />
            <div>
              <p className="font-medium text-gray-900">{preview.filename}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(preview.fileSize)}
                {preview.header.source && ` • Created with ${preview.header.source}`}
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">
                {preview.summary.individuals.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Individuals</div>
            </div>
            <div className="bg-pink-50 rounded-lg p-4 text-center">
              <Heart className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-pink-900">
                {preview.summary.families.toLocaleString()}
              </div>
              <div className="text-sm text-pink-700">Families</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <Heart className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">
                {preview.summary.marriages.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Marriages</div>
            </div>
          </div>

          {/* Warnings/Errors */}
          {preview.issues.length > 0 && (
            <div className="border border-yellow-200 bg-yellow-50 rounded-lg">
              <button
                onClick={() => setShowIssues(!showIssues)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {preview.summary.warnings + preview.summary.errors} issues found
                  </span>
                </div>
                {showIssues ? (
                  <ChevronUp className="w-5 h-5 text-yellow-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-yellow-600" />
                )}
              </button>
              {showIssues && (
                <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                  <ul className="space-y-1 text-sm text-yellow-700">
                    {preview.issues.slice(0, 50).map((issue, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        {issue}
                      </li>
                    ))}
                    {preview.issues.length > 50 && (
                      <li className="text-yellow-600 font-medium">
                        ... and {preview.issues.length - 50} more issues
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sample Individuals */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Sample Individuals</h3>
              <button
                onClick={() => setShowAllIndividuals(!showAllIndividuals)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAllIndividuals ? 'Show less' : `Show all ${preview.summary.individuals}`}
              </button>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {(showAllIndividuals
                ? preview.sampleIndividuals
                : preview.sampleIndividuals.slice(0, 5)
              ).map((ind) => (
                <PersonPreviewRow key={ind.id} person={ind} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={() => reset()}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Configure (only for new trees) */}
      {step === 'preview' && preview && !existingTreeId && (
        <div className="space-y-6 mt-6 pt-6 border-t border-gray-200">
          <h3 className="font-medium text-gray-900">Tree Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tree Name
              </label>
              <input
                type="text"
                value={treeName}
                onChange={(e) => setTreeName(e.target.value)}
                placeholder="My Family Tree"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={treeDescription}
                onChange={(e) => setTreeDescription(e.target.value)}
                placeholder="Family history imported from genealogy software..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Privacy
              </label>
              <select
                value={treePrivacy}
                onChange={(e) => setTreePrivacy(e.target.value as typeof treePrivacy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PRIVATE">Private - Only you can view</option>
                <option value="FAMILY_ONLY">Family Only - Invited members can view</option>
                <option value="PUBLIC">Public - Anyone can view</option>
              </select>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import {preview.summary.individuals.toLocaleString()} People
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Import to existing tree button */}
      {step === 'preview' && preview && existingTreeId && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Add {preview.summary.individuals.toLocaleString()} People to Tree
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="text-center py-12">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Importing your family tree...</p>
          <p className="text-gray-500">This may take a few minutes for large files.</p>
          <p className="text-sm text-gray-400 mt-4">Please don't close this window.</p>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && importResult && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Import Complete!</h3>
          <p className="text-gray-600 mb-6">
            Your family tree has been successfully imported.
          </p>

          {/* Import Summary */}
          <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto mb-6">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {importResult.summary.personsCreated}
                </div>
                <div className="text-sm text-gray-600">People added</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {importResult.summary.relationshipsCreated}
                </div>
                <div className="text-sm text-gray-600">Relationships</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-600">
                  {importResult.summary.marriagesCreated}
                </div>
                <div className="text-sm text-gray-600">Marriages</div>
              </div>
              {importResult.summary.errorsCount > 0 && (
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {importResult.summary.errorsCount}
                  </div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              )}
            </div>
          </div>

          {/* Errors if any */}
          {importResult.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto mb-6 text-left">
              <p className="font-medium text-yellow-800 mb-2">Some items couldn't be imported:</p>
              <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li className="font-medium">
                    ... and {importResult.errors.length - 10} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={() => onComplete?.(importResult.treeId)}
            className="gap-2"
          >
            View Family Tree
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Person preview row component
function PersonPreviewRow({ person }: { person: GedcomIndividual }) {
  return (
    <div className="p-3 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <span className="text-gray-500 font-medium">
          {person.firstName?.charAt(0) || '?'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{formatPersonName(person)}</p>
        <p className="text-sm text-gray-500">
          {formatGender(person.gender)}
          {person.birthDate && ` • Born ${person.birthDate}`}
          {person.deathDate && ` • Died ${person.deathDate}`}
          {!person.deathDate && person.isLiving && ' • Living'}
        </p>
      </div>
    </div>
  );
}

export default GedcomImport;
