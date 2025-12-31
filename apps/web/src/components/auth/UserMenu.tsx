import { UserButton, useUser } from '@clerk/clerk-react';

export function UserMenu() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {user.firstName || user.emailAddresses[0]?.emailAddress}
      </span>
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-8 h-8',
          },
        }}
        afterSignOutUrl="/sign-in"
      />
    </div>
  );
}
