import { useState, useEffect, useCallback, DragEvent } from 'react';
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
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DragItem } from '@/hooks/useDragAndDrop';

interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
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
  onMapDropped?: (mapId: string, targetFolderId: string | null) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function FolderTree({ selectedFolderId, onSelectFolder, onFolderChange, onMapDropped }: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creatingIn, setCreatingIn] = useState<string | null | 'root'>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const [isRootDropTarget, setIsRootDropTarget] = useState(false);

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

  // Move folder to new parent
  const handleMoveFolder = async (folderId: string, newParentId: string | null) => {
    try {
      const response = await fetch(`${API_URL}/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parentId: newParentId }),
      });

      if (response.ok) {
        await fetchFolders();
        onFolderChange?.();
      }
    } catch (error) {
      console.error('Failed to move folder:', error);
    }
  };

  // Reorder folders
  const handleReorderFolders = async (folderId: string, targetId: string, position: 'before' | 'after') => {
    // Find folders at the same level as the target
    const findFolder = (folders: FolderData[], id: string): FolderData | null => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const targetFolder = findFolder(folders, targetId);
    const movedFolder = findFolder(folders, folderId);

    if (!targetFolder || !movedFolder) return;

    // Only reorder if they're in the same parent
    if (targetFolder.parentId !== movedFolder.parentId) {
      // Different parent - move to new parent instead
      await handleMoveFolder(folderId, targetFolder.parentId);
      return;
    }

    // Get all siblings
    const getAllSiblings = (foldersArr: FolderData[], parentId: string | null): FolderData[] => {
      if (parentId === null) {
        return foldersArr;
      }
      const parent = findFolder(foldersArr, parentId);
      return parent?.children || [];
    };

    const siblings = getAllSiblings(folders, targetFolder.parentId);
    const filteredSiblings = siblings.filter(f => f.id !== folderId);

    // Find target index
    const targetIndex = filteredSiblings.findIndex(f => f.id === targetId);

    // Calculate new order
    const newOrder: { id: string; order: number }[] = [];
    let orderCounter = 0;

    for (let i = 0; i <= filteredSiblings.length; i++) {
      if (i === targetIndex && position === 'before') {
        newOrder.push({ id: folderId, order: orderCounter++ });
      }
      if (i < filteredSiblings.length) {
        newOrder.push({ id: filteredSiblings[i].id, order: orderCounter++ });
      }
      if (i === targetIndex && position === 'after') {
        newOrder.push({ id: folderId, order: orderCounter++ });
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/folders/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderOrders: newOrder }),
      });

      if (response.ok) {
        await fetchFolders();
        onFolderChange?.();
      }
    } catch (error) {
      console.error('Failed to reorder folders:', error);
    }
  };

  // Drag handlers for folders
  const handleFolderDragStart = (e: DragEvent<HTMLDivElement>, folder: FolderData) => {
    const dragItem: DragItem = {
      type: 'folder',
      id: folder.id,
      sourceParentId: folder.parentId,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFolderId(folder.id);
  };

  const handleFolderDragEnd = () => {
    setDraggedFolderId(null);
    setDropTargetId(null);
    setDropPosition(null);
    setIsRootDropTarget(false);
  };

  const handleFolderDragOver = (e: DragEvent<HTMLDivElement>, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate drop position based on cursor location
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'after' | 'inside';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }

    setDropTargetId(folderId);
    setDropPosition(position);
    setIsRootDropTarget(false);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleFolderDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear if we're actually leaving the element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTargetId(null);
      setDropPosition(null);
    }
  };

  const handleFolderDrop = async (e: DragEvent<HTMLDivElement>, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const data = e.dataTransfer.getData('application/json');
      const item: DragItem = JSON.parse(data);

      if (item.type === 'map') {
        // Map dropped onto folder
        onMapDropped?.(item.id, targetFolderId);
      } else if (item.type === 'folder' && targetFolderId !== null) {
        // Folder dropped
        if (item.id === targetFolderId) return; // Can't drop on itself

        if (dropPosition === 'inside') {
          // Move folder inside target
          await handleMoveFolder(item.id, targetFolderId);
        } else if (dropPosition === 'before' || dropPosition === 'after') {
          // Reorder folders
          await handleReorderFolders(item.id, targetFolderId, dropPosition);
        }
      } else if (item.type === 'folder' && targetFolderId === null) {
        // Folder dropped on root
        await handleMoveFolder(item.id, null);
      }
    } catch (error) {
      console.error('Failed to process drop:', error);
    }

    setDropTargetId(null);
    setDropPosition(null);
    setDraggedFolderId(null);
    setIsRootDropTarget(false);
  };

  // Root drop zone handlers
  const handleRootDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsRootDropTarget(true);
    setDropTargetId(null);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRootDragLeave = () => {
    setIsRootDropTarget(false);
  };

  const handleRootDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const data = e.dataTransfer.getData('application/json');
      const item: DragItem = JSON.parse(data);

      if (item.type === 'map') {
        onMapDropped?.(item.id, null);
      } else if (item.type === 'folder') {
        await handleMoveFolder(item.id, null);
      }
    } catch (error) {
      console.error('Failed to process drop on root:', error);
    }

    setIsRootDropTarget(false);
    setDraggedFolderId(null);
  };

  // Check if folder is a descendant of another folder
  const isDescendant = (potentialDescendantId: string, ancestorId: string): boolean => {
    const findInChildren = (folders: FolderData[], targetId: string): boolean => {
      for (const folder of folders) {
        if (folder.id === targetId) return true;
        if (folder.children && findInChildren(folder.children, targetId)) return true;
      }
      return false;
    };

    const findFolder = (folders: FolderData[], id: string): FolderData | null => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const ancestor = findFolder(folders, ancestorId);
    if (!ancestor?.children) return false;
    return findInChildren(ancestor.children, potentialDescendantId);
  };

  // Render folder item
  const renderFolder = (folder: FolderData, depth = 0) => {
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isEditing = editingId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const isMenuOpen = menuOpenId === folder.id;
    const isDragging = draggedFolderId === folder.id;
    const isDropTarget = dropTargetId === folder.id;
    const isValidDropTarget = draggedFolderId !== null &&
      draggedFolderId !== folder.id &&
      !isDescendant(folder.id, draggedFolderId);

    // Determine drop indicator styles
    const getDropIndicatorStyle = () => {
      if (!isDropTarget || !isValidDropTarget) return '';

      switch (dropPosition) {
        case 'before':
          return 'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-primary';
        case 'after':
          return 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:bg-primary';
        case 'inside':
          return 'ring-2 ring-primary ring-inset';
        default:
          return '';
      }
    };

    return (
      <div key={folder.id} data-testid={`folder-item-${folder.id}`}>
        <div
          className={cn(
            'group relative flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all',
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
            isDragging && 'opacity-50',
            isDropTarget && isValidDropTarget && 'bg-primary/5',
            getDropIndicatorStyle()
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (!isEditing) {
              onSelectFolder(folder.id);
            }
          }}
          draggable={!isEditing}
          onDragStart={(e) => handleFolderDragStart(e, folder)}
          onDragEnd={handleFolderDragEnd}
          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, folder.id)}
          data-testid="folder-item"
          data-folder-id={folder.id}
        >
          {/* Drag handle */}
          <div
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
            data-testid="folder-drag-handle"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Expand/collapse button */}
          <button
            className="p-0.5 hover:bg-muted-foreground/20 rounded"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(folder.id);
            }}
            data-testid="folder-expand-toggle"
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
              data-testid="folder-rename-input"
            />
          ) : (
            <span className="flex-1 truncate text-sm" data-testid="folder-name">{folder.name}</span>
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
                data-testid="folder-menu-button"
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
                  <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]" data-testid="folder-menu-dropdown">
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setCreatingIn(folder.id);
                        setNewFolderName('');
                      }}
                      data-testid="folder-menu-new-subfolder"
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
                      data-testid="folder-menu-rename"
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
                      data-testid="folder-menu-delete"
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
            data-testid="new-subfolder-input-container"
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
              data-testid="new-subfolder-name-input"
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
    <div className="space-y-1" data-testid="folder-tree">
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
          data-testid="create-root-folder-button"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* All Maps item - also a drop target for moving to root */}
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all',
          selectedFolderId === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
          isRootDropTarget && 'ring-2 ring-primary ring-inset bg-primary/5'
        )}
        onClick={() => onSelectFolder(null)}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        data-testid="all-maps-button"
      >
        <span className="w-5" />
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">All Maps</span>
        {isRootDropTarget && (
          <span className="ml-auto text-xs text-primary font-medium">Drop here</span>
        )}
      </div>

      {/* New root folder input */}
      {creatingIn === 'root' && (
        <div className="flex items-center gap-1 px-2 py-1.5 pl-4" data-testid="new-root-folder-input-container">
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
            data-testid="new-folder-name-input"
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

      {/* Drag feedback overlay */}
      {draggedFolderId && (
        <div className="fixed bottom-4 left-4 bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg text-sm z-50 pointer-events-none">
          Drag to reorder or move into folder
        </div>
      )}
    </div>
  );
}
