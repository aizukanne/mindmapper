import { useMemo, useState, useCallback } from 'react';
import type { Person, Relationship } from '@mindmapper/types';
import {
  computeFamilyTreeLayout,
  getPersonCenter,
  type TreeLayout,
  type LayoutOptions,
  type LayoutNode,
} from '@/lib/family-tree-layout';

export interface UseFamilyTreeLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  compact?: boolean;
}

export interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface UseFamilyTreeLayoutResult {
  layout: TreeLayout | null;
  viewState: ViewState;
  setScale: (scale: number) => void;
  setOffset: (x: number, y: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToView: (containerWidth: number, containerHeight: number) => void;
  centerOnPerson: (personId: string, containerWidth: number, containerHeight: number) => void;
  getNodeAtPoint: (x: number, y: number) => LayoutNode | null;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  canvasToScreen: (canvasX: number, canvasY: number) => { x: number; y: number };
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.0;
const ZOOM_STEP = 0.1;

export function useFamilyTreeLayout(
  people: Person[],
  relationships: Relationship[],
  options: UseFamilyTreeLayoutOptions = {}
): UseFamilyTreeLayoutResult {
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Compute layout when data changes
  const layout = useMemo(() => {
    if (people.length === 0) return null;

    const layoutOptions: Partial<LayoutOptions> = {
      nodeWidth: options.nodeWidth,
      nodeHeight: options.nodeHeight,
      horizontalSpacing: options.horizontalSpacing,
      verticalSpacing: options.verticalSpacing,
      compact: options.compact,
    };

    return computeFamilyTreeLayout(people, relationships, layoutOptions);
  }, [people, relationships, options.nodeWidth, options.nodeHeight, options.horizontalSpacing, options.verticalSpacing, options.compact]);

  const setScale = useCallback((newScale: number) => {
    setViewState(prev => ({
      ...prev,
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale)),
    }));
  }, []);

  const setOffset = useCallback((x: number, y: number) => {
    setViewState(prev => ({
      ...prev,
      offsetX: x,
      offsetY: y,
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + ZOOM_STEP),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale - ZOOM_STEP),
    }));
  }, []);

  const resetView = useCallback(() => {
    setViewState({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  }, []);

  const fitToView = useCallback((containerWidth: number, containerHeight: number) => {
    if (!layout) return;

    const { bounds } = layout;
    if (bounds.width === 0 || bounds.height === 0) return;

    const padding = 40;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    const scaledWidth = bounds.width * newScale;
    const scaledHeight = bounds.height * newScale;

    const offsetX = (containerWidth - scaledWidth) / 2 - bounds.minX * newScale;
    const offsetY = (containerHeight - scaledHeight) / 2 - bounds.minY * newScale;

    setViewState({
      scale: newScale,
      offsetX,
      offsetY,
    });
  }, [layout]);

  const centerOnPerson = useCallback((personId: string, containerWidth: number, containerHeight: number) => {
    if (!layout) return;

    const center = getPersonCenter(layout, personId);
    if (!center) return;

    const { scale } = viewState;
    const offsetX = containerWidth / 2 - center.x * scale;
    const offsetY = containerHeight / 2 - center.y * scale;

    setViewState(prev => ({
      ...prev,
      offsetX,
      offsetY,
    }));
  }, [layout, viewState.scale]);

  const getNodeAtPoint = useCallback((x: number, y: number): LayoutNode | null => {
    if (!layout) return null;

    for (const node of layout.nodes.values()) {
      if (
        x >= node.x &&
        x <= node.x + node.width &&
        y >= node.y &&
        y <= node.y + node.height
      ) {
        return node;
      }
    }

    return null;
  }, [layout]);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewState.offsetX) / viewState.scale,
      y: (screenY - viewState.offsetY) / viewState.scale,
    };
  }, [viewState]);

  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * viewState.scale + viewState.offsetX,
      y: canvasY * viewState.scale + viewState.offsetY,
    };
  }, [viewState]);

  return {
    layout,
    viewState,
    setScale,
    setOffset,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    centerOnPerson,
    getNodeAtPoint,
    screenToCanvas,
    canvasToScreen,
  };
}
