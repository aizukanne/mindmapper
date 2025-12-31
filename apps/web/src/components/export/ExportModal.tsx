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
import {
  FileJson,
  FileText,
  Image,
  FileImage,
  FileType,
  Download,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  mapId: string;
  mapTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = 'json' | 'markdown' | 'svg' | 'png' | 'pdf' | 'text';

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
    description: 'Printable document',
    icon: <FileType className="h-5 w-5" />,
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

export function ExportModal({ mapId, mapTitle, open, onOpenChange }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const format = formatOptions.find((f) => f.id === selectedFormat)!;
      const response = await fetch(`${API_URL}/api/maps/${mapId}/export/${selectedFormat}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();

      // Handle different export formats
      let blob: Blob;
      let filename = `${mapTitle.replace(/[^a-z0-9]/gi, '_')}${format.extension}`;

      if (selectedFormat === 'json') {
        blob = new Blob([JSON.stringify(result.data, null, 2)], { type: format.mimeType });
      } else if (selectedFormat === 'markdown' || selectedFormat === 'text') {
        blob = new Blob([result.data], { type: format.mimeType });
      } else if (selectedFormat === 'svg') {
        blob = new Blob([result.data], { type: format.mimeType });
      } else if (selectedFormat === 'png') {
        // Convert SVG to PNG using canvas
        const svgData = result.data;
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

        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
        });
      } else if (selectedFormat === 'pdf') {
        // For PDF, we'll create a simple PDF from the SVG
        // In a production app, you'd use a proper PDF library
        const svgData = result.data;

        // Create a simple HTML-based PDF using print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${mapTitle}</title>
                <style>
                  body { margin: 0; padding: 20px; }
                  svg { max-width: 100%; height: auto; }
                </style>
              </head>
              <body>
                ${svgData}
                <script>
                  window.onload = function() {
                    window.print();
                    window.close();
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }

        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
        }, 2000);
        setIsExporting(false);
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
      }, 2000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [mapId, mapTitle, selectedFormat]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Mind Map</DialogTitle>
          <DialogDescription>
            Choose a format to export "{mapTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedFormat}
            onValueChange={(value: string) => setSelectedFormat(value as ExportFormat)}
            className="grid grid-cols-2 gap-3"
          >
            {formatOptions.map((format) => (
              <div key={format.id}>
                <RadioGroupItem
                  value={format.id}
                  id={format.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={format.id}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
                    'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                  )}
                >
                  <div className="mb-2 text-muted-foreground peer-data-[state=checked]:text-primary">
                    {format.icon}
                  </div>
                  <div className="font-medium">{format.name}</div>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    {format.description}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
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
    </Dialog>
  );
}
