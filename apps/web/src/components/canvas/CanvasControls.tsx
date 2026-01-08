import { useCallback, useEffect, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Map,
  MousePointer2,
  HelpCircle,
} from 'lucide-react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface CanvasControlsProps {
  isPanMode: boolean;
  onPanModeChange: (isPanMode: boolean) => void;
  showMinimap: boolean;
  onMinimapChange: (show: boolean) => void;
  onShowHelp?: () => void;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

export function CanvasControls({
  isPanMode,
  onPanModeChange,
  showMinimap,
  onMinimapChange,
  onShowHelp,
  minZoom = 0.25,
  maxZoom = 4,
  className,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const viewport = useViewport();
  const [zoomValue, setZoomValue] = useState(viewport.zoom);

  // Sync with viewport zoom changes
  useEffect(() => {
    setZoomValue(viewport.zoom);
  }, [viewport.zoom]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 200 });
  }, [fitView]);

  const handleSliderChange = useCallback(
    (values: number[]) => {
      const newZoom = values[0];
      setZoomValue(newZoom);
      zoomTo(newZoom, { duration: 0 });
    },
    [zoomTo]
  );

  const togglePanMode = useCallback(() => {
    onPanModeChange(!isPanMode);
  }, [isPanMode, onPanModeChange]);

  const toggleMinimap = useCallback(() => {
    onMinimapChange(!showMinimap);
  }, [showMinimap, onMinimapChange]);

  // Convert zoom to percentage for display
  const zoomPercentage = Math.round(zoomValue * 100);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg shadow-lg',
        className
      )}
      data-testid="canvas-controls"
    >
      {/* Pan mode toggle */}
      <Button
        variant={isPanMode ? 'default' : 'ghost'}
        size="icon"
        onClick={togglePanMode}
        title={isPanMode ? 'Switch to selection mode (Esc)' : 'Switch to pan mode (Space)'}
        data-testid="pan-mode-toggle"
        aria-pressed={isPanMode}
      >
        {isPanMode ? (
          <Move className="h-4 w-4" />
        ) : (
          <MousePointer2 className="h-4 w-4" />
        )}
      </Button>

      <div className="w-px h-6 bg-border" />

      {/* Zoom out button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        title="Zoom out (-)"
        data-testid="zoom-out-button"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      {/* Zoom slider */}
      <div className="flex items-center gap-2 w-32">
        <Slider
          value={[zoomValue]}
          min={minZoom}
          max={maxZoom}
          step={0.05}
          onValueChange={handleSliderChange}
          className="w-full"
          data-testid="zoom-slider"
          aria-label="Zoom level"
        />
        <span
          className="text-xs font-medium text-muted-foreground w-10 text-right tabular-nums"
          data-testid="zoom-percentage"
        >
          {zoomPercentage}%
        </span>
      </div>

      {/* Zoom in button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        title="Zoom in (+)"
        data-testid="zoom-in-button"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      {/* Fit view button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFitView}
        title="Fit view (Ctrl+0)"
        data-testid="fit-view-button"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      {/* Minimap toggle */}
      <Button
        variant={showMinimap ? 'default' : 'ghost'}
        size="icon"
        onClick={toggleMinimap}
        title={showMinimap ? 'Hide minimap (M)' : 'Show minimap (M)'}
        data-testid="minimap-toggle"
        aria-pressed={showMinimap}
      >
        <Map className="h-4 w-4" />
      </Button>

      {/* Help button */}
      {onShowHelp && (
        <>
          <div className="w-px h-6 bg-border" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowHelp}
            title="Keyboard shortcuts (Shift+?)"
            data-testid="help-button"
            aria-label="Show keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
