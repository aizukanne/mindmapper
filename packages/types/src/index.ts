// Node Types
export type NodeType = 'ROOT' | 'CHILD' | 'FLOATING';

export interface NodeStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  icon?: string;
  shape: 'rectangle' | 'rounded' | 'ellipse' | 'diamond' | 'cloud';
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  id: string;
  text: string;
  type: NodeType;
  parentId?: string | null;
  style: NodeStyle;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
}

export interface MindMapNode {
  id: string;
  type: string;
  position: NodePosition;
  data: NodeData;
  width?: number;
  height?: number;
}

// Connection Types
export type ConnectionType = 'HIERARCHICAL' | 'CROSS_LINK';

export interface ConnectionStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  animated: boolean;
  markerStart?: string;
  markerEnd?: string;
  pathType: 'bezier' | 'smoothstep' | 'step' | 'straight';
}

export interface MindMapConnection {
  id: string;
  source: string;
  target: string;
  type: ConnectionType;
  label?: string;
  style: ConnectionStyle;
}

// Mind Map Types
export interface MindMapSettings {
  canvasBackground: string;
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
  defaultNodeStyle: Partial<NodeStyle>;
  defaultConnectionStyle: Partial<ConnectionStyle>;
  autoLayout: boolean;
  layoutDirection: 'TB' | 'LR' | 'BT' | 'RL' | 'radial';
}

export interface MindMap {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  isPublic: boolean;
  isFavorite: boolean;
  settings: MindMapSettings;
  userId: string;
  folderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultMapSettings: Partial<MindMapSettings>;
  keyboardShortcutsEnabled: boolean;
  autoSaveInterval: number; // in milliseconds
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Share Types
export type Permission = 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER';

export interface Share {
  id: string;
  mindMapId: string;
  userId?: string | null;
  shareToken?: string | null;
  permission: Permission;
  password?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
}

// Comment Types
export interface Comment {
  id: string;
  mindMapId: string;
  nodeId?: string | null;
  userId: string;
  text: string;
  resolved: boolean;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Event Types (for history)
export type EventType =
  | 'CREATE_NODE'
  | 'UPDATE_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'CREATE_CONNECTION'
  | 'UPDATE_CONNECTION'
  | 'DELETE_CONNECTION'
  | 'UPDATE_MAP';

export type EntityType = 'NODE' | 'CONNECTION' | 'MAP';

export interface MapEvent {
  id: string;
  mindMapId: string;
  userId: string;
  eventType: EventType;
  entityType: EntityType;
  entityId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  createdAt: Date;
}

// Folder Types
export interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  userId: string;
  createdAt: Date;
}

// Template Types
export interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  data: {
    nodes: MindMapNode[];
    connections: MindMapConnection[];
    settings: MindMapSettings;
  };
  isPublic: boolean;
  createdBy?: string | null;
  createdAt: Date;
}

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Collaboration Types
export interface UserPresence {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
  cursor?: NodePosition | null;
  selectedNodeId?: string | null;
  lastActive: Date;
}

export interface CollaborationState {
  mapId: string;
  users: UserPresence[];
}

// Yjs Types
export interface YjsNodeData {
  id: string;
  text: string;
  type: NodeType;
  parentId: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  style: NodeStyle;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
  sortOrder: number;
}

export interface YjsConnectionData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: ConnectionType;
  label: string | null;
  style: ConnectionStyle;
}

// Default values
export const DEFAULT_NODE_STYLE: NodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#d1d5db',
  borderWidth: 1,
  borderRadius: 8,
  textColor: '#1f2937',
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  shape: 'rounded',
};

export const DEFAULT_ROOT_NODE_STYLE: NodeStyle = {
  ...DEFAULT_NODE_STYLE,
  backgroundColor: '#3b82f6',
  borderColor: '#2563eb',
  textColor: '#ffffff',
  fontSize: 18,
  fontWeight: 'bold',
  borderRadius: 12,
};

export const DEFAULT_CONNECTION_STYLE: ConnectionStyle = {
  strokeColor: '#9ca3af',
  strokeWidth: 2,
  strokeStyle: 'solid',
  animated: false,
  pathType: 'bezier',
};

export const DEFAULT_MAP_SETTINGS: MindMapSettings = {
  canvasBackground: '#f8fafc',
  gridEnabled: false,
  snapToGrid: false,
  gridSize: 20,
  defaultNodeStyle: DEFAULT_NODE_STYLE,
  defaultConnectionStyle: DEFAULT_CONNECTION_STYLE,
  autoLayout: true,
  layoutDirection: 'LR',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  defaultMapSettings: DEFAULT_MAP_SETTINGS,
  keyboardShortcutsEnabled: true,
  autoSaveInterval: 30000,
};

// Color palette for user presence
export const PRESENCE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];
