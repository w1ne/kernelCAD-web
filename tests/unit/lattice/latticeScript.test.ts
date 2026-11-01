// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `body.lattice({...})` end to end: capture validation, lowering to a
// mesh solid, grading from holes and from an in-process feaStudy, part
// frame, STL / 3MF / OBJ export round trip, B-rep-only refusals, and the
// DFM lattice gate.

import { beforeAll, describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildModel } from '../../../src/composition/buildModel';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { SolidMeshBackend } from '../../../src/kernel/backends/solidMeshBackend';
import { decodeStlMesh } from '../../../src/kernel/backends/meshBackend';
import { meshMass, meshTopology } from '../../../src/kernel/lattice/meshMetrics';
import type { LatticeReport } from '../../../src/kernel/lattice/buildLattice';
import { runDfmChecksOnModel } from '../../../src/modeling/runtime/dfm/runDfmChecks';

const CUBE = `return box(20, 20, 20, true).lattice({ type: 'gyroid', cell: 5, wall: 0.8, skin: 1 });`;

async function build(code: string) {
  return buildModel({ code, fileName: 'lattice.kcad.ts' });
}

function errors(d: readonly { severity: string; code: string }[]): string[] {
  return d.filter((x) => x.severity === 'error').map((x) => x.code);
}

describe('body.lattice()', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers to a watertight mesh solid with a lattice report', async () => {
    const m = await build(CUBE);
    expect(errors(m.diagnostics)).toEqual([]);
    const shape = m.rootShape;
    expect(shape).toBeInstanceOf(SolidMeshBackend);
    const solid = shape as SolidMeshBackend;
    const report = solid.facts.lattice as LatticeReport;
    expect(report.watertight && report.consistentOrientation).toBe(true);
    expect(solid.volume()).toBeCloseTo(report.volumeMm3, 3);
    expect(solid.volume()).toBeLessThan(8000 * 0.8);
    const mp = solid.massProperties(1000);
    expect(mp.mass).toBeCloseTo(solid.volume() * 1e-6, 6);
    expect(Math.hypot(...mp.com)).toBeLessThan(0.3);
    expect(m.diagnostics.some((d) => d.code === 'feature.lattice.report')).toBe(true);
  });

  it('rejects bad options with invalid-args and an example', async () => {
    await expect(build(`return box(10, 10, 10).lattice({ cell: -1 });`)).rejects.toThrow(/opts\.cell.*Example: body\.lattice/s);
    await expect(build(`return box(10, 10, 10).lattice({ cell: 6, type: 'kelvin' });`)).rejects.toThrow(/opts\.type/);
    await expect(build(`return box(10, 10, 10).lattice({ cell: 6, variant: 'network', wall: 1 });`)).rejects.toThrow(/density/);
    await expect(build(`return box(10, 10, 10).lattice({ cell: 6, grade: { from: 'surface' } });`)).rejects.toThrow(/grade\.near/);
  });

  it('refuses B-rep operations on the lattice result', async () => {
    const m = await build(`return box(20, 20, 20).lattice({ cell: 5 }).union(box(5, 5, 5));`);
    expect(errors(m.diagnostics)).toContain('feature.lattice.mesh-input');
  });

  it('grades from the hole walls and from a feaStudy (in-process solve)', async () => {
    const holes = await build(`
      const plate = box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through' });
      return plate.lattice({ cell: 5, wall: 0.7, skin: 1, grade: { from: 'holes', near: 1.6, over: 6 } });`);
    expect(errors(holes.diagnostics)).toEqual([]);
    const hr = (holes.rootShape as SolidMeshBackend).facts.lattice as LatticeReport;
    expect(hr.designWallMm!.max).toBeGreaterThan(1.4);
    expect(hr.designWallMm!.min).toBeCloseTo(0.7, 1);

    const fea = await build(`
      const beam = box(60, 12, 12);
      beam.feaStudy({ name: 'tip', material: 'petg',
        fixed: { boundingBoxIn: { xMin: -1, xMax: 1, yMin: -1, yMax: 13, zMin: -1, zMax: 13 } },
        loads: [{ name: 'tip', faces: { boundingBoxIn: { xMin: 59, xMax: 61, yMin: -1, yMax: 13, zMin: -1, zMax: 13 } }, force: [0, 0, -150] }] });
      return beam.lattice({ variant: 'network', cell: 5, density: 0.2, skin: 1, grade: { from: 'fea' } });`);
    expect(errors(fea.diagnostics)).toEqual([]);
    const fr = (fea.rootShape as SolidMeshBackend).facts.lattice as LatticeReport;
    // Default bands: 10 % / 25 % / 60 % -> the root of the cantilever is denser.
    expect(fr.designFraction.max).toBeGreaterThan(fr.designFraction.min + 0.1);

    const missing = await build(`return box(20, 20, 20).lattice({ cell: 5, grade: { from: 'fea' } });`);
    expect(errors(missing.diagnostics)).toContain('feature.lattice.grade-unavailable');
  }, 120_000);

  it('follows the part frame of a rotated primitive', async () => {
    const m = await build(`return box(20, 20, 20, true).rotate([0, 0, 1], 30).lattice({ cell: 5, skin: 1 });`);
    expect(errors(m.diagnostics)).toEqual([]);
    const world = await build(`return box(20, 20, 20, true).rotate([0, 0, 1], 30).lattice({ cell: 5, skin: 1, frame: 'world' });`);
    // Same body, same lattice volume to within a few percent, different cell placement.
    const a = (m.rootShape as SolidMeshBackend).volume(), b = (world.rootShape as SolidMeshBackend).volume();
    expect(Math.abs(a / b - 1)).toBeLessThan(0.05);
    expect((m.rootShape as SolidMeshBackend).positions).not.toEqual((world.rootShape as SolidMeshBackend).positions);
  });

  it('exports STL / 3MF / OBJ that round-trip, and refuses STEP', async () => {
    const stl = await runAndExport({ code: CUBE, fileName: 'c.kcad.ts', format: 'stl' });
    expect(errors(stl.diagnostics)).toEqual([]);
    const decoded = decodeStlMesh(stl.bytes);
    expect(meshTopology(decoded.positions.length / 3, decoded.indices).consistentOrientation).toBe(true);
    expect(meshMass(decoded.positions, decoded.indices).volumeMm3).toBeCloseTo(stl.latticeReport!.volumeMm3, -1);

    const tmf = await runAndExport({ code: CUBE, fileName: 'c.kcad.ts', format: '3mf' });
    expect(errors(tmf.diagnostics)).toEqual([]);
    const model = strFromU8(unzipSync(tmf.bytes)['3D/3dmodel.model']);
    expect((model.match(/<triangle /g) ?? []).length).toBe(stl.latticeReport!.triangles);

    const obj = await runAndExport({ code: CUBE, fileName: 'c.kcad.ts', format: 'obj' });
    expect((new TextDecoder().decode(obj.bytes).match(/^f /gm) ?? []).length).toBe(stl.latticeReport!.triangles);

    const step = await runAndExport({ code: CUBE, fileName: 'c.kcad.ts', format: 'step' });
    expect(step.bytes.length).toBe(0);
    expect(errors(step.diagnostics)).toContain('export.mesh-body.format-unsupported');
  }, 120_000);

  it('DFM reports lattice walls thinner than the printable minimum', async () => {
    const m = await build(`dfmSpec({ process: 'fdm', minWall: 1.0 });
      return box(20, 20, 20, true).lattice({ cell: 5, wall: 0.6, skin: 1 });`);
    const report = await runDfmChecksOnModel(m);
    expect(report!.lattices![0].measuredWallP5Mm).toBeLessThan(1.0);
    expect(report!.diagnostics.map((d) => d.code)).toContain('dfm.lattice.wall-too-thin');
    expect(report!.diagnostics.map((d) => d.code)).toContain('dfm.lattice.enclosed-cavities');
    const ok = await runDfmChecksOnModel(await build(`dfmSpec({ process: 'fdm', minWall: 0.8 });
      return box(20, 20, 20, true).lattice({ cell: 5, wall: 1.2, skin: 1 });`));
    expect(ok!.diagnostics.map((d) => d.code)).not.toContain('dfm.lattice.wall-too-thin');
  }, 60_000);
});
