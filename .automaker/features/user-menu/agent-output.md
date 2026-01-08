
🔧 Tool: Task
Input: {
  "description": "Explore codebase structure",
  "prompt": "Explore the codebase to understand:\n1. The overall project structure (what framework, folder organization)\n2. How the header/navigation is currently implemented\n3. If Clerk is already set up and how it's configured\n4. What shadcn components are available\n5. Any existing user-related components or patterns\n\nFocus on finding:\n- The main layout and header files\n- Clerk configuration and usage patterns\n- shadcn/ui components that are already installed\n- Any existing dropdown or menu components\n\nProvide a detailed summary of what you find.",
  "subagent_type": "Explore"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper -type f -name \"*.json\" | grep -E \"(package\\.json|tsconfig)\" | head -20",
  "description": "Find package and config files"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/package.json",
  "path": "/projects/mindmapper"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/package.json"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src -type f -name \"*.tsx\" -o -name \"*.ts\" | grep -E \"(App|Layout|Header|main)\" | head -20",
  "description": "Find main app and layout files"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/main.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src -type f -name \"*.tsx\" | head -30",
  "description": "Find all TSX files in web/src"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/toolbar/Toolbar.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src/components -type d | head -20",
  "description": "List component directories"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src/components/auth -type f -name \"*.tsx\"",
  "description": "Find auth component files"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/src/components/ui/",
  "description": "List UI components"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/.env*",
  "path": "/projects/mindmapper"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/auth/UserMenu.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/auth/ProtectedRoute.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/.env.example"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/.env.example"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/dropdown-menu.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/auth/SignIn.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/auth/SignUp.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/.env.example"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/api/src -type f -name \"*.ts\" | head -20",
  "description": "Find API source files"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/api/src/middleware/auth.ts"
}

🔧 Tool: Bash
Input: {
  "command": "find /projects/mindmapper/apps/web/src/components/ui -name \"*.tsx\" | xargs ls -lh",
  "description": "List all UI components with sizes"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/button.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/dialog.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/select.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tailwind.config.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/index.css"
}
I have a comprehensive understanding of the codebase. Now let me look at the existing UserMenu component to understand its current implementation:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/auth/UserMenu.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/dropdown-menu.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/Dashboard.tsx"
}
Now I have a complete picture. The existing `UserMenu` component uses Clerk's `UserButton`, which already provides good functionality. However, the feature request asks for a custom implementation with shadcn Dropdown that includes:
1. Avatar
2. Profile info
3. Sign-out button

Let me create an enhanced UserMenu using the shadcn DropdownMenu component with more features:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create enhanced UserMenu component with shadcn Dropdown",
      "status": "in_progress",
      "activeForm": "Creating enhanced UserMenu component with shadcn Dropdown"
    },
    {
      "content": "Ensure proper avatar, profile info, and sign-out functionality",
      "status": "pending",
      "activeForm": "Ensuring proper avatar, profile info, and sign-out functionality"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "pending",
      "activeForm": "Creating and running Playwright verification test"
    },
    {
      "content": "Clean up test file after verification",
      "status": "pending",
      "activeForm": "Cleaning up test file after verification"
    }
  ]
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/auth/UserMenu.tsx",
  "old_string": "import { UserButton, useUser } from '@clerk/clerk-react';\n\nexport function UserMenu() {\n  const { user, isLoaded } = useUser();\n\n  if (!isLoaded) {\n    return (\n      <div className=\"w-8 h-8 rounded-full bg-muted animate-pulse\" />\n    );\n  }\n\n  if (!user) {\n    return null;\n  }\n\n  return (\n    <div className=\"flex items-center gap-3\">\n      <span className=\"text-sm text-muted-foreground hidden sm:inline\">\n        {user.firstName || user.emailAddresses[0]?.emailAddress}\n      </span>\n      <UserButton\n        appearance={{\n          elements: {\n            avatarBox: 'w-8 h-8',\n          },\n        }}\n        afterSignOutUrl=\"/sign-in\"\n      />\n    </div>\n  );\n}",
  "new_string": "import { useUser, useClerk } from '@clerk/clerk-react';\nimport { useNavigate } from 'react-router-dom';\nimport { LogOut, User, Settings, HelpCircle } from 'lucide-react';\nimport {\n  DropdownMenu,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuLabel,\n  DropdownMenuSeparator,\n  DropdownMenuTrigger,\n} from '@/components/ui/dropdown-menu';\nimport { Button } from '@/components/ui/button';\n\nexport function UserMenu() {\n  const { user, isLoaded } = useUser();\n  const { signOut } = useClerk();\n  const navigate = useNavigate();\n\n  if (!isLoaded) {\n    return (\n      <div className=\"w-8 h-8 rounded-full bg-muted animate-pulse\" />\n    );\n  }\n\n  if (!user) {\n    return null;\n  }\n\n  const displayName = user.firstName\n    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`\n    : user.emailAddresses[0]?.emailAddress || 'User';\n\n  const email = user.emailAddresses[0]?.emailAddress;\n  const initials = user.firstName && user.lastName\n    ? `${user.firstName[0]}${user.lastName[0]}`\n    : user.firstName\n    ? user.firstName[0]\n    : email\n    ? email[0].toUpperCase()\n    : 'U';\n\n  const handleSignOut = async () => {\n    await signOut();\n    navigate('/sign-in');\n  };\n\n  return (\n    <DropdownMenu>\n      <DropdownMenuTrigger asChild>\n        <Button\n          variant=\"ghost\"\n          className=\"flex items-center gap-2 px-2 h-auto py-1.5 hover:bg-accent\"\n          data-testid=\"user-menu-trigger\"\n        >\n          {/* Avatar */}\n          {user.imageUrl ? (\n            <img\n              src={user.imageUrl}\n              alt={displayName}\n              className=\"w-8 h-8 rounded-full object-cover\"\n            />\n          ) : (\n            <div className=\"w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium\">\n              {initials}\n            </div>\n          )}\n          {/* Name on larger screens */}\n          <span className=\"text-sm font-medium hidden sm:inline max-w-[120px] truncate\">\n            {displayName}\n          </span>\n        </Button>\n      </DropdownMenuTrigger>\n      <DropdownMenuContent align=\"end\" className=\"w-56\" data-testid=\"user-menu-content\">\n        {/* Profile Info Section */}\n        <DropdownMenuLabel className=\"font-normal\">\n          <div className=\"flex flex-col space-y-1\">\n            <p className=\"text-sm font-medium leading-none\" data-testid=\"user-menu-name\">{displayName}</p>\n            {email && (\n              <p className=\"text-xs leading-none text-muted-foreground\" data-testid=\"user-menu-email\">\n                {email}\n              </p>\n            )}\n          </div>\n        </DropdownMenuLabel>\n        <DropdownMenuSeparator />\n\n        {/* Profile Link */}\n        <DropdownMenuItem\n          className=\"cursor-pointer\"\n          onClick={() => window.open('https://accounts.clerk.dev/user', '_blank')}\n          data-testid=\"user-menu-profile\"\n        >\n          <User className=\"mr-2 h-4 w-4\" />\n          <span>Profile</span>\n        </DropdownMenuItem>\n\n        {/* Settings (placeholder for future) */}\n        <DropdownMenuItem\n          className=\"cursor-pointer\"\n          onClick={() => {/* Future: navigate to settings */}}\n          data-testid=\"user-menu-settings\"\n        >\n          <Settings className=\"mr-2 h-4 w-4\" />\n          <span>Settings</span>\n        </DropdownMenuItem>\n\n        {/* Help */}\n        <DropdownMenuItem\n          className=\"cursor-pointer\"\n          onClick={() => {/* Future: navigate to help */}}\n          data-testid=\"user-menu-help\"\n        >\n          <HelpCircle className=\"mr-2 h-4 w-4\" />\n          <span>Help & Support</span>\n        </DropdownMenuItem>\n\n        <DropdownMenuSeparator />\n\n        {/* Sign Out */}\n        <DropdownMenuItem\n          className=\"cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10\"\n          onClick={handleSignOut}\n          data-testid=\"user-menu-signout\"\n        >\n          <LogOut className=\"mr-2 h-4 w-4\" />\n          <span>Sign out</span>\n        </DropdownMenuItem>\n      </DropdownMenuContent>\n    </DropdownMenu>\n  );\n}"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create enhanced UserMenu component with shadcn Dropdown",
      "status": "completed",
      "activeForm": "Creating enhanced UserMenu component with shadcn Dropdown"
    },
    {
      "content": "Ensure proper avatar, profile info, and sign-out functionality",
      "status": "completed",
      "activeForm": "Ensuring proper avatar, profile info, and sign-out functionality"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "in_progress",
      "activeForm": "Creating and running Playwright verification test"
    },
    {
      "content": "Clean up test file after verification",
      "status": "pending",
      "activeForm": "Cleaning up test file after verification"
    }
  ]
}
Now let me check if there's an existing Playwright configuration in the project:

🔧 Tool: Glob
Input: {
  "pattern": "**/playwright.config.*"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/e2e/**/*.spec.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/playwright.config.ts"
}
Now let me check if a tests directory exists and check for existing tests to understand the testing patterns:

🔧 Tool: Glob
Input: {
  "pattern": "**/tests/**/*.spec.ts"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/apps/web/tests 2>/dev/null || echo \"Tests directory does not exist\"",
  "description": "Check for tests directory"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/create-map-dialog.spec.ts"
}
Now let me create a verification test for the UserMenu. Since this app requires Clerk authentication, I'll need to create a test that can work with the component. Let me first check the App.tsx to understand the routing structure:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx"
}
I see the app has both auth-enabled and auth-disabled modes. The UserMenu component uses `useUser()` from Clerk, so it needs Clerk to be enabled. However, when Clerk is not available (VITE_CLERK_PUBLISHABLE_KEY not set), the component won't render users.

Let me check how the existing test handles this and whether there's a test setup or mock:

🔧 Tool: Glob
Input: {
  "pattern": "**/apps/web/**/*.setup.ts"
}

🔧 Tool: Bash
Input: {
  "command": "cat /projects/mindmapper/apps/web/.env.example 2>/dev/null || echo \"No .env.example found\"",
  "description": "Check env example"
}
The app requires Clerk to be set up for the UserMenu to render properly. Since testing authenticated flows with Clerk requires specific test credentials and setup, let me create a test that verifies the UI elements work correctly. I'll create a comprehensive test that checks for the UserMenu's structural elements when Clerk is configured:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/user-menu-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * User Menu Verification Test\n *\n * This test verifies the UserMenu component functionality.\n * Note: The UserMenu only appears when Clerk authentication is enabled and user is signed in.\n *\n * The test checks:\n * 1. User menu trigger is visible and clickable\n * 2. Dropdown opens with correct menu items\n * 3. Profile info (name, email) is displayed\n * 4. Sign out button is present\n */\n\ntest.describe('User Menu', () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to the dashboard\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n  });\n\n  test('should display user menu trigger in header when authenticated', async ({ page }) => {\n    // Check if Clerk is enabled and user is authenticated\n    // The user menu trigger should be visible if the user is signed in\n    const userMenuTrigger = page.getByTestId('user-menu-trigger');\n\n    // Check if user is signed in (menu trigger exists)\n    const isVisible = await userMenuTrigger.isVisible().catch(() => false);\n\n    if (isVisible) {\n      // User is authenticated - test the menu\n      await expect(userMenuTrigger).toBeVisible();\n\n      // Check that avatar or initials are present\n      const avatar = userMenuTrigger.locator('img');\n      const initials = userMenuTrigger.locator('div.rounded-full');\n\n      const hasAvatar = await avatar.isVisible().catch(() => false);\n      const hasInitials = await initials.isVisible().catch(() => false);\n\n      expect(hasAvatar || hasInitials).toBe(true);\n    } else {\n      // User is not authenticated or Clerk is not enabled\n      // Redirect to sign-in is expected\n      await expect(page).toHaveURL(/sign-in|$/);\n      test.skip();\n    }\n  });\n\n  test('should open dropdown with menu items when clicked', async ({ page }) => {\n    const userMenuTrigger = page.getByTestId('user-menu-trigger');\n    const isVisible = await userMenuTrigger.isVisible().catch(() => false);\n\n    if (!isVisible) {\n      test.skip();\n      return;\n    }\n\n    // Click the user menu trigger\n    await userMenuTrigger.click();\n\n    // Wait for dropdown to appear\n    const dropdownContent = page.getByTestId('user-menu-content');\n    await expect(dropdownContent).toBeVisible({ timeout: 5000 });\n\n    // Check for essential menu elements\n    await expect(page.getByTestId('user-menu-name')).toBeVisible();\n    await expect(page.getByTestId('user-menu-profile')).toBeVisible();\n    await expect(page.getByTestId('user-menu-settings')).toBeVisible();\n    await expect(page.getByTestId('user-menu-help')).toBeVisible();\n    await expect(page.getByTestId('user-menu-signout')).toBeVisible();\n\n    // Check for menu item icons and text\n    await expect(page.getByText('Profile')).toBeVisible();\n    await expect(page.getByText('Settings')).toBeVisible();\n    await expect(page.getByText('Help & Support')).toBeVisible();\n    await expect(page.getByText('Sign out')).toBeVisible();\n  });\n\n  test('should display user profile info in dropdown', async ({ page }) => {\n    const userMenuTrigger = page.getByTestId('user-menu-trigger');\n    const isVisible = await userMenuTrigger.isVisible().catch(() => false);\n\n    if (!isVisible) {\n      test.skip();\n      return;\n    }\n\n    // Click the user menu trigger\n    await userMenuTrigger.click();\n\n    // Wait for dropdown to appear\n    const dropdownContent = page.getByTestId('user-menu-content');\n    await expect(dropdownContent).toBeVisible({ timeout: 5000 });\n\n    // User name should be displayed\n    const userName = page.getByTestId('user-menu-name');\n    await expect(userName).toBeVisible();\n    const nameText = await userName.textContent();\n    expect(nameText).toBeTruthy();\n    expect(nameText!.length).toBeGreaterThan(0);\n\n    // Email might be displayed (optional for some users)\n    const userEmail = page.getByTestId('user-menu-email');\n    const hasEmail = await userEmail.isVisible().catch(() => false);\n    if (hasEmail) {\n      const emailText = await userEmail.textContent();\n      expect(emailText).toMatch(/@/); // Should contain @ if it's an email\n    }\n  });\n\n  test('should close dropdown when clicking outside', async ({ page }) => {\n    const userMenuTrigger = page.getByTestId('user-menu-trigger');\n    const isVisible = await userMenuTrigger.isVisible().catch(() => false);\n\n    if (!isVisible) {\n      test.skip();\n      return;\n    }\n\n    // Click the user menu trigger\n    await userMenuTrigger.click();\n\n    // Wait for dropdown to appear\n    const dropdownContent = page.getByTestId('user-menu-content');\n    await expect(dropdownContent).toBeVisible({ timeout: 5000 });\n\n    // Click outside the dropdown\n    await page.click('body', { position: { x: 100, y: 100 } });\n\n    // Dropdown should close\n    await expect(dropdownContent).not.toBeVisible({ timeout: 5000 });\n  });\n\n  test('should have sign out button with destructive styling', async ({ page }) => {\n    const userMenuTrigger = page.getByTestId('user-menu-trigger');\n    const isVisible = await userMenuTrigger.isVisible().catch(() => false);\n\n    if (!isVisible) {\n      test.skip();\n      return;\n    }\n\n    // Click the user menu trigger\n    await userMenuTrigger.click();\n\n    // Wait for dropdown to appear\n    await expect(page.getByTestId('user-menu-content')).toBeVisible({ timeout: 5000 });\n\n    // Check the sign out button\n    const signOutButton = page.getByTestId('user-menu-signout');\n    await expect(signOutButton).toBeVisible();\n\n    // Check it has destructive styling (contains the text \"Sign out\")\n    await expect(signOutButton).toContainText('Sign out');\n  });\n});\n"
}
Now let me run the test to verify the implementation. First, let me check if the dev server is running or if we need to start it:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright test user-menu-verification.spec.ts --reporter=list 2>&1",
  "description": "Run Playwright test for UserMenu",
  "timeout": 180000
}
The Playwright test failed due to missing system libraries (libglib-2.0.so.0) which is an environment issue. Let me verify the implementation by building the project instead, which will check for TypeScript errors:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && pnpm tsc --noEmit 2>&1 | head -50",
  "description": "TypeScript check for errors",
  "timeout": 60000
}
The TypeScript compilation passed without errors. Let me also try building the project to ensure the code compiles:

🔧 Tool: Bash
Input: {
  "command": "pnpm build 2>&1 | tail -30",
  "description": "Build the web app",
  "timeout": 120000
}
The build succeeded. Now let me clean up the test file since we can't run Playwright in this environment (missing system libraries):

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/user-menu-verification.spec.ts",
  "description": "Remove verification test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Create enhanced UserMenu component with shadcn Dropdown",
      "status": "completed",
      "activeForm": "Creating enhanced UserMenu component with shadcn Dropdown"
    },
    {
      "content": "Ensure proper avatar, profile info, and sign-out functionality",
      "status": "completed",
      "activeForm": "Ensuring proper avatar, profile info, and sign-out functionality"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "completed",
      "activeForm": "Creating and running Playwright verification test"
    },
    {
      "content": "Clean up test file after verification",
      "status": "completed",
      "activeForm": "Cleaning up test file after verification"
    }
  ]
}
Let me read the final implementation to include in the summary:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/auth/UserMenu.tsx"
}
<summary>
## Summary: Header User Menu with Avatar, Profile Info, and Sign-out

### Changes Implemented
- **Replaced Clerk's UserButton with custom shadcn Dropdown implementation**: The UserMenu component now uses shadcn's DropdownMenu components instead of Clerk's built-in UserButton for more customization control
- **Added avatar display**: Shows user's profile image when available, falls back to initials (first letter of first/last name, or email)
- **Added profile info section**: Displays user's full name and email address in the dropdown header
- **Added menu items with icons**:
  - Profile link (opens Clerk user profile in new tab)
  - Settings placeholder (for future implementation)
  - Help & Support placeholder (for future implementation)
  - Sign out button with destructive styling
- **Responsive design**: Shows user name on larger screens (hidden on mobile), always shows avatar
- **Added data-testid attributes**: For all interactive elements to support E2E testing

### Files Modified
- `/projects/mindmapper/apps/web/src/components/auth/UserMenu.tsx` - Complete rewrite with custom dropdown implementation

### Verification Status
- **TypeScript compilation**: ✅ Passed (no type errors)
- **Production build**: ✅ Successful (vite build completed in 5.70s)
- **Playwright tests**: Could not run due to missing system libraries (libglib-2.0.so.0) in the environment. A verification test was created but removed after the environment limitation was discovered.

### Notes for Developer
1. **Settings and Help menu items are placeholders**: The Settings and Help & Support menu items currently have empty onClick handlers. These should be connected to actual routes/modals when those features are implemented.
2. **Profile link opens Clerk's hosted profile**: The Profile menu item opens `https://accounts.clerk.dev/user` in a new tab. You may want to implement a custom profile page and update this URL.
3. **Test data attributes added**: The component includes `data-testid` attributes on all interactive elements for easy E2E testing:
   - `user-menu-trigger` - The avatar/name button
   - `user-menu-content` - The dropdown content
   - `user-menu-name` - User's display name
   - `user-menu-email` - User's email
   - `user-menu-profile` - Profile link
   - `user-menu-settings` - Settings link
   - `user-menu-help` - Help link
   - `user-menu-signout` - Sign out button
4. **Sign out behavior**: The sign out redirects to `/sign-in` after successfully signing out via Clerk
</summary>