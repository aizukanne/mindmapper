import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Palette,
  Type,
  Square,
  Circle,
  Diamond,
  Cloud,
  Minus,
  Bold,
  Italic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';
import type { NodeStyle } from '@mindmapper/types';

interface PropertiesPanelProps {
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const SHAPE_OPTIONS: { value: NodeStyle['shape']; icon: React.ReactNode; label: string }[] = [
  { value: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { value: 'rounded', icon: <Minus className="h-4 w-4 rotate-90" />, label: 'Rounded' },
  { value: 'ellipse', icon: <Circle className="h-4 w-4" />, label: 'Ellipse' },
  { value: 'diamond', icon: <Diamond className="h-4 w-4" />, label: 'Diamond' },
  { value: 'cloud', icon: <Cloud className="h-4 w-4" />, label: 'Cloud' },
];

const BORDER_STYLE_OPTIONS: { value: NodeStyle['borderStyle']; label: string; preview: React.ReactNode }[] = [
  {
    value: 'solid',
    label: 'Solid',
    preview: <div className="w-full h-0 border-t-2 border-current" />
  },
  {
    value: 'dashed',
    label: 'Dashed',
    preview: <div className="w-full h-0 border-t-2 border-dashed border-current" />
  },
  {
    value: 'dotted',
    label: 'Dotted',
    preview: <div className="w-full h-0 border-t-2 border-dotted border-current" />
  },
];

const PRESET_COLORS = [
  '#ffffff', '#f3f4f6', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3',
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#1f2937',
];

export function PropertiesPanel({
  isCollapsed,
  onCollapsedChange,
}: PropertiesPanelProps) {
  const { nodes, selectedNodeId, updateNodeStyle, updateNodeText } = useMapStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const [localText, setLocalText] = useState('');

  // Sync local text with selected node
  useEffect(() => {
    if (selectedNode) {
      setLocalText(selectedNode.data.text);
    }
  }, [selectedNode?.id, selectedNode?.data.text]);

  const handleTextChange = (text: string) => {
    setLocalText(text);
    if (selectedNodeId) {
      updateNodeText(selectedNodeId, text);
    }
  };

  const handleStyleChange = (style: Partial<NodeStyle>) => {
    if (selectedNodeId) {
      updateNodeStyle(selectedNodeId, style);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full border-l border-border bg-background flex flex-col items-center py-2 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(false)}
          className="h-8 w-8"
          title="Expand properties"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="w-8 h-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Properties"
          onClick={() => onCollapsedChange(false)}
          disabled={!selectedNode}
        >
          <Palette className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Typography"
          onClick={() => onCollapsedChange(false)}
          disabled={!selectedNode}
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full border-l border-border bg-background flex flex-col" data-testid="properties-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">Properties</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(true)}
          className="h-7 w-7"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {selectedNode ? (
        <div className="flex-1 overflow-y-auto">
          {/* Node Text */}
          <div className="px-4 py-3 border-b border-border">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Node Text
            </Label>
            <Input
              value={localText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="mt-2"
              placeholder="Enter node text..."
              data-testid="properties-node-text-input"
            />
          </div>

          {/* Shape */}
          <div className="px-4 py-3 border-b border-border">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Shape
            </Label>
            <div className="flex gap-1 mt-2">
              {SHAPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedNode.data.style.shape === option.value ? 'default' : 'outline'}
                  size="icon"
                  className="h-9 w-9"
                  title={option.label}
                  onClick={() => handleStyleChange({ shape: option.value })}
                >
                  {option.icon}
                </Button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="px-4 py-3 border-b border-border" data-testid="properties-background-section">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Background Color
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-2" data-testid="properties-color-presets">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleStyleChange({ backgroundColor: color })}
                  className={cn(
                    'w-7 h-7 rounded-md border-2 transition-all',
                    selectedNode.data.style.backgroundColor === color
                      ? 'border-primary scale-110'
                      : 'border-transparent hover:border-muted-foreground/50'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                  data-testid={`properties-color-preset-${color.replace('#', '')}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="color"
                value={selectedNode.data.style.backgroundColor}
                onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                className="w-10 h-8 p-0.5 cursor-pointer"
                data-testid="properties-background-color-picker"
              />
              <Input
                value={selectedNode.data.style.backgroundColor}
                onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                className="flex-1 h-8 text-sm font-mono"
                placeholder="#ffffff"
                data-testid="properties-background-color-input"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="px-4 py-3 border-b border-border" data-testid="properties-text-color-section">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Text Color
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="color"
                value={selectedNode.data.style.textColor}
                onChange={(e) => handleStyleChange({ textColor: e.target.value })}
                className="w-10 h-8 p-0.5 cursor-pointer"
                data-testid="properties-text-color-picker"
              />
              <Input
                value={selectedNode.data.style.textColor}
                onChange={(e) => handleStyleChange({ textColor: e.target.value })}
                className="flex-1 h-8 text-sm font-mono"
                placeholder="#000000"
                data-testid="properties-text-color-input"
              />
            </div>
          </div>

          {/* Border */}
          <div className="px-4 py-3 border-b border-border" data-testid="properties-border-section">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Border
            </Label>
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={selectedNode.data.style.borderColor}
                  onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
                  className="w-10 h-8 p-0.5 cursor-pointer"
                  data-testid="properties-border-color-picker"
                />
                <Input
                  value={selectedNode.data.style.borderColor}
                  onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
                  className="flex-1 h-8 text-sm font-mono"
                  placeholder="#000000"
                  data-testid="properties-border-color-input"
                />
              </div>
              <div data-testid="properties-border-width-section">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Width</span>
                  <span className="text-xs font-medium" data-testid="properties-border-width-value">{selectedNode.data.style.borderWidth}px</span>
                </div>
                <Slider
                  value={[selectedNode.data.style.borderWidth]}
                  min={0}
                  max={8}
                  step={1}
                  onValueChange={([value]) => handleStyleChange({ borderWidth: value })}
                  data-testid="properties-border-width-slider"
                />
              </div>
              <div data-testid="properties-border-radius-section">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Radius</span>
                  <span className="text-xs font-medium" data-testid="properties-border-radius-value">{selectedNode.data.style.borderRadius}px</span>
                </div>
                <Slider
                  value={[selectedNode.data.style.borderRadius]}
                  min={0}
                  max={24}
                  step={2}
                  onValueChange={([value]) => handleStyleChange({ borderRadius: value })}
                  data-testid="properties-border-radius-slider"
                />
              </div>
              <div data-testid="properties-border-style-section">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Style</span>
                  <span className="text-xs font-medium capitalize" data-testid="properties-border-style-value">{selectedNode.data.style.borderStyle || 'solid'}</span>
                </div>
                <div className="flex gap-1">
                  {BORDER_STYLE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={(selectedNode.data.style.borderStyle || 'solid') === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8 flex flex-col items-center justify-center gap-0.5"
                      title={option.label}
                      onClick={() => handleStyleChange({ borderStyle: option.value })}
                      data-testid={`properties-border-style-${option.value}`}
                    >
                      <span className="text-[10px]">{option.label}</span>
                      <div className="w-full px-1">{option.preview}</div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="px-4 py-3 border-b border-border" data-testid="properties-typography-section">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Typography
            </Label>
            <div className="space-y-3 mt-2">
              <div data-testid="properties-font-size-section">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Font Size</span>
                  <span className="text-xs font-medium" data-testid="properties-font-size-value">{selectedNode.data.style.fontSize}px</span>
                </div>
                <Slider
                  value={[selectedNode.data.style.fontSize]}
                  min={10}
                  max={32}
                  step={1}
                  onValueChange={([value]) => handleStyleChange({ fontSize: value })}
                  data-testid="properties-font-size-slider"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedNode.data.style.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    handleStyleChange({
                      fontWeight: selectedNode.data.style.fontWeight === 'bold' ? 'normal' : 'bold',
                    })
                  }
                  data-testid="properties-bold-button"
                >
                  <Bold className="h-4 w-4 mr-1" />
                  Bold
                </Button>
                <Button
                  variant={selectedNode.data.style.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    handleStyleChange({
                      fontStyle: selectedNode.data.style.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  data-testid="properties-italic-button"
                >
                  <Italic className="h-4 w-4 mr-1" />
                  Italic
                </Button>
              </div>
            </div>
          </div>

          {/* Node Info */}
          <div className="px-4 py-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Node Info
            </Label>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{selectedNode.data.type}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs truncate max-w-[120px]" title={selectedNode.id}>
                  {selectedNode.id}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Position</span>
                <span className="font-mono text-xs">
                  ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4" data-testid="properties-no-selection">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Palette className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No Node Selected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click on a node to edit its properties
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
