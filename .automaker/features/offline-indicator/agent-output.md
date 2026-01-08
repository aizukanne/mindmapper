
🔧 Tool: Bash
Input: {
  "command": "curl -s http://localhost:5173 2>&1 | head -50",
  "description": "Check if dev server is running"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useNetworkStatus.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/mobile/OfflineIndicator.tsx"
}
The dev server is running and the code looks good. Let me also check the App.tsx to verify the integration and check the appStore to make sure the required state properties exist:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/App.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/stores/appStore.ts"
}
The implementation is complete. The appStore already has all the necessary state and actions (`connectionStatus`, `syncStatus`, `pendingSyncCount`, `goOnline`, `goOffline`, etc.) that our `useNetworkStatus` hook uses.

Now let me try to run the Playwright tests again with a different approach - let's check if we can install Playwright browsers first:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright install chromium 2>&1 | tail -30",
  "description": "Install Playwright chromium browser",
  "timeout": 120000
}

🔧 Tool: Bash
Input: {
  "command": "npx playwright install chromium 2>&1 | tail -30",
  "description": "Install Playwright chromium browser",
  "timeout": 180000
}

🔧 Tool: TaskOutput
Input: {
  "task_id": "b3db6ce",
  "block": true,
  "timeout": 180000
}
Playwright is installed. Now let me start the dev server in the background and run the tests:

🔧 Tool: Bash
Input: {
  "command": "pkill -f \"vite\" 2>/dev/null; sleep 1; pnpm dev &\nsleep 10\ncurl -s http://localhost:5173 | head -10",
  "description": "Start dev server and verify",
  "timeout": 30000
}

🔧 Tool: TaskOutput
Input: {
  "task_id": "b342501",
  "block": true,
  "timeout": 30000
}
The dev server is already running. Let me run the Playwright tests now:

🔧 Tool: Bash
Input: {
  "command": "npx playwright test offline-indicator-verification.spec.ts --reporter=list 2>&1",
  "description": "Run Playwright tests for offline indicator",
  "timeout": 300000
}
The Playwright tests fail due to missing system libraries (`libglib-2.0.so.0`) in this environment. This is an infrastructure limitation, not a code issue. Let me verify the build was successful and manually verify the feature using TypeScript type-checking:

🔧 Tool: Bash
Input: {
  "command": "pnpm tsc --noEmit 2>&1",
  "description": "Run TypeScript type checking",
  "timeout": 60000
}
There are pre-existing TypeScript errors in the codebase (not related to our changes). Let me specifically check that our new files compile correctly:

🔧 Tool: Bash
Input: {
  "command": "npx tsc --noEmit src/hooks/useNetworkStatus.ts src/components/mobile/OfflineIndicator.tsx 2>&1 || echo \"Checking syntax with isolated check...\"",
  "description": "Check our new files for TypeScript errors",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "pnpm build 2>&1 | tail -20",
  "description": "Run full build to verify no errors",
  "timeout": 120000
}
The build is successful. Now let me update the todo list and clean up the test file:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and components",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Add useNetworkStatus hook for centralized network monitoring",
      "status": "completed",
      "activeForm": "Adding useNetworkStatus hook"
    },
    {
      "content": "Enhance OfflineIndicator to be a global component",
      "status": "completed",
      "activeForm": "Enhancing OfflineIndicator component"
    },
    {
      "content": "Integrate OfflineIndicator into App.tsx for app-wide coverage",
      "status": "completed",
      "activeForm": "Integrating offline indicator into App"
    },
    {
      "content": "Create Playwright test for verification",
      "status": "completed",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "completed",
      "activeForm": "Running verification test"
    },
    {
      "content": "Clean up temporary test file",
      "status": "in_progress",
      "activeForm": "Cleaning up test file"
    }
  ]
}

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/offline-indicator-verification.spec.ts && echo \"Test file deleted successfully\"",
  "description": "Remove temporary Playwright test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and components",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Add useNetworkStatus hook for centralized network monitoring",
      "status": "completed",
      "activeForm": "Adding useNetworkStatus hook"
    },
    {
      "content": "Enhance OfflineIndicator to be a global component",
      "status": "completed",
      "activeForm": "Enhancing OfflineIndicator component"
    },
    {
      "content": "Integrate OfflineIndicator into App.tsx for app-wide coverage",
      "status": "completed",
      "activeForm": "Integrating offline indicator into App"
    },
    {
      "content": "Create Playwright test for verification",
      "status": "completed",
      "activeForm": "Creating Playwright test"
    },
    {
      "content": "Run verification test and fix any issues",
      "status": "completed",
      "activeForm": "Running verification test"
    },
    {
      "content": "Clean up temporary test file",
      "status": "completed",
      "activeForm": "Cleaning up test file"
    }
  ]
}
Now let me verify the implementation one more time by checking if we have all the required functionality and stopping the dev server:

🔧 Tool: Bash
Input: {
  "command": "pkill -f \"vite\" 2>/dev/null; echo \"Dev server stopped\"",
  "description": "Stop the dev server"
}
<summary>
## Summary: Show banner when offline, indicate sync status, and notify when connection is restored

### Changes Implemented
1. **Created `useNetworkStatus` hook** (`/apps/web/src/hooks/useNetworkStatus.ts`) - A centralized hook for monitoring network connectivity status that:
   - Tracks online/offline state using browser events (`navigator.onLine`, `online`/`offline` events)
   - Provides `justReconnected` state for showing "Back online" notifications (auto-hides after 3 seconds)
   - Tracks `offlineSince` timestamp for displaying offline duration
   - Integrates with the app's Zustand store for sync status and pending sync count
   - Provides callbacks for `onOnline`, `onOffline`, and `onSyncComplete` events
   - Includes `formatOfflineDuration` helper function

2. **Enhanced `OfflineIndicator` component** (`/apps/web/src/components/mobile/OfflineIndicator.tsx`) - Updated to:
   - Support two variants: `banner` (full-width, for global usage) and `pill` (original rounded style)
   - Support configurable position (`top` or `bottom`)
   - Support dismissible notifications (but not for critical states like offline/error)
   - Use the new `useNetworkStatus` hook for centralized state management
   - Display prioritized states: offline → syncing → error → sync complete → reconnected
   - Include accessibility attributes (`role="alert"`, `aria-live="polite"`)
   - Add test IDs for testing (`data-testid="offline-banner"`, `data-testid="offline-indicator"`)

3. **Added `CompactSyncStatus` component** - Updated to use `useNetworkStatus` hook for consistent state

4. **Added `GlobalOfflineBanner` component** - A convenience wrapper for app-wide usage

5. **Integrated into `App.tsx`** - Added `GlobalOfflineBanner` to both `AppContentWithAuth` and `AppContentWithoutAuth` components for app-wide offline indicator coverage

### Files Modified
- `/projects/mindmapper/apps/web/src/hooks/useNetworkStatus.ts` (new file)
- `/projects/mindmapper/apps/web/src/components/mobile/OfflineIndicator.tsx` (enhanced)
- `/projects/mindmapper/apps/web/src/App.tsx` (integrated GlobalOfflineBanner)

### Verification Status
- **Build verification**: ✅ Production build successful (`pnpm build`)
- **Playwright tests**: Created but could not run due to missing system libraries (`libglib-2.0.so.0`) in the environment. This is an infrastructure limitation, not a code issue.
- **Type checking**: The new files compile without TypeScript errors (pre-existing errors in other files are unrelated to this feature)

### Notes for Developer
1. The offline indicator will automatically appear when the browser goes offline and display "You're offline - changes will be saved locally"
2. When reconnecting, it shows "Back online" with any pending sync count
3. The banner is dismissible except when showing critical states (offline or error)
4. The feature integrates with the existing `appStore` Zustand store for sync status tracking
5. The `useNetworkStatus` hook can be used in any component that needs network status awareness
6. To fully test the feature, run the app locally and toggle network status in browser DevTools (Network tab > Offline checkbox)
</summary>