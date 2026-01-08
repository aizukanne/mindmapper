import { useCallback } from 'react';
import { toSvg, toPng } from 'html-to-image';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';

/**
 * Options for SVG/image export
 */
export interface ExportOptions {
  /** Include the background in the export (default: true) */
  includeBackground?: boolean;
  /** Background color to use (default: '#f8fafc' - slate-50) */
  backgroundColor?: string;
  /** Padding around the content in pixels (default: 50) */
  padding?: number;
  /** Quality multiplier for PNG export (default: 2 for retina) */
  quality?: number;
  /** Whether to filter out minimap and controls (default: true) */
  filterControls?: boolean;
  /** Whether to use transparent background (overrides includeBackground and backgroundColor) */
  transparentBackground?: boolean;
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  includeBackground: true,
  backgroundColor: '#f8fafc',
  padding: 50,
  quality: 2,
  filterControls: true,
  transparentBackground: false,
};

/**
 * Filter function to exclude minimap, controls, and other UI elements from export
 */
function createFilterFn(filterControls: boolean) {
  return (node: HTMLElement): boolean => {
    if (!filterControls) return true;

    // Exclude minimap, controls, panels, and other overlay elements
    const excludeClasses = [
      'react-flow__minimap',
      'react-flow__controls',
      'react-flow__panel',
      'react-flow__attribution',
    ];

    // Check if the node or its className contains any excluded class
    if (node.classList) {
      for (const cls of excludeClasses) {
        if (node.classList.contains(cls)) {
          return false;
        }
      }
    }

    // Also check className string for SVG elements
    if (typeof node.className === 'string') {
      for (const cls of excludeClasses) {
        if (node.className.includes(cls)) {
          return false;
        }
      }
    }

    return true;
  };
}

/**
 * Hook to export React Flow canvas as SVG or PNG
 * Uses html-to-image library to capture the canvas DOM as a vector graphic
 */
export function useSvgExport() {
  const { getNodes } = useReactFlow();

  /**
   * Export the React Flow canvas as SVG
   * @param options Export options
   * @returns SVG string or null if export fails
   */
  const exportToSvg = useCallback(
    async (options: ExportOptions = {}): Promise<string | null> => {
      const opts = { ...DEFAULT_OPTIONS, ...options };

      // Find the React Flow viewport element
      const viewport = document.querySelector('.react-flow__viewport');
      if (!viewport) {
        console.error('React Flow viewport not found');
        return null;
      }

      // Get all nodes to calculate bounds
      const nodes = getNodes();
      if (nodes.length === 0) {
        console.error('No nodes to export');
        return null;
      }

      try {
        // Calculate the bounds of all nodes
        const nodesBounds = getNodesBounds(nodes);

        // Add padding to the bounds
        const width = nodesBounds.width + opts.padding * 2;
        const height = nodesBounds.height + opts.padding * 2;

        // Calculate viewport transform to fit all nodes
        const transform = getViewportForBounds(
          nodesBounds,
          width,
          height,
          0.5, // minZoom
          2,   // maxZoom
          opts.padding
        );

        // Generate SVG from the viewport
        const svgDataUrl = await toSvg(viewport as HTMLElement, {
          backgroundColor: opts.includeBackground ? opts.backgroundColor : undefined,
          width,
          height,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          },
          filter: createFilterFn(opts.filterControls),
        });

        // Extract SVG from data URL
        const svgString = decodeURIComponent(svgDataUrl.split(',')[1]);

        return svgString;
      } catch (error) {
        console.error('Error exporting to SVG:', error);
        return null;
      }
    },
    [getNodes]
  );

  /**
   * Export the React Flow canvas as PNG (base64 data URL)
   * @param options Export options
   * @returns PNG data URL or null if export fails
   */
  const exportToPng = useCallback(
    async (options: ExportOptions = {}): Promise<string | null> => {
      const opts = { ...DEFAULT_OPTIONS, ...options };

      // Find the React Flow viewport element
      const viewport = document.querySelector('.react-flow__viewport');
      if (!viewport) {
        console.error('React Flow viewport not found');
        return null;
      }

      // Get all nodes to calculate bounds
      const nodes = getNodes();
      if (nodes.length === 0) {
        console.error('No nodes to export');
        return null;
      }

      try {
        // Calculate the bounds of all nodes
        const nodesBounds = getNodesBounds(nodes);

        // Add padding to the bounds
        const width = nodesBounds.width + opts.padding * 2;
        const height = nodesBounds.height + opts.padding * 2;

        // Calculate viewport transform to fit all nodes
        const transform = getViewportForBounds(
          nodesBounds,
          width,
          height,
          0.5, // minZoom
          2,   // maxZoom
          opts.padding
        );

        // Quality multiplier for higher resolution
        const scaledWidth = width * opts.quality;
        const scaledHeight = height * opts.quality;

        // Determine background color based on options
        // transparentBackground takes precedence over includeBackground
        let bgColor: string | undefined;
        if (opts.transparentBackground) {
          bgColor = undefined; // transparent
        } else if (opts.includeBackground) {
          bgColor = opts.backgroundColor;
        } else {
          bgColor = undefined;
        }

        // Generate PNG from the viewport
        const pngDataUrl = await toPng(viewport as HTMLElement, {
          backgroundColor: bgColor,
          width: scaledWidth,
          height: scaledHeight,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          },
          filter: createFilterFn(opts.filterControls),
          pixelRatio: opts.quality,
        });

        return pngDataUrl;
      } catch (error) {
        console.error('Error exporting to PNG:', error);
        return null;
      }
    },
    [getNodes]
  );

  /**
   * Download SVG file
   * @param filename The filename for the download (without extension)
   * @param options Export options
   */
  const downloadSvg = useCallback(
    async (filename: string, options: ExportOptions = {}): Promise<boolean> => {
      const svg = await exportToSvg(options);
      if (!svg) return false;

      try {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      } catch (error) {
        console.error('Error downloading SVG:', error);
        return false;
      }
    },
    [exportToSvg]
  );

  /**
   * Download PNG file
   * @param filename The filename for the download (without extension)
   * @param options Export options
   */
  const downloadPng = useCallback(
    async (filename: string, options: ExportOptions = {}): Promise<boolean> => {
      const pngDataUrl = await exportToPng(options);
      if (!pngDataUrl) return false;

      try {
        const a = document.createElement('a');
        a.href = pngDataUrl;
        a.download = `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
      } catch (error) {
        console.error('Error downloading PNG:', error);
        return false;
      }
    },
    [exportToPng]
  );

  return {
    exportToSvg,
    exportToPng,
    downloadSvg,
    downloadPng,
  };
}
