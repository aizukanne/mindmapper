import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Connection line style types for family tree visualization
 */
export type ConnectionLineStyle = 'straight' | 'orthogonal' | 'curved';

/**
 * Custom position for a person card (overrides auto-layout)
 */
export interface CustomPosition {
  x: number;
  y: number;
  /** Timestamp of when this position was last updated */
  updatedAt: number;
}

/**
 * Drag state for tracking active drag operations
 */
export interface DragState {
  /** ID of the person being dragged */
  personId: string;
  /** Starting position when drag began */
  startPosition: { x: number; y: number };
  /** Current position during drag */
  currentPosition: { x: number; y: number };
  /** Offset from cursor to card top-left */
  offset: { x: number; y: number };
}

/**
 * Family tree settings and state
 */
interface FamilyTreeState {
  // Connection line settings
  connectionLineStyle: ConnectionLineStyle;

  // Custom positions by tree ID, then person ID
  customPositions: Record<string, Record<string, CustomPosition>>;

  // Drag state
  dragState: DragState | null;
  isDragging: boolean;

  // Position update pending state (for optimistic updates)
  pendingPositionUpdates: Set<string>;

  // Actions for connection line style
  setConnectionLineStyle: (style: ConnectionLineStyle) => void;

  // Actions for custom positions
  setCustomPosition: (treeId: string, personId: string, position: { x: number; y: number }) => void;
  getCustomPosition: (treeId: string, personId: string) => CustomPosition | undefined;
  clearCustomPosition: (treeId: string, personId: string) => void;
  clearAllCustomPositions: (treeId: string) => void;
  hasCustomPosition: (treeId: string, personId: string) => boolean;

  // Actions for drag operations
  startDrag: (personId: string, startPosition: { x: number; y: number }, cursorOffset: { x: number; y: number }) => void;
  updateDrag: (currentPosition: { x: number; y: number }) => void;
  endDrag: () => { personId: string; finalPosition: { x: number; y: number } } | null;
  cancelDrag: () => void;

  // Position sync actions
  markPositionPending: (personId: string) => void;
  clearPositionPending: (personId: string) => void;
  isPositionPending: (personId: string) => boolean;
}

/**
 * Family Tree Store
 *
 * Manages family tree visualization settings including:
 * - Connection line styles (straight, orthogonal, curved)
 * - Custom card positions (for drag-and-drop rearrangement)
 * - Drag state management
 */
export const useFamilyTreeStore = create<FamilyTreeState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectionLineStyle: 'orthogonal',
      customPositions: {},
      dragState: null,
      isDragging: false,
      pendingPositionUpdates: new Set(),

      // Connection line style
      setConnectionLineStyle: (style) => {
        set({ connectionLineStyle: style });
      },

      // Custom positions
      setCustomPosition: (treeId, personId, position) => {
        set((state) => ({
          customPositions: {
            ...state.customPositions,
            [treeId]: {
              ...(state.customPositions[treeId] || {}),
              [personId]: {
                x: position.x,
                y: position.y,
                updatedAt: Date.now(),
              },
            },
          },
        }));
      },

      getCustomPosition: (treeId, personId) => {
        return get().customPositions[treeId]?.[personId];
      },

      clearCustomPosition: (treeId, personId) => {
        set((state) => {
          const treePositions = { ...(state.customPositions[treeId] || {}) };
          delete treePositions[personId];
          return {
            customPositions: {
              ...state.customPositions,
              [treeId]: treePositions,
            },
          };
        });
      },

      clearAllCustomPositions: (treeId) => {
        set((state) => {
          const newPositions = { ...state.customPositions };
          delete newPositions[treeId];
          return { customPositions: newPositions };
        });
      },

      hasCustomPosition: (treeId, personId) => {
        return !!get().customPositions[treeId]?.[personId];
      },

      // Drag operations
      startDrag: (personId, startPosition, cursorOffset) => {
        set({
          isDragging: true,
          dragState: {
            personId,
            startPosition,
            currentPosition: startPosition,
            offset: cursorOffset,
          },
        });
      },

      updateDrag: (currentPosition) => {
        set((state) => {
          if (!state.dragState) return state;
          return {
            dragState: {
              ...state.dragState,
              currentPosition,
            },
          };
        });
      },

      endDrag: () => {
        const state = get();
        if (!state.dragState) return null;

        const result = {
          personId: state.dragState.personId,
          finalPosition: state.dragState.currentPosition,
        };

        set({
          isDragging: false,
          dragState: null,
        });

        return result;
      },

      cancelDrag: () => {
        set({
          isDragging: false,
          dragState: null,
        });
      },

      // Position sync
      markPositionPending: (personId) => {
        set((state) => {
          const newPending = new Set(state.pendingPositionUpdates);
          newPending.add(personId);
          return { pendingPositionUpdates: newPending };
        });
      },

      clearPositionPending: (personId) => {
        set((state) => {
          const newPending = new Set(state.pendingPositionUpdates);
          newPending.delete(personId);
          return { pendingPositionUpdates: newPending };
        });
      },

      isPositionPending: (personId) => {
        return get().pendingPositionUpdates.has(personId);
      },
    }),
    {
      name: 'mindmapper-family-tree',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences, not transient state
      partialize: (state) => ({
        connectionLineStyle: state.connectionLineStyle,
        customPositions: state.customPositions,
      }),
      // Handle Set serialization
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<FamilyTreeState>),
        // Ensure pendingPositionUpdates is always a Set
        pendingPositionUpdates: new Set(),
      }),
    }
  )
);

// ============================================
// Selectors (for optimized component subscriptions)
// ============================================

/**
 * Select the current connection line style
 */
export const selectConnectionLineStyle = (state: FamilyTreeState) =>
  state.connectionLineStyle;

/**
 * Select if currently dragging
 */
export const selectIsDragging = (state: FamilyTreeState) =>
  state.isDragging;

/**
 * Select the current drag state
 */
export const selectDragState = (state: FamilyTreeState) =>
  state.dragState;

/**
 * Create a selector for custom positions of a specific tree
 */
export const createTreePositionsSelector = (treeId: string) =>
  (state: FamilyTreeState) => state.customPositions[treeId] || {};
