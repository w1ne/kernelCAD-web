// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const SHOTS = process.env.FUNNEL_SHOTS_DIR;

async function noHorizontalScroll(page: Page): Promise<void> {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`funnel pages at ${viewport.width} px`, () => {
    test.use({ viewport });

    test('/connect: pick an agent, copy its steps, try the starter prompt', async ({ page }) => {
      await page.goto(`${BASE}/connect`);
      await expect(page.getByRole('heading', { name: 'Connect your agent to kernelCAD' })).toBeVisible();

      // ChatGPT is the default: MCP URL and a link to its settings.
      await expect(page.getByRole('tab', { name: /ChatGPT/ })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tabpanel').getByText('https://mcp.kernelcad.com/mcp')).toBeVisible();
      await expect(page.getByRole('link', { name: /Open ChatGPT settings/ })).toBeVisible();

      // Codex: the two commands.
      await page.getByRole('tab', { name: /Codex/ }).click();
      await expect(page.getByText('codex mcp add kernelcad --url https://mcp.kernelcad.com/mcp')).toBeVisible();
      await expect(page.getByText('codex mcp login kernelcad')).toBeVisible();

      // Starter prompt and the "did it work" check (signed out: sign in to see it).
      await expect(page.getByText(/Design a wall bracket for a 30 mm round sensor/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Copy the starter prompt' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin?next=%2Fconnect');
      await noHorizontalScroll(page);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/e2e-connect-${viewport.width}.png`, fullPage: true });
    });

    test('/connect?client=claude-code opens on that agent', async ({ page }) => {
      await page.goto(`${BASE}/connect?client=claude-code`);
      await expect(page.getByRole('tab', { name: /Claude Code/ })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('claude mcp add --transport http kernelcad https://mcp.kernelcad.com/mcp')).toBeVisible();
    });

    test('/signin is clean and leads to /connect by default', async ({ page }) => {
      await page.goto(`${BASE}/signin`);
      await expect(page.getByRole('heading', { name: 'Sign in to kernelCAD' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeVisible();
      await expect(page.getByText(/Next, connect ChatGPT/)).toBeVisible();
      await noHorizontalScroll(page);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/e2e-signin-${viewport.width}.png`, fullPage: true });
    });

    test('/pricing shows the free path and one list style', async ({ page }) => {
      await page.goto(`${BASE}/pricing`);
      await expect(page.getByRole('heading', { name: 'Free: bring your own agent' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Subscribe to Basic' })).toBeVisible();
      await expect(page.locator('main')).not.toContainText('🎟');
      await noHorizontalScroll(page);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/e2e-pricing-${viewport.width}.png`, fullPage: true });
    });

    test('/generate keeps the prompt and points to your own agent', async ({ page }) => {
      await page.goto(`${BASE}/generate`);
      await expect(page.getByRole('heading', { name: 'Describe your part.' })).toBeVisible();
      await expect(page.getByLabel('Describe the part')).toBeVisible();
      // Both states (built-in agent on or off) link to /connect.
      await expect(page.locator('main a[href="/connect"]').first()).toBeVisible();
      await noHorizontalScroll(page);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/e2e-generate-${viewport.width}.png`, fullPage: true });
    });
  });
}
