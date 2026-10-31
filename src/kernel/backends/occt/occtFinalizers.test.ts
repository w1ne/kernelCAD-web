// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { finalizedOcctObjectCount, installOcctFinalizers, untracked } from './occtFinalizers';
import { Transform } from '../../../shared/runtime/se3';

setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;

/** Collect until the finalizer count moves past `before`, or give up. */
async function collectPast(before: number): Promise<number> {
  for (let i = 0; i < 50 && finalizedOcctObjectCount() <= before; i += 1) {
    gc();
    await new Promise((r) => setTimeout(r, 10));
  }
  return finalizedOcctObjectCount();
}

beforeAll(async () => {
  await initOcct();
});

describe('installOcctFinalizers', () => {
  it('is installed by initOcct and is idempotent', () => {
    const oc = getOC() as any;
    const ctor = oc.gp_Pnt_3;
    installOcctFinalizers(oc);
    expect(oc.gp_Pnt_3).toBe(ctor);
  });

  it('releases a constructed object that is dropped without delete()', async () => {
    const oc = getOC() as any;
    const before = finalizedOcctObjectCount();
    (() => {
      for (let i = 0; i < 200; i += 1) new oc.gp_Pnt_3(i, 0, 0);
    })();
    expect(await collectPast(before)).toBeGreaterThan(before);
  });

  it('releases a returned shape handle that is dropped without delete()', async () => {
    const oc = getOC() as any;
    const maker = new oc.BRepPrimAPI_MakeBox_2(1, 2, 3);
    (() => {
      for (let i = 0; i < 50; i += 1) maker.Shape();
    })();
    maker.delete();
    const before = finalizedOcctObjectCount();
    expect(await collectPast(before)).toBeGreaterThan(before);
  });

  it('never releases an object that was deleted explicitly', async () => {
    const oc = getOC() as any;
    // Settle anything pending from earlier tests first.
    await collectPast(finalizedOcctObjectCount());
    const before = finalizedOcctObjectCount();
    (() => {
      for (let i = 0; i < 200; i += 1) new oc.gp_Pnt_3(i, 0, 0).delete();
    })();
    for (let i = 0; i < 10; i += 1) {
      gc();
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(finalizedOcctObjectCount()).toBe(before);
  });
});

describe('untracked', () => {
  it('leaves objects made inside it to their caller', async () => {
    const oc = getOC() as any;
    await collectPast(finalizedOcctObjectCount());
    const before = finalizedOcctObjectCount();
    const kept = untracked(() => {
      for (let i = 0; i < 200; i += 1) new oc.gp_Pnt_3(i, 0, 0).delete();
      return new oc.gp_Pnt_3(1, 2, 3);
    });
    for (let i = 0; i < 10; i += 1) {
      gc();
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(finalizedOcctObjectCount()).toBe(before);
    expect(kept.X()).toBe(1);
    kept.delete();
  });

  it('tracks again once it returns', async () => {
    const oc = getOC() as any;
    untracked(() => undefined);
    const before = finalizedOcctObjectCount();
    (() => {
      for (let i = 0; i < 200; i += 1) new oc.gp_Pnt_3(i, 0, 0);
    })();
    expect(await collectPast(before)).toBeGreaterThan(before);
  });
});

describe('OcctBackend.located', () => {
  it('matches applyTransform and shares the source geometry', () => {
    const source = new OcctBackend(replicad.makeBaseBox(10, 20, 30) as never);
    const t = Transform.translation(5, -3, 2).compose(Transform.rotationAxisAngleDeg([0, 0, 1], 30));
    const placed = source.located(t);
    const copied = source.clone().applyTransform(t);
    try {
      const a = placed.boundingBox();
      const b = copied.boundingBox();
      for (let k = 0; k < 3; k += 1) {
        expect(a.min[k]).toBeCloseTo(b.min[k], 6);
        expect(a.max[k]).toBeCloseTo(b.max[k], 6);
      }
      expect(placed.volume()).toBeCloseTo(copied.volume(), 6);
      expect(placed.sharesGeometryWith(source)).toBe(true);
      expect(copied.sharesGeometryWith(source)).toBe(false);
      // The source is not consumed or moved.
      expect(source.boundingBox().min[0]).toBeCloseTo(-5, 6);
    } finally {
      placed.dispose();
      copied.dispose();
      source.dispose();
    }
  });
});

describe('replicad leak fixes', () => {
  it('still moves shapes correctly', () => {
    const moved = replicad.makeBaseBox(10, 20, 30).translate(100, 0, 0).rotate(90, [0, 0, 0], [0, 0, 1]);
    try {
      const [min, max] = moved.boundingBox.bounds;
      expect(min[1]).toBeCloseTo(95, 4);
      expect(max[1]).toBeCloseTo(105, 4);
      expect(min[2]).toBeCloseTo(0, 4);
      expect(max[2]).toBeCloseTo(30, 4);
    } finally {
      moved.delete();
    }
  });
  it('still meshes shapes', () => {
    const cylinder = replicad.makeCylinder(5, 20);
    try {
      const mesh = cylinder.mesh({ tolerance: 0.05, angularTolerance: 0.2 });
      expect(mesh.triangles.length).toBeGreaterThan(0);
      expect(mesh.vertices.length).toBeGreaterThan(0);
    } finally {
      cylinder.delete();
    }
  });
  it('still reads face triangulations with location, orientation and normals', () => {
    const part = replicad
      .makeBaseBox(10, 10, 10)
      .cut(replicad.makeCylinder(3, 30).translate(0, 0, -5))
      .translate(100, 0, 0)
      .rotate(30, [0, 0, 0], [0, 0, 1]);
    try {
      const mesh = part.mesh({ tolerance: 0.01, angularTolerance: 0.1 });
      const v = mesh.vertices;
      const n = mesh.normals;
      let checked = 0;
      for (let t = 0; t < mesh.triangles.length; t += 3) {
        const [a, b, c] = [mesh.triangles[t] * 3, mesh.triangles[t + 1] * 3, mesh.triangles[t + 2] * 3];
        const u = [v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2]];
        const w = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]];
        const cross = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        if (Math.hypot(...cross) < 1e-9) continue;
        const dot = cross[0] * (n[a] + n[b] + n[c]) + cross[1] * (n[a + 1] + n[b + 1] + n[c + 1]) + cross[2] * (n[a + 2] + n[b + 2] + n[c + 2]);
        expect(dot).toBeGreaterThan(0);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(50);
      const [min, max] = part.boundingBox.bounds;
      for (let i = 0; i < v.length; i += 3) {
        for (let k = 0; k < 3; k += 1) {
          expect(v[i + k]).toBeGreaterThan(min[k] - 1e-3);
          expect(v[i + k]).toBeLessThan(max[k] + 1e-3);
        }
      }
    } finally {
      part.delete();
    }
  });
});
