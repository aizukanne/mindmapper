import { useState, useEffect } from 'react';
import { ChevronRight, Home, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface BreadcrumbNavProps {
  treeId: string;
  selectedPersonId: string | null;
  onPersonClick: (personId: string) => void;
  className?: string;
}

interface LineageItem {
  id: string;
  firstName: string;
  lastName: string;
  generation: number;
}

export function BreadcrumbNav({
  treeId,
  selectedPersonId,
  onPersonClick,
  className = '',
}: BreadcrumbNavProps) {
  const [lineage, setLineage] = useState<LineageItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPersonId) {
      setLineage([]);
      return;
    }

    const fetchLineage = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/api/family-trees/${treeId}/people/${selectedPersonId}/lineage`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const data = await response.json();
          setLineage(data.data.lineage || []);
        }
      } catch (error) {
        console.error('Failed to fetch lineage:', error);
        setLineage([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLineage();
  }, [treeId, selectedPersonId]);

  if (!selectedPersonId) {
    return null;
  }

  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`}>
      <button
        onClick={() => onPersonClick('')}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
        title="Back to tree root"
      >
        <Home className="w-4 h-4" />
      </button>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />
      ) : (
        lineage.map((item) => (
          <div key={item.id} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => onPersonClick(item.id)}
              className={`px-2 py-1 rounded hover:bg-gray-100 transition-colors truncate max-w-[120px] ${
                item.id === selectedPersonId
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={`${item.firstName} ${item.lastName}`}
            >
              {item.firstName} {item.lastName}
            </button>
          </div>
        ))
      )}
    </nav>
  );
}
