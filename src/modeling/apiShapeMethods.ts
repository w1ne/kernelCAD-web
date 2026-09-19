// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import type { Shape } from './capture/proxy';
import { makePath } from './capture/sketch';
import { validateFaceLabels } from './capture/faceLabels';
import { helix } from './helix';
import { formatScalarForError } from '../shared/intent/types';
import { KernelError } from '../shared/intent/kernelError';
import { mm, ul, assertEditableNumber, assertPositiveFinite } from './apiSupport';
import type { KernelCadApi } from './api';

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
      if (!Number.isFinite(majorR) || !Number.isFinite(minorR)) {
        throw new KernelError(
          'feature.invalid-args',
          `torus: majorR (${majorR}) and minorR (${minorR}) must be finite numbers.`,
          'torus',
          'Pass numeric literals for majorR and minorR.',
        );
      }
      if (majorR <= 0 || minorR <= 0) {
        throw new KernelError(
          'feature.invalid-args',
          `torus: majorR (${majorR}) and minorR (${minorR}) must be > 0.`,
          'torus',
          'Pass positive numeric radii.',
        );
      }
      if (minorR >= majorR) {
        throw new KernelError(
          'feature.invalid-args',
          `torus: minorR (${minorR}) must be < majorR (${majorR}) to produce a non-self-intersecting torus (the profile circle would cross the rotation axis at minorR >= majorR).`,
          'torus',
          'Pick minorR < majorR. Typical: minorR ~= 0.2-0.4 × majorR for a chunky ring; minorR << majorR for a thin ring.',
        );
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

export function makeSpringMethod(
  session: CaptureSession,
  self: () => KernelCadApi,
): KernelCadApi['spring'] {
  return (opts) => {
    const length = assertPositiveFinite('spring', 'length', opts?.length);
    const coilRadius = assertPositiveFinite('spring', 'coilRadius', opts?.coilRadius);
    const wireRadius = assertPositiveFinite('spring', 'wireRadius', opts?.wireRadius);
    const turns = assertPositiveFinite('spring', 'turns', opts?.turns);
    if (coilRadius <= wireRadius) {
      throw new KernelError(
        'feature.invalid-args',
        `spring: coilRadius (${coilRadius}) must be greater than wireRadius (${wireRadius}) so the spring has a visible coil centerline.`,
        'spring',
        'Pick coilRadius > wireRadius. Typical balance springs use wireRadius around 15-30% of coilRadius.',
      );
    }
    const axis = opts.axis ?? 'Z';
    if (axis !== 'X' && axis !== 'Y' && axis !== 'Z') {
      throw new KernelError(
        'feature.invalid-args',
        `spring: axis must be one of 'X', 'Y', or 'Z'; got ${formatScalarForError(axis)}.`,
        'spring',
        'Pass axis: "X", "Y", or "Z".',
      );
    }
    const pointsPerTurn = opts.pointsPerTurn ?? 24;
    if (!Number.isInteger(pointsPerTurn) || pointsPerTurn < 6) {
      throw new KernelError(
        'feature.invalid-args',
        `spring: pointsPerTurn must be an integer >= 6; got ${formatScalarForError(pointsPerTurn)}.`,
        'spring',
        'Use pointsPerTurn >= 6. Higher values smooth the coil at higher feature cost.',
      );
    }
    const cylinderSegments = opts.segments ?? 16;
    if (!Number.isInteger(cylinderSegments) || cylinderSegments < 6) {
      throw new KernelError(
        'feature.invalid-args',
        `spring: segments must be an integer >= 6; got ${formatScalarForError(cylinderSegments)}.`,
        'spring',
        'Use segments >= 6 for the circular wire cross-section.',
      );
    }
    const endStyle = opts.endStyle ?? 'open';
    if (endStyle !== 'open' && endStyle !== 'closed') {
      throw new KernelError(
        'feature.invalid-args',
        `spring: endStyle must be 'open' or 'closed'; got ${formatScalarForError(endStyle)}.`,
        'spring',
        'Use endStyle: "open" for bare wire ends or "closed" for short integral end bars.',
      );
    }

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

export function makeExtrudeMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'extrudeRect' | 'extrudeCircle' | 'extrudePolygon' | 'extrudeRoundedRect' | 'union'> {
  return {
    extrudeRect(w, h, height, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'rect'", unit: 'unitless', evaluated: 0 },
          w: mm(w), h: mm(h),
          height: mm(height),
        },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    extrudeCircle(r, height, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        params: {
          profileKind: { expression: "'circle'", unit: 'unitless', evaluated: 0 },
          r: mm(r),
          height: mm(height),
        },
        inputs: {},
        metadata: faceLabels ? { faceLabels } : undefined,
      });
    },
    extrudePolygon(points, depth, opts) {
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        inputs: {},
        params: {
          profileKind: { expression: "'polygon'", unit: 'unitless', evaluated: 0 },
          depth: mm(depth),
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
      const faceLabels = validateFaceLabels(opts?.faceLabels, 'extrude');
      return session.createShape({
        kind: 'extrude',
        inputs: {},
        params: {
          profileKind: { expression: "'rounded-rect'", unit: 'unitless', evaluated: 0 },
          width: mm(width), height: mm(height), radius: mm(radius), depth: mm(depth),
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
