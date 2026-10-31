// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cast, getOC } from 'replicad';
import { OcctBackend, initOcct } from './occtBackend';
import { nearCoincidentGap } from './nearCoincidentFaces';
import { cutWithHistory, fuseWithHistory } from './historyAwareBooleans';

// CADGenBench 202: a tube placed from 3-decimal coordinates against an imported
// r33 bore whose axis carries 9 decimals sat 6e-4 mm off that axis. The exact
// fuse was BRepCheck-valid but its export mesh cracked along the bore; the same
// tube on the exact axis fused watertight, as did a fuzzy fuse.
beforeAll(async () => {
  await initOcct();
});

const wrapped = (shape: OcctBackend): unknown => (shape.getReplicadShape() as { wrapped: unknown }).wrapped;

/** Boss r40 with an r33 bore along +Z, z 0..20. */
const bossWithBore = (): OcctBackend => OcctBackend.cylinder(20, 40).subtract(OcctBackend.cylinder(20, 33));
/** Tube r33..39.98 from z 10..30, its axis offset by (dx, dy). */
const tube = (dx: number, dy: number, rIn = 33): OcctBackend =>
  OcctBackend.cylinder(20, 39.98).subtract(OcctBackend.cylinder(20, rIn)).translate(dx, dy, 10);

describe('nearCoincidentGap', () => {
  it('finds a bore and a tube wall 6e-4 mm off one axis', () => {
    const gap = nearCoincidentGap(getOC(), wrapped(bossWithBore()), [wrapped(tube(4.9e-4, 3.5e-4))]);
    expect(gap).toBeCloseTo(Math.hypot(4.9e-4, 3.5e-4), 6);
  });

  it('ignores exactly coaxial equal-radius walls (OCCT handles exact coincidence)', () => {
    expect(nearCoincidentGap(getOC(), wrapped(bossWithBore()), [wrapped(tube(0, 0))])).toBeUndefined();
  });

  it('ignores a modelled 0.02 mm radial step', () => {
    expect(nearCoincidentGap(getOC(), wrapped(bossWithBore()), [wrapped(tube(0, 0, 33.02))])).toBeUndefined();
  });

  it('leaves a cutter that overshoots a plane by 1e-3 mm alone (deliberate overshoot)', () => {
    const body = OcctBackend.box(20, 20, 10);
    const tool = OcctBackend.box(10, 10, 10).translate(5, 5, 0.001);
    expect(nearCoincidentGap(getOC(), wrapped(body), [wrapped(tool)])).toBeUndefined();
  });

  it('ignores a near-coaxial bore that is far away', () => {
    expect(nearCoincidentGap(getOC(), wrapped(bossWithBore()), [wrapped(tube(4.9e-4, 3.5e-4).translate(0, 0, 100))])).toBeUndefined();
  });

  it('builds bounding boxes only for cylindrical faces', () => {
    const oc = getOC() as unknown as { BRepBndLib: { Add: (...args: unknown[]) => void } };
    const addBounds = vi.spyOn(oc.BRepBndLib, 'Add');
    const body = OcctBackend.box(20, 20, 10);
    const tool = OcctBackend.cylinder(10, 3).translate(40, 40, 0);
    try {
      expect(nearCoincidentGap(getOC(), wrapped(body), [wrapped(tool)])).toBeUndefined();
      // The tool has one cylindrical face; the box body has none. End-cap
      // planes and the six body planes do not need a bounding box here.
      expect(addBounds).toHaveBeenCalledTimes(1);
    } finally {
      addBounds.mockRestore();
      body.dispose();
      tool.dispose();
    }
  });
});

describe('booleans with near-coincident faces', () => {
  it('fuses a tube 6e-4 mm off the bore axis as one surface, into one valid solid', () => {
    const body = bossWithBore();
    const t = tube(4.9e-4, 3.5e-4);
    const result = fuseWithHistory(body, t);
    expect(result.strategy).toBe('fuzzy');
    expect(result.exactFailure).toMatch(/same cylinder/);
    const fused = new OcctBackend(cast(result.shape as never) as never);
    expect(fused.solidComponents()).toHaveLength(1);
    // Boss z 0..20 plus a tube ring (r 33..39.98) z 20..30.
    const expected = Math.PI * (40 ** 2 - 33 ** 2) * 20 + Math.PI * (39.98 ** 2 - 33 ** 2) * 10;
    expect(fused.volume()).toBeCloseTo(expected, 0);
  });

  it('keeps the exact boolean when nothing is near-coincident', () => {
    const body = OcctBackend.box(20, 20, 10);
    const hole = OcctBackend.cylinder(10, 3).translate(10, 10, 0);
    const result = cutWithHistory(body, hole);
    expect(result.strategy).toBe('exact');
    expect(result.exactFailure).toBeUndefined();
  });
});
