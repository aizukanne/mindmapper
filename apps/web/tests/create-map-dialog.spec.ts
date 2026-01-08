import { test, expect } from '@playwright/test';

test.describe('Create Map Dialog', () => {
  test('should open dialog, create map with title and description, and navigate to editor', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click the "New Mind Map" button in the header
    const newMapButton = page.getByTestId('new-map-button');
    await expect(newMapButton).toBeVisible({ timeout: 10000 });
    await newMapButton.click();

    // Wait for dialog to open
    const dialog = page.getByTestId('create-map-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Check dialog elements are present
    await expect(page.getByRole('heading', { name: 'Create New Mind Map' })).toBeVisible();
    await expect(page.getByTestId('map-title-input')).toBeVisible();
    await expect(page.getByTestId('map-description-input')).toBeVisible();
    await expect(page.getByTestId('create-map-submit')).toBeVisible();

    // Fill in the title
    const titleInput = page.getByTestId('map-title-input');
    await titleInput.fill('Test Mind Map');

    // Fill in the description
    const descriptionInput = page.getByTestId('map-description-input');
    await descriptionInput.fill('This is a test description');

    // Submit the form
    const submitButton = page.getByTestId('create-map-submit');
    await submitButton.click();

    // Wait for navigation to the map editor
    await page.waitForURL(/\/map\//, { timeout: 10000 });

    // Verify we're on the map editor page
    expect(page.url()).toMatch(/\/map\/[a-zA-Z0-9]+/);
  });

  test('should show validation error when title is empty', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click the "New Mind Map" button in the header
    const newMapButton = page.getByTestId('new-map-button');
    await expect(newMapButton).toBeVisible({ timeout: 10000 });
    await newMapButton.click();

    // Wait for dialog to open
    const dialog = page.getByTestId('create-map-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled when title is empty
    const submitButton = page.getByTestId('create-map-submit');
    await expect(submitButton).toBeDisabled();
  });

  test('should close dialog when cancel is clicked', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click the "New Mind Map" button in the header
    const newMapButton = page.getByTestId('new-map-button');
    await expect(newMapButton).toBeVisible({ timeout: 10000 });
    await newMapButton.click();

    // Wait for dialog to open
    const dialog = page.getByTestId('create-map-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should be closed
    await expect(dialog).not.toBeVisible();
  });
});
