/**
 * Node API Service
 * Handles CRUD operations for mind map nodes with backend synchronization.
 */

import { api, ApiError } from './api-client';
import type { NodeStyle } from '@mindmapper/types';

// =============================================================================
// Types
// =============================================================================

export interface NodePosition {
  x: number;
  y: number;
}

export interface CreateNodeRequest {
  parentId: string | null;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  text: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  style?: Partial<NodeStyle>;
}

export interface UpdateNodeRequest {
  text?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  style?: Partial<NodeStyle>;
  isCollapsed?: boolean;
  sortOrder?: number;
}

export interface ApiNode {
  id: string;
  mindMapId: string;
  parentId: string | null;
  type: 'ROOT' | 'CHILD' | 'FLOATING';
  text: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  style: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sortOrder: number;
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  nodeId?: string;
  data?: CreateNodeRequest | UpdateNodeRequest;
}

export interface BatchOperationResult {
  type: string;
  nodeId: string;
  status: string;
}

// =============================================================================
// Node API Functions
// =============================================================================

/**
 * Create a new node in the mind map
 */
export async function createNode(
  mapId: string,
  data: CreateNodeRequest
): Promise<ApiNode> {
  return api.post<ApiNode>(`/api/maps/${mapId}/nodes`, data);
}

/**
 * Update an existing node
 */
export async function updateNode(
  mapId: string,
  nodeId: string,
  data: UpdateNodeRequest
): Promise<ApiNode> {
  return api.put<ApiNode>(`/api/maps/${mapId}/nodes/${nodeId}`, data);
}

/**
 * Delete a node and its children
 */
export async function deleteNode(
  mapId: string,
  nodeId: string
): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/api/maps/${mapId}/nodes/${nodeId}`);
}

/**
 * Update only the position of a node (optimized for dragging)
 */
export async function updateNodePosition(
  mapId: string,
  nodeId: string,
  position: NodePosition
): Promise<void> {
  await api.put(`/api/maps/${mapId}/nodes/${nodeId}/position`, {
    positionX: position.x,
    positionY: position.y,
  });
}

/**
 * Batch operations for multiple node changes
 */
export async function batchNodeOperations(
  mapId: string,
  operations: BatchOperation[]
): Promise<BatchOperationResult[]> {
  const result = await api.post<{ results: BatchOperationResult[] }>(
    `/api/maps/${mapId}/nodes/batch`,
    { operations }
  );
  return result.results;
}

// =============================================================================
// Debounced/Throttled Helpers
// =============================================================================

type DebouncedFn<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

/**
 * Creates a debounced version of a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): DebouncedFn<T> & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

/**
 * Creates a throttled version of a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): DebouncedFn<T> {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

// =============================================================================
// Error Handling Helpers
// =============================================================================

/**
 * Check if an error is a network error (offline)
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR';
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return error instanceof ApiError && error.isRetryable;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to server. Changes will be saved when you\'re back online.';
      case 'UNAUTHORIZED':
        return 'Your session has expired. Please sign in again.';
      case 'FORBIDDEN':
        return 'You don\'t have permission to modify this map.';
      case 'NOT_FOUND':
        return 'The node or map was not found.';
      case 'VALIDATION_ERROR':
        return 'Invalid data provided. Please check your input.';
      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

// =============================================================================
// Offline Queue (for optimistic updates)
// =============================================================================

interface QueuedOperation {
  id: string;
  operation: BatchOperation;
  mapId: string;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private maxRetries = 3;

  add(mapId: string, operation: BatchOperation): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.queue.push({
      id,
      operation,
      mapId,
      timestamp: Date.now(),
      retryCount: 0,
    });
    this.persist();
    return id;
  }

  remove(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.persist();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    // Group operations by mapId for batch processing
    const groupedByMap = new Map<string, QueuedOperation[]>();
    for (const item of this.queue) {
      const existing = groupedByMap.get(item.mapId) || [];
      existing.push(item);
      groupedByMap.set(item.mapId, existing);
    }

    for (const [mapId, operations] of groupedByMap) {
      try {
        await batchNodeOperations(
          mapId,
          operations.map((op) => op.operation)
        );
        // Remove successful operations
        operations.forEach((op) => this.remove(op.id));
      } catch (error) {
        if (!isRetryableError(error)) {
          // Remove non-retryable operations
          operations.forEach((op) => this.remove(op.id));
        } else {
          // Increment retry count
          operations.forEach((op) => {
            const item = this.queue.find((q) => q.id === op.id);
            if (item) {
              item.retryCount++;
              if (item.retryCount >= this.maxRetries) {
                this.remove(item.id);
              }
            }
          });
        }
      }
    }

    this.isProcessing = false;
  }

  private persist(): void {
    try {
      localStorage.setItem('mindmapper_offline_queue', JSON.stringify(this.queue));
    } catch {
      // Ignore storage errors
    }
  }

  load(): void {
    try {
      const stored = localStorage.getItem('mindmapper_offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();

// Load queue on module initialization
if (typeof window !== 'undefined') {
  offlineQueue.load();

  // Process queue when coming back online
  window.addEventListener('online', () => {
    offlineQueue.processQueue();
  });
}
