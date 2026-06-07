// src/agent/inspect/inspectStep.test.ts
//
// W4 inspection — Task 3: STEP inspect orchestrator. Round-trips a known
// multi-solid STEP generated in-process (same recipe as fromSTEP.test.ts)
// and asserts the per-solid report: exact bbox, volume, face count, holes.
// Pure analysis — no capture session, no assembly solve.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { inspectStepFile } from './inspectStep';

let tmpDir: string;
let stepPath: string;

beforeAll(async () => {
  await initOcct();
  // Two disjoint solids, one carrying a Ø4 blind hole 6 deep from the top
  // face (plate z ∈ [-5, 5], drill z ∈ [-1, 5]). Disjoint fuse produces a
  // compound of 2 solids — verified to survive the STEP round-trip.
  const plate = OcctBackend.box(20, 20, 10, true)
    .subtract(OcctBackend.cylinder(6, 2).translate(0, 0, -1));
  const cube = OcctBackend.box(5, 5, 5, true).translate(40, 0, 0);
  const compound = plate.union(cube);
  tmpDir = mkdtempSync(join(tmpdir(), 'kcad-inspectstep-'));
  stepPath = join(tmpDir, 'two-solids.step');
  writeFileSync(stepPath, await compound.exportSTEPAsync());
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('inspectStepFile', () => {
  it('reports the solid tree with exact bbox, volume, holes', async () => {
    const report = await inspectStepFile(stepPath);
    expect(report.file).toBe(stepPath);
    expect(report.solidCount).toBe(2);
    expect(report.solids).toHaveLength(2);

    const plate = report.solids.find((s) => s.volumeMm3 > 1000)!;
    expect(plate).toBeDefined();
    // 20×20×10 minus a Ø4 cylinder 6 deep: 4000 − π·2²·6.
    expect(plate.volumeMm3).toBeCloseTo(20 * 20 * 10 - Math.PI * 4 * 6, -1);
    expect(plate.bboxExact.min[0]).toBeCloseTo(-10, 1);
    expect(plate.bboxExact.max[0]).toBeCloseTo(10, 1);
    expect(plate.bboxExact.max[2]).toBeCloseTo(5, 1);
    // Box (6 faces) + bore wall + bore bottom = 8.
    expect(plate.faceCount).toBe(8);
    expect(plate.holes).toHaveLength(1);
    expect(plate.holes[0].kind).toBe('blind');
    expect(plate.holes[0].diameterMm).toBeCloseTo(4, 2);
    expect(plate.holes[0].depthMm).toBeCloseTo(6, 1);

    const cube = report.solids.find((s) => s.volumeMm3 <= 1000)!;
    expect(cube).toBeDefined();
    expect(cube.volumeMm3).toBeCloseTo(125, 0);
    expect(cube.bboxExact.min[0]).toBeCloseTo(37.5, 1);
    expect(cube.bboxExact.max[0]).toBeCloseTo(42.5, 1);
    expect(cube.faceCount).toBe(6);
    expect(cube.holes).toHaveLength(0);

    // Indices are stable explorer order.
    expect(report.solids.map((s) => s.index)).toEqual([0, 1]);

    // The in-process export writes empty MANIFOLD_SOLID_BREP names — the
    // pairing must report null, never ''.
    expect(report.solids.map((s) => s.name)).toEqual([null, null]);
  });

  it('pairs MANIFOLD_SOLID_BREP names with solids, unescaping STEP quote escapes', async () => {
    // The exporter writes MANIFOLD_SOLID_BREP('',...) — patch real names in
    // (file order) so the positive pairing path runs. One name carries a
    // STEP '' quote escape, which must come back as a single apostrophe.
    const names = ['PLATE', "Servo''s Body"];
    let patchedCount = 0;
    const patched = readFileSync(stepPath, 'utf8').replace(
      /MANIFOLD_SOLID_BREP\('',/g,
      () => `MANIFOLD_SOLID_BREP('${names[patchedCount++]}',`,
    );
    expect(patchedCount).toBe(2);
    const namedPath = join(tmpDir, 'two-solids-named.step');
    writeFileSync(namedPath, patched);

    const report = await inspectStepFile(namedPath);
    expect(report.solidCount).toBe(2);
    expect(report.solids.map((s) => s.name).sort()).toEqual([
      'PLATE',
      "Servo's Body",
    ]);
  });

  it('rejects a missing file with a KernelError carrying a hint', async () => {
    await expect(inspectStepFile(join(tmpDir, 'nope.step'))).rejects.toMatchObject({
      name: 'KernelError',
      code: 'feature.invalid-args',
      hint: expect.stringContaining('inspect'),
    });
  });

  it('rejects unparseable STEP content with feature.kernel-failed', async () => {
    const badPath = join(tmpDir, 'garbage.step');
    writeFileSync(badPath, 'ISO-10303-21; this is not a valid STEP body');
    await expect(inspectStepFile(badPath)).rejects.toMatchObject({
      name: 'KernelError',
      code: 'feature.kernel-failed',
    });
  });
});
