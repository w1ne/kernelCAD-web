// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkStepValidity, deflectionForDiagonal, meshManifoldErrors } from './validity';

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

describe('checkStepValidity', () => {
  let dir: string;
  const writeStep = async (name: string, shape: replicad.AnyShape): Promise<string> => {
    const blob = replicad.exportSTEP([{ shape: shape as replicad.Shape3D, name }]);
    const path = join(dir, `${name}.step`);
    writeFileSync(path, new Uint8Array(await blob.arrayBuffer()));
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
