import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Connection status for online/offline detection
 */
export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

/**
 * Sync status for data synchronization
 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

/**
 * Recent item for quick access
 */
export interface RecentItem {
  id: string;
  type: 'map' | 'family-tree';
  title: string;
  accessedAt: Date;
  thumbnail?: string;
}

/**
 * Global error for app-wide error handling
 */
export interface GlobalError {
  id: string;
  type: 'auth' | 'network' | 'sync' | 'permission' | 'unknown';
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
  retryAction?: () => void;
}

/**
 * Current user information (from Clerk or other auth)
 */
export interface CurrentUser {
  id: string;
  clerkId?: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isLoaded: boolean;
}

/**
 * App State interface
 */
interface AppState {
  // User state
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;

  // Connection state
  connectionStatus: ConnectionStatus;
  lastOnline: Date | null;

  // Sync state
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  lastSyncedAt: Date | null;

  // Recent items (for quick access)
  recentItems: RecentItem[];
  maxRecentItems: number;

  // Global errors
  globalErrors: GlobalError[];

  // App initialization
  isInitialized: boolean;
  initializationError: string | null;

  // Feature flags (for gradual rollouts)
  featureFlags: Record<string, boolean>;

  // User actions
  setCurrentUser: (user: CurrentUser | null) => void;
  clearCurrentUser: () => void;

  // Connection actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  goOnline: () => void;
  goOffline: () => void;

  // Sync actions
  setSyncStatus: (status: SyncStatus) => void;
  incrementPendingSync: () => void;
  decrementPendingSync: () => void;
  resetPendingSync: () => void;
  markSynced: () => void;

  // Recent items actions
  addRecentItem: (item: Omit<RecentItem, 'accessedAt'>) => void;
  removeRecentItem: (id: string) => void;
  clearRecentItems: () => void;

  // Error actions
  addGlobalError: (error: Omit<GlobalError, 'id' | 'timestamp'>) => string;
  removeGlobalError: (id: string) => void;
  clearGlobalErrors: () => void;
  retryError: (id: string) => void;

  // Initialization actions
  setInitialized: (initialized: boolean) => void;
  setInitializationError: (error: string | null) => void;

  // Feature flag actions
  setFeatureFlag: (flag: string, enabled: boolean) => void;
  isFeatureEnabled: (flag: string) => boolean;
}

/**
 * Generate unique ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * App State Store
 *
 * Manages global application state including user info, connection status,
 * sync state, recent items, and global errors.
 *
 * Uses subscribeWithSelector for optimized component subscriptions.
 */
export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentUser: null,
    isAuthenticated: false,
    connectionStatus: 'online',
    lastOnline: new Date(),
    syncStatus: 'idle',
    pendingSyncCount: 0,
    lastSyncedAt: null,
    recentItems: [],
    maxRecentItems: 10,
    globalErrors: [],
    isInitialized: false,
    initializationError: null,
    featureFlags: {},

    // User actions
    setCurrentUser: (user) => {
      set({
        currentUser: user,
        isAuthenticated: user !== null && user.isLoaded,
      });
    },

    clearCurrentUser: () => {
      set({
        currentUser: null,
        isAuthenticated: false,
      });
    },

    // Connection actions
    setConnectionStatus: (status) => {
      const updates: Partial<AppState> = { connectionStatus: status };

      if (status === 'online') {
        updates.lastOnline = new Date();
      }

      set(updates);
    },

    goOnline: () => {
      set({
        connectionStatus: 'online',
        lastOnline: new Date(),
      });
    },

    goOffline: () => {
      set({ connectionStatus: 'offline' });
    },

    // Sync actions
    setSyncStatus: (status) => {
      const updates: Partial<AppState> = { syncStatus: status };

      if (status === 'success') {
        updates.lastSyncedAt = new Date();
      }

      set(updates);
    },

    incrementPendingSync: () => {
      set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 }));
    },

    decrementPendingSync: () => {
      set((state) => ({
        pendingSyncCount: Math.max(0, state.pendingSyncCount - 1),
      }));
    },

    resetPendingSync: () => {
      set({ pendingSyncCount: 0 });
    },

    markSynced: () => {
      set({
        syncStatus: 'success',
        lastSyncedAt: new Date(),
        pendingSyncCount: 0,
      });
    },

    // Recent items actions
    addRecentItem: (item) => {
      set((state) => {
        // Remove existing item with same ID if present
        const filteredItems = state.recentItems.filter((i) => i.id !== item.id);

        // Add new item at the beginning
        const newItem: RecentItem = {
          ...item,
          accessedAt: new Date(),
        };

        // Keep only maxRecentItems
        const newItems = [newItem, ...filteredItems].slice(0, state.maxRecentItems);

        return { recentItems: newItems };
      });
    },

    removeRecentItem: (id) => {
      set((state) => ({
        recentItems: state.recentItems.filter((i) => i.id !== id),
      }));
    },

    clearRecentItems: () => {
      set({ recentItems: [] });
    },

    // Error actions
    addGlobalError: (error) => {
      const id = generateId();
      const newError: GlobalError = {
        ...error,
        id,
        timestamp: new Date(),
      };

      set((state) => ({
        globalErrors: [...state.globalErrors, newError],
      }));

      return id;
    },

    removeGlobalError: (id) => {
      set((state) => ({
        globalErrors: state.globalErrors.filter((e) => e.id !== id),
      }));
    },

    clearGlobalErrors: () => {
      set({ globalErrors: [] });
    },

    retryError: (id) => {
      const error = get().globalErrors.find((e) => e.id === id);

      if (error?.retryAction) {
        // Remove the error first
        get().removeGlobalError(id);
        // Then retry
        error.retryAction();
      }
    },

    // Initialization actions
    setInitialized: (initialized) => {
      set({ isInitialized: initialized });
    },

    setInitializationError: (error) => {
      set({ initializationError: error });
    },

    // Feature flag actions
    setFeatureFlag: (flag, enabled) => {
      set((state) => ({
        featureFlags: {
          ...state.featureFlags,
          [flag]: enabled,
        },
      }));
    },

    isFeatureEnabled: (flag) => {
      return get().featureFlags[flag] ?? false;
    },
  }))
);

// ============================================
// Setup functions for connection monitoring
// ============================================

/**
 * Setup online/offline event listeners
 * Call this in your app initialization
 */
export function setupConnectionListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    useAppStore.getState().goOnline();
  };

  const handleOffline = () => {
    useAppStore.getState().goOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Set initial state
  if (!navigator.onLine) {
    useAppStore.getState().goOffline();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ============================================
// Selectors (for optimized component subscriptions)
// ============================================

/**
 * Select current user
 */
export const selectCurrentUser = (state: AppState) => state.currentUser;

/**
 * Select authentication status
 */
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;

/**
 * Select connection status
 */
export const selectConnectionStatus = (state: AppState) => state.connectionStatus;

/**
 * Select if online
 */
export const selectIsOnline = (state: AppState) => state.connectionStatus === 'online';

/**
 * Select sync status
 */
export const selectSyncStatus = (state: AppState) => state.syncStatus;

/**
 * Select pending sync count
 */
export const selectPendingSyncCount = (state: AppState) => state.pendingSyncCount;

/**
 * Select has pending changes
 */
export const selectHasPendingChanges = (state: AppState) => state.pendingSyncCount > 0;

/**
 * Select recent items
 */
export const selectRecentItems = (state: AppState) => state.recentItems;

/**
 * Select global errors
 */
export const selectGlobalErrors = (state: AppState) => state.globalErrors;

/**
 * Select recoverable errors
 */
export const selectRecoverableErrors = (state: AppState) =>
  state.globalErrors.filter((e) => e.recoverable);

/**
 * Select initialization state
 */
export const selectIsInitialized = (state: AppState) => state.isInitialized;

/**
 * Select initialization error
 */
export const selectInitializationError = (state: AppState) => state.initializationError;

/**
 * Select feature flags
 */
export const selectFeatureFlags = (state: AppState) => state.featureFlags;
