// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/mcp/renderPreviewPublishLive.test.ts
//
// LIVE render_preview preset: 'publish' + capture_animation turntable:
// real static player, real chromium, real OCCT meshing. Asserts on pixels:
//   - transparent backdrop → PNG with an alpha channel, empty corners, and
//     the model's alpha footprint inside the frame with margin on every
//     side while still filling most of the binding axis;
//   - opaque white backdrop → white corners;
//   - determinism: the same input twice → the same pixels within tolerance;
//   - turntable → one PNG per frame, frames differ (the model turns).
//
// Environment-gated like renderPreviewLive.test.ts: skipped only when the
// machine has no playwright chromium or no dist/headless-player bundle.
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderPreviewTool } from '../../../src/agent/mcp/tools/renderPreview';
import { captureAnimationTool } from '../../../src/agent/mcp/tools/captureAnimation';
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

// Asymmetric, multi-colour part: an off-centre post on a plate.
const CODE = [
  "const plate = box(60, 40, 6).color('#3b82f6');",
  "const post = cylinder(30, 6).translate(18, 8, 6).color('#f97316');",
  'return assembly().part("plate", plate).part("post", post).model();',
].join('\n');

async function raw(path: string) {
  return sharp(await readFile(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

describe.runIf(canRun)("render_preview preset: 'publish' — live", () => {
  it('transparent backdrop: alpha PNG, model framed inside the margin', { timeout: 300_000 }, async () => {
    const out = mkdtempSync(join(tmpdir(), 'publish-live-'));
    try {
      const r = await renderPreviewTool({
        code: CODE, preset: 'publish', background: 'transparent', shadow: false,
        width: 480, height: 360, out_dir: out, no_mechanism_check: true,
      });
      expect(r.ok, r.error ?? '').toBe(true);
      expect(r.images.map((i) => i.name)).toEqual(['hero']);
      const meta = await sharp(await readFile(r.images[0].path)).metadata();
      expect([meta.width, meta.height, meta.hasAlpha]).toEqual([480, 360, true]);

      const { data, info } = await raw(r.images[0].path);
      const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
      for (const [x, y] of [[0, 0], [479, 0], [0, 359], [479, 359]]) expect(alpha(x, y)).toBe(0);
      let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          if (alpha(x, y) > 8) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
      // Air on every side (margin), and the model is not a speck.
      expect(minX).toBeGreaterThan(info.width * 0.02);
      expect(minY).toBeGreaterThan(info.height * 0.02);
      expect(info.width - 1 - maxX).toBeGreaterThan(info.width * 0.02);
      expect(info.height - 1 - maxY).toBeGreaterThan(info.height * 0.02);
      const fill = Math.max((maxX - minX + 1) / info.width, (maxY - minY + 1) / info.height);
      expect(fill).toBeGreaterThan(0.6);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('is deterministic: the same input renders the same pixels (white backdrop, shadow on)', { timeout: 400_000 }, async () => {
    const outs = [mkdtempSync(join(tmpdir(), 'publish-det-a-')), mkdtempSync(join(tmpdir(), 'publish-det-b-'))];
    try {
      const paths: string[] = [];
      for (const out of outs) {
        const r = await renderPreviewTool({ code: CODE, preset: 'publish', width: 320, height: 240, out_dir: out, no_mechanism_check: true });
        expect(r.ok, r.error ?? '').toBe(true);
        paths.push(r.images[0].path);
      }
      const [a, b] = await Promise.all(paths.map(raw));
      // Opaque white backdrop.
      expect([...a.data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
      let sum = 0;
      let large = 0;
      for (let i = 0; i < a.data.length; i++) {
        const d = Math.abs(a.data[i] - b.data[i]);
        sum += d;
        if (d > 8) large++;
      }
      expect(sum / a.data.length).toBeLessThan(0.5);
      expect(large / a.data.length).toBeLessThan(0.001);
    } finally {
      for (const out of outs) rmSync(out, { recursive: true, force: true });
    }
  });

  it('capture_animation turntable writes one frame per step of a full turn', { timeout: 400_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'turntable-live-'));
    const file = join(dir, 'part.kcad.ts');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(file, CODE);
    try {
      const framesDir = join(dir, 'frames');
      const r = await captureAnimationTool({ file, turntable: true, frames_dir: framesDir, width: 96, height: 96, fps: 4, duration_ms: 1000 });
      expect(r.ok, r.error ?? '').toBe(true);
      expect(r.frame_count).toBe(4);
      const frames = readdirSync(framesDir).sort();
      expect(frames).toHaveLength(4);
      const [f0, f2] = await Promise.all([raw(join(framesDir, frames[0])), raw(join(framesDir, frames[2]))]);
      let diff = 0;
      for (let i = 0; i < f0.data.length; i++) diff += Math.abs(f0.data[i] - f2.data[i]);
      expect(diff / f0.data.length).toBeGreaterThan(1); // the model turned
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe.runIf(!canRun)('render_preview publish — live render (environment unavailable)', () => {
  it('skipped: playwright chromium or dist/headless-player missing on this machine', () => {
    expect(true).toBe(true);
  });
});
