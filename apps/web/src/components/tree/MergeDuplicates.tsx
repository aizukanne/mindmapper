import { useState, useEffect } from 'react';
import {
  Users,
  GitMerge,
  AlertTriangle,
  X,
  Search,
  ChevronRight,
  Loader2,
  Undo2,
  Clock,
  History,
  User,
  Image,
  FileText,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useMerge,
  type DuplicatePair,
  type MergePreview,
  type MergeRecord,
  type FieldSelection,
  formatMergeStatus,
  getMergeStatusColor,
  formatTimeRemaining,
} from '@/hooks/useMerge';

export interface MergeDuplicatesProps {
  treeId: string;
  onMergeComplete?: () => void;
  className?: string;
}

type ViewMode = 'duplicates' | 'preview' | 'history';

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  maidenName: 'Maiden Name',
  nickname: 'Nickname',
  birthDate: 'Birth Date',
  birthPlace: 'Birth Place',
  deathDate: 'Death Date',
  deathPlace: 'Death Place',
  biography: 'Biography',
  occupation: 'Occupation',
  education: 'Education',
  profilePhoto: 'Profile Photo',
};

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
    return formatDate(value as string);
  }
  return String(value);
}

export function MergeDuplicates({
  treeId,
  onMergeComplete,
  className = '',
}: MergeDuplicatesProps) {
  const {
    loading,
    error,
    getDuplicates,
    getMergePreview,
    mergePersons,
    getMergeHistory,
    revertMerge,
  } = useMerge(treeId);

  const [view, setView] = useState<ViewMode>('duplicates');
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [minScore, setMinScore] = useState(60);
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [fieldSelections, setFieldSelections] = useState<Record<string, FieldSelection>>({});
  const [primaryPersonId, setPrimaryPersonId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeHistory, setMergeHistory] = useState<MergeRecord[]>([]);
  const [reverting, setReverting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load duplicates on mount
  useEffect(() => {
    loadDuplicates();
  }, [treeId]);

  const loadDuplicates = async () => {
    const result = await getDuplicates(minScore);
    if (result) {
      setDuplicates(result.duplicates);
    }
  };

  const loadHistory = async () => {
    const history = await getMergeHistory();
    setMergeHistory(history);
  };

  const handleSelectPair = async (pair: DuplicatePair) => {
    setSelectedPair(pair);
    setPrimaryPersonId(pair.person1.id);
    setFieldSelections({});

    const previewData = await getMergePreview(pair.person1.id, pair.person2.id);
    if (previewData) {
      setPreview(previewData);
      setView('preview');
    }
  };

  const handleSwapPrimary = async () => {
    if (!selectedPair || !preview) return;

    const newPrimaryId =
      primaryPersonId === selectedPair.person1.id
        ? selectedPair.person2.id
        : selectedPair.person1.id;

    setPrimaryPersonId(newPrimaryId);

    // Get new preview with swapped persons
    const person1Id = newPrimaryId;
    const person2Id = newPrimaryId === selectedPair.person1.id ? selectedPair.person2.id : selectedPair.person1.id;

    const previewData = await getMergePreview(person1Id, person2Id);
    if (previewData) {
      setPreview(previewData);
      // Reset field selections when swapping
      setFieldSelections({});
    }
  };

  const handleFieldSelect = (field: string, selection: FieldSelection) => {
    setFieldSelections(prev => ({ ...prev, [field]: selection }));
  };

  const handleMerge = async () => {
    if (!preview || !primaryPersonId) return;

    const mergedPersonId =
      primaryPersonId === preview.person1.id ? preview.person2.id : preview.person1.id;

    setMerging(true);
    const result = await mergePersons({
      primaryPersonId,
      mergedPersonId,
      fieldSelections,
    });
    setMerging(false);

    if (result) {
      // Reset state and go back to duplicates
      setPreview(null);
      setSelectedPair(null);
      setFieldSelections({});
      setPrimaryPersonId(null);
      setView('duplicates');

      // Reload duplicates list
      await loadDuplicates();

      if (onMergeComplete) {
        onMergeComplete();
      }
    }
  };

  const handleRevert = async (mergeId: string) => {
    setReverting(mergeId);
    const success = await revertMerge(mergeId);
    setReverting(null);

    if (success) {
      await loadHistory();
      await loadDuplicates();
      if (onMergeComplete) {
        onMergeComplete();
      }
    }
  };

  const handleViewHistory = () => {
    loadHistory();
    setView('history');
  };

  const handleBackToDuplicates = () => {
    setView('duplicates');
    setPreview(null);
    setSelectedPair(null);
  };

  // Filter duplicates by search query
  const filteredDuplicates = duplicates.filter(pair => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pair.person1.firstName.toLowerCase().includes(query) ||
      pair.person1.lastName.toLowerCase().includes(query) ||
      pair.person2.firstName.toLowerCase().includes(query) ||
      pair.person2.lastName.toLowerCase().includes(query)
    );
  });

  const getPrimaryPerson = () => {
    if (!preview || !primaryPersonId) return null;
    return primaryPersonId === preview.person1.id ? preview.person1 : preview.person2;
  };

  const getMergedPerson = () => {
    if (!preview || !primaryPersonId) return null;
    return primaryPersonId === preview.person1.id ? preview.person2 : preview.person1;
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitMerge className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Merge Duplicates</h2>
        </div>
        <div className="flex items-center gap-2">
          {view !== 'history' && (
            <Button variant="outline" size="sm" onClick={handleViewHistory}>
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
          )}
          {view !== 'duplicates' && (
            <Button variant="ghost" size="sm" onClick={handleBackToDuplicates}>
              <X className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Duplicates List View */}
      {view === 'duplicates' && (
        <div>
          {/* Controls */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Min score:</label>
              <select
                value={minScore}
                onChange={e => {
                  setMinScore(Number(e.target.value));
                  getDuplicates(Number(e.target.value)).then(result => {
                    if (result) setDuplicates(result.duplicates);
                  });
                }}
                className="px-3 py-2 border rounded-lg"
              >
                <option value={40}>40+</option>
                <option value={50}>50+</option>
                <option value={60}>60+</option>
                <option value={70}>70+</option>
                <option value={80}>80+</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={loadDuplicates} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {/* Duplicates list */}
          {loading && duplicates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredDuplicates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No potential duplicates found</p>
              <p className="text-sm mt-1">Try lowering the minimum score threshold</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDuplicates.map(pair => (
                <div
                  key={`${pair.person1.id}-${pair.person2.id}`}
                  className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => handleSelectPair(pair)}
                >
                  {/* Person 1 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {pair.person1.profilePhoto ? (
                        <img
                          src={pair.person1.profilePhoto}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {pair.person1.firstName} {pair.person1.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {pair.person1.birthDate ? formatDate(pair.person1.birthDate) : 'Unknown birth date'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-center px-4">
                    <div
                      className={`text-lg font-bold ${
                        pair.score >= 80
                          ? 'text-red-600'
                          : pair.score >= 60
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {pair.score}%
                    </div>
                    <div className="text-xs text-gray-500">match</div>
                  </div>

                  {/* Person 2 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {pair.person2.profilePhoto ? (
                        <img
                          src={pair.person2.profilePhoto}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {pair.person2.firstName} {pair.person2.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {pair.person2.birthDate ? formatDate(pair.person2.birthDate) : 'Unknown birth date'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Merge Preview View */}
      {view === 'preview' && preview && (
        <div>
          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings
              </div>
              <ul className="text-sm text-yellow-700 space-y-1">
                {preview.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary vs Merged Person Headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div
              className={`p-4 rounded-lg border-2 ${
                primaryPersonId === preview.person1.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {primaryPersonId === preview.person1.id ? 'Keep (Primary)' : 'Remove (Merged)'}
                </span>
                {primaryPersonId !== preview.person1.id && (
                  <Button variant="ghost" size="sm" onClick={handleSwapPrimary}>
                    Make Primary
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {preview.person1.profilePhoto ? (
                  <img
                    src={preview.person1.profilePhoto as string}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="font-semibold">
                    {preview.person1.firstName} {preview.person1.lastName}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      {preview.assetsSummary.person1.photos}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {preview.assetsSummary.person1.documents}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {preview.assetsSummary.person1.stories}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border-2 ${
                primaryPersonId === preview.person2.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {primaryPersonId === preview.person2.id ? 'Keep (Primary)' : 'Remove (Merged)'}
                </span>
                {primaryPersonId !== preview.person2.id && (
                  <Button variant="ghost" size="sm" onClick={handleSwapPrimary}>
                    Make Primary
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {preview.person2.profilePhoto ? (
                  <img
                    src={preview.person2.profilePhoto as string}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="font-semibold">
                    {preview.person2.firstName} {preview.person2.lastName}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      {preview.assetsSummary.person2.photos}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {preview.assetsSummary.person2.documents}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {preview.assetsSummary.person2.stories}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Similarity info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-blue-700">{preview.similarityScore}%</span>
              <span className="text-sm text-blue-600">similarity score</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {preview.similarityReasons.map((reason, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {reason}
                </span>
              ))}
            </div>
          </div>

          {/* Field comparison table */}
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    {getPrimaryPerson()?.firstName || 'Primary'}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    {getMergedPerson()?.firstName || 'Merged'}
                  </th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600 w-32">Use</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(preview.fieldComparison).map(([field, comparison]) => {
                  const primaryValue =
                    primaryPersonId === preview.person1.id
                      ? comparison.person1
                      : comparison.person2;
                  const mergedValue =
                    primaryPersonId === preview.person1.id
                      ? comparison.person2
                      : comparison.person1;
                  const selectedValue = fieldSelections[field] || 'primary';
                  const hasConflict =
                    formatValue(primaryValue) !== formatValue(mergedValue) &&
                    primaryValue != null &&
                    mergedValue != null;

                  return (
                    <tr key={field} className={hasConflict ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-2 font-medium">{FIELD_LABELS[field] || field}</td>
                      <td className="px-4 py-2">
                        <span className={selectedValue === 'primary' ? 'font-medium' : 'text-gray-500'}>
                          {formatValue(primaryValue)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={selectedValue === 'merged' ? 'font-medium' : 'text-gray-500'}>
                          {formatValue(mergedValue)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {hasConflict ? (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleFieldSelect(field, 'primary')}
                              className={`px-2 py-1 text-xs rounded ${
                                selectedValue === 'primary'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              Primary
                            </button>
                            <button
                              onClick={() => handleFieldSelect(field, 'merged')}
                              className={`px-2 py-1 text-xs rounded ${
                                selectedValue === 'merged'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              Merged
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Relationships transfer info */}
          <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
            <h4 className="font-medium mb-2">Relationships to Transfer</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">From person being removed:</span>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>
                    {preview.relationshipsSummary[primaryPersonId === preview.person1.id ? 'person2' : 'person1'].parents} parents
                  </li>
                  <li>
                    {preview.relationshipsSummary[primaryPersonId === preview.person1.id ? 'person2' : 'person1'].children} children
                  </li>
                  <li>
                    {preview.relationshipsSummary[primaryPersonId === preview.person1.id ? 'person2' : 'person1'].siblings} siblings
                  </li>
                  <li>
                    {preview.relationshipsSummary[primaryPersonId === preview.person1.id ? 'person2' : 'person1'].spouses} spouses
                  </li>
                </ul>
              </div>
              <div>
                <span className="text-gray-600">Assets to transfer:</span>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>
                    {preview.assetsSummary[primaryPersonId === preview.person1.id ? 'person2' : 'person1'].photos} photos
                  </li>
                  <li>
                    {preview.assetsSummary[primaryPersonId === preview.person1.id ? 'person2' : 'person1'].documents} documents
                  </li>
                  <li>
                    {preview.assetsSummary[primaryPersonId === preview.person1.id ? 'person2' : 'person1'].stories} stories
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              This merge can be reverted within 30 days.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleBackToDuplicates}>
                Cancel
              </Button>
              <Button onClick={handleMerge} disabled={merging || !!preview.linkedMembers.person2}>
                {merging ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4 mr-1" />
                )}
                Merge Profiles
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Merge History View */}
      {view === 'history' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : mergeHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No merge history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mergeHistory.map(merge => {
                const mergedData = merge.mergedPersonData as Record<string, unknown>;
                return (
                  <div
                    key={merge.id}
                    className="p-4 bg-white border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${getMergeStatusColor(
                              merge.status
                            )}`}
                          >
                            {formatMergeStatus(merge.status)}
                          </span>
                          {merge.status === 'COMPLETED' && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeRemaining(merge.expiresAt)}
                            </span>
                          )}
                        </div>
                        <p className="font-medium">
                          Merged "{String(mergedData.firstName || '')} {String(mergedData.lastName || '')}" into profile
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          By {merge.performedBy.name || 'Unknown'} on{' '}
                          {new Date(merge.createdAt).toLocaleDateString()}
                        </p>
                        {merge.revertedBy && (
                          <p className="text-sm text-gray-500">
                            Reverted by {merge.revertedBy.name || 'Unknown'} on{' '}
                            {merge.revertedAt
                              ? new Date(merge.revertedAt).toLocaleDateString()
                              : 'Unknown date'}
                          </p>
                        )}
                      </div>
                      {merge.status === 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevert(merge.id)}
                          disabled={reverting === merge.id}
                        >
                          {reverting === merge.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Undo2 className="w-4 h-4 mr-1" />
                              Revert
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
