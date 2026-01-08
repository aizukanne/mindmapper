/**
 * Enhanced Y.js WebSocket Provider
 *
 * This module provides a robust WebSocket provider for Yjs collaboration with:
 * - Comprehensive connection state management
 * - Robust reconnection logic with exponential backoff and jitter
 * - Error handling and recovery mechanisms
 * - Event-driven architecture for status updates
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Connection states for granular status tracking
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

// Sync states
export type SyncState = 'unsynced' | 'syncing' | 'synced';

// Error types for categorized error handling
export type WebSocketErrorType =
  | 'connection_failed'
  | 'connection_lost'
  | 'authentication_failed'
  | 'server_error'
  | 'timeout'
  | 'unknown';

// Provider state interface
export interface ProviderState {
  connectionState: ConnectionState;
  syncState: SyncState;
  isConnected: boolean;
  isSynced: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  lastSyncedAt: Date | null;
  latency: number | null;
  error: ProviderError | null;
}

// Error object interface
export interface ProviderError {
  type: WebSocketErrorType;
  message: string;
  timestamp: Date;
  retryable: boolean;
  code?: number;
}

// Configuration options
export interface YjsWebSocketProviderOptions {
  /** WebSocket URL */
  url?: string;
  /** Authentication token */
  token?: string;
  /** Auto-connect on creation */
  connect?: boolean;
  /** Resync interval in milliseconds */
  resyncInterval?: number;
  /** Initial backoff time in milliseconds */
  initialBackoffTime?: number;
  /** Maximum backoff time in milliseconds */
  maxBackoffTime?: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Maximum reconnection attempts (0 = infinite) */
  maxReconnectAttempts?: number;
  /** Add jitter to backoff time (prevents thundering herd) */
  jitter?: boolean;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Enable heartbeat ping/pong */
  heartbeatEnabled?: boolean;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
}

// Event handlers interface
export interface YjsWebSocketProviderEvents {
  onStateChange?: (state: ProviderState) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onSyncChange?: (isSynced: boolean) => void;
  onError?: (error: ProviderError) => void;
  onReconnecting?: (attempt: number, maxAttempts: number, delay: number) => void;
  onReconnected?: () => void;
  onConnectionLost?: () => void;
}

// Default configuration values
const DEFAULT_OPTIONS: Required<
  Omit<YjsWebSocketProviderOptions, 'url' | 'token'>
> = {
  connect: true,
  resyncInterval: 10000,
  initialBackoffTime: 100,
  maxBackoffTime: 30000,
  backoffMultiplier: 1.5,
  maxReconnectAttempts: 0, // Infinite
  jitter: true,
  connectionTimeout: 10000,
  heartbeatEnabled: true,
  heartbeatInterval: 30000,
};

/**
 * Enhanced WebSocket Provider for Yjs
 *
 * Wraps y-websocket provider with additional features:
 * - Granular connection state tracking
 * - Configurable reconnection with exponential backoff
 * - Error categorization and handling
 * - Event-driven status updates
 */
export class YjsWebSocketProvider {
  private provider: WebsocketProvider | null = null;
  private doc: Y.Doc;
  private roomName: string;
  private options: Required<Omit<YjsWebSocketProviderOptions, 'url' | 'token'>> &
    Pick<YjsWebSocketProviderOptions, 'url' | 'token'>;
  private events: YjsWebSocketProviderEvents = {};

  // State tracking
  private _connectionState: ConnectionState = 'disconnected';
  private _syncState: SyncState = 'unsynced';
  private _reconnectAttempts = 0;
  private _lastConnectedAt: Date | null = null;
  private _lastDisconnectedAt: Date | null = null;
  private _lastSyncedAt: Date | null = null;
  private _latency: number | null = null;
  private _error: ProviderError | null = null;

  // Internal timers
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Destruction flag
  private isDestroyed = false;

  constructor(
    roomName: string,
    doc: Y.Doc,
    options?: YjsWebSocketProviderOptions
  ) {
    this.roomName = roomName;
    this.doc = doc;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    if (this.options.connect) {
      this.connect();
    }
  }

  /**
   * Get current provider state
   */
  get state(): ProviderState {
    return {
      connectionState: this._connectionState,
      syncState: this._syncState,
      isConnected: this._connectionState === 'connected',
      isSynced: this._syncState === 'synced',
      isReconnecting: this._connectionState === 'reconnecting',
      reconnectAttempts: this._reconnectAttempts,
      lastConnectedAt: this._lastConnectedAt,
      lastDisconnectedAt: this._lastDisconnectedAt,
      lastSyncedAt: this._lastSyncedAt,
      latency: this._latency,
      error: this._error,
    };
  }

  /**
   * Get awareness instance
   */
  get awareness() {
    return this.provider?.awareness || null;
  }

  /**
   * Get underlying WebSocket provider
   */
  get websocketProvider(): WebsocketProvider | null {
    return this.provider;
  }

  /**
   * Set event handlers
   */
  setEvents(events: YjsWebSocketProviderEvents): void {
    this.events = events;
  }

  /**
   * Add or update specific event handler
   */
  on<K extends keyof YjsWebSocketProviderEvents>(
    event: K,
    handler: YjsWebSocketProviderEvents[K]
  ): void {
    this.events[event] = handler;
  }

  /**
   * Remove event handler
   */
  off<K extends keyof YjsWebSocketProviderEvents>(event: K): void {
    delete this.events[event];
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isDestroyed) {
      console.warn('[YjsWebSocketProvider] Cannot connect - provider is destroyed');
      return;
    }

    if (this._connectionState === 'connected' || this._connectionState === 'connecting') {
      console.warn('[YjsWebSocketProvider] Already connected or connecting');
      return;
    }

    this.clearError();
    this.setConnectionState('connecting');
    this.startConnectionTimeout();

    try {
      this.createProvider();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearTimers();

    if (this.provider) {
      this.provider.disconnect();
    }

    this.setConnectionState('disconnected');
    this.setSyncState('unsynced');
    this._lastDisconnectedAt = new Date();
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    this.disconnect();
    this._reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Destroy provider and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.clearTimers();

    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }

    this.setConnectionState('closed');
    this.events = {};
  }

  /**
   * Create the underlying y-websocket provider
   */
  private createProvider(): void {
    const wsUrl =
      this.options.url ||
      import.meta.env.VITE_YJS_WEBSOCKET_URL ||
      'ws://localhost:3001/yjs';

    this.provider = new WebsocketProvider(wsUrl, this.roomName, this.doc, {
      params: this.options.token ? { token: this.options.token } : undefined,
      connect: true,
      resyncInterval: this.options.resyncInterval,
      maxBackoffTime: this.options.maxBackoffTime,
    });

    this.setupProviderEventHandlers();
  }

  /**
   * Set up event handlers on the y-websocket provider
   */
  private setupProviderEventHandlers(): void {
    if (!this.provider) return;

    // Connection status changes
    this.provider.on('status', (event: { status: string }) => {
      this.clearConnectionTimeout();

      if (event.status === 'connected') {
        this.handleConnected();
      } else if (event.status === 'disconnected') {
        this.handleDisconnected();
      }
    });

    // Sync status changes
    this.provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        this.handleSynced();
      } else {
        this.setSyncState('syncing');
      }
    });

    // Connection close event
    this.provider.on('connection-close', (event: CloseEvent | null) => {
      if (event) {
        this.handleConnectionClose(event);
      }
    });

    // Connection error event
    this.provider.on('connection-error', (event: Event) => {
      this.handleConnectionErrorEvent(event);
    });
  }

  /**
   * Handle successful connection
   */
  private handleConnected(): void {
    this._lastConnectedAt = new Date();
    this._reconnectAttempts = 0;
    this.clearError();
    this.setConnectionState('connected');
    this.setSyncState('syncing');

    if (this.options.heartbeatEnabled) {
      this.startHeartbeat();
    }

    // Notify reconnection success if we were reconnecting
    if (this._lastDisconnectedAt) {
      this.events.onReconnected?.();
    }

    this.events.onConnectionChange?.(true);

    console.log('[YjsWebSocketProvider] Connected to room:', this.roomName);
  }

  /**
   * Handle disconnection
   */
  private handleDisconnected(): void {
    this._lastDisconnectedAt = new Date();
    this.stopHeartbeat();
    this.setSyncState('unsynced');

    // Don't trigger reconnection if explicitly disconnected or destroyed
    if (this.isDestroyed || this._connectionState === 'closed') {
      this.setConnectionState('disconnected');
      return;
    }

    this.events.onConnectionLost?.();
    this.events.onConnectionChange?.(false);

    // Attempt reconnection
    this.scheduleReconnect();

    console.log('[YjsWebSocketProvider] Disconnected from room:', this.roomName);
  }

  /**
   * Handle sync completion
   */
  private handleSynced(): void {
    this._lastSyncedAt = new Date();
    this.setSyncState('synced');
    this.events.onSyncChange?.(true);

    console.log('[YjsWebSocketProvider] Synced with room:', this.roomName);
  }

  /**
   * Handle connection close event
   */
  private handleConnectionClose(event: CloseEvent): void {
    const errorType = this.categorizeCloseCode(event.code);

    if (errorType !== 'unknown' || event.code !== 1000) {
      this.setError({
        type: errorType,
        message: event.reason || `Connection closed with code ${event.code}`,
        timestamp: new Date(),
        retryable: this.isRetryableCloseCode(event.code),
        code: event.code,
      });
    }
  }

  /**
   * Handle connection error event
   */
  private handleConnectionErrorEvent(_event: Event): void {
    this.setError({
      type: 'connection_failed',
      message: 'WebSocket connection error',
      timestamp: new Date(),
      retryable: true,
    });
  }

  /**
   * Handle connection error during setup
   */
  private handleConnectionError(error: Error): void {
    this.clearConnectionTimeout();

    this.setError({
      type: 'connection_failed',
      message: error.message,
      timestamp: new Date(),
      retryable: true,
    });

    this.setConnectionState('error');
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    // Check if reconnection is allowed
    if (this.isDestroyed || this._connectionState === 'closed') {
      return;
    }

    if (
      this.options.maxReconnectAttempts > 0 &&
      this._reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      console.error(
        '[YjsWebSocketProvider] Max reconnection attempts reached:',
        this._reconnectAttempts
      );
      this.setConnectionState('error');
      this.setError({
        type: 'connection_failed',
        message: `Max reconnection attempts (${this.options.maxReconnectAttempts}) reached`,
        timestamp: new Date(),
        retryable: false,
      });
      return;
    }

    this._reconnectAttempts++;
    this.setConnectionState('reconnecting');

    const delay = this.calculateBackoffDelay();

    this.events.onReconnecting?.(
      this._reconnectAttempts,
      this.options.maxReconnectAttempts,
      delay
    );

    console.log(
      `[YjsWebSocketProvider] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed && this._connectionState === 'reconnecting') {
        this.connect();
      }
    }, delay);
  }

  /**
   * Calculate backoff delay with optional jitter
   */
  private calculateBackoffDelay(): number {
    const { initialBackoffTime, maxBackoffTime, backoffMultiplier, jitter } =
      this.options;

    // Exponential backoff: initialTime * (multiplier ^ attempts)
    let delay = Math.min(
      initialBackoffTime * Math.pow(backoffMultiplier, this._reconnectAttempts - 1),
      maxBackoffTime
    );

    // Add jitter (0-50% of the delay) to prevent thundering herd
    if (jitter) {
      const jitterAmount = delay * Math.random() * 0.5;
      delay = delay + jitterAmount;
    }

    return Math.round(delay);
  }

  /**
   * Categorize WebSocket close codes into error types
   */
  private categorizeCloseCode(code: number): WebSocketErrorType {
    switch (code) {
      case 1000: // Normal closure
        return 'unknown';
      case 1001: // Going away
        return 'connection_lost';
      case 1002: // Protocol error
      case 1003: // Unsupported data
        return 'server_error';
      case 1006: // Abnormal closure (no close frame)
        return 'connection_lost';
      case 1008: // Policy violation
      case 4001: // Custom: Unauthorized
        return 'authentication_failed';
      case 1011: // Internal server error
      case 1012: // Service restart
      case 1013: // Try again later
        return 'server_error';
      case 1014: // Bad gateway
      case 1015: // TLS handshake failure
        return 'connection_failed';
      default:
        if (code >= 4000 && code < 4100) {
          return 'authentication_failed';
        }
        if (code >= 4100 && code < 4200) {
          return 'server_error';
        }
        return 'unknown';
    }
  }

  /**
   * Check if close code is retryable
   */
  private isRetryableCloseCode(code: number): boolean {
    // These codes indicate temporary issues that may resolve
    const retryableCodes = [
      1001, // Going away
      1006, // Abnormal closure
      1011, // Internal server error
      1012, // Service restart
      1013, // Try again later
      1014, // Bad gateway
    ];

    // Auth errors should not be retried
    if (code >= 4000 && code < 4100) {
      return false;
    }

    return retryableCodes.includes(code) || code >= 4100;
  }

  /**
   * Start connection timeout timer
   */
  private startConnectionTimeout(): void {
    this.clearConnectionTimeout();

    this.connectionTimeoutTimer = setTimeout(() => {
      if (this._connectionState === 'connecting') {
        console.warn('[YjsWebSocketProvider] Connection timeout');

        this.setError({
          type: 'timeout',
          message: `Connection timeout after ${this.options.connectionTimeout}ms`,
          timestamp: new Date(),
          retryable: true,
        });

        // Disconnect and try reconnecting
        if (this.provider) {
          this.provider.disconnect();
        }
        this.handleDisconnected();
      }
    }, this.options.connectionTimeout);
  }

  /**
   * Clear connection timeout timer
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      // The y-websocket provider handles ping/pong internally
      // This heartbeat is used to check connection health periodically
      if (this.provider && !this.provider.wsconnected) {
        console.warn('[YjsWebSocketProvider] Heartbeat detected connection loss');
        this.handleDisconnected();
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Update latency measurement
   */
  updateLatency(latencyMs: number): void {
    this._latency = latencyMs;
    this.notifyStateChange();
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    if (this._connectionState !== state) {
      this._connectionState = state;
      this.notifyStateChange();
    }
  }

  /**
   * Set sync state and notify listeners
   */
  private setSyncState(state: SyncState): void {
    if (this._syncState !== state) {
      this._syncState = state;
      this.notifyStateChange();
    }
  }

  /**
   * Set error and notify listeners
   */
  private setError(error: ProviderError): void {
    this._error = error;
    this.events.onError?.(error);
    this.notifyStateChange();
  }

  /**
   * Clear current error
   */
  private clearError(): void {
    if (this._error) {
      this._error = null;
      this.notifyStateChange();
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearConnectionTimeout();
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.events.onStateChange?.(this.state);
  }
}

/**
 * Create an enhanced WebSocket provider for a Yjs document
 */
export function createYjsWebSocketProvider(
  mapId: string,
  doc: Y.Doc,
  options?: YjsWebSocketProviderOptions,
  events?: YjsWebSocketProviderEvents
): YjsWebSocketProvider {
  const roomName = `mindmap-${mapId}`;
  const provider = new YjsWebSocketProvider(roomName, doc, {
    ...options,
    connect: false, // We'll connect after setting up events
  });

  if (events) {
    provider.setEvents(events);
  }

  // Connect after events are set up
  if (options?.connect !== false) {
    provider.connect();
  }

  return provider;
}

/**
 * Default provider configuration for development
 */
export const developmentProviderConfig: YjsWebSocketProviderOptions = {
  connect: true,
  resyncInterval: 5000,
  initialBackoffTime: 100,
  maxBackoffTime: 10000,
  backoffMultiplier: 1.5,
  maxReconnectAttempts: 0,
  jitter: true,
  connectionTimeout: 5000,
  heartbeatEnabled: true,
  heartbeatInterval: 15000,
};

/**
 * Default provider configuration for production
 */
export const productionProviderConfig: YjsWebSocketProviderOptions = {
  connect: true,
  resyncInterval: 10000,
  initialBackoffTime: 500,
  maxBackoffTime: 30000,
  backoffMultiplier: 2,
  maxReconnectAttempts: 0,
  jitter: true,
  connectionTimeout: 10000,
  heartbeatEnabled: true,
  heartbeatInterval: 30000,
};
