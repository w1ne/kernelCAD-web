// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// An assembly part's display mesh must show the part's CURRENT geometry.
//
// A script-time query (`await shape.boundingBox()`) lowers the shape and
// caches its solid per record id in `session.cachedShapes`. A transform
// appended afterwards (`shape.rotate(...)`) mutates that same record. The
// meshing pass seeds assembly construction records from `cachedShapes`, so a
// stale entry used to render the part as it was BEFORE the transform: a
// keycap flipped to show its legend rendered upside down, cavity up. The
// single-shape return path re-lowered and was correct, which hid the bug.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { runScript } from '../runtime/runScript';
import { buildModel } from '../../composition/buildModel';
import { meshFeaturesPerFeature } from './featureMeshing';
import type { FaceGeometry } from '../../shared/worker/workerTypes';

beforeAll(async () => {
  await initOcct();
}, 60_000);

// A plate with a blind pocket opening at +Z. Flipped 180 deg about X through
// its centre, the pocket must open toward -Z.
const BODY = `const plate = box(20, 10, 4).subtract(cylinder(10, 2).translate(5, 5, 2));`;

interface FaceSummary { faceId: number; tris: number; normal: [number, number, number]; centroidZ: number }

function summarizeFaces(faces: readonly FaceGeometry[]): FaceSummary[] {
  return faces
    .map((f) => {
      const n: [number, number, number] = [0, 0, 0];
      let z = 0;
      const count = f.normals.length / 3;
      for (let i = 0; i < count; i += 1) {
        n[0] += f.normals[3 * i];
        n[1] += f.normals[3 * i + 1];
        n[2] += f.normals[3 * i + 2];
        z += f.vertices[3 * i + 2];
      }
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      return {
        faceId: f.faceId,
        tris: f.indices.length / 3,
        normal: [n[0] / len, n[1] / len, n[2] / len] as [number, number, number],
        centroidZ: count > 0 ? z / count : 0,
      };
    })
    .sort((a, b) => a.faceId - b.faceId);
}

/** Triangle winding agrees with the vertex normals on every triangle, and the
 *  closed mesh encloses a positive volume (outward-facing). */
function windingIsOutward(faces: readonly FaceGeometry[]): { disagreeing: number; signedVolume: number } {
  let disagreeing = 0;
  let signedVolume = 0;
  for (const f of faces) {
    const v = f.vertices;
    const n = f.normals;
    for (let k = 0; k < f.indices.length; k += 3) {
      const a = 3 * f.indices[k], b = 3 * f.indices[k + 1], c = 3 * f.indices[k + 2];
      const e1 = [v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2]];
      const e2 = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]];
      const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const dot = cr[0] * (n[a] + n[b] + n[c]) + cr[1] * (n[a + 1] + n[b + 1] + n[c + 1]) + cr[2] * (n[a + 2] + n[b + 2] + n[c + 2]);
      if (dot < 0) disagreeing += 1;
      signedVolume += (v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1])
        - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c])
        + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c])) / 6;
    }
  }
  return { disagreeing, signedVolume };
}

/** Script-runtime meshing (the render CLI / MCP render_preview / Studio path):
 *  run the script, then mesh its own session. Returns the one part's faces. */
async function partFacesFromScript(code: string, partName = 'body'): Promise<FaceGeometry[]> {
  const { records, paramTable, session } = await runScript({ code, fileName: 'stale-seed.kcad.ts' });
  const meshing = await meshFeaturesPerFeature(records, paramTable, session);
  expect(meshing.failedFeatureIds).toEqual([]);
  const parts = meshing.features.filter((f) => f.assemblyPartName === partName);
  expect(parts).toHaveLength(1);
  return parts[0].faces;
}

/** Reference: the same flipped body returned as a single shape, lowered fresh. */
async function referenceFaces(flip: string): Promise<FaceGeometry[]> {
  const model = await buildModel({ code: `${BODY}\n${flip}\nreturn flipped;`, fileName: 'reference.kcad.ts' });
  const shape = model.rootShape;
  expect(shape).toBeDefined();
  expect(isSceneBackend(shape!)).toBe(false);
  const { meshShape } = await import('../../kernel/backends/occt/meshing');
  const raw = (shape as unknown as { getReplicadShape(): unknown }).getReplicadShape();
  return meshShape(raw)!.faces;
}

function expectSameMesh(actual: readonly FaceGeometry[], expected: readonly FaceGeometry[]): void {
  const a = summarizeFaces(actual);
  const e = summarizeFaces(expected);
  // Every BREP face contributes triangles…
  expect(a.filter((f) => f.tris === 0)).toEqual([]);
  expect(a.map((f) => f.faceId)).toEqual(e.map((f) => f.faceId));
  // …facing the same way and in the same place as the single-shape mesh.
  for (let i = 0; i < e.length; i += 1) {
    expect(a[i].tris, `face ${e[i].faceId} triangles`).toBe(e[i].tris);
    expect(a[i].normal[2], `face ${e[i].faceId} normal z`).toBeCloseTo(e[i].normal[2], 3);
    expect(a[i].centroidZ, `face ${e[i].faceId} centroid z`).toBeCloseTo(e[i].centroidZ, 3);
  }
  const winding = windingIsOutward(actual);
  expect(winding.disagreeing).toBe(0);
  expect(winding.signedVolume).toBeGreaterThan(0);
}

describe('assembly part mesh after a transform appended to an already-lowered shape', () => {
  const bboxFlip = `const bb = await plate.boundingBox();
const flipped = plate.rotate([1, 0, 0], 180, bb.center);`;
  const literalFlip = `const flipped = plate.rotate([1, 0, 0], 180, [10, 5, 2]);`;

  it('assembly part shows the flip when the pivot came from boundingBox()', async () => {
    const actual = await partFacesFromScript(`${BODY}\n${bboxFlip}
const a = assembly('t');
a.part('body', flipped);
return a.model();`);
    expectSameMesh(actual, await referenceFaces(bboxFlip));
  }, 60_000);

  it('array return (implicit scene) shows the flip when the pivot came from boundingBox()', async () => {
    const actual = await partFacesFromScript(
      `${BODY}\n${bboxFlip}\nreturn [flipped, box(2, 2, 2).translate(40, 0, 0)];`,
      'flipped',
    );
    expectSameMesh(actual, await referenceFaces(bboxFlip));
  }, 60_000);

  it('assembly part with a literal pivot (never lowered at script time) still matches', async () => {
    const actual = await partFacesFromScript(`${BODY}\n${literalFlip}
const a = assembly('t');
a.part('body', flipped);
return a.model();`);
    expectSameMesh(actual, await referenceFaces(literalFlip));
  }, 60_000);

  it('a query after the transform still reuses the lowered shape for the assembly part', async () => {
    const actual = await partFacesFromScript(`${BODY}\n${bboxFlip}
await flipped.boundingBox();
const a = assembly('t');
a.part('body', flipped);
return a.model();`);
    expectSameMesh(actual, await referenceFaces(bboxFlip));
  }, 60_000);
});
