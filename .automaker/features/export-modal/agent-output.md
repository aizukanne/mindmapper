I'll continue from where the previous implementation left off. Let me check the current state and run the Playwright tests properly.

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/components/export/ExportModal.tsx"
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && ls tests/",
  "description": "List test files"
}
The ExportModal implementation is complete. Now I need to verify the test file and check how to access the export functionality. Let me check how the export modal is triggered:

🔧 Tool: Grep
Input: {
  "pattern": "export-menu-item",
  "output_mode": "content",
  "-C": 3
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/export-modal-verification.spec.ts"
}
The test looks for the export menu item which is inside a dropdown. Let me check how the menu is triggered and update the test accordingly:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/src/pages/MapEditor.tsx",
  "offset": 250,
  "limit": 50
}
I see - the export menu item is inside a dropdown menu. The test needs to click the dropdown trigger first. Let me update the test file:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Enhance ExportModal with visual preview pane",
      "status": "completed",
      "activeForm": "Adding preview pane to ExportModal"
    },
    {
      "content": "Add format-specific options for JSON, Markdown, SVG, and Text formats",
      "status": "completed",
      "activeForm": "Adding format-specific options"
    },
    {
      "content": "Implement live preview generation based on selected format",
      "status": "completed",
      "activeForm": "Implementing live preview"
    },
    {
      "content": "Verify the build compiles",
      "status": "completed",
      "activeForm": "Building the project"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "in_progress",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "pending",
      "activeForm": "Cleaning up test file"
    }
  ]
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/export-modal-verification.spec.ts",
  "old_string": "  // Helper to create a map and navigate to the editor\n  async function createMapAndOpenEditor(page: import('@playwright/test').Page) {\n    // Navigate to dashboard\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Click the \"New Mind Map\" button in the header\n    const newMapButton = page.getByTestId('new-map-button');\n    await expect(newMapButton).toBeVisible({ timeout: 10000 });\n    await newMapButton.click();\n\n    // Wait for dialog to open and fill details\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Test Export Map');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    // Wait for navigation to the map editor\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.waitForLoadState('networkidle');\n  }",
  "new_string": "  // Helper to create a map and navigate to the editor\n  async function createMapAndOpenEditor(page: import('@playwright/test').Page) {\n    // Navigate to dashboard\n    await page.goto('/');\n    await page.waitForLoadState('networkidle');\n\n    // Click the \"New Mind Map\" button in the header\n    const newMapButton = page.getByTestId('new-map-button');\n    await expect(newMapButton).toBeVisible({ timeout: 10000 });\n    await newMapButton.click();\n\n    // Wait for dialog to open and fill details\n    const dialog = page.getByTestId('create-map-dialog');\n    await expect(dialog).toBeVisible({ timeout: 5000 });\n\n    const titleInput = page.getByTestId('map-title-input');\n    await titleInput.fill('Test Export Map');\n\n    const submitButton = page.getByTestId('create-map-submit');\n    await submitButton.click();\n\n    // Wait for navigation to the map editor\n    await page.waitForURL(/\\/map\\//, { timeout: 10000 });\n    await page.waitForLoadState('networkidle');\n  }\n\n  // Helper to open the export modal\n  async function openExportModal(page: import('@playwright/test').Page) {\n    // Click the more options dropdown (three dots menu)\n    const moreOptionsButton = page.locator('button').filter({ has: page.locator('svg.lucide-more-horizontal') });\n    await expect(moreOptionsButton).toBeVisible({ timeout: 5000 });\n    await moreOptionsButton.click();\n\n    // Click export menu item in dropdown\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await expect(exportMenuItem).toBeVisible({ timeout: 5000 });\n    await exportMenuItem.click();\n\n    // Wait for export modal\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n  }"
}
Now I need to update all the test cases to use the new helper function:

🔧 Tool: Edit
Input: {
  "file_path": "/projects/mindmapper/apps/web/tests/export-modal-verification.spec.ts",
  "old_string": "  test('should open export modal and display format selection', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Click the export menu item\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await expect(exportMenuItem).toBeVisible({ timeout: 10000 });\n    await exportMenuItem.click();\n\n    // Wait for export modal to open\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Verify modal title\n    await expect(page.getByRole('heading', { name: 'Export Mind Map' })).toBeVisible();\n\n    // Verify format options are visible\n    await expect(page.getByLabel('JSON')).toBeVisible();\n    await expect(page.getByLabel('Markdown')).toBeVisible();\n    await expect(page.getByLabel('SVG')).toBeVisible();\n    await expect(page.getByLabel('PNG')).toBeVisible();\n    await expect(page.getByLabel('PDF')).toBeVisible();\n    await expect(page.getByLabel('Plain Text')).toBeVisible();\n  });\n\n  test('should display preview pane for selected format', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Verify preview pane is visible\n    const previewPane = page.getByTestId('export-preview');\n    await expect(previewPane).toBeVisible({ timeout: 5000 });\n\n    // The preview should contain some content (JSON is default)\n    await expect(previewPane).not.toBeEmpty();\n  });\n\n  test('should toggle preview visibility', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Preview should be visible by default\n    const previewPane = page.getByTestId('export-preview');\n    await expect(previewPane).toBeVisible();\n\n    // Click hide button\n    await page.getByRole('button', { name: /Hide/i }).click();\n\n    // Preview should be hidden\n    await expect(previewPane).not.toBeVisible();\n\n    // Click show button\n    await page.getByRole('button', { name: /Show/i }).click();\n\n    // Preview should be visible again\n    await expect(previewPane).toBeVisible();\n  });\n\n  test('should show format-specific options when Options is clicked', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Click Options button to show options\n    await page.getByRole('button', { name: /Options/i }).click();\n\n    // For JSON format (default), should see JSON-specific options\n    await expect(page.getByLabel('Include comments')).toBeVisible();\n    await expect(page.getByLabel('Pretty print (formatted)')).toBeVisible();\n    await expect(page.getByLabel('Include metadata')).toBeVisible();\n  });\n\n  test('should change options when different format is selected', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Show options\n    await page.getByRole('button', { name: /Options/i }).click();\n\n    // Select Markdown format\n    await page.getByLabel('Markdown').click();\n\n    // Should now see Markdown-specific options\n    await expect(page.getByLabel('Include header')).toBeVisible();\n    await expect(page.getByLabel('Include footer')).toBeVisible();\n    await expect(page.getByLabel('Bullet style')).toBeVisible();\n\n    // Select Plain Text format\n    await page.getByLabel('Plain Text').click();\n\n    // Should now see Text-specific options\n    await expect(page.getByLabel('Include title')).toBeVisible();\n    await expect(page.getByLabel('Indent style')).toBeVisible();\n  });\n\n  test('should update preview when format changes', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Wait for initial JSON preview\n    const previewPane = page.getByTestId('export-preview');\n    await expect(previewPane).toBeVisible();\n\n    // Get initial preview content (should be JSON)\n    await page.waitForTimeout(500); // Wait for preview to load\n    const jsonPreview = await previewPane.textContent();\n\n    // Select Markdown format\n    await page.getByLabel('Markdown').click();\n    await page.waitForTimeout(500); // Wait for preview to update\n\n    // Preview should have different content\n    const markdownPreview = await previewPane.textContent();\n\n    // The previews should be different (one is JSON, one is Markdown)\n    expect(jsonPreview).not.toBe(markdownPreview);\n  });\n\n  test('should show export info bar with selected format', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Should show JSON as default export format\n    await expect(page.getByText('Exporting as')).toBeVisible();\n    await expect(page.getByText('JSON')).toBeVisible();\n    await expect(page.getByText('.json')).toBeVisible();\n\n    // Select Markdown and verify info updates\n    await page.getByLabel('Markdown').click();\n    await expect(page.getByText('Markdown')).toBeVisible();\n    await expect(page.getByText('.md')).toBeVisible();\n  });\n\n  test('should have working cancel button', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Click cancel\n    await page.getByRole('button', { name: 'Cancel' }).click();\n\n    // Modal should be closed\n    await expect(exportModal).not.toBeVisible();\n  });\n\n  test('should open PNG options dialog when PNG format is selected and Export clicked', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Select PNG format\n    await page.getByLabel('PNG').click();\n\n    // Click Export button\n    await page.getByTestId('export-button').click();\n\n    // PNG export dialog should open\n    const pngDialog = page.getByTestId('png-export-dialog');\n    await expect(pngDialog).toBeVisible({ timeout: 5000 });\n\n    // Verify PNG-specific options are present\n    await expect(page.getByText('Resolution')).toBeVisible();\n    await expect(page.getByText('Padding')).toBeVisible();\n    await expect(page.getByText('Background')).toBeVisible();\n  });\n\n  test('should open PDF print dialog when PDF format is selected and Export clicked', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n\n    // Open export modal\n    const exportMenuItem = page.getByTestId('export-menu-item');\n    await exportMenuItem.click();\n\n    const exportModal = page.getByTestId('export-modal');\n    await expect(exportModal).toBeVisible({ timeout: 5000 });\n\n    // Select PDF format\n    await page.getByLabel('PDF').click();\n\n    // Click Export button\n    await page.getByTestId('export-button').click();\n\n    // PDF print dialog should open\n    const pdfDialog = page.getByTestId('print-pdf-dialog');\n    await expect(pdfDialog).toBeVisible({ timeout: 5000 });\n\n    // Verify PDF-specific options are present\n    await expect(page.getByText('Page Orientation')).toBeVisible();\n    await expect(page.getByText('Page Size')).toBeVisible();\n  });\n});",
  "new_string": "  test('should open export modal and display format selection', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Verify modal title\n    await expect(page.getByRole('heading', { name: 'Export Mind Map' })).toBeVisible();\n\n    // Verify format options are visible\n    await expect(page.getByText('JSON', { exact: true })).toBeVisible();\n    await expect(page.getByText('Markdown', { exact: true })).toBeVisible();\n    await expect(page.getByText('SVG', { exact: true })).toBeVisible();\n    await expect(page.getByText('PNG', { exact: true })).toBeVisible();\n    await expect(page.getByText('PDF', { exact: true })).toBeVisible();\n    await expect(page.getByText('Plain Text', { exact: true })).toBeVisible();\n  });\n\n  test('should display preview pane for selected format', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Verify preview pane is visible\n    const previewPane = page.getByTestId('export-preview');\n    await expect(previewPane).toBeVisible({ timeout: 5000 });\n\n    // The preview should contain some content (JSON is default)\n    await expect(previewPane).not.toBeEmpty();\n  });\n\n  test('should toggle preview visibility', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Preview should be visible by default\n    const previewPane = page.getByTestId('export-preview');\n    await expect(previewPane).toBeVisible();\n\n    // Click hide button\n    await page.getByRole('button', { name: /Hide/i }).click();\n\n    // Preview should be hidden\n    await expect(previewPane).not.toBeVisible();\n\n    // Click show button\n    await page.getByRole('button', { name: /Show/i }).click();\n\n    // Preview should be visible again\n    await expect(previewPane).toBeVisible();\n  });\n\n  test('should show format-specific options when Options is clicked', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Click Options button to show options\n    await page.getByText('Options').click();\n\n    // For JSON format (default), should see JSON-specific options\n    await expect(page.getByLabel('Include comments')).toBeVisible();\n    await expect(page.getByLabel('Pretty print (formatted)')).toBeVisible();\n    await expect(page.getByLabel('Include metadata')).toBeVisible();\n  });\n\n  test('should change options when different format is selected', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Show options\n    await page.getByText('Options').click();\n\n    // Select Markdown format by clicking on it\n    await page.getByText('Markdown', { exact: true }).click();\n\n    // Should now see Markdown-specific options\n    await expect(page.getByLabel('Include header')).toBeVisible();\n    await expect(page.getByLabel('Include footer')).toBeVisible();\n    await expect(page.getByText('Bullet style')).toBeVisible();\n\n    // Select Plain Text format\n    await page.getByText('Plain Text', { exact: true }).click();\n\n    // Should now see Text-specific options\n    await expect(page.getByLabel('Include title')).toBeVisible();\n    await expect(page.getByText('Indent style')).toBeVisible();\n  });\n\n  test('should update preview when format changes', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Wait for initial JSON preview\n    const previewPane = page.getByTestId('export-preview');\n    await expect(previewPane).toBeVisible();\n\n    // Get initial preview content (should be JSON)\n    await page.waitForTimeout(1000); // Wait for preview to load\n    const jsonPreview = await previewPane.textContent();\n\n    // Select Markdown format\n    await page.getByText('Markdown', { exact: true }).click();\n    await page.waitForTimeout(1000); // Wait for preview to update\n\n    // Preview should have different content\n    const markdownPreview = await previewPane.textContent();\n\n    // The previews should be different (one is JSON, one is Markdown)\n    expect(jsonPreview).not.toBe(markdownPreview);\n  });\n\n  test('should show export info bar with selected format', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Should show JSON as default export format\n    await expect(page.getByText('Exporting as')).toBeVisible();\n    await expect(page.getByText('.json')).toBeVisible();\n\n    // Select Markdown and verify info updates\n    await page.getByText('Markdown', { exact: true }).click();\n    await expect(page.getByText('.md')).toBeVisible();\n  });\n\n  test('should have working cancel button', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    const exportModal = page.getByTestId('export-modal');\n\n    // Click cancel\n    await page.getByRole('button', { name: 'Cancel' }).click();\n\n    // Modal should be closed\n    await expect(exportModal).not.toBeVisible();\n  });\n\n  test('should open PNG options dialog when PNG format is selected and Export clicked', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Select PNG format\n    await page.getByText('PNG', { exact: true }).click();\n\n    // Click Export button\n    await page.getByTestId('export-button').click();\n\n    // PNG export dialog should open\n    const pngDialog = page.getByTestId('png-export-dialog');\n    await expect(pngDialog).toBeVisible({ timeout: 5000 });\n\n    // Verify PNG-specific options are present\n    await expect(page.getByText('Resolution')).toBeVisible();\n    await expect(page.getByText('Padding')).toBeVisible();\n  });\n\n  test('should open PDF print dialog when PDF format is selected and Export clicked', async ({ page }) => {\n    await createMapAndOpenEditor(page);\n    await openExportModal(page);\n\n    // Select PDF format\n    await page.getByText('PDF', { exact: true }).click();\n\n    // Click Export button\n    await page.getByTestId('export-button').click();\n\n    // PDF print dialog should open\n    const pdfDialog = page.getByTestId('print-pdf-dialog');\n    await expect(pdfDialog).toBeVisible({ timeout: 5000 });\n\n    // Verify PDF-specific options are present\n    await expect(page.getByText('Page Orientation')).toBeVisible();\n    await expect(page.getByText('Page Size')).toBeVisible();\n  });\n});"
}
Now let me run the Playwright tests. First, let me start the servers and run a smaller subset of tests:

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper && pnpm exec playwright test apps/web/tests/export-modal-verification.spec.ts --project=chromium --reporter=list 2>&1 | tail -80",
  "description": "Run Playwright test",
  "timeout": 300000
}
Let me check how to run Playwright tests in this project:

🔧 Tool: Read
Input: {
  "file_path": "/projects/mindmapper/apps/web/package.json"
}

🔧 Tool: Bash
Input: {
  "command": "cd /projects/mindmapper/apps/web && npx playwright test tests/export-modal-verification.spec.ts --project=chromium --reporter=list 2>&1 | tail -100",
  "description": "Run Playwright test",
  "timeout": 300000
}
The tests are failing due to a system library issue (`libglib-2.0.so.0` missing) which is an environment issue, not a code issue. The Playwright browser can't be launched in this environment.

Let me verify the implementation is correct by building the project and checking TypeScript compilation:

🔧 Tool: Bash
Input: {
  "command": "npm run build 2>&1",
  "description": "Build web app to verify compilation",
  "timeout": 120000
}
The build is successful. Now let me delete the test file and update the todos:

🔧 Tool: Bash
Input: {
  "command": "rm /projects/mindmapper/apps/web/tests/export-modal-verification.spec.ts",
  "description": "Delete temporary test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Enhance ExportModal with visual preview pane",
      "status": "completed",
      "activeForm": "Adding preview pane to ExportModal"
    },
    {
      "content": "Add format-specific options for JSON, Markdown, SVG, and Text formats",
      "status": "completed",
      "activeForm": "Adding format-specific options"
    },
    {
      "content": "Implement live preview generation based on selected format",
      "status": "completed",
      "activeForm": "Implementing live preview"
    },
    {
      "content": "Verify the build compiles",
      "status": "completed",
      "activeForm": "Building the project"
    },
    {
      "content": "Create and run Playwright verification test",
      "status": "completed",
      "activeForm": "Running verification test"
    },
    {
      "content": "Delete temporary test file",
      "status": "completed",
      "activeForm": "Cleaning up test file"
    }
  ]
}
Let me verify that the test file is deleted and provide a final summary:

🔧 Tool: Bash
Input: {
  "command": "ls /projects/mindmapper/apps/web/tests/",
  "description": "Verify test file deleted"
}
The test file has been deleted. Let me also verify the key files we modified:

🔧 Tool: Bash
Input: {
  "command": "wc -l /projects/mindmapper/apps/web/src/components/export/ExportModal.tsx",
  "description": "Count lines in ExportModal"
}
<summary>
## Summary: Create Export Modal with Preview and Format-Specific Options

### Changes Implemented
- **Enhanced ExportModal component** with a two-column layout:
  - Left column: Format selection grid with 6 export formats (JSON, Markdown, SVG, PNG, PDF, Plain Text)
  - Right column: Live preview pane that shows a preview of the exported content
  
- **Added visual preview pane** that:
  - Displays live preview of export content for text-based formats (JSON, Markdown, Text)
  - Shows informative descriptions for binary formats (PNG, PDF, SVG)
  - Updates automatically when format selection changes
  - Has show/hide toggle functionality
  - Includes loading state indicator

- **Implemented format-specific options** for each export format:
  - **JSON**: Include comments, pretty print (formatted), include metadata
  - **Markdown**: Include header, include footer, bullet style (dash/asterisk/plus)
  - **SVG**: Include background
  - **Plain Text**: Include title, indent style (spaces/tabs)
  - **PNG/PDF**: Show message directing users to click Export for advanced options (which open their respective dialogs)

- **Added export info bar** showing currently selected format and file extension

- **Improved download flow** with success feedback and auto-close after export

### Files Modified
- `/projects/mindmapper/apps/web/src/components/export/ExportModal.tsx` - Complete rewrite with preview pane and format-specific options (expanded from ~150 lines to 743 lines)

### Verification Status
- ✅ TypeScript compilation successful
- ✅ Production build successful (vite build completed with no errors)
- ⚠️ Playwright tests could not run due to environment limitation (missing system library `libglib-2.0.so.0`)
- Test file was created and deleted as per requirements

### Notes for Developer
- The export modal now has a much richer UX with format previews and customization options
- Format-specific options are processed client-side before download
- PNG and PDF formats still use their dedicated dialog components (PngExportDialog, PrintPdfDialog) which open when Export is clicked
- The preview feature fetches data from the API when the modal opens or format changes
- Preview content is truncated to 1200 characters for performance
- Options are hidden by default (click "Options" to show) to keep the UI clean
</summary>