import { useState } from 'react';
import {
  BookOpen,
  PenSquare,
  X,
  Calendar,
  MapPin,
  User,
  Filter,
  Loader2,
  Trash2,
  Edit3,
  Heart,
  MessageCircle,
  Eye,
  Clock,
  Check,
  XCircle,
  Search,
  MoreVertical,
  Send,
  Star,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useStories,
  type Story,
  type StoryStatus,
  type StoryFilters,
  formatStoryStatus,
  formatRelativeTime,
} from '@/hooks/useStories';
import type { Person } from '@mindmapper/types';

export interface StoryGalleryProps {
  treeId: string;
  people: Person[];
  currentUserId: string;
  onPersonClick?: (personId: string) => void;
  className?: string;
  isAdmin?: boolean;
}

const STORY_MAX_LENGTH = 5000;

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

export function StoryGallery({
  treeId,
  people,
  currentUserId,
  onPersonClick,
  className = '',
  isAdmin = false,
}: StoryGalleryProps) {
  const {
    stories,
    total,
    loading,
    error,
    filters,
    setFilters,
    createStory,
    updateStory,
    deleteStory,
    publishStory,
    reviewStory,
    likeStory,
    addComment,
    deleteComment,
    linkPeople,
    getPendingStories,
    getStory,
    loadMore,
    hasMore,
  } = useStories(treeId);

  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingStories, setPendingStories] = useState<Story[]>([]);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [storyWithComments, setStoryWithComments] = useState<Story | null>(null);

  // Create form state
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createPersonId, setCreatePersonId] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createCoverImage, setCreateCoverImage] = useState('');
  const [createStatus, setCreateStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [creating, setCreating] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPersonId, setEditPersonId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editing, setEditing] = useState(false);

  // Link people state
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);

  // Comment state
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Filter state
  const [filterSearch, setFilterSearch] = useState('');

  const handleCreate = async () => {
    if (!createTitle.trim() || !createContent.trim()) return;

    setCreating(true);
    try {
      const story = await createStory({
        title: createTitle.trim(),
        content: createContent.trim(),
        personId: createPersonId || undefined,
        storyDate: createDate || undefined,
        location: createLocation.trim() || undefined,
        coverImage: createCoverImage.trim() || undefined,
        status: createStatus,
      });

      if (story) {
        setCreateTitle('');
        setCreateContent('');
        setCreatePersonId('');
        setCreateDate('');
        setCreateLocation('');
        setCreateCoverImage('');
        setCreateStatus('DRAFT');
        setShowCreate(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (story: Story) => {
    setSelectedStory(story);
    setEditTitle(story.title);
    setEditContent(story.content);
    setEditPersonId(story.personId || '');
    setEditDate(story.storyDate?.split('T')[0] || '');
    setEditLocation(story.location || '');
    setEditCoverImage(story.coverImage || '');
    setShowEditModal(true);
    setActionMenu(null);
  };

  const handleEdit = async () => {
    if (!selectedStory || !editTitle.trim() || !editContent.trim()) return;

    setEditing(true);
    try {
      await updateStory(selectedStory.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        personId: editPersonId || null,
        storyDate: editDate || null,
        location: editLocation.trim() || null,
        coverImage: editCoverImage.trim() || null,
      });
      setShowEditModal(false);
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (story: Story) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    await deleteStory(story.id);
    setActionMenu(null);
  };

  const handlePublish = async (story: Story) => {
    const result = await publishStory(story.id);
    if (result) {
      alert(result.message);
    }
    setActionMenu(null);
  };

  const handleLike = async (story: Story) => {
    await likeStory(story.id);
  };

  const openLinkModal = (story: Story) => {
    setSelectedStory(story);
    setSelectedPersonIds(story.linkedPersons.map(lp => lp.personId));
    setShowLinkModal(true);
    setActionMenu(null);
  };

  const handleLink = async () => {
    if (!selectedStory) return;

    setLinking(true);
    try {
      await linkPeople(selectedStory.id, selectedPersonIds);
      setShowLinkModal(false);
    } finally {
      setLinking(false);
    }
  };

  const handleReview = async (story: Story, action: 'approve' | 'reject') => {
    await reviewStory(story.id, { action });
  };

  const openPendingModal = async () => {
    const pending = await getPendingStories();
    setPendingStories(pending);
    setShowPendingModal(true);
  };

  const toggleExpand = async (storyId: string) => {
    if (expandedStoryId === storyId) {
      setExpandedStoryId(null);
      setStoryWithComments(null);
    } else {
      setExpandedStoryId(storyId);
      // Fetch full story with comments
      const fullStory = await getStory(storyId);
      setStoryWithComments(fullStory);
    }
  };

  const handleAddComment = async (storyId: string) => {
    if (!commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await addComment(storyId, commentContent.trim());
      if (comment && storyWithComments) {
        setStoryWithComments({
          ...storyWithComments,
          comments: [comment, ...(storyWithComments.comments || [])],
        });
      }
      setCommentContent('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (storyId: string, commentId: string) => {
    await deleteComment(storyId, commentId);
    if (storyWithComments) {
      setStoryWithComments({
        ...storyWithComments,
        comments: storyWithComments.comments?.filter(c => c.id !== commentId) || [],
      });
    }
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

  const canEditStory = (story: Story) => story.authorId === currentUserId || isAdmin;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Family Stories</h3>
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
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1"
          >
            <PenSquare className="w-4 h-4" />
            Write Story
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
                  placeholder="Search stories..."
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: (e.target.value as StoryStatus) || null })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                {isAdmin && <option value="PENDING">Pending Review</option>}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy || 'createdAt'}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as StoryFilters['sortBy'] })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="createdAt">Date Created</option>
                <option value="publishedAt">Date Published</option>
                <option value="viewCount">Most Viewed</option>
                <option value="title">Title</option>
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

      {/* Stories List */}
      <div className="divide-y divide-gray-100">
        {loading && stories.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Loading stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-500 mt-2">No stories yet</p>
            <p className="text-sm text-gray-400 mt-1">Share your family&apos;s memories and history</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
              className="mt-4"
            >
              <PenSquare className="w-4 h-4 mr-1" />
              Write First Story
            </Button>
          </div>
        ) : (
          <>
            {stories.map((story) => (
              <div key={story.id} className="p-4">
                {/* Story Card */}
                <div className="flex items-start gap-4">
                  {/* Cover Image or Icon */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {story.coverImage ? (
                      <img
                        src={story.coverImage}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-8 h-8 text-gray-400" />
                    )}
                  </div>

                  {/* Story Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => toggleExpand(story.id)}
                      >
                        {story.title}
                      </h4>
                      {story.isFeatured && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        story.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                        story.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        story.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {formatStoryStatus(story.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {story.author.name || 'Unknown'}
                      </span>
                      <span>{formatRelativeTime(story.createdAt)}</span>
                      {story.storyDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(story.storyDate)}
                        </span>
                      )}
                      {story.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {story.location}
                        </span>
                      )}
                    </div>

                    {/* Excerpt */}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {story.excerpt || story.content.substring(0, 200)}
                    </p>

                    {/* Stats and Actions */}
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleLike(story)}
                        className={`flex items-center gap-1 text-sm ${
                          story.isLikedByMe ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                        } transition-colors`}
                      >
                        <Heart className={`w-4 h-4 ${story.isLikedByMe ? 'fill-current' : ''}`} />
                        {story._count.likes}
                      </button>
                      <button
                        onClick={() => toggleExpand(story.id)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {story._count.comments}
                      </button>
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Eye className="w-4 h-4" />
                        {story.viewCount}
                      </span>

                      {/* Linked People */}
                      {story.linkedPersons.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {story.linkedPersons.length} people
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canEditStory(story) && (
                    <div className="flex-shrink-0 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActionMenu(actionMenu === story.id ? null : story.id)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>

                      {actionMenu === story.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => openEditModal(story)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => openLinkModal(story)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            Link People
                          </button>
                          {story.status === 'DRAFT' && (
                            <button
                              onClick={() => handlePublish(story)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Publish
                            </button>
                          )}
                          {isAdmin && story.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleReview(story, 'approve')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(story, 'reject')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(story)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleExpand(story.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    {expandedStoryId === story.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Expanded Content */}
                {expandedStoryId === story.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {/* Full Content */}
                    <div className="prose prose-sm max-w-none mb-4">
                      <div dangerouslySetInnerHTML={{ __html: story.content.replace(/\n/g, '<br/>') }} />
                    </div>

                    {/* Linked People */}
                    {story.linkedPersons.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">People in this story</h5>
                        <div className="flex flex-wrap gap-2">
                          {story.linkedPersons.map((lp) => (
                            <button
                              key={lp.id}
                              onClick={() => onPersonClick?.(lp.personId)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                            >
                              {lp.person.firstName} {lp.person.lastName}
                              {lp.role && <span className="text-gray-500"> ({lp.role})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Comments ({storyWithComments?.comments?.length || story._count.comments})
                      </h5>

                      {/* Add Comment */}
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(story.id);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddComment(story.id)}
                          disabled={!commentContent.trim() || submittingComment}
                        >
                          {submittingComment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-3">
                        {storyWithComments?.comments?.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {comment.author.avatarUrl ? (
                                <img
                                  src={comment.author.avatarUrl}
                                  alt=""
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{comment.author.name || 'Unknown'}</span>
                                <span className="text-xs text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{comment.content}</p>
                            </div>
                            {(comment.authorId === currentUserId || isAdmin) && (
                              <button
                                onClick={() => handleDeleteComment(story.id, comment.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Write a Story</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Give your story a title"
                  className="w-full px-3 py-2 border rounded-lg"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Story <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-2">
                    ({createContent.length}/{STORY_MAX_LENGTH})
                  </span>
                </label>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value.slice(0, STORY_MAX_LENGTH))}
                  placeholder="Share your family story..."
                  rows={10}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    About (Person)
                  </label>
                  <select
                    value={createPersonId}
                    onChange={(e) => setCreatePersonId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select a person</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Story Date
                  </label>
                  <input
                    type="date"
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    placeholder="Where did this happen?"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={createCoverImage}
                    onChange={(e) => setCreateCoverImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Save as
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value="DRAFT"
                      checked={createStatus === 'DRAFT'}
                      onChange={() => setCreateStatus('DRAFT')}
                    />
                    <span className="text-sm">Draft</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value="PUBLISHED"
                      checked={createStatus === 'PUBLISHED'}
                      onChange={() => setCreateStatus('PUBLISHED')}
                    />
                    <span className="text-sm">Publish Now</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!createTitle.trim() || !createContent.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : createStatus === 'PUBLISHED' ? (
                  'Publish'
                ) : (
                  'Save Draft'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Edit Story</h3>
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
                  className="w-full px-3 py-2 border rounded-lg"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Story ({editContent.length}/{STORY_MAX_LENGTH})
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value.slice(0, STORY_MAX_LENGTH))}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                  <select
                    value={editPersonId}
                    onChange={(e) => setEditPersonId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Story Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                  <input
                    type="url"
                    value={editCoverImage}
                    onChange={(e) => setEditCoverImage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!editTitle.trim() || !editContent.trim() || editing}>
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
      {showLinkModal && selectedStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Link People to Story</h3>
              <button onClick={() => setShowLinkModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                Select people who appear in or are related to this story.
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

      {/* Pending Stories Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold">Pending Stories</h3>
              <button onClick={() => setShowPendingModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="divide-y">
              {pendingStories.length === 0 ? (
                <div className="p-8 text-center">
                  <Check className="w-12 h-12 mx-auto text-green-400" />
                  <p className="text-gray-500 mt-2">No stories pending review</p>
                </div>
              ) : (
                pendingStories.map((story) => (
                  <div key={story.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{story.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          By {story.author.name} · {formatRelativeTime(story.createdAt)}
                        </p>
                        {story.person && (
                          <p className="text-sm text-amber-600 mt-1">
                            About: {story.person.firstName} {story.person.lastName}
                            {story.person.isLiving && ' (Living)'}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {story.excerpt || story.content.substring(0, 150)}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(story, 'reject')}
                          className="text-red-600"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReview(story, 'approve')}
                        >
                          Approve
                        </Button>
                      </div>
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

export default StoryGallery;
