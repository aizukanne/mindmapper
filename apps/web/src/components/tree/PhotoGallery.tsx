import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Image,
  Upload,
  X,
  Calendar,
  MapPin,
  User,
  Tag,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Users,
  Shield,
  Lock,
  Download,
  HardDrive,
  FileImage,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePhotos, type Photo, type PhotoPrivacy, type PhotoFilters, type PhotoQuota } from '@/hooks/usePhotos';
import type { Person } from '@mindmapper/types';

export interface PhotoGalleryProps {
  treeId: string;
  people: Person[];
  onPersonClick?: (personId: string) => void;
  className?: string;
  isAdmin?: boolean;
}

const PRIVACY_OPTIONS: { value: PhotoPrivacy; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'PUBLIC', label: 'Public', icon: <Eye className="w-4 h-4" />, color: 'text-emerald-600' },
  { value: 'ALL_FAMILY', label: 'All Family', icon: <Users className="w-4 h-4" />, color: 'text-blue-600' },
  { value: 'DIRECT_RELATIVES', label: 'Direct Relatives', icon: <User className="w-4 h-4" />, color: 'text-indigo-600' },
  { value: 'ADMINS_ONLY', label: 'Admins Only', icon: <Shield className="w-4 h-4" />, color: 'text-amber-600' },
  { value: 'PRIVATE', label: 'Private', icon: <Lock className="w-4 h-4" />, color: 'text-red-600' },
  { value: 'NONE', label: 'Hidden', icon: <EyeOff className="w-4 h-4" />, color: 'text-gray-400' },
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

export function PhotoGallery({
  treeId,
  people,
  onPersonClick,
  className = '',
  isAdmin = false,
}: PhotoGalleryProps) {
  const {
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
    hasMore,
  } = usePhotos(treeId);

  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Upload form state
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadLocation, setUploadLocation] = useState('');
  const [uploadPersonId, setUploadPersonId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [quota, setQuota] = useState<PhotoQuota | null>(null);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch quota when upload modal opens
  useEffect(() => {
    if (showUpload) {
      getQuota().then(setQuota);
    }
  }, [showUpload, getQuota]);

  // Edit form state
  const [editCaption, setEditCaption] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Tag modal state
  const [selectedPersonsToTag, setSelectedPersonsToTag] = useState<string[]>([]);
  const [tagging, setTagging] = useState(false);

  // Filter state
  const [filterPersonId, setFilterPersonId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Get tagged person ids for current photo
  const currentPhotoTaggedIds = useMemo(() => {
    if (!selectedPhoto) return new Set<string>();
    return new Set(selectedPhoto.taggedPeople.map(t => t.personId));
  }, [selectedPhoto]);

  const handleUpload = async () => {
    if (!uploadUrl.trim() && !uploadFile) return;

    setUploading(true);
    try {
      let photo;
      const metadata = {
        caption: uploadCaption.trim() || undefined,
        dateTaken: uploadDate || undefined,
        location: uploadLocation.trim() || undefined,
        personId: uploadPersonId || undefined,
      };

      if (uploadFile) {
        // Upload via file
        photo = await uploadPhotoFile(uploadFile, metadata);
      } else {
        // Upload via URL
        photo = await uploadPhoto({
          url: uploadUrl.trim(),
          ...metadata,
        });
      }

      if (photo) {
        setShowUpload(false);
        setUploadUrl('');
        setUploadFile(null);
        setUploadCaption('');
        setUploadDate('');
        setUploadLocation('');
        setUploadPersonId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadUrl(''); // Clear URL when file is selected
    }
  };

  const handleDownloadOriginal = async () => {
    if (!selectedPhoto) return;

    setDownloading(true);
    try {
      const downloadInfo = await getDownloadUrl(selectedPhoto.id);
      if (downloadInfo) {
        // Open download URL in new tab or trigger download
        const link = document.createElement('a');
        link.href = downloadInfo.downloadUrl;
        link.download = downloadInfo.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleApplyFilters = () => {
    const newFilters: PhotoFilters = { ...filters };
    if (filterPersonId) newFilters.personId = filterPersonId;
    else delete newFilters.personId;
    if (filterStartDate) newFilters.startDate = filterStartDate;
    else delete newFilters.startDate;
    if (filterEndDate) newFilters.endDate = filterEndDate;
    else delete newFilters.endDate;
    setFilters(newFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilterPersonId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilters({ sortBy: 'createdAt', sortOrder: 'desc' });
  };

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setPhotoIndex(index);
  };

  const handlePrevPhoto = () => {
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
      setSelectedPhoto(photos[photoIndex - 1]);
    }
  };

  const handleNextPhoto = () => {
    if (photoIndex < photos.length - 1) {
      setPhotoIndex(photoIndex + 1);
      setSelectedPhoto(photos[photoIndex + 1]);
    }
  };

  const handleDeletePhoto = async () => {
    if (!selectedPhoto) return;
    if (!confirm('Are you sure you want to delete this photo?')) return;

    const success = await deletePhoto(selectedPhoto.id);
    if (success) {
      setSelectedPhoto(null);
    }
  };

  const handleEditPhoto = () => {
    if (!selectedPhoto) return;
    setEditCaption(selectedPhoto.caption || '');
    setEditDate(selectedPhoto.dateTaken?.split('T')[0] || '');
    setEditLocation(selectedPhoto.location || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPhoto) return;

    setSaving(true);
    try {
      const updated = await updatePhoto(selectedPhoto.id, {
        caption: editCaption.trim() || undefined,
        dateTaken: editDate || null,
        location: editLocation.trim() || undefined,
      });

      if (updated) {
        setSelectedPhoto({ ...selectedPhoto, ...updated });
        setShowEditModal(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTagModal = () => {
    if (!selectedPhoto) return;
    setSelectedPersonsToTag([]);
    setShowTagModal(true);
  };

  const handleTagPeople = async () => {
    if (!selectedPhoto || selectedPersonsToTag.length === 0) return;

    setTagging(true);
    try {
      const success = await tagPeople(selectedPhoto.id, selectedPersonsToTag);
      if (success) {
        // Update selected photo with new tags
        const updatedPhoto = photos.find(p => p.id === selectedPhoto.id);
        if (updatedPhoto) setSelectedPhoto(updatedPhoto);
        setShowTagModal(false);
      }
    } finally {
      setTagging(false);
    }
  };

  const handleRemoveTag = async (personId: string) => {
    if (!selectedPhoto) return;

    const success = await removeTag(selectedPhoto.id, personId);
    if (success) {
      setSelectedPhoto({
        ...selectedPhoto,
        taggedPeople: selectedPhoto.taggedPeople.filter(t => t.personId !== personId),
      });
    }
  };

  const handlePrivacyChange = async (privacy: PhotoPrivacy) => {
    if (!selectedPhoto) return;

    const success = await updatePrivacy(selectedPhoto.id, privacy);
    if (success) {
      setSelectedPhoto({ ...selectedPhoto, privacy });
    }
  };

  const hasActiveFilters = filters.personId || filters.startDate || filters.endDate;

  if (loading && photos.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 text-red-500 ${className}`}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`} data-testid="photo-gallery">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Photo Gallery</h2>
            <span className="text-sm text-gray-500" data-testid="photo-count">({total} photos)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filter-button"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 rounded-full">!</span>
              )}
            </Button>
            <Button size="sm" onClick={() => setShowUpload(true)} data-testid="upload-button">
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                <select
                  value={filterPersonId}
                  onChange={e => setFilterPersonId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All people</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleApplyFilters}>Apply Filters</Button>
              <Button size="sm" variant="ghost" onClick={handleClearFilters}>Clear</Button>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="p-4">
        {photos.length === 0 ? (
          <div className="text-center py-12 text-gray-500" data-testid="empty-gallery">
            <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No photos yet</p>
            <p className="text-sm mt-1">Upload photos to start building your family gallery</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="photo-grid">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => handlePhotoClick(photo, index)}
                  data-testid={`photo-item-${index}`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Family photo'}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  {/* Tags indicator */}
                  {photo.taggedPeople.length > 0 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded" data-testid="tag-indicator">
                      <Tag className="w-3 h-3" />
                      {photo.taggedPeople.length}
                    </div>
                  )}
                  {/* Privacy indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" data-testid="privacy-indicator">
                    {PRIVACY_OPTIONS.find(o => o.value === photo.privacy)?.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowUpload(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Photo</h3>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quota information */}
            {quota && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Upload Quota</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div>
                    Your photos: {quota.memberLimit - quota.memberRemaining} / {quota.memberLimit}
                  </div>
                  <div>
                    Tree total: {quota.treeLimit - quota.treeRemaining} / {quota.treeLimit}
                  </div>
                </div>
                {quota.memberRemaining === 0 && (
                  <div className="mt-2 text-red-600">You have reached your upload limit.</div>
                )}
                {quota.treeRemaining === 0 && (
                  <div className="mt-2 text-red-600">This tree has reached its photo limit.</div>
                )}
                {quota.s3Configured && (
                  <div className="mt-2 text-xs text-gray-500">
                    Max file size: {quota.maxFileSizeMB} MB
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* File upload option (if S3 configured) */}
              {quota?.s3Configured && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload File
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="photo-file-input"
                    />
                    <label
                      htmlFor="photo-file-input"
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        uploadFile
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <FileImage className="w-5 h-5 text-gray-500" />
                      {uploadFile ? (
                        <span className="text-sm text-blue-700 truncate max-w-[200px]">
                          {uploadFile.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Click to select a photo</span>
                      )}
                    </label>
                    {uploadFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Divider if both options available */}
              {quota?.s3Configured && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo URL {!quota?.s3Configured && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={e => {
                    setUploadUrl(e.target.value);
                    if (e.target.value) {
                      setUploadFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                  placeholder="https://..."
                  disabled={!!uploadFile}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  placeholder="Describe this photo..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Taken</label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={e => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={uploadLocation}
                    onChange={e => setUploadLocation(e.target.value)}
                    placeholder="Where was this taken?"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Person</label>
                <select
                  value={uploadPersonId}
                  onChange={e => setUploadPersonId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select a person (optional)</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button
                onClick={handleUpload}
                disabled={(!uploadUrl.trim() && !uploadFile) || uploading || !!(quota && (quota.memberRemaining === 0 || quota.treeRemaining === 0))}
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" data-testid="photo-lightbox">
          {/* Navigation buttons */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-50"
            onClick={handlePrevPhoto}
            disabled={photoIndex === 0}
            data-testid="lightbox-prev"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-50"
            onClick={handleNextPhoto}
            disabled={photoIndex === photos.length - 1}
            data-testid="lightbox-next"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedPhoto(null)}
            data-testid="lightbox-close"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Main content */}
          <div className="flex flex-col lg:flex-row max-w-6xl w-full mx-4 max-h-[90vh]">
            {/* Photo */}
            <div className="flex-1 flex items-center justify-center p-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Family photo'}
                className="max-h-[70vh] max-w-full object-contain rounded"
              />
            </div>

            {/* Details sidebar */}
            <div className="w-full lg:w-80 bg-white rounded-lg p-4 overflow-y-auto max-h-[50vh] lg:max-h-[90vh]">
              {/* Caption */}
              {selectedPhoto.caption && (
                <p className="text-gray-800 mb-4">{selectedPhoto.caption}</p>
              )}

              {/* Metadata */}
              <div className="space-y-2 text-sm text-gray-600">
                {selectedPhoto.dateTaken && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedPhoto.dateTaken)}
                  </div>
                )}
                {selectedPhoto.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedPhoto.location}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Uploaded by {selectedPhoto.uploader.name || 'Unknown'}
                </div>
                {/* Photo dimensions and size */}
                {(selectedPhoto.width || selectedPhoto.fileSize) && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Image className="w-4 h-4" />
                    {selectedPhoto.width && selectedPhoto.height && (
                      <span>{selectedPhoto.width} × {selectedPhoto.height}</span>
                    )}
                    {selectedPhoto.fileSize && (
                      <span>({formatFileSize(selectedPhoto.fileSize)})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Tagged people */}
              <div className="mt-4" data-testid="tagged-people-section">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Tagged People</h4>
                  <Button variant="ghost" size="sm" onClick={handleOpenTagModal} data-testid="tag-people-button">
                    <Tag className="w-4 h-4 mr-1" />
                    Tag
                  </Button>
                </div>
                {selectedPhoto.taggedPeople.length === 0 ? (
                  <p className="text-sm text-gray-400">No one tagged yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedPhoto.taggedPeople.map(tag => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-1 bg-gray-100 rounded-full pl-1 pr-2 py-1"
                      >
                        {tag.person.profilePhoto ? (
                          <img
                            src={tag.person.profilePhoto}
                            alt={tag.person.firstName}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                        <button
                          className="text-xs text-gray-700 hover:text-blue-600"
                          onClick={() => onPersonClick?.(tag.personId)}
                        >
                          {tag.person.firstName} {tag.person.lastName}
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => handleRemoveTag(tag.personId)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Privacy */}
              <div className="mt-4" data-testid="privacy-section">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Privacy</h4>
                <select
                  value={selectedPhoto.privacy}
                  onChange={e => handlePrivacyChange(e.target.value as PhotoPrivacy)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  data-testid="privacy-select"
                >
                  {PRIVACY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {/* Download original button - only show if original is available */}
                {(selectedPhoto.s3Key || selectedPhoto.originalUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadOriginal}
                    disabled={downloading}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    {downloading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Download Original
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleEditPhoto}>
                  <Edit3 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={handleDeletePhoto}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && selectedPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTagModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tag People in Photo</h3>
              <button onClick={() => setShowTagModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {people
                .filter(p => !currentPhotoTaggedIds.has(p.id))
                .map(person => (
                  <label
                    key={person.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersonsToTag.includes(person.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedPersonsToTag([...selectedPersonsToTag, person.id]);
                        } else {
                          setSelectedPersonsToTag(selectedPersonsToTag.filter(id => id !== person.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    {person.profilePhoto ? (
                      <img
                        src={person.profilePhoto}
                        alt={person.firstName}
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
                  </label>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowTagModal(false)}>Cancel</Button>
              <Button onClick={handleTagPeople} disabled={selectedPersonsToTag.length === 0 || tagging}>
                {tagging ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Tag className="w-4 h-4 mr-1" />}
                Tag {selectedPersonsToTag.length} {selectedPersonsToTag.length === 1 ? 'Person' : 'People'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Photo Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                  placeholder="Describe this photo..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Taken</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  placeholder="Where was this taken?"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
