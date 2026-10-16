// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { finalizedOcctObjectCount, installOcctFinalizers } from './occtFinalizers';
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
});
