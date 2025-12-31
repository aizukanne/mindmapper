import { useState, useEffect, useCallback } from 'react';
import { Copy, Link2, Mail, Trash2, Check, Globe, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Share {
  id: string;
  shareToken: string | null;
  permission: 'VIEWER' | 'COMMENTER' | 'EDITOR';
  userId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ShareModalProps {
  mapId: string;
  mapTitle: string;
  isPublic: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublicChange?: (isPublic: boolean) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function ShareModal({
  mapId,
  mapTitle,
  isPublic,
  open,
  onOpenChange,
  onPublicChange,
}: ShareModalProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'VIEWER' | 'COMMENTER' | 'EDITOR'>('VIEWER');
  const [copied, setCopied] = useState(false);
  const [linkShare, setLinkShare] = useState<Share | null>(null);

  // Fetch existing shares
  const fetchShares = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}/shares`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setShares(data.data || []);
        // Find link share (share without userId)
        const link = data.data?.find((s: Share) => s.shareToken && !s.userId);
        setLinkShare(link || null);
      }
    } catch (error) {
      console.error('Failed to fetch shares:', error);
    }
  }, [mapId]);

  useEffect(() => {
    if (open) {
      fetchShares();
    }
  }, [open, fetchShares]);

  // Create share link
  const createShareLink = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permission }),
      });
      if (response.ok) {
        await fetchShares();
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
    }
    setLoading(false);
  };

  // Delete share
  const deleteShare = async (shareId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}/shares/${shareId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setShares(shares.filter((s) => s.id !== shareId));
        if (linkShare?.id === shareId) {
          setLinkShare(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete share:', error);
    }
  };

  // Copy link to clipboard
  const copyLink = () => {
    if (linkShare?.shareToken) {
      const url = `${window.location.origin}/shared/${linkShare.shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Invite by email (placeholder - would need backend support)
  const inviteByEmail = async () => {
    if (!email) return;
    setLoading(true);
    // TODO: Implement email invitation
    console.log('Invite:', email, 'with permission:', permission);
    setEmail('');
    setLoading(false);
  };

  const shareUrl = linkShare?.shareToken
    ? `${window.location.origin}/shared/${linkShare.shareToken}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{mapTitle}"</DialogTitle>
          <DialogDescription>
            Invite collaborators or create a shareable link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label>Public access</Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Anyone with the link can view' : 'Only invited people can access'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={onPublicChange}
            />
          </div>

          {/* Share link */}
          <div className="space-y-2">
            <Label>Share link</Label>
            {linkShare ? (
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deleteShare(linkShare.id)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={permission}
                  onValueChange={(v: 'VIEWER' | 'COMMENTER' | 'EDITOR') => setPermission(v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Can view</SelectItem>
                    <SelectItem value="COMMENTER">Can comment</SelectItem>
                    <SelectItem value="EDITOR">Can edit</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={createShareLink}
                  disabled={loading}
                  className="flex-1"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Create link
                </Button>
              </div>
            )}
          </div>

          {/* Invite by email */}
          <div className="space-y-2">
            <Label>Invite people</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={inviteByEmail}
                disabled={loading || !email}
              >
                <Mail className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>
          </div>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label>People with access</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {shares
                  .filter((s) => s.userId)
                  .map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {share.userId?.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">User</p>
                          <p className="text-xs text-muted-foreground">
                            {share.permission.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteShare(share.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
