import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Globe, Lock, Loader2, Trash2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import type { FamilyTree, TreePrivacy } from '@mindmapper/types';

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
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
  }>;
  _count?: {
    people: number;
  };
}

export default function FamilyTreeDashboard() {
  const navigate = useNavigate();
  const [trees, setTrees] = useState<FamilyTreeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch family trees
  useEffect(() => {
    fetchTrees();
  }, []);

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
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Family Trees</h1>
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
          >
            Back to Mind Maps
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Family Tree
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : trees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No family trees yet</h2>
            <p className="text-gray-500 mb-6">Create your first family tree to get started</p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Family Tree
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trees.map((tree) => (
              <div
                key={tree.id}
                onClick={() => navigate(`/family-tree/${tree.id}`)}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                        {tree.name}
                      </h3>
                      {tree.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{tree.description}</p>
                      )}
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getPrivacyIcon(tree.privacy)}
                      <span>{getPrivacyLabel(tree.privacy)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{tree._count?.people ?? 0} people</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-xs">
                        Updated {formatDistanceToNow(new Date(tree.updatedAt), { addSuffix: true })}
                      </span>
                    </div>

                    {tree.members.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {tree.members.slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700"
                              title={member.user.name || member.user.email}
                            >
                              {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {tree.members.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                              +{tree.members.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {tree.members.length} member{tree.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Created by {tree.creator.name || tree.creator.email}
                  </span>
                  {tree.createdBy === 'dev-user-id' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(tree.id, e)}
                      disabled={deletingId === tree.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === tree.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
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
