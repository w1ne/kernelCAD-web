import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'site/public');

test.beforeEach(() => {
  writeFileSync(path.join(PUBLIC_DIR, 'gallery.json'), JSON.stringify({
    generatedAt: '2026-05-15T00:00:00Z',
    entries: [
      {
        slug: 'one', title: 'First', author: { handle: 'kernelcad', url: 'https://x.com/kernelcad' },
        version: 'v0.6.4', prompt: 'p1', source: 'curated',
        modelUrl: '/gallery/one/model.glb',
        videoUrl: '/gallery/one/video.mp4',
        posterUrl: '/og-image.png',
        code: 'https://github.com/w1ne/kernelCAD-web', tags: [],
        featured: false, createdAt: '2026-05-11', appUrl: null,
      },
      {
        slug: 'two', title: 'Second', author: { handle: 'kernelcad', url: 'https://x.com/kernelcad' },
        version: 'v0.6.3', prompt: 'p2', source: 'curated',
        modelUrl: '/gallery/two/model.glb',
        videoUrl: '/gallery/two/video.mp4',
        posterUrl: '/og-image.png',
        code: 'https://github.com/w1ne/kernelCAD-web', tags: [],
        featured: false, createdAt: '2026-05-10', appUrl: null,
      },
    ],
  }));
});

test('renders the gallery section with one tile per entry', async ({ page }) => {
  await page.goto('http://localhost:8000');
  const gallery = page.locator('section.gallery');
  await expect(gallery).toBeVisible();
  await expect(gallery.locator('.gallery-tile')).toHaveCount(2);
  await expect(gallery.locator('.gallery-tile[data-slug="one"] .title')).toHaveText('First');
});

test('first tile starts as a poster and upgrades to model-viewer on interaction', async ({ page }) => {
  await page.addInitScript(() => {
    class IdleIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: IdleIntersectionObserver,
    });
  });
  await page.goto('http://localhost:8000');
  const tile = page.locator('.gallery-tile').first();
  await expect(tile.locator('.tile-poster')).toBeVisible();
  await expect(tile.locator('model-viewer')).toHaveCount(0);

  await tile.hover();
  const mv = tile.locator('model-viewer');
  await expect(mv).toHaveAttribute('src', /\/gallery\/one\/model\.glb\?v=/);
  await expect(mv).toHaveAttribute('poster', /\/og-image\.png\?v=/);
});
