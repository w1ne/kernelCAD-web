// tests/e2e/studio-gate.spec.ts
import { test, expect } from '@playwright/test';

// Cost-protection model: the Studio editor is OPEN to anonymous users (viewing
// and hand-editing cost us nothing). Only the in-app agent (our paid inference)
// is gated. So an anonymous visitor reaches the editor — NOT a forced sign-in
// wall — and sees a "Sign in" entry point but no agent rail.
test('anonymous user can open /studio editor; no forced sign-in wall', async ({ page }) => {
  await page.goto('/studio');
  // No forced, non-dismissable sign-in modal blocks the editor.
  await expect(page.getByText(/Sign in to open kernelCAD Studio/i)).toHaveCount(0);
  // A sign-in affordance is available in the header to unlock the agent.
  await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible();
  // The cost-bearing agent rail is not present for an anonymous user.
  await expect(page.getByLabelText('Agent rail')).toHaveCount(0);
});
