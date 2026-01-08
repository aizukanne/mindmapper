import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Copy,
  Link2,
  Trash2,
  Check,
  Globe,
  Lock,
  Loader2,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
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

type Permission = 'VIEWER' | 'COMMENTER' | 'EDITOR';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Share {
  id: string;
  shareToken: string | null;
  permission: Permission;
  userId: string | null;
  user: User | null;
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

const PERMISSION_LABELS: Record<Permission, string> = {
  VIEWER: 'Can view',
  COMMENTER: 'Can comment',
  EDITOR: 'Can edit',
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permission, setPermission] = useState<Permission>('VIEWER');
  const [copied, setCopied] = useState(false);
  const [linkShare, setLinkShare] = useState<Share | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setShowSearchResults(false);
    }
  }, [open, fetchShares]);

  // Search users with debounce
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_URL}/api/users/search?q=${encodeURIComponent(query)}&limit=5`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out users who already have access
        const existingUserIds = shares
          .filter((s) => s.userId)
          .map((s) => s.userId);
        const filteredResults = (data.data || []).filter(
          (u: User) => !existingUserIds.includes(u.id)
        );
        setSearchResults(filteredResults);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [shares]);

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedUser(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Select a user from search results
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setShowSearchResults(false);
  };

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

  // Share with selected user
  const shareWithUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/maps/${mapId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUser.id,
          permission,
        }),
      });
      if (response.ok) {
        await fetchShares();
        setSearchQuery('');
        setSelectedUser(null);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to share with user:', error);
    }
    setLoading(false);
  };

  // Update share permission
  const updateSharePermission = async (shareId: string, newPermission: Permission) => {
    try {
      const response = await fetch(
        `${API_URL}/api/maps/${mapId}/shares/${shareId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ permission: newPermission }),
        }
      );
      if (response.ok) {
        setShares(
          shares.map((s) =>
            s.id === shareId ? { ...s, permission: newPermission } : s
          )
        );
        if (linkShare?.id === shareId) {
          setLinkShare({ ...linkShare, permission: newPermission });
        }
      }
    } catch (error) {
      console.error('Failed to update share permission:', error);
    }
  };

  // Delete share
  const deleteShare = async (shareId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/maps/${mapId}/shares/${shareId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
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
      // Extract full token from masked version (last 8 chars)
      // Actually we need the full URL - let's compute it
      const url = `${window.location.origin}/shared/${mapId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareUrl = linkShare
    ? `${window.location.origin}/shared/${mapId}`
    : '';

  // Get user shares (excluding link shares)
  const userShares = shares.filter((s) => s.userId);

  // Get user initials
  const getUserInitials = (user: User) => {
    if (user.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="share-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share "{mapTitle}"
          </DialogTitle>
          <DialogDescription>
            Invite collaborators or create a shareable link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-green-600" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm font-medium">Public access</Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? 'Anyone with the link can view'
                    : 'Only invited people can access'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={onPublicChange}
              data-testid="public-toggle"
            />
          </div>

          {/* User search and invite */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Invite people</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                  className="pl-9"
                  data-testid="user-search-input"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {selectedUser && (
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchQuery('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}

                {/* Search results dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-popover p-1 shadow-md"
                    data-testid="search-results"
                  >
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                        data-testid={`search-result-${user.id}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            getUserInitials(user)
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium">
                            {user.name || user.email}
                          </p>
                          {user.name && (
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {showSearchResults &&
                  searchResults.length === 0 &&
                  searchQuery.length >= 2 &&
                  !isSearching && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                      No users found
                    </div>
                  )}
              </div>

              <Select
                value={permission}
                onValueChange={(v: Permission) => setPermission(v)}
              >
                <SelectTrigger className="w-32" data-testid="permission-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">{PERMISSION_LABELS.VIEWER}</SelectItem>
                  <SelectItem value="COMMENTER">{PERMISSION_LABELS.COMMENTER}</SelectItem>
                  <SelectItem value="EDITOR">{PERMISSION_LABELS.EDITOR}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={shareWithUser}
                disabled={loading || !selectedUser}
                data-testid="invite-button"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Share link section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Share link</Label>
            {linkShare ? (
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 text-sm"
                  data-testid="share-url-input"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  className="shrink-0"
                  data-testid="copy-link-button"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Select
                  value={linkShare.permission}
                  onValueChange={(v: Permission) =>
                    updateSharePermission(linkShare.id, v)
                  }
                >
                  <SelectTrigger className="w-32" data-testid="link-permission-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">{PERMISSION_LABELS.VIEWER}</SelectItem>
                    <SelectItem value="COMMENTER">{PERMISSION_LABELS.COMMENTER}</SelectItem>
                    <SelectItem value="EDITOR">{PERMISSION_LABELS.EDITOR}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deleteShare(linkShare.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                  data-testid="delete-link-button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={permission}
                  onValueChange={(v: Permission) => setPermission(v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">{PERMISSION_LABELS.VIEWER}</SelectItem>
                    <SelectItem value="COMMENTER">{PERMISSION_LABELS.COMMENTER}</SelectItem>
                    <SelectItem value="EDITOR">{PERMISSION_LABELS.EDITOR}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={createShareLink}
                  disabled={loading}
                  className="flex-1"
                  data-testid="create-link-button"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Create link
                </Button>
              </div>
            )}
          </div>

          {/* Existing shares list */}
          {userShares.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">People with access</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto" data-testid="shares-list">
                {userShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                    data-testid={`share-item-${share.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                        {share.user?.avatarUrl ? (
                          <img
                            src={share.user.avatarUrl}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : share.user ? (
                          getUserInitials(share.user)
                        ) : (
                          '??'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {share.user?.name || share.user?.email || 'Unknown user'}
                        </p>
                        {share.user?.name && (
                          <p className="text-xs text-muted-foreground">
                            {share.user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={share.permission}
                        onValueChange={(v: Permission) =>
                          updateSharePermission(share.id, v)
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-28 text-xs"
                          data-testid={`share-permission-${share.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEWER" className="text-xs">
                            {PERMISSION_LABELS.VIEWER}
                          </SelectItem>
                          <SelectItem value="COMMENTER" className="text-xs">
                            {PERMISSION_LABELS.COMMENTER}
                          </SelectItem>
                          <SelectItem value="EDITOR" className="text-xs">
                            {PERMISSION_LABELS.EDITOR}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteShare(share.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        data-testid={`delete-share-${share.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
