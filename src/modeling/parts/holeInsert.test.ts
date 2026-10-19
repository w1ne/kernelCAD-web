// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import type { CylindricalHole } from '../../kernel/backends/occt/holeDetection';
import type { KernelCadApi } from '../api';
import { createModelingApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import {
  clearanceFitForHoleDiameter,
  headFrameFor,
  pilotForThread,
  planInserts,
  threadForHoleDiameter,
  type InsertRequest,
} from './holeInsert';

function expectVec(actual: readonly number[], expected: readonly number[], digits = 6): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, digits));
}

function api(): { session: CaptureSession; kcad: KernelCadApi } {
  const session = new CaptureSession();
  return { session, kcad: createModelingApi({ session }) };
}

function throughHole(overrides: Partial<CylindricalHole> = {}): CylindricalHole {
  return {
    axisOrigin: [0, 0, 4],
    axisDirection: [0, 0, -1],
    diameterMm: 5.5,
    depthMm: 8,
    kind: 'through',
    faceCount: 1,
    ...overrides,
  };
}

describe('lib.insert sizing', () => {
  it('picks the stocked thread whose clearance bore matches the hole', () => {
    expect(threadForHoleDiameter(5.5)).toBe('M5');
    expect(threadForHoleDiameter(5.6)).toBe('M5');
    expect(threadForHoleDiameter(3.4)).toBe('M3');
    expect(threadForHoleDiameter(2.4)).toBe('M2');
    expect(threadForHoleDiameter(6.5)).toBe('M6');
    expect(threadForHoleDiameter(9)).toBe('M8');
    expect(threadForHoleDiameter(13.5)).toBe('M12');
    expect(threadForHoleDiameter(17.5)).toBe('M16');
    expect(threadForHoleDiameter(22)).toBe('M20');
  });

  it('reports the ISO 273 fit class of the bore', () => {
    expect(clearanceFitForHoleDiameter(5.3)).toEqual({ thread: 'M5', fit: 'close' });
    expect(clearanceFitForHoleDiameter(5.5)).toEqual({ thread: 'M5', fit: 'normal' });
    expect(clearanceFitForHoleDiameter(5.8)).toEqual({ thread: 'M5', fit: 'loose' });
    expect(clearanceFitForHoleDiameter(6.5)).toEqual({ thread: 'M6', fit: 'normal' });
    expect(clearanceFitForHoleDiameter(9)).toEqual({ thread: 'M8', fit: 'normal' });
    expect(clearanceFitForHoleDiameter(10)).toEqual({ thread: 'M8', fit: 'loose' });
    expect(clearanceFitForHoleDiameter(13)).toEqual({ thread: 'M12', fit: 'close' });
    expect(clearanceFitForHoleDiameter(14.5)).toEqual({ thread: 'M12', fit: 'loose' });
  });

  it('refuses a bore that matches no stocked clearance diameter', () => {
    expect(threadForHoleDiameter(5.0)).toBeUndefined(); // M6 tap drill, not clearance
    expect(threadForHoleDiameter(7.5)).toBeUndefined();
    expect(threadForHoleDiameter(15.5)).toBeUndefined();
  });

  it('reports a bore that sits exactly on a larger thread tap drill', () => {
    expect(pilotForThread(3.3, 'M3')).toBe('M4'); // M4 tap drill vs M3 clearance
    expect(pilotForThread(6.8, 'M6')).toBe('M8'); // outside the stocked range
    expect(pilotForThread(2.5, 'M2')).toBe('M3');
    expect(pilotForThread(5, 'M5')).toBe('M6');
    expect(pilotForThread(3.4, 'M3')).toBeUndefined(); // M3 clearance, not a pilot
    expect(pilotForThread(5.5, 'M5')).toBeUndefined();
  });

  it('takes the head end from the hint, else the larger-Z end', () => {
    const bore = throughHole();
    const first = headFrameFor(bore, {});
    expectVec(first.center, [0, 0, 4]);
    expectVec(first.direction, [0, 0, -1]);
    const flipped = headFrameFor(bore, { headAt: [0, 0, -20] });
    expectVec(flipped.center, [0, 0, -4]);
    expectVec(flipped.direction, [0, 0, 1]);
    const blind = throughHole({ kind: 'blind', axisOrigin: [0, 0, 4] });
    const mouth = headFrameFor(blind, { headAt: [0, 0, 99] });
    expectVec(mouth.center, [0, 0, 4]);
    expectVec(mouth.direction, [0, 0, -1]);
  });

  it('refuses a nut on a blind hole and names the mode to use', () => {
    const request: InsertRequest = { diameterMm: 5.5, family: 'socket-head-cap-screw', mode: 'bolt' };
    expect(() => planInserts([throughHole({ kind: 'blind', depthMm: 6 })], request)).toThrow(
      /blind/,
    );
  });
});

describe('lib.insert on modeled parts', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('covers every similar through hole and sizes the stack from the bore', async () => {
    const { kcad } = api();
    const plate = kcad.box(60, 40, 8, true).holes('top', {
      positions: [{ u: -20, v: 0 }, { u: 0, v: 0 }, { u: 20, v: 0 }],
      diameter: 5.5,
      depth: 'through',
    });
    const result = await kcad.lib.insert(plate, {
      diameterMm: 5.5,
      family: 'socket-head-cap-screw',
      mode: 'bolt',
    });
    expect(result.shape.id).toBe(plate.id); // socket head: no seat cut
    expect(result.holes).toHaveLength(3);
    for (const hole of result.holes) {
      expect(hole.thread).toBe('M5');
      expect(hole.lengthMm).toBe(14); // grip 8 + washer 1 + nut 4, next stocked
      expect(hole.headWasher).toBeDefined();
      expect(hole.tailWasher).toBeDefined();
      expect(hole.nut).toBeDefined();
      expectVec(hole.direction, [0, 0, -1]);
      expect(hole.centerMm[2]).toBeCloseTo(4, 6);
    }
    // Heads sit above the plate; nuts below it.
    const headBounds = await (await result.holes[0]!.screw.lower()).boundingBox();
    const nutBounds = await (await result.holes[0]!.nut!.lower()).boundingBox();
    expect(headBounds.max[2]).toBeGreaterThan(4);
    expect(nutBounds.max[2]).toBeLessThan(-3);
  }, 120000);

  it('sizes a loose M6 bore and a normal M8 bore from ISO 273', async () => {
    const { kcad } = api();
    const plate = kcad
      .box(60, 40, 8, true)
      .hole('top', { u: -15, v: 0, diameter: 7.0, depth: 'through' })
      .hole('top', { u: 15, v: 0, diameter: 9.0, depth: 'through' });
    const m6 = await kcad.lib.insert(plate, {
      diameterMm: 7.0,
      family: 'socket-head-cap-screw',
      mode: 'bolt',
    });
    expect(m6.holes[0]!.thread).toBe('M6');
    expect(m6.holes[0]!.fit).toBe('loose');
    expect(m6.holes[0]!.lengthMm).toBe(16); // 8 grip + 1.6 tail washer + 5 nut, next stocked

    const m8 = await kcad.lib.insert(plate, {
      diameterMm: 9.0,
      family: 'socket-head-cap-screw',
      mode: 'bolt',
    });
    expect(m8.holes[0]!.thread).toBe('M8');
    expect(m8.holes[0]!.fit).toBe('normal');
    expect(m8.holes[0]!.lengthMm).toBe(18); // 8 grip + 1.6 tail washer + 6.5 nut, next stocked
  }, 120000);

  it('cuts the countersink a flat head needs and skips the head washer', async () => {    const { kcad } = api();
    const plate = kcad.box(60, 40, 8, true).holes('top', {
      positions: [{ u: -20, v: 0 }, { u: 20, v: 0 }],
      diameter: 5.5,
      depth: 'through',
    });
    const before = (await plate.lower()).volume();
    const result = await kcad.lib.insert(plate, {
      diameterMm: 5.5,
      family: 'flat-head-countersunk',
      mode: 'bolt',
    });
    const after = (await result.shape.lower()).volume();
    const removed = before - after;
    // Two 90° countersinks to Ø11.2 over the Ø5.5 bore.
    expect(removed).toBeGreaterThan(120);
    expect(removed).toBeLessThan(320);
    for (const hole of result.holes) {
      expect(hole.headWasher).toBeUndefined();
      expect(hole.nut).toBeDefined();
      expect(hole.screw).toBeDefined();
    }
  }, 120000);

  it('follows a pattern: three patterned holes get three stacks', async () => {
    const { kcad } = api();
    const patterned = kcad
      .box(20, 10, 6, true)
      .hole('top', { u: 0, v: 0, diameter: 3.4, depth: 'through' })
      .patternLinear({ count: 3, direction: [1, 0, 0], spacing: 15 });
    const result = await kcad.lib.insert(patterned, {
      near: [-15, 0, 3],
      family: 'button-head-cap-screw',
      mode: 'screw',
    });
    expect(result.holes).toHaveLength(3);
    expect(result.holes.map((hole) => hole.thread)).toEqual(['M3', 'M3', 'M3']);
    // patternLinear repeats the source shape in +X: source at 0, copies at +15, +30.
    expectVec(result.holes.map((hole) => hole.centerMm[0]), [0, 15, 30]);
  }, 120000);

  it('places the screw from the mouth of a blind hole', async () => {
    const { kcad } = api();
    const plate = kcad.box(40, 40, 10, true).hole('top', {
      u: 0,
      v: 0,
      diameter: 5.5,
      depth: 6,
    });
    const result = await kcad.lib.insert(plate, {
      diameterMm: 5.5,
      family: 'socket-head-cap-screw',
      mode: 'screw',
    });
    expect(result.holes).toHaveLength(1);
    const hole = result.holes[0]!;
    expectVec(hole.centerMm, [0, 0, 5]);
    expectVec(hole.direction, [0, 0, -1]);
    const bounds = await (await hole.screw.lower()).boundingBox();
    // M5 × 6: shank from z = -1 into the material, head above the mouth.
    expect(bounds.min[2]).toBeCloseTo(-1, 6);
    expect(bounds.max[2]).toBeCloseTo(10, 6);
  }, 120000);

  it('takes the head side from headAt on a through hole', async () => {
    const { kcad } = api();
    const plate = kcad.box(40, 40, 8, true).hole('top', { u: 0, v: 0, diameter: 5.5, depth: 'through' });
    const result = await kcad.lib.insert(plate, {
      diameterMm: 5.5,
      family: 'socket-head-cap-screw',
      mode: 'bolt',
      headAt: [0, 0, -99],
    });
    const hole = result.holes[0]!;
    expectVec(hole.direction, [0, 0, 1]);
    const nutBounds = await (await hole.nut!.lower()).boundingBox();
    expect(nutBounds.min[2]).toBeGreaterThan(3); // nut now above the plate
  }, 120000);

  it('leaves an existing counterbore alone instead of cutting a seat into it', async () => {
    const { kcad } = api();
    const plate = kcad.box(40, 40, 8, true).hole('top', {
      u: 0,
      v: 0,
      diameter: 5.5,
      depth: 'through',
      counterbore: { diameter: 11.2, depth: 3.1 },
    });
    const before = (await plate.lower()).volume();
    const result = await kcad.lib.insert(plate, {
      diameterMm: 5.5,
      family: 'flat-head-countersunk',
      mode: 'bolt',
    });
    const hole = result.holes[0]!;
    expect(hole.existingSeatMm).toBeCloseTo(11.2, 6);
    expect(hole.screw).toBeDefined();
    // No new boolean: the returned shape is the input and the volume matches.
    expect(result.shape.id).toBe(plate.id);
    expect((await result.shape.lower()).volume()).toBeCloseTo(before, 6);
  }, 120000);

  it('flags a tap-drill bore without refusing it', async () => {
    const { kcad } = api();
    const plate = kcad.box(40, 40, 8, true).hole('top', { u: 0, v: 0, diameter: 3.3, depth: 'through' });
    const result = await kcad.lib.insert(plate, {
      diameterMm: 3.3,
      family: 'socket-head-cap-screw',
      mode: 'screw',
    });
    const hole = result.holes[0]!;
    expect(hole.thread).toBe('M3'); // sized as clearance…
    expect(hole.pilotFor).toBe('M4'); // …but reported as a possible M4 pilot
  }, 120000);

  it('refuses a diameter the shape does not have', async () => {
    const { kcad } = api();
    const plate = kcad.box(40, 40, 8, true).hole('top', { u: 0, v: 0, diameter: 5.5, depth: 'through' });
    await expect(
      kcad.lib.insert(plate, { diameterMm: 3.4, family: 'socket-head-cap-screw' }),
    ).rejects.toThrow(/usable bores found: Ø5.5/);
  }, 120000);
});
