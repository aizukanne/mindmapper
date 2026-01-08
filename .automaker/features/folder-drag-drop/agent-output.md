
🔧 Tool: Task
Input: {
  "description": "Explore codebase structure",
  "prompt": "I need to implement a drag-and-drop feature to move maps between folders and reorder folders. Please explore the codebase to understand:\n\n1. The overall project structure and technology stack\n2. How folders and maps are currently managed (data models, state management)\n3. Existing UI components for folders and maps\n4. Any existing drag-and-drop implementations or libraries being used\n5. The patterns and conventions used in the codebase\n\nFocus on finding:\n- Folder-related components and their file locations\n- Map-related components and their file locations\n- State management approach (Redux, Context, etc.)\n- Any existing drag-and-drop functionality\n- CSS/styling patterns used\n\nProvide a comprehensive summary of what you find.",
  "subagent_type": "Explore"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper -type f -name \"package.json\" | head -20",
  "description": "Find package.json files to understand dependencies"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper",
  "description": "List root directory contents"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/package.json"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/",
  "description": "List app directories"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/packages/",
  "description": "List packages directories"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/components/*Folder*",
  "path": "/projects/mindmapper/apps/web"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/components/*Map*",
  "path": "/projects/mindmapper/apps/web"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/stores/**",
  "path": "/projects/mindmapper/apps/web"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/",
  "description": "List components directory"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/sidebar/",
  "description": "List sidebar components"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/maps/",
  "description": "List maps components"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/sidebar/FolderTree.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts"
}

🔧 Tool: Grep
Input: {
  "pattern": "drag|drop|draggable|droppable",
  "type": "tsx",
  "output_mode": "files_with_matches",
  "path": "/projects/mindmapper"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/api/src/routes/",
  "description": "List API routes"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/folders.ts",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/folders.ts",
  "offset": 100,
  "limit": 150
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/maps.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/maps/",
  "description": "List maps component files"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/maps/MapCard.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/maps/CreateMapDialog.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "limit": 150
}

🔧 Tool: Bash
Input: {
  "command": "grep -r \"draggable\\|drag\\|drop\" /projects/mindmapper/apps/web/src --include=\"*.tsx\" --include=\"*.ts\" -l",
  "description": "Search for drag-drop implementations"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/lib/",
  "description": "List lib directory contents"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/stores/",
  "description": "List stores directory"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/hooks/",
  "description": "List hooks directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/folders.ts",
  "offset": 250,
  "limit": 200
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/FlowCanvas.tsx",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types/src/index.ts",
  "limit": 100
}

🔧 Tool: Bash
Input: {
  "command": "grep -n \"folderId\\|folder\\|move\" /projects/mindmapper/apps/api/src/routes/folders.ts | head -40",
  "description": "Search for move/folder endpoints"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/folders.ts",
  "offset": 450,
  "limit": 200
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx",
  "limit": 100
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/ui/",
  "description": "List UI components"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web -name \"tailwind.config.js\" -o -name \"postcss.config.js\" | xargs ls -la",
  "description": "Find CSS config files"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tailwind.config.js",
  "limit": 80
}

🔧 Tool: Bash
Input: {
  "command": "grep -r \"sortable\\|reorder\\|dnd\" /projects/mindmapper --include=\"*.json\" -i",
  "description": "Search for drag-drop library usage"
}

🔧 Tool: Bash
Input: {
  "command": "cat /projects/mindmapper/.automaker/features/folder-drag-drop/feature.json",
  "description": "Read the feature definition"
}

🔧 Tool: Bash
Input: {
  "command": "wc -l /projects/mindmapper/apps/web/src/**/*.tsx | tail -5",
  "description": "Get code statistics"
}
Excellent! I now have a comprehensive understanding of the codebase. Let me read the key files to understand the current implementation details before planning the drag-and-drop feature.

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/sidebar/FolderTree.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/maps/MapCard.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx"
}
Now I have a good understanding of the codebase. Let me also check the API routes to understand the backend endpoints for folder reordering:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/folders.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}
Now I have all the information I need. Let me create a todo list to track the implementation and then start implementing the drag-and-drop feature.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create drag-and-drop hooks and utilities",
      "status": "in_progress",
      "activeForm": "Creating drag-and-drop hooks and utilities"
    },
    {
      "content": "Update FolderTree component with drag-and-drop support",
      "status": "pending",
      "activeForm": "Updating FolderTree component with drag-and-drop support"
    },
    {
      "content": "Update MapCard component with draggable support",
      "status": "pending",
      "activeForm": "Updating MapCard component with draggable support"
    },
    {
      "content": "Update Dashboard to integrate drag-and-drop context",
      "status": "pending",
      "activeForm": "Updating Dashboard to integrate drag-and-drop context"
    },
    {
      "content": "Add visual feedback styles for drag operations",
      "status": "pending",
      "activeForm": "Adding visual feedback styles for drag operations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run tests and verify functionality",
      "status": "pending",
      "activeForm": "Running tests and verifying functionality"
    }
  ]
}
Let me first create a custom drag-and-drop hook using HTML5 drag-and-drop API (no external library needed - the codebase uses native approaches):

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useDragAndDrop.ts",
  "content": "import { useState, useCallback, useRef, DragEvent } from 'react';\n\n/**\n * Types for drag-and-drop operations\n */\nexport type DragItemType = 'map' | 'folder';\n\nexport interface DragItem {\n  type: DragItemType;\n  id: string;\n  sourceParentId: string | null;\n}\n\nexport interface DropTarget {\n  type: 'folder' | 'root';\n  id: string | null;\n  position?: 'before' | 'after' | 'inside';\n}\n\nexport interface DragState {\n  isDragging: boolean;\n  dragItem: DragItem | null;\n  dropTarget: DropTarget | null;\n}\n\n/**\n * Hook for managing drag-and-drop state across the application\n */\nexport function useDragAndDropState() {\n  const [dragState, setDragState] = useState<DragState>({\n    isDragging: false,\n    dragItem: null,\n    dropTarget: null,\n  });\n\n  const startDrag = useCallback((item: DragItem) => {\n    setDragState({\n      isDragging: true,\n      dragItem: item,\n      dropTarget: null,\n    });\n  }, []);\n\n  const updateDropTarget = useCallback((target: DropTarget | null) => {\n    setDragState((prev) => ({\n      ...prev,\n      dropTarget: target,\n    }));\n  }, []);\n\n  const endDrag = useCallback(() => {\n    setDragState({\n      isDragging: false,\n      dragItem: null,\n      dropTarget: null,\n    });\n  }, []);\n\n  return {\n    dragState,\n    startDrag,\n    updateDropTarget,\n    endDrag,\n  };\n}\n\n/**\n * Hook for making an element draggable\n */\nexport function useDraggable(item: DragItem, onDragStart?: () => void, onDragEnd?: () => void) {\n  const [isDragging, setIsDragging] = useState(false);\n  const dragImageRef = useRef<HTMLDivElement | null>(null);\n\n  const handleDragStart = useCallback(\n    (e: DragEvent<HTMLElement>) => {\n      // Set data for the drag operation\n      e.dataTransfer.setData('application/json', JSON.stringify(item));\n      e.dataTransfer.effectAllowed = 'move';\n\n      // Create custom drag image\n      if (dragImageRef.current) {\n        e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);\n      }\n\n      setIsDragging(true);\n      onDragStart?.();\n    },\n    [item, onDragStart]\n  );\n\n  const handleDragEnd = useCallback(\n    (_e: DragEvent<HTMLElement>) => {\n      setIsDragging(false);\n      onDragEnd?.();\n    },\n    [onDragEnd]\n  );\n\n  return {\n    isDragging,\n    dragImageRef,\n    dragHandlers: {\n      draggable: true,\n      onDragStart: handleDragStart,\n      onDragEnd: handleDragEnd,\n    },\n  };\n}\n\n/**\n * Hook for making an element a drop target\n */\nexport function useDropTarget(\n  targetId: string | null,\n  targetType: 'folder' | 'root',\n  options: {\n    acceptTypes?: DragItemType[];\n    onDrop?: (item: DragItem, position?: 'before' | 'after' | 'inside') => void;\n    onDragEnter?: () => void;\n    onDragLeave?: () => void;\n    disabled?: boolean;\n  } = {}\n) {\n  const { acceptTypes = ['map', 'folder'], onDrop, onDragEnter, onDragLeave, disabled = false } = options;\n\n  const [isOver, setIsOver] = useState(false);\n  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);\n  const dragCounterRef = useRef(0);\n\n  const canAcceptDrop = useCallback(\n    (item: DragItem): boolean => {\n      if (disabled) return false;\n\n      // Check if item type is accepted\n      if (!acceptTypes.includes(item.type)) return false;\n\n      // Prevent dropping folder on itself\n      if (item.type === 'folder' && item.id === targetId) return false;\n\n      // Prevent dropping folder into its children (circular reference prevention)\n      // This is handled on the backend, but we can also prevent it in the UI\n      if (item.type === 'folder' && targetType === 'folder') {\n        // For now, allow it and let backend validate\n        return true;\n      }\n\n      return true;\n    },\n    [acceptTypes, targetId, targetType, disabled]\n  );\n\n  const getDragItem = useCallback((e: DragEvent<HTMLElement>): DragItem | null => {\n    try {\n      const data = e.dataTransfer.getData('application/json');\n      if (data) {\n        return JSON.parse(data) as DragItem;\n      }\n    } catch {\n      // Ignore parse errors during drag (data not available until drop)\n    }\n    return null;\n  }, []);\n\n  const calculateDropPosition = useCallback(\n    (e: DragEvent<HTMLElement>, element: HTMLElement): 'before' | 'after' | 'inside' => {\n      const rect = element.getBoundingClientRect();\n      const y = e.clientY - rect.top;\n      const height = rect.height;\n\n      // Top 25% = before, bottom 25% = after, middle 50% = inside\n      if (y < height * 0.25) return 'before';\n      if (y > height * 0.75) return 'after';\n      return 'inside';\n    },\n    []\n  );\n\n  const handleDragEnter = useCallback(\n    (e: DragEvent<HTMLElement>) => {\n      e.preventDefault();\n      dragCounterRef.current++;\n\n      if (dragCounterRef.current === 1) {\n        setIsOver(true);\n        onDragEnter?.();\n      }\n    },\n    [onDragEnter]\n  );\n\n  const handleDragLeave = useCallback(\n    (e: DragEvent<HTMLElement>) => {\n      e.preventDefault();\n      dragCounterRef.current--;\n\n      if (dragCounterRef.current === 0) {\n        setIsOver(false);\n        setDropPosition(null);\n        onDragLeave?.();\n      }\n    },\n    [onDragLeave]\n  );\n\n  const handleDragOver = useCallback(\n    (e: DragEvent<HTMLElement>) => {\n      e.preventDefault();\n\n      // Calculate drop position for folder reordering\n      if (targetType === 'folder') {\n        const position = calculateDropPosition(e, e.currentTarget);\n        setDropPosition(position);\n      }\n\n      e.dataTransfer.dropEffect = 'move';\n    },\n    [calculateDropPosition, targetType]\n  );\n\n  const handleDrop = useCallback(\n    (e: DragEvent<HTMLElement>) => {\n      e.preventDefault();\n      e.stopPropagation();\n\n      dragCounterRef.current = 0;\n      setIsOver(false);\n\n      const item = getDragItem(e);\n      if (item && canAcceptDrop(item)) {\n        const position = targetType === 'folder' ? calculateDropPosition(e, e.currentTarget) : 'inside';\n        onDrop?.(item, position);\n      }\n\n      setDropPosition(null);\n    },\n    [getDragItem, canAcceptDrop, onDrop, targetType, calculateDropPosition]\n  );\n\n  return {\n    isOver,\n    dropPosition,\n    dropHandlers: {\n      onDragEnter: handleDragEnter,\n      onDragLeave: handleDragLeave,\n      onDragOver: handleDragOver,\n      onDrop: handleDrop,\n    },\n  };\n}\n\n/**\n * Context for sharing drag state across components\n */\nimport { createContext, useContext, ReactNode } from 'react';\n\ninterface DragAndDropContextValue {\n  dragState: DragState;\n  startDrag: (item: DragItem) => void;\n  updateDropTarget: (target: DropTarget | null) => void;\n  endDrag: () => void;\n}\n\nconst DragAndDropContext = createContext<DragAndDropContextValue | null>(null);\n\nexport function DragAndDropProvider({ children }: { children: ReactNode }) {\n  const { dragState, startDrag, updateDropTarget, endDrag } = useDragAndDropState();\n\n  return (\n    <DragAndDropContext.Provider value={{ dragState, startDrag, updateDropTarget, endDrag }}>\n      {children}\n    </DragAndDropContext.Provider>\n  );\n}\n\nexport function useDragAndDropContext() {\n  const context = useContext(DragAndDropContext);\n  if (!context) {\n    throw new Error('useDragAndDropContext must be used within a DragAndDropProvider');\n  }\n  return context;\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create drag-and-drop hooks and utilities",
      "status": "completed",
      "activeForm": "Creating drag-and-drop hooks and utilities"
    },
    {
      "content": "Update FolderTree component with drag-and-drop support",
      "status": "in_progress",
      "activeForm": "Updating FolderTree component with drag-and-drop support"
    },
    {
      "content": "Update MapCard component with draggable support",
      "status": "pending",
      "activeForm": "Updating MapCard component with draggable support"
    },
    {
      "content": "Update Dashboard to integrate drag-and-drop context",
      "status": "pending",
      "activeForm": "Updating Dashboard to integrate drag-and-drop context"
    },
    {
      "content": "Add visual feedback styles for drag operations",
      "status": "pending",
      "activeForm": "Adding visual feedback styles for drag operations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run tests and verify functionality",
      "status": "pending",
      "activeForm": "Running tests and verifying functionality"
    }
  ]
}
Now let me update the FolderTree component to support drag-and-drop:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/sidebar/FolderTree.tsx",
  "content": "import { useState, useEffect, useCallback, DragEvent } from 'react';\nimport {\n  Folder,\n  FolderOpen,\n  ChevronRight,\n  ChevronDown,\n  Plus,\n  MoreHorizontal,\n  Pencil,\n  Trash2,\n  Loader2,\n  GripVertical,\n} from 'lucide-react';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { cn } from '@/lib/utils';\nimport type { DragItem } from '@/hooks/useDragAndDrop';\n\ninterface FolderData {\n  id: string;\n  name: string;\n  parentId: string | null;\n  order: number;\n  _count: {\n    children: number;\n    mindMaps: number;\n  };\n  children?: FolderData[];\n}\n\ninterface FolderTreeProps {\n  selectedFolderId: string | null;\n  onSelectFolder: (folderId: string | null) => void;\n  onFolderChange?: () => void;\n  onMapDropped?: (mapId: string, targetFolderId: string | null) => void;\n}\n\nconst API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';\n\nexport function FolderTree({ selectedFolderId, onSelectFolder, onFolderChange, onMapDropped }: FolderTreeProps) {\n  const [folders, setFolders] = useState<FolderData[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());\n  const [editingId, setEditingId] = useState<string | null>(null);\n  const [editName, setEditName] = useState('');\n  const [creatingIn, setCreatingIn] = useState<string | null | 'root'>(null);\n  const [newFolderName, setNewFolderName] = useState('');\n  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);\n\n  // Drag and drop state\n  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);\n  const [dropTargetId, setDropTargetId] = useState<string | null>(null);\n  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);\n  const [isRootDropTarget, setIsRootDropTarget] = useState(false);\n\n  // Fetch folder tree\n  const fetchFolders = useCallback(async () => {\n    try {\n      const response = await fetch(`${API_URL}/api/folders/tree`, {\n        credentials: 'include',\n      });\n      if (response.ok) {\n        const data = await response.json();\n        setFolders(data.data || []);\n      }\n    } catch (error) {\n      console.error('Failed to fetch folders:', error);\n    } finally {\n      setLoading(false);\n    }\n  }, []);\n\n  useEffect(() => {\n    fetchFolders();\n  }, [fetchFolders]);\n\n  // Toggle folder expansion\n  const toggleExpand = (folderId: string) => {\n    setExpandedIds((prev) => {\n      const next = new Set(prev);\n      if (next.has(folderId)) {\n        next.delete(folderId);\n      } else {\n        next.add(folderId);\n      }\n      return next;\n    });\n  };\n\n  // Create folder\n  const handleCreateFolder = async (parentId: string | null) => {\n    if (!newFolderName.trim()) return;\n\n    try {\n      const response = await fetch(`${API_URL}/api/folders`, {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        credentials: 'include',\n        body: JSON.stringify({ name: newFolderName.trim(), parentId }),\n      });\n\n      if (response.ok) {\n        await fetchFolders();\n        onFolderChange?.();\n        if (parentId) {\n          setExpandedIds((prev) => new Set([...prev, parentId]));\n        }\n      }\n    } catch (error) {\n      console.error('Failed to create folder:', error);\n    } finally {\n      setCreatingIn(null);\n      setNewFolderName('');\n    }\n  };\n\n  // Rename folder\n  const handleRename = async (folderId: string) => {\n    if (!editName.trim()) {\n      setEditingId(null);\n      return;\n    }\n\n    try {\n      const response = await fetch(`${API_URL}/api/folders/${folderId}`, {\n        method: 'PUT',\n        headers: { 'Content-Type': 'application/json' },\n        credentials: 'include',\n        body: JSON.stringify({ name: editName.trim() }),\n      });\n\n      if (response.ok) {\n        await fetchFolders();\n        onFolderChange?.();\n      }\n    } catch (error) {\n      console.error('Failed to rename folder:', error);\n    } finally {\n      setEditingId(null);\n      setEditName('');\n    }\n  };\n\n  // Delete folder\n  const handleDelete = async (folderId: string) => {\n    if (!confirm('Are you sure you want to delete this folder? Contents will be moved to root.')) {\n      return;\n    }\n\n    try {\n      const response = await fetch(`${API_URL}/api/folders/${folderId}?moveContentsTo=root`, {\n        method: 'DELETE',\n        credentials: 'include',\n      });\n\n      if (response.ok) {\n        if (selectedFolderId === folderId) {\n          onSelectFolder(null);\n        }\n        await fetchFolders();\n        onFolderChange?.();\n      }\n    } catch (error) {\n      console.error('Failed to delete folder:', error);\n    }\n  };\n\n  // Move folder to new parent\n  const handleMoveFolder = async (folderId: string, newParentId: string | null) => {\n    try {\n      const response = await fetch(`${API_URL}/api/folders/${folderId}`, {\n        method: 'PUT',\n        headers: { 'Content-Type': 'application/json' },\n        credentials: 'include',\n        body: JSON.stringify({ parentId: newParentId }),\n      });\n\n      if (response.ok) {\n        await fetchFolders();\n        onFolderChange?.();\n      }\n    } catch (error) {\n      console.error('Failed to move folder:', error);\n    }\n  };\n\n  // Reorder folders\n  const handleReorderFolders = async (folderId: string, targetId: string, position: 'before' | 'after') => {\n    // Find folders at the same level as the target\n    const findFolder = (folders: FolderData[], id: string): FolderData | null => {\n      for (const folder of folders) {\n        if (folder.id === id) return folder;\n        if (folder.children) {\n          const found = findFolder(folder.children, id);\n          if (found) return found;\n        }\n      }\n      return null;\n    };\n\n    const targetFolder = findFolder(folders, targetId);\n    const movedFolder = findFolder(folders, folderId);\n\n    if (!targetFolder || !movedFolder) return;\n\n    // Only reorder if they're in the same parent\n    if (targetFolder.parentId !== movedFolder.parentId) {\n      // Different parent - move to new parent instead\n      await handleMoveFolder(folderId, targetFolder.parentId);\n      return;\n    }\n\n    // Get all siblings\n    const getAllSiblings = (foldersArr: FolderData[], parentId: string | null): FolderData[] => {\n      if (parentId === null) {\n        return foldersArr;\n      }\n      const parent = findFolder(foldersArr, parentId);\n      return parent?.children || [];\n    };\n\n    const siblings = getAllSiblings(folders, targetFolder.parentId);\n    const filteredSiblings = siblings.filter(f => f.id !== folderId);\n\n    // Find target index\n    const targetIndex = filteredSiblings.findIndex(f => f.id === targetId);\n\n    // Calculate new order\n    const newOrder: { id: string; order: number }[] = [];\n    let orderCounter = 0;\n\n    for (let i = 0; i <= filteredSiblings.length; i++) {\n      if (i === targetIndex && position === 'before') {\n        newOrder.push({ id: folderId, order: orderCounter++ });\n      }\n      if (i < filteredSiblings.length) {\n        newOrder.push({ id: filteredSiblings[i].id, order: orderCounter++ });\n      }\n      if (i === targetIndex && position === 'after') {\n        newOrder.push({ id: folderId, order: orderCounter++ });\n      }\n    }\n\n    try {\n      const response = await fetch(`${API_URL}/api/folders/reorder`, {\n        method: 'PUT',\n        headers: { 'Content-Type': 'application/json' },\n        credentials: 'include',\n        body: JSON.stringify({ folderOrders: newOrder }),\n      });\n\n      if (response.ok) {\n        await fetchFolders();\n        onFolderChange?.();\n      }\n    } catch (error) {\n      console.error('Failed to reorder folders:', error);\n    }\n  };\n\n  // Drag handlers for folders\n  const handleFolderDragStart = (e: DragEvent<HTMLDivElement>, folder: FolderData) => {\n    const dragItem: DragItem = {\n      type: 'folder',\n      id: folder.id,\n      sourceParentId: folder.parentId,\n    };\n    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));\n    e.dataTransfer.effectAllowed = 'move';\n    setDraggedFolderId(folder.id);\n  };\n\n  const handleFolderDragEnd = () => {\n    setDraggedFolderId(null);\n    setDropTargetId(null);\n    setDropPosition(null);\n    setIsRootDropTarget(false);\n  };\n\n  const handleFolderDragOver = (e: DragEvent<HTMLDivElement>, folderId: string) => {\n    e.preventDefault();\n    e.stopPropagation();\n\n    // Calculate drop position based on cursor location\n    const rect = e.currentTarget.getBoundingClientRect();\n    const y = e.clientY - rect.top;\n    const height = rect.height;\n\n    let position: 'before' | 'after' | 'inside';\n    if (y < height * 0.25) {\n      position = 'before';\n    } else if (y > height * 0.75) {\n      position = 'after';\n    } else {\n      position = 'inside';\n    }\n\n    setDropTargetId(folderId);\n    setDropPosition(position);\n    setIsRootDropTarget(false);\n    e.dataTransfer.dropEffect = 'move';\n  };\n\n  const handleFolderDragLeave = (e: DragEvent<HTMLDivElement>) => {\n    // Only clear if we're actually leaving the element\n    const rect = e.currentTarget.getBoundingClientRect();\n    const x = e.clientX;\n    const y = e.clientY;\n\n    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {\n      setDropTargetId(null);\n      setDropPosition(null);\n    }\n  };\n\n  const handleFolderDrop = async (e: DragEvent<HTMLDivElement>, targetFolderId: string | null) => {\n    e.preventDefault();\n    e.stopPropagation();\n\n    try {\n      const data = e.dataTransfer.getData('application/json');\n      const item: DragItem = JSON.parse(data);\n\n      if (item.type === 'map') {\n        // Map dropped onto folder\n        onMapDropped?.(item.id, targetFolderId);\n      } else if (item.type === 'folder' && targetFolderId !== null) {\n        // Folder dropped\n        if (item.id === targetFolderId) return; // Can't drop on itself\n\n        if (dropPosition === 'inside') {\n          // Move folder inside target\n          await handleMoveFolder(item.id, targetFolderId);\n        } else if (dropPosition === 'before' || dropPosition === 'after') {\n          // Reorder folders\n          await handleReorderFolders(item.id, targetFolderId, dropPosition);\n        }\n      } else if (item.type === 'folder' && targetFolderId === null) {\n        // Folder dropped on root\n        await handleMoveFolder(item.id, null);\n      }\n    } catch (error) {\n      console.error('Failed to process drop:', error);\n    }\n\n    setDropTargetId(null);\n    setDropPosition(null);\n    setDraggedFolderId(null);\n    setIsRootDropTarget(false);\n  };\n\n  // Root drop zone handlers\n  const handleRootDragOver = (e: DragEvent<HTMLDivElement>) => {\n    e.preventDefault();\n    setIsRootDropTarget(true);\n    setDropTargetId(null);\n    e.dataTransfer.dropEffect = 'move';\n  };\n\n  const handleRootDragLeave = () => {\n    setIsRootDropTarget(false);\n  };\n\n  const handleRootDrop = async (e: DragEvent<HTMLDivElement>) => {\n    e.preventDefault();\n    e.stopPropagation();\n\n    try {\n      const data = e.dataTransfer.getData('application/json');\n      const item: DragItem = JSON.parse(data);\n\n      if (item.type === 'map') {\n        onMapDropped?.(item.id, null);\n      } else if (item.type === 'folder') {\n        await handleMoveFolder(item.id, null);\n      }\n    } catch (error) {\n      console.error('Failed to process drop on root:', error);\n    }\n\n    setIsRootDropTarget(false);\n    setDraggedFolderId(null);\n  };\n\n  // Check if folder is a descendant of another folder\n  const isDescendant = (potentialDescendantId: string, ancestorId: string): boolean => {\n    const findInChildren = (folders: FolderData[], targetId: string): boolean => {\n      for (const folder of folders) {\n        if (folder.id === targetId) return true;\n        if (folder.children && findInChildren(folder.children, targetId)) return true;\n      }\n      return false;\n    };\n\n    const findFolder = (folders: FolderData[], id: string): FolderData | null => {\n      for (const folder of folders) {\n        if (folder.id === id) return folder;\n        if (folder.children) {\n          const found = findFolder(folder.children, id);\n          if (found) return found;\n        }\n      }\n      return null;\n    };\n\n    const ancestor = findFolder(folders, ancestorId);\n    if (!ancestor?.children) return false;\n    return findInChildren(ancestor.children, potentialDescendantId);\n  };\n\n  // Render folder item\n  const renderFolder = (folder: FolderData, depth = 0) => {\n    const isExpanded = expandedIds.has(folder.id);\n    const isSelected = selectedFolderId === folder.id;\n    const isEditing = editingId === folder.id;\n    const hasChildren = folder.children && folder.children.length > 0;\n    const isMenuOpen = menuOpenId === folder.id;\n    const isDragging = draggedFolderId === folder.id;\n    const isDropTarget = dropTargetId === folder.id;\n    const isValidDropTarget = draggedFolderId !== null &&\n      draggedFolderId !== folder.id &&\n      !isDescendant(folder.id, draggedFolderId);\n\n    // Determine drop indicator styles\n    const getDropIndicatorStyle = () => {\n      if (!isDropTarget || !isValidDropTarget) return '';\n\n      switch (dropPosition) {\n        case 'before':\n          return 'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-primary';\n        case 'after':\n          return 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:bg-primary';\n        case 'inside':\n          return 'ring-2 ring-primary ring-inset';\n        default:\n          return '';\n      }\n    };\n\n    return (\n      <div key={folder.id} data-testid={`folder-item-${folder.id}`}>\n        <div\n          className={cn(\n            'group relative flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all',\n            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',\n            isDragging && 'opacity-50',\n            isDropTarget && isValidDropTarget && 'bg-primary/5',\n            getDropIndicatorStyle()\n          )}\n          style={{ paddingLeft: `${depth * 16 + 8}px` }}\n          onClick={() => {\n            if (!isEditing) {\n              onSelectFolder(folder.id);\n            }\n          }}\n          draggable={!isEditing}\n          onDragStart={(e) => handleFolderDragStart(e, folder)}\n          onDragEnd={handleFolderDragEnd}\n          onDragOver={(e) => handleFolderDragOver(e, folder.id)}\n          onDragLeave={handleFolderDragLeave}\n          onDrop={(e) => handleFolderDrop(e, folder.id)}\n          data-testid=\"folder-item\"\n          data-folder-id={folder.id}\n        >\n          {/* Drag handle */}\n          <div\n            className=\"opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity\"\n            data-testid=\"folder-drag-handle\"\n          >\n            <GripVertical className=\"h-3 w-3 text-muted-foreground\" />\n          </div>\n\n          {/* Expand/collapse button */}\n          <button\n            className=\"p-0.5 hover:bg-muted-foreground/20 rounded\"\n            onClick={(e) => {\n              e.stopPropagation();\n              toggleExpand(folder.id);\n            }}\n            data-testid=\"folder-expand-toggle\"\n          >\n            {hasChildren ? (\n              isExpanded ? (\n                <ChevronDown className=\"h-4 w-4 text-muted-foreground\" />\n              ) : (\n                <ChevronRight className=\"h-4 w-4 text-muted-foreground\" />\n              )\n            ) : (\n              <span className=\"w-4\" />\n            )}\n          </button>\n\n          {/* Folder icon */}\n          {isExpanded ? (\n            <FolderOpen className=\"h-4 w-4 text-muted-foreground shrink-0\" />\n          ) : (\n            <Folder className=\"h-4 w-4 text-muted-foreground shrink-0\" />\n          )}\n\n          {/* Folder name or edit input */}\n          {isEditing ? (\n            <Input\n              value={editName}\n              onChange={(e) => setEditName(e.target.value)}\n              onKeyDown={(e) => {\n                if (e.key === 'Enter') handleRename(folder.id);\n                if (e.key === 'Escape') setEditingId(null);\n              }}\n              onBlur={() => handleRename(folder.id)}\n              className=\"h-6 text-sm py-0 px-1\"\n              autoFocus\n              onClick={(e) => e.stopPropagation()}\n              data-testid=\"folder-rename-input\"\n            />\n          ) : (\n            <span className=\"flex-1 truncate text-sm\" data-testid=\"folder-name\">{folder.name}</span>\n          )}\n\n          {/* Count badge */}\n          {folder._count.mindMaps > 0 && !isEditing && (\n            <span className=\"text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded\">\n              {folder._count.mindMaps}\n            </span>\n          )}\n\n          {/* Actions menu */}\n          {!isEditing && (\n            <div className=\"relative opacity-0 group-hover:opacity-100 transition-opacity\">\n              <button\n                className=\"p-1 hover:bg-muted-foreground/20 rounded\"\n                onClick={(e) => {\n                  e.stopPropagation();\n                  setMenuOpenId(isMenuOpen ? null : folder.id);\n                }}\n                data-testid=\"folder-menu-button\"\n              >\n                <MoreHorizontal className=\"h-4 w-4 text-muted-foreground\" />\n              </button>\n\n              {isMenuOpen && (\n                <>\n                  <div\n                    className=\"fixed inset-0 z-40\"\n                    onClick={(e) => {\n                      e.stopPropagation();\n                      setMenuOpenId(null);\n                    }}\n                  />\n                  <div className=\"absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]\" data-testid=\"folder-menu-dropdown\">\n                    <button\n                      className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2\"\n                      onClick={(e) => {\n                        e.stopPropagation();\n                        setMenuOpenId(null);\n                        setCreatingIn(folder.id);\n                        setNewFolderName('');\n                      }}\n                      data-testid=\"folder-menu-new-subfolder\"\n                    >\n                      <Plus className=\"h-3 w-3\" />\n                      New Subfolder\n                    </button>\n                    <button\n                      className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2\"\n                      onClick={(e) => {\n                        e.stopPropagation();\n                        setMenuOpenId(null);\n                        setEditingId(folder.id);\n                        setEditName(folder.name);\n                      }}\n                      data-testid=\"folder-menu-rename\"\n                    >\n                      <Pencil className=\"h-3 w-3\" />\n                      Rename\n                    </button>\n                    <button\n                      className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2\"\n                      onClick={(e) => {\n                        e.stopPropagation();\n                        setMenuOpenId(null);\n                        handleDelete(folder.id);\n                      }}\n                      data-testid=\"folder-menu-delete\"\n                    >\n                      <Trash2 className=\"h-3 w-3\" />\n                      Delete\n                    </button>\n                  </div>\n                </>\n              )}\n            </div>\n          )}\n        </div>\n\n        {/* New subfolder input */}\n        {creatingIn === folder.id && (\n          <div\n            className=\"flex items-center gap-1 px-2 py-1.5\"\n            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}\n            data-testid=\"new-subfolder-input-container\"\n          >\n            <span className=\"w-4\" />\n            <Folder className=\"h-4 w-4 text-muted-foreground shrink-0\" />\n            <Input\n              value={newFolderName}\n              onChange={(e) => setNewFolderName(e.target.value)}\n              onKeyDown={(e) => {\n                if (e.key === 'Enter') handleCreateFolder(folder.id);\n                if (e.key === 'Escape') setCreatingIn(null);\n              }}\n              onBlur={() => {\n                if (newFolderName.trim()) {\n                  handleCreateFolder(folder.id);\n                } else {\n                  setCreatingIn(null);\n                }\n              }}\n              placeholder=\"Folder name\"\n              className=\"h-6 text-sm py-0 px-1\"\n              autoFocus\n              data-testid=\"new-subfolder-name-input\"\n            />\n          </div>\n        )}\n\n        {/* Children */}\n        {isExpanded && hasChildren && (\n          <div>{folder.children!.map((child) => renderFolder(child, depth + 1))}</div>\n        )}\n      </div>\n    );\n  };\n\n  if (loading) {\n    return (\n      <div className=\"flex items-center justify-center py-4\">\n        <Loader2 className=\"h-5 w-5 animate-spin text-muted-foreground\" />\n      </div>\n    );\n  }\n\n  return (\n    <div className=\"space-y-1\" data-testid=\"folder-tree\">\n      {/* Header with add button */}\n      <div className=\"flex items-center justify-between px-2 py-1\">\n        <span className=\"text-xs font-medium text-muted-foreground uppercase tracking-wider\">\n          Folders\n        </span>\n        <Button\n          variant=\"ghost\"\n          size=\"icon\"\n          className=\"h-6 w-6\"\n          onClick={() => {\n            setCreatingIn('root');\n            setNewFolderName('');\n          }}\n          data-testid=\"create-root-folder-button\"\n        >\n          <Plus className=\"h-4 w-4\" />\n        </Button>\n      </div>\n\n      {/* All Maps item - also a drop target for moving to root */}\n      <div\n        className={cn(\n          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all',\n          selectedFolderId === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted',\n          isRootDropTarget && 'ring-2 ring-primary ring-inset bg-primary/5'\n        )}\n        onClick={() => onSelectFolder(null)}\n        onDragOver={handleRootDragOver}\n        onDragLeave={handleRootDragLeave}\n        onDrop={handleRootDrop}\n        data-testid=\"all-maps-button\"\n      >\n        <span className=\"w-5\" />\n        <FolderOpen className=\"h-4 w-4 text-muted-foreground\" />\n        <span className=\"text-sm\">All Maps</span>\n        {isRootDropTarget && (\n          <span className=\"ml-auto text-xs text-primary font-medium\">Drop here</span>\n        )}\n      </div>\n\n      {/* New root folder input */}\n      {creatingIn === 'root' && (\n        <div className=\"flex items-center gap-1 px-2 py-1.5 pl-4\" data-testid=\"new-root-folder-input-container\">\n          <span className=\"w-4\" />\n          <Folder className=\"h-4 w-4 text-muted-foreground shrink-0\" />\n          <Input\n            value={newFolderName}\n            onChange={(e) => setNewFolderName(e.target.value)}\n            onKeyDown={(e) => {\n              if (e.key === 'Enter') handleCreateFolder(null);\n              if (e.key === 'Escape') setCreatingIn(null);\n            }}\n            onBlur={() => {\n              if (newFolderName.trim()) {\n                handleCreateFolder(null);\n              } else {\n                setCreatingIn(null);\n              }\n            }}\n            placeholder=\"Folder name\"\n            className=\"h-6 text-sm py-0 px-1\"\n            autoFocus\n            data-testid=\"new-folder-name-input\"\n          />\n        </div>\n      )}\n\n      {/* Folder tree */}\n      {folders.map((folder) => renderFolder(folder))}\n\n      {folders.length === 0 && creatingIn !== 'root' && (\n        <p className=\"text-xs text-muted-foreground px-2 py-2\">\n          No folders yet. Click + to create one.\n        </p>\n      )}\n\n      {/* Drag feedback overlay */}\n      {draggedFolderId && (\n        <div className=\"fixed bottom-4 left-4 bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg text-sm z-50 pointer-events-none\">\n          Drag to reorder or move into folder\n        </div>\n      )}\n    </div>\n  );\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create drag-and-drop hooks and utilities",
      "status": "completed",
      "activeForm": "Creating drag-and-drop hooks and utilities"
    },
    {
      "content": "Update FolderTree component with drag-and-drop support",
      "status": "completed",
      "activeForm": "Updating FolderTree component with drag-and-drop support"
    },
    {
      "content": "Update MapCard component with draggable support",
      "status": "in_progress",
      "activeForm": "Updating MapCard component with draggable support"
    },
    {
      "content": "Update Dashboard to integrate drag-and-drop context",
      "status": "pending",
      "activeForm": "Updating Dashboard to integrate drag-and-drop context"
    },
    {
      "content": "Add visual feedback styles for drag operations",
      "status": "pending",
      "activeForm": "Adding visual feedback styles for drag operations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run tests and verify functionality",
      "status": "pending",
      "activeForm": "Running tests and verifying functionality"
    }
  ]
}
Now let me update the MapCard component to support dragging:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/maps/MapCard.tsx",
  "content": "import * as React from 'react';\nimport { useState, DragEvent } from 'react';\nimport { FileText, Star, MoreHorizontal, Trash2, FolderOpen, Loader2, GripVertical } from 'lucide-react';\nimport { formatDistanceToNow } from 'date-fns';\nimport { cn } from '@/lib/utils';\nimport type { DragItem } from '@/hooks/useDragAndDrop';\n\n/**\n * MindMap data structure for displaying in the card\n */\nexport interface MindMap {\n  id: string;\n  title: string;\n  description: string | null;\n  thumbnail: string | null;\n  isFavorite: boolean;\n  folderId: string | null;\n  updatedAt: string;\n  createdAt: string;\n}\n\n/**\n * Props for the MapCard component\n */\nexport interface MapCardProps {\n  /** The mind map data to display */\n  map: MindMap;\n  /** View mode - grid shows larger card, list shows compact row */\n  viewMode?: 'grid' | 'list';\n  /** Handler called when the card is clicked */\n  onClick?: () => void;\n  /** Handler called when delete action is triggered */\n  onDelete?: (e: React.MouseEvent) => void;\n  /** Handler called when favorite toggle is triggered */\n  onToggleFavorite?: (e: React.MouseEvent) => void;\n  /** Handler called when move to folder action is triggered */\n  onMoveToFolder?: (folderId: string | null) => void;\n  /** Whether a delete operation is in progress */\n  isDeleting?: boolean;\n  /** Whether a move operation is in progress */\n  isMoving?: boolean;\n  /** Whether dragging is enabled */\n  draggable?: boolean;\n  /** Additional CSS classes */\n  className?: string;\n}\n\n/**\n * MapCard component displays an individual mind map in either grid or list view.\n *\n * Features:\n * - Thumbnail display (with placeholder if no thumbnail)\n * - Title and metadata (last updated time)\n * - Quick actions menu (favorite toggle, move, delete)\n * - Loading states for async operations\n * - Responsive grid and list view modes\n * - Drag and drop support for moving between folders\n *\n * @example\n * ```tsx\n * <MapCard\n *   map={mapData}\n *   viewMode=\"grid\"\n *   onClick={() => navigate(`/map/${mapData.id}`)}\n *   onDelete={(e) => handleDelete(mapData.id, e)}\n *   onToggleFavorite={(e) => handleToggleFavorite(mapData.id, e)}\n *   draggable={true}\n * />\n * ```\n */\nexport function MapCard({\n  map,\n  viewMode = 'grid',\n  onClick,\n  onDelete,\n  onToggleFavorite,\n  onMoveToFolder,\n  isDeleting = false,\n  isMoving = false,\n  draggable = true,\n  className,\n}: MapCardProps) {\n  const [showMenu, setShowMenu] = useState(false);\n  const [isDragging, setIsDragging] = useState(false);\n\n  // Format the updated time\n  const formattedTime = formatDistanceToNow(new Date(map.updatedAt), { addSuffix: true });\n\n  // Close menu when clicking outside\n  const handleBackdropClick = (e: React.MouseEvent) => {\n    e.stopPropagation();\n    setShowMenu(false);\n  };\n\n  // Toggle menu visibility\n  const handleMenuToggle = (e: React.MouseEvent) => {\n    e.stopPropagation();\n    setShowMenu(!showMenu);\n  };\n\n  // Handle move to root folder\n  const handleMoveToRoot = (e: React.MouseEvent) => {\n    e.stopPropagation();\n    setShowMenu(false);\n    onMoveToFolder?.(null);\n  };\n\n  // Handle delete action\n  const handleDelete = (e: React.MouseEvent) => {\n    setShowMenu(false);\n    onDelete?.(e);\n  };\n\n  // Drag handlers\n  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {\n    const dragItem: DragItem = {\n      type: 'map',\n      id: map.id,\n      sourceParentId: map.folderId,\n    };\n    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));\n    e.dataTransfer.effectAllowed = 'move';\n    setIsDragging(true);\n\n    // Add a small delay before setting opacity to make the drag image visible\n    setTimeout(() => {\n      e.currentTarget.style.opacity = '0.5';\n    }, 0);\n  };\n\n  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {\n    setIsDragging(false);\n    e.currentTarget.style.opacity = '1';\n  };\n\n  // List view layout\n  if (viewMode === 'list') {\n    return (\n      <div\n        onClick={onClick}\n        draggable={draggable && !isMoving}\n        onDragStart={handleDragStart}\n        onDragEnd={handleDragEnd}\n        className={cn(\n          'group relative flex items-center gap-4 border border-border rounded-lg p-3',\n          'hover:border-primary hover:shadow-md transition-all cursor-pointer',\n          isDragging && 'opacity-50 ring-2 ring-primary',\n          draggable && 'cursor-grab active:cursor-grabbing',\n          className\n        )}\n        data-testid=\"map-card-list\"\n        data-map-id={map.id}\n      >\n        {/* Drag handle indicator */}\n        {draggable && (\n          <div className=\"opacity-0 group-hover:opacity-100 transition-opacity shrink-0\">\n            <GripVertical className=\"h-4 w-4 text-muted-foreground\" />\n          </div>\n        )}\n\n        {/* Thumbnail */}\n        <MapCardThumbnail\n          thumbnail={map.thumbnail}\n          title={map.title}\n          variant=\"list\"\n        />\n\n        {/* Content */}\n        <div className=\"flex-1 min-w-0\">\n          <h3 className=\"font-medium truncate\" data-testid=\"map-card-title\">\n            {map.title}\n          </h3>\n          <p className=\"text-xs text-muted-foreground\" data-testid=\"map-card-metadata\">\n            Updated {formattedTime}\n          </p>\n        </div>\n\n        {/* Loading overlay for moving */}\n        {isMoving && <MapCardLoadingOverlay />}\n\n        {/* Actions - always visible in list view */}\n        <MapCardActions\n          isFavorite={map.isFavorite}\n          showMenu={showMenu}\n          isDeleting={isDeleting}\n          onToggleFavorite={onToggleFavorite}\n          onMenuToggle={handleMenuToggle}\n          onBackdropClick={handleBackdropClick}\n          onMoveToRoot={handleMoveToRoot}\n          onDelete={handleDelete}\n          variant=\"list\"\n        />\n      </div>\n    );\n  }\n\n  // Grid view layout (default)\n  return (\n    <div\n      onClick={onClick}\n      draggable={draggable && !isMoving}\n      onDragStart={handleDragStart}\n      onDragEnd={handleDragEnd}\n      className={cn(\n        'group relative border border-border rounded-lg p-4',\n        'hover:border-primary hover:shadow-md transition-all cursor-pointer',\n        isDragging && 'opacity-50 ring-2 ring-primary',\n        draggable && 'cursor-grab active:cursor-grabbing',\n        className\n      )}\n      data-testid=\"map-card-grid\"\n      data-map-id={map.id}\n    >\n      {/* Drag handle indicator */}\n      {draggable && (\n        <div className=\"absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10\">\n          <div className=\"p-1.5 rounded-md bg-background/80 hover:bg-background border border-border\">\n            <GripVertical className=\"h-4 w-4 text-muted-foreground\" />\n          </div>\n        </div>\n      )}\n\n      {/* Thumbnail placeholder */}\n      <MapCardThumbnail\n        thumbnail={map.thumbnail}\n        title={map.title}\n        variant=\"grid\"\n      />\n\n      {/* Title and meta */}\n      <h3 className=\"font-medium truncate\" data-testid=\"map-card-title\">\n        {map.title}\n      </h3>\n      <p className=\"text-xs text-muted-foreground mt-1\" data-testid=\"map-card-metadata\">\n        Updated {formattedTime}\n      </p>\n\n      {/* Loading overlay for moving */}\n      {isMoving && <MapCardLoadingOverlay />}\n\n      {/* Actions - show on hover in grid view */}\n      <div className=\"absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity\">\n        <MapCardActions\n          isFavorite={map.isFavorite}\n          showMenu={showMenu}\n          isDeleting={isDeleting}\n          onToggleFavorite={onToggleFavorite}\n          onMenuToggle={handleMenuToggle}\n          onBackdropClick={handleBackdropClick}\n          onMoveToRoot={handleMoveToRoot}\n          onDelete={handleDelete}\n          variant=\"grid\"\n        />\n      </div>\n    </div>\n  );\n}\n\n/**\n * Thumbnail sub-component for MapCard\n */\ninterface MapCardThumbnailProps {\n  thumbnail: string | null;\n  title: string;\n  variant: 'grid' | 'list';\n}\n\nfunction MapCardThumbnail({ thumbnail, title, variant }: MapCardThumbnailProps) {\n  const isGrid = variant === 'grid';\n\n  return (\n    <div\n      className={cn(\n        'rounded-md bg-muted flex items-center justify-center',\n        isGrid ? 'h-32 mb-3' : 'h-12 w-16 shrink-0'\n      )}\n      data-testid=\"map-card-thumbnail\"\n    >\n      {thumbnail ? (\n        <img\n          src={thumbnail}\n          alt={title}\n          className=\"w-full h-full object-cover rounded-md\"\n          draggable={false}\n        />\n      ) : (\n        <FileText className={cn('text-muted-foreground', isGrid ? 'h-8 w-8' : 'h-5 w-5')} />\n      )}\n    </div>\n  );\n}\n\n/**\n * Loading overlay sub-component for MapCard\n */\nfunction MapCardLoadingOverlay() {\n  return (\n    <div\n      className=\"absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg\"\n      data-testid=\"map-card-loading\"\n    >\n      <Loader2 className=\"h-6 w-6 animate-spin text-primary\" />\n    </div>\n  );\n}\n\n/**\n * Actions menu sub-component for MapCard\n */\ninterface MapCardActionsProps {\n  isFavorite: boolean;\n  showMenu: boolean;\n  isDeleting: boolean;\n  onToggleFavorite?: (e: React.MouseEvent) => void;\n  onMenuToggle: (e: React.MouseEvent) => void;\n  onBackdropClick: (e: React.MouseEvent) => void;\n  onMoveToRoot: (e: React.MouseEvent) => void;\n  onDelete: (e: React.MouseEvent) => void;\n  variant: 'grid' | 'list';\n}\n\nfunction MapCardActions({\n  isFavorite,\n  showMenu,\n  isDeleting,\n  onToggleFavorite,\n  onMenuToggle,\n  onBackdropClick,\n  onMoveToRoot,\n  onDelete,\n  variant,\n}: MapCardActionsProps) {\n  const isGrid = variant === 'grid';\n\n  const buttonClass = isGrid\n    ? 'p-1.5 rounded-md bg-background/80 hover:bg-background border border-border'\n    : 'p-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border';\n\n  return (\n    <div className=\"flex items-center gap-1\" data-testid=\"map-card-actions\">\n      {/* Favorite button */}\n      <button\n        onClick={onToggleFavorite}\n        className={buttonClass}\n        data-testid=\"map-card-favorite-btn\"\n        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}\n      >\n        <Star\n          className={cn(\n            'h-4 w-4',\n            isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'\n          )}\n        />\n      </button>\n\n      {/* More actions dropdown */}\n      <div className=\"relative\">\n        <button\n          onClick={onMenuToggle}\n          className={buttonClass}\n          data-testid=\"map-card-menu-btn\"\n          aria-label=\"More actions\"\n        >\n          <MoreHorizontal className=\"h-4 w-4 text-muted-foreground\" />\n        </button>\n\n        {showMenu && (\n          <>\n            {/* Backdrop to close menu on outside click */}\n            <div\n              className=\"fixed inset-0 z-40\"\n              onClick={onBackdropClick}\n            />\n\n            {/* Dropdown menu */}\n            <div\n              className=\"absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]\"\n              data-testid=\"map-card-dropdown-menu\"\n            >\n              <button\n                onClick={onMoveToRoot}\n                className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2\"\n                data-testid=\"map-card-move-btn\"\n              >\n                <FolderOpen className=\"h-3 w-3\" />\n                Move to Root\n              </button>\n              <button\n                onClick={onDelete}\n                className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2\"\n                data-testid=\"map-card-delete-btn\"\n              >\n                {isDeleting ? (\n                  <Loader2 className=\"h-3 w-3 animate-spin\" />\n                ) : (\n                  <Trash2 className=\"h-3 w-3\" />\n                )}\n                Delete\n              </button>\n            </div>\n          </>\n        )}\n      </div>\n    </div>\n  );\n}\n\n// Export sub-components for composition pattern\nMapCard.Thumbnail = MapCardThumbnail;\nMapCard.LoadingOverlay = MapCardLoadingOverlay;\nMapCard.Actions = MapCardActions;\n\nexport default MapCard;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create drag-and-drop hooks and utilities",
      "status": "completed",
      "activeForm": "Creating drag-and-drop hooks and utilities"
    },
    {
      "content": "Update FolderTree component with drag-and-drop support",
      "status": "completed",
      "activeForm": "Updating FolderTree component with drag-and-drop support"
    },
    {
      "content": "Update MapCard component with draggable support",
      "status": "completed",
      "activeForm": "Updating MapCard component with draggable support"
    },
    {
      "content": "Update Dashboard to integrate drag-and-drop context",
      "status": "in_progress",
      "activeForm": "Updating Dashboard to integrate drag-and-drop context"
    },
    {
      "content": "Add visual feedback styles for drag operations",
      "status": "pending",
      "activeForm": "Adding visual feedback styles for drag operations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run tests and verify functionality",
      "status": "pending",
      "activeForm": "Running tests and verifying functionality"
    }
  ]
}
Now let me update the Dashboard component to integrate the drag-and-drop functionality:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "import { useState, useEffect, useCallback, useMemo } from 'react';\nimport { useNavigate } from 'react-router-dom';\nimport { Plus, FolderOpen, Star, Clock, Search, FileText, Loader2, FolderPlus, Upload, Menu, X, Users, SortAsc, SortDesc, Filter, ArrowUpDown, LayoutGrid, List } from 'lucide-react';\nimport { Button } from '@/components/ui/button';\nimport { TemplateGallery } from '@/components/templates/TemplateGallery';\nimport { CreateMapDialog } from '@/components/maps/CreateMapDialog';\nimport { MapCard, MindMap } from '@/components/maps/MapCard';\nimport { UserMenu } from '@/components/auth/UserMenu';\nimport { FolderTree } from '@/components/sidebar/FolderTree';\nimport { GlobalSearch, useGlobalSearchShortcut } from '@/components/search/GlobalSearch';\nimport { ImportModal } from '@/components/import/ImportModal';\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';",
  "new_string": "import { useState, useEffect, useCallback, useMemo, useRef } from 'react';\nimport { useNavigate } from 'react-router-dom';\nimport { Plus, FolderOpen, Star, Clock, Search, FileText, Loader2, FolderPlus, Upload, Menu, X, Users, SortAsc, SortDesc, Filter, ArrowUpDown, LayoutGrid, List } from 'lucide-react';\nimport { Button } from '@/components/ui/button';\nimport { TemplateGallery } from '@/components/templates/TemplateGallery';\nimport { CreateMapDialog } from '@/components/maps/CreateMapDialog';\nimport { MapCard, MindMap } from '@/components/maps/MapCard';\nimport { UserMenu } from '@/components/auth/UserMenu';\nimport { FolderTree } from '@/components/sidebar/FolderTree';\nimport { GlobalSearch, useGlobalSearchShortcut } from '@/components/search/GlobalSearch';\nimport { ImportModal } from '@/components/import/ImportModal';\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';\nimport { cn } from '@/lib/utils';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "  // Filter and sort state\n  const [sortBy, setSortBy] = useState<SortOption>('updated');\n  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');\n  const [filterBy, setFilterBy] = useState<FilterOption>('all');\n  const [searchQuery, setSearchQuery] = useState('');\n  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');",
  "new_string": "  // Filter and sort state\n  const [sortBy, setSortBy] = useState<SortOption>('updated');\n  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');\n  const [filterBy, setFilterBy] = useState<FilterOption>('all');\n  const [searchQuery, setSearchQuery] = useState('');\n  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');\n\n  // Drag and drop state for folder tree communication\n  const folderTreeRef = useRef<{ refreshFolders: () => void } | null>(null);"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "  // Move map to folder\n  const handleMoveToFolder = async (mapId: string, folderId: string | null) => {\n    setMovingMapId(mapId);\n    try {\n      const targetFolder = folderId || 'root';\n      const response = await fetch(`${API_URL}/api/folders/${targetFolder}/maps/${mapId}`, {\n        method: 'POST',\n        credentials: 'include',\n      });\n      if (response.ok) {\n        // Refresh maps to reflect new folder assignment\n        await fetchMaps();\n      }\n    } catch (error) {\n      console.error('Failed to move map:', error);\n    } finally {\n      setMovingMapId(null);\n    }\n  };",
  "new_string": "  // Move map to folder (used by both menu action and drag-drop)\n  const handleMoveToFolder = useCallback(async (mapId: string, folderId: string | null) => {\n    setMovingMapId(mapId);\n    try {\n      const targetFolder = folderId || 'root';\n      const response = await fetch(`${API_URL}/api/folders/${targetFolder}/maps/${mapId}`, {\n        method: 'POST',\n        credentials: 'include',\n      });\n      if (response.ok) {\n        // Refresh maps to reflect new folder assignment\n        await fetchMaps();\n      }\n    } catch (error) {\n      console.error('Failed to move map:', error);\n    } finally {\n      setMovingMapId(null);\n    }\n  }, [fetchMaps]);\n\n  // Handle map dropped onto folder (from FolderTree component)\n  const handleMapDroppedOnFolder = useCallback((mapId: string, targetFolderId: string | null) => {\n    handleMoveToFolder(mapId, targetFolderId);\n  }, [handleMoveToFolder]);"
}
Now update the FolderTree component usage in Dashboard to pass the onMapDropped callback:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "          <FolderTree\n            selectedFolderId={selectedFolderId}\n            onSelectFolder={(id) => {\n              setSelectedFolderId(id);\n              setIsSidebarOpen(false); // Close on mobile after selection\n            }}\n            onFolderChange={fetchMaps}\n          />",
  "new_string": "          <FolderTree\n            selectedFolderId={selectedFolderId}\n            onSelectFolder={(id) => {\n              setSelectedFolderId(id);\n              setIsSidebarOpen(false); // Close on mobile after selection\n            }}\n            onFolderChange={fetchMaps}\n            onMapDropped={handleMapDroppedOnFolder}\n          />"
}
Now I also need to add the `draggable` prop to MapCard instances. Let me also add the MapCard prop for dragging:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "                    {favoriteMaps.map((map) => (\n                      <MapCard\n                        key={map.id}\n                        map={map}\n                        viewMode={viewMode}\n                        onClick={() => navigate(`/map/${map.id}`)}\n                        onDelete={(e) => handleDelete(map.id, e)}\n                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}\n                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}\n                        isDeleting={deletingId === map.id}\n                        isMoving={movingMapId === map.id}\n                      />\n                    ))}",
  "new_string": "                    {favoriteMaps.map((map) => (\n                      <MapCard\n                        key={map.id}\n                        map={map}\n                        viewMode={viewMode}\n                        onClick={() => navigate(`/map/${map.id}`)}\n                        onDelete={(e) => handleDelete(map.id, e)}\n                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}\n                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}\n                        isDeleting={deletingId === map.id}\n                        isMoving={movingMapId === map.id}\n                        draggable={true}\n                      />\n                    ))}"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "                    {(selectedFolderId === null ? (filterBy === 'all' ? recentMaps : filteredAndSortedMaps) : filteredAndSortedMaps).map((map) => (\n                      <MapCard\n                        key={map.id}\n                        map={map}\n                        viewMode={viewMode}\n                        onClick={() => navigate(`/map/${map.id}`)}\n                        onDelete={(e) => handleDelete(map.id, e)}\n                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}\n                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}\n                        isDeleting={deletingId === map.id}\n                        isMoving={movingMapId === map.id}\n                      />\n                    ))}",
  "new_string": "                    {(selectedFolderId === null ? (filterBy === 'all' ? recentMaps : filteredAndSortedMaps) : filteredAndSortedMaps).map((map) => (\n                      <MapCard\n                        key={map.id}\n                        map={map}\n                        viewMode={viewMode}\n                        onClick={() => navigate(`/map/${map.id}`)}\n                        onDelete={(e) => handleDelete(map.id, e)}\n                        onToggleFavorite={(e) => handleToggleFavorite(map.id, map.isFavorite, e)}\n                        onMoveToFolder={(folderId) => handleMoveToFolder(map.id, folderId)}\n                        isDeleting={deletingId === map.id}\n                        isMoving={movingMapId === map.id}\n                        draggable={true}\n                      />\n                    ))}"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create drag-and-drop hooks and utilities",
      "status": "completed",
      "activeForm": "Creating drag-and-drop hooks and utilities"
    },
    {
      "content": "Update FolderTree component with drag-and-drop support",
      "status": "completed",
      "activeForm": "Updating FolderTree component with drag-and-drop support"
    },
    {
      "content": "Update MapCard component with draggable support",
      "status": "completed",
      "activeForm": "Updating MapCard component with draggable support"
    },
    {
      "content": "Update Dashboard to integrate drag-and-drop context",
      "status": "completed",
      "activeForm": "Updating Dashboard to integrate drag-and-drop context"
    },
    {
      "content": "Add visual feedback styles for drag operations",
      "status": "completed",
      "activeForm": "Adding visual feedback styles for drag operations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "in_progress",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run tests and verify functionality",
      "status": "pending",
      "activeForm": "Running tests and verifying functionality"
    }
  ]
}
Now let me check if there's an existing Playwright configuration and create a verification test:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/playwright.config.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/e2e/**/*.spec.ts",
  "path": "/projects/mindmapper"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/tests/**/*.spec.ts",
  "path": "/projects/mindmapper"
}
Let me check the existing test for reference on the test patterns:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/create-map-dialog.spec.ts"
}
Now let me create a Playwright verification test for the drag-and-drop feature:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/folder-drag-drop.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Verification test for folder drag-and-drop feature\n * This test verifies:\n * 1. Map cards are draggable\n * 2. Folders can be created and are drop targets\n * 3. Folders can be reordered\n * 4. Visual feedback is displayed during drag operations\n */\ntest.describe('Folder Drag and Drop', () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to dashboard\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n  });\n\n  test('should display drag handle on map cards on hover', async ({ page }) => {\n    // Wait for map cards to load\n    const mapCard = page.locator('[data-testid=\"map-card-grid\"]').first();\n\n    // If there's a map card, check for drag handle visibility\n    const hasMapCard = await mapCard.isVisible().catch(() => false);\n\n    if (hasMapCard) {\n      // Hover over the map card\n      await mapCard.hover();\n\n      // Check that the drag handle becomes visible (it has opacity-0 by default, group-hover:opacity-100)\n      // The GripVertical icon should be visible\n      const dragHandle = mapCard.locator('svg.lucide-grip-vertical').first();\n      await expect(dragHandle).toBeVisible({ timeout: 5000 });\n    } else {\n      // If no maps exist, create one first\n      const newMapButton = page.getByTestId('new-map-button');\n      if (await newMapButton.isVisible()) {\n        await newMapButton.click();\n\n        const dialog = page.getByTestId('create-map-dialog');\n        await expect(dialog).toBeVisible({ timeout: 5000 });\n\n        const titleInput = page.getByTestId('map-title-input');\n        await titleInput.fill('Drag Test Map');\n\n        const submitButton = page.getByTestId('create-map-submit');\n        await submitButton.click();\n\n        // Wait for navigation to map editor\n        await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n\n        // Go back to dashboard\n        await page.goto('/');\n        await page.waitForLoadState('networkidle');\n\n        // Now check for drag handle\n        const createdMapCard = page.locator('[data-testid=\"map-card-grid\"]').first();\n        await createdMapCard.hover();\n\n        const dragHandle = createdMapCard.locator('svg.lucide-grip-vertical').first();\n        await expect(dragHandle).toBeVisible({ timeout: 5000 });\n      }\n    }\n  });\n\n  test('should create a folder and see it in the folder tree', async ({ page }) => {\n    // Click the create folder button\n    const createFolderButton = page.getByTestId('create-root-folder-button');\n    await expect(createFolderButton).toBeVisible({ timeout: 10000 });\n    await createFolderButton.click();\n\n    // Wait for the input to appear\n    const folderInput = page.getByTestId('new-folder-name-input');\n    await expect(folderInput).toBeVisible({ timeout: 5000 });\n\n    // Type the folder name\n    const folderName = 'Test Folder ' + Date.now();\n    await folderInput.fill(folderName);\n    await folderInput.press('Enter');\n\n    // Wait for the folder to appear in the tree\n    await page.waitForTimeout(1000);\n\n    // Verify the folder was created\n    const folderTree = page.getByTestId('folder-tree');\n    await expect(folderTree).toContainText(folderName);\n  });\n\n  test('should show drag handle on folder items on hover', async ({ page }) => {\n    // First create a folder if none exists\n    const createFolderButton = page.getByTestId('create-root-folder-button');\n    await expect(createFolderButton).toBeVisible({ timeout: 10000 });\n    await createFolderButton.click();\n\n    const folderInput = page.getByTestId('new-folder-name-input');\n    await expect(folderInput).toBeVisible({ timeout: 5000 });\n\n    const folderName = 'Hover Test Folder ' + Date.now();\n    await folderInput.fill(folderName);\n    await folderInput.press('Enter');\n\n    await page.waitForTimeout(1000);\n\n    // Find the folder item and hover\n    const folderItem = page.locator('[data-testid=\"folder-item\"]').first();\n    await expect(folderItem).toBeVisible({ timeout: 5000 });\n    await folderItem.hover();\n\n    // Check for the drag handle\n    const dragHandle = page.getByTestId('folder-drag-handle').first();\n    await expect(dragHandle).toBeVisible({ timeout: 5000 });\n  });\n\n  test('should show \"All Maps\" as drop target when dragging a folder', async ({ page }) => {\n    // Create two folders for the test\n    const createFolderButton = page.getByTestId('create-root-folder-button');\n    await expect(createFolderButton).toBeVisible({ timeout: 10000 });\n\n    // Create first folder\n    await createFolderButton.click();\n    const folderInput1 = page.getByTestId('new-folder-name-input');\n    await folderInput1.fill('Drag Source Folder ' + Date.now());\n    await folderInput1.press('Enter');\n    await page.waitForTimeout(500);\n\n    // Create second folder\n    await createFolderButton.click();\n    const folderInput2 = page.getByTestId('new-folder-name-input');\n    await folderInput2.fill('Drop Target Folder ' + Date.now());\n    await folderInput2.press('Enter');\n    await page.waitForTimeout(500);\n\n    // Get the first folder item\n    const folderItems = page.locator('[data-testid=\"folder-item\"]');\n    const firstFolder = folderItems.first();\n    await expect(firstFolder).toBeVisible({ timeout: 5000 });\n\n    // Get the \"All Maps\" button which serves as root drop target\n    const allMapsButton = page.getByTestId('all-maps-button');\n    await expect(allMapsButton).toBeVisible({ timeout: 5000 });\n\n    // Perform drag operation\n    // Note: In Playwright, we can simulate drag-and-drop using dragTo\n    const boundingBox = await firstFolder.boundingBox();\n    if (boundingBox) {\n      // Start the drag\n      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);\n      await page.mouse.down();\n\n      // Move to All Maps\n      const allMapsBox = await allMapsButton.boundingBox();\n      if (allMapsBox) {\n        await page.mouse.move(allMapsBox.x + allMapsBox.width / 2, allMapsBox.y + allMapsBox.height / 2, { steps: 10 });\n\n        // The All Maps button should now have visual feedback\n        // Check for the ring class or background change\n        await page.waitForTimeout(200);\n\n        // Release the drag\n        await page.mouse.up();\n      }\n    }\n  });\n\n  test('should be able to drag a map card', async ({ page }) => {\n    // Check if there's a map card\n    const mapCard = page.locator('[data-testid=\"map-card-grid\"]').first();\n    const hasMapCard = await mapCard.isVisible().catch(() => false);\n\n    if (!hasMapCard) {\n      // Create a map first\n      const newMapButton = page.getByTestId('new-map-button');\n      if (await newMapButton.isVisible()) {\n        await newMapButton.click();\n\n        const dialog = page.getByTestId('create-map-dialog');\n        await expect(dialog).toBeVisible({ timeout: 5000 });\n\n        const titleInput = page.getByTestId('map-title-input');\n        await titleInput.fill('Drag Test Map');\n\n        const submitButton = page.getByTestId('create-map-submit');\n        await submitButton.click();\n\n        await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n        await page.goto('/');\n        await page.waitForLoadState('networkidle');\n      }\n    }\n\n    // Now get the map card\n    const targetMapCard = page.locator('[data-testid=\"map-card-grid\"]').first();\n    const isVisible = await targetMapCard.isVisible().catch(() => false);\n\n    if (isVisible) {\n      // Verify the card has draggable attribute\n      const isDraggable = await targetMapCard.getAttribute('draggable');\n      expect(isDraggable).toBe('true');\n\n      // Get the data-map-id attribute\n      const mapId = await targetMapCard.getAttribute('data-map-id');\n      expect(mapId).toBeTruthy();\n    }\n  });\n\n  test('should reorder folders by dragging', async ({ page }) => {\n    // Create two folders\n    const createFolderButton = page.getByTestId('create-root-folder-button');\n    await expect(createFolderButton).toBeVisible({ timeout: 10000 });\n\n    // Create first folder\n    await createFolderButton.click();\n    const folderInput1 = page.getByTestId('new-folder-name-input');\n    await folderInput1.fill('AAA First Folder');\n    await folderInput1.press('Enter');\n    await page.waitForTimeout(500);\n\n    // Create second folder\n    await createFolderButton.click();\n    const folderInput2 = page.getByTestId('new-folder-name-input');\n    await folderInput2.fill('BBB Second Folder');\n    await folderInput2.press('Enter');\n    await page.waitForTimeout(500);\n\n    // Get folder items\n    const folderItems = page.locator('[data-testid=\"folder-item\"]');\n    const count = await folderItems.count();\n\n    expect(count).toBeGreaterThanOrEqual(2);\n\n    // Check that folders are in the list\n    const folderTree = page.getByTestId('folder-tree');\n    await expect(folderTree).toContainText('AAA First Folder');\n    await expect(folderTree).toContainText('BBB Second Folder');\n\n    // Perform a drag to reorder\n    const firstFolder = folderItems.first();\n    const lastFolder = folderItems.last();\n\n    const firstBox = await firstFolder.boundingBox();\n    const lastBox = await lastFolder.boundingBox();\n\n    if (firstBox && lastBox) {\n      // Drag from first to after last\n      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);\n      await page.mouse.down();\n      await page.mouse.move(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height * 0.9, { steps: 10 });\n      await page.mouse.up();\n\n      // Wait for the reorder to complete\n      await page.waitForTimeout(1000);\n    }\n  });\n\n  test('should display visual feedback when dragging over a folder', async ({ page }) => {\n    // Create a folder first\n    const createFolderButton = page.getByTestId('create-root-folder-button');\n    await expect(createFolderButton).toBeVisible({ timeout: 10000 });\n    await createFolderButton.click();\n\n    const folderInput = page.getByTestId('new-folder-name-input');\n    await folderInput.fill('Visual Feedback Test Folder');\n    await folderInput.press('Enter');\n    await page.waitForTimeout(500);\n\n    // Create a map to drag\n    const newMapButton = page.getByTestId('new-map-button');\n    if (await newMapButton.isVisible()) {\n      await newMapButton.click();\n\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n\n      const titleInput = page.getByTestId('map-title-input');\n      await titleInput.fill('Visual Feedback Test Map');\n\n      const submitButton = page.getByTestId('create-map-submit');\n      await submitButton.click();\n\n      await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n      await page.goto('/');\n      await page.waitForLoadState('networkidle');\n    }\n\n    // Get the map card and folder\n    const mapCard = page.locator('[data-testid=\"map-card-grid\"]').first();\n    const folderItem = page.locator('[data-testid=\"folder-item\"]').first();\n\n    const mapCardVisible = await mapCard.isVisible().catch(() => false);\n    const folderVisible = await folderItem.isVisible().catch(() => false);\n\n    if (mapCardVisible && folderVisible) {\n      const mapBox = await mapCard.boundingBox();\n      const folderBox = await folderItem.boundingBox();\n\n      if (mapBox && folderBox) {\n        // Start dragging the map\n        await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);\n        await page.mouse.down();\n\n        // Move over the folder\n        await page.mouse.move(folderBox.x + folderBox.width / 2, folderBox.y + folderBox.height / 2, { steps: 10 });\n\n        // Wait a bit for visual feedback\n        await page.waitForTimeout(300);\n\n        // Release\n        await page.mouse.up();\n      }\n    }\n  });\n});\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create drag-and-drop hooks and utilities",
      "status": "completed",
      "activeForm": "Creating drag-and-drop hooks and utilities"
    },
    {
      "content": "Update FolderTree component with drag-and-drop support",
      "status": "completed",
      "activeForm": "Updating FolderTree component with drag-and-drop support"
    },
    {
      "content": "Update MapCard component with draggable support",
      "status": "completed",
      "activeForm": "Updating MapCard component with draggable support"
    },
    {
      "content": "Update Dashboard to integrate drag-and-drop context",
      "status": "completed",
      "activeForm": "Updating Dashboard to integrate drag-and-drop context"
    },
    {
      "content": "Add visual feedback styles for drag operations",
      "status": "completed",
      "activeForm": "Adding visual feedback styles for drag operations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run tests and verify functionality",
      "status": "in_progress",
      "activeForm": "Running tests and verifying functionality"
    }
  ]
}
Now let me run the Playwright tests to verify the functionality:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright test folder-drag-drop.spec.ts --timeout=60000 2>&1 | head -100",
  "description": "Run Playwright drag-drop tests",
  "timeout": 120000
}
The Playwright browser is missing required system libraries. This is an environment issue, not a code issue. Let me instead verify the TypeScript compilation is working correctly:

🔧 Tool: Bash
Input: {
  "command": "npx tsc --noEmit 2>&1 | head -50",
  "description": "Check TypeScript compilation",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "pnpm exec tsc --noEmit 2>&1 | head -50",
  "description": "Check TypeScript compilation",
  "timeout": 60000
}
There's an issue with the hook file. Let me check and fix it:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useDragAndDrop.ts",
  "offset": 260,
  "limit": 30
}
The JSX isn't being recognized because the file is `.ts` not `.tsx`. Let me fix the file extension:

🔧 Tool: Bash
Input: {
  "command": "mv /projects/mindmapper/apps/web/src/hooks/useDragAndDrop.ts /projects/mindmapper/apps/web/src/hooks/useDragAndDrop.tsx",
  "description": "Rename hook file to tsx"
}
Now I need to update the imports in the files that use this hook:

🔧 Tool: Bash
Input: {
  "command": "pnpm exec tsc --noEmit 2>&1 | head -50",
  "description": "Check TypeScript compilation",
  "timeout": 60000
}
Only minor unused variable warnings. Let me clean those up:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "import { useState, useEffect, useCallback, useMemo, useRef } from 'react';",
  "new_string": "import { useState, useEffect, useCallback, useMemo } from 'react';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "import {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';\nimport { cn } from '@/lib/utils';",
  "new_string": "import {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');\n\n  // Drag and drop state for folder tree communication\n  const folderTreeRef = useRef<{ refreshFolders: () => void } | null>(null);\n\n  // Global search keyboard shortcut (Ctrl/Cmd + K)",
  "new_string": "  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');\n\n  // Global search keyboard shortcut (Ctrl/Cmd + K)"
}

🔧 Tool: Bash
Input: {
  "command": "pnpm exec tsc --noEmit 2>&1 | head -50",
  "description": "Check TypeScript compilation",
  "timeout": 60000
}
TypeScript compilation is now successful. Now let me verify the web app builds correctly:

🔧 Tool: Bash
Input: {
  "command": "pnpm build 2>&1 | tail -30",
  "description": "Build the web app",
  "timeout": 120000
}
The build is successful. Now let me clean up the test file as instructed (since Playwright can't run due to environment issues):

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/folder-drag-drop.spec.ts",
  "description": "Delete temporary test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create drag-and-drop hooks and utilities",
      "status": "completed",
      "activeForm": "Creating drag-and-drop hooks and utilities"
    },
    {
      "content": "Update FolderTree component with drag-and-drop support",
      "status": "completed",
      "activeForm": "Updating FolderTree component with drag-and-drop support"
    },
    {
      "content": "Update MapCard component with draggable support",
      "status": "completed",
      "activeForm": "Updating MapCard component with draggable support"
    },
    {
      "content": "Update Dashboard to integrate drag-and-drop context",
      "status": "completed",
      "activeForm": "Updating Dashboard to integrate drag-and-drop context"
    },
    {
      "content": "Add visual feedback styles for drag operations",
      "status": "completed",
      "activeForm": "Adding visual feedback styles for drag operations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run tests and verify functionality",
      "status": "completed",
      "activeForm": "Running tests and verifying functionality"
    }
  ]
}
<summary>
## Summary: Enable drag-and-drop to move maps between folders and reorder folders

### Changes Implemented
1. **Created drag-and-drop hooks and utilities** (`/apps/web/src/hooks/useDragAndDrop.tsx`)
   - Custom `useDraggable` hook for making elements draggable
   - Custom `useDropTarget` hook for making elements accept drops
   - `useDragAndDropState` hook for managing drag state
   - Context provider for sharing drag state across components
   - Type definitions for DragItem and DropTarget

2. **Updated FolderTree component** (`/apps/web/src/components/sidebar/FolderTree.tsx`)
   - Added drag-and-drop support for folders
   - Folders can now be dragged and reordered within the same level
   - Folders can be moved into other folders by dropping in the "inside" zone
   - Added drop position indicators (before/after/inside) with visual feedback
   - Added drag handle icon (GripVertical) visible on hover
   - Added "All Maps" as a root drop target for moving items to root
   - Added visual feedback when dragging over valid drop targets (ring highlight, opacity changes)
   - Added fixed notification overlay when dragging folders
   - Added `onMapDropped` callback prop for handling map drops from MapCard

3. **Updated MapCard component** (`/apps/web/src/components/maps/MapCard.tsx`)
   - Added `draggable` prop (default: true)
   - Map cards are now draggable with HTML5 drag-and-drop API
   - Added drag handle icon (GripVertical) visible on hover for both grid and list views
   - Added visual feedback during drag (opacity change, ring highlight)
   - Added `cursor-grab` and `cursor-grabbing` styles for drag affordance
   - Added `data-map-id` attribute for test identification

4. **Updated Dashboard page** (`/apps/web/src/pages/Dashboard.tsx`)
   - Integrated the `onMapDropped` callback to connect MapCard drag to FolderTree drop
   - Added `draggable={true}` prop to all MapCard instances
   - Added `handleMapDroppedOnFolder` callback for handling map drops on folders

### Files Modified
- `/apps/web/src/hooks/useDragAndDrop.tsx` (new file)
- `/apps/web/src/components/sidebar/FolderTree.tsx` (modified)
- `/apps/web/src/components/maps/MapCard.tsx` (modified)
- `/apps/web/src/pages/Dashboard.tsx` (modified)

### Verification Status
- TypeScript compilation: **PASSED** (no errors)
- Production build: **PASSED** (built successfully in 6.21s)
- Playwright tests: Could not run due to missing system libraries in the environment (libglib-2.0.so.0)
- A comprehensive test file was created but then deleted as per instructions since Playwright couldn't execute

### Notes for Developer
1. **Visual Feedback During Dragging:**
   - Map cards show opacity reduction and a primary ring when being dragged
   - Folders show drop position indicators (before/after lines, inside ring)
   - The "All Maps" button shows a ring and "Drop here" text when valid item is dragged over it
   - A fixed tooltip appears at bottom-left when dragging folders

2. **Drag Operations Supported:**
   - Drag map cards to folders in the sidebar to move them
   - Drag map cards to "All Maps" to move to root (no folder)
   - Drag folders to reorder them (before/after drop zones)
   - Drag folders into other folders to nest them
   - Backend already has nesting depth validation (max 10 levels)

3. **API Endpoints Used:**
   - `PUT /api/folders/:folderId` - Move folder (change parentId)
   - `PUT /api/folders/reorder` - Bulk reorder folders
   - `POST /api/folders/:folderId/maps/:mapId` - Move map to folder

4. **Testing Recommendation:**
   - Run the application locally and manually test drag-and-drop operations
   - Test on both desktop (mouse) and touch devices if applicable
   - The existing backend API already handles circular reference prevention
</summary>