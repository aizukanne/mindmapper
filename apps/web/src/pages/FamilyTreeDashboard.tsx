import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Globe, Lock, Loader2, Trash2, MoreHorizontal, TreeDeciduous, UserPlus, Heart, Clock, LayoutGrid, List, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { UserMenu } from '@/components/auth/UserMenu';
import type { FamilyTree, TreePrivacy, TreeRole } from '@mindmapper/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FamilyTreeWithDetails extends FamilyTree {
  creator: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  members: Array<{
    id: string;
    role: TreeRole;
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
  }>;
  _count?: {
    people: number;
    relationships?: number;
  };
}

interface DashboardStats {
  totalTrees: number;
  ownedTrees: number;
  invitedTrees: number;
  totalPeople: number;
}

export default function FamilyTreeDashboard() {
  const navigate = useNavigate();
  const [trees, setTrees] = useState<FamilyTreeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch family trees
  useEffect(() => {
    fetchTrees();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.data?.id || 'dev-user-id');
      }
    } catch {
      // Fallback for development
      setCurrentUserId('dev-user-id');
    }
  };

  const fetchTrees = async () => {
    try {
      const response = await fetch(`${API_URL}/api/family-trees`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTrees(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch family trees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Separate trees into owned and invited
  const { ownedTrees, invitedTrees, stats } = useMemo(() => {
    const owned: FamilyTreeWithDetails[] = [];
    const invited: FamilyTreeWithDetails[] = [];
    let totalPeople = 0;

    trees.forEach((tree) => {
      totalPeople += tree._count?.people || 0;
      // Check if user is the creator
      if (tree.createdBy === currentUserId || tree.createdBy === 'dev-user-id') {
        owned.push(tree);
      } else {
        // User is a member but not the creator
        invited.push(tree);
      }
    });

    const stats: DashboardStats = {
      totalTrees: trees.length,
      ownedTrees: owned.length,
      invitedTrees: invited.length,
      totalPeople,
    };

    return { ownedTrees: owned, invitedTrees: invited, stats };
  }, [trees, currentUserId]);

  // Delete a tree
  const handleDelete = async (treeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this family tree? This action cannot be undone.')) return;

    setDeletingId(treeId);
    try {
      const response = await fetch(`${API_URL}/api/family-trees/${treeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setTrees((prev) => prev.filter((t) => t.id !== treeId));
      }
    } catch (error) {
      console.error('Failed to delete tree:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getPrivacyIcon = (privacy: TreePrivacy) => {
    switch (privacy) {
      case 'PUBLIC':
        return <Globe className="w-4 h-4" />;
      case 'FAMILY_ONLY':
        return <Users className="w-4 h-4" />;
      case 'PRIVATE':
        return <Lock className="w-4 h-4" />;
    }
  };

  const getPrivacyLabel = (privacy: TreePrivacy) => {
    switch (privacy) {
      case 'PUBLIC':
        return 'Public';
      case 'FAMILY_ONLY':
        return 'Family Only';
      case 'PRIVATE':
        return 'Private';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TreeDeciduous className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">Family Trees</h1>
            </div>
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="hidden md:flex"
            >
              Back to Mind Maps
            </Button>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* View mode toggle */}
            <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
              data-testid="create-tree-button"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Family Tree</span>
              <span className="sm:hidden">New</span>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : trees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64" data-testid="empty-state">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <TreeDeciduous className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No family trees yet</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Create your first family tree to start documenting your family history
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
              size="lg"
              data-testid="empty-create-tree-button"
            >
              <Plus className="w-5 h-5" />
              Create Your First Family Tree
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Stats Section */}
            <section data-testid="stats-section">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <TreeDeciduous className="h-4 w-4" />
                      Total Trees
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary" data-testid="stat-total-trees">{stats.totalTrees}</div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Total People
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600" data-testid="stat-total-people">{stats.totalPeople}</div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Your Trees
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600" data-testid="stat-owned-trees">{stats.ownedTrees}</div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Invited Trees
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600" data-testid="stat-invited-trees">{stats.invitedTrees}</div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="quick-actions">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
                data-testid="quick-create-button"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Create New Tree</h3>
                  <p className="text-sm text-muted-foreground">
                    Start documenting your family
                  </p>
                </div>
              </button>

              <button
                onClick={() => {/* Could link to an invite flow */}}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-medium">Join a Tree</h3>
                  <p className="text-sm text-muted-foreground">
                    Accept an invitation from family
                  </p>
                </div>
              </button>

              <button
                onClick={() => ownedTrees[0] && navigate(`/family-tree/${ownedTrees[0].id}`)}
                disabled={ownedTrees.length === 0}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ChevronRight className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-medium">Continue Working</h3>
                  <p className="text-sm text-muted-foreground">
                    {ownedTrees[0]?.name || 'Open your latest tree'}
                  </p>
                </div>
              </button>
            </section>

            {/* Your Trees Section */}
            {ownedTrees.length > 0 && (
              <section data-testid="owned-trees-section">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TreeDeciduous className="h-5 w-5 text-primary" />
                    Your Family Trees
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {ownedTrees.length} tree{ownedTrees.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div
                  className={viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-3"
                  }
                  data-testid="owned-trees-grid"
                >
                  {ownedTrees.map((tree) => (
                    <TreeCard
                      key={tree.id}
                      tree={tree}
                      viewMode={viewMode}
                      onClick={() => navigate(`/family-tree/${tree.id}`)}
                      onDelete={(e) => handleDelete(tree.id, e)}
                      isDeleting={deletingId === tree.id}
                      isOwner={true}
                      getPrivacyIcon={getPrivacyIcon}
                      getPrivacyLabel={getPrivacyLabel}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Invited Trees Section */}
            {invitedTrees.length > 0 && (
              <section data-testid="invited-trees-section">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-purple-500" />
                    Shared With You
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {invitedTrees.length} tree{invitedTrees.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div
                  className={viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-3"
                  }
                  data-testid="invited-trees-grid"
                >
                  {invitedTrees.map((tree) => (
                    <TreeCard
                      key={tree.id}
                      tree={tree}
                      viewMode={viewMode}
                      onClick={() => navigate(`/family-tree/${tree.id}`)}
                      onDelete={(e) => handleDelete(tree.id, e)}
                      isDeleting={deletingId === tree.id}
                      isOwner={false}
                      getPrivacyIcon={getPrivacyIcon}
                      getPrivacyLabel={getPrivacyLabel}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Create Tree Modal */}
      {isCreateModalOpen && (
        <CreateTreeModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newTree) => {
            setTrees((prev) => [newTree, ...prev]);
            setIsCreateModalOpen(false);
            navigate(`/family-tree/${newTree.id}`);
          }}
        />
      )}
    </div>
  );
}

interface CreateTreeModalProps {
  onClose: () => void;
  onSuccess: (tree: FamilyTreeWithDetails) => void;
}

function CreateTreeModal({ onClose, onSuccess }: CreateTreeModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<TreePrivacy>('PRIVATE');
  const [createRootPerson, setCreateRootPerson] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/family-trees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description, privacy, createRootPerson }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.data);
      }
    } catch (error) {
      console.error('Failed to create family tree:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Family Tree</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tree Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Smith Family Tree"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="A family tree documenting the Smith family lineage"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Privacy</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="privacy"
                  value="PRIVATE"
                  checked={privacy === 'PRIVATE'}
                  onChange={(e) => setPrivacy(e.target.value as TreePrivacy)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Lock className="w-4 h-4 text-gray-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Private</div>
                  <div className="text-xs text-gray-500">Only you can see this tree</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="privacy"
                  value="FAMILY_ONLY"
                  checked={privacy === 'FAMILY_ONLY'}
                  onChange={(e) => setPrivacy(e.target.value as TreePrivacy)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-gray-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Family Only</div>
                  <div className="text-xs text-gray-500">Only invited family members can see</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="privacy"
                  value="PUBLIC"
                  checked={privacy === 'PUBLIC'}
                  onChange={(e) => setPrivacy(e.target.value as TreePrivacy)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Globe className="w-4 h-4 text-gray-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Public</div>
                  <div className="text-xs text-gray-500">Anyone can view this tree</div>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createRootPerson}
                onChange={(e) => setCreateRootPerson(e.target.checked)}
                className="mt-1 text-blue-600 focus:ring-blue-500 rounded"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">Create my person profile</div>
                <div className="text-xs text-gray-500">
                  Automatically add yourself as the root person in this family tree
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Tree'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tree Card Component
interface TreeCardProps {
  tree: FamilyTreeWithDetails;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
  isOwner: boolean;
  getPrivacyIcon: (privacy: TreePrivacy) => React.ReactNode;
  getPrivacyLabel: (privacy: TreePrivacy) => string;
}

function TreeCard({
  tree,
  viewMode,
  onClick,
  onDelete,
  isDeleting,
  isOwner,
  getPrivacyIcon,
  getPrivacyLabel,
}: TreeCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Find user's role in the tree
  const getUserRole = () => {
    if (isOwner) return 'Owner';
    const member = tree.members.find((m) => m.role);
    return member?.role === 'ADMIN' ? 'Admin' : member?.role === 'MEMBER' ? 'Member' : 'Viewer';
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="group relative flex items-center gap-4 border border-border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer bg-card"
        data-testid="tree-card-list"
      >
        {/* Tree Icon */}
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <TreeDeciduous className="h-6 w-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{tree.name}</h3>
            {!isOwner && (
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                {getUserRole()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {getPrivacyIcon(tree.privacy)}
              {getPrivacyLabel(tree.privacy)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {tree._count?.people ?? 0} people
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(tree.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Members avatars */}
        {tree.members.length > 0 && (
          <div className="flex -space-x-2 mr-2">
            {tree.members.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                title={member.user.name || member.user.email}
              >
                {(member.user.name || member.user.email).charAt(0).toUpperCase()}
              </div>
            ))}
            {tree.members.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                +{tree.members.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-md hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
                  <button
                    onClick={(e) => {
                      setShowMenu(false);
                      onDelete(e);
                    }}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete Tree
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid view layout (default)
  return (
    <div
      onClick={onClick}
      className="group relative border border-border rounded-lg overflow-hidden hover:border-primary hover:shadow-md transition-all cursor-pointer bg-card"
      data-testid="tree-card-grid"
    >
      {/* Card Header with gradient */}
      <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <TreeDeciduous className="h-12 w-12 text-primary/40" />
        </div>

        {/* Privacy badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
            {getPrivacyIcon(tree.privacy)}
            {getPrivacyLabel(tree.privacy)}
          </span>
        </div>

        {/* Role badge for invited trees */}
        {!isOwner && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
              {getUserRole()}
            </span>
          </div>
        )}

        {/* Menu button for owned trees */}
        {isOwner && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
                  <button
                    onClick={(e) => {
                      setShowMenu(false);
                      onDelete(e);
                    }}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete Tree
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{tree.name}</h3>
        {tree.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{tree.description}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {tree._count?.people ?? 0} people
          </span>
          {tree.members.length > 0 && (
            <span className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              {tree.members.length} member{tree.members.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Members avatars */}
        {tree.members.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {tree.members.slice(0, 4).map((member) => (
                <div
                  key={member.id}
                  className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                  title={member.user.name || member.user.email}
                >
                  {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                </div>
              ))}
              {tree.members.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{tree.members.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {formatDistanceToNow(new Date(tree.updatedAt), { addSuffix: true })}
          </span>
          {!isOwner && (
            <span className="text-xs text-muted-foreground">
              by {tree.creator.name || tree.creator.email?.split('@')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
