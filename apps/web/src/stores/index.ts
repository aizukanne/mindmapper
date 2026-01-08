/**
 * Zustand Stores - Central Export
 *
 * This file re-exports all stores and their selectors for convenient imports.
 *
 * Usage:
 *   import { usePreferencesStore, useUIStore, useAppStore, useMapStore } from '@/stores';
 */

// Map Store (existing)
export { useMapStore } from './mapStore';
export type { NodeData, MindMapNode, MindMapEdge } from './mapStore';

// Family Tree Store
export {
  useFamilyTreeStore,
  // Selectors
  selectConnectionLineStyle,
  selectIsDragging,
  selectDragState,
  createTreePositionsSelector,
} from './familyTreeStore';
export type {
  ConnectionLineStyle,
  CustomPosition,
  DragState,
} from './familyTreeStore';

// Preferences Store
export {
  usePreferencesStore,
  setupSystemThemeListener,
  // Selectors
  selectTheme,
  selectResolvedTheme,
  selectKeyboardShortcutsEnabled,
  selectAutoSaveInterval,
  selectDefaultMapSettings,
} from './preferencesStore';

// UI Store
export {
  useUIStore,
  // Toast helpers
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  // Selectors
  selectActiveModals,
  selectPanels,
  selectSidebarOpen,
  selectIsLoading,
  selectLoadingMessage,
  selectToasts,
  selectViewState,
  selectCommandPaletteOpen,
  selectMobileMenuOpen,
  selectIsFullscreen,
} from './uiStore';
export type { Toast, ModalConfig, PanelState, ViewState } from './uiStore';

// App Store
export {
  useAppStore,
  setupConnectionListeners,
  // Selectors
  selectCurrentUser,
  selectIsAuthenticated,
  selectConnectionStatus,
  selectIsOnline,
  selectSyncStatus,
  selectPendingSyncCount,
  selectHasPendingChanges,
  selectRecentItems,
  selectGlobalErrors,
  selectRecoverableErrors,
  selectIsInitialized,
  selectInitializationError,
  selectFeatureFlags,
} from './appStore';
export type {
  ConnectionStatus,
  SyncStatus,
  RecentItem,
  GlobalError,
  CurrentUser,
} from './appStore';
