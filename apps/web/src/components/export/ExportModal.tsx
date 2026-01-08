import { useState, useCallback, useEffect, useMemo } from 'react';
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
  FileJson,
  FileText,
  Image,
  FileImage,
  Download,
  Loader2,
  Check,
  Printer,
  Eye,
  EyeOff,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrintPdfDialog } from './PrintPdfDialog';
import { PngExportDialog, type PngExportOptions } from './PngExportDialog';
import type { ExportOptions } from '@/hooks/useSvgExport';

interface ExportModalProps {
  mapId: string;
  mapTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional function to export SVG from React Flow canvas (client-side, higher quality) */
  onExportSvg?: () => Promise<string | null>;
  /** Optional function to export PNG from React Flow canvas (client-side, higher quality) */
  onExportPng?: (options?: ExportOptions) => Promise<string | null>;
}

type ExportFormat = 'json' | 'markdown' | 'svg' | 'png' | 'pdf' | 'text';

// Format-specific options interfaces
interface JsonExportOptions {
  includeComments: boolean;
  prettyPrint: boolean;
  includeMetadata: boolean;
}

interface MarkdownExportOptions {
  includeHeader: boolean;
  includeFooter: boolean;
  bulletStyle: 'dash' | 'asterisk' | 'plus';
}

interface SvgExportOptions {
  includeBackground: boolean;
}

interface TextExportOptions {
  includeTitle: boolean;
  indentStyle: 'spaces' | 'tabs';
  indentSize: number;
}

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  mimeType: string;
}

const formatOptions: FormatOption[] = [
  {
    id: 'json',
    name: 'JSON',
    description: 'Full data export, can be re-imported',
    icon: <FileJson className="h-5 w-5" />,
    extension: '.json',
    mimeType: 'application/json',
  },
  {
    id: 'markdown',
    name: 'Markdown',
    description: 'Hierarchical outline format',
    icon: <FileText className="h-5 w-5" />,
    extension: '.md',
    mimeType: 'text/markdown',
  },
  {
    id: 'svg',
    name: 'SVG',
    description: 'Scalable vector graphic',
    icon: <FileImage className="h-5 w-5" />,
    extension: '.svg',
    mimeType: 'image/svg+xml',
  },
  {
    id: 'png',
    name: 'PNG',
    description: 'High-quality image',
    icon: <Image className="h-5 w-5" />,
    extension: '.png',
    mimeType: 'image/png',
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Print with layout options',
    icon: <Printer className="h-5 w-5" />,
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: 'text',
    name: 'Plain Text',
    description: 'Simple text outline',
    icon: <FileText className="h-5 w-5" />,
    extension: '.txt',
    mimeType: 'text/plain',
  },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Convert SVG string to PNG blob using canvas
 * @param svgData The SVG string to convert
 * @returns Promise<Blob> The PNG blob
 */
async function convertSvgToPng(svgData: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = new window.Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width * 2; // 2x for better quality
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
  });
}

export function ExportModal({ mapId, mapTitle, open, onOpenChange, onExportSvg, onExportPng }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showPngDialog, setShowPngDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Format-specific options state
  const [jsonOptions, setJsonOptions] = useState<JsonExportOptions>({
    includeComments: true,
    prettyPrint: true,
    includeMetadata: true,
  });
  const [markdownOptions, setMarkdownOptions] = useState<MarkdownExportOptions>({
    includeHeader: true,
    includeFooter: true,
    bulletStyle: 'dash',
  });
  const [svgOptions, setSvgOptions] = useState<SvgExportOptions>({
    includeBackground: true,
  });
  const [textOptions, setTextOptions] = useState<TextExportOptions>({
    includeTitle: true,
    indentStyle: 'spaces',
    indentSize: 4,
  });

  // Get current format info
  const currentFormat = useMemo(() =>
    formatOptions.find(f => f.id === selectedFormat)!,
    [selectedFormat]
  );

  // Fetch preview content when format changes
  useEffect(() => {
    if (!open || !mapId) return;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        // For PNG and PDF, we show a visual description instead
        if (selectedFormat === 'png') {
          setPreviewContent('📷 PNG Image Export\n\nYour mind map will be exported as a high-quality raster image.\n\nClick Export to configure:\n• Resolution (1x-4x)\n• Padding around content\n• Background transparency');
          setIsLoadingPreview(false);
          return;
        }
        if (selectedFormat === 'pdf') {
          setPreviewContent('📄 PDF Document Export\n\nYour mind map will be exported for printing.\n\nClick Export to configure:\n• Page size (A4, Letter, A3)\n• Orientation (Portrait/Landscape)\n• Title and date headers');
          setIsLoadingPreview(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/maps/${mapId}/export/${selectedFormat}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Preview failed');
        }

        const result = await response.json();

        let preview = '';
        if (selectedFormat === 'json') {
          const jsonData = result.format === 'mindmapper-json' ? result : result.data;
          preview = JSON.stringify(jsonData, null, jsonOptions.prettyPrint ? 2 : 0);
          // Truncate for preview
          if (preview.length > 1200) {
            preview = preview.substring(0, 1200) + '\n\n... (truncated for preview)';
          }
        } else if (selectedFormat === 'markdown' || selectedFormat === 'text') {
          preview = result.data;
          if (preview.length > 1200) {
            preview = preview.substring(0, 1200) + '\n\n... (truncated for preview)';
          }
        } else if (selectedFormat === 'svg') {
          // For SVG, show a simplified preview description
          const svgData = result.data;
          const widthMatch = svgData.match(/width="(\d+)"/);
          const heightMatch = svgData.match(/height="(\d+)"/);
          const width = widthMatch ? widthMatch[1] : 'auto';
          const height = heightMatch ? heightMatch[1] : 'auto';
          preview = `🖼️ SVG Vector Graphic\n\nDimensions: ${width} × ${height} pixels\n\nYour mind map will be exported as a scalable vector graphic that can be resized without quality loss.\n\nIdeal for:\n• High-quality printing\n• Web embedding\n• Further editing in vector tools`;
        }

        setPreviewContent(preview);
      } catch (error) {
        console.error('Preview error:', error);
        setPreviewContent('Preview not available');
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [open, mapId, selectedFormat, jsonOptions.prettyPrint]);

  // Handler for PNG export with custom options from PngExportDialog
  const handlePngExportWithOptions = useCallback(async (options: PngExportOptions): Promise<string | null> => {
    if (!onExportPng) return null;

    // Map PngExportOptions to ExportOptions
    const exportOptions: ExportOptions = {
      quality: options.resolution,
      transparentBackground: options.transparentBackground,
      backgroundColor: options.backgroundColor,
      padding: options.padding,
      includeBackground: !options.transparentBackground,
      filterControls: true,
    };

    return onExportPng(exportOptions);
  }, [onExportPng]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const format = formatOptions.find((f) => f.id === selectedFormat)!;

      // Build query params for format-specific options
      const queryParams = new URLSearchParams();
      if (selectedFormat === 'json') {
        queryParams.set('includeComments', String(jsonOptions.includeComments));
      }

      const queryString = queryParams.toString();
      const fetchUrl = `${API_URL}/api/maps/${mapId}/export/${selectedFormat}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(fetchUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();

      // Handle different export formats
      let blob: Blob;
      const filename = `${mapTitle.replace(/[^a-z0-9]/gi, '_')}${format.extension}`;

      if (selectedFormat === 'json') {
        // JSON export returns the full export data directly (not wrapped in data property)
        const jsonData = result.format === 'mindmapper-json' ? result : result.data;

        // Apply format options
        let processedData = jsonData;
        if (!jsonOptions.includeMetadata && processedData.metadata) {
          const { metadata: _metadata, ...rest } = processedData;
          processedData = rest;
        }

        const jsonString = jsonOptions.prettyPrint
          ? JSON.stringify(processedData, null, 2)
          : JSON.stringify(processedData);
        blob = new Blob([jsonString], { type: format.mimeType });
      } else if (selectedFormat === 'markdown') {
        let content = result.data;

        // Apply markdown options
        if (!markdownOptions.includeHeader) {
          // Remove header (title line)
          content = content.replace(/^# .+\n+/, '');
          content = content.replace(/^> .+\n+/, '');
          content = content.replace(/^---\n+/, '');
        }
        if (!markdownOptions.includeFooter) {
          // Remove footer
          content = content.replace(/\n*---\n+\*Exported from MindMapper.+\*\n?$/, '');
        }
        if (markdownOptions.bulletStyle !== 'dash') {
          const bulletChar = markdownOptions.bulletStyle === 'asterisk' ? '*' : '+';
          content = content.replace(/^(\s*)- /gm, `$1${bulletChar} `);
        }

        blob = new Blob([content], { type: format.mimeType });
      } else if (selectedFormat === 'text') {
        let content = result.data;

        // Apply text options
        if (!textOptions.includeTitle) {
          // Remove title and underline
          content = content.replace(/^.+\n=+\n+/, '');
        }
        if (textOptions.indentStyle === 'tabs') {
          // Convert spaces to tabs
          content = content.replace(/^(    )+/gm, (match: string) => {
            return '\t'.repeat(match.length / 4);
          });
        } else if (textOptions.indentSize !== 4) {
          // Adjust indent size
          content = content.replace(/^(    )+/gm, (match: string) => {
            const levels = match.length / 4;
            return ' '.repeat(levels * textOptions.indentSize);
          });
        }

        blob = new Blob([content], { type: format.mimeType });
      } else if (selectedFormat === 'svg') {
        // Use client-side React Flow export if available (higher quality, preserves styling)
        let svgContent: string;
        if (onExportSvg) {
          const svg = await onExportSvg();
          svgContent = svg || result.data;
        } else {
          svgContent = result.data;
        }

        // Apply SVG options
        if (!svgOptions.includeBackground) {
          // Remove background rect
          svgContent = svgContent.replace(/<rect width="100%" height="100%" fill="[^"]+"\/>/, '');
        }

        blob = new Blob([svgContent], { type: format.mimeType });
      } else if (selectedFormat === 'png') {
        // For PNG, open the PNG export dialog with advanced options (if client-side export available)
        if (onExportPng) {
          setIsExporting(false);
          setShowPngDialog(true);
          return;
        } else {
          // Fallback to SVG-to-PNG conversion if client-side export not available
          const svgData = result.data;
          blob = await convertSvgToPng(svgData);
        }
      } else if (selectedFormat === 'pdf') {
        // For PDF, open the print dialog with advanced options
        setIsExporting(false);
        setShowPrintDialog(true);
        return;
      } else {
        blob = new Blob([result.data], { type: format.mimeType });
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [mapId, mapTitle, selectedFormat, jsonOptions, markdownOptions, svgOptions, textOptions, onExportSvg, onExportPng, onOpenChange]);

  // Render format-specific options panel
  const renderFormatOptions = () => {
    switch (selectedFormat) {
      case 'json':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeComments" className="text-sm cursor-pointer">
                Include comments
              </Label>
              <Switch
                id="includeComments"
                checked={jsonOptions.includeComments}
                onCheckedChange={(checked) => setJsonOptions(prev => ({ ...prev, includeComments: checked }))}
                data-testid="json-include-comments"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="prettyPrint" className="text-sm cursor-pointer">
                Pretty print (formatted)
              </Label>
              <Switch
                id="prettyPrint"
                checked={jsonOptions.prettyPrint}
                onCheckedChange={(checked) => setJsonOptions(prev => ({ ...prev, prettyPrint: checked }))}
                data-testid="json-pretty-print"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeMetadata" className="text-sm cursor-pointer">
                Include metadata
              </Label>
              <Switch
                id="includeMetadata"
                checked={jsonOptions.includeMetadata}
                onCheckedChange={(checked) => setJsonOptions(prev => ({ ...prev, includeMetadata: checked }))}
                data-testid="json-include-metadata"
              />
            </div>
          </div>
        );

      case 'markdown':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="mdIncludeHeader" className="text-sm cursor-pointer">
                Include header
              </Label>
              <Switch
                id="mdIncludeHeader"
                checked={markdownOptions.includeHeader}
                onCheckedChange={(checked) => setMarkdownOptions(prev => ({ ...prev, includeHeader: checked }))}
                data-testid="md-include-header"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mdIncludeFooter" className="text-sm cursor-pointer">
                Include footer
              </Label>
              <Switch
                id="mdIncludeFooter"
                checked={markdownOptions.includeFooter}
                onCheckedChange={(checked) => setMarkdownOptions(prev => ({ ...prev, includeFooter: checked }))}
                data-testid="md-include-footer"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Bullet style</Label>
              <RadioGroup
                value={markdownOptions.bulletStyle}
                onValueChange={(value) => setMarkdownOptions(prev => ({ ...prev, bulletStyle: value as 'dash' | 'asterisk' | 'plus' }))}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="dash" id="bullet-dash" className="h-3 w-3" />
                  <Label htmlFor="bullet-dash" className="text-xs cursor-pointer font-mono">- dash</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="asterisk" id="bullet-asterisk" className="h-3 w-3" />
                  <Label htmlFor="bullet-asterisk" className="text-xs cursor-pointer font-mono">* star</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="plus" id="bullet-plus" className="h-3 w-3" />
                  <Label htmlFor="bullet-plus" className="text-xs cursor-pointer font-mono">+ plus</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 'svg':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="svgIncludeBackground" className="text-sm cursor-pointer">
                Include background
              </Label>
              <Switch
                id="svgIncludeBackground"
                checked={svgOptions.includeBackground}
                onCheckedChange={(checked) => setSvgOptions(prev => ({ ...prev, includeBackground: checked }))}
                data-testid="svg-include-background"
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="txtIncludeTitle" className="text-sm cursor-pointer">
                Include title
              </Label>
              <Switch
                id="txtIncludeTitle"
                checked={textOptions.includeTitle}
                onCheckedChange={(checked) => setTextOptions(prev => ({ ...prev, includeTitle: checked }))}
                data-testid="txt-include-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Indent style</Label>
              <RadioGroup
                value={textOptions.indentStyle}
                onValueChange={(value) => setTextOptions(prev => ({ ...prev, indentStyle: value as 'spaces' | 'tabs' }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spaces" id="indent-spaces" className="h-3 w-3" />
                  <Label htmlFor="indent-spaces" className="text-xs cursor-pointer">Spaces</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tabs" id="indent-tabs" className="h-3 w-3" />
                  <Label htmlFor="indent-tabs" className="text-xs cursor-pointer">Tabs</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 'png':
      case 'pdf':
        return (
          <div className="text-sm text-muted-foreground text-center py-2">
            <Settings2 className="h-5 w-5 mx-auto mb-1 opacity-50" />
            <p>Click Export for options</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle>Export Mind Map</DialogTitle>
          <DialogDescription>
            Choose a format to export "{mapTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column: Format selection and options */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Format</Label>
              <RadioGroup
                value={selectedFormat}
                onValueChange={(value: string) => setSelectedFormat(value as ExportFormat)}
                className="grid grid-cols-2 gap-2"
              >
                {formatOptions.map((format) => (
                  <div key={format.id}>
                    <RadioGroupItem
                      value={format.id}
                      id={format.id}
                      className="peer sr-only"
                      data-testid={`format-${format.id}`}
                    />
                    <Label
                      htmlFor={format.id}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
                        'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                      )}
                    >
                      <div className="mb-1 text-muted-foreground peer-data-[state=checked]:text-primary">
                        {format.icon}
                      </div>
                      <div className="font-medium text-sm">{format.name}</div>
                      <div className="text-[10px] text-muted-foreground text-center leading-tight">
                        {format.description}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Format-specific options */}
            <div>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1 text-sm font-medium mb-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                Options
                <span className="text-xs">({showOptions ? 'hide' : 'show'})</span>
              </button>
              {showOptions && (
                <div className="rounded-lg border border-muted bg-muted/30 p-3">
                  {renderFormatOptions()}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Preview</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-7 px-2"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show
                  </>
                )}
              </Button>
            </div>
            {showPreview && (
              <div
                className="rounded-lg border border-muted bg-muted/20 p-3 h-[280px] overflow-auto font-mono text-xs"
                data-testid="export-preview"
              >
                {isLoadingPreview ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-words">{previewContent}</pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Export info bar */}
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <span>
            Exporting as <strong className="text-foreground">{currentFormat.name}</strong> ({currentFormat.extension})
          </span>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} data-testid="export-button">
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
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Print PDF Dialog */}
      <PrintPdfDialog
        mapId={mapId}
        mapTitle={mapTitle}
        open={showPrintDialog}
        onOpenChange={(open) => {
          setShowPrintDialog(open);
          if (!open) {
            onOpenChange(false);
          }
        }}
      />

      {/* PNG Export Dialog */}
      <PngExportDialog
        mapTitle={mapTitle}
        open={showPngDialog}
        onOpenChange={(open) => {
          setShowPngDialog(open);
          if (!open) {
            onOpenChange(false);
          }
        }}
        onExportPng={handlePngExportWithOptions}
      />
    </Dialog>
  );
}
