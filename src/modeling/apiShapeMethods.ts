// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import type { Shape } from './capture/proxy';
import { makePath } from './capture/sketch';
import { validateFaceLabels } from './capture/faceLabels';
import { helix } from './helix';
import {
  assertPlanetaryToothCompatibility,
  internalSpurGearBoreOutline,
  spurGearOutline,
  spurGearRadii,
  SpurGearProfileError,
  type SpurGearOutline,
} from './spurGear';
import { isValidEditableNumber, type Param } from '../shared/intent/types';
import { invalidArgs } from '../shared/intent/invalidArgs';
import type { FaceLabelsMap } from '../shared/intent/featureRecord';
import { KernelError } from '../shared/intent/kernelError';
import { toParam } from '../shared/runtime/editableHelpers';
import { mm, ul, assertEditableNumber, assertPositiveFinite } from './apiSupport';
import type {
  KernelCadApi,
  SpringOptions,
  SpurGearOptions,
  InternalSpurGearOptions,
  PlanetaryToothCompatibilityOpts,
  ExtrudeOpts,
} from './api';

export function makePrimitiveMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'box' | 'cylinder' | 'sphere' | 'torus'> {
  return {
    box(x, y, z, centered = false, opts) {
      assertEditableNumber('box', 'x', x);
      assertEditableNumber('box', 'y', y);
      assertEditableNumber('box', 'z', z);
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'box');
      return session.createShape({
        kind: 'box',
        params: { x: mm(x), y: mm(y), z: mm(z), centered: ul(centered ? 1 : 0) },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    cylinder(h, r, _segments, opts) {
      assertEditableNumber('cylinder', 'h', h);
      assertEditableNumber('cylinder', 'r', r);
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'cylinder');
      return session.createShape({
        kind: 'cylinder',
        params: { h: mm(h), r: mm(r) },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    sphere(r, opts) {
      assertEditableNumber('sphere', 'r', r);
      if (opts && 'faceLabels' in opts && opts.faceLabels !== undefined) {
        throw new KernelError(
          'feature.face-ref.not-applicable',
          'sphere does not support faceLabels (no canonical face names; query targets undefined). Use a different primitive if labels are needed.',
          'sphere',
          'Use a different primitive (box / cylinder / extrude / sketch-derived shape) when faceLabels are needed.',
        );
      }
      return session.createShape({
        kind: 'sphere',
        params: { r: mm(r) },
        inputs: {},
      });
    },
    torus(majorR, minorR, segments = 48) {
      const badR = !Number.isFinite(majorR) || majorR <= 0
        ? (['majorR', majorR] as const)
        : !Number.isFinite(minorR) || minorR <= 0
          ? (['minorR', minorR] as const)
          : undefined;
      if (badR !== undefined) {
        invalidArgs({
          api: 'torus(majorR, minorR)',
          path: badR[0],
          got: badR[1],
          showType: typeof badR[1] !== 'number',
          requires: badR[0] === 'majorR'
            ? 'a finite number > 0 — the ring radius from the Z axis to the centre of the tube'
            : 'a finite number > 0 — the tube radius, not its diameter',
          unit: 'mm',
          example: 'torus(20, 5)',
          featureId: 'torus',
        });
      }
      if (minorR >= majorR) {
        invalidArgs({
          api: 'torus(majorR, minorR)',
          path: 'minorR',
          got: minorR,
          requires:
            `minorR < majorR — majorR is ${majorR} mm, so the tube radius must stay under that; at minorR ≥ majorR the profile circle crosses the rotation axis and the torus self-intersects (use 0.2–0.4 × majorR for a chunky ring)`,
          unit: 'mm',
          example: 'torus(20, 5)',
          featureId: 'torus',
        });
      }
      // Build the profile in the XY (sketch) plane as a polyline circle
      // centered at (majorR, 0). The session's revolve op rotates about
      // the Y axis of the sketch plane by default, which maps to world Z
      // after the standard XY sketch frame — producing a torus whose axis
      // is world Z.
      const profile = makePath(session).circle(majorR, 0, minorR, segments);
      return profile.revolve();
    },
  };
}

/** Validate the four positive dimensions of `spring()` in call order. */
function resolveSpringSizing(opts: SpringOptions): {
  length: number;
  coilRadius: number;
  wireRadius: number;
  turns: number;
} {
  const length = assertPositiveFinite('spring', 'length', opts?.length);
  const coilRadius = assertPositiveFinite('spring', 'coilRadius', opts?.coilRadius);
  const wireRadius = assertPositiveFinite('spring', 'wireRadius', opts?.wireRadius);
  const turns = assertPositiveFinite('spring', 'turns', opts?.turns);
  if (coilRadius <= wireRadius) {
    invalidArgs({
      api: 'spring({ coilRadius, wireRadius })',
      path: 'opts.coilRadius',
      got: coilRadius,
      requires:
        `coilRadius > wireRadius — wireRadius is ${wireRadius} mm, so the coil centreline radius must exceed that or the turns swallow the bore; wireRadius is usually 15–30 % of coilRadius`,
      unit: 'mm',
      example: 'spring({ length: 30, coilRadius: 5, wireRadius: 1, turns: 8 })',
      featureId: 'spring',
    });
  }
  return { length, coilRadius, wireRadius, turns };
}

/** Validate the `axis` option and apply its `'Z'` default. */
function resolveSpringAxis(opts: SpringOptions): 'X' | 'Y' | 'Z' {
  const axis = opts.axis ?? 'Z';
  if (axis !== 'X' && axis !== 'Y' && axis !== 'Z') {
    invalidArgs({
      api: 'spring({ axis })',
      path: 'opts.axis',
      got: axis,
      showType: typeof axis !== 'string',
      requires: "one of 'X', 'Y' or 'Z' — the coil axis, as an uppercase letter, not a vector",
      example: "spring({ length: 30, coilRadius: 5, wireRadius: 1, turns: 8, axis: 'Z' })",
      featureId: 'spring',
    });
  }
  return axis;
}

/** Validate the discretisation options and apply their defaults. */
function resolveSpringSampling(opts: SpringOptions): {
  pointsPerTurn: number;
  cylinderSegments: number;
} {
  const pointsPerTurn = opts.pointsPerTurn ?? 24;
  if (!Number.isInteger(pointsPerTurn) || pointsPerTurn < 6) {
    invalidArgs({
      api: 'spring({ pointsPerTurn })',
      path: 'opts.pointsPerTurn',
      got: pointsPerTurn,
      showType: typeof pointsPerTurn !== 'number',
      requires:
        'an integer ≥ 6 — samples along EACH turn of the helix (24 is the default); higher values smooth the coil at higher feature cost',
      unit: 'count',
      example: 'spring({ length: 30, coilRadius: 5, wireRadius: 1, turns: 8, pointsPerTurn: 24 })',
      featureId: 'spring',
    });
  }
  const cylinderSegments = opts.segments ?? 16;
  if (!Number.isInteger(cylinderSegments) || cylinderSegments < 6) {
    invalidArgs({
      api: 'spring({ segments })',
      path: 'opts.segments',
      got: cylinderSegments,
      showType: typeof cylinderSegments !== 'number',
      requires: 'an integer ≥ 6 — facets around the circular wire cross-section (16 is the default)',
      unit: 'count',
      example: 'spring({ length: 30, coilRadius: 5, wireRadius: 1, turns: 8, segments: 16 })',
      featureId: 'spring',
    });
  }
  return { pointsPerTurn, cylinderSegments };
}

/** Validate the `endStyle` option and apply its `'open'` default. */
function resolveSpringEndStyle(opts: SpringOptions): 'open' | 'closed' {
  const endStyle = opts.endStyle ?? 'open';
  if (endStyle !== 'open' && endStyle !== 'closed') {
    invalidArgs({
      api: 'spring({ endStyle })',
      path: 'opts.endStyle',
      got: endStyle,
      showType: typeof endStyle !== 'string',
      requires: "'open' (bare wire ends, the default) or 'closed' (short integral end bars)",
      example: "spring({ length: 30, coilRadius: 5, wireRadius: 1, turns: 8, endStyle: 'closed' })",
      featureId: 'spring',
    });
  }
  return endStyle;
}

export function makeSpringMethod(
  session: CaptureSession,
  self: () => KernelCadApi,
): KernelCadApi['spring'] {
  return (opts) => {
    const { length, coilRadius, wireRadius, turns } = resolveSpringSizing(opts);
    const axis = resolveSpringAxis(opts);
    const { pointsPerTurn, cylinderSegments } = resolveSpringSampling(opts);
    const endStyle = resolveSpringEndStyle(opts);

    const orient = (axial: number, radialA: number, radialB: number): [number, number, number] => {
      if (axis === 'X') return [axial, radialA, radialB];
      if (axis === 'Y') return [radialA, axial, radialB];
      return [radialA, radialB, axial];
    };

    const cylinderBetween = (p0: [number, number, number], p1: [number, number, number], r: number): Shape => {
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const dz = p1[2] - p0[2];
      const len = Math.hypot(dx, dy, dz);
      return self().cylinder(len, r, cylinderSegments)
        .alongAxis([dx, dy, dz])
        .translate(p0[0], p0[1], p0[2]);
    };

    const rail = helix({
      radius: coilRadius,
      pitch: length / turns,
      turns,
      axis,
      pointsPerTurn,
    });
    // spine: 'smooth' — the helix rail samples a smooth curve, so the
    // spine must be a single B-spline edge. A polyline spine makes OCCT
    // pipe-shell emit per-segment tubes that do not sew (open rings in
    // the export mesh) and distorts the coil. The smooth spine's default
    // orientation transport is well-defined on a helix; no frenet needed.
    let shape = makePath(session)
      .circle(0, 0, wireRadius, cylinderSegments)
      .sweep(rail, { spine: 'smooth' });
    if (endStyle === 'closed') {
      const barHalf = coilRadius + wireRadius;
      shape = shape
        .union(cylinderBetween(orient(0, -barHalf, 0), orient(0, barHalf, 0), wireRadius))
        .union(cylinderBetween(orient(length, -barHalf, 0), orient(length, barHalf, 0), wireRadius));
    }
    return shape;
  };
}

const SPUR_GEAR_KEYS = new Set(['module', 'teeth', 'pressureAngle', 'faceWidth', 'bore', 'backlash']);

function assertSpurGearOptsObject(opts: SpurGearOptions): void {
  if (!opts || typeof opts !== 'object') {
    invalidArgs({
      api: 'spurGear(opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires:
        'an options object { module, teeth, faceWidth, pressureAngle?, bore?, backlash? } — spurGear takes no positional arguments',
      example: 'spurGear({ module: 1, teeth: 20, faceWidth: 6, bore: 5 })',
      featureId: 'spurGear',
    });
  }
  for (const key of Object.keys(opts)) {
    if (!SPUR_GEAR_KEYS.has(key)) {
      invalidArgs({
        api: 'spurGear(opts)',
        path: `opts.${key}`,
        gotText: `an unknown option '${key}'`,
        requires: `one of ${[...SPUR_GEAR_KEYS].join(', ')}; use internalSpurGear() for a ring gear`,
        example: 'spurGear({ module: 1, teeth: 20, faceWidth: 6, bore: 5 })',
        featureId: 'spurGear',
      });
    }
  }
}

function resolveSpurGearTeeth(teeth: unknown): number {
  if (typeof teeth !== 'number' || !Number.isInteger(teeth) || teeth < 6 || teeth > 400) {
    invalidArgs({
      api: 'spurGear({ teeth })',
      path: 'opts.teeth',
      got: teeth,
      showType: typeof teeth !== 'number',
      requires:
        'a whole tooth count in [6, 400]; pitch diameter is module × teeth, so size the gear through module, not through a fractional count (below ~17 teeth at 20° the root undercuts — still generated, just weaker)',
      unit: 'count',
      example: 'spurGear({ module: 1, teeth: 20, faceWidth: 6, bore: 5 })',
      featureId: 'spurGear',
    });
  }
  return teeth;
}

function resolveSpurGearPressureAngle(value: unknown): number {
  const pressureAngle = value ?? 20;
  if (typeof pressureAngle !== 'number' || !(pressureAngle >= 10 && pressureAngle <= 35)) {
    invalidArgs({
      api: 'spurGear({ pressureAngle })',
      path: 'opts.pressureAngle',
      got: pressureAngle,
      showType: typeof pressureAngle !== 'number',
      requires:
        'a number in [10, 35] — 20 (standard, the default), 14.5 (legacy) or 25 (high-load); both gears of a mesh need the same value',
      unit: 'deg',
      example: 'spurGear({ module: 1, teeth: 20, faceWidth: 6, pressureAngle: 20 })',
      featureId: 'spurGear',
    });
  }
  return pressureAngle;
}

function resolveSpurGearBacklash(value: unknown, module: number): number {
  const backlash = value ?? 0.05 * module;
  if (typeof backlash !== 'number' || !Number.isFinite(backlash) || backlash < 0 || backlash >= module) {
    invalidArgs({
      api: 'spurGear({ backlash })',
      path: 'opts.backlash',
      got: backlash,
      showType: typeof backlash !== 'number',
      requires:
        `a finite number in [0, module) — module is ${module} mm, so backlash must stay under that; it is the circular play at the pitch circle of a pair built with the same value (0.1–0.2 for FDM prints, default 0.05 × module)`,
      unit: 'mm',
      example: 'spurGear({ module: 1, teeth: 20, faceWidth: 6, backlash: 0.15 })',
      featureId: 'spurGear',
    });
  }
  return backlash;
}

function resolveSpurGearBore(value: unknown, module: number, root: number): number | undefined {
  if (value === undefined) return undefined;
  const bore = assertPositiveFinite('spurGear', 'bore', value);
  if (bore / 2 >= root - 0.5 * module) {
    invalidArgs({
      api: 'spurGear({ bore })',
      path: 'opts.bore',
      got: bore,
      requires:
        `bore < ${(2 * (root - 0.5 * module)).toFixed(2)} so a rim at least 0.5 × module thick survives under the teeth — the root diameter here is ${(2 * root).toFixed(3)} mm; otherwise raise teeth or module`,
      unit: 'mm',
      example: 'spurGear({ module: 1, teeth: 20, faceWidth: 6, bore: 5 })',
      featureId: 'spurGear',
    });
  }
  return bore;
}

/** Validate `spurGear()` options and apply defaults (20° pressure angle,
 *  backlash 0.05·module, no bore). */
function resolveSpurGearOpts(opts: SpurGearOptions): {
  module: number;
  teeth: number;
  pressureAngle: number;
  faceWidth: number;
  bore: number | undefined;
  backlash: number;
} {
  assertSpurGearOptsObject(opts);
  const module = assertPositiveFinite('spurGear', 'module', opts.module);
  const faceWidth = assertPositiveFinite('spurGear', 'faceWidth', opts.faceWidth);
  const teeth = resolveSpurGearTeeth(opts.teeth);
  const pressureAngle = resolveSpurGearPressureAngle(opts.pressureAngle);
  const backlash = resolveSpurGearBacklash(opts.backlash, module);
  const bore = resolveSpurGearBore(opts.bore, module, spurGearRadii(module, teeth, pressureAngle).root);
  return { module, teeth, pressureAngle, faceWidth, bore, backlash };
}

export function makeSpurGearMethod(
  session: CaptureSession,
  self: () => KernelCadApi,
): KernelCadApi['spurGear'] {
  return (opts) => {
    const { module, teeth, pressureAngle, faceWidth, bore, backlash } = resolveSpurGearOpts(opts);
    let outline: SpurGearOutline;
    try {
      outline = spurGearOutline({ module, teeth, pressureAngleDeg: pressureAngle, backlash });
    } catch (err) {
      if (err instanceof SpurGearProfileError) {
        throw new KernelError('feature.invalid-args', err.message, 'spurGear', err.hint);
      }
      throw err;
    }
    // Flanks are B-splines through the generated samples (1e-4 mm fit), tip
    // land and root are true arcs: ~6 faces per tooth instead of hundreds of
    // facets, which keeps booleans, meshing and STEP small.
    let path = makePath(session).moveTo(outline.start[0], outline.start[1]);
    for (const seg of outline.segments) {
      path = seg.kind === 'spline'
        ? path.spline(seg.points)
        : path.threePointsArc(seg.to[0], seg.to[1], seg.mid[0], seg.mid[1]);
    }
    const body = path.close().extrude(faceWidth);
    if (bore === undefined) return body;
    return body.subtract(self().cylinder(faceWidth + 2, bore / 2).translate(0, 0, -1));
  };
}

const INTERNAL_SPUR_GEAR_KEYS = new Set([
  'module', 'teeth', 'pressureAngle', 'faceWidth', 'backlash', 'rimThickness', 'profileShift',
]);

function assertInternalSpurGearOptsObject(opts: InternalSpurGearOptions): void {
  if (!opts || typeof opts !== 'object') {
    invalidArgs({
      api: 'internalSpurGear(opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires:
        'an options object { module, teeth, faceWidth, pressureAngle?, backlash?, rimThickness?, profileShift? } — no positional arguments; aliases are ringGear and internalGear',
      example: 'internalSpurGear({ module: 1, teeth: 54, faceWidth: 8, rimThickness: 4 })',
      featureId: 'internalSpurGear',
    });
  }
  for (const key of Object.keys(opts)) {
    if (!INTERNAL_SPUR_GEAR_KEYS.has(key)) {
      invalidArgs({
        api: 'internalSpurGear(opts)',
        path: `opts.${key}`,
        gotText: `an unknown option '${key}'`,
        requires: `one of ${[...INTERNAL_SPUR_GEAR_KEYS].join(', ')}; bore is a spurGear-only option`,
        example: 'internalSpurGear({ module: 1, teeth: 54, faceWidth: 8, rimThickness: 4 })',
        featureId: 'internalSpurGear',
      });
    }
  }
}

function resolveInternalSpurGearOpts(opts: InternalSpurGearOptions): {
  module: number;
  teeth: number;
  pressureAngle: number;
  faceWidth: number;
  backlash: number;
  rimThickness: number;
} {
  assertInternalSpurGearOptsObject(opts);
  const module = assertPositiveFinite('internalSpurGear', 'module', opts.module);
  const faceWidth = assertPositiveFinite('internalSpurGear', 'faceWidth', opts.faceWidth);
  const teeth = resolveSpurGearTeeth(opts.teeth);
  // Reuse spurGear tooth-count message but retarget the feature name.
  const pressureAngle = resolveSpurGearPressureAngle(opts.pressureAngle);
  const backlash = resolveSpurGearBacklash(opts.backlash, module);
  if (opts.profileShift !== undefined && opts.profileShift !== 0) {
    invalidArgs({
      api: 'internalSpurGear({ profileShift })',
      path: 'opts.profileShift',
      got: opts.profileShift,
      requires:
        '0, or omit it — this version generates an unshifted basic rack, so a non-zero profile shift is not yet supported',
      unit: 'ratio',
      example: 'internalSpurGear({ module: 1, teeth: 54, faceWidth: 8, rimThickness: 4 })',
      featureId: 'internalSpurGear',
    });
  }
  const rimThickness = opts.rimThickness === undefined
    ? 2.5 * module
    : assertPositiveFinite('internalSpurGear', 'rimThickness', opts.rimThickness);
  return { module, teeth, pressureAngle, faceWidth, backlash, rimThickness };
}

function outlineToExtrudedSolid(session: CaptureSession, outline: SpurGearOutline, faceWidth: number): Shape {
  let path = makePath(session).moveTo(outline.start[0], outline.start[1]);
  for (const seg of outline.segments) {
    path = seg.kind === 'spline'
      ? path.spline(seg.points)
      : path.threePointsArc(seg.to[0], seg.to[1], seg.mid[0], seg.mid[1]);
  }
  return path.close().extrude(faceWidth);
}

/** Build an internal / ring gear: outer rim disk minus an inverted involute bore. */
export function makeInternalSpurGearMethod(
  session: CaptureSession,
  self: () => KernelCadApi,
): KernelCadApi['internalSpurGear'] {
  return (opts) => {
    const { module, teeth, pressureAngle, faceWidth, backlash, rimThickness } =
      resolveInternalSpurGearOpts(opts);
    let boreOutline: SpurGearOutline;
    try {
      boreOutline = internalSpurGearBoreOutline({
        module,
        teeth,
        pressureAngleDeg: pressureAngle,
        backlash,
      });
    } catch (err) {
      if (err instanceof SpurGearProfileError) {
        throw new KernelError('feature.invalid-args', err.message, 'internalSpurGear', err.hint);
      }
      throw err;
    }
    // Outer radius clears the inverted root (deepest bore) by rimThickness.
    const outerR = boreOutline.radii.root + rimThickness;
    const outer = self().cylinder(faceWidth, outerR);
    // Bore cutter slightly taller so the subtract clears both ends cleanly.
    const bore = outlineToExtrudedSolid(session, boreOutline, faceWidth + 2).translate(0, 0, -1);
    return outer.subtract(bore);
  };
}

export function makeRingGearAlias(self: () => KernelCadApi): KernelCadApi['ringGear'] {
  return (opts) => self().internalSpurGear(opts);
}

export function makeInternalGearAlias(self: () => KernelCadApi): KernelCadApi['internalGear'] {
  return (opts) => self().internalSpurGear(opts);
}

export function makePlanetaryToothCompatibilityMethod(): KernelCadApi['planetaryToothCompatibility'] {
  return (opts: PlanetaryToothCompatibilityOpts) => {
    try {
      assertPlanetaryToothCompatibility(opts);
    } catch (err) {
      if (err instanceof SpurGearProfileError) {
        throw new KernelError(
          'feature.invalid-args',
          err.message,
          'planetaryToothCompatibility',
          err.hint,
        );
      }
      throw err;
    }
  };
}

/** Option keys the primitive extrude builders accept. Anything else is a
 *  likely typo and is rejected with `feature.invalid-args` instead of being
 *  silently dropped, matching `Sketch.extrude`. */
const ALLOWED_PRIMITIVE_EXTRUDE_KEYS = new Set(['faceLabels', 'twistAngle']);

/** Validate the shared options of `extrudeRect` / `extrudeCircle` /
 *  `extrudePolygon` / `extrudeRoundedRect` and box `twistAngle` as a `'deg'`
 *  Param (default 0). Mirrors `Sketch.extrude`'s guards. */
function resolvePrimitiveExtrudeOpts(
  method: string,
  opts: ExtrudeOpts | null | undefined,
): { faceLabels: FaceLabelsMap | undefined; twistAngle: Param } {
  // Tolerate an explicit `null` opts the same way `Sketch.extrude` does.
  opts ??= {};
  for (const key of Object.keys(opts)) {
    if (!ALLOWED_PRIMITIVE_EXTRUDE_KEYS.has(key)) {
      invalidArgs({
        api: `${method}(..., opts)`,
        path: `opts.${key}`,
        gotText: `an unknown option '${key}'`,
        requires: `one of ${[...ALLOWED_PRIMITIVE_EXTRUDE_KEYS].join(', ')}; the size arguments are positional, not options`,
        example: `${method === 'extrudePolygon' ? 'extrudePolygon([[0, 0], [20, 0], [20, 10], [0, 10]], 5' : `${method}(40, 30, 10`}, { twistAngle: 0 })`,
        featureId: method,
      });
    }
  }
  if (opts.twistAngle !== undefined && !isValidEditableNumber(opts.twistAngle)) {
    invalidArgs({
      api: `${method}(..., { twistAngle })`,
      path: 'opts.twistAngle',
      got: opts.twistAngle,
      showType: true,
      requires:
        'a finite number, or a numeric ParamRef from param() — the TOTAL twist over the full extrude height, not per mm',
      unit: 'deg',
      example: `${method === 'extrudePolygon' ? 'extrudePolygon([[0, 0], [20, 0], [20, 10], [0, 10]], 5' : `${method}(40, 30, 10`}, { twistAngle: 15 })`,
      featureId: method,
    });
  }
  return {
    faceLabels: validateFaceLabels(opts.faceLabels, 'extrude'),
    twistAngle: toParam(opts.twistAngle ?? 0, 'deg'),
  };
}

export function makeExtrudeMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'extrudeRect' | 'extrudeCircle' | 'extrudePolygon' | 'extrudeRoundedRect' | 'union'> {
  return {
    extrudeRect(w, h, height, opts) {
      const { faceLabels, twistAngle } = resolvePrimitiveExtrudeOpts('extrudeRect', opts);
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          height: mm(height),
          twistAngle,
        },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    extrudeCircle(r, height, opts) {
      const { faceLabels, twistAngle } = resolvePrimitiveExtrudeOpts('extrudeCircle', opts);
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'circle'", unit: 'unitless', evaluated: 0 },
          r: mm(r),
          height: mm(height),
          twistAngle,
        },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    extrudePolygon(points, depth, opts) {
      const { faceLabels, twistAngle } = resolvePrimitiveExtrudeOpts('extrudePolygon', opts);
      return session.createShape({
        kind: 'extrude',
        inputs: {},
        params: {
          profileKind: { expression: "'polygon'", unit: 'unitless', evaluated: 0 },
          depth: mm(depth),
          twistAngle,
        },
        // Plain numbers stay plain; a ParamRef coordinate is boxed as a Param
        // so the dispatcher's pre-resolve substitutes it at lower time.
        metadata: {
          points: points.map((p) => (Array.isArray(p) ? p.map((c) => (typeof c === 'number' ? c : mm(c))) : p)),
          ...(faceLabels ? { faceLabels } : {}),
        },
      });
    },
    extrudeRoundedRect(width, height, radius, depth, opts) {
      const { faceLabels, twistAngle } = resolvePrimitiveExtrudeOpts('extrudeRoundedRect', opts);
      return session.createShape({
        kind: 'extrude',
        inputs: {},
        params: {
          profileKind: { expression: "'rounded-rect'", unit: 'unitless', evaluated: 0 },
          width: mm(width), height: mm(height), radius: mm(radius), depth: mm(depth),
          twistAngle,
        },
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    union(...shapes) {
      if (shapes.length < 2) throw new Error('union() requires at least 2 shapes');
      const [first, ...rest] = shapes;
      return first.union(...rest);
    },
  };
}
