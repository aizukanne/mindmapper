import { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  _count: {
    children: number;
    mindMaps: number;
  };
  children?: FolderData[];
}

interface FolderTreeProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onFolderChange?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function FolderTree({ selectedFolderId, onSelectFolder, onFolderChange }: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creatingIn, setCreatingIn] = useState<string | null | 'root'>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Fetch folder tree
  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/folders/tree`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Toggle folder expansion
  const toggleExpand = (folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Create folder
  const handleCreateFolder = async (parentId: string | null) => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newFolderName.trim(), parentId }),
      });

      if (response.ok) {
        await fetchFolders();
        onFolderChange?.();
        if (parentId) {
          setExpandedIds((prev) => new Set([...prev, parentId]));
        }
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setCreatingIn(null);
      setNewFolderName('');
    }
  };

  // Rename folder
  const handleRename = async (folderId: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        await fetchFolders();
        onFolderChange?.();
      }
    } catch (error) {
      console.error('Failed to rename folder:', error);
    } finally {
      setEditingId(null);
      setEditName('');
    }
  };

  // Delete folder
  const handleDelete = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Contents will be moved to root.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/folders/${folderId}?moveContentsTo=root`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        if (selectedFolderId === folderId) {
          onSelectFolder(null);
        }
        await fetchFolders();
        onFolderChange?.();
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  // Render folder item
  const renderFolder = (folder: FolderData, depth = 0) => {
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isEditing = editingId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const isMenuOpen = menuOpenId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (!isEditing) {
              onSelectFolder(folder.id);
            }
          }}
        >
          {/* Expand/collapse button */}
          <button
            className="p-0.5 hover:bg-muted-foreground/20 rounded"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(folder.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {/* Folder icon */}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* Folder name or edit input */}
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(folder.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={() => handleRename(folder.id)}
              className="h-6 text-sm py-0 px-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate text-sm">{folder.name}</span>
          )}

          {/* Count badge */}
          {folder._count.mindMaps > 0 && !isEditing && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {folder._count.mindMaps}
            </span>
          )}

          {/* Actions menu */}
          {!isEditing && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 hover:bg-muted-foreground/20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(isMenuOpen ? null : folder.id);
                }}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(null);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setCreatingIn(folder.id);
                        setNewFolderName('');
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      New Subfolder
                    </button>
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setEditingId(folder.id);
                        setEditName(folder.name);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Rename
                    </button>
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        handleDelete(folder.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* New subfolder input */}
        {creatingIn === folder.id && (
          <div
            className="flex items-center gap-1 px-2 py-1.5"
            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
          >
            <span className="w-4" />
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder(folder.id);
                if (e.key === 'Escape') setCreatingIn(null);
              }}
              onBlur={() => {
                if (newFolderName.trim()) {
                  handleCreateFolder(folder.id);
                } else {
                  setCreatingIn(null);
                }
              }}
              placeholder="Folder name"
              className="h-6 text-sm py-0 px-1"
              autoFocus
            />
          </div>
        )}

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>{folder.children!.map((child) => renderFolder(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header with add button */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setCreatingIn('root');
            setNewFolderName('');
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* All Maps item */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          selectedFolderId === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <span className="w-5" />
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">All Maps</span>
      </div>

      {/* New root folder input */}
      {creatingIn === 'root' && (
        <div className="flex items-center gap-1 px-2 py-1.5 pl-4">
          <span className="w-4" />
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder(null);
              if (e.key === 'Escape') setCreatingIn(null);
            }}
            onBlur={() => {
              if (newFolderName.trim()) {
                handleCreateFolder(null);
              } else {
                setCreatingIn(null);
              }
            }}
            placeholder="Folder name"
            className="h-6 text-sm py-0 px-1"
            autoFocus
          />
        </div>
      )}

      {/* Folder tree */}
      {folders.map((folder) => renderFolder(folder))}

      {folders.length === 0 && creatingIn !== 'root' && (
        <p className="text-xs text-muted-foreground px-2 py-2">
          No folders yet. Click + to create one.
        </p>
      )}
    </div>
  );
}
