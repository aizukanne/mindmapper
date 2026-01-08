/**
 * History Tracking Middleware
 *
 * Provides automatic logging of create, update, and delete operations
 * to the database. This middleware captures full change history including
 * previous and new states for complete audit trails.
 */

import { prisma } from '../lib/prisma.js';
import type { MapEventType, MapEntityType } from '@prisma/client';
import type { Request } from 'express';

// ==========================================
// Types
// ==========================================

export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface HistoryMetadata {
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface RecordMapEventOptions {
  mindMapId: string;
  userId: string;
  eventType: MapEventType;
  entityType: MapEntityType;
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  metadata?: HistoryMetadata;
}

export interface RecordTreeActivityOptions {
  treeId: string;
  actorId: string;
  type: TreeActivityType;
  targetPersonId?: string | null;
  targetUserId?: string | null;
  targetPhotoId?: string | null;
  targetDocumentId?: string | null;
  targetStoryId?: string | null;
  metadata?: HistoryMetadata;
  isPrivate?: boolean;
}

// Tree Activity Types matching the Prisma enum
export type TreeActivityType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_ROLE_CHANGED'
  | 'PERSON_ADDED'
  | 'PERSON_UPDATED'
  | 'PERSON_DELETED'
  | 'PERSON_MERGED'
  | 'RELATIONSHIP_ADDED'
  | 'RELATIONSHIP_REMOVED'
  | 'MARRIAGE_ADDED'
  | 'MARRIAGE_REMOVED'
  | 'PHOTO_UPLOADED'
  | 'PHOTO_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'STORY_PUBLISHED'
  | 'STORY_UPDATED'
  | 'SUGGESTION_MADE'
  | 'SUGGESTION_APPROVED'
  | 'SUGGESTION_REJECTED'
  | 'TREE_UPDATED'
  | 'TREE_PRIVACY_CHANGED';

// Fallback user ID for development when auth is disabled
const DEV_USER_ID = 'dev-user-id';

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get user ID from request with fallback for dev mode
 */
export function getUserIdFromRequest(req: Request): string {
  return req.userId || DEV_USER_ID;
}

/**
 * Extract metadata from request for logging
 */
export function extractRequestMetadata(req: Request): HistoryMetadata {
  return {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
  };
}

import type { Prisma } from '@prisma/client';

/**
 * Safely serialize state to JSON-compatible format
 * Uses the same pattern as the existing history.ts
 */
function serializeState(state: unknown): Prisma.InputJsonValue | null {
  if (state === null || state === undefined) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(state));
  } catch {
    // If serialization fails, try to convert to string
    return String(state);
  }
}

/**
 * Generate human-readable description for map events
 */
function generateMapEventDescription(
  eventType: MapEventType,
  entityType: MapEntityType,
  newState?: unknown
): string {
  const descriptions: Record<string, string> = {
    CREATE_NODE: 'Created a new node',
    UPDATE_NODE: 'Updated node',
    DELETE_NODE: 'Deleted node',
    MOVE_NODE: 'Moved node position',
    CREATE_CONNECTION: 'Created a new connection',
    UPDATE_CONNECTION: 'Updated connection',
    DELETE_CONNECTION: 'Deleted connection',
    UPDATE_MAP: 'Updated mind map settings',
    RESTORE: 'Restored from history',
  };

  let description = descriptions[eventType] || `${eventType} on ${entityType}`;

  // Add entity details if available
  if (newState && typeof newState === 'object') {
    const state = newState as Record<string, unknown>;
    if ('text' in state && typeof state.text === 'string') {
      description += `: "${state.text.substring(0, 50)}${state.text.length > 50 ? '...' : ''}"`;
    } else if ('label' in state && typeof state.label === 'string') {
      description += `: "${state.label}"`;
    }
  }

  return description;
}

/**
 * Generate human-readable description for tree activities
 */
function generateTreeActivityDescription(
  type: TreeActivityType,
  metadata?: HistoryMetadata
): string {
  const descriptions: Record<TreeActivityType, string> = {
    MEMBER_JOINED: 'joined the family tree',
    MEMBER_LEFT: 'left the family tree',
    MEMBER_ROLE_CHANGED: 'role was changed',
    PERSON_ADDED: 'added a new person',
    PERSON_UPDATED: 'updated person details',
    PERSON_DELETED: 'deleted a person',
    PERSON_MERGED: 'merged two people',
    RELATIONSHIP_ADDED: 'added a relationship',
    RELATIONSHIP_REMOVED: 'removed a relationship',
    MARRIAGE_ADDED: 'added a marriage record',
    MARRIAGE_REMOVED: 'removed a marriage record',
    PHOTO_UPLOADED: 'uploaded a photo',
    PHOTO_DELETED: 'deleted a photo',
    DOCUMENT_UPLOADED: 'uploaded a document',
    DOCUMENT_APPROVED: 'approved a document',
    DOCUMENT_REJECTED: 'rejected a document',
    STORY_PUBLISHED: 'published a story',
    STORY_UPDATED: 'updated a story',
    SUGGESTION_MADE: 'made a suggestion',
    SUGGESTION_APPROVED: 'approved a suggestion',
    SUGGESTION_REJECTED: 'rejected a suggestion',
    TREE_UPDATED: 'updated tree settings',
    TREE_PRIVACY_CHANGED: 'changed tree privacy',
  };

  let description = descriptions[type] || type;

  // Add details from metadata if available
  if (metadata?.personName) {
    description += `: ${metadata.personName}`;
  }

  return description;
}

// ==========================================
// Map Event Recording
// ==========================================

/**
 * Record a map event for history tracking
 *
 * This function is non-blocking and will not throw errors to avoid
 * interrupting the main operation. Failures are logged to console.
 */
export async function recordMapEvent(options: RecordMapEventOptions): Promise<void> {
  try {
    const description = options.metadata?.description ||
      generateMapEventDescription(options.eventType, options.entityType, options.newState);

    await prisma.mapEvent.create({
      data: {
        mindMapId: options.mindMapId,
        userId: options.userId,
        eventType: options.eventType,
        entityType: options.entityType,
        entityId: options.entityId,
        description,
        // Use ternary pattern matching existing history.ts
        previousState: options.previousState ? JSON.parse(JSON.stringify(options.previousState)) : null,
        newState: options.newState ? JSON.parse(JSON.stringify(options.newState)) : null,
        metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
      },
    });
  } catch (error) {
    // Log but don't throw - history recording shouldn't break main operations
    console.error('[HistoryTracking] Failed to record map event:', error);
  }
}

// ==========================================
// Tree Activity Recording
// ==========================================

/**
 * Record a tree activity for history tracking
 *
 * This function is non-blocking and will not throw errors to avoid
 * interrupting the main operation. Failures are logged to console.
 */
export async function recordTreeActivity(options: RecordTreeActivityOptions): Promise<void> {
  try {
    const description = generateTreeActivityDescription(options.type, options.metadata);

    const serializedMetadata = serializeState(options.metadata) as Record<string, unknown> | null;

    await prisma.treeActivity.create({
      data: {
        treeId: options.treeId,
        actorId: options.actorId,
        type: options.type,
        targetPersonId: options.targetPersonId || null,
        targetUserId: options.targetUserId || null,
        targetPhotoId: options.targetPhotoId || null,
        targetDocumentId: options.targetDocumentId || null,
        targetStoryId: options.targetStoryId || null,
        metadata: {
          ...(serializedMetadata || {}),
          description,
        } as Prisma.InputJsonValue,
        isPrivate: options.isPrivate || false,
      },
    });
  } catch (error) {
    // Log but don't throw - activity recording shouldn't break main operations
    console.error('[HistoryTracking] Failed to record tree activity:', error);
  }
}

// ==========================================
// High-Level Tracking Functions
// ==========================================

/**
 * Track a node operation (create, update, delete)
 */
export async function trackNodeChange(
  req: Request,
  mindMapId: string,
  nodeId: string,
  changeType: ChangeType,
  previousState?: unknown,
  newState?: unknown
): Promise<void> {
  const userId = getUserIdFromRequest(req);
  const metadata = extractRequestMetadata(req);

  const eventTypeMap: Record<ChangeType, MapEventType> = {
    CREATE: 'CREATE_NODE',
    UPDATE: 'UPDATE_NODE',
    DELETE: 'DELETE_NODE',
  };

  await recordMapEvent({
    mindMapId,
    userId,
    eventType: eventTypeMap[changeType],
    entityType: 'NODE',
    entityId: nodeId,
    previousState,
    newState,
    metadata,
  });
}

/**
 * Track a node move operation (separate from update for clarity)
 */
export async function trackNodeMove(
  req: Request,
  mindMapId: string,
  nodeId: string,
  previousPosition: { positionX: number; positionY: number },
  newPosition: { positionX: number; positionY: number }
): Promise<void> {
  const userId = getUserIdFromRequest(req);
  const metadata = extractRequestMetadata(req);

  await recordMapEvent({
    mindMapId,
    userId,
    eventType: 'MOVE_NODE',
    entityType: 'NODE',
    entityId: nodeId,
    previousState: previousPosition,
    newState: newPosition,
    metadata: {
      ...metadata,
      description: `Moved node from (${previousPosition.positionX}, ${previousPosition.positionY}) to (${newPosition.positionX}, ${newPosition.positionY})`,
    },
  });
}

/**
 * Track a connection operation (create, update, delete)
 */
export async function trackConnectionChange(
  req: Request,
  mindMapId: string,
  connectionId: string,
  changeType: ChangeType,
  previousState?: unknown,
  newState?: unknown
): Promise<void> {
  const userId = getUserIdFromRequest(req);
  const metadata = extractRequestMetadata(req);

  const eventTypeMap: Record<ChangeType, MapEventType> = {
    CREATE: 'CREATE_CONNECTION',
    UPDATE: 'UPDATE_CONNECTION',
    DELETE: 'DELETE_CONNECTION',
  };

  await recordMapEvent({
    mindMapId,
    userId,
    eventType: eventTypeMap[changeType],
    entityType: 'CONNECTION',
    entityId: connectionId,
    previousState,
    newState,
    metadata,
  });
}

/**
 * Track a person operation in family tree (create, update, delete)
 */
export async function trackPersonChange(
  req: Request,
  treeId: string,
  personId: string,
  changeType: ChangeType,
  previousState?: unknown,
  newState?: unknown
): Promise<void> {
  const actorId = getUserIdFromRequest(req);
  const metadata = extractRequestMetadata(req);

  const activityTypeMap: Record<ChangeType, TreeActivityType> = {
    CREATE: 'PERSON_ADDED',
    UPDATE: 'PERSON_UPDATED',
    DELETE: 'PERSON_DELETED',
  };

  // Extract person name for description
  let personName: string | undefined;
  const state = (newState || previousState) as Record<string, unknown> | undefined;
  if (state && typeof state === 'object') {
    personName = [state.firstName, state.lastName].filter(Boolean).join(' ');
  }

  await recordTreeActivity({
    treeId,
    actorId,
    type: activityTypeMap[changeType],
    targetPersonId: personId,
    metadata: {
      ...metadata,
      personName,
      previousState: serializeState(previousState),
      newState: serializeState(newState),
    },
  });
}

/**
 * Track a relationship operation in family tree (create, delete)
 */
export async function trackRelationshipChange(
  req: Request,
  treeId: string,
  relationshipId: string,
  changeType: 'CREATE' | 'DELETE',
  relationshipData?: unknown
): Promise<void> {
  const actorId = getUserIdFromRequest(req);
  const metadata = extractRequestMetadata(req);

  const activityTypeMap: Record<'CREATE' | 'DELETE', TreeActivityType> = {
    CREATE: 'RELATIONSHIP_ADDED',
    DELETE: 'RELATIONSHIP_REMOVED',
  };

  await recordTreeActivity({
    treeId,
    actorId,
    type: activityTypeMap[changeType],
    metadata: {
      ...metadata,
      relationshipId,
      relationshipData: serializeState(relationshipData),
    },
  });
}

/**
 * Track mind map settings update
 */
export async function trackMapUpdate(
  req: Request,
  mindMapId: string,
  previousState?: unknown,
  newState?: unknown
): Promise<void> {
  const userId = getUserIdFromRequest(req);
  const metadata = extractRequestMetadata(req);

  await recordMapEvent({
    mindMapId,
    userId,
    eventType: 'UPDATE_MAP',
    entityType: 'MAP',
    entityId: mindMapId,
    previousState,
    newState,
    metadata,
  });
}

// ==========================================
// Batch Operation Support
// ==========================================

export interface BatchOperationResult {
  type: ChangeType;
  entityId: string;
  entityType: 'NODE' | 'CONNECTION';
  previousState?: unknown;
  newState?: unknown;
}

/**
 * Track multiple operations from a batch request
 */
export async function trackBatchOperations(
  req: Request,
  mindMapId: string,
  operations: BatchOperationResult[]
): Promise<void> {
  const userId = getUserIdFromRequest(req);
  const metadata = extractRequestMetadata(req);

  // Record all operations in parallel (fire and forget)
  await Promise.all(
    operations.map((op) => {
      const eventTypeMap: Record<string, MapEventType> = {
        'CREATE-NODE': 'CREATE_NODE',
        'UPDATE-NODE': 'UPDATE_NODE',
        'DELETE-NODE': 'DELETE_NODE',
        'CREATE-CONNECTION': 'CREATE_CONNECTION',
        'UPDATE-CONNECTION': 'UPDATE_CONNECTION',
        'DELETE-CONNECTION': 'DELETE_CONNECTION',
      };

      const eventType = eventTypeMap[`${op.type}-${op.entityType}`];
      if (!eventType) return Promise.resolve();

      return recordMapEvent({
        mindMapId,
        userId,
        eventType,
        entityType: op.entityType,
        entityId: op.entityId,
        previousState: op.previousState,
        newState: op.newState,
        metadata: {
          ...metadata,
          batchOperation: true,
        },
      });
    })
  );
}
