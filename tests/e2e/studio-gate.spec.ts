// tests/e2e/studio-gate.spec.ts
import { test, expect } from '@playwright/test';

test('anonymous user hitting /studio sees the sign-in window, not the editor', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/Sign in to open kernelCAD Studio/i)).toBeVisible();
  // Non-dismissable: no close control.
  await expect(page.getByLabelText('Close')).toHaveCount(0);
});
