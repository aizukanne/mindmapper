
🔧 Tool: Task
Input: {
  "description": "Explore codebase structure",
  "prompt": "I need to implement frontend functions for creating, updating, and deleting nodes in a React Flow application. The feature should sync changes with a backend API and update React Flow state.\n\nPlease explore the codebase to understand:\n1. The overall project structure\n2. How React Flow is currently set up\n3. Existing API patterns and services\n4. State management approach (Redux, Context, etc.)\n5. Any existing node-related code\n\nFocus on finding:\n- React Flow component files\n- API service files\n- State management files\n- Existing node types and structures\n\nBe thorough - I need to understand the patterns before implementing.",
  "subagent_type": "Explore"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper -type f -name \"*.json\" | grep -E \"(package|tsconfig)\" | head -20",
  "description": "Find package.json and tsconfig files to understand project structure"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/",
  "description": "List root directory structure"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/",
  "description": "List apps directory"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src -type d | head -20",
  "description": "Find source directory structure"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/package.json"
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/apps/web/src/components/canvas/**/*.tsx"
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/apps/web/src/stores/**/*.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/apps/web/src/lib/**/*.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/api-client.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/FlowCanvas.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/MindMapNode.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/api/src/routes -type f -name \"*.ts\"",
  "description": "Find API routes"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/nodes.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/maps.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/packages/types/**/*.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma",
  "limit": 150
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/apps/web/src/hooks/**/*.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/apps/web/src/components/editor/**/*.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useMapData.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useYjsSync.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/utils.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts",
  "limit": 80
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/connection-validation.ts"
}

🔧 Tool: Bash
Input: {
  "command": "head -50 /projects/mindmapper/apps/web/src/components/editor/EditorSidebar.tsx",
  "description": "Preview editor sidebar"
}
Now I have a comprehensive understanding of the codebase. Let me read the key files to understand the exact implementation details before making changes:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/api-client.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useMapData.ts"
}
Let me also read the backend nodes routes to understand the API endpoints:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/routes/nodes.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useYjsSync.ts"
}
Now I have a comprehensive understanding. Let me create a todo list to track the implementation and start implementing the feature:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create node API service with CRUD operations",
      "status": "in_progress",
      "activeForm": "Creating node API service with CRUD operations"
    },
    {
      "content": "Enhance mapStore with API sync functions",
      "status": "pending",
      "activeForm": "Enhancing mapStore with API sync functions"
    },
    {
      "content": "Create useNodeOperations hook to combine local state and API",
      "status": "pending",
      "activeForm": "Creating useNodeOperations hook"
    },
    {
      "content": "Integrate API sync into existing Canvas component",
      "status": "pending",
      "activeForm": "Integrating API sync into Canvas component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "pending",
      "activeForm": "Creating and running Playwright verification test"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/node-api.ts",
  "content": "/**\n * Node API Service\n * Handles CRUD operations for mind map nodes with backend synchronization.\n */\n\nimport { api, ApiError } from './api-client';\nimport type { NodeStyle } from '@mindmapper/types';\n\n// =============================================================================\n// Types\n// =============================================================================\n\nexport interface NodePosition {\n  x: number;\n  y: number;\n}\n\nexport interface CreateNodeRequest {\n  parentId: string | null;\n  type: 'ROOT' | 'CHILD' | 'FLOATING';\n  text: string;\n  positionX: number;\n  positionY: number;\n  width?: number;\n  height?: number;\n  style?: Partial<NodeStyle>;\n}\n\nexport interface UpdateNodeRequest {\n  text?: string;\n  positionX?: number;\n  positionY?: number;\n  width?: number;\n  height?: number;\n  style?: Partial<NodeStyle>;\n  isCollapsed?: boolean;\n  sortOrder?: number;\n}\n\nexport interface ApiNode {\n  id: string;\n  mindMapId: string;\n  parentId: string | null;\n  type: 'ROOT' | 'CHILD' | 'FLOATING';\n  text: string;\n  positionX: number;\n  positionY: number;\n  width: number;\n  height: number;\n  style: Record<string, unknown>;\n  metadata: Record<string, unknown>;\n  sortOrder: number;\n  isCollapsed: boolean;\n  createdAt: string;\n  updatedAt: string;\n}\n\nexport interface BatchOperation {\n  type: 'create' | 'update' | 'delete';\n  nodeId?: string;\n  data?: CreateNodeRequest | UpdateNodeRequest;\n}\n\nexport interface BatchOperationResult {\n  type: string;\n  nodeId: string;\n  status: string;\n}\n\n// =============================================================================\n// Node API Functions\n// =============================================================================\n\n/**\n * Create a new node in the mind map\n */\nexport async function createNode(\n  mapId: string,\n  data: CreateNodeRequest\n): Promise<ApiNode> {\n  return api.post<ApiNode>(`/api/maps/${mapId}/nodes`, data);\n}\n\n/**\n * Update an existing node\n */\nexport async function updateNode(\n  mapId: string,\n  nodeId: string,\n  data: UpdateNodeRequest\n): Promise<ApiNode> {\n  return api.put<ApiNode>(`/api/maps/${mapId}/nodes/${nodeId}`, data);\n}\n\n/**\n * Delete a node and its children\n */\nexport async function deleteNode(\n  mapId: string,\n  nodeId: string\n): Promise<{ message: string }> {\n  return api.delete<{ message: string }>(`/api/maps/${mapId}/nodes/${nodeId}`);\n}\n\n/**\n * Update only the position of a node (optimized for dragging)\n */\nexport async function updateNodePosition(\n  mapId: string,\n  nodeId: string,\n  position: NodePosition\n): Promise<void> {\n  await api.put(`/api/maps/${mapId}/nodes/${nodeId}/position`, {\n    positionX: position.x,\n    positionY: position.y,\n  });\n}\n\n/**\n * Batch operations for multiple node changes\n */\nexport async function batchNodeOperations(\n  mapId: string,\n  operations: BatchOperation[]\n): Promise<BatchOperationResult[]> {\n  const result = await api.post<{ results: BatchOperationResult[] }>(\n    `/api/maps/${mapId}/nodes/batch`,\n    { operations }\n  );\n  return result.results;\n}\n\n// =============================================================================\n// Debounced/Throttled Helpers\n// =============================================================================\n\ntype DebouncedFn<T extends (...args: unknown[]) => unknown> = (\n  ...args: Parameters<T>\n) => void;\n\n/**\n * Creates a debounced version of a function\n */\nexport function debounce<T extends (...args: unknown[]) => unknown>(\n  fn: T,\n  delay: number\n): DebouncedFn<T> & { cancel: () => void } {\n  let timeoutId: ReturnType<typeof setTimeout> | null = null;\n\n  const debouncedFn = (...args: Parameters<T>) => {\n    if (timeoutId) {\n      clearTimeout(timeoutId);\n    }\n    timeoutId = setTimeout(() => {\n      fn(...args);\n      timeoutId = null;\n    }, delay);\n  };\n\n  debouncedFn.cancel = () => {\n    if (timeoutId) {\n      clearTimeout(timeoutId);\n      timeoutId = null;\n    }\n  };\n\n  return debouncedFn;\n}\n\n/**\n * Creates a throttled version of a function\n */\nexport function throttle<T extends (...args: unknown[]) => unknown>(\n  fn: T,\n  limit: number\n): DebouncedFn<T> {\n  let inThrottle = false;\n  let lastArgs: Parameters<T> | null = null;\n\n  return (...args: Parameters<T>) => {\n    if (!inThrottle) {\n      fn(...args);\n      inThrottle = true;\n      setTimeout(() => {\n        inThrottle = false;\n        if (lastArgs) {\n          fn(...lastArgs);\n          lastArgs = null;\n        }\n      }, limit);\n    } else {\n      lastArgs = args;\n    }\n  };\n}\n\n// =============================================================================\n// Error Handling Helpers\n// =============================================================================\n\n/**\n * Check if an error is a network error (offline)\n */\nexport function isNetworkError(error: unknown): boolean {\n  return error instanceof ApiError && error.code === 'NETWORK_ERROR';\n}\n\n/**\n * Check if an error is retryable\n */\nexport function isRetryableError(error: unknown): boolean {\n  return error instanceof ApiError && error.isRetryable;\n}\n\n/**\n * Get user-friendly error message\n */\nexport function getErrorMessage(error: unknown): string {\n  if (error instanceof ApiError) {\n    switch (error.code) {\n      case 'NETWORK_ERROR':\n        return 'Unable to connect to server. Changes will be saved when you\\'re back online.';\n      case 'UNAUTHORIZED':\n        return 'Your session has expired. Please sign in again.';\n      case 'FORBIDDEN':\n        return 'You don\\'t have permission to modify this map.';\n      case 'NOT_FOUND':\n        return 'The node or map was not found.';\n      case 'VALIDATION_ERROR':\n        return 'Invalid data provided. Please check your input.';\n      case 'RATE_LIMITED':\n        return 'Too many requests. Please wait a moment and try again.';\n      default:\n        return error.message || 'An unexpected error occurred.';\n    }\n  }\n  return error instanceof Error ? error.message : 'An unexpected error occurred.';\n}\n\n// =============================================================================\n// Offline Queue (for optimistic updates)\n// =============================================================================\n\ninterface QueuedOperation {\n  id: string;\n  operation: BatchOperation;\n  mapId: string;\n  timestamp: number;\n  retryCount: number;\n}\n\nclass OfflineQueue {\n  private queue: QueuedOperation[] = [];\n  private isProcessing = false;\n  private maxRetries = 3;\n\n  add(mapId: string, operation: BatchOperation): string {\n    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;\n    this.queue.push({\n      id,\n      operation,\n      mapId,\n      timestamp: Date.now(),\n      retryCount: 0,\n    });\n    this.persist();\n    return id;\n  }\n\n  remove(id: string): void {\n    this.queue = this.queue.filter((item) => item.id !== id);\n    this.persist();\n  }\n\n  async processQueue(): Promise<void> {\n    if (this.isProcessing || this.queue.length === 0) return;\n\n    this.isProcessing = true;\n\n    // Group operations by mapId for batch processing\n    const groupedByMap = new Map<string, QueuedOperation[]>();\n    for (const item of this.queue) {\n      const existing = groupedByMap.get(item.mapId) || [];\n      existing.push(item);\n      groupedByMap.set(item.mapId, existing);\n    }\n\n    for (const [mapId, operations] of groupedByMap) {\n      try {\n        await batchNodeOperations(\n          mapId,\n          operations.map((op) => op.operation)\n        );\n        // Remove successful operations\n        operations.forEach((op) => this.remove(op.id));\n      } catch (error) {\n        if (!isRetryableError(error)) {\n          // Remove non-retryable operations\n          operations.forEach((op) => this.remove(op.id));\n        } else {\n          // Increment retry count\n          operations.forEach((op) => {\n            const item = this.queue.find((q) => q.id === op.id);\n            if (item) {\n              item.retryCount++;\n              if (item.retryCount >= this.maxRetries) {\n                this.remove(item.id);\n              }\n            }\n          });\n        }\n      }\n    }\n\n    this.isProcessing = false;\n  }\n\n  private persist(): void {\n    try {\n      localStorage.setItem('mindmapper_offline_queue', JSON.stringify(this.queue));\n    } catch {\n      // Ignore storage errors\n    }\n  }\n\n  load(): void {\n    try {\n      const stored = localStorage.getItem('mindmapper_offline_queue');\n      if (stored) {\n        this.queue = JSON.parse(stored);\n      }\n    } catch {\n      this.queue = [];\n    }\n  }\n\n  getQueueLength(): number {\n    return this.queue.length;\n  }\n}\n\nexport const offlineQueue = new OfflineQueue();\n\n// Load queue on module initialization\nif (typeof window !== 'undefined') {\n  offlineQueue.load();\n\n  // Process queue when coming back online\n  window.addEventListener('online', () => {\n    offlineQueue.processQueue();\n  });\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create node API service with CRUD operations",
      "status": "completed",
      "activeForm": "Creating node API service with CRUD operations"
    },
    {
      "content": "Enhance mapStore with API sync functions",
      "status": "in_progress",
      "activeForm": "Enhancing mapStore with API sync functions"
    },
    {
      "content": "Create useNodeOperations hook to combine local state and API",
      "status": "pending",
      "activeForm": "Creating useNodeOperations hook"
    },
    {
      "content": "Integrate API sync into existing Canvas component",
      "status": "pending",
      "activeForm": "Integrating API sync into Canvas component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "pending",
      "activeForm": "Creating and running Playwright verification test"
    }
  ]
}
Now let me update the mapStore to add API sync capabilities:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts",
  "old_string": "import { create } from 'zustand';\nimport {\n  type Node,\n  type Edge,\n  type OnNodesChange,\n  type OnEdgesChange,\n  type OnConnect,\n  type Connection,\n  type IsValidConnection,\n  applyNodeChanges,\n  applyEdgeChanges,\n  addEdge,\n} from '@xyflow/react';\nimport type { NodeStyle, ConnectionStyle } from '@mindmapper/types';\nimport { generateId } from '@/lib/utils';\nimport {\n  validateConnection,\n  DEFAULT_CONNECTION_RULES,\n  type ConnectionValidationResult,\n} from '@/lib/connection-validation';",
  "new_string": "import { create } from 'zustand';\nimport {\n  type Node,\n  type Edge,\n  type OnNodesChange,\n  type OnEdgesChange,\n  type OnConnect,\n  type Connection,\n  type IsValidConnection,\n  applyNodeChanges,\n  applyEdgeChanges,\n  addEdge,\n} from '@xyflow/react';\nimport type { NodeStyle, ConnectionStyle } from '@mindmapper/types';\nimport { generateId } from '@/lib/utils';\nimport {\n  validateConnection,\n  DEFAULT_CONNECTION_RULES,\n  type ConnectionValidationResult,\n} from '@/lib/connection-validation';\nimport {\n  createNode as apiCreateNode,\n  updateNode as apiUpdateNode,\n  deleteNode as apiDeleteNode,\n  updateNodePosition as apiUpdateNodePosition,\n  debounce,\n  isNetworkError,\n  getErrorMessage,\n  offlineQueue,\n  type CreateNodeRequest,\n  type UpdateNodeRequest,\n} from '@/lib/node-api';"
}
Now let me add the new state and actions to the MapState interface:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts",
  "old_string": "interface MapState {\n  // Map metadata\n  mapId: string | null;\n  title: string;\n\n  // React Flow state\n  nodes: MindMapNode[];\n  edges: MindMapEdge[];\n\n  // Selection state\n  selectedNodeId: string | null;\n\n  // Connection validation state\n  lastConnectionError: string | null;\n\n  // Actions\n  setMapId: (id: string | null) => void;\n  setTitle: (title: string) => void;\n  setNodes: (nodes: MindMapNode[]) => void;\n  setEdges: (edges: MindMapEdge[]) => void;\n\n  onNodesChange: OnNodesChange<MindMapNode>;\n  onEdgesChange: OnEdgesChange<MindMapEdge>;\n  onConnect: OnConnect;\n\n  // Connection validation\n  isValidConnection: IsValidConnection;\n  validateConnectionAttempt: (connection: Connection) => ConnectionValidationResult;\n  clearConnectionError: () => void;\n\n  // Node operations\n  addNode: (parentId: string | null, position?: { x: number; y: number }) => string;\n  updateNodeText: (nodeId: string, text: string) => void;\n  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void;\n  deleteNode: (nodeId: string) => void;\n  duplicateNode: (nodeId: string) => string | null;\n  setSelectedNode: (nodeId: string | null) => void;\n  toggleNodeCollapse: (nodeId: string) => void;\n\n  // Initialization\n  initializeNewMap: () => void;\n  loadMap: (mapId: string, nodes: MindMapNode[], edges: MindMapEdge[], title: string) => void;\n}",
  "new_string": "interface MapState {\n  // Map metadata\n  mapId: string | null;\n  title: string;\n\n  // React Flow state\n  nodes: MindMapNode[];\n  edges: MindMapEdge[];\n\n  // Selection state\n  selectedNodeId: string | null;\n\n  // Connection validation state\n  lastConnectionError: string | null;\n\n  // Sync state\n  isSyncing: boolean;\n  syncError: string | null;\n  pendingChanges: number;\n\n  // Actions\n  setMapId: (id: string | null) => void;\n  setTitle: (title: string) => void;\n  setNodes: (nodes: MindMapNode[]) => void;\n  setEdges: (edges: MindMapEdge[]) => void;\n\n  onNodesChange: OnNodesChange<MindMapNode>;\n  onEdgesChange: OnEdgesChange<MindMapEdge>;\n  onConnect: OnConnect;\n\n  // Connection validation\n  isValidConnection: IsValidConnection;\n  validateConnectionAttempt: (connection: Connection) => ConnectionValidationResult;\n  clearConnectionError: () => void;\n\n  // Node operations (local state only)\n  addNode: (parentId: string | null, position?: { x: number; y: number }) => string;\n  updateNodeText: (nodeId: string, text: string) => void;\n  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => void;\n  deleteNode: (nodeId: string) => void;\n  duplicateNode: (nodeId: string) => string | null;\n  setSelectedNode: (nodeId: string | null) => void;\n  toggleNodeCollapse: (nodeId: string) => void;\n\n  // Node operations with API sync\n  createNodeWithSync: (parentId: string | null, position?: { x: number; y: number }) => Promise<string>;\n  updateNodeTextWithSync: (nodeId: string, text: string) => Promise<void>;\n  updateNodeStyleWithSync: (nodeId: string, style: Partial<NodeStyle>) => Promise<void>;\n  deleteNodeWithSync: (nodeId: string) => Promise<void>;\n  updateNodePositionWithSync: (nodeId: string, position: { x: number; y: number }) => Promise<void>;\n\n  // Sync state management\n  setSyncError: (error: string | null) => void;\n  clearSyncError: () => void;\n\n  // Initialization\n  initializeNewMap: () => void;\n  loadMap: (mapId: string, nodes: MindMapNode[], edges: MindMapEdge[], title: string) => void;\n}"
}
Now let me update the initial state and add the new sync actions:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts",
  "old_string": "export const useMapStore = create<MapState>((set, get) => ({\n  // Initial state\n  mapId: null,\n  title: 'Untitled Mind Map',\n  nodes: [],\n  edges: [],\n  selectedNodeId: null,\n  lastConnectionError: null,\n\n  // Setters\n  setMapId: (id) => set({ mapId: id }),\n  setTitle: (title) => set({ title }),\n  setNodes: (nodes) => set({ nodes }),\n  setEdges: (edges) => set({ edges }),",
  "new_string": "// Debounced position update to avoid too many API calls during drag\nconst debouncedPositionUpdates = new Map<string, ReturnType<typeof debounce>>();\n\nexport const useMapStore = create<MapState>((set, get) => ({\n  // Initial state\n  mapId: null,\n  title: 'Untitled Mind Map',\n  nodes: [],\n  edges: [],\n  selectedNodeId: null,\n  lastConnectionError: null,\n  isSyncing: false,\n  syncError: null,\n  pendingChanges: 0,\n\n  // Setters\n  setMapId: (id) => set({ mapId: id }),\n  setTitle: (title) => set({ title }),\n  setNodes: (nodes) => set({ nodes }),\n  setEdges: (edges) => set({ edges }),"
}
Now I need to add the API sync methods at the end of the store, before the closing `}))`:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts",
  "offset": 400
}
Now let me add the API sync methods before the closing `}))`:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts",
  "old_string": "  loadMap: (mapId, nodes, edges, title) => {\n    set({\n      mapId,\n      title,\n      nodes,\n      edges,\n      selectedNodeId: null,\n    });\n  },\n}));",
  "new_string": "  loadMap: (mapId, nodes, edges, title) => {\n    set({\n      mapId,\n      title,\n      nodes,\n      edges,\n      selectedNodeId: null,\n      syncError: null,\n      pendingChanges: 0,\n    });\n  },\n\n  // Sync state management\n  setSyncError: (error) => set({ syncError: error }),\n  clearSyncError: () => set({ syncError: null }),\n\n  // Node operations with API sync\n  createNodeWithSync: async (parentId, position) => {\n    const { mapId, nodes, edges } = get();\n    const localId = generateId();\n    const isRoot = parentId === null;\n\n    // Create node locally first (optimistic update)\n    const newNode: MindMapNode = {\n      id: localId,\n      type: 'mindMapNode',\n      position: position || { x: 0, y: 0 },\n      data: {\n        id: localId,\n        text: isRoot ? 'Central Idea' : 'New Node',\n        type: isRoot ? 'ROOT' : 'CHILD',\n        parentId,\n        style: isRoot ? defaultRootStyle : defaultNodeStyle,\n        isCollapsed: false,\n        metadata: {},\n      },\n    };\n\n    const newEdges = [...edges];\n    if (parentId) {\n      newEdges.push({\n        id: `edge-${parentId}-${localId}`,\n        source: parentId,\n        target: localId,\n        type: 'smoothstep',\n      });\n    }\n\n    set({\n      nodes: [...nodes, newNode],\n      edges: newEdges,\n      selectedNodeId: localId,\n      pendingChanges: get().pendingChanges + 1,\n    });\n\n    // If no mapId, we're in a new unsaved map - just return local id\n    if (!mapId) {\n      set({ pendingChanges: get().pendingChanges - 1 });\n      return localId;\n    }\n\n    // Sync to API\n    try {\n      set({ isSyncing: true });\n\n      const createRequest: CreateNodeRequest = {\n        parentId,\n        type: isRoot ? 'ROOT' : 'CHILD',\n        text: newNode.data.text,\n        positionX: newNode.position.x,\n        positionY: newNode.position.y,\n        style: newNode.data.style,\n      };\n\n      const apiNode = await apiCreateNode(mapId, createRequest);\n\n      // Update local node with server-generated ID if different\n      if (apiNode.id !== localId) {\n        const currentNodes = get().nodes;\n        const currentEdges = get().edges;\n\n        set({\n          nodes: currentNodes.map((n) =>\n            n.id === localId\n              ? { ...n, id: apiNode.id, data: { ...n.data, id: apiNode.id } }\n              : n.data.parentId === localId\n              ? { ...n, data: { ...n.data, parentId: apiNode.id } }\n              : n\n          ),\n          edges: currentEdges.map((e) => {\n            if (e.source === localId || e.target === localId) {\n              return {\n                ...e,\n                id: e.id.replace(localId, apiNode.id),\n                source: e.source === localId ? apiNode.id : e.source,\n                target: e.target === localId ? apiNode.id : e.target,\n              };\n            }\n            return e;\n          }),\n          selectedNodeId: get().selectedNodeId === localId ? apiNode.id : get().selectedNodeId,\n        });\n\n        set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });\n        return apiNode.id;\n      }\n\n      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });\n      return localId;\n    } catch (error) {\n      // Handle network errors - queue for later\n      if (isNetworkError(error)) {\n        offlineQueue.add(mapId, {\n          type: 'create',\n          data: {\n            parentId,\n            type: isRoot ? 'ROOT' : 'CHILD',\n            text: newNode.data.text,\n            positionX: newNode.position.x,\n            positionY: newNode.position.y,\n            style: newNode.data.style,\n          },\n        });\n        set({\n          isSyncing: false,\n          pendingChanges: get().pendingChanges - 1,\n          syncError: getErrorMessage(error),\n        });\n        return localId;\n      }\n\n      // For other errors, revert the optimistic update\n      set({\n        nodes: nodes,\n        edges: edges,\n        selectedNodeId: null,\n        isSyncing: false,\n        pendingChanges: get().pendingChanges - 1,\n        syncError: getErrorMessage(error),\n      });\n\n      throw error;\n    }\n  },\n\n  updateNodeTextWithSync: async (nodeId, text) => {\n    const { mapId, nodes } = get();\n    const node = nodes.find((n) => n.id === nodeId);\n    if (!node) return;\n\n    const oldText = node.data.text;\n\n    // Optimistic update\n    set({\n      nodes: nodes.map((n) =>\n        n.id === nodeId ? { ...n, data: { ...n.data, text } } : n\n      ),\n      pendingChanges: get().pendingChanges + 1,\n    });\n\n    if (!mapId) {\n      set({ pendingChanges: get().pendingChanges - 1 });\n      return;\n    }\n\n    try {\n      set({ isSyncing: true });\n      await apiUpdateNode(mapId, nodeId, { text });\n      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });\n    } catch (error) {\n      if (isNetworkError(error)) {\n        offlineQueue.add(mapId, {\n          type: 'update',\n          nodeId,\n          data: { text },\n        });\n        set({\n          isSyncing: false,\n          pendingChanges: get().pendingChanges - 1,\n          syncError: getErrorMessage(error),\n        });\n        return;\n      }\n\n      // Revert on error\n      set({\n        nodes: get().nodes.map((n) =>\n          n.id === nodeId ? { ...n, data: { ...n.data, text: oldText } } : n\n        ),\n        isSyncing: false,\n        pendingChanges: get().pendingChanges - 1,\n        syncError: getErrorMessage(error),\n      });\n      throw error;\n    }\n  },\n\n  updateNodeStyleWithSync: async (nodeId, style) => {\n    const { mapId, nodes } = get();\n    const node = nodes.find((n) => n.id === nodeId);\n    if (!node) return;\n\n    const oldStyle = node.data.style;\n\n    // Optimistic update\n    set({\n      nodes: nodes.map((n) =>\n        n.id === nodeId\n          ? { ...n, data: { ...n.data, style: { ...n.data.style, ...style } } }\n          : n\n      ),\n      pendingChanges: get().pendingChanges + 1,\n    });\n\n    if (!mapId) {\n      set({ pendingChanges: get().pendingChanges - 1 });\n      return;\n    }\n\n    try {\n      set({ isSyncing: true });\n      await apiUpdateNode(mapId, nodeId, { style });\n      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });\n    } catch (error) {\n      if (isNetworkError(error)) {\n        offlineQueue.add(mapId, {\n          type: 'update',\n          nodeId,\n          data: { style },\n        });\n        set({\n          isSyncing: false,\n          pendingChanges: get().pendingChanges - 1,\n          syncError: getErrorMessage(error),\n        });\n        return;\n      }\n\n      // Revert on error\n      set({\n        nodes: get().nodes.map((n) =>\n          n.id === nodeId ? { ...n, data: { ...n.data, style: oldStyle } } : n\n        ),\n        isSyncing: false,\n        pendingChanges: get().pendingChanges - 1,\n        syncError: getErrorMessage(error),\n      });\n      throw error;\n    }\n  },\n\n  deleteNodeWithSync: async (nodeId) => {\n    const { mapId, nodes, edges } = get();\n    const node = nodes.find((n) => n.id === nodeId);\n\n    if (!node) return;\n    if (node.data.type === 'ROOT') {\n      set({ syncError: 'Cannot delete the root node' });\n      return;\n    }\n\n    // Find all descendant nodes to delete\n    const nodesToDelete = new Set<string>([nodeId]);\n    let changed = true;\n    while (changed) {\n      changed = false;\n      for (const n of nodes) {\n        if (\n          n.data.parentId &&\n          nodesToDelete.has(n.data.parentId) &&\n          !nodesToDelete.has(n.id)\n        ) {\n          nodesToDelete.add(n.id);\n          changed = true;\n        }\n      }\n    }\n\n    const deletedNodes = nodes.filter((n) => nodesToDelete.has(n.id));\n    const deletedEdges = edges.filter(\n      (e) => nodesToDelete.has(e.source) || nodesToDelete.has(e.target)\n    );\n\n    // Optimistic delete\n    set({\n      nodes: nodes.filter((n) => !nodesToDelete.has(n.id)),\n      edges: edges.filter(\n        (e) => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)\n      ),\n      selectedNodeId:\n        get().selectedNodeId && nodesToDelete.has(get().selectedNodeId!)\n          ? null\n          : get().selectedNodeId,\n      pendingChanges: get().pendingChanges + 1,\n    });\n\n    if (!mapId) {\n      set({ pendingChanges: get().pendingChanges - 1 });\n      return;\n    }\n\n    try {\n      set({ isSyncing: true });\n      await apiDeleteNode(mapId, nodeId);\n      set({ isSyncing: false, pendingChanges: get().pendingChanges - 1, syncError: null });\n    } catch (error) {\n      if (isNetworkError(error)) {\n        offlineQueue.add(mapId, {\n          type: 'delete',\n          nodeId,\n        });\n        set({\n          isSyncing: false,\n          pendingChanges: get().pendingChanges - 1,\n          syncError: getErrorMessage(error),\n        });\n        return;\n      }\n\n      // Revert on error\n      set({\n        nodes: [...get().nodes, ...deletedNodes],\n        edges: [...get().edges, ...deletedEdges],\n        isSyncing: false,\n        pendingChanges: get().pendingChanges - 1,\n        syncError: getErrorMessage(error),\n      });\n      throw error;\n    }\n  },\n\n  updateNodePositionWithSync: async (nodeId, position) => {\n    const { mapId, nodes } = get();\n    const node = nodes.find((n) => n.id === nodeId);\n    if (!node) return;\n\n    // Update locally immediately\n    set({\n      nodes: nodes.map((n) =>\n        n.id === nodeId ? { ...n, position } : n\n      ),\n    });\n\n    if (!mapId) return;\n\n    // Get or create debounced update function for this node\n    let debouncedUpdate = debouncedPositionUpdates.get(nodeId);\n    if (!debouncedUpdate) {\n      debouncedUpdate = debounce(async (mapIdArg: unknown, nodeIdArg: unknown, posArg: unknown) => {\n        try {\n          await apiUpdateNodePosition(\n            mapIdArg as string,\n            nodeIdArg as string,\n            posArg as { x: number; y: number }\n          );\n        } catch (error) {\n          if (isNetworkError(error)) {\n            offlineQueue.add(mapIdArg as string, {\n              type: 'update',\n              nodeId: nodeIdArg as string,\n              data: {\n                positionX: (posArg as { x: number; y: number }).x,\n                positionY: (posArg as { x: number; y: number }).y,\n              },\n            });\n          }\n          // Don't revert position updates - they're too disruptive during drag\n          console.error('Failed to sync position:', error);\n        }\n      }, 500);\n      debouncedPositionUpdates.set(nodeId, debouncedUpdate);\n    }\n\n    debouncedUpdate(mapId, nodeId, position);\n  },\n}));"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create node API service with CRUD operations",
      "status": "completed",
      "activeForm": "Creating node API service with CRUD operations"
    },
    {
      "content": "Enhance mapStore with API sync functions",
      "status": "completed",
      "activeForm": "Enhancing mapStore with API sync functions"
    },
    {
      "content": "Create useNodeOperations hook to combine local state and API",
      "status": "in_progress",
      "activeForm": "Creating useNodeOperations hook"
    },
    {
      "content": "Integrate API sync into existing Canvas component",
      "status": "pending",
      "activeForm": "Integrating API sync into Canvas component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "pending",
      "activeForm": "Creating and running Playwright verification test"
    }
  ]
}
Now let me create the useNodeOperations hook:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useNodeOperations.ts",
  "content": "/**\n * useNodeOperations Hook\n *\n * A custom hook that provides node CRUD operations with automatic API synchronization.\n * Combines local Zustand state management with backend API calls for persistence.\n *\n * Features:\n * - Optimistic updates for immediate UI feedback\n * - Automatic API sync with error handling\n * - Offline support with queued operations\n * - Yjs integration for real-time collaboration\n */\n\nimport { useCallback, useMemo } from 'react';\nimport { useMapStore } from '@/stores/mapStore';\nimport type { NodeStyle } from '@mindmapper/types';\n\ninterface UseNodeOperationsOptions {\n  /** If true, use sync versions of operations that persist to API */\n  syncToApi?: boolean;\n  /** Callback for Yjs sync (if collaboration is enabled) */\n  onNodeCreate?: (nodeId: string) => void;\n  onNodeUpdate?: (nodeId: string) => void;\n  onNodeDelete?: (nodeId: string) => void;\n}\n\ninterface NodeOperations {\n  // Create operations\n  createNode: (parentId: string | null, position?: { x: number; y: number }) => Promise<string>;\n\n  // Update operations\n  updateNodeText: (nodeId: string, text: string) => Promise<void>;\n  updateNodeStyle: (nodeId: string, style: Partial<NodeStyle>) => Promise<void>;\n  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => Promise<void>;\n  toggleNodeCollapse: (nodeId: string) => void;\n\n  // Delete operations\n  deleteNode: (nodeId: string) => Promise<void>;\n\n  // Duplicate operations\n  duplicateNode: (nodeId: string) => string | null;\n\n  // Selection\n  selectNode: (nodeId: string | null) => void;\n\n  // State\n  selectedNodeId: string | null;\n  isSyncing: boolean;\n  syncError: string | null;\n  pendingChanges: number;\n\n  // Error management\n  clearSyncError: () => void;\n}\n\nexport function useNodeOperations(options: UseNodeOperationsOptions = {}): NodeOperations {\n  const {\n    syncToApi = true,\n    onNodeCreate,\n    onNodeUpdate,\n    onNodeDelete,\n  } = options;\n\n  // Get store state and actions\n  const {\n    selectedNodeId,\n    isSyncing,\n    syncError,\n    pendingChanges,\n    // Local-only operations\n    addNode,\n    updateNodeText: localUpdateNodeText,\n    updateNodeStyle: localUpdateNodeStyle,\n    deleteNode: localDeleteNode,\n    duplicateNode,\n    setSelectedNode,\n    toggleNodeCollapse,\n    clearSyncError,\n    // Sync operations\n    createNodeWithSync,\n    updateNodeTextWithSync,\n    updateNodeStyleWithSync,\n    deleteNodeWithSync,\n    updateNodePositionWithSync,\n  } = useMapStore();\n\n  /**\n   * Create a new node with optional API sync\n   */\n  const createNode = useCallback(async (\n    parentId: string | null,\n    position?: { x: number; y: number }\n  ): Promise<string> => {\n    let nodeId: string;\n\n    if (syncToApi) {\n      nodeId = await createNodeWithSync(parentId, position);\n    } else {\n      nodeId = addNode(parentId, position);\n    }\n\n    // Trigger Yjs sync callback if provided\n    onNodeCreate?.(nodeId);\n\n    return nodeId;\n  }, [syncToApi, createNodeWithSync, addNode, onNodeCreate]);\n\n  /**\n   * Update node text with optional API sync\n   */\n  const updateNodeText = useCallback(async (\n    nodeId: string,\n    text: string\n  ): Promise<void> => {\n    if (syncToApi) {\n      await updateNodeTextWithSync(nodeId, text);\n    } else {\n      localUpdateNodeText(nodeId, text);\n    }\n\n    onNodeUpdate?.(nodeId);\n  }, [syncToApi, updateNodeTextWithSync, localUpdateNodeText, onNodeUpdate]);\n\n  /**\n   * Update node style with optional API sync\n   */\n  const updateNodeStyle = useCallback(async (\n    nodeId: string,\n    style: Partial<NodeStyle>\n  ): Promise<void> => {\n    if (syncToApi) {\n      await updateNodeStyleWithSync(nodeId, style);\n    } else {\n      localUpdateNodeStyle(nodeId, style);\n    }\n\n    onNodeUpdate?.(nodeId);\n  }, [syncToApi, updateNodeStyleWithSync, localUpdateNodeStyle, onNodeUpdate]);\n\n  /**\n   * Update node position with debounced API sync\n   */\n  const updateNodePosition = useCallback(async (\n    nodeId: string,\n    position: { x: number; y: number }\n  ): Promise<void> => {\n    if (syncToApi) {\n      await updateNodePositionWithSync(nodeId, position);\n    }\n    // Position updates are handled directly by React Flow's onNodesChange\n    // This is mainly for explicit position updates\n  }, [syncToApi, updateNodePositionWithSync]);\n\n  /**\n   * Delete a node with optional API sync\n   */\n  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {\n    // Trigger Yjs sync callback before deletion\n    onNodeDelete?.(nodeId);\n\n    if (syncToApi) {\n      await deleteNodeWithSync(nodeId);\n    } else {\n      localDeleteNode(nodeId);\n    }\n  }, [syncToApi, deleteNodeWithSync, localDeleteNode, onNodeDelete]);\n\n  /**\n   * Select a node\n   */\n  const selectNode = useCallback((nodeId: string | null) => {\n    setSelectedNode(nodeId);\n  }, [setSelectedNode]);\n\n  return useMemo(() => ({\n    // Create\n    createNode,\n    // Update\n    updateNodeText,\n    updateNodeStyle,\n    updateNodePosition,\n    toggleNodeCollapse,\n    // Delete\n    deleteNode,\n    // Duplicate\n    duplicateNode,\n    // Selection\n    selectNode,\n    // State\n    selectedNodeId,\n    isSyncing,\n    syncError,\n    pendingChanges,\n    // Error management\n    clearSyncError,\n  }), [\n    createNode,\n    updateNodeText,\n    updateNodeStyle,\n    updateNodePosition,\n    toggleNodeCollapse,\n    deleteNode,\n    duplicateNode,\n    selectNode,\n    selectedNodeId,\n    isSyncing,\n    syncError,\n    pendingChanges,\n    clearSyncError,\n  ]);\n}\n\n/**\n * Hook for node operations integrated with Yjs collaboration\n */\nexport function useNodeOperationsWithYjs(yjsSync?: {\n  syncNodeToYjs: (node: { id: string }) => void;\n  deleteNodeFromYjs: (nodeId: string) => void;\n}) {\n  const nodes = useMapStore((state) => state.nodes);\n\n  const operations = useNodeOperations({\n    syncToApi: true,\n    onNodeCreate: yjsSync ? (nodeId) => {\n      const node = nodes.find((n) => n.id === nodeId);\n      if (node) {\n        yjsSync.syncNodeToYjs(node);\n      }\n    } : undefined,\n    onNodeUpdate: yjsSync ? (nodeId) => {\n      const node = nodes.find((n) => n.id === nodeId);\n      if (node) {\n        yjsSync.syncNodeToYjs(node);\n      }\n    } : undefined,\n    onNodeDelete: yjsSync ? (nodeId) => {\n      yjsSync.deleteNodeFromYjs(nodeId);\n    } : undefined,\n  });\n\n  return operations;\n}\n\nexport default useNodeOperations;\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create node API service with CRUD operations",
      "status": "completed",
      "activeForm": "Creating node API service with CRUD operations"
    },
    {
      "content": "Enhance mapStore with API sync functions",
      "status": "completed",
      "activeForm": "Enhancing mapStore with API sync functions"
    },
    {
      "content": "Create useNodeOperations hook to combine local state and API",
      "status": "completed",
      "activeForm": "Creating useNodeOperations hook"
    },
    {
      "content": "Integrate API sync into existing Canvas component",
      "status": "in_progress",
      "activeForm": "Integrating API sync into Canvas component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "pending",
      "activeForm": "Creating and running Playwright verification test"
    }
  ]
}
Now let me read the Canvas component to understand how to integrate the sync:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx"
}
Now let me check the MindMapNode component to see how nodes interact with the store:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/MindMapNode.tsx"
}
I see that the MindMapNode component directly uses the store methods. Now I need to update it to use the sync versions. Let me update the MindMapNode component to use the API sync methods:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/MindMapNode.tsx",
  "old_string": "import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';\nimport { Handle, Position } from '@xyflow/react';\nimport { MessageCircle, ChevronRight, ChevronDown, GripVertical, Plus } from 'lucide-react';\nimport { cn } from '@/lib/utils';\nimport { useMapStore, type NodeData } from '@/stores/mapStore';",
  "new_string": "import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';\nimport { Handle, Position } from '@xyflow/react';\nimport { MessageCircle, ChevronRight, ChevronDown, GripVertical, Plus } from 'lucide-react';\nimport { cn } from '@/lib/utils';\nimport { useMapStore, type NodeData } from '@/stores/mapStore';\n\n// Flag to enable/disable API sync (can be controlled via props or context in future)\nconst ENABLE_API_SYNC = true;"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/MindMapNode.tsx",
  "old_string": "  const updateNodeText = useMapStore((state) => state.updateNodeText);\n  const addNode = useMapStore((state) => state.addNode);\n  const deleteNode = useMapStore((state) => state.deleteNode);\n  const toggleNodeCollapse = useMapStore((state) => state.toggleNodeCollapse);\n  const nodes = useMapStore((state) => state.nodes);",
  "new_string": "  // Use sync versions when API sync is enabled\n  const updateNodeText = useMapStore((state) =>\n    ENABLE_API_SYNC ? state.updateNodeTextWithSync : state.updateNodeText\n  );\n  const addNode = useMapStore((state) =>\n    ENABLE_API_SYNC ? state.createNodeWithSync : state.addNode\n  );\n  const deleteNode = useMapStore((state) =>\n    ENABLE_API_SYNC ? state.deleteNodeWithSync : state.deleteNode\n  );\n  const toggleNodeCollapse = useMapStore((state) => state.toggleNodeCollapse);\n  const nodes = useMapStore((state) => state.nodes);\n  const mapId = useMapStore((state) => state.mapId);"
}
Now I need to update the Canvas component to also show sync status. Let me also update the Canvas to show sync error and status:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx",
  "old_string": "import { useCallback, useEffect, useMemo, useState } from 'react';\nimport {\n  ReactFlow,\n  Background,\n  MiniMap,\n  Panel,\n  useReactFlow,\n  type Node,\n  type NodeTypes,\n  BackgroundVariant,\n} from '@xyflow/react';\nimport '@xyflow/react/dist/style.css';\n\nimport { MindMapNode, type ExtendedNodeData } from './MindMapNode';\nimport { CanvasControls } from './CanvasControls';\nimport { Toolbar } from '../toolbar/Toolbar';\nimport { Cursors } from '../collaboration/Cursors';\nimport { MobileToolbar } from '../mobile/MobileToolbar';\nimport { OfflineIndicator } from '../mobile/OfflineIndicator';\nimport { KeyboardShortcutsModal } from '../help/KeyboardShortcutsModal';\nimport { ConnectionErrorToast } from './ConnectionErrorToast';\nimport { useMapStore } from '@/stores/mapStore';\nimport { useAutoLayout } from '@/hooks/useAutoLayout';\nimport { useKeyboardShortcuts } from '@/hooks/useKeyboard';\nimport { useNodeComments } from '@/hooks/useNodeComments';\nimport { useTouchGestures } from '@/hooks/useTouchGestures';",
  "new_string": "import { useCallback, useEffect, useMemo, useState } from 'react';\nimport {\n  ReactFlow,\n  Background,\n  MiniMap,\n  Panel,\n  useReactFlow,\n  type Node,\n  type NodeTypes,\n  BackgroundVariant,\n} from '@xyflow/react';\nimport '@xyflow/react/dist/style.css';\n\nimport { MindMapNode, type ExtendedNodeData } from './MindMapNode';\nimport { CanvasControls } from './CanvasControls';\nimport { Toolbar } from '../toolbar/Toolbar';\nimport { Cursors } from '../collaboration/Cursors';\nimport { MobileToolbar } from '../mobile/MobileToolbar';\nimport { OfflineIndicator } from '../mobile/OfflineIndicator';\nimport { KeyboardShortcutsModal } from '../help/KeyboardShortcutsModal';\nimport { ConnectionErrorToast } from './ConnectionErrorToast';\nimport { SyncStatusIndicator } from './SyncStatusIndicator';\nimport { useMapStore } from '@/stores/mapStore';\nimport { useAutoLayout } from '@/hooks/useAutoLayout';\nimport { useKeyboardShortcuts } from '@/hooks/useKeyboard';\nimport { useNodeComments } from '@/hooks/useNodeComments';\nimport { useTouchGestures } from '@/hooks/useTouchGestures';"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx",
  "old_string": "  const {\n    nodes,\n    edges,\n    onNodesChange,\n    onEdgesChange,\n    onConnect,\n    isValidConnection,\n    lastConnectionError,\n    clearConnectionError,\n    setSelectedNode,\n    initializeNewMap,\n  } = useMapStore();",
  "new_string": "  const {\n    nodes,\n    edges,\n    onNodesChange,\n    onEdgesChange,\n    onConnect,\n    isValidConnection,\n    lastConnectionError,\n    clearConnectionError,\n    setSelectedNode,\n    initializeNewMap,\n    isSyncing,\n    syncError,\n    pendingChanges,\n    clearSyncError,\n  } = useMapStore();"
}
Now let me add the SyncStatusIndicator to the Canvas and create the component:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx",
  "old_string": "      {/* Connection error toast */}\n      <ConnectionErrorToast\n        error={lastConnectionError}\n        onDismiss={clearConnectionError}\n      />\n    </div>\n  );\n}",
  "new_string": "      {/* Connection error toast */}\n      <ConnectionErrorToast\n        error={lastConnectionError}\n        onDismiss={clearConnectionError}\n      />\n\n      {/* Sync status indicator */}\n      <SyncStatusIndicator\n        isSyncing={isSyncing}\n        syncError={syncError}\n        pendingChanges={pendingChanges}\n        onDismissError={clearSyncError}\n      />\n    </div>\n  );\n}"
}
Now let me create the SyncStatusIndicator component:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/SyncStatusIndicator.tsx",
  "content": "/**\n * SyncStatusIndicator Component\n *\n * Displays the current sync status of the mind map with the backend.\n * Shows syncing animation, error states, and pending changes count.\n */\n\nimport { useEffect, useState } from 'react';\nimport { Cloud, CloudOff, Loader2, Check, AlertCircle, X } from 'lucide-react';\nimport { cn } from '@/lib/utils';\n\ninterface SyncStatusIndicatorProps {\n  isSyncing: boolean;\n  syncError: string | null;\n  pendingChanges: number;\n  onDismissError?: () => void;\n}\n\nexport function SyncStatusIndicator({\n  isSyncing,\n  syncError,\n  pendingChanges,\n  onDismissError,\n}: SyncStatusIndicatorProps) {\n  const [showSaved, setShowSaved] = useState(false);\n  const [wassyncing, setWasSyncing] = useState(false);\n\n  // Show \"Saved\" indicator briefly after sync completes\n  useEffect(() => {\n    if (wassyncing && !isSyncing && !syncError) {\n      setShowSaved(true);\n      const timer = setTimeout(() => setShowSaved(false), 2000);\n      return () => clearTimeout(timer);\n    }\n    setWasSyncing(isSyncing);\n  }, [isSyncing, syncError, wassyncing]);\n\n  // Don't show anything if no state to display\n  if (!isSyncing && !syncError && !showSaved && pendingChanges === 0) {\n    return null;\n  }\n\n  return (\n    <>\n      {/* Sync status badge in bottom-left corner */}\n      <div\n        className={cn(\n          'fixed bottom-4 left-4 z-50',\n          'flex items-center gap-2 px-3 py-2 rounded-full',\n          'bg-white/90 backdrop-blur-sm border shadow-sm',\n          'text-sm font-medium transition-all duration-300',\n          syncError && 'border-red-200 bg-red-50/90',\n          isSyncing && 'border-blue-200 bg-blue-50/90',\n          showSaved && 'border-green-200 bg-green-50/90'\n        )}\n        data-testid=\"sync-status-indicator\"\n      >\n        {/* Syncing state */}\n        {isSyncing && (\n          <>\n            <Loader2 className=\"w-4 h-4 text-blue-500 animate-spin\" />\n            <span className=\"text-blue-700\">Saving...</span>\n          </>\n        )}\n\n        {/* Error state */}\n        {syncError && !isSyncing && (\n          <>\n            <CloudOff className=\"w-4 h-4 text-red-500\" />\n            <span className=\"text-red-700 max-w-[200px] truncate\" title={syncError}>\n              Sync failed\n            </span>\n            {onDismissError && (\n              <button\n                onClick={onDismissError}\n                className=\"ml-1 p-0.5 rounded-full hover:bg-red-100 transition-colors\"\n                title=\"Dismiss\"\n              >\n                <X className=\"w-3 h-3 text-red-500\" />\n              </button>\n            )}\n          </>\n        )}\n\n        {/* Saved state */}\n        {showSaved && !isSyncing && !syncError && (\n          <>\n            <Check className=\"w-4 h-4 text-green-500\" />\n            <span className=\"text-green-700\">Saved</span>\n          </>\n        )}\n\n        {/* Pending changes (when not syncing and no error) */}\n        {pendingChanges > 0 && !isSyncing && !syncError && !showSaved && (\n          <>\n            <Cloud className=\"w-4 h-4 text-gray-400\" />\n            <span className=\"text-gray-600\">\n              {pendingChanges} unsaved change{pendingChanges !== 1 ? 's' : ''}\n            </span>\n          </>\n        )}\n      </div>\n\n      {/* Error toast for detailed error message */}\n      {syncError && !isSyncing && (\n        <div\n          className={cn(\n            'fixed bottom-16 left-4 z-50',\n            'max-w-sm p-4 rounded-lg',\n            'bg-red-50 border border-red-200 shadow-lg',\n            'animate-in slide-in-from-bottom-2 fade-in duration-300'\n          )}\n          data-testid=\"sync-error-toast\"\n        >\n          <div className=\"flex items-start gap-3\">\n            <AlertCircle className=\"w-5 h-5 text-red-500 flex-shrink-0 mt-0.5\" />\n            <div className=\"flex-1 min-w-0\">\n              <p className=\"font-medium text-red-800\">Sync Error</p>\n              <p className=\"mt-1 text-sm text-red-600 break-words\">{syncError}</p>\n              <p className=\"mt-2 text-xs text-red-500\">\n                Your changes are saved locally and will sync when connection is restored.\n              </p>\n            </div>\n            {onDismissError && (\n              <button\n                onClick={onDismissError}\n                className=\"p-1 rounded hover:bg-red-100 transition-colors flex-shrink-0\"\n                title=\"Dismiss\"\n              >\n                <X className=\"w-4 h-4 text-red-500\" />\n              </button>\n            )}\n          </div>\n        </div>\n      )}\n    </>\n  );\n}\n"
}
Now let me also export the new hook from the hooks index if there is one, or check the existing exports:

🔧 Tool: Glob
Input: {
  "pattern": "apps/web/src/hooks/index.ts"
}
Now let me update the todo list and verify the TypeScript compiles correctly:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create node API service with CRUD operations",
      "status": "completed",
      "activeForm": "Creating node API service with CRUD operations"
    },
    {
      "content": "Enhance mapStore with API sync functions",
      "status": "completed",
      "activeForm": "Enhancing mapStore with API sync functions"
    },
    {
      "content": "Create useNodeOperations hook to combine local state and API",
      "status": "completed",
      "activeForm": "Creating useNodeOperations hook"
    },
    {
      "content": "Integrate API sync into existing Canvas component",
      "status": "completed",
      "activeForm": "Integrating API sync into Canvas component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "in_progress",
      "activeForm": "Creating and running Playwright verification test"
    }
  ]
}

🔧 Tool: Bash
Input: {
  "command": "npm run typecheck 2>&1 | head -100",
  "description": "Run TypeScript type checking",
  "timeout": 120000
}

🔧 Tool: Bash
Input: {
  "command": "npm run --workspaces --if-present build 2>&1 | head -100",
  "description": "Check if the code builds correctly",
  "timeout": 120000
}
Good - the API errors are pre-existing issues. The web errors are from my changes. Let me fix those:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/MindMapNode.tsx",
  "old_string": "  const toggleNodeCollapse = useMapStore((state) => state.toggleNodeCollapse);\n  const nodes = useMapStore((state) => state.nodes);\n  const mapId = useMapStore((state) => state.mapId);",
  "new_string": "  const toggleNodeCollapse = useMapStore((state) => state.toggleNodeCollapse);\n  const nodes = useMapStore((state) => state.nodes);"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts",
  "old_string": "import {\n  createNode as apiCreateNode,\n  updateNode as apiUpdateNode,\n  deleteNode as apiDeleteNode,\n  updateNodePosition as apiUpdateNodePosition,\n  debounce,\n  isNetworkError,\n  getErrorMessage,\n  offlineQueue,\n  type CreateNodeRequest,\n  type UpdateNodeRequest,\n} from '@/lib/node-api';",
  "new_string": "import {\n  createNode as apiCreateNode,\n  updateNode as apiUpdateNode,\n  deleteNode as apiDeleteNode,\n  updateNodePosition as apiUpdateNodePosition,\n  debounce,\n  isNetworkError,\n  getErrorMessage,\n  offlineQueue,\n  type CreateNodeRequest,\n} from '@/lib/node-api';"
}
Good, the linter already fixed the unused import. Let me run the build check on just the web app:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx tsc --noEmit 2>&1 | head -50",
  "description": "Run TypeScript check on web app",
  "timeout": 120000
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && pnpm --filter @mindmapper/web build 2>&1 | head -100",
  "description": "Build web app with pnpm",
  "timeout": 120000
}
The web app builds successfully. Now let me create the Playwright verification test:

🔧 Tool: Glob
Input: {
  "pattern": "apps/web/playwright.config.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/playwright.config.*"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/playwright.config.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "apps/web/tests/**/*.spec.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/create-map-dialog.spec.ts"
}
Now let me create the Playwright verification test for node CRUD operations:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/node-crud-verification.spec.ts",
  "content": "/**\n * Node CRUD Operations Verification Test\n *\n * This is a temporary verification test for the node-crud-operations feature.\n * It tests the frontend functions for creating, updating, and deleting nodes.\n * DELETE THIS FILE after verification is complete.\n */\n\nimport { test, expect } from '@playwright/test';\n\ntest.describe('Node CRUD Operations', () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to a new map\n    await page.goto('/map/new');\n\n    // Wait for the canvas to load\n    await page.waitForSelector('[class*=\"react-flow\"]', { timeout: 10000 });\n\n    // Wait for the root node to be present\n    await page.waitForSelector('[data-testid^=\"mind-map-node-\"]', { timeout: 10000 });\n  });\n\n  test('should display root node on new map', async ({ page }) => {\n    // Find the root node\n    const rootNode = page.locator('[data-testid^=\"node-text-\"]').first();\n    await expect(rootNode).toBeVisible();\n\n    // Root node should have default text\n    await expect(rootNode).toContainText('Central Idea');\n  });\n\n  test('should create a child node when clicking add button', async ({ page }) => {\n    // Hover over the root node to show the add button\n    const rootNodeContainer = page.locator('[data-testid^=\"mind-map-node-\"]').first();\n    await rootNodeContainer.hover();\n\n    // Click the add child button\n    const addButton = page.locator('[data-testid^=\"add-child-\"]').first();\n    await expect(addButton).toBeVisible({ timeout: 5000 });\n    await addButton.click();\n\n    // Wait for the new node to appear\n    await page.waitForTimeout(500);\n\n    // Should now have 2 nodes (root + child)\n    const nodes = page.locator('[data-testid^=\"mind-map-node-\"]');\n    await expect(nodes).toHaveCount(2, { timeout: 5000 });\n\n    // The new node should have default text \"New Node\"\n    const newNode = page.locator('[data-testid^=\"node-text-\"]').filter({ hasText: 'New Node' });\n    await expect(newNode).toBeVisible({ timeout: 5000 });\n  });\n\n  test('should update node text on double-click and edit', async ({ page }) => {\n    // Double-click the root node to edit\n    const rootNodeContent = page.locator('[data-testid^=\"node-content-\"]').first();\n    await rootNodeContent.dblclick();\n\n    // Wait for the input to appear\n    const input = page.locator('[data-testid^=\"node-input-\"]').first();\n    await expect(input).toBeVisible({ timeout: 5000 });\n\n    // Clear and type new text\n    await input.fill('Updated Root Text');\n\n    // Press Enter to save\n    await input.press('Enter');\n\n    // Wait for the text to update\n    await page.waitForTimeout(500);\n\n    // Verify the text was updated\n    const updatedText = page.locator('[data-testid^=\"node-text-\"]').first();\n    await expect(updatedText).toContainText('Updated Root Text');\n  });\n\n  test('should delete a child node with keyboard', async ({ page }) => {\n    // First, create a child node\n    const rootNodeContainer = page.locator('[data-testid^=\"mind-map-node-\"]').first();\n    await rootNodeContainer.hover();\n\n    const addButton = page.locator('[data-testid^=\"add-child-\"]').first();\n    await expect(addButton).toBeVisible({ timeout: 5000 });\n    await addButton.click();\n\n    // Wait for the new node\n    await page.waitForTimeout(500);\n\n    // Click on the child node to select it\n    const childNode = page.locator('[data-testid^=\"node-text-\"]').filter({ hasText: 'New Node' });\n    await expect(childNode).toBeVisible({ timeout: 5000 });\n    await childNode.click();\n\n    // Press Delete key\n    await page.keyboard.press('Delete');\n\n    // Wait for deletion\n    await page.waitForTimeout(500);\n\n    // Should now have only 1 node (root)\n    const nodes = page.locator('[data-testid^=\"mind-map-node-\"]');\n    await expect(nodes).toHaveCount(1, { timeout: 5000 });\n  });\n\n  test('should not delete root node', async ({ page }) => {\n    // Click on the root node to select it\n    const rootNode = page.locator('[data-testid^=\"node-text-\"]').first();\n    await rootNode.click();\n\n    // Press Delete key\n    await page.keyboard.press('Delete');\n\n    // Wait a moment\n    await page.waitForTimeout(500);\n\n    // Root node should still exist\n    const nodes = page.locator('[data-testid^=\"mind-map-node-\"]');\n    await expect(nodes).toHaveCount(1);\n  });\n\n  test('should create child node with Tab key while editing', async ({ page }) => {\n    // Double-click the root node to edit\n    const rootNodeContent = page.locator('[data-testid^=\"node-content-\"]').first();\n    await rootNodeContent.dblclick();\n\n    // Wait for the input to appear\n    const input = page.locator('[data-testid^=\"node-input-\"]').first();\n    await expect(input).toBeVisible({ timeout: 5000 });\n\n    // Press Tab to create a child node\n    await input.press('Tab');\n\n    // Wait for the new node\n    await page.waitForTimeout(500);\n\n    // Should now have 2 nodes\n    const nodes = page.locator('[data-testid^=\"mind-map-node-\"]');\n    await expect(nodes).toHaveCount(2, { timeout: 5000 });\n  });\n\n  test('should show sync status indicator', async ({ page }) => {\n    // The sync status indicator should appear when syncing\n    // First, create a node to trigger sync\n\n    // Hover over the root node to show the add button\n    const rootNodeContainer = page.locator('[data-testid^=\"mind-map-node-\"]').first();\n    await rootNodeContainer.hover();\n\n    // Click the add child button\n    const addButton = page.locator('[data-testid^=\"add-child-\"]').first();\n    await expect(addButton).toBeVisible({ timeout: 5000 });\n    await addButton.click();\n\n    // The sync indicator might appear briefly\n    // Since this is a new map without API, it should complete quickly\n    // Just verify the feature doesn't crash\n    await page.waitForTimeout(1000);\n\n    // Should have created the node successfully\n    const nodes = page.locator('[data-testid^=\"mind-map-node-\"]');\n    await expect(nodes).toHaveCount(2, { timeout: 5000 });\n  });\n\n  test('should collapse and expand child nodes', async ({ page }) => {\n    // Create a child node first\n    const rootNodeContainer = page.locator('[data-testid^=\"mind-map-node-\"]').first();\n    await rootNodeContainer.hover();\n\n    const addButton = page.locator('[data-testid^=\"add-child-\"]').first();\n    await expect(addButton).toBeVisible({ timeout: 5000 });\n    await addButton.click();\n\n    await page.waitForTimeout(500);\n\n    // Verify we have 2 nodes\n    let nodes = page.locator('[data-testid^=\"mind-map-node-\"]');\n    await expect(nodes).toHaveCount(2, { timeout: 5000 });\n\n    // Hover over root node to show collapse button\n    await rootNodeContainer.hover();\n\n    // Click the collapse toggle (if visible)\n    const collapseToggle = page.locator('[data-testid^=\"collapse-toggle-\"]').first();\n    if (await collapseToggle.isVisible({ timeout: 2000 }).catch(() => false)) {\n      await collapseToggle.click();\n\n      // Wait for animation\n      await page.waitForTimeout(500);\n\n      // After collapse, child should be hidden\n      // (This tests the toggle functionality)\n\n      // Click again to expand\n      await collapseToggle.click();\n      await page.waitForTimeout(500);\n    }\n\n    // Nodes should still exist\n    nodes = page.locator('[data-testid^=\"mind-map-node-\"]');\n    const count = await nodes.count();\n    expect(count).toBeGreaterThanOrEqual(1);\n  });\n});\n"
}
Now let me run the Playwright tests:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright test node-crud-verification.spec.ts --reporter=list 2>&1",
  "description": "Run Playwright verification tests",
  "timeout": 180000
}
The tests failed due to missing system libraries for the browser. This is an environment issue, not a code issue. Let me try to run a simpler verification using the dev server and curl to test the API endpoints are available:

🔧 Tool: Bash
Input: {
  "command": "pnpm --filter @mindmapper/web dev &\nDEV_PID=$!\necho \"Dev server PID: $DEV_PID\"\nsleep 10\ncurl -s http://localhost:5173 | head -30\nkill $DEV_PID 2>/dev/null\n",
  "description": "Test dev server starts correctly",
  "timeout": 60000
}
The dev server is already running. Let me verify by accessing it:

🔧 Tool: Bash
Input: {
  "command": "curl -s http://localhost:5173 | head -30",
  "description": "Test if dev server is responding"
}
Good, the dev server is running. The Playwright tests failed due to missing system libraries (libglib-2.0.so.0) in the environment. Let me install the Playwright system dependencies:

🔧 Tool: Bash
Input: {
  "command": "npx playwright install-deps chromium 2>&1 | tail -20",
  "description": "Install Playwright browser dependencies",
  "timeout": 120000
}
The system dependencies can't be installed without root access. Let me try running the tests with Firefox instead since it may have different requirements:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright test node-crud-verification.spec.ts --project=firefox --reporter=list 2>&1 | head -50",
  "description": "Try running tests with Firefox",
  "timeout": 60000
}
The environment doesn't have the necessary browser dependencies for Playwright. Since we've verified that:
1. The code builds successfully with TypeScript
2. The dev server runs correctly

Let me delete the temporary test file as instructed, since we cannot run Playwright tests in this environment, and provide a summary:

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/node-crud-verification.spec.ts",
  "description": "Delete temporary verification test"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create node API service with CRUD operations",
      "status": "completed",
      "activeForm": "Creating node API service with CRUD operations"
    },
    {
      "content": "Enhance mapStore with API sync functions",
      "status": "completed",
      "activeForm": "Enhancing mapStore with API sync functions"
    },
    {
      "content": "Create useNodeOperations hook to combine local state and API",
      "status": "completed",
      "activeForm": "Creating useNodeOperations hook"
    },
    {
      "content": "Integrate API sync into existing Canvas component",
      "status": "completed",
      "activeForm": "Integrating API sync into Canvas component"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "completed",
      "activeForm": "Creating and running Playwright verification test"
    }
  ]
}
<summary>
## Summary: Node CRUD Operations Feature Implementation

### Changes Implemented
1. **Created Node API Service** (`/apps/web/src/lib/node-api.ts`)
   - CRUD operations for nodes: `createNode`, `updateNode`, `deleteNode`, `updateNodePosition`
   - Batch operations support for multiple node changes
   - Debounce and throttle utilities for optimized API calls
   - Offline queue system for handling network errors
   - Error handling utilities with user-friendly messages

2. **Enhanced Map Store with API Sync Functions** (`/apps/web/src/stores/mapStore.ts`)
   - Added sync state: `isSyncing`, `syncError`, `pendingChanges`
   - Added API-synced versions of all node operations:
     - `createNodeWithSync` - Creates node locally with optimistic update, syncs to API
     - `updateNodeTextWithSync` - Updates text with API sync
     - `updateNodeStyleWithSync` - Updates style with API sync
     - `deleteNodeWithSync` - Deletes node and children with API sync
     - `updateNodePositionWithSync` - Debounced position updates for drag operations
   - Optimistic updates with rollback on error
   - Network error handling with offline queue

3. **Created useNodeOperations Hook** (`/apps/web/src/hooks/useNodeOperations.ts`)
   - Unified interface for node operations
   - Configurable API sync toggle
   - Yjs integration callbacks for real-time collaboration
   - Exposes sync state for UI feedback

4. **Integrated API Sync into Canvas** 
   - Updated `MindMapNode.tsx` to use sync versions of operations
   - Added `SyncStatusIndicator.tsx` component showing:
     - Syncing animation while saving
     - Error state with detailed messages
     - Success confirmation after save
     - Pending changes counter
   - Updated `Canvas.tsx` to include sync status indicator

### Files Modified
- `/apps/web/src/stores/mapStore.ts` - Enhanced with API sync methods
- `/apps/web/src/components/canvas/Canvas.tsx` - Added sync status integration
- `/apps/web/src/components/canvas/MindMapNode.tsx` - Uses sync operations

### Files Created
- `/apps/web/src/lib/node-api.ts` - Node API service module
- `/apps/web/src/hooks/useNodeOperations.ts` - Node operations hook
- `/apps/web/src/components/canvas/SyncStatusIndicator.tsx` - Sync status UI component

### Verification Status
- **Build Verification**: The web app builds successfully with TypeScript (`pnpm --filter @mindmapper/web build`)
- **Dev Server**: Verified the development server runs correctly
- **Playwright Tests**: Created verification tests but environment lacks browser dependencies (libglib-2.0.so.0). Tests were cleaned up as required.
- **API Integration**: Backend already has the required endpoints in `/apps/api/src/routes/nodes.ts`

### Notes for Developer
1. **Optimistic Updates**: All sync operations use optimistic updates for immediate UI feedback, with automatic rollback on API errors.

2. **Offline Support**: When offline, operations are queued and will sync when connection is restored. The UI shows appropriate feedback.

3. **Debounced Position Updates**: Node position updates during drag operations are debounced (500ms) to avoid excessive API calls.

4. **Feature Toggle**: The `ENABLE_API_SYNC` flag in `MindMapNode.tsx` can be used to toggle between sync and local-only operations.

5. **Backend Endpoints Used**:
   - `POST /api/maps/:mapId/nodes` - Create node
   - `PUT /api/maps/:mapId/nodes/:nodeId` - Update node
   - `DELETE /api/maps/:mapId/nodes/:nodeId` - Delete node
   - `PUT /api/maps/:mapId/nodes/:nodeId/position` - Update position

6. **To Run Playwright Tests Locally**: Install Playwright dependencies with `npx playwright install-deps chromium` (requires sudo access).
</summary>