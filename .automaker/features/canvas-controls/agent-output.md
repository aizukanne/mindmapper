I'll review the previous implementation and verify it's complete. Let me check the current state of the files and ensure everything is working correctly.

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/Canvas.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/canvas/CanvasControls.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/ui/slider.tsx"
}
Good, the implementation files look correct. Let me also verify the keyboard shortcuts hook and modal:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/hooks/useKeyboard.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/help/KeyboardShortcutsModal.tsx"
}
The implementation is complete. Let me verify TypeScript compilation and try to run the Playwright tests:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -v \"api-client.ts\" | head -20",
  "description": "Check TypeScript compilation",
  "timeout": 60000
}

🔧 Tool: Bash
Input: {
  "command": "ls -la /projects/mindmapper/e2e/ 2>/dev/null || echo \"No e2e directory\"",
  "description": "Check if e2e directory exists"
}
TypeScript compiles without errors (only the pre-existing api-client.ts issue). Now let me create the Playwright test and set up the e2e directory:

🔧 Tool: Bash
Input: {
  "command": "mkdir -p /projects/mindmapper/e2e",
  "description": "Create e2e directory"
}

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/playwright.config.ts",
  "content": "import { defineConfig, devices } from '@playwright/test';\n\nexport default defineConfig({\n  testDir: './e2e',\n  fullyParallel: true,\n  forbidOnly: !!process.env.CI,\n  retries: process.env.CI ? 2 : 0,\n  workers: process.env.CI ? 1 : undefined,\n  reporter: 'html',\n  use: {\n    baseURL: 'http://localhost:5173',\n    trace: 'on-first-retry',\n  },\n  projects: [\n    {\n      name: 'chromium',\n      use: { ...devices['Desktop Chrome'] },\n    },\n  ],\n  webServer: {\n    command: 'cd apps/web && npm run dev',\n    url: 'http://localhost:5173',\n    reuseExistingServer: !process.env.CI,\n    timeout: 120 * 1000,\n  },\n});\n"
}

🔧 Tool: Write
Input: {
  "file_path": "/projects/mindmapper/e2e/canvas-controls.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\ntest.describe('Canvas Controls', () => {\n  test.beforeEach(async ({ page }) => {\n    // Navigate to the app\n    await page.goto('/');\n    // Wait for the canvas to load (the React Flow canvas area)\n    await page.waitForSelector('.react-flow', { timeout: 10000 });\n  });\n\n  test('canvas controls panel should be visible on desktop', async ({ page }) => {\n    // The canvas controls should be in the bottom center panel\n    const canvasControls = page.getByTestId('canvas-controls');\n    await expect(canvasControls).toBeVisible();\n  });\n\n  test('zoom in button should work', async ({ page }) => {\n    const zoomInButton = page.getByTestId('zoom-in-button');\n    await expect(zoomInButton).toBeVisible();\n\n    // Get initial zoom percentage\n    const zoomPercentage = page.getByTestId('zoom-percentage');\n    const initialZoom = await zoomPercentage.textContent();\n\n    // Click zoom in\n    await zoomInButton.click();\n    await page.waitForTimeout(300); // Wait for animation\n\n    // Verify zoom increased\n    const newZoom = await zoomPercentage.textContent();\n    expect(parseInt(newZoom || '0')).toBeGreaterThan(parseInt(initialZoom || '0'));\n  });\n\n  test('zoom out button should work', async ({ page }) => {\n    const zoomOutButton = page.getByTestId('zoom-out-button');\n    await expect(zoomOutButton).toBeVisible();\n\n    // Get initial zoom percentage\n    const zoomPercentage = page.getByTestId('zoom-percentage');\n    const initialZoom = await zoomPercentage.textContent();\n\n    // Click zoom out\n    await zoomOutButton.click();\n    await page.waitForTimeout(300); // Wait for animation\n\n    // Verify zoom decreased\n    const newZoom = await zoomPercentage.textContent();\n    expect(parseInt(newZoom || '0')).toBeLessThan(parseInt(initialZoom || '0'));\n  });\n\n  test('fit view button should work', async ({ page }) => {\n    const fitViewButton = page.getByTestId('fit-view-button');\n    await expect(fitViewButton).toBeVisible();\n\n    // Click fit view - it shouldn't throw an error\n    await fitViewButton.click();\n    await page.waitForTimeout(300);\n\n    // Canvas should still be visible\n    await expect(page.locator('.react-flow')).toBeVisible();\n  });\n\n  test('pan mode toggle should work', async ({ page }) => {\n    const panModeToggle = page.getByTestId('pan-mode-toggle');\n    await expect(panModeToggle).toBeVisible();\n\n    // Check initial state (should be selection mode - not pressed)\n    await expect(panModeToggle).toHaveAttribute('aria-pressed', 'false');\n\n    // Toggle pan mode\n    await panModeToggle.click();\n\n    // Should now be pressed\n    await expect(panModeToggle).toHaveAttribute('aria-pressed', 'true');\n\n    // Toggle back\n    await panModeToggle.click();\n\n    // Should be back to selection mode\n    await expect(panModeToggle).toHaveAttribute('aria-pressed', 'false');\n  });\n\n  test('minimap toggle should work', async ({ page }) => {\n    const minimapToggle = page.getByTestId('minimap-toggle');\n    await expect(minimapToggle).toBeVisible();\n\n    // Check initial state (minimap should be visible)\n    await expect(minimapToggle).toHaveAttribute('aria-pressed', 'true');\n\n    // Minimap should be visible\n    const minimap = page.locator('.react-flow__minimap');\n    await expect(minimap).toBeVisible();\n\n    // Toggle minimap off\n    await minimapToggle.click();\n\n    // Minimap should be hidden\n    await expect(minimap).not.toBeVisible();\n\n    // Toggle back on\n    await minimapToggle.click();\n\n    // Minimap should be visible again\n    await expect(minimap).toBeVisible();\n  });\n\n  test('zoom slider should work', async ({ page }) => {\n    const zoomSlider = page.getByTestId('zoom-slider');\n    await expect(zoomSlider).toBeVisible();\n\n    // Get initial zoom\n    const zoomPercentage = page.getByTestId('zoom-percentage');\n    const initialZoom = await zoomPercentage.textContent();\n\n    // The slider should be interactable - click towards the right to zoom in\n    const sliderBoundingBox = await zoomSlider.boundingBox();\n    if (sliderBoundingBox) {\n      // Click on the right side of the slider to zoom in\n      await page.mouse.click(\n        sliderBoundingBox.x + sliderBoundingBox.width * 0.9,\n        sliderBoundingBox.y + sliderBoundingBox.height / 2\n      );\n      await page.waitForTimeout(300);\n\n      const newZoom = await zoomPercentage.textContent();\n      // Zoom should have changed (likely increased)\n      expect(newZoom).not.toBe(initialZoom);\n    }\n  });\n\n  test('keyboard shortcut M should toggle minimap', async ({ page }) => {\n    // Minimap should be visible initially\n    const minimap = page.locator('.react-flow__minimap');\n    await expect(minimap).toBeVisible();\n\n    // Press M to toggle minimap\n    await page.keyboard.press('m');\n    await page.waitForTimeout(100);\n\n    // Minimap should be hidden\n    await expect(minimap).not.toBeVisible();\n\n    // Press M again to show it\n    await page.keyboard.press('m');\n    await page.waitForTimeout(100);\n\n    // Minimap should be visible again\n    await expect(minimap).toBeVisible();\n  });\n\n  test('keyboard shortcuts +/- should zoom in/out', async ({ page }) => {\n    const zoomPercentage = page.getByTestId('zoom-percentage');\n    const initialZoom = parseInt(await zoomPercentage.textContent() || '100');\n\n    // Press + to zoom in\n    await page.keyboard.press('Equal'); // = is often used with +\n    await page.waitForTimeout(100);\n\n    const afterZoomIn = parseInt(await zoomPercentage.textContent() || '100');\n    expect(afterZoomIn).toBeGreaterThan(initialZoom);\n\n    // Press - to zoom out\n    await page.keyboard.press('Minus');\n    await page.waitForTimeout(100);\n\n    const afterZoomOut = parseInt(await zoomPercentage.textContent() || '100');\n    expect(afterZoomOut).toBeLessThan(afterZoomIn);\n  });\n});\n"
}

🔧 Tool: Glob
Input: {
  "pattern": "/projects/mindmapper/playwright.config.*"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/playwright.config.ts"
}
A config already exists. Let me update it to also include the e2e directory:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/playwright.config.ts",
  "old_string": "  testDir: '.',\n  testMatch: '*.spec.ts',",
  "new_string": "  testDir: './e2e',"
}
Now let me start the dev server and run the Playwright tests:

🔧 Tool: Bash
Input: {
  "command": "npm run dev &",
  "description": "Start dev server in background",
  "run_in_background": true
}

🔧 Tool: Bash
Input: {
  "command": "sleep 15 && curl -s http://localhost:5173 2>&1 | head -5",
  "description": "Wait for server and check",
  "timeout": 30000
}
Good, the dev server is running. Now let's run the Playwright tests:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && HOME=/tmp PLAYWRIGHT_BROWSERS_PATH=/tmp/.cache/ms-playwright npx playwright test e2e/canvas-controls.spec.ts --project=chromium 2>&1 | head -80",
  "description": "Run Playwright tests",
  "timeout": 180000
}
The Playwright tests can't run due to missing system libraries (`libglib-2.0.so.0`) in this environment. This is an infrastructure limitation, not an issue with the implementation.

Let me verify the implementation is correct by running a build and checking the files are properly structured:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npm run build 2>&1 | tail -30",
  "description": "Build the web app to verify compilation",
  "timeout": 120000
}
The build fails due to a pre-existing TypeScript error in `api-client.ts` (not related to our changes). Let me verify that our specific files compile correctly:

🔧 Tool: Bash
Input: {
  "command": "./node_modules/.bin/tsc --noEmit 2>&1 | grep -E \"CanvasControls|slider|useKeyboard\" || echo \"No errors in our new files\"",
  "description": "Check if our new files have TypeScript errors",
  "timeout": 60000
}
Our implementation compiles without errors. Now let me clean up the test file as instructed (since we can't run Playwright in this environment due to missing system dependencies):

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/e2e/canvas-controls.spec.ts && rmdir /projects/mindmapper/e2e 2>/dev/null; echo \"Cleaned up test files\"",
  "description": "Clean up temporary test files"
}
Let me also restore the original playwright.config.ts since we modified it:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/playwright.config.ts",
  "old_string": "  testDir: './e2e',",
  "new_string": "  testDir: '.',\n  testMatch: '*.spec.ts',"
}
Now let me verify the feature works by checking the dev server renders the app correctly:

🔧 Tool: Bash
Input: {
  "command": "curl -s http://localhost:5173 | grep -o \"react-flow\\|Canvas\\|mindmap\" | head -5 || echo \"App is rendering\"",
  "description": "Verify the app is running"
}

🔧 Tool: Bash
Input: {
  "command": "curl -s http://localhost:5173 | head -20",
  "description": "Check app is running"
}
The app is running. Let me provide a summary of all the files that were created and modified:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && git diff --name-only HEAD 2>/dev/null || find apps/web/src -name \"*.tsx\" -newer apps/web/package.json -type f 2>/dev/null | head -20",
  "description": "List modified files"
}

🔧 Tool: Bash
Input: {
  "command": "git status --porcelain 2>/dev/null | grep -E \"CanvasControls|slider\" || ls -la apps/web/src/components/canvas/CanvasControls.tsx apps/web/src/components/ui/slider.tsx 2>/dev/null",
  "description": "Check new files"
}
The new files are created. Let me kill the background dev server and provide the final summary:

🔧 Tool: Bash
Input: {
  "command": "pkill -f \"vite\" 2>/dev/null; echo \"Killed dev server\"",
  "description": "Kill dev server"
}
<summary>
## Summary: Canvas Controls Implementation

### Changes Implemented
- **Zoom Controls**: Added zoom in (+) and zoom out (-) buttons with smooth animations
- **Zoom Slider**: Created a slider component using @radix-ui/react-slider for precise zoom control (25% - 400%)
- **Zoom Percentage Display**: Shows current zoom level as percentage in the control bar
- **Pan Mode Toggle**: Button to switch between selection mode and pan mode (changes icon between pointer and move)
- **Fit View Button**: Centers and fits all nodes in the viewport with padding
- **Minimap Toggle**: Button to show/hide the React Flow minimap
- **Keyboard Shortcuts**:
  - `+` / `=`: Zoom in
  - `-`: Zoom out
  - `Ctrl+0` / `Cmd+0`: Fit view
  - `Space` (hold): Temporary pan mode
  - `P`: Toggle pan mode
  - `M`: Toggle minimap visibility
  - `Escape`: Exit pan mode

### Files Modified
- `apps/web/package.json` - Added @radix-ui/react-slider dependency
- `apps/web/src/components/canvas/Canvas.tsx` - Integrated CanvasControls component and minimap toggle
- `apps/web/src/hooks/useKeyboard.ts` - Added keyboard shortcuts for minimap and pan mode toggle
- `apps/web/src/components/help/KeyboardShortcutsModal.tsx` - Added new shortcuts to help modal

### Files Created
- `apps/web/src/components/canvas/CanvasControls.tsx` - New control bar component with all zoom/pan/minimap controls
- `apps/web/src/components/ui/slider.tsx` - Radix UI-based slider component following existing UI patterns

### Verification Status
- TypeScript compilation verified - all new files compile without errors
- Dev server runs successfully at localhost:5173
- Playwright tests were written but could not run due to missing system libraries (libglib-2.0.so.0) in the environment
- Test file was cleaned up as instructed

### Notes for Developer
1. There is a pre-existing TypeScript error in `apps/web/src/lib/api-client.ts` (line 324) that prevents full builds - this is unrelated to the canvas controls feature
2. The CanvasControls component is positioned at the bottom center of the canvas and is hidden on mobile (mobile uses MobileToolbar instead)
3. The minimap state and pan mode state are managed at the Canvas component level, combining keyboard-triggered pan mode with button-triggered pan mode
4. All controls have proper `data-testid` attributes for future automated testing
5. Controls follow existing UI patterns using shadcn/ui components and Tailwind CSS
</summary>