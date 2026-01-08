import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  FileText,
  Plus,
  Search,
  Eye,
  LayoutGrid,
  List,
  Sparkles,
  Briefcase,
  GraduationCap,
  User,
  FolderKanban,
  Lightbulb,
  Target,
  Network,
  Workflow,
  Building2,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail: string | null;
  isPublic: boolean;
  createdBy: string | null;
  createdAt: string;
}

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  BUSINESS: { icon: Briefcase, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Business' },
  EDUCATION: { icon: GraduationCap, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Education' },
  PERSONAL: { icon: User, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Personal' },
  PROJECT_MANAGEMENT: { icon: FolderKanban, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Project Management' },
  BRAINSTORMING: { icon: Lightbulb, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Brainstorming' },
  STRATEGY: { icon: Target, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Strategy' },
  MINDMAP: { icon: Network, color: 'text-indigo-600', bgColor: 'bg-indigo-100', label: 'Mind Map' },
  FLOWCHART: { icon: Workflow, color: 'text-cyan-600', bgColor: 'bg-cyan-100', label: 'Flowchart' },
  ORG_CHART: { icon: Building2, color: 'text-teal-600', bgColor: 'bg-teal-100', label: 'Org Chart' },
  OTHER: { icon: MoreHorizontal, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Other' },
};

// Helper function to get category config with fallback
function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.OTHER;
}

// Template Preview Component
function TemplatePreview({
  template,
  onClose,
  onUseTemplate
}: {
  template: Template;
  onClose: () => void;
  onUseTemplate: () => void;
}) {
  const config = getCategoryConfig(template.category);
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{template.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-6">
          {/* Thumbnail Preview */}
          <div className="aspect-video rounded-lg bg-muted mb-6 flex items-center justify-center overflow-hidden">
            {template.thumbnail ? (
              <img
                src={template.thumbnail}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="h-16 w-16" />
                <span className="text-sm">Template Preview</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-foreground">
                {template.description || 'No description available for this template.'}
              </p>
            </div>

            {/* Template Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
              {template.isPublic && (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Public Template
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUseTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        </div>
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  isCreating,
  onUseTemplate,
  onPreview,
  viewMode
}: {
  template: Template;
  isCreating: boolean;
  onUseTemplate: () => void;
  onPreview: () => void;
  viewMode: 'grid' | 'list';
}) {
  const config = getCategoryConfig(template.category);
  const Icon = config.icon;

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group">
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {template.thumbnail ? (
            <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
          ) : (
            <Icon className={`h-6 w-6 ${config.color}`} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{template.name}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} shrink-0`}>
              {config.label}
            </span>
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {template.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onUseTemplate} disabled={isCreating}>
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Use'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer" data-testid="template-card">
      {/* Thumbnail */}
      <div
        className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative"
        onClick={onPreview}
      >
        {template.thumbnail ? (
          <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`p-3 rounded-full ${config.bgColor}`}>
              <Icon className={`h-8 w-8 ${config.color}`} />
            </div>
          </div>
        )}
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onPreview(); }}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base truncate">{template.name}</CardTitle>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} shrink-0`}>
            {config.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {template.description && (
          <CardDescription className="line-clamp-2">
            {template.description}
          </CardDescription>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={(e) => { e.stopPropagation(); onUseTemplate(); }}
          disabled={isCreating}
          data-testid="use-template-button"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Use Template
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TemplateGallery({ open, onOpenChange, folderId }: TemplateGalleryProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/templates?includePrivate=true`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);

        // Extract unique categories
        const cats = [...new Set((data.data || []).map((t: Template) => t.category))];
        setCategories(cats as string[]);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, fetchTemplates]);

  // Create map from template
  const handleUseTemplate = async (templateId: string) => {
    setCreating(templateId);
    setPreviewTemplate(null);
    try {
      const response = await fetch(`${API_URL}/api/maps/from-template/${templateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          folderId: folderId || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onOpenChange(false);
        navigate(`/map/${data.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create map from template:', error);
    } finally {
      setCreating(null);
    }
  };

  // Create blank map
  const handleCreateBlank = async () => {
    setCreating('blank');
    try {
      const response = await fetch(`${API_URL}/api/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Untitled Mind Map',
          folderId: folderId || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onOpenChange(false);
        navigate(`/map/${data.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create blank map:', error);
    } finally {
      setCreating(null);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const templatesByCategory = filteredTemplates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, Template[]>
  );

  // Get total count for display
  const totalCount = filteredTemplates.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0" data-testid="template-gallery-dialog">
          {/* Header */}
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">Template Gallery</DialogTitle>
            <DialogDescription>
              Choose a template to get started quickly, or create a blank mind map
            </DialogDescription>
          </DialogHeader>

          {/* Search and Controls Bar */}
          <div className="flex items-center gap-4 px-6 py-4 border-b">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="template-search-input"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <button
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Template Count */}
            <span className="text-sm text-muted-foreground">
              {totalCount} template{totalCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 px-6 py-3 border-b overflow-x-auto" data-testid="category-tabs">
            <button
              className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
              onClick={() => setSelectedCategory(null)}
              data-testid="category-all"
            >
              All Templates
            </button>
            {categories.map((cat) => {
              const config = getCategoryConfig(cat);
              const Icon = config.icon;
              return (
                <button
                  key={cat}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : `${config.bgColor} ${config.color} hover:opacity-80`
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                  data-testid={`category-${cat.toLowerCase()}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Templates Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Blank Template Option */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Start Fresh
                  </h3>
                  <button
                    onClick={handleCreateBlank}
                    disabled={creating !== null}
                    className="w-full max-w-md p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-4 group"
                    data-testid="blank-template-button"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                      {creating === 'blank' ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <Plus className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Blank Mind Map</h4>
                      <p className="text-sm text-muted-foreground">
                        Start with an empty canvas and build your ideas from scratch
                      </p>
                    </div>
                  </button>
                </div>

                {/* Templates by Category */}
                {selectedCategory ? (
                  // Single category view
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      {(() => {
                        const config = getCategoryConfig(selectedCategory);
                        const Icon = config.icon;
                        return (
                          <>
                            <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            {config.label}
                          </>
                        );
                      })()}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({filteredTemplates.length})
                      </span>
                    </h3>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTemplates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isCreating={creating === template.id}
                            onUseTemplate={() => handleUseTemplate(template.id)}
                            onPreview={() => setPreviewTemplate(template)}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredTemplates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isCreating={creating === template.id}
                            onUseTemplate={() => handleUseTemplate(template.id)}
                            onPreview={() => setPreviewTemplate(template)}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // All categories view
                  Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
                    const config = getCategoryConfig(category);
                    const Icon = config.icon;
                    return (
                      <div key={category} data-testid={`category-section-${category.toLowerCase()}`}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          {config.label}
                          <span className="text-sm font-normal text-muted-foreground">
                            ({categoryTemplates.length})
                          </span>
                        </h3>
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryTemplates.map((template) => (
                              <TemplateCard
                                key={template.id}
                                template={template}
                                isCreating={creating === template.id}
                                onUseTemplate={() => handleUseTemplate(template.id)}
                                onPreview={() => setPreviewTemplate(template)}
                                viewMode={viewMode}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {categoryTemplates.map((template) => (
                              <TemplateCard
                                key={template.id}
                                template={template}
                                isCreating={creating === template.id}
                                onUseTemplate={() => handleUseTemplate(template.id)}
                                onPreview={() => setPreviewTemplate(template)}
                                viewMode={viewMode}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Empty State */}
                {filteredTemplates.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">No templates found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? `No templates match "${searchQuery}"`
                        : 'There are no templates in this category yet'}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Can't find what you need? Start with a blank template
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUseTemplate={() => handleUseTemplate(previewTemplate.id)}
        />
      )}
    </>
  );
}
