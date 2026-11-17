// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { writeStepAssembly } from '../../../src/kernel/backends/occt/stepAssemblyExport';
import { checkStepValidity, deflectionForDiagonal, gateMeshDeflections, meshManifoldErrors } from './validity';

// Closed tetrahedron, outward-consistent winding.
const TET = {
  vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  triangles: [0, 2, 1, 0, 1, 3, 1, 2, 3, 0, 3, 2],
};

describe('meshManifoldErrors', () => {
  it('accepts a closed, consistently wound mesh', () => {
    expect(meshManifoldErrors(TET)).toEqual([]);
  });

  it('rejects an open mesh', () => {
    const open = { vertices: TET.vertices, triangles: TET.triangles.slice(0, 9) };
    expect(meshManifoldErrors(open)[0]).toMatch(/mesh not closed: 3 edge/);
  });

  it('rejects a closed mesh with one triangle flipped', () => {
    const flipped = { vertices: TET.vertices, triangles: [...TET.triangles.slice(0, 9), 0, 2, 3] };
    const errors = meshManifoldErrors(flipped);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/orientation inconsistent: 3 edge/);
  });
});

describe('deflectionForDiagonal', () => {
  it('follows the grader policy: 0.1 % of the diagonal, clamped to [0.005, 0.5] mm', () => {
    expect(deflectionForDiagonal(100)).toBeCloseTo(0.1);
    expect(deflectionForDiagonal(1)).toBe(0.005);
    expect(deflectionForDiagonal(5000)).toBe(0.5);
  });
});

describe('gateMeshDeflections', () => {
  it('mirrors the grader ladder: requested, /4, /16, /32', () => {
    expect(gateMeshDeflections(100)).toEqual([0.1, 0.025, 0.00625, 0.003125]);
    const clamped = gateMeshDeflections(10_000);
    expect(clamped[0]).toBe(0.5);
    expect(clamped[3]).toBeCloseTo(0.5 / 32);
  });
});

// The fixtures are written with writeStepAssembly, not replicad.exportSTEP:
// replicad's writer leaves its STEP work session to two GC finalizers, and a
// collection then double-frees it. On CI that poisoned the heap and the next
// import failed with `memory access out of bounds` (#1488). Each fixture
// forces a collection before the check so a writer that leaves objects to
// the finalizer fails here every run, not only when V8 happens to collect.
setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;
const collect = async (): Promise<void> => {
  for (let i = 0; i < 2; i++) {
    gc();
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe('checkStepValidity', () => {
  let dir: string;
  const writeStep = async (name: string, shape: replicad.AnyShape): Promise<string> => {
    const path = join(dir, `${name}.step`);
    writeFileSync(path, writeStepAssembly([{ shape: shape.wrapped, name }]));
    await collect();
    return path;
  };

  beforeAll(async () => {
    await initOcct();
    dir = mkdtempSync(join(tmpdir(), 'cgb-validity-'));
  });

  it('passes a closed solid', async () => {
    const box = replicad.makeBox([0, 0, 0], [20, 10, 5]).cut(replicad.makeCylinder(2, 10, [10, 5, -1]));
    const v = await checkStepValidity(await writeStep('box', box));
    expect(v.errors).toEqual([]);
    expect(v).toMatchObject({ valid: true, solidCount: 1, shellCount: 1, brepValid: true, watertight: true, meshManifold: true });
    expect(v.triangleCount).toBeGreaterThan(0);
    expect(v.extentsMm?.[0]).toBeCloseTo(20, 1);
    expect(v.extentsMm?.[1]).toBeCloseTo(10, 1);
    expect(v.extentsMm?.[2]).toBeCloseTo(5, 1);
    expect(v.volumeMm3).toBeGreaterThan(0);
  });

  it('fails an open shell (a box with one face missing)', async () => {
    const faces = replicad.makeBox([0, 0, 0], [20, 10, 5]).faces.slice(0, 5);
    const shell = replicad.weldShellsAndFaces(faces);
    const v = await checkStepValidity(await writeStep('open', shell));
    expect(v.valid).toBe(false);
    expect(v.watertight).toBe(false);
    expect(v.errors.join('\n')).toMatch(/no solid body/);
    expect(v.errors.join('\n')).toMatch(/BREP not watertight: 1 of 1 shell/);
  });

  it('fails a file that is not STEP, without throwing', async () => {
    const path = join(dir, 'junk.step');
    writeFileSync(path, 'not a step file');
    const v = await checkStepValidity(path);
    expect(v.valid).toBe(false);
    expect(v.errors.length).toBeGreaterThan(0);
  });
});
