import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Star, Clock, Search, FileText, Trash2, MoreHorizontal, Loader2, FolderPlus, Upload, Menu, X, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { TemplateGallery } from '@/components/templates/TemplateGallery';
import { UserMenu } from '@/components/auth/UserMenu';
import { FolderTree } from '@/components/sidebar/FolderTree';
import { GlobalSearch, useGlobalSearchShortcut } from '@/components/search/GlobalSearch';
import { ImportModal } from '@/components/import/ImportModal';

interface MindMap {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isFavorite: boolean;
  folderId: string | null;
  updatedAt: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [movingMapId, setMovingMapId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global search keyboard shortcut (Ctrl/Cmd + K)
  useGlobalSearchShortcut(() => setIsSearchOpen(true));

  // Fetch maps
  const fetchMaps = useCallback(async () => {
    try {
      const url = selectedFolderId
        ? `${API_URL}/api/maps?folderId=${selectedFolderId}`
        : `${API_URL}/api/maps`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMaps(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch maps:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    setLoading(true);
    fetchMaps();
  }, [fetchMaps]);


  // Delete a map
  const handleDelete = async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this mind map?')) return;

    setDeletingId(mapId);
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setMaps((prev) => prev.filter((m) => m.id !== mapId));
      }
    } catch (error) {
      console.error('Failed to delete map:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (mapId: string, currentFavorite: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isFavorite: !currentFavorite }),
      });
      if (response.ok) {
        setMaps((prev) =>
          prev.map((m) => (m.id === mapId ? { ...m, isFavorite: !currentFavorite } : m))
        );
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  // Move map to folder
  const handleMoveToFolder = async (mapId: string, folderId: string | null) => {
    setMovingMapId(mapId);
    try {
      const targetFolder = folderId || 'root';
      const response = await fetch(`${API_URL}/api/folders/${targetFolder}/maps/${mapId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        // Refresh maps to reflect new folder assignment
        await fetchMaps();
      }
    } catch (error) {
      console.error('Failed to move map:', error);
    } finally {
      setMovingMapId(null);
    }
  };

  const favoriteMaps = maps.filter((m) => m.isFavorite);
  const recentMaps = maps.filter((m) => !m.isFavorite);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-primary">MindMapper</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search - icon only on mobile, full on desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex relative items-center gap-2 px-3 py-2 border border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm text-muted-foreground w-64 text-left"
            >
              <Search className="h-4 w-4" />
              <span>Search maps & nodes...</span>
              <kbd className="ml-auto px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">
                ⌘K
              </kbd>
            </button>
            <Button onClick={() => setIsTemplateGalleryOpen(true)} className="hidden md:flex">
              <Plus className="h-4 w-4 mr-2" />
              New Mind Map
            </Button>
            <Button onClick={() => setIsTemplateGalleryOpen(true)} size="icon" className="md:hidden">
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => navigate('/family-trees')}
              variant="outline"
              className="hidden md:flex"
            >
              <Users className="h-4 w-4 mr-2" />
              Family Trees
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative inset-y-0 left-0 z-50 md:z-auto
            w-64 border-r border-border bg-background md:bg-muted/30 p-4 overflow-y-auto shrink-0
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h2 className="font-semibold">Folders</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <FolderTree
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
              setIsSidebarOpen(false); // Close on mobile after selection
            }}
            onFolderChange={fetchMaps}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Quick actions - only show when viewing all maps */}
          {selectedFolderId === null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setIsTemplateGalleryOpen(true)}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Create New</h3>
                  <p className="text-sm text-muted-foreground">
                    Start with a blank canvas
                  </p>
                </div>
              </button>

              <button
                onClick={() => setIsTemplateGalleryOpen(true)}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-medium">From Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Use a pre-built template
                  </p>
                </div>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-medium">Import</h3>
                  <p className="text-sm text-muted-foreground">
                    Import from JSON or FreeMind
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Folder header when viewing a specific folder */}
          {selectedFolderId !== null && (
            <div className="flex items-center gap-2 mb-6">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Folder Contents</h2>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : maps.length === 0 ? (
            <section>
              <div className="border border-dashed border-border rounded-lg p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  {selectedFolderId ? (
                    <FolderPlus className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-medium mb-2">
                  {selectedFolderId ? 'This folder is empty' : 'No mind maps yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedFolderId
                    ? 'Move maps here or create a new one'
                    : 'Create your first mind map to get started'}
                </p>
                <Button onClick={() => setIsTemplateGalleryOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Mind Map
                </Button>
              </div>
            </section>
          ) : (
            <>
              {/* Favorites - only show when viewing all maps */}
              {selectedFolderId === null && favoriteMaps.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-lg font-semibold">Favorites</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {favoriteMaps.map((map) => (
                      <MapCard
                        key={map.id}
                        map={map}
                        onClick={() => navigate(`/map/${map.id}`)}
                        onDelete={(e) => handleDelete(map.id, e)}
                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}
                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}
                        isDeleting={deletingId === map.id}
                        isMoving={movingMapId === map.id}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Maps list */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  {selectedFolderId === null ? (
                    <>
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">Recent Mind Maps</h2>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">Mind Maps</h2>
                    </>
                  )}
                </div>
                {(selectedFolderId === null ? recentMaps : maps).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No maps in this location
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(selectedFolderId === null ? recentMaps : maps).map((map) => (
                      <MapCard
                        key={map.id}
                        map={map}
                        onClick={() => navigate(`/map/${map.id}`)}
                        onDelete={(e) => handleDelete(map.id, e)}
                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}
                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}
                        isDeleting={deletingId === map.id}
                        isMoving={movingMapId === map.id}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Template Gallery */}
      <TemplateGallery
        open={isTemplateGalleryOpen}
        onOpenChange={setIsTemplateGalleryOpen}
      />

      {/* Global Search Modal */}
      <GlobalSearch
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      {/* Import Modal */}
      <ImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        folderId={selectedFolderId}
        onImportSuccess={(mapId) => {
          fetchMaps();
          navigate(`/map/${mapId}`);
        }}
      />
    </div>
  );
}

interface MapCardProps {
  map: MindMap;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onMoveToFolder: (folderId: string | null) => void;
  isDeleting: boolean;
  isMoving: boolean;
}

function MapCard({ map, onClick, onDelete, onToggleFavorite, onMoveToFolder, isDeleting, isMoving }: MapCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative border border-border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer"
    >
      {/* Thumbnail placeholder */}
      <div className="h-32 rounded-md bg-muted flex items-center justify-center mb-3">
        {map.thumbnail ? (
          <img
            src={map.thumbnail}
            alt={map.title}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Title and meta */}
      <h3 className="font-medium truncate">{map.title}</h3>
      <p className="text-xs text-muted-foreground mt-1">
        Updated {formatDistanceToNow(new Date(map.updatedAt), { addSuffix: true })}
      </p>

      {/* Loading overlay for moving */}
      {isMoving && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border"
          >
            <Star
              className={`h-4 w-4 ${map.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
            />
          </button>
          <div className="relative">
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
                      e.stopPropagation();
                      setShowMenu(false);
                      onMoveToFolder(null);
                    }}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Move to Root
                  </button>
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
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
