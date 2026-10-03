// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/backends/occt/export3mfModifiers.test.ts
//
// Per-region infill 3MF (Orca / Bambu): the part and its modifier volumes
// are one component object; `Metadata/model_settings.config` gives the
// object its base `sparse_infill_density` and each `modifier_part` its own.
// Format source: OrcaSlicer src/libslic3r/Format/bbs_3mf.cpp + Model.cpp.
//
// When an OrcaSlicer binary is present the file is also SLICED and the
// G-code must carry several times more sparse-infill extrusion under the
// dense modifier than outside it. Without Orca that test is SKIPPED and says
// why — it never passes silently.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { JSDOM } from 'jsdom';
import {
  export3mfWithReportAsync,
  type Export3mfOptions,
  type MeshedPart,
} from '../../../../../src/kernel/backends/occt/export3mf';
import { voxelSurface } from '../../../../../src/kernel/fea/infillBands';
import { detectSlicer } from '../../../../../src/kernel/export/gcode/slicerCli';
import { materialProfilePath } from '../../../../../src/kernel/export/gcode/profiles';
import type { OcctBackend } from '../../../../../src/kernel/backends/occt/occtBackend';

/** Axis-aligned box [x0,x1]x[y0,y1]x[z0,z1] as a closed mesh. */
function boxMesh(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const occ = new Uint8Array(1).fill(1);
  const m = voxelSurface(occ, [1, 1, 1], [0, 0, 0], 1);
  const v = m.vertices.map((c, i) => {
    const a = i % 3;
    const lo = [x0, y0, z0][a], hi = [x1, y1, z1][a];
    return lo + c * (hi - lo);
  });
  return { vertices: v, triangles: m.triangles };
}

const PART: MeshedPart = {
  name: 'bar',
  // Never meshed: the writer uses `mesh` when present.
  shape: undefined as unknown as OcctBackend,
  mesh: boxMesh(-20, -10, 0, 20, 10, 12),
};
// Dense modifier over the +X half of the bar, overhanging it on purpose
// (modifiers only act inside the part).
const DENSE = { name: 'infill-high-60pct', mesh: boxMesh(0, -12, -2, 22, 12, 14), settings: { sparse_infill_density: '60%', sparse_infill_pattern: 'gyroid' } };
const OPTS: Export3mfOptions = {
  format: '3mf',
  slicer: 'orca',
  printer: 'bambu-a1',
  arrange: 'assembled',
  modifiers: [DENSE],
  objectSettings: { sparse_infill_density: '10%', sparse_infill_pattern: 'gyroid' },
};

function parse(bytes: Uint8Array) {
  const entries = unzipSync(bytes);
  const xml = (p: string) => new JSDOM(strFromU8(entries[p]), { contentType: 'text/xml' }).window.document;
  return { entries, model: xml('3D/3dmodel.model'), settings: xml('Metadata/model_settings.config') };
}

function meta(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of Array.from(el.children)) {
    if (m.tagName === 'metadata') out[m.getAttribute('key')!] = m.getAttribute('value')!;
  }
  return out;
}

describe('3MF modifier volumes (Orca/Bambu)', () => {
  it('writes the part and its modifiers as one object with per-volume infill', async () => {
    const { bytes, bedWarnings } = await export3mfWithReportAsync([PART], OPTS);
    expect(bedWarnings).toEqual([]);
    const { model, settings } = parse(bytes);

    const objects = Array.from(model.getElementsByTagName('object'));
    expect(objects.map((o) => o.getAttribute('name'))).toEqual(['bar', 'infill-high-60pct', 'bar']);
    const parent = objects[2];
    const comps = Array.from(parent.getElementsByTagName('component')).map((c) => c.getAttribute('objectid'));
    expect(comps).toEqual(['1', '2']);
    const items = Array.from(model.getElementsByTagName('item'));
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute('objectid')).toBe('3');
    // Centred on the A1's 256 mm bed, dropped to Z=0.
    expect(items[0].getAttribute('transform')).toBe('1 0 0 0 1 0 0 0 1 128 128 0');
    // Modifier moved with the part: its Z range starts 2 mm below the part.
    const zs = Array.from(objects[1].getElementsByTagName('vertex')).map((v) => Number(v.getAttribute('z')));
    expect(Math.min(...zs)).toBeCloseTo(-2, 6);

    const cfgObjects = Array.from(settings.getElementsByTagName('object'));
    expect(cfgObjects).toHaveLength(1);
    expect(cfgObjects[0].getAttribute('id')).toBe('3');
    const objMeta = meta(cfgObjects[0]);
    expect(objMeta.sparse_infill_density).toBe('10%');
    expect(objMeta.sparse_infill_pattern).toBe('gyroid');
    const parts = Array.from(cfgObjects[0].getElementsByTagName('part'));
    expect(parts.map((p) => [p.getAttribute('id'), p.getAttribute('subtype')])).toEqual([
      ['1', 'normal_part'],
      ['2', 'modifier_part'],
    ]);
    expect(meta(parts[0]).sparse_infill_density).toBeUndefined();
    expect(meta(parts[1])).toMatchObject({
      name: 'infill-high-60pct',
      sparse_infill_density: '60%',
      sparse_infill_pattern: 'gyroid',
    });
  });

  it('keeps modelled positions with arrange none', async () => {
    const { bytes } = await export3mfWithReportAsync([PART], { ...OPTS, arrange: 'none' });
    const { model } = parse(bytes);
    const item = model.getElementsByTagName('item')[0];
    expect(item.getAttribute('transform')).toBeNull();
  });

  it('refuses formats and inputs it cannot honour', async () => {
    await expect(export3mfWithReportAsync([PART], { ...OPTS, slicer: 'prusa' })).rejects.toThrow(/bambu' or 'orca' only.*PrusaSlicer/);
    await expect(export3mfWithReportAsync([PART], { ...OPTS, slicer: 'generic' })).rejects.toThrow(/bambu' or 'orca' only/);
    await expect(export3mfWithReportAsync([PART, { ...PART, name: 'b2' }], OPTS)).rejects.toThrow(/exactly one part/);
    await expect(export3mfWithReportAsync([PART], { ...OPTS, orient: true })).rejects.toThrow(/orient/);
    const open = { ...DENSE, mesh: { vertices: DENSE.mesh.vertices, triangles: DENSE.mesh.triangles.slice(3) } };
    await expect(export3mfWithReportAsync([PART], { ...OPTS, modifiers: [open] })).rejects.toThrow(/not watertight/);
  });
});

/** OrcaSlicer binary: the gcode export's own detection, then the macOS app. */
function findOrca(): string | undefined {
  const found = detectSlicer();
  if (found !== undefined && /orca/i.test(found)) return found;
  const mac = '/Applications/OrcaSlicer.app/Contents/MacOS/OrcaSlicer';
  return existsSync(mac) ? mac : undefined;
}

const ORCA = findOrca();

describe('3MF modifier volumes sliced by OrcaSlicer', () => {
  it('prints denser sparse infill under the 60% modifier than in the 10% body', async (ctx) => {
    if (ORCA === undefined) {
      console.warn('[skipped] OrcaSlicer not found (set KERNELCAD_SLICER or put orca-slicer on PATH); the per-region infill slice check did not run.');
      ctx.skip();
      return;
    }
    const dir = await mkdtemp(join(tmpdir(), 'kc-infill-orca-'));
    try {
      const { bytes } = await export3mfWithReportAsync([PART], OPTS);
      const file = join(dir, 'bar.3mf');
      await writeFile(file, bytes);
      const r = spawnSync(ORCA, [
        '--datadir', dir, '--slice', '0', '--outputdir', dir,
        '--load-filaments', materialProfilePath('pla'),
        '--layer-height', '0.2', '--sparse-infill-density', '15',
        '--printable-area', '0x0,256x0,256x256,0x256', '--printable-height', '256',
        '--before-layer-change-gcode', 'G92 E0',
        file,
      ], { encoding: 'utf8', timeout: 240_000, maxBuffer: 64 * 1024 * 1024 });
      expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
      const gcode = await readFile(join(dir, 'plate_1.gcode'), 'utf8');

      // Sparse-infill extrusion by side of the modifier boundary (X = 128 on
      // the bed), skipping a 2 mm band around it.
      let type = '';
      let x = 0;
      let dense = 0;
      let sparse = 0;
      for (const line of gcode.split('\n')) {
        if (line.startsWith(';TYPE:')) { type = line.slice(6).trim(); continue; }
        if (!line.startsWith('G1') && !line.startsWith('G2') && !line.startsWith('G3')) continue;
        const mx = /X(-?[\d.]+)/.exec(line);
        const me = /E(-?[\d.]+)/.exec(line);
        const nx = mx ? Number(mx[1]) : x;
        if (type === 'Sparse infill' && me && Number(me[1]) > 0) {
          const mid = (x + nx) / 2;
          if (mid > 130) dense += Number(me[1]);
          else if (mid < 126) sparse += Number(me[1]);
        }
        x = nx;
      }
      expect(sparse).toBeGreaterThan(0);
      // 60 % vs 10 %: expect several times more; 3x leaves room for the
      // pattern's edge effects.
      expect(dense / sparse).toBeGreaterThan(3);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 300_000);
});
