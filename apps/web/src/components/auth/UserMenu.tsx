import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, HelpCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  if (!isLoaded) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.emailAddresses[0]?.emailAddress || 'User';

  const email = user.emailAddresses[0]?.emailAddress;
  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.firstName
    ? user.firstName[0]
    : email
    ? email[0].toUpperCase()
    : 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 h-auto py-1.5 hover:bg-accent"
          data-testid="user-menu-trigger"
        >
          {/* Avatar */}
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {initials}
            </div>
          )}
          {/* Name on larger screens */}
          <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-testid="user-menu-content">
        {/* Profile Info Section */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none" data-testid="user-menu-name">{displayName}</p>
            {email && (
              <p className="text-xs leading-none text-muted-foreground" data-testid="user-menu-email">
                {email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Profile Link */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => window.open('https://accounts.clerk.dev/user', '_blank')}
          data-testid="user-menu-profile"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        {/* Settings (placeholder for future) */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {/* Future: navigate to settings */}}
          data-testid="user-menu-settings"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        {/* Help */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {/* Future: navigate to help */}}
          data-testid="user-menu-help"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={handleSignOut}
          data-testid="user-menu-signout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
