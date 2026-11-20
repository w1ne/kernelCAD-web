// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Render path: a union of members that carry no face lineage (a sketch
// extrude, raised extruded text) keeps each member finish. The mesh handed to
// the headless player (`meshForHeadlessRender`, the path `kernelcad render`
// and render_preview use) carries both finishes, and GLB export writes both.
// The live check renders the default and publish looks and counts pixels of
// both colours (gated on a playwright chromium and a built static player).

import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshForHeadlessRender } from '../../../src/agent/render/headlessRender';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { findPlayerDist } from '../../../src/agent/render/playerServer';
import { renderScript } from '../../../src/agent/cli/commands/render';

const NAVY = '#1d3557';
const ORANGE = '#f4a261';
const MEMBERS = `
const plate = extrudeRect(60, 60, 2).finish('anodized', { color: '${NAVY}' });
const logo = sketch
  .text('KC', { size: 20, align: 'center', position: [0, 0], rotation: 15 })
  .extrude(1.5)
  .translate(0, 0, 2)
  .finish('anodized', { color: '${ORANGE}' });
`;
const SINGLE = `${MEMBERS}\nreturn union(plate, logo);`;
const PART = `${MEMBERS}\nconst a = assembly('logo-plate');\na.part('plate', union(plate, logo));\nreturn a.model();`;

let dir: string;
beforeAll(async () => {
  await initOcct();
  dir = await mkdtemp(join(tmpdir(), 'kcad-union-render-'));
  return () => rm(dir, { recursive: true, force: true });
});

async function scriptFile(name: string, code: string): Promise<string> {
  const file = join(dir, `${name}.kcad.ts`);
  await writeFile(file, code);
  return file;
}

/** Base colours each displayed (tail) mesh renders with, per face. */
async function tailFaceColours(code: string, name: string): Promise<Set<string>> {
  const { serialized } = await meshForHeadlessRender({
    scriptPath: await scriptFile(name, code), viewportWidth: 64, viewportHeight: 64,
  });
  const preds = new Set(serialized.flatMap((s) => s.predecessors ?? []));
  const out = new Set<string>();
  for (const s of serialized) {
    if (preds.has(s.featureId) || s.virtual) continue;
    for (const f of s.faces ?? []) {
      const pbr = s.materialByFaceId?.[f.faceId] ?? s.material;
      if (pbr?.baseColor !== undefined) out.add(pbr.baseColor.toLowerCase());
    }
  }
  return out;
}

function glbMaterialColours(bytes: Uint8Array): number {
  const buf = Buffer.from(bytes);
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {
    materials?: unknown[];
  };
  return json.materials?.length ?? 0;
}

describe('union of lineage-free members keeps both finishes on the render path', () => {
  it('single body: the mesh handed to the player carries navy and orange', async () => {
    expect(await tailFaceColours(SINGLE, 'single')).toEqual(new Set([NAVY, ORANGE]));
  });

  it('assembly part: the part mesh carries navy and orange', async () => {
    expect(await tailFaceColours(PART, 'part')).toEqual(new Set([NAVY, ORANGE]));
  });

  it('GLB export writes two materials for the single body and for the part', async () => {
    for (const code of [SINGLE, PART]) {
      const out = await runAndExport({ code, fileName: 'logo.kcad.ts', format: 'glb' });
      expect(glbMaterialColours(out.bytes!)).toBe(2);
    }
  });
});

async function chromiumAvailable(): Promise<boolean> {
  try {
    const { chromium } = await import('playwright');
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}
const canRender = (await chromiumAvailable()) && findPlayerDist() !== undefined;

/** Pixels whose hue reads orange (r > g > b, saturated) and navy (b > r, dark). */
async function hueCounts(png: string): Promise<{ orange: number; navy: number }> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let orange = 0;
  let navy = 0;
  for (let i = 0; i < info.width * info.height * 3; i += 3) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    if (r > g + 15 && g > b + 15 && r > 90) orange++;
    else if (b > r + 15 && b > g && r < 120) navy++;
  }
  return { orange, navy };
}

describe.runIf(canRender)('live render: one body, two finishes', () => {
  // One retry: under heavy machine load the headless player has returned an
  // empty first frame (seen for the publish look on develop too).
  it('default and publish looks both show orange letters on a navy plate', { timeout: 600_000, retry: 1 }, async () => {
    const file = await scriptFile('live', SINGLE);
    for (const preset of ['default', 'publish']) {
      const out = join(dir, `live-${preset}.png`);
      const r = await renderScript({
        file, out, separate: false, hideReferenceImages: true, noWatermark: true,
        noMechanismCheck: true, width: 384, height: 384, preset,
      });
      expect(r.exitCode, preset).toBe(0);
      const { orange, navy } = await hueCounts(out);
      expect(navy, `${preset} navy pixels`).toBeGreaterThan(2000);
      expect(orange, `${preset} orange pixels`).toBeGreaterThan(300);
    }
  });
});
