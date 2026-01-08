
🔧 Tool: Task
Input: {
  "description": "Explore codebase structure",
  "prompt": "Explore this codebase to understand its structure. I need to implement an \"awareness protocol\" feature for broadcasting user presence, cursor positions, and selected nodes. \n\nPlease:\n1. Find the main source directories and understand the project structure\n2. Look for any existing real-time/collaborative features or WebSocket implementations\n3. Find any existing user/presence related code\n4. Identify the patterns used for state management\n5. Look for any existing protocol or message handling code\n\nBe very thorough - check package.json, look at the src directory structure, find relevant files that would help understand how to implement this awareness protocol feature.",
  "subagent_type": "Explore"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper -type f -name \"package.json\" | head -20",
  "description": "Find all package.json files in the project"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper | grep -E \"^d|package.json\"",
  "description": "List main directories in project root"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps -type f -name \"*.ts\" -o -name \"*.tsx\" | grep -v node_modules | head -40",
  "description": "Find TypeScript files in apps directory"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/api/src/ && echo \"---\" && ls -la /projects/mindmapper/apps/web/src/",
  "description": "List main source directories for API and web"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/yjs/server.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/yjs/persistence.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts"
}

🔧 Tool: Bash
Input: {
  "command": "grep -r \"presence\\|awareness\\|cursor\" /projects/mindmapper/apps --include=\"*.ts\" --include=\"*.tsx\" | head -20",
  "description": "Search for presence/awareness/cursor related code"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/lib/",
  "description": "List web lib directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/yjs-provider.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/hooks/",
  "description": "List hooks directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/usePresence.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useYjsSync.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/yjs-websocket-provider.ts",
  "limit": 150
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/stores/",
  "description": "List store files"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/mapStore.ts",
  "limit": 100
}

🔧 Tool: Bash
Input: {
  "command": "grep -r \"useMapStore\\|Zustand\\|getState\" /projects/mindmapper/apps/web/src --include=\"*.ts\" --include=\"*.tsx\" | head -20",
  "description": "Find store usage patterns"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/packages/types/ && find /projects/mindmapper/packages/types -name \"*.ts\" | head -20",
  "description": "List types package"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types/package.json"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/packages/types -name \"*.ts\" -type f",
  "description": "Find all TypeScript files in types package"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/api-client.ts",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/yjs-websocket-provider.ts",
  "offset": 150,
  "limit": 150
}

🔧 Tool: Bash
Input: {
  "command": "grep -r \"protocol\\|message\\|broadcast\" /projects/mindmapper/apps/api/src --include=\"*.ts\" | grep -v node_modules | head -30",
  "description": "Search for protocol and message handling patterns"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/packages/db/prisma -name \"schema.prisma\" -type f",
  "description": "Find Prisma schema"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/db/prisma/schema.prisma"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/canvas/",
  "description": "List canvas component files"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx",
  "limit": 80
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src/components -name \"*Cursor*\" -o -name \"*Collab*\" -o -name \"*Presence*\" 2>/dev/null",
  "description": "Find collaboration-related components"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/",
  "description": "List all component directories"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/collaboration/Cursors.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/collaboration/PresenceList.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx",
  "limit": 100
}

🔧 Tool: Bash
Input: {
  "command": "git log --oneline -20 feature/family-tree",
  "description": "View recent commits on feature branch"
}
Excellent! The exploration revealed that this is a **monorepo mindmapper project** with an existing foundation for awareness protocol. Let me now read the key files to understand exactly what's implemented and what needs to be added or improved.

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/usePresence.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/yjs/server.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/packages/types/src/index.ts"
}
Now let me read more files to understand the current implementation better:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useYjsSync.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/collaboration/Cursors.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/collaboration/PresenceList.tsx"
}
Now I have a comprehensive understanding of the codebase. The awareness protocol is partially implemented but could be enhanced. Let me check the lib/yjs-provider.ts to understand the full picture and see what's missing:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/yjs-provider.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx"
}
Now I have a complete picture. The awareness protocol has a basic implementation but lacks several important features. Let me create a comprehensive implementation plan and enhance the feature. Based on my analysis, here's what needs to be improved:

1. **Create a formal AwarenessState type/interface in the types package** - to standardize the awareness protocol
2. **Add viewport tracking** - to know which part of the canvas users are viewing
3. **Add activity status** (idle, active, away) - based on last activity timestamp
4. **Improve awareness state change handling** - using event subscriptions instead of polling
5. **Add expiration handling** - auto-remove stale users

Let me implement these enhancements:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "in_progress",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "pending",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "pending",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "pending",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "pending",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "pending",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "pending",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/packages/types/src/index.ts",
  "old_string": "// Collaboration Types\nexport interface UserPresence {\n  id: string;\n  name: string;\n  email: string;\n  avatarUrl?: string;\n  color: string;\n  cursor?: NodePosition | null;\n  selectedNodeId?: string | null;\n  lastActive: Date;\n}\n\nexport interface CollaborationState {\n  mapId: string;\n  users: UserPresence[];\n}",
  "new_string": "// Collaboration Types\nexport interface UserPresence {\n  id: string;\n  name: string;\n  email: string;\n  avatarUrl?: string;\n  color: string;\n  cursor?: NodePosition | null;\n  selectedNodeId?: string | null;\n  lastActive: Date;\n}\n\nexport interface CollaborationState {\n  mapId: string;\n  users: UserPresence[];\n}\n\n// ==========================================\n// Awareness Protocol Types\n// ==========================================\n\n/**\n * Activity status for user presence\n * - active: User is actively interacting (mouse/keyboard within last 10 seconds)\n * - idle: User hasn't interacted for 10-60 seconds\n * - away: User hasn't interacted for over 60 seconds\n */\nexport type ActivityStatus = 'active' | 'idle' | 'away';\n\n/**\n * Viewport information for tracking what area of canvas a user is viewing\n */\nexport interface Viewport {\n  x: number;          // Pan X position\n  y: number;          // Pan Y position\n  zoom: number;       // Zoom level (1 = 100%)\n  width: number;      // Viewport width in pixels\n  height: number;     // Viewport height in pixels\n}\n\n/**\n * Cursor position with additional metadata\n */\nexport interface CursorPosition {\n  x: number;          // Screen X coordinate\n  y: number;          // Screen Y coordinate\n  canvasX?: number;   // Canvas X coordinate (accounting for pan/zoom)\n  canvasY?: number;   // Canvas Y coordinate (accounting for pan/zoom)\n}\n\n/**\n * Core awareness state that is broadcast to all users in a room\n * This is the structure that gets serialized and sent via the awareness protocol\n */\nexport interface AwarenessState {\n  // User identification\n  userId: string;\n  userName: string;\n  userColor: string;\n  avatarUrl?: string;\n\n  // Cursor tracking\n  cursor: CursorPosition | null;\n\n  // Selection tracking\n  selectedNodeIds: string[];      // Support for multi-selection\n\n  // Viewport tracking (what area of canvas user is viewing)\n  viewport: Viewport | null;\n\n  // Activity tracking\n  activityStatus: ActivityStatus;\n  lastActiveAt: number;           // Unix timestamp of last activity\n\n  // Editing state\n  isEditingNodeId: string | null; // Node being text-edited by user\n\n  // Client metadata\n  clientId: number;               // Yjs client ID\n  connectedAt: number;            // Unix timestamp when user connected\n}\n\n/**\n * Awareness state update payload for partial updates\n */\nexport interface AwarenessStateUpdate {\n  cursor?: CursorPosition | null;\n  selectedNodeIds?: string[];\n  viewport?: Viewport | null;\n  activityStatus?: ActivityStatus;\n  lastActiveAt?: number;\n  isEditingNodeId?: string | null;\n}\n\n/**\n * Awareness protocol configuration options\n */\nexport interface AwarenessConfig {\n  // Timing configuration (in milliseconds)\n  cursorThrottleMs: number;       // Min time between cursor updates (default: 50ms)\n  viewportThrottleMs: number;     // Min time between viewport updates (default: 200ms)\n  activityPollMs: number;         // How often to check activity status (default: 5000ms)\n\n  // Activity status thresholds (in milliseconds)\n  idleThresholdMs: number;        // Time until 'idle' status (default: 10000ms)\n  awayThresholdMs: number;        // Time until 'away' status (default: 60000ms)\n\n  // Expiration\n  staleTimeoutMs: number;         // Remove user after this time of no updates (default: 30000ms)\n}\n\n/**\n * Default awareness protocol configuration\n */\nexport const DEFAULT_AWARENESS_CONFIG: AwarenessConfig = {\n  cursorThrottleMs: 50,\n  viewportThrottleMs: 200,\n  activityPollMs: 5000,\n  idleThresholdMs: 10000,\n  awayThresholdMs: 60000,\n  staleTimeoutMs: 30000,\n};\n\n/**\n * Event types emitted by the awareness protocol\n */\nexport type AwarenessEventType =\n  | 'user-joined'\n  | 'user-left'\n  | 'user-updated'\n  | 'cursor-moved'\n  | 'selection-changed'\n  | 'viewport-changed'\n  | 'activity-changed'\n  | 'editing-started'\n  | 'editing-stopped';\n\n/**\n * Awareness event payload\n */\nexport interface AwarenessEvent {\n  type: AwarenessEventType;\n  userId: string;\n  state: AwarenessState;\n  previousState?: AwarenessState;\n  timestamp: number;\n}"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "completed",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "in_progress",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "pending",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "pending",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "pending",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "pending",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "pending",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}
Now let me create the awareness protocol module with the core implementation:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "content": "/**\n * Awareness Protocol Implementation\n *\n * This module provides a comprehensive awareness protocol for real-time collaboration.\n * It handles:\n * - User presence tracking\n * - Cursor position broadcasting\n * - Node selection sharing\n * - Viewport synchronization\n * - Activity status management\n * - Stale user cleanup\n */\n\nimport type { Awareness } from 'y-protocols/awareness';\nimport type {\n  AwarenessState,\n  AwarenessStateUpdate,\n  AwarenessConfig,\n  AwarenessEvent,\n  AwarenessEventType,\n  ActivityStatus,\n  CursorPosition,\n  Viewport,\n} from '@mindmapper/types';\nimport { DEFAULT_AWARENESS_CONFIG } from '@mindmapper/types';\n\n// Re-export types for convenience\nexport type {\n  AwarenessState,\n  AwarenessStateUpdate,\n  AwarenessConfig,\n  AwarenessEvent,\n  AwarenessEventType,\n  ActivityStatus,\n  CursorPosition,\n  Viewport,\n};\n\nexport { DEFAULT_AWARENESS_CONFIG };\n\n/**\n * Event listener type for awareness events\n */\nexport type AwarenessEventListener = (event: AwarenessEvent) => void;\n\n/**\n * Throttle function implementation\n */\nfunction throttle<T extends (...args: unknown[]) => void>(\n  fn: T,\n  delay: number\n): T {\n  let lastCall = 0;\n  let timeoutId: ReturnType<typeof setTimeout> | null = null;\n\n  return ((...args: unknown[]) => {\n    const now = Date.now();\n    const timeSinceLastCall = now - lastCall;\n\n    if (timeSinceLastCall >= delay) {\n      lastCall = now;\n      fn(...args);\n    } else if (!timeoutId) {\n      timeoutId = setTimeout(() => {\n        lastCall = Date.now();\n        timeoutId = null;\n        fn(...args);\n      }, delay - timeSinceLastCall);\n    }\n  }) as T;\n}\n\n/**\n * AwarenessProtocol class manages user presence and collaboration state\n */\nexport class AwarenessProtocol {\n  private awareness: Awareness;\n  private config: AwarenessConfig;\n  private userId: string;\n  private userName: string;\n  private userColor: string;\n  private avatarUrl?: string;\n\n  private localState: AwarenessState;\n  private remoteStates: Map<string, AwarenessState> = new Map();\n\n  private eventListeners: Map<AwarenessEventType | '*', Set<AwarenessEventListener>> = new Map();\n  private activityCheckInterval: ReturnType<typeof setInterval> | null = null;\n  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;\n\n  // Throttled update functions\n  private throttledCursorUpdate: (cursor: CursorPosition | null) => void;\n  private throttledViewportUpdate: (viewport: Viewport | null) => void;\n\n  constructor(\n    awareness: Awareness,\n    userId: string,\n    userName: string,\n    userColor: string,\n    avatarUrl?: string,\n    config: Partial<AwarenessConfig> = {}\n  ) {\n    this.awareness = awareness;\n    this.userId = userId;\n    this.userName = userName;\n    this.userColor = userColor;\n    this.avatarUrl = avatarUrl;\n    this.config = { ...DEFAULT_AWARENESS_CONFIG, ...config };\n\n    // Initialize local state\n    const now = Date.now();\n    this.localState = {\n      userId,\n      userName,\n      userColor,\n      avatarUrl,\n      cursor: null,\n      selectedNodeIds: [],\n      viewport: null,\n      activityStatus: 'active',\n      lastActiveAt: now,\n      isEditingNodeId: null,\n      clientId: awareness.clientID,\n      connectedAt: now,\n    };\n\n    // Set up throttled update functions\n    this.throttledCursorUpdate = throttle(\n      this._updateCursor.bind(this),\n      this.config.cursorThrottleMs\n    );\n    this.throttledViewportUpdate = throttle(\n      this._updateViewport.bind(this),\n      this.config.viewportThrottleMs\n    );\n\n    // Initialize\n    this._initialize();\n  }\n\n  /**\n   * Initialize the awareness protocol\n   */\n  private _initialize(): void {\n    // Set initial local state\n    this._broadcastLocalState();\n\n    // Listen for awareness changes\n    this.awareness.on('update', this._handleAwarenessUpdate.bind(this));\n\n    // Start activity status checking\n    this._startActivityCheck();\n\n    // Start stale user cleanup\n    this._startStaleCheck();\n\n    // Sync initial remote states\n    this._syncRemoteStates();\n  }\n\n  /**\n   * Broadcast local state to all users\n   */\n  private _broadcastLocalState(): void {\n    this.awareness.setLocalState(this.localState);\n  }\n\n  /**\n   * Handle awareness updates from Yjs\n   */\n  private _handleAwarenessUpdate({\n    added,\n    updated,\n    removed,\n  }: {\n    added: number[];\n    updated: number[];\n    removed: number[];\n  }): void {\n    const states = this.awareness.getStates();\n    const now = Date.now();\n\n    // Handle added users\n    for (const clientId of added) {\n      const state = states.get(clientId) as AwarenessState | undefined;\n      if (state && state.userId !== this.userId) {\n        const previousState = this.remoteStates.get(state.userId);\n        this.remoteStates.set(state.userId, state);\n        this._emitEvent({\n          type: 'user-joined',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp: now,\n        });\n      }\n    }\n\n    // Handle updated users\n    for (const clientId of updated) {\n      const state = states.get(clientId) as AwarenessState | undefined;\n      if (state && state.userId !== this.userId) {\n        const previousState = this.remoteStates.get(state.userId);\n        this.remoteStates.set(state.userId, state);\n\n        // Emit specific event types based on what changed\n        if (previousState) {\n          this._emitChangeEvents(state, previousState, now);\n        }\n\n        this._emitEvent({\n          type: 'user-updated',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp: now,\n        });\n      }\n    }\n\n    // Handle removed users\n    for (const clientId of removed) {\n      // Find the user by client ID\n      for (const [userId, state] of this.remoteStates.entries()) {\n        if (state.clientId === clientId) {\n          this.remoteStates.delete(userId);\n          this._emitEvent({\n            type: 'user-left',\n            userId,\n            state,\n            timestamp: now,\n          });\n          break;\n        }\n      }\n    }\n  }\n\n  /**\n   * Emit specific change events based on what changed\n   */\n  private _emitChangeEvents(\n    state: AwarenessState,\n    previousState: AwarenessState,\n    timestamp: number\n  ): void {\n    // Cursor changed\n    if (JSON.stringify(state.cursor) !== JSON.stringify(previousState.cursor)) {\n      this._emitEvent({\n        type: 'cursor-moved',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Selection changed\n    if (JSON.stringify(state.selectedNodeIds) !== JSON.stringify(previousState.selectedNodeIds)) {\n      this._emitEvent({\n        type: 'selection-changed',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Viewport changed\n    if (JSON.stringify(state.viewport) !== JSON.stringify(previousState.viewport)) {\n      this._emitEvent({\n        type: 'viewport-changed',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Activity status changed\n    if (state.activityStatus !== previousState.activityStatus) {\n      this._emitEvent({\n        type: 'activity-changed',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Editing state changed\n    if (state.isEditingNodeId !== previousState.isEditingNodeId) {\n      if (state.isEditingNodeId && !previousState.isEditingNodeId) {\n        this._emitEvent({\n          type: 'editing-started',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp,\n        });\n      } else if (!state.isEditingNodeId && previousState.isEditingNodeId) {\n        this._emitEvent({\n          type: 'editing-stopped',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp,\n        });\n      }\n    }\n  }\n\n  /**\n   * Emit an awareness event\n   */\n  private _emitEvent(event: AwarenessEvent): void {\n    // Emit to specific event type listeners\n    const typeListeners = this.eventListeners.get(event.type);\n    if (typeListeners) {\n      for (const listener of typeListeners) {\n        try {\n          listener(event);\n        } catch (error) {\n          console.error(`[AwarenessProtocol] Error in event listener:`, error);\n        }\n      }\n    }\n\n    // Emit to wildcard listeners\n    const wildcardListeners = this.eventListeners.get('*');\n    if (wildcardListeners) {\n      for (const listener of wildcardListeners) {\n        try {\n          listener(event);\n        } catch (error) {\n          console.error(`[AwarenessProtocol] Error in wildcard listener:`, error);\n        }\n      }\n    }\n  }\n\n  /**\n   * Sync remote states from awareness\n   */\n  private _syncRemoteStates(): void {\n    const states = this.awareness.getStates();\n    const now = Date.now();\n\n    states.forEach((state, clientId) => {\n      const awarenessState = state as AwarenessState;\n      if (awarenessState.userId && awarenessState.userId !== this.userId) {\n        const previousState = this.remoteStates.get(awarenessState.userId);\n        this.remoteStates.set(awarenessState.userId, awarenessState);\n\n        if (!previousState) {\n          this._emitEvent({\n            type: 'user-joined',\n            userId: awarenessState.userId,\n            state: awarenessState,\n            timestamp: now,\n          });\n        }\n      }\n    });\n  }\n\n  /**\n   * Start activity status checking\n   */\n  private _startActivityCheck(): void {\n    this.activityCheckInterval = setInterval(() => {\n      this._updateActivityStatus();\n    }, this.config.activityPollMs);\n  }\n\n  /**\n   * Start stale user cleanup\n   */\n  private _startStaleCheck(): void {\n    this.staleCheckInterval = setInterval(() => {\n      this._cleanupStaleUsers();\n    }, this.config.staleTimeoutMs / 2);\n  }\n\n  /**\n   * Update activity status based on last activity time\n   */\n  private _updateActivityStatus(): void {\n    const now = Date.now();\n    const timeSinceLastActivity = now - this.localState.lastActiveAt;\n\n    let newStatus: ActivityStatus;\n    if (timeSinceLastActivity < this.config.idleThresholdMs) {\n      newStatus = 'active';\n    } else if (timeSinceLastActivity < this.config.awayThresholdMs) {\n      newStatus = 'idle';\n    } else {\n      newStatus = 'away';\n    }\n\n    if (newStatus !== this.localState.activityStatus) {\n      this.localState.activityStatus = newStatus;\n      this._broadcastLocalState();\n    }\n  }\n\n  /**\n   * Clean up stale users that haven't been heard from\n   */\n  private _cleanupStaleUsers(): void {\n    const now = Date.now();\n\n    for (const [userId, state] of this.remoteStates.entries()) {\n      const timeSinceLastUpdate = now - state.lastActiveAt;\n      if (timeSinceLastUpdate > this.config.staleTimeoutMs) {\n        this.remoteStates.delete(userId);\n        this._emitEvent({\n          type: 'user-left',\n          userId,\n          state,\n          timestamp: now,\n        });\n      }\n    }\n  }\n\n  /**\n   * Record user activity (call on any user interaction)\n   */\n  public recordActivity(): void {\n    const now = Date.now();\n    if (this.localState.activityStatus !== 'active' || now - this.localState.lastActiveAt > 1000) {\n      this.localState.lastActiveAt = now;\n      if (this.localState.activityStatus !== 'active') {\n        this.localState.activityStatus = 'active';\n        this._broadcastLocalState();\n      }\n    }\n  }\n\n  /**\n   * Update cursor position (throttled)\n   */\n  public updateCursor(cursor: CursorPosition | null): void {\n    this.recordActivity();\n    this.throttledCursorUpdate(cursor);\n  }\n\n  /**\n   * Internal cursor update (called by throttled function)\n   */\n  private _updateCursor(cursor: CursorPosition | null): void {\n    this.localState.cursor = cursor;\n    this._broadcastLocalState();\n  }\n\n  /**\n   * Update selected nodes\n   */\n  public updateSelectedNodes(nodeIds: string[]): void {\n    this.recordActivity();\n    if (JSON.stringify(this.localState.selectedNodeIds) !== JSON.stringify(nodeIds)) {\n      this.localState.selectedNodeIds = nodeIds;\n      this._broadcastLocalState();\n    }\n  }\n\n  /**\n   * Update selected node (single selection convenience method)\n   */\n  public updateSelectedNode(nodeId: string | null): void {\n    this.updateSelectedNodes(nodeId ? [nodeId] : []);\n  }\n\n  /**\n   * Update viewport (throttled)\n   */\n  public updateViewport(viewport: Viewport | null): void {\n    this.throttledViewportUpdate(viewport);\n  }\n\n  /**\n   * Internal viewport update (called by throttled function)\n   */\n  private _updateViewport(viewport: Viewport | null): void {\n    this.localState.viewport = viewport;\n    this._broadcastLocalState();\n  }\n\n  /**\n   * Set editing node\n   */\n  public setEditingNode(nodeId: string | null): void {\n    this.recordActivity();\n    if (this.localState.isEditingNodeId !== nodeId) {\n      this.localState.isEditingNodeId = nodeId;\n      this._broadcastLocalState();\n    }\n  }\n\n  /**\n   * Get local awareness state\n   */\n  public getLocalState(): AwarenessState {\n    return { ...this.localState };\n  }\n\n  /**\n   * Get all remote user states\n   */\n  public getRemoteStates(): AwarenessState[] {\n    return Array.from(this.remoteStates.values());\n  }\n\n  /**\n   * Get a specific user's state\n   */\n  public getUserState(userId: string): AwarenessState | undefined {\n    if (userId === this.userId) {\n      return this.getLocalState();\n    }\n    return this.remoteStates.get(userId);\n  }\n\n  /**\n   * Get all states (including local user)\n   */\n  public getAllStates(): AwarenessState[] {\n    return [this.getLocalState(), ...this.getRemoteStates()];\n  }\n\n  /**\n   * Add event listener\n   */\n  public on(\n    eventType: AwarenessEventType | '*',\n    listener: AwarenessEventListener\n  ): () => void {\n    if (!this.eventListeners.has(eventType)) {\n      this.eventListeners.set(eventType, new Set());\n    }\n    this.eventListeners.get(eventType)!.add(listener);\n\n    // Return unsubscribe function\n    return () => {\n      this.eventListeners.get(eventType)?.delete(listener);\n    };\n  }\n\n  /**\n   * Remove event listener\n   */\n  public off(\n    eventType: AwarenessEventType | '*',\n    listener: AwarenessEventListener\n  ): void {\n    this.eventListeners.get(eventType)?.delete(listener);\n  }\n\n  /**\n   * Update user info (name, color, avatar)\n   */\n  public updateUserInfo(updates: {\n    userName?: string;\n    userColor?: string;\n    avatarUrl?: string;\n  }): void {\n    if (updates.userName !== undefined) {\n      this.userName = updates.userName;\n      this.localState.userName = updates.userName;\n    }\n    if (updates.userColor !== undefined) {\n      this.userColor = updates.userColor;\n      this.localState.userColor = updates.userColor;\n    }\n    if (updates.avatarUrl !== undefined) {\n      this.avatarUrl = updates.avatarUrl;\n      this.localState.avatarUrl = updates.avatarUrl;\n    }\n    this._broadcastLocalState();\n  }\n\n  /**\n   * Destroy the awareness protocol instance\n   */\n  public destroy(): void {\n    if (this.activityCheckInterval) {\n      clearInterval(this.activityCheckInterval);\n      this.activityCheckInterval = null;\n    }\n    if (this.staleCheckInterval) {\n      clearInterval(this.staleCheckInterval);\n      this.staleCheckInterval = null;\n    }\n\n    this.eventListeners.clear();\n    this.remoteStates.clear();\n\n    // Remove local state from awareness\n    this.awareness.setLocalState(null);\n  }\n}\n\n/**\n * Create an awareness protocol instance\n */\nexport function createAwarenessProtocol(\n  awareness: Awareness,\n  userId: string,\n  userName: string,\n  userColor: string,\n  avatarUrl?: string,\n  config?: Partial<AwarenessConfig>\n): AwarenessProtocol {\n  return new AwarenessProtocol(\n    awareness,\n    userId,\n    userName,\n    userColor,\n    avatarUrl,\n    config\n  );\n}\n\n/**\n * Convert legacy awareness state format to new format\n * This helps with backwards compatibility\n */\nexport function convertLegacyState(legacyState: {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeId: string | null;\n}): AwarenessState {\n  const now = Date.now();\n  return {\n    userId: legacyState.id,\n    userName: legacyState.name,\n    userColor: legacyState.color,\n    cursor: legacyState.cursor,\n    selectedNodeIds: legacyState.selectedNodeId ? [legacyState.selectedNodeId] : [],\n    viewport: null,\n    activityStatus: 'active',\n    lastActiveAt: now,\n    isEditingNodeId: null,\n    clientId: 0,\n    connectedAt: now,\n  };\n}\n\n/**\n * Convert new awareness state to legacy format for backwards compatibility\n */\nexport function convertToLegacyState(state: AwarenessState): {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeId: string | null;\n} {\n  return {\n    id: state.userId,\n    name: state.userName,\n    color: state.userColor,\n    cursor: state.cursor ? { x: state.cursor.x, y: state.cursor.y } : null,\n    selectedNodeId: state.selectedNodeIds[0] || null,\n  };\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "completed",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "completed",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "in_progress",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "pending",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "pending",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "pending",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "pending",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}
Now let me update the usePresence hook to use the new awareness protocol:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/usePresence.ts",
  "content": "import { useEffect, useState, useCallback, useRef, useMemo } from 'react';\nimport { useUser } from '@clerk/clerk-react';\nimport { useYjsSync } from './useYjsSync';\nimport { getRandomPresenceColor, type OfflineSyncState } from '@/lib/yjs-provider';\nimport {\n  AwarenessProtocol,\n  createAwarenessProtocol,\n  convertToLegacyState,\n  type AwarenessState,\n  type AwarenessEvent,\n  type CursorPosition,\n  type Viewport,\n  type ActivityStatus,\n} from '@/lib/awareness-protocol';\n\n// Re-export types for external use\nexport type { AwarenessState, CursorPosition, Viewport, ActivityStatus };\n\n/**\n * Legacy presence user format for backwards compatibility\n */\nexport interface PresenceUser {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeId: string | null;\n}\n\n/**\n * Enhanced presence user with full awareness state\n */\nexport interface EnhancedPresenceUser {\n  userId: string;\n  userName: string;\n  userColor: string;\n  avatarUrl?: string;\n  cursor: CursorPosition | null;\n  selectedNodeIds: string[];\n  viewport: Viewport | null;\n  activityStatus: ActivityStatus;\n  lastActiveAt: number;\n  isEditingNodeId: string | null;\n  clientId: number;\n  connectedAt: number;\n}\n\ninterface UsePresenceOptions {\n  mapId: string;\n  enabled?: boolean;\n}\n\ninterface UsePresenceReturn {\n  // Legacy format (backwards compatibility)\n  awarenessStates: PresenceUser[];\n  currentUser: PresenceUser | null;\n\n  // Enhanced format with full awareness data\n  enhancedStates: EnhancedPresenceUser[];\n  enhancedCurrentUser: EnhancedPresenceUser | null;\n\n  // Update functions\n  updateCursor: (x: number, y: number, canvasX?: number, canvasY?: number) => void;\n  updateSelectedNode: (nodeId: string | null) => void;\n  updateSelectedNodes: (nodeIds: string[]) => void;\n  updateViewport: (viewport: Viewport | null) => void;\n  setEditingNode: (nodeId: string | null) => void;\n  recordActivity: () => void;\n\n  // Connection state\n  isConnected: boolean;\n  isSynced: boolean;\n  isOffline: boolean;\n  offlineSync: OfflineSyncState | null;\n\n  // Undo/redo\n  undo: () => void;\n  redo: () => void;\n  canUndo: boolean;\n  canRedo: boolean;\n\n  // Event subscription\n  onAwarenessEvent: (\n    eventType: 'user-joined' | 'user-left' | 'user-updated' | 'cursor-moved' |\n               'selection-changed' | 'viewport-changed' | 'activity-changed' |\n               'editing-started' | 'editing-stopped' | '*',\n    listener: (event: AwarenessEvent) => void\n  ) => () => void;\n}\n\nexport function usePresence({ mapId, enabled = true }: UsePresenceOptions): UsePresenceReturn {\n  const { user, isLoaded } = useUser();\n\n  // State for awareness\n  const [awarenessStates, setAwarenessStates] = useState<PresenceUser[]>([]);\n  const [enhancedStates, setEnhancedStates] = useState<EnhancedPresenceUser[]>([]);\n\n  // Refs for stable values\n  const colorRef = useRef<string>(getRandomPresenceColor());\n  const awarenessProtocolRef = useRef<AwarenessProtocol | null>(null);\n\n  const userId = user?.id || 'anonymous';\n  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Anonymous';\n  const avatarUrl = user?.imageUrl;\n\n  const {\n    syncState,\n    undoState,\n    updateCursor: yjsUpdateCursor,\n    updateSelectedNode: yjsUpdateSelectedNode,\n    getAwarenessStates,\n    undo,\n    redo,\n    awareness,\n  } = useYjsSync({\n    mapId: enabled ? mapId : '',\n    userId,\n    userName,\n  });\n\n  // Initialize awareness protocol when awareness is available\n  useEffect(() => {\n    if (!enabled || !awareness) return;\n\n    const protocol = createAwarenessProtocol(\n      awareness,\n      userId,\n      userName,\n      colorRef.current,\n      avatarUrl\n    );\n\n    awarenessProtocolRef.current = protocol;\n\n    // Subscribe to all events to update states\n    const unsubscribe = protocol.on('*', () => {\n      // Update enhanced states\n      const remote = protocol.getRemoteStates();\n      setEnhancedStates(remote);\n\n      // Convert to legacy format for backwards compatibility\n      const legacyStates = remote.map(convertToLegacyState);\n      setAwarenessStates(legacyStates);\n    });\n\n    // Initial state sync\n    const remote = protocol.getRemoteStates();\n    setEnhancedStates(remote);\n    setAwarenessStates(remote.map(convertToLegacyState));\n\n    return () => {\n      unsubscribe();\n      protocol.destroy();\n      awarenessProtocolRef.current = null;\n    };\n  }, [enabled, awareness, userId, userName, avatarUrl]);\n\n  // Also poll for awareness states (fallback for when events might be missed)\n  useEffect(() => {\n    if (!enabled) return;\n\n    const interval = setInterval(() => {\n      if (awarenessProtocolRef.current) {\n        const remote = awarenessProtocolRef.current.getRemoteStates();\n        setEnhancedStates(remote);\n        setAwarenessStates(remote.map(convertToLegacyState));\n      } else {\n        // Fallback to legacy method\n        const states = getAwarenessStates();\n        setAwarenessStates(states);\n      }\n    }, 100);\n\n    return () => clearInterval(interval);\n  }, [enabled, getAwarenessStates]);\n\n  // Current user states\n  const currentUser: PresenceUser | null = useMemo(() => {\n    if (!isLoaded || !user) return null;\n    return {\n      id: userId,\n      name: userName,\n      color: colorRef.current,\n      cursor: null,\n      selectedNodeId: null,\n    };\n  }, [isLoaded, user, userId, userName]);\n\n  const enhancedCurrentUser: EnhancedPresenceUser | null = useMemo(() => {\n    if (!awarenessProtocolRef.current) return null;\n    const state = awarenessProtocolRef.current.getLocalState();\n    return state;\n  }, [awarenessStates]); // Re-compute when states change\n\n  // Throttled cursor update\n  const lastCursorUpdate = useRef<number>(0);\n  const updateCursor = useCallback(\n    (x: number, y: number, canvasX?: number, canvasY?: number) => {\n      const now = Date.now();\n      if (now - lastCursorUpdate.current < 50) return;\n      lastCursorUpdate.current = now;\n\n      if (awarenessProtocolRef.current) {\n        awarenessProtocolRef.current.updateCursor({\n          x,\n          y,\n          canvasX,\n          canvasY,\n        });\n      } else {\n        // Fallback to legacy\n        yjsUpdateCursor(x, y);\n      }\n    },\n    [yjsUpdateCursor]\n  );\n\n  // Update selected node\n  const updateSelectedNode = useCallback(\n    (nodeId: string | null) => {\n      if (awarenessProtocolRef.current) {\n        awarenessProtocolRef.current.updateSelectedNode(nodeId);\n      } else {\n        // Fallback to legacy\n        yjsUpdateSelectedNode(nodeId);\n      }\n    },\n    [yjsUpdateSelectedNode]\n  );\n\n  // Update multiple selected nodes\n  const updateSelectedNodes = useCallback((nodeIds: string[]) => {\n    if (awarenessProtocolRef.current) {\n      awarenessProtocolRef.current.updateSelectedNodes(nodeIds);\n    }\n  }, []);\n\n  // Update viewport\n  const updateViewport = useCallback((viewport: Viewport | null) => {\n    if (awarenessProtocolRef.current) {\n      awarenessProtocolRef.current.updateViewport(viewport);\n    }\n  }, []);\n\n  // Set editing node\n  const setEditingNode = useCallback((nodeId: string | null) => {\n    if (awarenessProtocolRef.current) {\n      awarenessProtocolRef.current.setEditingNode(nodeId);\n    }\n  }, []);\n\n  // Record activity\n  const recordActivity = useCallback(() => {\n    if (awarenessProtocolRef.current) {\n      awarenessProtocolRef.current.recordActivity();\n    }\n  }, []);\n\n  // Event subscription\n  const onAwarenessEvent = useCallback(\n    (\n      eventType: Parameters<AwarenessProtocol['on']>[0],\n      listener: (event: AwarenessEvent) => void\n    ) => {\n      if (awarenessProtocolRef.current) {\n        return awarenessProtocolRef.current.on(eventType, listener);\n      }\n      // Return no-op unsubscribe if protocol not available\n      return () => {};\n    },\n    []\n  );\n\n  return {\n    // Legacy format\n    awarenessStates,\n    currentUser,\n\n    // Enhanced format\n    enhancedStates,\n    enhancedCurrentUser,\n\n    // Update functions\n    updateCursor,\n    updateSelectedNode,\n    updateSelectedNodes,\n    updateViewport,\n    setEditingNode,\n    recordActivity,\n\n    // Connection state\n    isConnected: syncState.isConnected,\n    isSynced: syncState.isSynced,\n    isOffline: syncState.isOffline,\n    offlineSync: syncState.offlineSync,\n\n    // Undo/redo\n    undo,\n    redo,\n    canUndo: undoState.canUndo,\n    canRedo: undoState.canRedo,\n\n    // Event subscription\n    onAwarenessEvent,\n  };\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "completed",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "completed",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "completed",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "in_progress",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "pending",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "pending",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "pending",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}
Now let me update the Cursors component to support activity status:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/collaboration/Cursors.tsx",
  "content": "import { useMemo } from 'react';\nimport type { ActivityStatus } from '@mindmapper/types';\n\n/**\n * Legacy cursor state format (backwards compatibility)\n */\ninterface LegacyCursorState {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeId: string | null;\n}\n\n/**\n * Enhanced cursor state with activity tracking\n */\ninterface EnhancedCursorState {\n  userId: string;\n  userName: string;\n  userColor: string;\n  cursor: { x: number; y: number; canvasX?: number; canvasY?: number } | null;\n  selectedNodeIds: string[];\n  activityStatus: ActivityStatus;\n  lastActiveAt: number;\n  isEditingNodeId: string | null;\n}\n\ntype CursorState = LegacyCursorState | EnhancedCursorState;\n\n/**\n * Normalize cursor state to handle both legacy and enhanced formats\n */\nfunction normalizeCursorState(state: CursorState): {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  activityStatus: ActivityStatus;\n  isEditing: boolean;\n} {\n  if ('userId' in state) {\n    // Enhanced format\n    return {\n      id: state.userId,\n      name: state.userName,\n      color: state.userColor,\n      cursor: state.cursor,\n      activityStatus: state.activityStatus,\n      isEditing: state.isEditingNodeId !== null,\n    };\n  } else {\n    // Legacy format\n    return {\n      id: state.id,\n      name: state.name,\n      color: state.color,\n      cursor: state.cursor,\n      activityStatus: 'active',\n      isEditing: false,\n    };\n  }\n}\n\ninterface CursorsProps {\n  awarenessStates: CursorState[];\n  currentUserId?: string;\n  showActivityStatus?: boolean;\n}\n\n/**\n * Get opacity based on activity status\n */\nfunction getActivityOpacity(status: ActivityStatus): number {\n  switch (status) {\n    case 'active':\n      return 1;\n    case 'idle':\n      return 0.6;\n    case 'away':\n      return 0.3;\n    default:\n      return 1;\n  }\n}\n\n/**\n * Get status indicator color\n */\nfunction getStatusColor(status: ActivityStatus): string {\n  switch (status) {\n    case 'active':\n      return '#22c55e'; // green\n    case 'idle':\n      return '#eab308'; // yellow\n    case 'away':\n      return '#9ca3af'; // gray\n    default:\n      return '#22c55e';\n  }\n}\n\nexport function Cursors({\n  awarenessStates,\n  currentUserId,\n  showActivityStatus = true,\n}: CursorsProps) {\n  // Normalize and filter states\n  const otherUsers = useMemo(() => {\n    return awarenessStates\n      .map(normalizeCursorState)\n      .filter((state) => state.id !== currentUserId && state.cursor);\n  }, [awarenessStates, currentUserId]);\n\n  if (otherUsers.length === 0) {\n    return null;\n  }\n\n  return (\n    <div\n      className=\"pointer-events-none absolute inset-0 z-50 overflow-hidden\"\n      data-testid=\"remote-cursors\"\n    >\n      {otherUsers.map((user) => {\n        if (!user.cursor) return null;\n\n        const opacity = getActivityOpacity(user.activityStatus);\n        const statusColor = getStatusColor(user.activityStatus);\n\n        return (\n          <div\n            key={user.id}\n            className=\"absolute transition-all duration-75 ease-out\"\n            style={{\n              left: user.cursor.x,\n              top: user.cursor.y,\n              transform: 'translate(-2px, -2px)',\n              opacity,\n            }}\n            data-testid={`cursor-${user.id}`}\n            data-activity-status={user.activityStatus}\n          >\n            {/* Cursor arrow */}\n            <svg\n              width=\"24\"\n              height=\"24\"\n              viewBox=\"0 0 24 24\"\n              fill=\"none\"\n              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}\n            >\n              <path\n                d=\"M5.65376 12.4563L7.23124 17.5541C7.47911 18.3452 8.24549 18.8585 9.07489 18.7925L14.8298 18.3263C15.5695 18.2664 16.2142 17.7908 16.4866 17.0939L20.2175 7.81711C20.5722 6.89555 19.8695 5.92455 18.8931 6.01258L4.60875 7.29808C3.68206 7.38136 3.13469 8.39108 3.56966 9.21277L5.34726 12.5807C5.48879 12.8419 5.56343 13.1323 5.56343 13.4281V13.4281\"\n                fill={user.color}\n              />\n              <path\n                d=\"M5.65376 12.4563L7.23124 17.5541C7.47911 18.3452 8.24549 18.8585 9.07489 18.7925L14.8298 18.3263C15.5695 18.2664 16.2142 17.7908 16.4866 17.0939L20.2175 7.81711C20.5722 6.89555 19.8695 5.92455 18.8931 6.01258L4.60875 7.29808C3.68206 7.38136 3.13469 8.39108 3.56966 9.21277L5.34726 12.5807C5.48879 12.8419 5.56343 13.1323 5.56343 13.4281V13.4281\"\n                stroke=\"white\"\n                strokeWidth=\"1.5\"\n              />\n            </svg>\n\n            {/* User name label with activity indicator */}\n            <div\n              className=\"absolute left-5 top-3 flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap\"\n              style={{ backgroundColor: user.color }}\n            >\n              {/* Activity status indicator */}\n              {showActivityStatus && (\n                <span\n                  className=\"w-1.5 h-1.5 rounded-full flex-shrink-0\"\n                  style={{ backgroundColor: statusColor }}\n                  title={`Status: ${user.activityStatus}`}\n                />\n              )}\n\n              {/* User name */}\n              <span>{user.name}</span>\n\n              {/* Editing indicator */}\n              {user.isEditing && (\n                <span className=\"ml-1 opacity-75\" title=\"Editing\">\n                  <svg\n                    width=\"10\"\n                    height=\"10\"\n                    viewBox=\"0 0 24 24\"\n                    fill=\"currentColor\"\n                  >\n                    <path d=\"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z\" />\n                  </svg>\n                </span>\n              )}\n            </div>\n          </div>\n        );\n      })}\n    </div>\n  );\n}\n\ninterface UseRemoteCursorsOptions {\n  getAwarenessStates: () => CursorState[];\n  updateCursor: (x: number, y: number) => void;\n}\n\nexport function useRemoteCursors({\n  getAwarenessStates,\n  updateCursor,\n}: UseRemoteCursorsOptions) {\n  // This hook is now mostly handled by usePresence\n  // Keeping for backwards compatibility\n  return {\n    awarenessStates: getAwarenessStates(),\n  };\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "completed",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "completed",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "completed",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "completed",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "in_progress",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "pending",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "pending",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}
Now let me update the PresenceList component with activity indicators:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/collaboration/PresenceList.tsx",
  "content": "import { useMemo } from 'react';\nimport type { ActivityStatus } from '@mindmapper/types';\n\n/**\n * Legacy presence state format (backwards compatibility)\n */\ninterface LegacyPresenceState {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeId: string | null;\n}\n\n/**\n * Enhanced presence state with activity tracking\n */\ninterface EnhancedPresenceState {\n  userId: string;\n  userName: string;\n  userColor: string;\n  avatarUrl?: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeIds: string[];\n  activityStatus: ActivityStatus;\n  lastActiveAt: number;\n  isEditingNodeId: string | null;\n  viewport?: { x: number; y: number; zoom: number } | null;\n}\n\ntype PresenceState = LegacyPresenceState | EnhancedPresenceState;\n\n/**\n * Normalize presence state to handle both legacy and enhanced formats\n */\nfunction normalizePresenceState(state: PresenceState): {\n  id: string;\n  name: string;\n  color: string;\n  avatarUrl?: string;\n  isActive: boolean;\n  activityStatus: ActivityStatus;\n  isEditing: boolean;\n  lastActiveAt: number;\n} {\n  if ('userId' in state) {\n    // Enhanced format\n    return {\n      id: state.userId,\n      name: state.userName,\n      color: state.userColor,\n      avatarUrl: state.avatarUrl,\n      isActive: state.cursor !== null,\n      activityStatus: state.activityStatus,\n      isEditing: state.isEditingNodeId !== null,\n      lastActiveAt: state.lastActiveAt,\n    };\n  } else {\n    // Legacy format\n    return {\n      id: state.id,\n      name: state.name,\n      color: state.color,\n      isActive: state.cursor !== null,\n      activityStatus: 'active',\n      isEditing: false,\n      lastActiveAt: Date.now(),\n    };\n  }\n}\n\n/**\n * Get status indicator color\n */\nfunction getStatusColor(status: ActivityStatus, isActive: boolean): string {\n  if (!isActive) return '#9ca3af'; // gray for no cursor\n\n  switch (status) {\n    case 'active':\n      return '#22c55e'; // green\n    case 'idle':\n      return '#eab308'; // yellow\n    case 'away':\n      return '#9ca3af'; // gray\n    default:\n      return '#22c55e';\n  }\n}\n\n/**\n * Get status label\n */\nfunction getStatusLabel(status: ActivityStatus, isActive: boolean): string {\n  if (!isActive) return 'No cursor';\n\n  switch (status) {\n    case 'active':\n      return 'Active';\n    case 'idle':\n      return 'Idle';\n    case 'away':\n      return 'Away';\n    default:\n      return 'Active';\n  }\n}\n\n/**\n * Format relative time\n */\nfunction formatRelativeTime(timestamp: number): string {\n  const now = Date.now();\n  const diff = now - timestamp;\n\n  if (diff < 60000) return 'Just now';\n  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;\n  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;\n  return `${Math.floor(diff / 86400000)}d ago`;\n}\n\ninterface PresenceListProps {\n  awarenessStates: PresenceState[];\n  currentUserId?: string;\n  showActivityDetails?: boolean;\n}\n\nexport function PresenceList({\n  awarenessStates,\n  currentUserId,\n  showActivityDetails = false,\n}: PresenceListProps) {\n  const otherUsers = useMemo(\n    () =>\n      awarenessStates\n        .map(normalizePresenceState)\n        .filter((state) => state.id !== currentUserId),\n    [awarenessStates, currentUserId]\n  );\n\n  if (otherUsers.length === 0) {\n    return null;\n  }\n\n  return (\n    <div className=\"flex items-center gap-1\" data-testid=\"presence-list\">\n      {/* Show avatars for up to 4 users */}\n      <div className=\"flex -space-x-2\">\n        {otherUsers.slice(0, 4).map((user) => (\n          <div\n            key={user.id}\n            className=\"relative group\"\n            title={`${user.name} - ${getStatusLabel(user.activityStatus, user.isActive)}`}\n          >\n            {/* Avatar */}\n            {user.avatarUrl ? (\n              <img\n                src={user.avatarUrl}\n                alt={user.name}\n                className=\"w-8 h-8 rounded-full border-2 border-background object-cover\"\n              />\n            ) : (\n              <div\n                className=\"w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white\"\n                style={{ backgroundColor: user.color }}\n              >\n                {user.name.charAt(0).toUpperCase()}\n              </div>\n            )}\n\n            {/* Status indicator */}\n            <span\n              className=\"absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background\"\n              style={{\n                backgroundColor: getStatusColor(user.activityStatus, user.isActive),\n              }}\n              data-testid={`status-indicator-${user.id}`}\n              data-activity-status={user.activityStatus}\n            />\n\n            {/* Editing indicator (pulse animation) */}\n            {user.isEditing && (\n              <span\n                className=\"absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-blue-500 animate-pulse\"\n                title=\"Editing\"\n              />\n            )}\n\n            {/* Tooltip on hover (if showActivityDetails) */}\n            {showActivityDetails && (\n              <div className=\"absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50\">\n                <div className=\"bg-popover text-popover-foreground text-xs rounded-lg shadow-lg px-3 py-2 whitespace-nowrap border border-border\">\n                  <div className=\"font-medium\">{user.name}</div>\n                  <div className=\"text-muted-foreground flex items-center gap-1 mt-0.5\">\n                    <span\n                      className=\"w-2 h-2 rounded-full\"\n                      style={{\n                        backgroundColor: getStatusColor(\n                          user.activityStatus,\n                          user.isActive\n                        ),\n                      }}\n                    />\n                    {getStatusLabel(user.activityStatus, user.isActive)}\n                  </div>\n                  <div className=\"text-muted-foreground mt-0.5\">\n                    {formatRelativeTime(user.lastActiveAt)}\n                  </div>\n                </div>\n              </div>\n            )}\n          </div>\n        ))}\n      </div>\n\n      {/* Show overflow count */}\n      {otherUsers.length > 4 && (\n        <div className=\"w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium\">\n          +{otherUsers.length - 4}\n        </div>\n      )}\n\n      {/* Label */}\n      <span className=\"text-sm text-muted-foreground ml-2\">\n        {otherUsers.length === 1\n          ? '1 collaborator'\n          : `${otherUsers.length} collaborators`}\n      </span>\n    </div>\n  );\n}\n\ninterface PresenceAvatarProps {\n  name: string;\n  color: string;\n  avatarUrl?: string;\n  isActive?: boolean;\n  activityStatus?: ActivityStatus;\n  isEditing?: boolean;\n  size?: 'sm' | 'md' | 'lg';\n  showStatus?: boolean;\n}\n\nexport function PresenceAvatar({\n  name,\n  color,\n  avatarUrl,\n  isActive = true,\n  activityStatus = 'active',\n  isEditing = false,\n  size = 'md',\n  showStatus = true,\n}: PresenceAvatarProps) {\n  const sizeClasses = {\n    sm: 'w-6 h-6 text-xs',\n    md: 'w-8 h-8 text-sm',\n    lg: 'w-10 h-10 text-base',\n  };\n\n  const indicatorSize = {\n    sm: 'w-2 h-2',\n    md: 'w-2.5 h-2.5',\n    lg: 'w-3 h-3',\n  };\n\n  const statusColor = getStatusColor(activityStatus, isActive);\n\n  return (\n    <div className=\"relative\" title={name}>\n      {avatarUrl ? (\n        <img\n          src={avatarUrl}\n          alt={name}\n          className={`${sizeClasses[size]} rounded-full border-2 border-background object-cover`}\n        />\n      ) : (\n        <div\n          className={`${sizeClasses[size]} rounded-full border-2 border-background flex items-center justify-center font-medium text-white`}\n          style={{ backgroundColor: color }}\n        >\n          {name.charAt(0).toUpperCase()}\n        </div>\n      )}\n\n      {/* Status indicator */}\n      {showStatus && (\n        <span\n          className={`absolute bottom-0 right-0 ${indicatorSize[size]} rounded-full border-2 border-background`}\n          style={{ backgroundColor: statusColor }}\n        />\n      )}\n\n      {/* Editing indicator */}\n      {isEditing && (\n        <span\n          className={`absolute -top-0.5 -right-0.5 ${indicatorSize[size]} rounded-full border border-background bg-blue-500 animate-pulse`}\n          title=\"Editing\"\n        />\n      )}\n    </div>\n  );\n}\n\n/**\n * Detailed presence panel showing all collaborators with full info\n */\ninterface PresencePanelProps {\n  awarenessStates: PresenceState[];\n  currentUserId?: string;\n  onUserClick?: (userId: string) => void;\n}\n\nexport function PresencePanel({\n  awarenessStates,\n  currentUserId,\n  onUserClick,\n}: PresencePanelProps) {\n  const otherUsers = useMemo(\n    () =>\n      awarenessStates\n        .map(normalizePresenceState)\n        .filter((state) => state.id !== currentUserId)\n        .sort((a, b) => {\n          // Sort by activity status: active > idle > away\n          const statusOrder = { active: 0, idle: 1, away: 2 };\n          return statusOrder[a.activityStatus] - statusOrder[b.activityStatus];\n        }),\n    [awarenessStates, currentUserId]\n  );\n\n  if (otherUsers.length === 0) {\n    return (\n      <div className=\"p-4 text-center text-muted-foreground text-sm\">\n        No other collaborators\n      </div>\n    );\n  }\n\n  return (\n    <div className=\"p-2 space-y-1\" data-testid=\"presence-panel\">\n      {otherUsers.map((user) => (\n        <button\n          key={user.id}\n          onClick={() => onUserClick?.(user.id)}\n          className=\"w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left\"\n        >\n          <PresenceAvatar\n            name={user.name}\n            color={user.color}\n            avatarUrl={user.avatarUrl}\n            isActive={user.isActive}\n            activityStatus={user.activityStatus}\n            isEditing={user.isEditing}\n            size=\"md\"\n          />\n          <div className=\"flex-1 min-w-0\">\n            <div className=\"font-medium text-sm truncate\">{user.name}</div>\n            <div className=\"text-xs text-muted-foreground flex items-center gap-1.5\">\n              <span\n                className=\"w-2 h-2 rounded-full flex-shrink-0\"\n                style={{\n                  backgroundColor: getStatusColor(\n                    user.activityStatus,\n                    user.isActive\n                  ),\n                }}\n              />\n              <span>{getStatusLabel(user.activityStatus, user.isActive)}</span>\n              {user.isEditing && (\n                <span className=\"text-blue-500\">Editing</span>\n              )}\n            </div>\n          </div>\n          <div className=\"text-xs text-muted-foreground\">\n            {formatRelativeTime(user.lastActiveAt)}\n          </div>\n        </button>\n      ))}\n    </div>\n  );\n}\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "completed",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "completed",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "completed",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "completed",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "completed",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "in_progress",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "pending",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "pending",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}
Now let me check the project structure to understand where tests should go and the Playwright configuration:

🔧 Tool: Glob
Input: {
  "pattern": "**/*playwright*"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/e2e/**"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/playwright.config.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "apps/web/tests/**/*.ts"
}
Let me look at an existing test to understand the test patterns:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/yjs-sync-hook-verification.spec.ts"
}
Now I understand the test structure. Let me create a verification test for the awareness protocol:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/awareness-protocol-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Temporary verification test for the Awareness Protocol implementation.\n * This test verifies that:\n * 1. The awareness protocol types are properly defined\n * 2. The usePresence hook works correctly\n * 3. Cursor tracking works without errors\n * 4. Activity status changes are handled\n * 5. The Cursors and PresenceList components render correctly\n *\n * NOTE: This is a verification test that should be deleted after confirming\n * the feature works correctly.\n */\ntest.describe('Awareness Protocol Verification', () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to the dashboard first\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n  });\n\n  test('should load the map editor and initialize presence without errors', async ({ page }) => {\n    // First, create a new map to test with\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n\n      // Wait for dialog to open\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n\n      // Fill in the title\n      const titleInput = page.getByTestId('map-title-input');\n      await titleInput.fill('Awareness Protocol Test Map');\n\n      // Submit the form\n      const submitButton = page.getByTestId('create-map-submit');\n      await submitButton.click();\n\n      // Wait for navigation to the map editor\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Verify we're on the map editor page and React Flow is rendered\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    // Wait for nodes to render\n    const nodes = page.locator('.react-flow__node');\n    await expect(nodes.first()).toBeVisible({ timeout: 5000 });\n\n    // Check that no JavaScript errors occurred during page load\n    // The page being responsive indicates no fatal errors\n    await expect(page.locator('.react-flow')).toBeVisible();\n  });\n\n  test('should handle mouse movement for cursor tracking without errors', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Cursor Tracking Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow to be ready\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    // Get the React Flow pane\n    const pane = page.locator('.react-flow__pane');\n    const paneBox = await pane.boundingBox();\n    expect(paneBox).not.toBeNull();\n\n    if (paneBox) {\n      // Move mouse around the canvas to trigger cursor updates\n      for (let i = 0; i < 10; i++) {\n        await page.mouse.move(\n          paneBox.x + Math.random() * paneBox.width,\n          paneBox.y + Math.random() * paneBox.height\n        );\n        await page.waitForTimeout(60); // Slightly more than throttle threshold\n      }\n    }\n\n    // Verify the page is still responsive (no errors during cursor tracking)\n    await expect(page.locator('.react-flow')).toBeVisible();\n\n    // Verify nodes are still visible\n    const nodes = page.locator('.react-flow__node');\n    await expect(nodes.first()).toBeVisible();\n  });\n\n  test('should handle node selection and update presence state', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Selection Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow to be ready\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    const nodes = page.locator('.react-flow__node');\n    await expect(nodes.first()).toBeVisible({ timeout: 5000 });\n\n    // Select a node\n    await nodes.first().click();\n\n    // Wait for selection to be processed\n    await page.waitForTimeout(200);\n\n    // Verify the node appears selected (has selection styling)\n    // The node should still be visible\n    await expect(nodes.first()).toBeVisible();\n\n    // Click elsewhere to deselect\n    await page.locator('.react-flow__pane').click();\n\n    // Wait for deselection to be processed\n    await page.waitForTimeout(200);\n\n    // Verify the page is still responsive\n    await expect(page.locator('.react-flow')).toBeVisible();\n  });\n\n  test('should handle multiple rapid interactions without degradation', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Rapid Interaction Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    const nodes = page.locator('.react-flow__node');\n    await expect(nodes.first()).toBeVisible({ timeout: 5000 });\n\n    // Perform rapid selection/deselection cycles\n    for (let i = 0; i < 5; i++) {\n      // Select node\n      await nodes.first().click();\n\n      // Move mouse\n      const pane = page.locator('.react-flow__pane');\n      const paneBox = await pane.boundingBox();\n      if (paneBox) {\n        await page.mouse.move(\n          paneBox.x + Math.random() * paneBox.width,\n          paneBox.y + Math.random() * paneBox.height\n        );\n      }\n\n      // Deselect by clicking pane\n      await page.locator('.react-flow__pane').click();\n    }\n\n    // Verify the app is still responsive after rapid interactions\n    await expect(page.locator('.react-flow')).toBeVisible();\n    await expect(nodes.first()).toBeVisible();\n  });\n\n  test('should render connection status indicator correctly', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Connection Status Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    // The connection status should be visible in the header\n    // It shows either \"Synced\", \"Syncing...\", or \"Offline\"\n    const header = page.locator('header');\n    await expect(header).toBeVisible();\n\n    // Wait a moment for connection status to update\n    await page.waitForTimeout(2000);\n\n    // Check for any of the connection status indicators\n    // The text could be \"Synced\", \"Syncing...\", or \"Offline\"\n    const syncedText = header.getByText('Synced');\n    const syncingText = header.getByText('Syncing...');\n    const offlineText = header.getByText('Offline');\n\n    // At least one status should be visible\n    const hasSyncedStatus = await syncedText.isVisible().catch(() => false);\n    const hasSyncingStatus = await syncingText.isVisible().catch(() => false);\n    const hasOfflineStatus = await offlineText.isVisible().catch(() => false);\n\n    // One of the statuses should be shown\n    expect(hasSyncedStatus || hasSyncingStatus || hasOfflineStatus).toBe(true);\n  });\n\n  test('should render the map title input correctly', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Title Input Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    // The map title input should be visible in the header\n    const titleInput = page.getByTestId('map-title-input');\n    await expect(titleInput).toBeVisible();\n\n    // Verify the title is set correctly\n    const value = await titleInput.inputValue();\n    expect(value.length).toBeGreaterThan(0);\n  });\n\n  test('should handle viewport changes without affecting presence tracking', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Viewport Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    // Get initial viewport state\n    const viewport = page.locator('.react-flow__viewport');\n    await expect(viewport).toBeVisible();\n\n    // Simulate panning by dragging on the pane\n    const pane = page.locator('.react-flow__pane');\n    const paneBox = await pane.boundingBox();\n\n    if (paneBox) {\n      // Pan the viewport\n      await page.mouse.move(paneBox.x + paneBox.width / 2, paneBox.y + paneBox.height / 2);\n      await page.mouse.down();\n      await page.mouse.move(\n        paneBox.x + paneBox.width / 2 + 100,\n        paneBox.y + paneBox.height / 2 + 100,\n        { steps: 5 }\n      );\n      await page.mouse.up();\n\n      // Wait for viewport update to be processed\n      await page.waitForTimeout(300);\n    }\n\n    // Verify the page is still responsive\n    await expect(page.locator('.react-flow')).toBeVisible();\n\n    // Move mouse to trigger cursor update after viewport change\n    if (paneBox) {\n      await page.mouse.move(\n        paneBox.x + paneBox.width / 2,\n        paneBox.y + paneBox.height / 2\n      );\n    }\n\n    // Verify nodes are still visible\n    const nodes = page.locator('.react-flow__node');\n    await expect(nodes.first()).toBeVisible();\n  });\n});\n\n/**\n * Test for verifying activity status tracking\n */\ntest.describe('Activity Status Verification', () => {\n  test('should track activity and update status correctly', async ({ page }) => {\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Activity Status Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    // Perform some activity\n    const pane = page.locator('.react-flow__pane');\n    const paneBox = await pane.boundingBox();\n\n    if (paneBox) {\n      // Move mouse to trigger activity\n      for (let i = 0; i < 5; i++) {\n        await page.mouse.move(\n          paneBox.x + Math.random() * paneBox.width,\n          paneBox.y + Math.random() * paneBox.height\n        );\n        await page.waitForTimeout(100);\n      }\n    }\n\n    // Verify the page is still responsive\n    await expect(page.locator('.react-flow')).toBeVisible();\n\n    // Note: Testing activity status transitions to 'idle' or 'away' would require\n    // waiting for the configured thresholds (10s for idle, 60s for away),\n    // which is too long for a verification test. The fact that activity tracking\n    // doesn't cause errors is sufficient for verification.\n  });\n});\n\n/**\n * Test for component rendering verification\n */\ntest.describe('Presence Components Verification', () => {\n  test('should not crash when presence components are rendered', async ({ page }) => {\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    const buttonVisible = await newMapButton.isVisible().catch(() => false);\n\n    if (buttonVisible) {\n      await newMapButton.click();\n      const dialog = page.getByTestId('create-map-dialog');\n      await expect(dialog).toBeVisible({ timeout: 5000 });\n      await page.getByTestId('map-title-input').fill('Components Test Map');\n      await page.getByTestId('create-map-submit').click();\n      await page.waitForURL(/\\/map\\//, { timeout: 15000 });\n    }\n\n    // Wait for React Flow\n    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10000 });\n\n    // The presence list might not be visible if there are no other collaborators\n    // but the component should still be rendered without errors\n    // The fact that the page loads successfully indicates the components work\n\n    // Wait a moment to ensure all components are rendered\n    await page.waitForTimeout(500);\n\n    // Verify the header is visible (contains PresenceList)\n    const header = page.locator('header');\n    await expect(header).toBeVisible();\n\n    // Verify React Flow is still working (Cursors component is rendered inside)\n    await expect(page.locator('.react-flow')).toBeVisible();\n\n    // Verify nodes are visible\n    const nodes = page.locator('.react-flow__node');\n    await expect(nodes.first()).toBeVisible();\n  });\n});\n"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "completed",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "completed",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "completed",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "completed",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "completed",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "in_progress",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "pending",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}
Now let me run the Playwright test. First, let me check if we need to build the types package:

🔧 Tool: Bash
Input: {
  "command": "pnpm build --filter=@mindmapper/types 2>&1 | head -30",
  "description": "Build the types package",
  "timeout": 60000
}
Types package built successfully. Now let me run the Playwright test:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright test awareness-protocol-verification.spec.ts --reporter=list 2>&1",
  "description": "Run Playwright test for awareness protocol",
  "timeout": 180000
}
The Playwright tests failed due to missing system libraries for headless Chrome in this environment. This is an infrastructure issue, not a code issue. Let me verify the code compiles correctly by running a TypeScript check instead:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx tsc --noEmit 2>&1 | head -50",
  "description": "TypeScript type check",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "pnpm exec tsc --noEmit 2>&1 | head -100",
  "description": "TypeScript type check with pnpm",
  "timeout": 120000
}
I need to fix these TypeScript errors. Let me update the awareness-protocol.ts file:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "offset": 1,
  "limit": 50
}

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "content": "/**\n * Awareness Protocol Implementation\n *\n * This module provides a comprehensive awareness protocol for real-time collaboration.\n * It handles:\n * - User presence tracking\n * - Cursor position broadcasting\n * - Node selection sharing\n * - Viewport synchronization\n * - Activity status management\n * - Stale user cleanup\n */\n\nimport type {\n  AwarenessState,\n  AwarenessStateUpdate,\n  AwarenessConfig,\n  AwarenessEvent,\n  AwarenessEventType,\n  ActivityStatus,\n  CursorPosition,\n  Viewport,\n} from '@mindmapper/types';\nimport { DEFAULT_AWARENESS_CONFIG } from '@mindmapper/types';\n\n// Re-export types for convenience\nexport type {\n  AwarenessState,\n  AwarenessStateUpdate,\n  AwarenessConfig,\n  AwarenessEvent,\n  AwarenessEventType,\n  ActivityStatus,\n  CursorPosition,\n  Viewport,\n};\n\nexport { DEFAULT_AWARENESS_CONFIG };\n\n/**\n * Awareness type from y-protocols\n * We use a minimal interface to avoid importing the full library\n */\ninterface Awareness {\n  clientID: number;\n  getLocalState(): AwarenessState | null;\n  setLocalState(state: AwarenessState | null): void;\n  getStates(): Map<number, unknown>;\n  on(event: string, handler: (...args: unknown[]) => void): void;\n  off(event: string, handler: (...args: unknown[]) => void): void;\n}\n\n/**\n * Event listener type for awareness events\n */\nexport type AwarenessEventListener = (event: AwarenessEvent) => void;\n\n/**\n * Throttle function implementation\n */\nfunction throttle<TArgs extends unknown[]>(\n  fn: (...args: TArgs) => void,\n  delay: number\n): (...args: TArgs) => void {\n  let lastCall = 0;\n  let timeoutId: ReturnType<typeof setTimeout> | null = null;\n\n  return (...args: TArgs) => {\n    const now = Date.now();\n    const timeSinceLastCall = now - lastCall;\n\n    if (timeSinceLastCall >= delay) {\n      lastCall = now;\n      fn(...args);\n    } else if (!timeoutId) {\n      timeoutId = setTimeout(() => {\n        lastCall = Date.now();\n        timeoutId = null;\n        fn(...args);\n      }, delay - timeSinceLastCall);\n    }\n  };\n}\n\n/**\n * AwarenessProtocol class manages user presence and collaboration state\n */\nexport class AwarenessProtocol {\n  private awareness: Awareness;\n  private config: AwarenessConfig;\n  private _userId: string;\n  private _userName: string;\n  private _userColor: string;\n  private _avatarUrl?: string;\n\n  private localState: AwarenessState;\n  private remoteStates: Map<string, AwarenessState> = new Map();\n\n  private eventListeners: Map<AwarenessEventType | '*', Set<AwarenessEventListener>> = new Map();\n  private activityCheckInterval: ReturnType<typeof setInterval> | null = null;\n  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;\n\n  // Throttled update functions\n  private throttledCursorUpdate: (cursor: CursorPosition | null) => void;\n  private throttledViewportUpdate: (viewport: Viewport | null) => void;\n\n  constructor(\n    awareness: Awareness,\n    userId: string,\n    userName: string,\n    userColor: string,\n    avatarUrl?: string,\n    config: Partial<AwarenessConfig> = {}\n  ) {\n    this.awareness = awareness;\n    this._userId = userId;\n    this._userName = userName;\n    this._userColor = userColor;\n    this._avatarUrl = avatarUrl;\n    this.config = { ...DEFAULT_AWARENESS_CONFIG, ...config };\n\n    // Initialize local state\n    const now = Date.now();\n    this.localState = {\n      userId,\n      userName,\n      userColor,\n      avatarUrl,\n      cursor: null,\n      selectedNodeIds: [],\n      viewport: null,\n      activityStatus: 'active',\n      lastActiveAt: now,\n      isEditingNodeId: null,\n      clientId: awareness.clientID,\n      connectedAt: now,\n    };\n\n    // Set up throttled update functions\n    this.throttledCursorUpdate = throttle<[CursorPosition | null]>(\n      (cursor) => this._updateCursor(cursor),\n      this.config.cursorThrottleMs\n    );\n    this.throttledViewportUpdate = throttle<[Viewport | null]>(\n      (viewport) => this._updateViewport(viewport),\n      this.config.viewportThrottleMs\n    );\n\n    // Initialize\n    this._initialize();\n  }\n\n  /**\n   * Initialize the awareness protocol\n   */\n  private _initialize(): void {\n    // Set initial local state\n    this._broadcastLocalState();\n\n    // Listen for awareness changes\n    this.awareness.on('update', this._handleAwarenessUpdate.bind(this));\n\n    // Start activity status checking\n    this._startActivityCheck();\n\n    // Start stale user cleanup\n    this._startStaleCheck();\n\n    // Sync initial remote states\n    this._syncRemoteStates();\n  }\n\n  /**\n   * Broadcast local state to all users\n   */\n  private _broadcastLocalState(): void {\n    this.awareness.setLocalState(this.localState);\n  }\n\n  /**\n   * Handle awareness updates from Yjs\n   */\n  private _handleAwarenessUpdate({\n    added,\n    updated,\n    removed,\n  }: {\n    added: number[];\n    updated: number[];\n    removed: number[];\n  }): void {\n    const states = this.awareness.getStates();\n    const now = Date.now();\n\n    // Handle added users\n    for (const clientId of added) {\n      const state = states.get(clientId) as AwarenessState | undefined;\n      if (state && state.userId !== this._userId) {\n        const previousState = this.remoteStates.get(state.userId);\n        this.remoteStates.set(state.userId, state);\n        this._emitEvent({\n          type: 'user-joined',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp: now,\n        });\n      }\n    }\n\n    // Handle updated users\n    for (const clientId of updated) {\n      const state = states.get(clientId) as AwarenessState | undefined;\n      if (state && state.userId !== this._userId) {\n        const previousState = this.remoteStates.get(state.userId);\n        this.remoteStates.set(state.userId, state);\n\n        // Emit specific event types based on what changed\n        if (previousState) {\n          this._emitChangeEvents(state, previousState, now);\n        }\n\n        this._emitEvent({\n          type: 'user-updated',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp: now,\n        });\n      }\n    }\n\n    // Handle removed users\n    for (const clientId of removed) {\n      // Find the user by client ID\n      for (const [userId, state] of this.remoteStates.entries()) {\n        if (state.clientId === clientId) {\n          this.remoteStates.delete(userId);\n          this._emitEvent({\n            type: 'user-left',\n            userId,\n            state,\n            timestamp: now,\n          });\n          break;\n        }\n      }\n    }\n  }\n\n  /**\n   * Emit specific change events based on what changed\n   */\n  private _emitChangeEvents(\n    state: AwarenessState,\n    previousState: AwarenessState,\n    timestamp: number\n  ): void {\n    // Cursor changed\n    if (JSON.stringify(state.cursor) !== JSON.stringify(previousState.cursor)) {\n      this._emitEvent({\n        type: 'cursor-moved',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Selection changed\n    if (JSON.stringify(state.selectedNodeIds) !== JSON.stringify(previousState.selectedNodeIds)) {\n      this._emitEvent({\n        type: 'selection-changed',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Viewport changed\n    if (JSON.stringify(state.viewport) !== JSON.stringify(previousState.viewport)) {\n      this._emitEvent({\n        type: 'viewport-changed',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Activity status changed\n    if (state.activityStatus !== previousState.activityStatus) {\n      this._emitEvent({\n        type: 'activity-changed',\n        userId: state.userId,\n        state,\n        previousState,\n        timestamp,\n      });\n    }\n\n    // Editing state changed\n    if (state.isEditingNodeId !== previousState.isEditingNodeId) {\n      if (state.isEditingNodeId && !previousState.isEditingNodeId) {\n        this._emitEvent({\n          type: 'editing-started',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp,\n        });\n      } else if (!state.isEditingNodeId && previousState.isEditingNodeId) {\n        this._emitEvent({\n          type: 'editing-stopped',\n          userId: state.userId,\n          state,\n          previousState,\n          timestamp,\n        });\n      }\n    }\n  }\n\n  /**\n   * Emit an awareness event\n   */\n  private _emitEvent(event: AwarenessEvent): void {\n    // Emit to specific event type listeners\n    const typeListeners = this.eventListeners.get(event.type);\n    if (typeListeners) {\n      for (const listener of typeListeners) {\n        try {\n          listener(event);\n        } catch (error) {\n          console.error(`[AwarenessProtocol] Error in event listener:`, error);\n        }\n      }\n    }\n\n    // Emit to wildcard listeners\n    const wildcardListeners = this.eventListeners.get('*');\n    if (wildcardListeners) {\n      for (const listener of wildcardListeners) {\n        try {\n          listener(event);\n        } catch (error) {\n          console.error(`[AwarenessProtocol] Error in wildcard listener:`, error);\n        }\n      }\n    }\n  }\n\n  /**\n   * Sync remote states from awareness\n   */\n  private _syncRemoteStates(): void {\n    const states = this.awareness.getStates();\n    const now = Date.now();\n\n    states.forEach((state) => {\n      const awarenessState = state as AwarenessState;\n      if (awarenessState.userId && awarenessState.userId !== this._userId) {\n        const previousState = this.remoteStates.get(awarenessState.userId);\n        this.remoteStates.set(awarenessState.userId, awarenessState);\n\n        if (!previousState) {\n          this._emitEvent({\n            type: 'user-joined',\n            userId: awarenessState.userId,\n            state: awarenessState,\n            timestamp: now,\n          });\n        }\n      }\n    });\n  }\n\n  /**\n   * Start activity status checking\n   */\n  private _startActivityCheck(): void {\n    this.activityCheckInterval = setInterval(() => {\n      this._updateActivityStatus();\n    }, this.config.activityPollMs);\n  }\n\n  /**\n   * Start stale user cleanup\n   */\n  private _startStaleCheck(): void {\n    this.staleCheckInterval = setInterval(() => {\n      this._cleanupStaleUsers();\n    }, this.config.staleTimeoutMs / 2);\n  }\n\n  /**\n   * Update activity status based on last activity time\n   */\n  private _updateActivityStatus(): void {\n    const now = Date.now();\n    const timeSinceLastActivity = now - this.localState.lastActiveAt;\n\n    let newStatus: ActivityStatus;\n    if (timeSinceLastActivity < this.config.idleThresholdMs) {\n      newStatus = 'active';\n    } else if (timeSinceLastActivity < this.config.awayThresholdMs) {\n      newStatus = 'idle';\n    } else {\n      newStatus = 'away';\n    }\n\n    if (newStatus !== this.localState.activityStatus) {\n      this.localState.activityStatus = newStatus;\n      this._broadcastLocalState();\n    }\n  }\n\n  /**\n   * Clean up stale users that haven't been heard from\n   */\n  private _cleanupStaleUsers(): void {\n    const now = Date.now();\n\n    for (const [userId, state] of this.remoteStates.entries()) {\n      const timeSinceLastUpdate = now - state.lastActiveAt;\n      if (timeSinceLastUpdate > this.config.staleTimeoutMs) {\n        this.remoteStates.delete(userId);\n        this._emitEvent({\n          type: 'user-left',\n          userId,\n          state,\n          timestamp: now,\n        });\n      }\n    }\n  }\n\n  /**\n   * Record user activity (call on any user interaction)\n   */\n  public recordActivity(): void {\n    const now = Date.now();\n    if (this.localState.activityStatus !== 'active' || now - this.localState.lastActiveAt > 1000) {\n      this.localState.lastActiveAt = now;\n      if (this.localState.activityStatus !== 'active') {\n        this.localState.activityStatus = 'active';\n        this._broadcastLocalState();\n      }\n    }\n  }\n\n  /**\n   * Update cursor position (throttled)\n   */\n  public updateCursor(cursor: CursorPosition | null): void {\n    this.recordActivity();\n    this.throttledCursorUpdate(cursor);\n  }\n\n  /**\n   * Internal cursor update (called by throttled function)\n   */\n  private _updateCursor(cursor: CursorPosition | null): void {\n    this.localState.cursor = cursor;\n    this._broadcastLocalState();\n  }\n\n  /**\n   * Update selected nodes\n   */\n  public updateSelectedNodes(nodeIds: string[]): void {\n    this.recordActivity();\n    if (JSON.stringify(this.localState.selectedNodeIds) !== JSON.stringify(nodeIds)) {\n      this.localState.selectedNodeIds = nodeIds;\n      this._broadcastLocalState();\n    }\n  }\n\n  /**\n   * Update selected node (single selection convenience method)\n   */\n  public updateSelectedNode(nodeId: string | null): void {\n    this.updateSelectedNodes(nodeId ? [nodeId] : []);\n  }\n\n  /**\n   * Update viewport (throttled)\n   */\n  public updateViewport(viewport: Viewport | null): void {\n    this.throttledViewportUpdate(viewport);\n  }\n\n  /**\n   * Internal viewport update (called by throttled function)\n   */\n  private _updateViewport(viewport: Viewport | null): void {\n    this.localState.viewport = viewport;\n    this._broadcastLocalState();\n  }\n\n  /**\n   * Set editing node\n   */\n  public setEditingNode(nodeId: string | null): void {\n    this.recordActivity();\n    if (this.localState.isEditingNodeId !== nodeId) {\n      this.localState.isEditingNodeId = nodeId;\n      this._broadcastLocalState();\n    }\n  }\n\n  /**\n   * Get local awareness state\n   */\n  public getLocalState(): AwarenessState {\n    return { ...this.localState };\n  }\n\n  /**\n   * Get all remote user states\n   */\n  public getRemoteStates(): AwarenessState[] {\n    return Array.from(this.remoteStates.values());\n  }\n\n  /**\n   * Get a specific user's state\n   */\n  public getUserState(userId: string): AwarenessState | undefined {\n    if (userId === this._userId) {\n      return this.getLocalState();\n    }\n    return this.remoteStates.get(userId);\n  }\n\n  /**\n   * Get all states (including local user)\n   */\n  public getAllStates(): AwarenessState[] {\n    return [this.getLocalState(), ...this.getRemoteStates()];\n  }\n\n  /**\n   * Add event listener\n   */\n  public on(\n    eventType: AwarenessEventType | '*',\n    listener: AwarenessEventListener\n  ): () => void {\n    if (!this.eventListeners.has(eventType)) {\n      this.eventListeners.set(eventType, new Set());\n    }\n    this.eventListeners.get(eventType)!.add(listener);\n\n    // Return unsubscribe function\n    return () => {\n      this.eventListeners.get(eventType)?.delete(listener);\n    };\n  }\n\n  /**\n   * Remove event listener\n   */\n  public off(\n    eventType: AwarenessEventType | '*',\n    listener: AwarenessEventListener\n  ): void {\n    this.eventListeners.get(eventType)?.delete(listener);\n  }\n\n  /**\n   * Update user info (name, color, avatar)\n   */\n  public updateUserInfo(updates: {\n    userName?: string;\n    userColor?: string;\n    avatarUrl?: string;\n  }): void {\n    if (updates.userName !== undefined) {\n      this._userName = updates.userName;\n      this.localState.userName = updates.userName;\n    }\n    if (updates.userColor !== undefined) {\n      this._userColor = updates.userColor;\n      this.localState.userColor = updates.userColor;\n    }\n    if (updates.avatarUrl !== undefined) {\n      this._avatarUrl = updates.avatarUrl;\n      this.localState.avatarUrl = updates.avatarUrl;\n    }\n    this._broadcastLocalState();\n  }\n\n  /**\n   * Destroy the awareness protocol instance\n   */\n  public destroy(): void {\n    if (this.activityCheckInterval) {\n      clearInterval(this.activityCheckInterval);\n      this.activityCheckInterval = null;\n    }\n    if (this.staleCheckInterval) {\n      clearInterval(this.staleCheckInterval);\n      this.staleCheckInterval = null;\n    }\n\n    this.eventListeners.clear();\n    this.remoteStates.clear();\n\n    // Remove local state from awareness\n    this.awareness.setLocalState(null);\n  }\n}\n\n/**\n * Create an awareness protocol instance\n */\nexport function createAwarenessProtocol(\n  awareness: Awareness,\n  userId: string,\n  userName: string,\n  userColor: string,\n  avatarUrl?: string,\n  config?: Partial<AwarenessConfig>\n): AwarenessProtocol {\n  return new AwarenessProtocol(\n    awareness,\n    userId,\n    userName,\n    userColor,\n    avatarUrl,\n    config\n  );\n}\n\n/**\n * Convert legacy awareness state format to new format\n * This helps with backwards compatibility\n */\nexport function convertLegacyState(legacyState: {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeId: string | null;\n}): AwarenessState {\n  const now = Date.now();\n  return {\n    userId: legacyState.id,\n    userName: legacyState.name,\n    userColor: legacyState.color,\n    cursor: legacyState.cursor,\n    selectedNodeIds: legacyState.selectedNodeId ? [legacyState.selectedNodeId] : [],\n    viewport: null,\n    activityStatus: 'active',\n    lastActiveAt: now,\n    isEditingNodeId: null,\n    clientId: 0,\n    connectedAt: now,\n  };\n}\n\n/**\n * Convert new awareness state to legacy format for backwards compatibility\n */\nexport function convertToLegacyState(state: AwarenessState): {\n  id: string;\n  name: string;\n  color: string;\n  cursor: { x: number; y: number } | null;\n  selectedNodeId: string | null;\n} {\n  return {\n    id: state.userId,\n    name: state.userName,\n    color: state.userColor,\n    cursor: state.cursor ? { x: state.cursor.x, y: state.cursor.y } : null,\n    selectedNodeId: state.selectedNodeIds[0] || null,\n  };\n}\n"
}
Now let me fix the unused variable error in Cursors.tsx:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/collaboration/Cursors.tsx",
  "old_string": "interface UseRemoteCursorsOptions {\n  getAwarenessStates: () => CursorState[];\n  updateCursor: (x: number, y: number) => void;\n}\n\nexport function useRemoteCursors({\n  getAwarenessStates,\n  updateCursor,\n}: UseRemoteCursorsOptions) {\n  // This hook is now mostly handled by usePresence\n  // Keeping for backwards compatibility\n  return {\n    awarenessStates: getAwarenessStates(),\n  };\n}",
  "new_string": "interface UseRemoteCursorsOptions {\n  getAwarenessStates: () => CursorState[];\n  updateCursor?: (x: number, y: number) => void;\n}\n\nexport function useRemoteCursors({\n  getAwarenessStates,\n  // updateCursor is kept for backwards compatibility but not used\n  // eslint-disable-next-line @typescript-eslint/no-unused-vars\n  updateCursor: _updateCursor,\n}: UseRemoteCursorsOptions) {\n  // This hook is now mostly handled by usePresence\n  // Keeping for backwards compatibility\n  return {\n    awarenessStates: getAwarenessStates(),\n  };\n}"
}
Now let me run the TypeScript check again:

🔧 Tool: Bash
Input: {
  "command": "pnpm exec tsc --noEmit 2>&1 | head -30",
  "description": "TypeScript type check",
  "timeout": 60000
}
Let me fix these remaining TypeScript issues:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "old_string": "/**\n * AwarenessProtocol class manages user presence and collaboration state\n */\nexport class AwarenessProtocol {\n  private awareness: Awareness;\n  private config: AwarenessConfig;\n  private _userId: string;\n  private _userName: string;\n  private _userColor: string;\n  private _avatarUrl?: string;\n\n  private localState: AwarenessState;",
  "new_string": "/**\n * AwarenessProtocol class manages user presence and collaboration state\n */\nexport class AwarenessProtocol {\n  private awareness: Awareness;\n  private config: AwarenessConfig;\n  private _userId: string;\n\n  private localState: AwarenessState;"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "old_string": "  constructor(\n    awareness: Awareness,\n    userId: string,\n    userName: string,\n    userColor: string,\n    avatarUrl?: string,\n    config: Partial<AwarenessConfig> = {}\n  ) {\n    this.awareness = awareness;\n    this._userId = userId;\n    this._userName = userName;\n    this._userColor = userColor;\n    this._avatarUrl = avatarUrl;\n    this.config = { ...DEFAULT_AWARENESS_CONFIG, ...config };",
  "new_string": "  constructor(\n    awareness: Awareness,\n    userId: string,\n    userName: string,\n    userColor: string,\n    avatarUrl?: string,\n    config: Partial<AwarenessConfig> = {}\n  ) {\n    this.awareness = awareness;\n    this._userId = userId;\n    this.config = { ...DEFAULT_AWARENESS_CONFIG, ...config };"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "old_string": "  /**\n   * Update user info (name, color, avatar)\n   */\n  public updateUserInfo(updates: {\n    userName?: string;\n    userColor?: string;\n    avatarUrl?: string;\n  }): void {\n    if (updates.userName !== undefined) {\n      this._userName = updates.userName;\n      this.localState.userName = updates.userName;\n    }\n    if (updates.userColor !== undefined) {\n      this._userColor = updates.userColor;\n      this.localState.userColor = updates.userColor;\n    }\n    if (updates.avatarUrl !== undefined) {\n      this._avatarUrl = updates.avatarUrl;\n      this.localState.avatarUrl = updates.avatarUrl;\n    }\n    this._broadcastLocalState();\n  }",
  "new_string": "  /**\n   * Update user info (name, color, avatar)\n   */\n  public updateUserInfo(updates: {\n    userName?: string;\n    userColor?: string;\n    avatarUrl?: string;\n  }): void {\n    if (updates.userName !== undefined) {\n      this.localState.userName = updates.userName;\n    }\n    if (updates.userColor !== undefined) {\n      this.localState.userColor = updates.userColor;\n    }\n    if (updates.avatarUrl !== undefined) {\n      this.localState.avatarUrl = updates.avatarUrl;\n    }\n    this._broadcastLocalState();\n  }"
}
Now let me fix the awareness update handler issue:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "old_string": "    // Listen for awareness changes\n    this.awareness.on('update', this._handleAwarenessUpdate.bind(this));",
  "new_string": "    // Listen for awareness changes\n    this.awareness.on('update', (args: unknown) => {\n      const update = args as { added: number[]; updated: number[]; removed: number[] };\n      this._handleAwarenessUpdate(update);\n    });"
}
Now let me fix the issue with usePresence - the awareness type coming from y-protocols has a different interface. Let me update the Awareness interface to be more flexible:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "old_string": "/**\n * Awareness type from y-protocols\n * We use a minimal interface to avoid importing the full library\n */\ninterface Awareness {\n  clientID: number;\n  getLocalState(): AwarenessState | null;\n  setLocalState(state: AwarenessState | null): void;\n  getStates(): Map<number, unknown>;\n  on(event: string, handler: (...args: unknown[]) => void): void;\n  off(event: string, handler: (...args: unknown[]) => void): void;\n}",
  "new_string": "/**\n * Awareness type from y-protocols\n * We use a minimal interface to avoid importing the full library\n * This interface is compatible with y-protocols/awareness.Awareness\n */\nexport interface Awareness {\n  clientID: number;\n  getLocalState(): Record<string, unknown> | null;\n  setLocalState(state: Record<string, unknown> | null): void;\n  getStates(): Map<number, Record<string, unknown>>;\n  on(event: string, handler: (...args: unknown[]) => void): void;\n  off(event: string, handler: (...args: unknown[]) => void): void;\n}"
}

🔧 Tool: Bash
Input: {
  "command": "pnpm exec tsc --noEmit 2>&1 | head -30",
  "description": "TypeScript type check",
  "timeout": 60000
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "old_string": "  /**\n   * Broadcast local state to all users\n   */\n  private _broadcastLocalState(): void {\n    this.awareness.setLocalState(this.localState);\n  }",
  "new_string": "  /**\n   * Broadcast local state to all users\n   */\n  private _broadcastLocalState(): void {\n    this.awareness.setLocalState(this.localState as unknown as Record<string, unknown>);\n  }"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "offset": 355,
  "limit": 15
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts",
  "old_string": "  private _syncRemoteStates(): void {\n    const states = this.awareness.getStates();\n    const now = Date.now();\n\n    states.forEach((state) => {\n      const awarenessState = state as AwarenessState;",
  "new_string": "  private _syncRemoteStates(): void {\n    const states = this.awareness.getStates();\n    const now = Date.now();\n\n    states.forEach((state) => {\n      const awarenessState = state as unknown as AwarenessState;"
}

🔧 Tool: Bash
Input: {
  "command": "pnpm exec tsc --noEmit 2>&1 | head -30",
  "description": "TypeScript type check",
  "timeout": 60000
}
TypeScript now passes. Now let me try building the project to verify it compiles correctly:

🔧 Tool: Bash
Input: {
  "command": "pnpm build --filter=@mindmapper/web 2>&1 | tail -30",
  "description": "Build the web app",
  "timeout": 180000
}
The build is successful. Now let me clean up the test file and update the todos:

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/awareness-protocol-verification.spec.ts",
  "description": "Delete verification test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Add AwarenessState types to shared types package",
      "status": "completed",
      "activeForm": "Adding AwarenessState types to shared types package"
    },
    {
      "content": "Create awareness protocol module in web app",
      "status": "completed",
      "activeForm": "Creating awareness protocol module in web app"
    },
    {
      "content": "Enhance usePresence hook with viewport and activity tracking",
      "status": "completed",
      "activeForm": "Enhancing usePresence hook with viewport and activity tracking"
    },
    {
      "content": "Update Cursors component to show activity status",
      "status": "completed",
      "activeForm": "Updating Cursors component to show activity status"
    },
    {
      "content": "Update PresenceList component with activity indicators",
      "status": "completed",
      "activeForm": "Updating PresenceList component with activity indicators"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run Playwright test and verify feature works",
      "status": "completed",
      "activeForm": "Running Playwright test and verifying feature works"
    },
    {
      "content": "Clean up verification test file",
      "status": "completed",
      "activeForm": "Cleaning up verification test file"
    }
  ]
}
<summary>
## Summary: Implement Awareness Protocol for Broadcasting User Presence

### Changes Implemented

1. **Added comprehensive AwarenessState types to the shared types package** (`packages/types/src/index.ts`):
   - `ActivityStatus` type (`'active' | 'idle' | 'away'`)
   - `Viewport` interface for tracking canvas position and zoom
   - `CursorPosition` interface with optional canvas coordinates
   - `AwarenessState` interface with full user presence data including:
     - User identification (userId, userName, userColor, avatarUrl)
     - Cursor tracking
     - Multi-node selection support
     - Viewport tracking
     - Activity status with timestamps
     - Editing state (which node user is editing)
     - Client metadata (clientId, connectedAt)
   - `AwarenessStateUpdate` for partial updates
   - `AwarenessConfig` for protocol configuration
   - `AwarenessEvent` and `AwarenessEventType` for event handling
   - `DEFAULT_AWARENESS_CONFIG` with sensible defaults

2. **Created new awareness protocol module** (`apps/web/src/lib/awareness-protocol.ts`):
   - `AwarenessProtocol` class with full lifecycle management
   - Throttled cursor and viewport updates
   - Activity status auto-detection (active/idle/away)
   - Stale user cleanup
   - Event system for awareness changes (user-joined, user-left, cursor-moved, etc.)
   - Backwards compatibility with legacy state format
   - Helper functions: `createAwarenessProtocol`, `convertLegacyState`, `convertToLegacyState`

3. **Enhanced usePresence hook** (`apps/web/src/hooks/usePresence.ts`):
   - Integrated new AwarenessProtocol
   - Added `enhancedStates` and `enhancedCurrentUser` for full awareness data
   - Added `updateSelectedNodes` for multi-selection support
   - Added `updateViewport` for viewport tracking
   - Added `setEditingNode` for editing state
   - Added `recordActivity` for manual activity recording
   - Added `onAwarenessEvent` for event subscription
   - Maintained backwards compatibility with legacy `awarenessStates` format

4. **Updated Cursors component** (`apps/web/src/components/collaboration/Cursors.tsx`):
   - Support for both legacy and enhanced presence formats
   - Activity status indicators (green/yellow/gray dots)
   - Opacity adjustment based on activity status
   - Editing indicator icon
   - Added `data-testid` attributes for testing

5. **Updated PresenceList component** (`apps/web/src/components/collaboration/PresenceList.tsx`):
   - Support for both legacy and enhanced presence formats
   - Activity status color coding
   - Avatar URL support
   - Editing indicator with pulse animation
   - Optional tooltip with activity details
   - New `PresencePanel` component for detailed presence view
   - Enhanced `PresenceAvatar` with activity status

### Files Modified
- `/projects/mindmapper/packages/types/src/index.ts` - Added awareness protocol types
- `/projects/mindmapper/apps/web/src/lib/awareness-protocol.ts` - New file
- `/projects/mindmapper/apps/web/src/hooks/usePresence.ts` - Enhanced with new protocol
- `/projects/mindmapper/apps/web/src/components/collaboration/Cursors.tsx` - Updated for activity status
- `/projects/mindmapper/apps/web/src/components/collaboration/PresenceList.tsx` - Updated for activity status

### Verification Status
- TypeScript compilation: **PASSED** (no errors)
- Production build: **PASSED** (completed successfully)
- Playwright tests: Could not run due to missing browser dependencies in the environment (libglib-2.0.so.0), but the code compiles and builds correctly

### Notes for Developer
1. The implementation maintains full backwards compatibility with the existing legacy awareness format
2. Activity status thresholds are configurable via `AwarenessConfig`:
   - `idleThresholdMs`: 10 seconds (default)
   - `awayThresholdMs`: 60 seconds (default)
   - `staleTimeoutMs`: 30 seconds (default) for auto-removing inactive users
3. Cursor updates are throttled at 50ms, viewport updates at 200ms for performance
4. The new `enhancedStates` provides richer data including viewport position, multi-selection, and editing state
5. Event subscription via `onAwarenessEvent` allows components to react to specific awareness changes
</summary>