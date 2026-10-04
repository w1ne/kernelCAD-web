// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/backends/occt/export3mfPrinterProfiles.test.ts
//
// 3MF arrange against the printer profile registry: the same plate
// overflows a small bed and fits a large one, each warning's `fitsOn` is
// exactly the smallest profiles on which the layout exports with no bed
// warning, `slicer` defaults from the profile, and an unknown id is refused
// with the valid ids.
import { describe, it, expect, beforeAll } from 'vitest';
import { unzipSync } from 'fflate';
import { initOcct, OcctBackend } from '../../../../../src/kernel/backends/occt/occtBackend';
import { sceneToWorldFrameParts } from '../../../../../src/kernel/backends/occt/sceneToWorldFrame';
import { export3mfWithReportAsync, type Export3mfOptions } from '../../../../../src/kernel/backends/occt/export3mf';
import {
  PRINTER_PROFILE_IDS, DEFAULT_PRINTER_PROFILE, FITS_ON_LIMIT, profilesBySize,
} from '../../../../../src/kernel/export/gcode/printerProfiles';
import { Transform } from '../../../../../src/shared/runtime/se3';
import type { SceneBackend, SceneBackendPart } from '../../../../../src/kernel/backends/sceneBackend';

function scene(parts: SceneBackendPart[]): SceneBackend {
  return { target: 'export-occt', assemblyName: 'demo', _kind: 'scene', parts };
}

/** Four 150 x 150 mm tiles: a 305 x 305 mm plate with the 5 mm gaps. */
function tiles(): SceneBackend {
  return scene(Array.from({ length: 4 }, (_, i) => ({
    name: `tile${i}`, shape: OcctBackend.box(150, 150, 10), worldTransform: Transform.identity(),
  })));
}

function run(s: SceneBackend, opts: Partial<Export3mfOptions>) {
  return export3mfWithReportAsync(sceneToWorldFrameParts(s), { format: '3mf', assemblyName: s.assemblyName, ...opts });
}

describe('export3mf arrange with printer profiles', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('the same plate overflows a small bed and fits a large one', async () => {
    const small = await run(tiles(), { arrange: 'plate', printer: 'bambu-a1-mini' });
    expect(small.bedWarnings.map(w => w.kind)).toEqual(['plate-overflow']);
    expect(small.bedWarnings[0].printer).toBe('bambu-a1-mini');
    expect(small.bedWarnings[0].bedMm).toEqual({ x: 180, y: 180, z: 180 });
    const large = await run(tiles(), { arrange: 'plate', printer: 'prusa-xl' });
    expect(large.bedWarnings).toEqual([]);
  });

  it("fitsOn is exactly the smallest profiles that export the plate with no warning", async () => {
    const fitsById = new Map<string, boolean>();
    for (const id of PRINTER_PROFILE_IDS) {
      fitsById.set(id, (await run(tiles(), { arrange: 'plate', printer: id })).bedWarnings.length === 0);
    }
    const expected = profilesBySize()
      .filter(p => p.name !== DEFAULT_PRINTER_PROFILE && fitsById.get(p.name))
      .slice(0, FITS_ON_LIMIT)
      .map(p => p.name);
    expect(expected.length).toBeGreaterThan(0);
    const { bedWarnings } = await run(tiles(), { arrange: 'plate' });
    expect(bedWarnings).toHaveLength(1);
    expect(bedWarnings[0].fitsOn).toEqual(expected);
  });

  it("assembled: fitsOn lists profiles whose bed holds the whole object", async () => {
    const s = scene([
      { name: 'base', shape: OcctBackend.box(300, 40, 10), worldTransform: Transform.identity() },
      { name: 'post', shape: OcctBackend.box(10, 10, 200), worldTransform: Transform.translation(0, 0, 10) },
    ]);
    const { bedWarnings } = await run(s, { arrange: 'assembled' });
    expect(bedWarnings.map(w => w.kind)).toEqual(['exceeds-bed']);
    const fitsOn = bedWarnings[0].fitsOn;
    expect(fitsOn.length).toBeGreaterThan(0);
    for (const id of fitsOn) {
      expect((await run(s, { arrange: 'assembled', printer: id })).bedWarnings).toEqual([]);
    }
  });

  it('defaults slicer from the profile; an explicit slicer wins; generic-fdm writes no sidecar', async () => {
    const one = scene([{ name: 'cube', shape: OcctBackend.box(20, 20, 20), worldTransform: Transform.identity() }]);
    const files = async (opts: Partial<Export3mfOptions>) => Object.keys(unzipSync((await run(one, opts)).bytes));
    expect(await files({ printer: 'bambu-a1' })).toContain('Metadata/model_settings.config');
    expect(await files({ printer: 'prusa-mk4s' })).toContain('Metadata/Slic3r_PE_model.config');
    expect(await files({ printer: 'bambu-a1', slicer: 'generic' })).not.toContain('Metadata/model_settings.config');
    const generic = await files({ printer: 'generic-fdm' });
    expect(generic).toEqual(await files({}));
    expect(generic.some(f => f.endsWith('.config'))).toBe(false);
  });

  it('refuses an unknown printer id with the list of valid ids, even without arrange', async () => {
    const one = scene([{ name: 'cube', shape: OcctBackend.box(20, 20, 20), worldTransform: Transform.identity() }]);
    await expect(run(one, { printer: 'mystery-printer' })).rejects.toThrow(
      `Unknown printer profile 'mystery-printer'. Known profiles: ${PRINTER_PROFILE_IDS.join(', ')}.`,
    );
  });
});
