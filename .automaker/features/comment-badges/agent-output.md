Looking at the previous context, I can see that the implementation was completed successfully. Let me verify the current state of the changes and ensure everything is properly implemented.

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/MindMapNode.tsx",
  "offset": 360,
  "limit": 40
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/comments/CommentPanel.tsx",
  "offset": 1,
  "limit": 50
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx",
  "offset": 1,
  "limit": 50
}
Let me check more of the MapEditor to verify the refresh function state was added:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx",
  "offset": 50,
  "limit": 60
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx",
  "offset": 1,
  "limit": 80
}

🔧 Tool: Grep
Input: {
  "pattern": "refreshCommentCounts|onCommentCountsRefresh",
  "path": "/projects/mindmapper/apps/web/src",
  "output_mode": "content",
  "-n": true
}

🔧 Tool: Grep
Input: {
  "pattern": "onCommentChange",
  "path": "/projects/mindmapper/apps/web/src",
  "output_mode": "content",
  "-n": true
}
All the changes are in place. Let me verify the build passes and run a type check:

🔧 Tool: Bash
Input: {
  "command": "pnpm tsc --noEmit 2>&1 | head -30",
  "description": "TypeScript type check",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx tsc --noEmit 2>&1 | head -30",
  "description": "TypeScript type check in web app",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && pnpm build 2>&1 | tail -40",
  "description": "Build the full project",
  "timeout": 120000
}
The build passes successfully. Now let me create and run a Playwright test to verify the feature:

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/comment-badge-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Verification test for the comment badge feature\n *\n * Feature: Display badge on nodes showing number of unresolved comments.\n * Update in real-time when comments are added or resolved.\n */\n\ntest.describe('Comment Badge Feature', () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to dashboard\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n  });\n\n  test('should create a map and verify comment badge appears when adding unresolved comments', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    await expect(newMapButton).toBeVisible({ timeout: 10000 });\n    await newMapButton.click();\n\n    // Wait for dialog and fill in details\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Comment Badge Test Map');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    // Wait for navigation to the map editor\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.waitForLoadState('networkidle');\n\n    // Wait for the canvas to be ready with a root node\n    const rootNode = page.locator('[data-testid^=\"mind-map-node-\"]').first();\n    await expect(rootNode).toBeVisible({ timeout: 10000 });\n\n    // Initially, there should be no comment badges visible (no unresolved comments)\n    const commentBadges = page.locator('[data-testid^=\"comment-badge-\"]');\n    await expect(commentBadges).toHaveCount(0);\n\n    // Open the comments panel\n    const commentsButton = page.getByRole('button', { name: /Comments/i });\n    await expect(commentsButton).toBeVisible({ timeout: 5000 });\n    await commentsButton.click();\n\n    // Wait for comment panel to open\n    const commentPanel = page.locator('.fixed.right-0'); // Comment panel selector\n    await expect(commentPanel).toBeVisible({ timeout: 5000 });\n\n    // Click the root node to select it (for attaching the comment)\n    await rootNode.click();\n\n    // Click \"Add\" button to start composing a new comment\n    const addCommentButton = page.getByRole('button', { name: /Add/i });\n    await expect(addCommentButton).toBeVisible({ timeout: 5000 });\n    await addCommentButton.click();\n\n    // Fill in the comment text\n    const commentTextarea = commentPanel.locator('textarea');\n    await expect(commentTextarea).toBeVisible({ timeout: 5000 });\n    await commentTextarea.fill('This is a test comment for verification');\n\n    // Submit the comment\n    const postButton = page.getByRole('button', { name: /Post Comment/i });\n    await expect(postButton).toBeEnabled({ timeout: 5000 });\n    await postButton.click();\n\n    // Wait for the comment to be created (the textarea should clear/disappear)\n    await expect(commentTextarea).not.toBeVisible({ timeout: 5000 });\n\n    // Wait for the badge to appear on the node (real-time update)\n    // The badge should show \"1\" for one unresolved comment\n    const badge = page.locator('[data-testid^=\"comment-badge-\"]').first();\n    await expect(badge).toBeVisible({ timeout: 10000 });\n\n    // Verify the badge shows the correct count\n    await expect(badge).toContainText('1');\n\n    // Verify badge has orange styling (unresolved comment indicator)\n    await expect(badge).toHaveClass(/bg-orange-500/);\n  });\n\n  test('should update badge count in real-time when comments are added', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    await expect(newMapButton).toBeVisible({ timeout: 10000 });\n    await newMapButton.click();\n\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Badge Update Test');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.waitForLoadState('networkidle');\n\n    // Wait for canvas\n    const rootNode = page.locator('[data-testid^=\"mind-map-node-\"]').first();\n    await expect(rootNode).toBeVisible({ timeout: 10000 });\n\n    // Select the root node\n    await rootNode.click();\n\n    // Open comments panel\n    const commentsButton = page.getByRole('button', { name: /Comments/i });\n    await commentsButton.click();\n\n    const commentPanel = page.locator('.fixed.right-0');\n    await expect(commentPanel).toBeVisible({ timeout: 5000 });\n\n    // Add first comment\n    await page.getByRole('button', { name: /Add/i }).click();\n    let textarea = commentPanel.locator('textarea');\n    await textarea.fill('First comment');\n    await page.getByRole('button', { name: /Post Comment/i }).click();\n\n    // Wait for badge to show 1\n    let badge = page.locator('[data-testid^=\"comment-badge-\"]').first();\n    await expect(badge).toBeVisible({ timeout: 10000 });\n    await expect(badge).toContainText('1');\n\n    // Add second comment\n    await page.getByRole('button', { name: /Add/i }).click();\n    textarea = commentPanel.locator('textarea');\n    await expect(textarea).toBeVisible({ timeout: 5000 });\n    await textarea.fill('Second comment');\n    await page.getByRole('button', { name: /Post Comment/i }).click();\n\n    // Wait for badge to update to 2 (real-time update)\n    await expect(badge).toContainText('2', { timeout: 10000 });\n  });\n\n  test('should hide badge when all comments are resolved', async ({ page }) => {\n    // Create a new map\n    const newMapButton = page.getByTestId('new-map-button');\n    await expect(newMapButton).toBeVisible({ timeout: 10000 });\n    await newMapButton.click();\n\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Resolve Comment Test');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.waitForLoadState('networkidle');\n\n    // Wait for canvas\n    const rootNode = page.locator('[data-testid^=\"mind-map-node-\"]').first();\n    await expect(rootNode).toBeVisible({ timeout: 10000 });\n\n    // Select the root node\n    await rootNode.click();\n\n    // Open comments panel\n    const commentsButton = page.getByRole('button', { name: /Comments/i });\n    await commentsButton.click();\n\n    const commentPanel = page.locator('.fixed.right-0');\n    await expect(commentPanel).toBeVisible({ timeout: 5000 });\n\n    // Add a comment\n    await page.getByRole('button', { name: /Add/i }).click();\n    const textarea = commentPanel.locator('textarea');\n    await textarea.fill('Comment to be resolved');\n    await page.getByRole('button', { name: /Post Comment/i }).click();\n\n    // Wait for badge to appear\n    const badge = page.locator('[data-testid^=\"comment-badge-\"]').first();\n    await expect(badge).toBeVisible({ timeout: 10000 });\n    await expect(badge).toContainText('1');\n\n    // Find and click the resolve button on the comment\n    // The resolve button should be in the comment thread component\n    const resolveButton = commentPanel.getByRole('button', { name: /resolve/i });\n    if (await resolveButton.isVisible()) {\n      await resolveButton.click();\n\n      // Wait for badge to disappear (no more unresolved comments)\n      await expect(badge).not.toBeVisible({ timeout: 10000 });\n    }\n  });\n});\n"
}

🔧 Tool: Bash
Input: {
  "command": "pnpm dev &\nsleep 20\ncurl -s http://localhost:5173 | head -10",
  "description": "Start dev servers and verify",
  "timeout": 60000,
  "run_in_background": true
}

🔧 Tool: Bash
Input: {
  "command": "sleep 20 && curl -s http://localhost:5173 2>&1 | head -20",
  "description": "Check if dev server is running",
  "timeout": 60000
}
Good, the dev server is running. Let me try to run the Playwright tests:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright test comment-badge-verification.spec.ts --reporter=line 2>&1 | head -100",
  "description": "Run Playwright verification test",
  "timeout": 180000
}
The Playwright tests fail due to missing system libraries (`libglib-2.0.so.0`) required to run Chrome/Chromium in this environment. This is an infrastructure issue, not a code issue.

Since Playwright can't run, let me verify the implementation through code review and running the existing tests (if any unit tests exist):

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && pnpm test 2>&1 | head -50 || echo \"No tests or test command failed\"",
  "description": "Run existing unit tests",
  "timeout": 60000
}
The tests pass. Now let me clean up the temporary test file and ensure everything is finalized:

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/comment-badge-verification.spec.ts && echo \"Verification test file removed\"",
  "description": "Remove temporary verification test"
}

🔧 Tool: KillShell
Input: {
  "shell_id": "bd765a6"
}
Let me do a final review of all the changes made:

🔧 Tool: Bash
Input: {
  "command": "git diff --stat 2>/dev/null || echo \"Not a git repo\"",
  "description": "Show git diff summary"
}
Let me show just the changes I made for this feature:

🔧 Tool: Bash
Input: {
  "command": "git diff apps/web/src/components/canvas/MindMapNode.tsx apps/web/src/components/canvas/Canvas.tsx apps/web/src/components/comments/CommentPanel.tsx apps/web/src/pages/MapEditor.tsx 2>&1 | head -200",
  "description": "Show git diff for modified files"
}

🔧 Tool: Bash
Input: {
  "command": "git diff apps/web/src/components/canvas/MindMapNode.tsx 2>&1 | grep -A 30 \"Comment indicator badge\"",
  "description": "Show the specific badge change"
}
Let me verify the exact changes to CommentPanel.tsx and MapEditor.tsx:

🔧 Tool: Bash
Input: {
  "command": "git diff apps/web/src/components/comments/CommentPanel.tsx 2>&1",
  "description": "Show CommentPanel diff"
}

🔧 Tool: Bash
Input: {
  "command": "git diff apps/web/src/pages/MapEditor.tsx 2>&1 | grep -A 5 -B 5 \"refreshCommentCounts\\|onCommentChange\\|onCommentCountsRefresh\"",
  "description": "Show MapEditor relevant changes"
}
All changes are in place and verified. The implementation is complete. Let me provide the final summary:

<summary>
## Summary: Display badge on nodes showing number of unresolved comments

### Changes Implemented
1. **Updated MindMapNode badge to show only unresolved comment count**
   - Changed condition from `hasComments` to `hasUnresolved` - badge now only appears when there are unresolved comments
   - Badge now displays `data.unresolvedComments` instead of `data.commentCount`
   - Removed gray styling for resolved comments (badge hidden when all resolved)
   - Updated tooltip to only show unresolved count message

2. **Added real-time update mechanism between CommentPanel and Canvas**
   - Added `onCommentCountsRefresh` prop to Canvas component to expose the refresh function
   - Canvas now exposes the `refreshCommentCounts` function from `useNodeComments` hook to parent
   - Added `onCommentChange` prop to CommentPanel component

3. **Connected comment operations to badge refresh**
   - `handleCreateComment`: Calls `onCommentChange?.()` after successful comment creation
   - `handleReply`: Calls `onCommentChange?.()` after successful reply
   - `handleUpdate`: Calls `onCommentChange?.()` after successful update (especially important for resolved status changes)
   - `handleDelete`: Calls `onCommentChange?.()` after successful deletion

4. **Wired up MapEditor to coordinate real-time updates**
   - Added `refreshCommentCounts` state to hold the refresh function from Canvas
   - Passed `onCommentCountsRefresh` callback to Canvas to receive the refresh function
   - Passed `onCommentChange` callback to CommentPanel that triggers the refresh

### Files Modified
- `apps/web/src/components/canvas/MindMapNode.tsx` - Badge display logic (show only unresolved count)
- `apps/web/src/components/canvas/Canvas.tsx` - Added `onCommentCountsRefresh` prop and exposed refresh function
- `apps/web/src/components/comments/CommentPanel.tsx` - Added `onCommentChange` callback, called after all comment operations
- `apps/web/src/pages/MapEditor.tsx` - Wired up refresh function between Canvas and CommentPanel

### Verification Status
- ✅ Build succeeds (`pnpm build` completes successfully)
- ✅ TypeScript type checking passes
- ✅ Unit tests pass (`pnpm test` succeeds)
- ⚠️ Playwright E2E tests could not run due to missing system libraries (`libglib-2.0.so.0`) in the environment
- ✅ Code verified through manual review and successful compilation

### Notes for Developer
- The badge now only appears when there are **unresolved** comments (not all comments)
- Real-time updates happen immediately when comments are created, replied to, updated (resolved/reopened), or deleted
- The existing 30-second polling in `useNodeComments` hook continues as a fallback
- The `data-testid="comment-badge-{nodeId}"` attribute is preserved for testing purposes
- Consider adding WebSocket/SSE support in the future for even more real-time updates across different browser sessions
</summary>