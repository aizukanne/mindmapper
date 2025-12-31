import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

const CATEGORY_COLORS: Record<string, string> = {
  General: 'bg-blue-100 text-blue-800',
  Business: 'bg-purple-100 text-purple-800',
  'Project Management': 'bg-green-100 text-green-800',
  'Decision Making': 'bg-orange-100 text-orange-800',
};

export function TemplateGallery({ open, onOpenChange, folderId }: TemplateGalleryProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Mind Map</DialogTitle>
          <DialogDescription>
            Choose a template or start from scratch
          </DialogDescription>
        </DialogHeader>

        {/* Search and filter bar */}
        <div className="flex gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <button
              className={`px-2 py-1 text-sm rounded ${
                !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-2 py-1 text-sm rounded ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Blank template */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Start Fresh</h3>
                <button
                  onClick={handleCreateBlank}
                  disabled={creating !== null}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/30 transition-colors text-left flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    {creating === 'blank' ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">Blank Mind Map</h4>
                    <p className="text-sm text-muted-foreground">
                      Start with an empty canvas
                    </p>
                  </div>
                </button>
              </div>

              {/* Templates by category */}
              {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleUseTemplate(template.id)}
                        disabled={creating !== null}
                        className="p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            {creating === template.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{template.name}</h4>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {template.category}
                              </span>
                            </div>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {filteredTemplates.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No templates found</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Try a different search term</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
