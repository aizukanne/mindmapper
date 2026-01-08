
🔧 Tool: Task
Input: {
  "description": "Explore codebase structure",
  "prompt": "I need to implement a map card component for displaying individual maps in a grid. Please explore the codebase to understand:\n\n1. The overall project structure (what framework is being used - React, Vue, etc.)\n2. Existing component patterns and conventions\n3. Any existing card components or similar UI patterns\n4. The styling approach (CSS modules, styled-components, Tailwind, etc.)\n5. Any existing map-related components or data structures\n6. The testing setup (especially Playwright configuration)\n\nLook for:\n- package.json to understand dependencies\n- src/ or similar directory for components\n- Any existing card, thumbnail, or grid components\n- CSS/styling files to understand the styling approach\n- playwright.config.ts or similar for testing setup\n\nProvide a comprehensive summary of the codebase structure and conventions.",
  "subagent_type": "Explore"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper -maxdepth 2 -type f -name \"package.json\" | head -20",
  "description": "Find all package.json files in the project"
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

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps",
  "description": "List apps directory contents"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/packages",
  "description": "List packages directory contents"
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
  "command": "ls -la /projects/mindmapper/apps/web/src",
  "description": "List web src directory"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components",
  "description": "List components directory"
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/apps/web/src/components/**/*.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tailwind.config.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/card.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/maps",
  "description": "List maps components directory"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/pages",
  "description": "List pages directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/maps/CreateMapDialog.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/index.css",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "offset": 100,
  "limit": 200
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src -name \"*.tsx\" | xargs grep -l \"grid\\|card\" | head -10",
  "description": "Find components using grid or card patterns"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/playwright.config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "offset": 300,
  "limit": 250
}

🔧 Tool: Bash
Input: {
  "command": "grep -n \"grid\\|gap\\|className.*map\" /projects/mindmapper/apps/web/src/pages/Dashboard.tsx | head -30",
  "description": "Find grid and layout patterns in Dashboard"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/button.tsx",
  "limit": 50
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "offset": 640,
  "limit": 150
}

🔧 Tool: Bash
Input: {
  "command": "wc -l /projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "description": "Count Dashboard file lines"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/tests",
  "description": "List test directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/create-map-dialog.spec.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/packages/types -type f -name \"*.ts\" | head -10",
  "description": "Find type definition files"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types/src/index.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/lib",
  "description": "List lib directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/vite.config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/input.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/ui",
  "description": "List UI components directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/utils.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx",
  "limit": 100
}

🔧 Tool: Bash
Input: {
  "command": "grep -n \"export\\|interface\\|type\" /projects/mindmapper/apps/web/src/pages/Dashboard.tsx | head -30",
  "description": "Check Dashboard exports and types"
}

🔧 Tool: Bash
Input: {
  "command": "cat /projects/mindmapper/.env.example",
  "description": "Check environment configuration"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/templates/TemplateGallery.tsx",
  "limit": 80
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/label.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "grep -r \"forwardRef\\|React.memo\" /projects/mindmapper/apps/web/src/components/ui/ --include=\"*.tsx\" | head -5",
  "description": "Check component pattern conventions"
}
Now I have a comprehensive understanding of the codebase. Let me examine the current MapCard implementation in the Dashboard to understand what already exists, and then create a properly extracted, reusable MapCard component.

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/components/maps/**/*.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/card.tsx"
}
Now I have a complete understanding of the codebase. I can see there's already an inline `MapCard` function in the Dashboard.tsx file (lines 658-858). The task is to create a proper, reusable `MapCard` component that can be extracted and used separately.

Let me create the MapCard component as a separate file following the project's conventions:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create the MapCard component file",
      "status": "in_progress",
      "activeForm": "Creating the MapCard component file"
    },
    {
      "content": "Update Dashboard.tsx to import the new MapCard component",
      "status": "pending",
      "activeForm": "Updating Dashboard.tsx to use new component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "pending",
      "activeForm": "Creating and running Playwright verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/maps/MapCard.tsx",
  "content": "import * as React from 'react';\nimport { useState } from 'react';\nimport { FileText, Star, MoreHorizontal, Trash2, FolderOpen, Loader2 } from 'lucide-react';\nimport { formatDistanceToNow } from 'date-fns';\nimport { cn } from '@/lib/utils';\n\n/**\n * MindMap data structure for displaying in the card\n */\nexport interface MindMap {\n  id: string;\n  title: string;\n  description: string | null;\n  thumbnail: string | null;\n  isFavorite: boolean;\n  folderId: string | null;\n  updatedAt: string;\n  createdAt: string;\n}\n\n/**\n * Props for the MapCard component\n */\nexport interface MapCardProps {\n  /** The mind map data to display */\n  map: MindMap;\n  /** View mode - grid shows larger card, list shows compact row */\n  viewMode?: 'grid' | 'list';\n  /** Handler called when the card is clicked */\n  onClick?: () => void;\n  /** Handler called when delete action is triggered */\n  onDelete?: (e: React.MouseEvent) => void;\n  /** Handler called when favorite toggle is triggered */\n  onToggleFavorite?: (e: React.MouseEvent) => void;\n  /** Handler called when move to folder action is triggered */\n  onMoveToFolder?: (folderId: string | null) => void;\n  /** Whether a delete operation is in progress */\n  isDeleting?: boolean;\n  /** Whether a move operation is in progress */\n  isMoving?: boolean;\n  /** Additional CSS classes */\n  className?: string;\n}\n\n/**\n * MapCard component displays an individual mind map in either grid or list view.\n *\n * Features:\n * - Thumbnail display (with placeholder if no thumbnail)\n * - Title and metadata (last updated time)\n * - Quick actions menu (favorite toggle, move, delete)\n * - Loading states for async operations\n * - Responsive grid and list view modes\n *\n * @example\n * ```tsx\n * <MapCard\n *   map={mapData}\n *   viewMode=\"grid\"\n *   onClick={() => navigate(`/map/${mapData.id}`)}\n *   onDelete={(e) => handleDelete(mapData.id, e)}\n *   onToggleFavorite={(e) => handleToggleFavorite(mapData.id, e)}\n * />\n * ```\n */\nexport function MapCard({\n  map,\n  viewMode = 'grid',\n  onClick,\n  onDelete,\n  onToggleFavorite,\n  onMoveToFolder,\n  isDeleting = false,\n  isMoving = false,\n  className,\n}: MapCardProps) {\n  const [showMenu, setShowMenu] = useState(false);\n\n  // Format the updated time\n  const formattedTime = formatDistanceToNow(new Date(map.updatedAt), { addSuffix: true });\n\n  // Close menu when clicking outside\n  const handleBackdropClick = (e: React.MouseEvent) => {\n    e.stopPropagation();\n    setShowMenu(false);\n  };\n\n  // Toggle menu visibility\n  const handleMenuToggle = (e: React.MouseEvent) => {\n    e.stopPropagation();\n    setShowMenu(!showMenu);\n  };\n\n  // Handle move to root folder\n  const handleMoveToRoot = (e: React.MouseEvent) => {\n    e.stopPropagation();\n    setShowMenu(false);\n    onMoveToFolder?.(null);\n  };\n\n  // Handle delete action\n  const handleDelete = (e: React.MouseEvent) => {\n    setShowMenu(false);\n    onDelete?.(e);\n  };\n\n  // List view layout\n  if (viewMode === 'list') {\n    return (\n      <div\n        onClick={onClick}\n        className={cn(\n          'group relative flex items-center gap-4 border border-border rounded-lg p-3',\n          'hover:border-primary hover:shadow-md transition-all cursor-pointer',\n          className\n        )}\n        data-testid=\"map-card-list\"\n      >\n        {/* Thumbnail */}\n        <MapCardThumbnail\n          thumbnail={map.thumbnail}\n          title={map.title}\n          variant=\"list\"\n        />\n\n        {/* Content */}\n        <div className=\"flex-1 min-w-0\">\n          <h3 className=\"font-medium truncate\" data-testid=\"map-card-title\">\n            {map.title}\n          </h3>\n          <p className=\"text-xs text-muted-foreground\" data-testid=\"map-card-metadata\">\n            Updated {formattedTime}\n          </p>\n        </div>\n\n        {/* Loading overlay for moving */}\n        {isMoving && <MapCardLoadingOverlay />}\n\n        {/* Actions - always visible in list view */}\n        <MapCardActions\n          isFavorite={map.isFavorite}\n          showMenu={showMenu}\n          isDeleting={isDeleting}\n          onToggleFavorite={onToggleFavorite}\n          onMenuToggle={handleMenuToggle}\n          onBackdropClick={handleBackdropClick}\n          onMoveToRoot={handleMoveToRoot}\n          onDelete={handleDelete}\n          variant=\"list\"\n        />\n      </div>\n    );\n  }\n\n  // Grid view layout (default)\n  return (\n    <div\n      onClick={onClick}\n      className={cn(\n        'group relative border border-border rounded-lg p-4',\n        'hover:border-primary hover:shadow-md transition-all cursor-pointer',\n        className\n      )}\n      data-testid=\"map-card-grid\"\n    >\n      {/* Thumbnail placeholder */}\n      <MapCardThumbnail\n        thumbnail={map.thumbnail}\n        title={map.title}\n        variant=\"grid\"\n      />\n\n      {/* Title and meta */}\n      <h3 className=\"font-medium truncate\" data-testid=\"map-card-title\">\n        {map.title}\n      </h3>\n      <p className=\"text-xs text-muted-foreground mt-1\" data-testid=\"map-card-metadata\">\n        Updated {formattedTime}\n      </p>\n\n      {/* Loading overlay for moving */}\n      {isMoving && <MapCardLoadingOverlay />}\n\n      {/* Actions - show on hover in grid view */}\n      <div className=\"absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity\">\n        <MapCardActions\n          isFavorite={map.isFavorite}\n          showMenu={showMenu}\n          isDeleting={isDeleting}\n          onToggleFavorite={onToggleFavorite}\n          onMenuToggle={handleMenuToggle}\n          onBackdropClick={handleBackdropClick}\n          onMoveToRoot={handleMoveToRoot}\n          onDelete={handleDelete}\n          variant=\"grid\"\n        />\n      </div>\n    </div>\n  );\n}\n\n/**\n * Thumbnail sub-component for MapCard\n */\ninterface MapCardThumbnailProps {\n  thumbnail: string | null;\n  title: string;\n  variant: 'grid' | 'list';\n}\n\nfunction MapCardThumbnail({ thumbnail, title, variant }: MapCardThumbnailProps) {\n  const isGrid = variant === 'grid';\n\n  return (\n    <div\n      className={cn(\n        'rounded-md bg-muted flex items-center justify-center',\n        isGrid ? 'h-32 mb-3' : 'h-12 w-16 shrink-0'\n      )}\n      data-testid=\"map-card-thumbnail\"\n    >\n      {thumbnail ? (\n        <img\n          src={thumbnail}\n          alt={title}\n          className=\"w-full h-full object-cover rounded-md\"\n        />\n      ) : (\n        <FileText className={cn('text-muted-foreground', isGrid ? 'h-8 w-8' : 'h-5 w-5')} />\n      )}\n    </div>\n  );\n}\n\n/**\n * Loading overlay sub-component for MapCard\n */\nfunction MapCardLoadingOverlay() {\n  return (\n    <div\n      className=\"absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg\"\n      data-testid=\"map-card-loading\"\n    >\n      <Loader2 className=\"h-6 w-6 animate-spin text-primary\" />\n    </div>\n  );\n}\n\n/**\n * Actions menu sub-component for MapCard\n */\ninterface MapCardActionsProps {\n  isFavorite: boolean;\n  showMenu: boolean;\n  isDeleting: boolean;\n  onToggleFavorite?: (e: React.MouseEvent) => void;\n  onMenuToggle: (e: React.MouseEvent) => void;\n  onBackdropClick: (e: React.MouseEvent) => void;\n  onMoveToRoot: (e: React.MouseEvent) => void;\n  onDelete: (e: React.MouseEvent) => void;\n  variant: 'grid' | 'list';\n}\n\nfunction MapCardActions({\n  isFavorite,\n  showMenu,\n  isDeleting,\n  onToggleFavorite,\n  onMenuToggle,\n  onBackdropClick,\n  onMoveToRoot,\n  onDelete,\n  variant,\n}: MapCardActionsProps) {\n  const isGrid = variant === 'grid';\n\n  const buttonClass = isGrid\n    ? 'p-1.5 rounded-md bg-background/80 hover:bg-background border border-border'\n    : 'p-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border';\n\n  return (\n    <div className=\"flex items-center gap-1\" data-testid=\"map-card-actions\">\n      {/* Favorite button */}\n      <button\n        onClick={onToggleFavorite}\n        className={buttonClass}\n        data-testid=\"map-card-favorite-btn\"\n        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}\n      >\n        <Star\n          className={cn(\n            'h-4 w-4',\n            isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'\n          )}\n        />\n      </button>\n\n      {/* More actions dropdown */}\n      <div className=\"relative\">\n        <button\n          onClick={onMenuToggle}\n          className={buttonClass}\n          data-testid=\"map-card-menu-btn\"\n          aria-label=\"More actions\"\n        >\n          <MoreHorizontal className=\"h-4 w-4 text-muted-foreground\" />\n        </button>\n\n        {showMenu && (\n          <>\n            {/* Backdrop to close menu on outside click */}\n            <div\n              className=\"fixed inset-0 z-40\"\n              onClick={onBackdropClick}\n            />\n\n            {/* Dropdown menu */}\n            <div\n              className=\"absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]\"\n              data-testid=\"map-card-dropdown-menu\"\n            >\n              <button\n                onClick={onMoveToRoot}\n                className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2\"\n                data-testid=\"map-card-move-btn\"\n              >\n                <FolderOpen className=\"h-3 w-3\" />\n                Move to Root\n              </button>\n              <button\n                onClick={onDelete}\n                className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2\"\n                data-testid=\"map-card-delete-btn\"\n              >\n                {isDeleting ? (\n                  <Loader2 className=\"h-3 w-3 animate-spin\" />\n                ) : (\n                  <Trash2 className=\"h-3 w-3\" />\n                )}\n                Delete\n              </button>\n            </div>\n          </>\n        )}\n      </div>\n    </div>\n  );\n}\n\n// Export sub-components for composition pattern\nMapCard.Thumbnail = MapCardThumbnail;\nMapCard.LoadingOverlay = MapCardLoadingOverlay;\nMapCard.Actions = MapCardActions;\n\nexport default MapCard;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create the MapCard component file",
      "status": "completed",
      "activeForm": "Creating the MapCard component file"
    },
    {
      "content": "Update Dashboard.tsx to import the new MapCard component",
      "status": "in_progress",
      "activeForm": "Updating Dashboard.tsx to use new component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "pending",
      "activeForm": "Creating and running Playwright verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}
Now let me update the Dashboard.tsx to import and use the new MapCard component:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "import { useState, useEffect, useCallback, useMemo } from 'react';\nimport { useNavigate } from 'react-router-dom';\nimport { Plus, FolderOpen, Star, Clock, Search, FileText, Trash2, MoreHorizontal, Loader2, FolderPlus, Upload, Menu, X, Users, SortAsc, SortDesc, Filter, ArrowUpDown, LayoutGrid, List } from 'lucide-react';\nimport { formatDistanceToNow } from 'date-fns';\nimport { Button } from '@/components/ui/button';\nimport { TemplateGallery } from '@/components/templates/TemplateGallery';\nimport { CreateMapDialog } from '@/components/maps/CreateMapDialog';\nimport { UserMenu } from '@/components/auth/UserMenu';\nimport { FolderTree } from '@/components/sidebar/FolderTree';\nimport { GlobalSearch, useGlobalSearchShortcut } from '@/components/search/GlobalSearch';\nimport { ImportModal } from '@/components/import/ImportModal';\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';",
  "new_string": "import { useState, useEffect, useCallback, useMemo } from 'react';\nimport { useNavigate } from 'react-router-dom';\nimport { Plus, FolderOpen, Star, Clock, Search, FileText, Loader2, FolderPlus, Upload, Menu, X, Users, SortAsc, SortDesc, Filter, ArrowUpDown, LayoutGrid, List } from 'lucide-react';\nimport { Button } from '@/components/ui/button';\nimport { TemplateGallery } from '@/components/templates/TemplateGallery';\nimport { CreateMapDialog } from '@/components/maps/CreateMapDialog';\nimport { MapCard, MindMap } from '@/components/maps/MapCard';\nimport { UserMenu } from '@/components/auth/UserMenu';\nimport { FolderTree } from '@/components/sidebar/FolderTree';\nimport { GlobalSearch, useGlobalSearchShortcut } from '@/components/search/GlobalSearch';\nimport { ImportModal } from '@/components/import/ImportModal';\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';"
}
Now let me remove the local MindMap interface since we're importing it from MapCard:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "type SortOption = 'updated' | 'created' | 'title';\ntype SortDirection = 'asc' | 'desc';\ntype FilterOption = 'all' | 'favorites' | 'recent';\n\ninterface MindMap {\n  id: string;\n  title: string;\n  description: string | null;\n  thumbnail: string | null;\n  isFavorite: boolean;\n  folderId: string | null;\n  updatedAt: string;\n  createdAt: string;\n}\n\nconst API_URL",
  "new_string": "type SortOption = 'updated' | 'created' | 'title';\ntype SortDirection = 'asc' | 'desc';\ntype FilterOption = 'all' | 'favorites' | 'recent';\n\nconst API_URL"
}
Now I need to remove the local MapCard function at the end of the file. Let me read the end of the file first to see where it is:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "offset": 620
}
Now I need to remove the old local MapCard function and its interface. Let me do that:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "old_string": "    </div>\n  );\n}\n\ninterface MapCardProps {\n  map: MindMap;\n  viewMode?: 'grid' | 'list';\n  onClick: () => void;\n  onDelete: (e: React.MouseEvent) => void;\n  onToggleFavorite: (e: React.MouseEvent) => void;\n  onMoveToFolder: (folderId: string | null) => void;\n  isDeleting: boolean;\n  isMoving: boolean;\n}\n\nfunction MapCard({ map, viewMode = 'grid', onClick, onDelete, onToggleFavorite, onMoveToFolder, isDeleting, isMoving }: MapCardProps) {\n  const [showMenu, setShowMenu] = useState(false);\n\n  // List view layout\n  if (viewMode === 'list') {\n    return (\n      <div\n        onClick={onClick}\n        className=\"group relative flex items-center gap-4 border border-border rounded-lg p-3 hover:border-primary hover:shadow-md transition-all cursor-pointer\"\n        data-testid=\"map-card-list\"\n      >\n        {/* Thumbnail */}\n        <div className=\"h-12 w-16 rounded-md bg-muted flex items-center justify-center shrink-0\">\n          {map.thumbnail ? (\n            <img\n              src={map.thumbnail}\n              alt={map.title}\n              className=\"w-full h-full object-cover rounded-md\"\n            />\n          ) : (\n            <FileText className=\"h-5 w-5 text-muted-foreground\" />\n          )}\n        </div>\n\n        {/* Content */}\n        <div className=\"flex-1 min-w-0\">\n          <h3 className=\"font-medium truncate\">{map.title}</h3>\n          <p className=\"text-xs text-muted-foreground\">\n            Updated {formatDistanceToNow(new Date(map.updatedAt), { addSuffix: true })}\n          </p>\n        </div>\n\n        {/* Loading overlay for moving */}\n        {isMoving && (\n          <div className=\"absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg\">\n            <Loader2 className=\"h-6 w-6 animate-spin text-primary\" />\n          </div>\n        )}\n\n        {/* Actions - always visible in list view */}\n        <div className=\"flex items-center gap-1\">\n          <button\n            onClick={onToggleFavorite}\n            className=\"p-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border\"\n          >\n            <Star\n              className={`h-4 w-4 ${map.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}\n            />\n          </button>\n          <div className=\"relative\">\n            <button\n              onClick={(e) => {\n                e.stopPropagation();\n                setShowMenu(!showMenu);\n              }}\n              className=\"p-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border\"\n            >\n              <MoreHorizontal className=\"h-4 w-4 text-muted-foreground\" />\n            </button>\n            {showMenu && (\n              <>\n                <div\n                  className=\"fixed inset-0 z-40\"\n                  onClick={(e) => {\n                    e.stopPropagation();\n                    setShowMenu(false);\n                  }}\n                />\n                <div className=\"absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]\">\n                  <button\n                    onClick={(e) => {\n                      e.stopPropagation();\n                      setShowMenu(false);\n                      onMoveToFolder(null);\n                    }}\n                    className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2\"\n                  >\n                    <FolderOpen className=\"h-3 w-3\" />\n                    Move to Root\n                  </button>\n                  <button\n                    onClick={(e) => {\n                      setShowMenu(false);\n                      onDelete(e);\n                    }}\n                    className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2\"\n                  >\n                    {isDeleting ? (\n                      <Loader2 className=\"h-3 w-3 animate-spin\" />\n                    ) : (\n                      <Trash2 className=\"h-3 w-3\" />\n                    )}\n                    Delete\n                  </button>\n                </div>\n              </>\n            )}\n          </div>\n        </div>\n      </div>\n    );\n  }\n\n  // Grid view layout (default)\n  return (\n    <div\n      onClick={onClick}\n      className=\"group relative border border-border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer\"\n      data-testid=\"map-card-grid\"\n    >\n      {/* Thumbnail placeholder */}\n      <div className=\"h-32 rounded-md bg-muted flex items-center justify-center mb-3\">\n        {map.thumbnail ? (\n          <img\n            src={map.thumbnail}\n            alt={map.title}\n            className=\"w-full h-full object-cover rounded-md\"\n          />\n        ) : (\n          <FileText className=\"h-8 w-8 text-muted-foreground\" />\n        )}\n      </div>\n\n      {/* Title and meta */}\n      <h3 className=\"font-medium truncate\">{map.title}</h3>\n      <p className=\"text-xs text-muted-foreground mt-1\">\n        Updated {formatDistanceToNow(new Date(map.updatedAt), { addSuffix: true })}\n      </p>\n\n      {/* Loading overlay for moving */}\n      {isMoving && (\n        <div className=\"absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg\">\n          <Loader2 className=\"h-6 w-6 animate-spin text-primary\" />\n        </div>\n      )}\n\n      {/* Actions */}\n      <div className=\"absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity\">\n        <div className=\"flex gap-1\">\n          <button\n            onClick={onToggleFavorite}\n            className=\"p-1.5 rounded-md bg-background/80 hover:bg-background border border-border\"\n          >\n            <Star\n              className={`h-4 w-4 ${map.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}\n            />\n          </button>\n          <div className=\"relative\">\n            <button\n              onClick={(e) => {\n                e.stopPropagation();\n                setShowMenu(!showMenu);\n              }}\n              className=\"p-1.5 rounded-md bg-background/80 hover:bg-background border border-border\"\n            >\n              <MoreHorizontal className=\"h-4 w-4 text-muted-foreground\" />\n            </button>\n            {showMenu && (\n              <>\n                <div\n                  className=\"fixed inset-0 z-40\"\n                  onClick={(e) => {\n                    e.stopPropagation();\n                    setShowMenu(false);\n                  }}\n                />\n                <div className=\"absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]\">\n                  <button\n                    onClick={(e) => {\n                      e.stopPropagation();\n                      setShowMenu(false);\n                      onMoveToFolder(null);\n                    }}\n                    className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2\"\n                  >\n                    <FolderOpen className=\"h-3 w-3\" />\n                    Move to Root\n                  </button>\n                  <button\n                    onClick={(e) => {\n                      setShowMenu(false);\n                      onDelete(e);\n                    }}\n                    className=\"w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2\"\n                  >\n                    {isDeleting ? (\n                      <Loader2 className=\"h-3 w-3 animate-spin\" />\n                    ) : (\n                      <Trash2 className=\"h-3 w-3\" />\n                    )}\n                    Delete\n                  </button>\n                </div>\n              </>\n            )}\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n}",
  "new_string": "    </div>\n  );\n}"
}
Now let me verify the file compiles and update the todo list:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx tsc --noEmit 2>&1 | head -50",
  "description": "Type check the files"
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && pnpm tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -50",
  "description": "Type check using pnpm"
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && pnpm exec tsc --noEmit 2>&1 | head -50",
  "description": "Type check using pnpm exec"
}
No TypeScript errors. Now let me update the todo and create the Playwright verification test:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create the MapCard component file",
      "status": "completed",
      "activeForm": "Creating the MapCard component file"
    },
    {
      "content": "Update Dashboard.tsx to import the new MapCard component",
      "status": "completed",
      "activeForm": "Updating Dashboard.tsx to use new component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "in_progress",
      "activeForm": "Creating and running Playwright verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Deleting temporary test file"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/map-card-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Temporary verification test for MapCard component\n * This test verifies the core functionality of the MapCard component\n * in both grid and list views.\n */\ntest.describe('MapCard Component Verification', () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to the dashboard\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n  });\n\n  test('should display the dashboard page', async ({ page }) => {\n    // Verify the dashboard loads\n    await expect(page.getByText('MindMapper')).toBeVisible({ timeout: 10000 });\n  });\n\n  test('should have grid view mode available', async ({ page }) => {\n    // Check that grid view button exists\n    const gridViewButton = page.getByTestId('view-grid');\n    await expect(gridViewButton).toBeVisible({ timeout: 5000 });\n  });\n\n  test('should have list view mode available', async ({ page }) => {\n    // Check that list view button exists\n    const listViewButton = page.getByTestId('view-list');\n    await expect(listViewButton).toBeVisible({ timeout: 5000 });\n  });\n\n  test('should create a new map and display it in the MapCard', async ({ page }) => {\n    // Click the new map button\n    const newMapButton = page.getByTestId('new-map-button');\n\n    // On mobile, use the mobile button\n    if (await newMapButton.isVisible().catch(() => false)) {\n      await newMapButton.click();\n    } else {\n      const mobileButton = page.getByTestId('new-map-button-mobile');\n      await mobileButton.click();\n    }\n\n    // Wait for dialog\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    // Fill in the title\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Test Map for MapCard Verification');\n\n    // Submit\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    // Wait for navigation to map page\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n\n    // Navigate back to dashboard\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Verify the map card is displayed in grid view\n    const mapCard = page.getByTestId('map-card-grid').filter({ hasText: 'Test Map for MapCard Verification' });\n    await expect(mapCard).toBeVisible({ timeout: 10000 });\n\n    // Verify the card has the expected elements\n    const cardTitle = mapCard.getByTestId('map-card-title');\n    await expect(cardTitle).toBeVisible();\n    await expect(cardTitle).toHaveText('Test Map for MapCard Verification');\n\n    // Verify metadata is displayed\n    const metadata = mapCard.getByTestId('map-card-metadata');\n    await expect(metadata).toBeVisible();\n\n    // Verify thumbnail placeholder is displayed\n    const thumbnail = mapCard.getByTestId('map-card-thumbnail');\n    await expect(thumbnail).toBeVisible();\n  });\n\n  test('should switch between grid and list views', async ({ page }) => {\n    // Create a map first\n    const newMapButton = page.getByTestId('new-map-button');\n    if (await newMapButton.isVisible().catch(() => false)) {\n      await newMapButton.click();\n    } else {\n      const mobileButton = page.getByTestId('new-map-button-mobile');\n      await mobileButton.click();\n    }\n\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Test Map for View Switch');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Verify grid view is initially active\n    const gridViewButton = page.getByTestId('view-grid');\n    await expect(gridViewButton).toBeVisible();\n\n    const gridCard = page.getByTestId('map-card-grid').first();\n    await expect(gridCard).toBeVisible({ timeout: 5000 });\n\n    // Switch to list view\n    const listViewButton = page.getByTestId('view-list');\n    await listViewButton.click();\n\n    // Verify list view card is displayed\n    const listCard = page.getByTestId('map-card-list').first();\n    await expect(listCard).toBeVisible({ timeout: 5000 });\n\n    // Verify list card has title\n    const listCardTitle = listCard.getByTestId('map-card-title');\n    await expect(listCardTitle).toBeVisible();\n  });\n\n  test('should show actions menu on hover in grid view', async ({ page }) => {\n    // Create a map\n    const newMapButton = page.getByTestId('new-map-button');\n    if (await newMapButton.isVisible().catch(() => false)) {\n      await newMapButton.click();\n    } else {\n      const mobileButton = page.getByTestId('new-map-button-mobile');\n      await mobileButton.click();\n    }\n\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Test Map for Actions');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Hover over the grid card to reveal actions\n    const gridCard = page.getByTestId('map-card-grid').filter({ hasText: 'Test Map for Actions' });\n    await expect(gridCard).toBeVisible({ timeout: 5000 });\n    await gridCard.hover();\n\n    // Click the menu button\n    const menuButton = gridCard.getByTestId('map-card-menu-btn');\n    await expect(menuButton).toBeVisible({ timeout: 5000 });\n    await menuButton.click();\n\n    // Verify dropdown menu is visible\n    const dropdownMenu = gridCard.getByTestId('map-card-dropdown-menu');\n    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });\n\n    // Verify delete button is in the dropdown\n    const deleteButton = gridCard.getByTestId('map-card-delete-btn');\n    await expect(deleteButton).toBeVisible();\n  });\n\n  test('should toggle favorite status', async ({ page }) => {\n    // Create a map\n    const newMapButton = page.getByTestId('new-map-button');\n    if (await newMapButton.isVisible().catch(() => false)) {\n      await newMapButton.click();\n    } else {\n      const mobileButton = page.getByTestId('new-map-button-mobile');\n      await mobileButton.click();\n    }\n\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Test Map for Favorite');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Hover over the card and click favorite\n    const gridCard = page.getByTestId('map-card-grid').filter({ hasText: 'Test Map for Favorite' });\n    await expect(gridCard).toBeVisible({ timeout: 5000 });\n    await gridCard.hover();\n\n    const favoriteButton = gridCard.getByTestId('map-card-favorite-btn');\n    await expect(favoriteButton).toBeVisible({ timeout: 5000 });\n\n    // Click favorite button\n    await favoriteButton.click();\n\n    // Wait for UI to update - the favorites section should appear\n    await page.waitForTimeout(1000);\n\n    // Verify the map appears in favorites section\n    const favoritesGrid = page.getByTestId('favorites-grid');\n    await expect(favoritesGrid).toBeVisible({ timeout: 5000 });\n  });\n});\n"
}
Now let me run the Playwright tests:

🔧 Tool: Bash
Input: {
  "command": "pnpm exec playwright test map-card-verification.spec.ts --reporter=list 2>&1 | head -100",
  "description": "Run Playwright verification tests",
  "timeout": 180000
}
The Playwright tests are failing due to missing system libraries for the browser. This is an environment issue, not a code issue. Let me verify the code works by running a quick build and type check:

🔧 Tool: Bash
Input: {
  "command": "pnpm build 2>&1 | tail -30",
  "description": "Build the application to verify code works",
  "timeout": 120000
}
The build is successful. The Playwright tests failed due to a missing browser library in this environment (`libglib-2.0.so.0`), not due to any issue with the code. Let me verify the component files are correct and delete the temporary test file:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/maps/MapCard.tsx",
  "limit": 50
}
The component looks good. Now let me delete the temporary test file and update the todo:

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/map-card-verification.spec.ts && echo \"Test file deleted successfully\"",
  "description": "Delete temporary verification test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create the MapCard component file",
      "status": "completed",
      "activeForm": "Creating the MapCard component file"
    },
    {
      "content": "Update Dashboard.tsx to import the new MapCard component",
      "status": "completed",
      "activeForm": "Updating Dashboard.tsx to use new component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "completed",
      "activeForm": "Creating and running Playwright verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "completed",
      "activeForm": "Deleting temporary test file"
    }
  ]
}
Let me verify the final state of both files to confirm everything is correct:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx",
  "limit": 30
}

🔧 Tool: Bash
Input: {
  "command": "wc -l /projects/mindmapper/apps/web/src/components/maps/MapCard.tsx",
  "description": "Count lines in MapCard component"
}
The implementation is complete. Let me provide a final summary:

<summary>
## Summary: Create MapCard Component for Displaying Individual Maps in Grid

### Changes Implemented
- Created a new reusable `MapCard` component that displays individual mind maps in both grid and list views
- Extracted the inline MapCard implementation from Dashboard.tsx into a dedicated component file
- Added comprehensive TypeScript interfaces and JSDoc documentation
- Implemented sub-components for better composition: `MapCardThumbnail`, `MapCardLoadingOverlay`, and `MapCardActions`
- Added comprehensive `data-testid` attributes for testing
- Added accessibility features (aria-labels on buttons)
- Support for thumbnail display with placeholder icon when no thumbnail exists
- Quick actions menu with favorite toggle, move to folder, and delete actions
- Loading state overlays for async operations (moving, deleting)
- Responsive design for both grid (larger cards) and list (compact rows) view modes

### Files Modified
- `/projects/mindmapper/apps/web/src/components/maps/MapCard.tsx` (NEW - 355 lines)
  - Main MapCard component with full feature set
  - Exported MindMap interface for reuse
  - Exported MapCardProps interface
  - Sub-components for composition pattern
  
- `/projects/mindmapper/apps/web/src/pages/Dashboard.tsx` (MODIFIED)
  - Updated imports to use new MapCard component from `@/components/maps/MapCard`
  - Removed local MindMap interface (now imported)
  - Removed local MapCard function implementation (~200 lines removed)
  - Reduced file from 858 lines to 634 lines

### Verification Status
- TypeScript compilation: ✅ Passed (`pnpm exec tsc --noEmit`)
- Vite production build: ✅ Passed (`pnpm build`)
- Playwright E2E tests: Unable to run due to missing system library (`libglib-2.0.so.0`) in the test environment - this is an environment configuration issue, not a code issue
- The build verification confirms the component imports correctly and integrates with the existing codebase

### Notes for Developer
1. The MapCard component follows the existing project patterns:
   - Uses Tailwind CSS with the `cn()` utility for class composition
   - Uses Lucide React icons
   - Uses `date-fns` for date formatting
   - Follows the same styling conventions as other components

2. The component supports both grid and list view modes via the `viewMode` prop

3. All props are optional except `map`, making the component flexible for different use cases

4. Sub-components (`MapCard.Thumbnail`, `MapCard.LoadingOverlay`, `MapCard.Actions`) are exported for advanced composition patterns

5. To run Playwright tests, ensure the system has the required browser dependencies installed (run `npx playwright install-deps`)
</summary>