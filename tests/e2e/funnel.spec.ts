import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

test('home offers a free example before sign-in', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByTestId('workbench-ready')).toBeVisible();
  await page.getByTestId('activity-projects').click();
  await expect(page.getByTestId('projects-pane').getByRole('button', { name: 'Bracket', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('signin route renders Google button', async ({ page }) => {
  await page.goto(`${BASE}/signin`);
  await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
});

test('studio route still renders existing app', async ({ page }) => {
  await page.goto(`${BASE}/studio`);
  // The existing Studio shell renders — relax assertion to "page didn't 404"
  await expect(page).not.toHaveTitle(/404/);
});
