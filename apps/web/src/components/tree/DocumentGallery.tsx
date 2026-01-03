import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  X,
  Calendar,
  User,
  Filter,
  Loader2,
  Trash2,
  Edit3,
  Download,
  Check,
  XCircle,
  Clock,
  Link2,
  Search,
  MoreVertical,
  FileCheck,
  FilePlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useDocuments,
  type Document,
  type DocumentType,
  type DocumentStatus,
  formatDocumentType,
  formatDocumentStatus,
} from '@/hooks/useDocuments';
import type { Person } from '@mindmapper/types';

export interface DocumentGalleryProps {
  treeId: string;
  people: Person[];
  onPersonClick?: (personId: string) => void;
  className?: string;
  isAdmin?: boolean;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
  { value: 'DEATH_CERTIFICATE', label: 'Death Certificate' },
  { value: 'MARRIAGE_CERTIFICATE', label: 'Marriage Certificate' },
  { value: 'DIVORCE_DECREE', label: 'Divorce Decree' },
  { value: 'CENSUS_RECORD', label: 'Census Record' },
  { value: 'MILITARY_RECORD', label: 'Military Record' },
  { value: 'IMMIGRATION_RECORD', label: 'Immigration Record' },
  { value: 'NEWSPAPER_ARTICLE', label: 'Newspaper Article' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'LETTER', label: 'Letter' },
  { value: 'WILL', label: 'Will' },
  { value: 'DEED', label: 'Deed' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: { value: DocumentStatus; label: string; color: string }[] = [
  { value: 'DRAFT', label: 'Draft', color: 'gray' },
  { value: 'PENDING', label: 'Pending Review', color: 'yellow' },
  { value: 'APPROVED', label: 'Approved', color: 'green' },
  { value: 'REJECTED', label: 'Rejected', color: 'red' },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentGallery({
  treeId,
  people,
  onPersonClick,
  className = '',
  isAdmin = false,
}: DocumentGalleryProps) {
  const {
    documents,
    total,
    loading,
    error,
    filters,
    setFilters,
    uploadDocumentFile,
    updateDocument,
    deleteDocument,
    submitForApproval,
    reviewDocument,
    linkPeople,
    getDownloadUrl,
    getPendingDocuments,
    loadMore,
    hasMore,
  } = useDocuments(treeId);

  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<Document[]>([]);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<DocumentType>('OTHER');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadCitation, setUploadCitation] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadPersonId, setUploadPersonId] = useState('');
  const [uploadHasWatermark, setUploadHasWatermark] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<DocumentType>('OTHER');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCitation, setEditCitation] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPersonId, setEditPersonId] = useState('');
  const [editHasWatermark, setEditHasWatermark] = useState(false);
  const [editing, setEditing] = useState(false);

  // Link people state
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);

  // Review state
  const [reviewNote, setReviewNote] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // Filter state
  const [filterSearch, setFilterSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) return;

    setUploading(true);
    try {
      await uploadDocumentFile(uploadFile, {
        title: uploadTitle,
        documentType: uploadType,
        description: uploadDescription || undefined,
        notes: uploadNotes || undefined,
        citation: uploadCitation || undefined,
        dateOnDocument: uploadDate || undefined,
        personId: uploadPersonId || undefined,
        hasWatermark: uploadHasWatermark,
      });

      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadType('OTHER');
      setUploadDescription('');
      setUploadNotes('');
      setUploadCitation('');
      setUploadDate('');
      setUploadPersonId('');
      setUploadHasWatermark(false);
      setShowUpload(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (doc: Document) => {
    setSelectedDocument(doc);
    setEditTitle(doc.title);
    setEditType(doc.documentType);
    setEditDescription(doc.description || '');
    setEditNotes(doc.notes || '');
    setEditCitation(doc.citation || '');
    setEditDate(doc.dateOnDocument?.split('T')[0] || '');
    setEditPersonId(doc.personId || '');
    setEditHasWatermark(doc.hasWatermark);
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!selectedDocument) return;

    setEditing(true);
    try {
      await updateDocument(selectedDocument.id, {
        title: editTitle,
        documentType: editType,
        description: editDescription || undefined,
        notes: editNotes || undefined,
        citation: editCitation || undefined,
        dateOnDocument: editDate || null,
        personId: editPersonId || null,
        hasWatermark: editHasWatermark,
      });
      setShowEditModal(false);
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    await deleteDocument(doc.id);
    setActionMenu(null);
  };

  const handleDownload = async (doc: Document) => {
    const info = await getDownloadUrl(doc.id);
    if (info?.downloadUrl) {
      window.open(info.downloadUrl, '_blank');
    }
    setActionMenu(null);
  };

  const handleSubmitForApproval = async (doc: Document) => {
    await submitForApproval(doc.id);
    setActionMenu(null);
  };

  const openLinkModal = (doc: Document) => {
    setSelectedDocument(doc);
    setSelectedPersonIds(doc.linkedPersons.map(lp => lp.personId));
    setShowLinkModal(true);
    setActionMenu(null);
  };

  const handleLink = async () => {
    if (!selectedDocument) return;

    setLinking(true);
    try {
      await linkPeople(selectedDocument.id, selectedPersonIds);
      setShowLinkModal(false);
    } finally {
      setLinking(false);
    }
  };

  const openReviewModal = (doc: Document) => {
    setSelectedDocument(doc);
    setReviewNote('');
    setIsOfficial(false);
    setShowReviewModal(true);
    setActionMenu(null);
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedDocument) return;

    setReviewing(true);
    try {
      await reviewDocument(selectedDocument.id, {
        action,
        note: reviewNote || undefined,
        isOfficial: action === 'approve' ? isOfficial : undefined,
      });
      setShowReviewModal(false);
    } finally {
      setReviewing(false);
    }
  };

  const openPendingModal = async () => {
    const pending = await getPendingDocuments();
    setPendingDocuments(pending);
    setShowPendingModal(true);
  };

  const applyFilters = () => {
    setFilters({
      ...filters,
      search: filterSearch || null,
    });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setFilterSearch('');
    setShowFilters(false);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Documents</h3>
          <span className="text-sm text-gray-500">({total})</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={openPendingModal}
              className="flex items-center gap-1"
            >
              <Clock className="w-4 h-4" />
              Pending
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button
            size="sm"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.documentType || ''}
                onChange={(e) => setFilters({ ...filters, documentType: (e.target.value as DocumentType) || null })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Types</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: (e.target.value as DocumentStatus) || null })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
              <select
                value={filters.personId || ''}
                onChange={(e) => setFilters({ ...filters, personId: e.target.value || null })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All People</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.firstName} {person.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Document List */}
      <div className="divide-y divide-gray-100">
        {loading && documents.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-500 mt-2">No documents yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(true)}
              className="mt-4"
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload First Document
            </Button>
          </div>
        ) : (
          <>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Document Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {doc.url ? (
                      <img
                        src={doc.url}
                        alt={doc.title}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                      {doc.isOfficial && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Official
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        doc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {formatDocumentStatus(doc.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {formatDocumentType(doc.documentType)}
                      </span>
                      {doc.dateOnDocument && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(doc.dateOnDocument)}
                        </span>
                      )}
                      {doc.fileSize && (
                        <span>{formatFileSize(doc.fileSize)}</span>
                      )}
                    </div>

                    {doc.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{doc.description}</p>
                    )}

                    {/* Linked People */}
                    {doc.linkedPersons.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {doc.linkedPersons.map((lp) => (
                            <button
                              key={lp.id}
                              onClick={() => onPersonClick?.(lp.personId)}
                              className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors"
                            >
                              {lp.person.firstName} {lp.person.lastName}
                              {lp.role && <span className="text-gray-500"> ({lp.role})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActionMenu(actionMenu === doc.id ? null : doc.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>

                    {actionMenu === doc.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        {doc.s3Key && (
                          <button
                            onClick={() => handleDownload(doc)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        )}
                        <button
                          onClick={() => {
                            openEditModal(doc);
                            setActionMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => openLinkModal(doc)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          Link People
                        </button>
                        {doc.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSubmitForApproval(doc)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FilePlus className="w-4 h-4" />
                            Submit for Approval
                          </button>
                        )}
                        {isAdmin && doc.status === 'PENDING' && (
                          <button
                            onClick={() => openReviewModal(doc)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FileCheck className="w-4 h-4" />
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="p-4 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Upload Document</h3>
              <button onClick={() => setShowUpload(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                {uploadFile && (
                  <p className="text-sm text-gray-500 mt-1">
                    Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief description of the document"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Person
                </label>
                <select
                  value={uploadPersonId}
                  onChange={(e) => setUploadPersonId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select a person</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date on Document */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date on Document
                </label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Citation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Citation
                </label>
                <input
                  type="text"
                  value={uploadCitation}
                  onChange={(e) => setUploadCitation(e.target.value)}
                  placeholder="e.g., National Archives, Record Group..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Additional notes about this document"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Has Watermark */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasWatermark"
                  checked={uploadHasWatermark}
                  onChange={(e) => setUploadHasWatermark(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="hasWatermark" className="text-sm text-gray-700">
                  This document has a watermark
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadTitle || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Edit Document</h3>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Person</label>
                <select
                  value={editPersonId}
                  onChange={(e) => setEditPersonId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">None</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date on Document</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Citation</label>
                <input
                  type="text"
                  value={editCitation}
                  onChange={(e) => setEditCitation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editHasWatermark"
                  checked={editHasWatermark}
                  onChange={(e) => setEditHasWatermark(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="editHasWatermark" className="text-sm text-gray-700">
                  Has watermark
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!editTitle || editing}>
                {editing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link People Modal */}
      {showLinkModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Link People to Document</h3>
              <button onClick={() => setShowLinkModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                Select people who appear in or are related to this document.
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {people.map((person) => (
                  <label
                    key={person.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersonIds.includes(person.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPersonIds([...selectedPersonIds, person.id]);
                        } else {
                          setSelectedPersonIds(selectedPersonIds.filter(id => id !== person.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex items-center gap-2">
                      {person.profilePhoto ? (
                        <img
                          src={person.profilePhoto}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <span className="text-sm">
                        {person.firstName} {person.lastName}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowLinkModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleLink} disabled={linking}>
                {linking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Links'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Review Document</h3>
              <button onClick={() => setShowReviewModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{selectedDocument.title}</h4>
                <p className="text-sm text-gray-500">
                  {formatDocumentType(selectedDocument.documentType)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Note
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note about this review..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOfficial"
                  checked={isOfficial}
                  onChange={(e) => setIsOfficial(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isOfficial" className="text-sm text-gray-700">
                  Mark as official record
                </label>
              </div>
            </div>

            <div className="flex justify-between p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => handleReview('reject')}
                disabled={reviewing}
                className="text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleReview('approve')}
                disabled={reviewing}
              >
                {reviewing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Documents Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold">Pending Documents</h3>
              <button onClick={() => setShowPendingModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="divide-y">
              {pendingDocuments.length === 0 ? (
                <div className="p-8 text-center">
                  <Check className="w-12 h-12 mx-auto text-green-400" />
                  <p className="text-gray-500 mt-2">No documents pending review</p>
                </div>
              ) : (
                pendingDocuments.map((doc) => (
                  <div key={doc.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-sm text-gray-500">
                          {formatDocumentType(doc.documentType)} · Uploaded{' '}
                          {formatDate(doc.createdAt)}
                        </p>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowPendingModal(false);
                          openReviewModal(doc);
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler for action menu */}
      {actionMenu && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setActionMenu(null)}
        />
      )}
    </div>
  );
}

export default DocumentGallery;
