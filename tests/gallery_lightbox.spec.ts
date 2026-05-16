import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(() => {
  writeFileSync(path.resolve(__dirname, '../site/public/gallery.json'), JSON.stringify({
    generatedAt: '2026-05-15T00:00:00Z',
    entries: [{
      slug: 'one', title: 'First Build', author: { handle: 'kernelcad', url: 'https://x.com/kernelcad' },
      version: 'v0.6.4', prompt: 'build a thing', source: 'curated',
      modelUrl: '/gallery/one/model.glb',
      videoUrl: '/demo.mp4',
      posterUrl: '/og-image.png',
      code: 'https://github.com/w1ne/kernelCAD-web', tags: [],
      featured: false, createdAt: '2026-05-11', appUrl: null,
    }],
  }));
});

test('clicking a tile opens the lightbox with entry content', async ({ page }) => {
  await page.goto('http://localhost:8000');
  await page.click('.gallery-tile[data-slug="one"]');
  const dialog = page.locator('#gallery-lightbox');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.lightbox-title')).toHaveText('First Build');
  await expect(dialog.locator('.lightbox-prompt')).toHaveText('build a thing');
  await expect(dialog.locator('input[name="source"]')).toHaveAttribute('value', 'gallery-lightbox:one');
});

test('ESC closes the lightbox', async ({ page }) => {
  await page.goto('http://localhost:8000');
  await page.click('.gallery-tile[data-slug="one"]');
  await page.keyboard.press('Escape');
  await expect(page.locator('#gallery-lightbox')).not.toBeVisible();
});
