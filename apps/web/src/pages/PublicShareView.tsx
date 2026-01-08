import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Node,
  type Edge,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, Lock, Eye, XCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MindMapNode } from '@/components/canvas/MindMapNode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ShareInfo {
  id: string;
  title: string;
  mapTitle: string;
  mapDescription: string | null;
  mapThumbnail: string | null;
  permission: 'VIEWER' | 'COMMENTER' | 'EDITOR';
  requiresPassword: boolean;
  expiresAt: string | null;
}

interface MindMapData {
  id: string;
  title: string;
  description: string | null;
  nodes: Array<{
    id: string;
    text: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    style: Record<string, unknown>;
    parentId: string | null;
    type: string;
  }>;
  connections: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    label: string | null;
    style: Record<string, unknown>;
  }>;
}

interface ContentResponse {
  permission: string;
  title: string;
  mindMap: MindMapData;
}

const nodeTypes = { mindmap: MindMapNode };

function PublicShareViewContent() {
  const { token } = useParams<{ token: string }>();

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [content, setContent] = useState<ContentResponse | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  // Fetch share info on mount
  useEffect(() => {
    if (token) {
      fetchShareInfo();
    }
  }, [token]);

  const fetchShareInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/shareable-links/public/${token}`);

      if (response.ok) {
        const data = await response.json();
        setShareInfo(data.data);

        // If no password required, fetch content immediately
        if (!data.data.requiresPassword) {
          setIsPasswordVerified(true);
          await fetchContent();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load shared content');
      }
    } catch (err) {
      console.error('Failed to fetch share info:', err);
      setError('Failed to load shared content');
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async (providedPassword?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (providedPassword) {
        headers['x-share-password'] = providedPassword;
      }

      const response = await fetch(`${API_URL}/api/shareable-links/public/${token}/content`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.data);
        setIsPasswordVerified(true);
        setPasswordError(null);
        return true;
      } else {
        const errorData = await response.json();
        if (errorData.requiresPassword) {
          // Password needed but not provided or invalid
          setPasswordError('Password is required');
        } else if (response.status === 401) {
          setPasswordError('Invalid password');
        } else {
          setError(errorData.error?.message || 'Failed to load content');
        }
        return false;
      }
    } catch (err) {
      console.error('Failed to fetch content:', err);
      setError('Failed to load content');
      return false;
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Please enter a password');
      return;
    }

    setVerifying(true);
    setPasswordError(null);

    const success = await fetchContent(password);
    if (!success) {
      setVerifying(false);
    }
  };

  // Convert API data to ReactFlow format
  const { nodes, edges } = useCallback(() => {
    if (!content?.mindMap) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = content.mindMap.nodes.map((node) => ({
      id: node.id,
      type: 'mindmap',
      position: { x: node.positionX, y: node.positionY },
      data: {
        label: node.text,
        style: node.style,
        width: node.width,
        height: node.height,
        nodeType: node.type,
        parentId: node.parentId,
      },
    }));

    const flowEdges: Edge[] = content.mindMap.connections.map((conn) => ({
      id: conn.id,
      source: conn.sourceNodeId,
      target: conn.targetNodeId,
      label: conn.label || undefined,
      type: 'smoothstep',
      style: { stroke: '#94a3b8' },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [content])();

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading shared mind map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Share Link Invalid</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              This link may have expired, been revoked, or reached its access limit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Password entry state
  if (shareInfo?.requiresPassword && !isPasswordVerified) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Protected</h1>
            <p className="text-gray-600">
              This mind map is password protected. Please enter the password to view it.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">{shareInfo.title || shareInfo.mapTitle}</h2>
            {shareInfo.mapDescription && (
              <p className="text-sm text-gray-600">{shareInfo.mapDescription}</p>
            )}
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={passwordError ? 'border-red-500' : ''}
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-red-500 mt-1">{passwordError}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  View Mind Map
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Main content view
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Share2 className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="font-semibold text-gray-900">
              {content?.title || shareInfo?.mapTitle || 'Shared Mind Map'}
            </h1>
            {content?.mindMap?.description && (
              <p className="text-sm text-gray-500">{content.mindMap.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <Eye className="w-4 h-4 inline mr-1" />
            {shareInfo?.permission || 'VIEWER'}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor="#3b82f6"
            maskColor="rgba(0, 0, 0, 0.1)"
            style={{ width: 150, height: 100 }}
          />
        </ReactFlow>
      </div>

      {/* Footer */}
      <div className="bg-white border-t px-4 py-2 text-center text-sm text-gray-500 shrink-0">
        Shared with MindMapper
        {shareInfo?.expiresAt && (
          <span className="ml-2">
            | Expires: {new Date(shareInfo.expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PublicShareView() {
  return (
    <ReactFlowProvider>
      <PublicShareViewContent />
    </ReactFlowProvider>
  );
}
