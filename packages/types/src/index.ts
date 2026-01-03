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
