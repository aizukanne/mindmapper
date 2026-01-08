import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserPreferences, MindMapSettings } from '@mindmapper/types';
import { DEFAULT_USER_PREFERENCES } from '@mindmapper/types';

/**
 * Extended preferences state including derived/computed preferences
 */
interface PreferencesState extends UserPreferences {
  // Computed theme (resolves 'system' to actual theme)
  resolvedTheme: 'light' | 'dark';

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  updateDefaultMapSettings: (settings: Partial<MindMapSettings>) => void;
  resetPreferences: () => void;

  // Selectors (for convenience)
  getEffectiveTheme: () => 'light' | 'dark';
}

/**
 * Determine the system color scheme preference
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Resolve the theme setting to an actual theme value
 */
const resolveTheme = (theme: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

/**
 * User Preferences Store
 *
 * Manages user preferences including theme, keyboard shortcuts,
 * auto-save interval, and default map settings.
 *
 * Persisted to localStorage for persistence across sessions.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state from defaults
      ...DEFAULT_USER_PREFERENCES,
      resolvedTheme: resolveTheme(DEFAULT_USER_PREFERENCES.theme),

      // Theme actions
      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme);
        set({ theme, resolvedTheme });

        // Apply theme to document
        applyThemeToDocument(resolvedTheme);
      },

      // Keyboard shortcuts
      setKeyboardShortcutsEnabled: (enabled) => {
        set({ keyboardShortcutsEnabled: enabled });
      },

      // Auto-save interval
      setAutoSaveInterval: (interval) => {
        // Validate interval (minimum 5 seconds, maximum 5 minutes)
        const validInterval = Math.max(5000, Math.min(300000, interval));
        set({ autoSaveInterval: validInterval });
      },

      // Default map settings
      updateDefaultMapSettings: (settings) => {
        const currentSettings = get().defaultMapSettings;
        set({
          defaultMapSettings: {
            ...currentSettings,
            ...settings,
          },
        });
      },

      // Reset to defaults
      resetPreferences: () => {
        set({
          ...DEFAULT_USER_PREFERENCES,
          resolvedTheme: resolveTheme(DEFAULT_USER_PREFERENCES.theme),
        });
        applyThemeToDocument(resolveTheme(DEFAULT_USER_PREFERENCES.theme));
      },

      // Selectors
      getEffectiveTheme: () => get().resolvedTheme,
    }),
    {
      name: 'mindmapper-preferences',
      storage: createJSONStorage(() => localStorage),
      // Only persist user-set preferences, not computed values
      partialize: (state) => ({
        theme: state.theme,
        defaultMapSettings: state.defaultMapSettings,
        keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
        autoSaveInterval: state.autoSaveInterval,
      }),
      // Rehydrate resolved theme on load
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resolvedTheme = resolveTheme(state.theme);
          applyThemeToDocument(state.resolvedTheme);
        }
      },
    }
  )
);

/**
 * Apply the resolved theme to the document
 */
function applyThemeToDocument(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }

  // Also set the color-scheme for native form elements
  root.style.colorScheme = theme;
}

/**
 * Setup system theme change listener
 * Call this in your app initialization
 */
export function setupSystemThemeListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    const state = usePreferencesStore.getState();
    if (state.theme === 'system') {
      const newResolvedTheme = getSystemTheme();
      usePreferencesStore.setState({ resolvedTheme: newResolvedTheme });
      applyThemeToDocument(newResolvedTheme);
    }
  };

  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

// ============================================
// Selectors (for optimized component subscriptions)
// ============================================

/**
 * Select only the theme value
 */
export const selectTheme = (state: PreferencesState) => state.theme;

/**
 * Select the resolved (effective) theme
 */
export const selectResolvedTheme = (state: PreferencesState) => state.resolvedTheme;

/**
 * Select keyboard shortcuts enabled status
 */
export const selectKeyboardShortcutsEnabled = (state: PreferencesState) =>
  state.keyboardShortcutsEnabled;

/**
 * Select auto-save interval
 */
export const selectAutoSaveInterval = (state: PreferencesState) =>
  state.autoSaveInterval;

/**
 * Select default map settings
 */
export const selectDefaultMapSettings = (state: PreferencesState) =>
  state.defaultMapSettings;
