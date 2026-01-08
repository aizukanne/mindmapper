import { useState, useCallback, useRef } from 'react';
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
import {
  Printer,
  FileType,
  Loader2,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrintPdfDialogProps {
  mapId: string;
  mapTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PageOrientation = 'portrait' | 'landscape';
type PageSize = 'a4' | 'letter' | 'a3';

interface PageSizeOption {
  id: PageSize;
  name: string;
  description: string;
  dimensions: string;
}

const pageSizeOptions: PageSizeOption[] = [
  {
    id: 'a4',
    name: 'A4',
    description: 'Standard international',
    dimensions: '210 × 297 mm',
  },
  {
    id: 'letter',
    name: 'Letter',
    description: 'US standard',
    dimensions: '8.5 × 11 in',
  },
  {
    id: 'a3',
    name: 'A3',
    description: 'Large format',
    dimensions: '297 × 420 mm',
  },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function PrintPdfDialog({ mapId, mapTitle, open, onOpenChange }: PrintPdfDialogProps) {
  const [orientation, setOrientation] = useState<PageOrientation>('landscape');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeDate, setIncludeDate] = useState(true);
  const [fitToPage, setFitToPage] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const handlePrint = useCallback(async () => {
    setIsPrinting(true);

    try {
      // Fetch SVG data from API
      const response = await fetch(`${API_URL}/api/maps/${mapId}/export/svg`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch map data');
      }

      const result = await response.json();
      const svgData = result.data;

      // Parse SVG to get dimensions
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      const svgWidth = svgElement?.getAttribute('width') || '800';
      const svgHeight = svgElement?.getAttribute('height') || '600';

      // Get page dimensions based on size and orientation
      const pageDimensions = getPageDimensions(pageSize, orientation);

      // Create print content
      const printContent = generatePrintContent({
        svgData,
        svgWidth: parseFloat(svgWidth),
        svgHeight: parseFloat(svgHeight),
        title: mapTitle,
        orientation,
        pageSize,
        pageDimensions,
        includeTitle,
        includeDate,
        fitToPage,
      });

      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      document.body.appendChild(iframe);
      printFrameRef.current = iframe;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();

        // Wait for content to load, then print
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
            // Clean up after print dialog closes
            setTimeout(() => {
              document.body.removeChild(iframe);
              printFrameRef.current = null;
              setIsPrinting(false);
              onOpenChange(false);
            }, 1000);
          }, 250);
        };
      }
    } catch (error) {
      console.error('Print error:', error);
      setIsPrinting(false);
    }
  }, [mapId, mapTitle, orientation, pageSize, includeTitle, includeDate, fitToPage, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="print-pdf-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileType className="h-5 w-5" />
            Print to PDF
          </DialogTitle>
          <DialogDescription>
            Configure print settings for "{mapTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Page Orientation */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Page Orientation</Label>
            <RadioGroup
              value={orientation}
              onValueChange={(value: string) => setOrientation(value as PageOrientation)}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="landscape"
                  id="landscape"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="landscape"
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
                    'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                  )}
                >
                  <Maximize2 className="h-8 w-5 mb-2 text-muted-foreground" />
                  <div className="font-medium">Landscape</div>
                  <div className="text-xs text-muted-foreground">Recommended</div>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="portrait"
                  id="portrait"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="portrait"
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
                    'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                  )}
                >
                  <Maximize2 className="h-5 w-8 mb-2 rotate-90 text-muted-foreground" />
                  <div className="font-medium">Portrait</div>
                  <div className="text-xs text-muted-foreground">Vertical</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Page Size */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Page Size</Label>
            <RadioGroup
              value={pageSize}
              onValueChange={(value: string) => setPageSize(value as PageSize)}
              className="grid grid-cols-3 gap-2"
            >
              {pageSizeOptions.map((size) => (
                <div key={size.id}>
                  <RadioGroupItem
                    value={size.id}
                    id={size.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={size.id}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors text-center',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                    )}
                  >
                    <div className="font-medium text-sm">{size.name}</div>
                    <div className="text-xs text-muted-foreground">{size.dimensions}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Print Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="fitToPage" className="text-sm cursor-pointer">
                  Fit to page (scale content to fit)
                </Label>
                <Switch
                  id="fitToPage"
                  checked={fitToPage}
                  onCheckedChange={setFitToPage}
                  data-testid="fit-to-page-switch"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeTitle" className="text-sm cursor-pointer">
                  Include title header
                </Label>
                <Switch
                  id="includeTitle"
                  checked={includeTitle}
                  onCheckedChange={setIncludeTitle}
                  data-testid="include-title-switch"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeDate" className="text-sm cursor-pointer">
                  Include date in footer
                </Label>
                <Switch
                  id="includeDate"
                  checked={includeDate}
                  onCheckedChange={setIncludeDate}
                  data-testid="include-date-switch"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOrientation('landscape');
              setPageSize('a4');
              setIncludeTitle(true);
              setIncludeDate(true);
              setFitToPage(true);
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} disabled={isPrinting} data-testid="print-pdf-button">
              {isPrinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions

interface PageDimensions {
  width: number;
  height: number;
  unit: string;
}

function getPageDimensions(size: PageSize, orientation: PageOrientation): PageDimensions {
  // Dimensions in mm for CSS
  const sizes: Record<PageSize, { width: number; height: number }> = {
    a4: { width: 210, height: 297 },
    letter: { width: 216, height: 279 },
    a3: { width: 297, height: 420 },
  };

  const baseDimensions = sizes[size];

  if (orientation === 'landscape') {
    return {
      width: baseDimensions.height,
      height: baseDimensions.width,
      unit: 'mm',
    };
  }

  return {
    ...baseDimensions,
    unit: 'mm',
  };
}

interface PrintContentOptions {
  svgData: string;
  svgWidth: number;
  svgHeight: number;
  title: string;
  orientation: PageOrientation;
  pageSize: PageSize;
  pageDimensions: PageDimensions;
  includeTitle: boolean;
  includeDate: boolean;
  fitToPage: boolean;
}

function generatePrintContent(options: PrintContentOptions): string {
  const {
    svgData,
    svgWidth,
    svgHeight,
    title,
    orientation,
    pageSize,
    pageDimensions,
    includeTitle,
    includeDate,
    fitToPage,
  } = options;

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate scale to fit content on page
  const marginMm = 15;
  const availableWidth = pageDimensions.width - (marginMm * 2);
  const availableHeight = pageDimensions.height - (marginMm * 2) - (includeTitle ? 20 : 0) - (includeDate ? 15 : 0);

  // Convert mm to px (assuming 96 DPI, 1mm ≈ 3.78px)
  const mmToPx = 3.78;
  const availableWidthPx = availableWidth * mmToPx;
  const availableHeightPx = availableHeight * mmToPx;

  let scale = 1;
  if (fitToPage && (svgWidth > availableWidthPx || svgHeight > availableHeightPx)) {
    const scaleX = availableWidthPx / svgWidth;
    const scaleY = availableHeightPx / svgHeight;
    scale = Math.min(scaleX, scaleY, 1);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Print</title>
  <style>
    /* Reset and base styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      height: 100%;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Page setup */
    @page {
      size: ${pageSize} ${orientation};
      margin: ${marginMm}mm;
    }

    /* Print-specific styles */
    @media print {
      html, body {
        width: ${pageDimensions.width}mm;
        height: ${pageDimensions.height}mm;
        overflow: hidden;
      }

      .no-print {
        display: none !important;
      }

      .print-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        page-break-inside: avoid;
      }

      .page {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        page-break-after: always;
        page-break-inside: avoid;
      }

      .page:last-child {
        page-break-after: auto;
      }
    }

    /* Screen preview styles */
    @media screen {
      body {
        background: #f0f0f0;
        padding: 20px;
      }

      .print-container {
        max-width: 1200px;
        margin: 0 auto;
      }

      .page {
        background: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
        padding: 20px;
        min-height: 400px;
      }
    }

    /* Content styles */
    .print-container {
      width: 100%;
      height: 100%;
    }

    .page {
      display: flex;
      flex-direction: column;
    }

    .header {
      text-align: center;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 15px;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .svg-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .svg-container svg {
      max-width: 100%;
      max-height: 100%;
      ${fitToPage ? `transform: scale(${scale}); transform-origin: center center;` : ''}
    }

    .footer {
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      margin-top: 15px;
    }

    .footer p {
      font-size: 11px;
      color: #6b7280;
      margin: 0;
    }

    /* Multi-page support - for large maps that need pagination */
    .page-number {
      font-size: 10px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="page">
      ${includeTitle ? `
      <div class="header">
        <h1>${escapeHtml(title)}</h1>
      </div>
      ` : ''}
      <div class="content">
        <div class="svg-container">
          ${svgData}
        </div>
      </div>
      ${includeDate ? `
      <div class="footer">
        <p>Exported from MindMapper on ${currentDate}</p>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
