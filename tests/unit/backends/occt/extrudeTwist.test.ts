import { describe, expect, it, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { toParam } from '../../../../src/shared/runtime/editableHelpers';
import { KernelError } from '../../../../src/shared/intent/kernelError';
import type { SketchCommand } from '../../../../src/modeling/capture/sketch';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';

const mm = (n: number) => toParam(n, 'mm');
const deg = (n: number): Param => ({ expression: String(n), unit: 'deg', evaluated: n });

/** Largest bbox growth of `b` relative to `a`, across all six faces. */
function bboxGrowth(
  a: { min: readonly number[]; max: readonly number[] },
  b: { min: readonly number[]; max: readonly number[] },
): number {
  let grow = 0;
  for (let i = 0; i < 3; i++) {
    grow = Math.max(grow, b.max[i] - a.max[i], a.min[i] - b.min[i]);
  }
  return grow;
}

// Right triangle offset from the extrusion axis: twisting changes the bbox.
const tri: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(0) },
  { kind: 'lineTo', x: mm(30), y: mm(0) },
  { kind: 'lineTo', x: mm(30), y: mm(6) },
  { kind: 'close' },
];

// Spline outline: forces the NURBS branch of extrudeFromSketch.
const splineProfile: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(-5) },
  {
    kind: 'spline',
    points: [
      { x: mm(0), y: mm(-5) },
      { x: mm(30), y: mm(-5) },
      { x: mm(30), y: mm(5) },
      { x: mm(0), y: mm(5) },
    ],
  },
  { kind: 'close' },
];

describe('extrude twistAngle', () => {
  beforeAll(async () => { await initOcct(); });

  it('twists the extrusion (bbox grows vs straight extrude)', () => {
    const straight = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80);
    const twisted = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80, { twistAngle: 60 });
    expect(straight.volume()).toBeGreaterThan(0);
    expect(twisted.volume()).toBeGreaterThan(0);
    expect(Math.abs(twisted.boundingBox().max[1] - straight.boundingBox().max[1])).toBeGreaterThan(1);
  });

  it('twists a NURBS (spline-outline) extrusion and preserves volume', () => {
    const straight = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(splineProfile), 60);
    const twisted = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(splineProfile), 60, { twistAngle: 45 });
    expect(straight.volume()).toBeGreaterThan(0);
    expect(twisted.boundingBox().max[1]).toBeGreaterThan(straight.boundingBox().max[1] + 1);
    expect(Math.abs(twisted.volume() - straight.volume()) / straight.volume()).toBeLessThan(1e-3);
  });

  it('twistAngle 0 is identical to the legacy path (volume and bbox match)', () => {
    const straight = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80);
    const zero = OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80, { twistAngle: 0 });
    expect(zero.volume()).toBeCloseTo(straight.volume(), 6);
    expect(zero.boundingBox()).toEqual(straight.boundingBox());
  });

  it('throws feature.invalid-args on a non-finite twistAngle instead of silently going straight', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      let caught: unknown;
      try {
        OcctBackend.extrudeFromSketch(OcctBackend.fromSketchCommands(tri), 80, { twistAngle: bad });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(KernelError);
      const err = caught as KernelError;
      expect(err.code).toBe('feature.invalid-args');
      expect(err.message).toMatch(/twistAngle must be a finite number/);
      expect(err.hint).toMatch(/finite/i);
      expect(err.hint).toMatch(/param/i);
    }
  });

  it('throws feature.invalid-args for a face-bound sketch with a non-zero twistAngle', () => {
    const box = OcctBackend.box(20, 20, 5);
    const topFace = box.getReplicadShape().faces.find((f) => f.normalAt().z > 0.9)!;
    const wrapped = OcctBackend.fromFaceBoundSketch(
      replicad.drawRectangle(2, 2).translate(10, 10).sketchOnFace(topFace, 'original'),
    );
    let caught: unknown;
    try {
      OcctBackend.extrudeFromSketch(wrapped, 0.5, { twistAngle: 30 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    const err = caught as KernelError;
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/twistAngle is not supported for face-bound sketches/);
    expect(err.hint).toMatch(/path\(\)\.\.\.close\(\)/);
  });
});

// One entry per primitive builder, so the shared twist contract is exercised
// for every profile kind. `legacy` calls the builder with no opts at all;
// `withTwist` supplies the angle (0 must match `legacy` exactly).
const LEGACY_BUILDERS: Record<string, () => OcctBackend> = {
  rect: () => OcctBackend.extrudeRect(20, 10, 5),
  circle: () => OcctBackend.extrudeCircle(5, 10),
  polygon: () => OcctBackend.extrudePolygon([[0, 0], [30, 0], [30, 6]], 80),
  'rounded-rect': () => OcctBackend.extrudeRoundedRect(20, 10, 2, 5),
};

const TWIST_BUILDERS: Record<string, (angle: number) => OcctBackend> = {
  rect: (angle) => OcctBackend.extrudeRect(20, 10, 5, { twistAngle: angle }),
  circle: (angle) => OcctBackend.extrudeCircle(5, 10, { twistAngle: angle }),
  polygon: (angle) => OcctBackend.extrudePolygon([[0, 0], [30, 0], [30, 6]], 80, { twistAngle: angle }),
  'rounded-rect': (angle) => OcctBackend.extrudeRoundedRect(20, 10, 2, 5, { twistAngle: angle }),
};

describe('primitive extrudes with twistAngle (backend)', () => {
  beforeAll(async () => { await initOcct(); });

  it.each(Object.keys(LEGACY_BUILDERS))('%s: twistAngle 0 is identical to the legacy call', (kind) => {
    const straight = LEGACY_BUILDERS[kind]();
    const zero = TWIST_BUILDERS[kind](0);
    expect(zero.volume()).toBeCloseTo(straight.volume(), 6);
    expect(zero.boundingBox()).toEqual(straight.boundingBox());
  });

  it.each(Object.keys(LEGACY_BUILDERS))('%s: twistAngle 60 changes the bbox and preserves volume', (kind) => {
    const straight = LEGACY_BUILDERS[kind]();
    const twisted = TWIST_BUILDERS[kind](60);
    expect(twisted.volume()).toBeGreaterThan(0);
    expect(Math.abs(twisted.volume() - straight.volume()) / straight.volume()).toBeLessThan(1e-3);
    expect(bboxGrowth(straight.boundingBox(), twisted.boundingBox())).toBeGreaterThan(1);
  });

  it.each(Object.keys(LEGACY_BUILDERS))('%s: non-finite twistAngle throws typed feature.invalid-args', (kind) => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      let caught: unknown;
      try {
        TWIST_BUILDERS[kind](bad);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(KernelError);
      const err = caught as KernelError;
      expect(err.code).toBe('feature.invalid-args');
      expect(err.message).toMatch(/twistAngle must be a finite number/);
      expect(err.hint).toMatch(/finite/i);
    }
  });
});

/** Lowerer records for every primitive profile kind, with a resolved
 *  `twistAngle` param as the dispatcher pre-resolve would produce. */
const LOWERER_RECORDS: Record<string, (twist: number) => FeatureRecord> = {
  rect: (twist) => ({
    id: 'extrude_rect', kind: 'extrude',
    params: {
      profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
      w: mm(20), h: mm(10), height: mm(5),
      twistAngle: deg(twist),
    },
    inputs: {}, transforms: [], suppressed: false,
  }),
  circle: (twist) => ({
    id: 'extrude_circle', kind: 'extrude',
    params: {
      profileKind: { expression: "'circle'", unit: 'unitless', evaluated: 0 },
      r: mm(5), height: mm(10),
      twistAngle: deg(twist),
    },
    inputs: {}, transforms: [], suppressed: false,
  }),
  polygon: (twist) => ({
    id: 'extrude_polygon', kind: 'extrude',
    params: {
      profileKind: { expression: "'polygon'", unit: 'unitless', evaluated: 0 },
      depth: mm(80),
      twistAngle: deg(twist),
    },
    inputs: {},
    metadata: { points: [[0, 0], [30, 0], [30, 6]] },
    transforms: [], suppressed: false,
  }),
  'rounded-rect': (twist) => ({
    id: 'extrude_rounded', kind: 'extrude',
    params: {
      profileKind: { expression: "'rounded-rect'", unit: 'unitless', evaluated: 0 },
      width: mm(20), height: mm(10), radius: mm(2), depth: mm(5),
      twistAngle: deg(twist),
    },
    inputs: {}, transforms: [], suppressed: false,
  }),
};

describe('primitive extrude twistAngle (lowerer)', () => {
  beforeAll(async () => { await initOcct(); });

  it.each(Object.keys(LOWERER_RECORDS))('%s: lowerer applies twist (bbox grows vs 0)', async (kind) => {
    const lowerer = new OcctLowerer();
    const straight = await lowerer.lower(LOWERER_RECORDS[kind](0), { byKey: {} });
    const twisted = await lowerer.lower(LOWERER_RECORDS[kind](60), { byKey: {} });
    expect(twisted.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(bboxGrowth(straight.shape.boundingBox(), twisted.shape.boundingBox())).toBeGreaterThan(1);
  });

  it.each(Object.keys(LOWERER_RECORDS))('%s: non-finite twistAngle emits feature.invalid-args, not kernel-failed', async (kind) => {
    const res = await new OcctLowerer().lower(LOWERER_RECORDS[kind](NaN), { byKey: {} });
    const errors = res.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('feature.invalid-args');
    expect(errors[0].hint).toMatch(/finite/i);
  });
});
