import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Image,
  Loader2,
  Download,
  Check,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PngExportOptions {
  /** Resolution multiplier (1x, 2x, 3x, 4x) */
  resolution: number;
  /** Whether to use transparent background */
  transparentBackground: boolean;
  /** Background color if not transparent */
  backgroundColor: string;
  /** Padding around the content in pixels */
  padding: number;
}

interface PngExportDialogProps {
  mapTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Function to export PNG with the given options */
  onExportPng: (options: PngExportOptions) => Promise<string | null>;
}

interface ResolutionOption {
  value: number;
  label: string;
  description: string;
}

const resolutionOptions: ResolutionOption[] = [
  { value: 1, label: '1x', description: 'Standard (fastest)' },
  { value: 2, label: '2x', description: 'High quality (default)' },
  { value: 3, label: '3x', description: 'Very high quality' },
  { value: 4, label: '4x', description: 'Maximum quality' },
];

const DEFAULT_OPTIONS: PngExportOptions = {
  resolution: 2,
  transparentBackground: false,
  backgroundColor: '#f8fafc',
  padding: 50,
};

export function PngExportDialog({
  mapTitle,
  open,
  onOpenChange,
  onExportPng,
}: PngExportDialogProps) {
  const [resolution, setResolution] = useState<number>(DEFAULT_OPTIONS.resolution);
  const [transparentBackground, setTransparentBackground] = useState(DEFAULT_OPTIONS.transparentBackground);
  const [padding, setPadding] = useState(DEFAULT_OPTIONS.padding);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const options: PngExportOptions = {
        resolution,
        transparentBackground,
        backgroundColor: DEFAULT_OPTIONS.backgroundColor,
        padding,
      };

      const pngDataUrl = await onExportPng(options);

      if (pngDataUrl) {
        // Download the file
        const filename = `${mapTitle.replace(/[^a-z0-9]/gi, '_')}.png`;
        const a = document.createElement('a');
        a.href = pngDataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error('PNG export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [mapTitle, resolution, transparentBackground, padding, onExportPng, onOpenChange]);

  const handleReset = useCallback(() => {
    setResolution(DEFAULT_OPTIONS.resolution);
    setTransparentBackground(DEFAULT_OPTIONS.transparentBackground);
    setPadding(DEFAULT_OPTIONS.padding);
  }, []);

  // Calculate estimated file size info
  const getEstimatedSizeDescription = (res: number): string => {
    const baseMultiplier = res * res;
    if (baseMultiplier <= 1) return 'Smallest file size';
    if (baseMultiplier <= 4) return 'Balanced size and quality';
    if (baseMultiplier <= 9) return 'Larger file size';
    return 'Largest file size';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="png-export-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Export as PNG
          </DialogTitle>
          <DialogDescription>
            Configure export settings for "{mapTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resolution Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Resolution</Label>
            <RadioGroup
              value={resolution.toString()}
              onValueChange={(value: string) => setResolution(parseInt(value, 10))}
              className="grid grid-cols-4 gap-2"
            >
              {resolutionOptions.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value.toString()}
                    id={`resolution-${option.value}`}
                    className="peer sr-only"
                    data-testid={`resolution-${option.value}x`}
                  />
                  <Label
                    htmlFor={`resolution-${option.value}`}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors text-center',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                    )}
                  >
                    <div className="font-bold text-lg">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {getEstimatedSizeDescription(resolution)}
            </p>
          </div>

          {/* Padding Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Padding</Label>
              <span className="text-sm text-muted-foreground">{padding}px</span>
            </div>
            <Slider
              value={[padding]}
              onValueChange={(value) => setPadding(value[0])}
              min={0}
              max={100}
              step={10}
              className="w-full"
              data-testid="padding-slider"
            />
            <p className="text-xs text-muted-foreground">
              Add spacing around the mind map content
            </p>
          </div>

          {/* Background Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Background</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="transparentBackground" className="text-sm cursor-pointer">
                  Transparent background
                </Label>
                <Switch
                  id="transparentBackground"
                  checked={transparentBackground}
                  onCheckedChange={setTransparentBackground}
                  data-testid="transparent-background-switch"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {transparentBackground
                  ? 'Background will be transparent (useful for overlaying on other images)'
                  : 'Background will be solid white/gray'}
              </p>
            </div>
          </div>

          {/* Preview Info */}
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <div className="text-sm font-medium mb-2">Export Preview</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Resolution: <span className="text-foreground font-medium">{resolution}x</span></div>
              <div>Padding: <span className="text-foreground font-medium">{padding}px</span></div>
              <div>Background: <span className="text-foreground font-medium">{transparentBackground ? 'Transparent' : 'Solid'}</span></div>
              <div>Format: <span className="text-foreground font-medium">PNG</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting} data-testid="export-png-button">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Exported!
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export PNG
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
