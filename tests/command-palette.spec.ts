import { test, expect } from '@playwright/test';

test.describe('Command Palette', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for app to be ready
        await page.waitForSelector('canvas');
    });

    test('should open command palette with Cmd+K', async ({ page }) => {
        // Check if component is mounted
        await expect(page.getByTestId('command-palette-mounted')).toBeAttached();

        // Try Control+k which is safer across platforms in headless mode
        await page.keyboard.press('Control+k');

        // Wait for the input to appear
        const input = page.getByPlaceholder('Type a command or search...');
        await expect(input).toBeVisible();
    });

    test('should filter and execute "Extrude" command', async ({ page }) => {
        await page.keyboard.press('Control+k');

        const input = page.getByPlaceholder('Type a command or search...');
        await expect(input).toBeVisible();

        // Type "Extrude"
        await input.fill('Extrude');

        // Expect "Extrude" option to be visible
        // We look for the item text "Extrude" inside the list
        // Note: The palette renders items. We might need to be specific if there are multiple "Extrude" texts.
        // Using role 'option' is better if accessibility is set up right by cmdk (it is).
        const option = page.getByRole('option', { name: 'Extrude', exact: true });
        // Or cleaner: text=Extrude
        await expect(page.getByText('Extrude', { exact: true })).toBeVisible();

        // Press Enter to trigger
        await page.keyboard.press('Enter');

        // Verify Extrude Dialog opens
        // The extrude dialog title usually contains "Extrude"
        await expect(page.getByRole('dialog', { name: 'Extrude' })).toBeVisible();
        await expect(page.getByText('Distance (mm)')).toBeVisible();
    });

    test('should close on Escape', async ({ page }) => {
        await page.keyboard.press('Control+k');
        await expect(page.getByPlaceholder('Type a command or search...')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByPlaceholder('Type a command or search...')).not.toBeVisible();
    });
});
