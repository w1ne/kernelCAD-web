// tests/integration/mcp/renderPreviewLive.test.ts
//
// LIVE render_preview test (#440): drives the real pipeline end-to-end —
// static player served from an ephemeral port (NO studio dev server), real
// headless chromium, real OCCT meshing — and asserts the PNGs are
// non-trivial: > 1 KB and not near-black (the CI hero-video gate's
// blackFrameCheck precedent, applied to stills via sharp).
//
// Environment-gated, not environment-weakened: the suite SKIPS only when the
// machine cannot run it at all (no playwright chromium binary, or the static
// player bundle was never built). CI vitest shards don't install browsers,
// so this runs on dev machines and any pipeline that provisions chromium +
// `npm run build:player`.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import sharp from 'sharp';
import { renderPreviewTool } from '../../../src/agent/mcp/tools/renderPreview';
import { findPlayerDist } from '../../../src/agent/render/playerServer';

async function chromiumAvailable(): Promise<boolean> {
  try {
    const { chromium } = await import('playwright');
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

const canRun = (await chromiumAvailable()) && findPlayerDist() !== undefined;

describe.runIf(canRun)('render_preview — live static-player render', () => {
  it(
    'renders inline code to non-trivial, non-black PNGs without a dev server',
    { timeout: 240_000 },
    async () => {
      const r = await renderPreviewTool({
        code: [
          'const base = box(60, 40, 5);',
          'const hole = cylinder(7, 4).translate(30, 20, -1);',
          'return base.subtract(hole).fillet(1);',
        ].join('\n'),
        pose: '30,20',
      });
      try {
        expect(r.ok, r.error ?? '').toBe(true);
        expect(r.render_source).toBe('static-player');
        expect(r.images).toHaveLength(5);
        for (const img of r.images) {
          const buf = await readFile(img.path);
          // Non-trivial: a blank/garbage tile compresses below this.
          expect(buf.length, `${img.name} size`).toBeGreaterThan(1024);
          // Not near-black: the demo-player background alone is mid-gray, so
          // a healthy tile has a comfortably bright mean (blackFrameCheck
          // precedent: scripts/lib/blackFrameCheck.ts fails frames whose
          // near-black fraction is ~1.0; mean > 25 is far above that floor).
          const stats = await sharp(buf).greyscale().stats();
          expect(stats.channels[0].mean, `${img.name} mean luminance`).toBeGreaterThan(25);
        }
        // The model occupies pixels: the iso view must not be a flat
        // background — assert meaningful per-pixel variance.
        const iso = r.images.find(i => i.name === 'iso')!;
        const isoStats = await sharp(await readFile(iso.path)).greyscale().stats();
        expect(isoStats.channels[0].stdev).toBeGreaterThan(5);
        expect(r.bounds!.max[0] - r.bounds!.min[0]).toBeCloseTo(60, 0);
      } finally {
        if (r.out_dir !== undefined) await rm(r.out_dir, { recursive: true, force: true });
      }
    },
  );
});

describe.runIf(!canRun)('render_preview — live render (environment unavailable)', () => {
  it('skipped: playwright chromium or dist/headless-player missing on this machine', () => {
    expect(true).toBe(true);
  });
});
