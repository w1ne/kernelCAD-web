// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// LIVE render: a finish renders at the same brightness whatever else is in
// the scene and whatever the part size. The headless player used to light
// the scene with the room IBL only when a metal was on screen, so an ABS box
// read RGB ~30 alone and ~120 next to a steel part (reported as "brightness
// depends on part size": the 30 mm sample shared its scene with steel). The
// default room environment now applies to every render with no declared
// environment.
//
// Environment-gated like renderPreviewLive: skips without a playwright
// chromium binary or a built static player (`npm run build:player`).
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderInspectBundle } from '../../../src/agent/cli/commands/render';
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

const absPart = (s: number) => `box(${s}, ${s}, ${s / 3}).fillet(${s / 15}, { face: 'top' })`;

/** Mean sRGB luma of the part named `part` in the iso view. */
async function partLuma(dir: string, code: string, part: string): Promise<number> {
  const file = join(dir, `${part}-${Math.random().toString(36).slice(2)}.kcad.ts`);
  await writeFile(file, code);
  const out = `${file}.inspect`;
  const r = await renderInspectBundle({
    file, outDir: out, width: 512, height: 512, hideReferenceImages: true, noWatermark: true,
    channels: ['rgb', 'mask'], views: ['iso'],
  });
  expect(r.exitCode).toBe(0);
  const manifest = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'));
  const obj = manifest.channelMetadata.mask.objects.find((o: { names: string[] }) => o.names.includes(part));
  expect(obj, `${part} in mask`).toBeDefined();
  const rgb = await sharp(join(out, 'channels/rgb/iso.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = await sharp(join(out, 'channels/mask/iso.png')).removeAlpha().raw().toBuffer();
  let sum = 0;
  let n = 0;
  for (let i = 0; i < mask.length; i += 3) {
    if (mask[i] !== obj.rgb[0] || mask[i + 1] !== obj.rgb[1] || mask[i + 2] !== obj.rgb[2]) continue;
    sum += 0.2126 * rgb.data[i] + 0.7152 * rgb.data[i + 1] + 0.0722 * rgb.data[i + 2];
    n++;
  }
  expect(n, `${part} pixels`).toBeGreaterThan(1000);
  return sum / n;
}

describe.runIf(canRun)('render: finish brightness is independent of part size and scene', () => {
  it('ABS at 30 / 90 / 300 mm alone and next to a steel part render alike', { timeout: 600_000 }, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kcad-bright-'));
    try {
      const alone = (s: number) =>
        `const a = assembly('one');\na.part('abs', ${absPart(s)}, { material: 'abs' });\nreturn a.model();`;
      const withSteel = `const a = assembly('two');
a.part('abs', ${absPart(30)}, { material: 'abs' });
a.part('steel', box(20, 20, 20).translate(-40, 5, 0), { material: 'steel' });
return a.model();`;
      const l30 = await partLuma(dir, alone(30), 'abs');
      const l90 = await partLuma(dir, alone(90), 'abs');
      const l300 = await partLuma(dir, alone(300), 'abs');
      const lSteel = await partLuma(dir, withSteel, 'abs');
      // ABS base colour #6b7078 (luma ~111): readable, not near-black.
      expect(l30).toBeGreaterThan(80);
      for (const l of [l90, l300, lSteel]) expect(Math.abs(l - l30) / l30).toBeLessThan(0.15);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
