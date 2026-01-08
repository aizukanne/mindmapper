import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Toast notification type
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  id: string;
  type: 'create-map' | 'share' | 'export' | 'import' | 'settings' | 'delete-confirm' | 'custom';
  props?: Record<string, unknown>;
}

/**
 * Panel visibility state
 */
export interface PanelState {
  sidebar: boolean;
  propertiesPanel: boolean;
  historyPanel: boolean;
  commentsPanel: boolean;
  collaboratorsPanel: boolean;
}

/**
 * View/filter state for dashboards
 */
export interface ViewState {
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'lastAccessed';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  filterFavorites: boolean;
  searchQuery: string;
}

/**
 * UI State interface
 */
interface UIState {
  // Modals
  activeModals: ModalConfig[];

  // Panels
  panels: PanelState;

  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;

  // Toasts/Notifications
  toasts: Toast[];

  // View state (for dashboard/list views)
  viewState: ViewState;

  // Command palette
  isCommandPaletteOpen: boolean;

  // Mobile-specific
  isMobileMenuOpen: boolean;

  // Fullscreen mode
  isFullscreen: boolean;

  // Modal actions
  openModal: (modal: Omit<ModalConfig, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  isModalOpen: (type: ModalConfig['type']) => boolean;

  // Panel actions
  togglePanel: (panel: keyof PanelState) => void;
  setPanel: (panel: keyof PanelState, open: boolean) => void;
  closeAllPanels: () => void;

  // Loading actions
  setLoading: (loading: boolean, message?: string) => void;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // View state actions
  setSortBy: (sortBy: ViewState['sortBy']) => void;
  setSortOrder: (sortOrder: ViewState['sortOrder']) => void;
  setViewMode: (viewMode: ViewState['viewMode']) => void;
  setFilterFavorites: (filter: boolean) => void;
  setSearchQuery: (query: string) => void;
  resetViewState: () => void;

  // Command palette actions
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Mobile menu actions
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  // Fullscreen actions
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
}

/**
 * Generate unique ID for modals and toasts
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Default panel state
 */
const DEFAULT_PANEL_STATE: PanelState = {
  sidebar: true,
  propertiesPanel: false,
  historyPanel: false,
  commentsPanel: false,
  collaboratorsPanel: false,
};

/**
 * Default view state
 */
const DEFAULT_VIEW_STATE: ViewState = {
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  viewMode: 'grid',
  filterFavorites: false,
  searchQuery: '',
};

/**
 * UI State Store
 *
 * Manages all transient UI state including modals, panels, toasts,
 * loading states, and view configurations.
 *
 * Uses subscribeWithSelector for optimized component subscriptions.
 */
export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activeModals: [],
    panels: DEFAULT_PANEL_STATE,
    isLoading: false,
    loadingMessage: null,
    toasts: [],
    viewState: DEFAULT_VIEW_STATE,
    isCommandPaletteOpen: false,
    isMobileMenuOpen: false,
    isFullscreen: false,

    // Modal actions
    openModal: (modal) => {
      const id = generateId();
      const modalConfig: ModalConfig = { ...modal, id };
      set((state) => ({
        activeModals: [...state.activeModals, modalConfig],
      }));
      return id;
    },

    closeModal: (id) => {
      set((state) => ({
        activeModals: state.activeModals.filter((m) => m.id !== id),
      }));
    },

    closeAllModals: () => {
      set({ activeModals: [] });
    },

    isModalOpen: (type) => {
      return get().activeModals.some((m) => m.type === type);
    },

    // Panel actions
    togglePanel: (panel) => {
      set((state) => ({
        panels: {
          ...state.panels,
          [panel]: !state.panels[panel],
        },
      }));
    },

    setPanel: (panel, open) => {
      set((state) => ({
        panels: {
          ...state.panels,
          [panel]: open,
        },
      }));
    },

    closeAllPanels: () => {
      set({ panels: DEFAULT_PANEL_STATE });
    },

    // Loading actions
    setLoading: (loading, message) => {
      set({
        isLoading: loading,
        loadingMessage: loading ? (message || null) : null,
      });
    },

    // Toast actions
    addToast: (toast) => {
      const id = generateId();
      const newToast: Toast = { ...toast, id };

      set((state) => ({
        toasts: [...state.toasts, newToast],
      }));

      // Auto-remove toast after duration (default 5 seconds)
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      }

      return id;
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    clearToasts: () => {
      set({ toasts: [] });
    },

    // View state actions
    setSortBy: (sortBy) => {
      set((state) => ({
        viewState: { ...state.viewState, sortBy },
      }));
    },

    setSortOrder: (sortOrder) => {
      set((state) => ({
        viewState: { ...state.viewState, sortOrder },
      }));
    },

    setViewMode: (viewMode) => {
      set((state) => ({
        viewState: { ...state.viewState, viewMode },
      }));
    },

    setFilterFavorites: (filter) => {
      set((state) => ({
        viewState: { ...state.viewState, filterFavorites: filter },
      }));
    },

    setSearchQuery: (query) => {
      set((state) => ({
        viewState: { ...state.viewState, searchQuery: query },
      }));
    },

    resetViewState: () => {
      set({ viewState: DEFAULT_VIEW_STATE });
    },

    // Command palette actions
    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
    toggleCommandPalette: () => {
      set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen }));
    },

    // Mobile menu actions
    openMobileMenu: () => set({ isMobileMenuOpen: true }),
    closeMobileMenu: () => set({ isMobileMenuOpen: false }),
    toggleMobileMenu: () => {
      set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }));
    },

    // Fullscreen actions
    enterFullscreen: () => {
      set({ isFullscreen: true });
      // Request browser fullscreen if available
      if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // Fullscreen request failed, but we still track our "app fullscreen" state
        });
      }
    },

    exitFullscreen: () => {
      set({ isFullscreen: false });
      // Exit browser fullscreen if available
      if (typeof document !== 'undefined' && document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // Exit fullscreen failed
        });
      }
    },

    toggleFullscreen: () => {
      const { isFullscreen, enterFullscreen, exitFullscreen } = get();
      if (isFullscreen) {
        exitFullscreen();
      } else {
        enterFullscreen();
      }
    },
  }))
);

// ============================================
// Convenience hooks for specific toast types
// ============================================

/**
 * Show a success toast
 */
export const showSuccessToast = (title: string, message?: string): string => {
  return useUIStore.getState().addToast({ type: 'success', title, message });
};

/**
 * Show an error toast
 */
export const showErrorToast = (title: string, message?: string): string => {
  return useUIStore.getState().addToast({ type: 'error', title, message, duration: 8000 });
};

/**
 * Show a warning toast
 */
export const showWarningToast = (title: string, message?: string): string => {
  return useUIStore.getState().addToast({ type: 'warning', title, message });
};

/**
 * Show an info toast
 */
export const showInfoToast = (title: string, message?: string): string => {
  return useUIStore.getState().addToast({ type: 'info', title, message });
};

// ============================================
// Selectors (for optimized component subscriptions)
// ============================================

/**
 * Select active modals
 */
export const selectActiveModals = (state: UIState) => state.activeModals;

/**
 * Select panel visibility
 */
export const selectPanels = (state: UIState) => state.panels;

/**
 * Select sidebar visibility
 */
export const selectSidebarOpen = (state: UIState) => state.panels.sidebar;

/**
 * Select loading state
 */
export const selectIsLoading = (state: UIState) => state.isLoading;

/**
 * Select loading message
 */
export const selectLoadingMessage = (state: UIState) => state.loadingMessage;

/**
 * Select toasts
 */
export const selectToasts = (state: UIState) => state.toasts;

/**
 * Select view state
 */
export const selectViewState = (state: UIState) => state.viewState;

/**
 * Select command palette state
 */
export const selectCommandPaletteOpen = (state: UIState) => state.isCommandPaletteOpen;

/**
 * Select mobile menu state
 */
export const selectMobileMenuOpen = (state: UIState) => state.isMobileMenuOpen;

/**
 * Select fullscreen state
 */
export const selectIsFullscreen = (state: UIState) => state.isFullscreen;
