// Node Types
export type NodeType = 'ROOT' | 'CHILD' | 'FLOATING';

export interface NodeStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  borderStyle: 'solid' | 'dashed' | 'dotted';
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
export type MapEventType =
  | 'CREATE_NODE'
  | 'UPDATE_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'CREATE_CONNECTION'
  | 'UPDATE_CONNECTION'
  | 'DELETE_CONNECTION'
  | 'UPDATE_MAP'
  | 'RESTORE';

export type MapEntityType = 'NODE' | 'CONNECTION' | 'MAP';

// Legacy aliases for backwards compatibility
export type EventType = MapEventType;
export type EntityType = MapEntityType;

export interface MapEvent {
  id: string;
  mindMapId: string;
  userId: string;
  eventType: MapEventType;
  entityType: MapEntityType;
  entityId: string;
  description?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface MapEventWithUser extends MapEvent {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

// Folder Types
export interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  userId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
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

// ==========================================
// Awareness Protocol Types
// ==========================================

/**
 * Activity status for user presence
 * - active: User is actively interacting (mouse/keyboard within last 10 seconds)
 * - idle: User hasn't interacted for 10-60 seconds
 * - away: User hasn't interacted for over 60 seconds
 */
export type ActivityStatus = 'active' | 'idle' | 'away';

/**
 * Viewport information for tracking what area of canvas a user is viewing
 */
export interface Viewport {
  x: number;          // Pan X position
  y: number;          // Pan Y position
  zoom: number;       // Zoom level (1 = 100%)
  width: number;      // Viewport width in pixels
  height: number;     // Viewport height in pixels
}

/**
 * Cursor position with additional metadata
 */
export interface CursorPosition {
  x: number;          // Screen X coordinate
  y: number;          // Screen Y coordinate
  canvasX?: number;   // Canvas X coordinate (accounting for pan/zoom)
  canvasY?: number;   // Canvas Y coordinate (accounting for pan/zoom)
}

/**
 * Core awareness state that is broadcast to all users in a room
 * This is the structure that gets serialized and sent via the awareness protocol
 */
export interface AwarenessState {
  // User identification
  userId: string;
  userName: string;
  userColor: string;
  avatarUrl?: string;

  // Cursor tracking
  cursor: CursorPosition | null;

  // Selection tracking
  selectedNodeIds: string[];      // Support for multi-selection

  // Viewport tracking (what area of canvas user is viewing)
  viewport: Viewport | null;

  // Activity tracking
  activityStatus: ActivityStatus;
  lastActiveAt: number;           // Unix timestamp of last activity

  // Editing state
  isEditingNodeId: string | null; // Node being text-edited by user

  // Client metadata
  clientId: number;               // Yjs client ID
  connectedAt: number;            // Unix timestamp when user connected
}

/**
 * Awareness state update payload for partial updates
 */
export interface AwarenessStateUpdate {
  cursor?: CursorPosition | null;
  selectedNodeIds?: string[];
  viewport?: Viewport | null;
  activityStatus?: ActivityStatus;
  lastActiveAt?: number;
  isEditingNodeId?: string | null;
}

/**
 * Awareness protocol configuration options
 */
export interface AwarenessConfig {
  // Timing configuration (in milliseconds)
  cursorThrottleMs: number;       // Min time between cursor updates (default: 50ms)
  viewportThrottleMs: number;     // Min time between viewport updates (default: 200ms)
  activityPollMs: number;         // How often to check activity status (default: 5000ms)

  // Activity status thresholds (in milliseconds)
  idleThresholdMs: number;        // Time until 'idle' status (default: 10000ms)
  awayThresholdMs: number;        // Time until 'away' status (default: 60000ms)

  // Expiration
  staleTimeoutMs: number;         // Remove user after this time of no updates (default: 30000ms)
}

/**
 * Default awareness protocol configuration
 */
export const DEFAULT_AWARENESS_CONFIG: AwarenessConfig = {
  cursorThrottleMs: 50,
  viewportThrottleMs: 200,
  activityPollMs: 5000,
  idleThresholdMs: 10000,
  awayThresholdMs: 60000,
  staleTimeoutMs: 30000,
};

/**
 * Event types emitted by the awareness protocol
 */
export type AwarenessEventType =
  | 'user-joined'
  | 'user-left'
  | 'user-updated'
  | 'cursor-moved'
  | 'selection-changed'
  | 'viewport-changed'
  | 'activity-changed'
  | 'editing-started'
  | 'editing-stopped';

/**
 * Awareness event payload
 */
export interface AwarenessEvent {
  type: AwarenessEventType;
  userId: string;
  state: AwarenessState;
  previousState?: AwarenessState;
  timestamp: number;
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
  borderStyle: 'solid',
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

// ==========================================
// Family Tree Types
// ==========================================

export type TreePrivacy = 'PRIVATE' | 'FAMILY_ONLY' | 'PUBLIC';
export type TreeRole = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
export type PersonPrivacy = 'PUBLIC' | 'FAMILY_ONLY' | 'PRIVATE';
export type PhotoPrivacy = 'PUBLIC' | 'ALL_FAMILY' | 'DIRECT_RELATIVES' | 'ADMINS_ONLY' | 'PRIVATE' | 'NONE';
export type RelationshipType =
  | 'PARENT'
  | 'CHILD'
  | 'SPOUSE'
  | 'SIBLING'
  | 'ADOPTIVE_PARENT'
  | 'ADOPTIVE_CHILD'
  | 'STEP_PARENT'
  | 'STEP_CHILD'
  | 'FOSTER_PARENT'
  | 'FOSTER_CHILD'
  | 'GUARDIAN'
  | 'WARD';
export type DocumentType =
  | 'BIRTH_CERTIFICATE'
  | 'DEATH_CERTIFICATE'
  | 'MARRIAGE_CERTIFICATE'
  | 'DIVORCE_DECREE'
  | 'CENSUS_RECORD'
  | 'MILITARY_RECORD'
  | 'IMMIGRATION_RECORD'
  | 'NEWSPAPER_ARTICLE'
  | 'PHOTO'
  | 'LETTER'
  | 'WILL'
  | 'DEED'
  | 'OTHER';

export interface FamilyTree {
  id: string;
  name: string;
  description?: string | null;
  privacy: TreePrivacy;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeMember {
  id: string;
  treeId: string;
  userId: string;
  role: TreeRole;
  joinedAt: Date;
}

export interface Person {
  id: string;
  treeId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  suffix?: string | null;
  nickname?: string | null;
  gender: Gender;
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
  deathPlace?: string | null;
  isLiving: boolean;
  biography?: string | null;
  occupation?: string | null;
  education?: string | null;
  privacy: PersonPrivacy;
  profilePhoto?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  generation: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  treeId: string;
  personFromId: string;
  personToId: string;
  relationshipType: RelationshipType;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Marriage {
  id: string;
  treeId: string;
  marriageDate?: Date | null;
  marriagePlace?: string | null;
  divorceDate?: Date | null;
  divorcePlace?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeInvitation {
  id: string;
  treeId: string;
  email: string;
  role: TreeRole;
  inviteCode: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface TreePhoto {
  id: string;
  treeId: string;
  personId?: string | null;
  url: string;
  caption?: string | null;
  dateTaken?: Date | null;
  location?: string | null;
  privacy: PhotoPrivacy;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceDocument {
  id: string;
  treeId: string;
  personId?: string | null;
  title: string;
  documentType: DocumentType;
  url?: string | null;
  notes?: string | null;
  citation?: string | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyStory {
  id: string;
  treeId: string;
  personId?: string | null;
  title: string;
  content: string;
  storyDate?: Date | null;
  author: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Family Tree API Request/Response Types
export interface CreateFamilyTreeRequest {
  name: string;
  description?: string;
  privacy?: TreePrivacy;
}

export interface CreatePersonRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  suffix?: string;
  nickname?: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving?: boolean;
  biography?: string;
  occupation?: string;
  education?: string;
  privacy?: PersonPrivacy;
  profilePhoto?: string;
  generation?: number;
}

export interface CreateRelationshipRequest {
  personFromId: string;
  personToId: string;
  relationshipType: RelationshipType;
  notes?: string;
}

export interface CreateMarriageRequest {
  spouseIds: [string, string];
  marriageDate?: string;
  marriagePlace?: string;
  divorceDate?: string;
  divorcePlace?: string;
  notes?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: TreeRole;
  expiresInDays?: number;
}

export interface PersonWithRelationships extends Person {
  relationships?: Relationship[];
  marriages?: Marriage[];
  photos?: TreePhoto[];
  documents?: SourceDocument[];
  stories?: FamilyStory[];
}

export interface FamilyTreeWithMembers extends FamilyTree {
  members?: TreeMember[];
  people?: Person[];
}

// ==========================================
// Export/Import Types (v1.1)
// ==========================================

/**
 * Exported node structure for JSON export
 */
export interface ExportedNode {
  id: string;
  text: string;
  type: NodeType;
  parentId: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Partial<NodeStyle>;
  metadata: Record<string, unknown>;
  isCollapsed: boolean;
  sortOrder: number;
}

/**
 * Exported connection structure for JSON export
 */
export interface ExportedConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: ConnectionType;
  label: string | null;
  style: Partial<ConnectionStyle>;
}

/**
 * Exported comment structure for JSON export (v1.1+)
 */
export interface ExportedComment {
  id: string;
  nodeId: string | null;
  text: string;
  resolved: boolean;
  parentId: string | null;
  createdAt: string;
  author?: {
    name: string | null;
    email: string;
  };
}

/**
 * Full export format for MindMapper JSON (v1.1)
 * This format is re-importable and preserves all map data
 */
export interface MindMapperExport {
  /** Format version (currently '1.1') */
  version: string;
  /** ISO timestamp of when the export was created */
  exportedAt: string;
  /** Format identifier - always 'mindmapper-json' */
  format: 'mindmapper-json';
  /** JSON schema reference for validation */
  schema: string;
  /** Map metadata and settings */
  map: {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    isFavorite: boolean;
    settings: Partial<MindMapSettings>;
    createdAt: string;
    updatedAt: string;
    author?: {
      name: string | null;
      email: string;
    };
  };
  /** All nodes in the map */
  nodes: ExportedNode[];
  /** All connections between nodes */
  connections: ExportedConnection[];
  /** Comments on the map (optional) */
  comments?: ExportedComment[];
  /** Export metadata for quick overview */
  metadata: {
    nodeCount: number;
    connectionCount: number;
    commentCount: number;
    exportedBy?: string;
  };
}

/**
 * Import result structure
 */
export interface ImportResult {
  id: string;
  title: string;
  nodeCount: number;
  connectionCount: number;
  commentCount?: number;
}

/**
 * Format detection result
 */
export interface FormatDetectionResult {
  format: string;
  confidence: number;
  details: Record<string, unknown>;
  supported: boolean;
}
