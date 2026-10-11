// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/threads.ts
//
// ISO metric thread data and geometry for `isoThread`, `threadedRod` and
// `Shape.threadedHole`.
//
//   - ISO 261 pitch table (coarse + common fine pitches, M1–M64) and the
//     `'M6'` / `'M6x0.75'` spec parser.
//   - ISO 68-1 basic profile dimensions (H = √3/2·P, 60° flanks).
//   - The TRANSVERSE cross-section of an external thread: the planar section
//     perpendicular to the axis. Swept by pure screw motion (one turn per
//     pitch) it IS the threaded rod — `sweep(helix, { section: 'transverse' })`
//     builds it in one step with no boolean against a core cylinder, which is
//     what keeps a modelled rod fast.
//
// Written from the ISO 68-1 / ISO 261 definitions; no third-party thread
// library code.

import { invalidArgs } from '../shared/intent/invalidArgs';

/** Coarse pitch per nominal diameter (ISO 261, first/second choice sizes). */
const COARSE: Readonly<Record<string, number>> = {
  '1': 0.25, '1.2': 0.25, '1.4': 0.3, '1.6': 0.35, '2': 0.4, '2.5': 0.45, '3': 0.5, '3.5': 0.6,
  '4': 0.7, '5': 0.8, '6': 1, '7': 1, '8': 1.25, '10': 1.5, '12': 1.75, '14': 2, '16': 2,
  '18': 2.5, '20': 2.5, '22': 2.5, '24': 3, '27': 3, '30': 3.5, '33': 3.5, '36': 4, '39': 4,
  '42': 4.5, '45': 4.5, '48': 5, '52': 5, '56': 5.5, '60': 5.5, '64': 6,
};

/** Common fine pitches per nominal diameter (ISO 261). */
const FINE: Readonly<Record<string, readonly number[]>> = {
  '2': [0.25], '2.5': [0.35], '3': [0.35], '4': [0.5], '5': [0.5], '6': [0.75], '8': [1, 0.75],
  '10': [1.25, 1, 0.75], '12': [1.5, 1.25, 1], '14': [1.5, 1.25, 1], '16': [1.5, 1],
  '18': [2, 1.5, 1], '20': [2, 1.5, 1], '22': [2, 1.5, 1], '24': [2, 1.5, 1], '27': [2, 1.5, 1],
  '30': [3, 2, 1.5, 1], '33': [3, 2, 1.5], '36': [3, 2, 1.5], '39': [3, 2, 1.5], '42': [4, 3, 2, 1.5],
  '45': [4, 3, 2, 1.5], '48': [4, 3, 2, 1.5], '52': [4, 3, 2, 1.5], '56': [4, 3, 2, 1.5],
  '60': [4, 3, 2, 1.5], '64': [4, 3, 2, 1.5],
};

/** √3/2 — fundamental triangle height per unit pitch. */
const H_PER_P = Math.sqrt(3) / 2;
const TAN30 = Math.tan(Math.PI / 6);
const COS30 = Math.cos(Math.PI / 6);

/** Resolved ISO metric thread: everything a model or a drawing callout needs. */
export interface IsoThreadInfo {
  /** Canonical designation, always with the pitch: `'M6x1'`. */
  spec: string;
  /** Nominal (major) diameter d = D, mm. */
  diameter: number;
  /** Pitch P, mm. */
  pitch: number;
  /** True when P is the ISO 261 coarse pitch for this diameter. */
  coarse: boolean;
  /** True when (d, P) is in the ISO 261 coarse or common-fine table. */
  standard: boolean;
  /** Basic pitch diameter d2 = d − 0.6495·P. */
  pitchDiameter: number;
  /** Basic internal minor diameter D1 = D − 1.0825·P (nut bore). */
  minorDiameter: number;
  /** External root diameter of the basic flat-root profile, = D1. */
  rootDiameter: number;
  /** Tap drill for ~75 % engagement, D − P. */
  tapDrill: number;
  /** Basic thread depth (5/8)·H = 0.5413·P, radial. */
  threadDepth: number;
}

function key(d: number): string {
  return String(Number(d.toFixed(4)));
}

const SPEC_RE = /^\s*M\s*(\d+(?:\.\d+)?)\s*(?:[x×*]\s*(\d+(?:\.\d+)?))?\s*$/i;
const SPEC_EXAMPLE = "isoThread('M6')  // or 'M6x0.75' for a fine pitch, 'M70x4' for a custom size";

function badSpec(api: string, spec: unknown, requires: string): never {
  return invalidArgs({
    api,
    path: 'spec',
    got: spec,
    showType: typeof spec !== 'string',
    requires,
    example: SPEC_EXAMPLE,
    featureId: api.replace(/\(.*$/, ''),
  });
}

/**
 * Parse an ISO metric designation. `'M6'` takes the coarse pitch from the
 * ISO 261 table; `'M6x0.75'` (also `×`) sets the pitch explicitly and works
 * for any diameter, so `'M70x4'` describes a jar neck.
 */
export function isoThreadInfo(spec: unknown, api = 'isoThread(spec)'): IsoThreadInfo {
  const m = typeof spec === 'string' ? SPEC_RE.exec(spec) : null;
  if (m === null) {
    badSpec(api, spec, "an ISO metric designation string: 'M<diameter>' (coarse pitch) or 'M<diameter>x<pitch>'");
  }
  const diameter = Number(m[1]);
  const coarsePitch = COARSE[key(diameter)];
  if (m[2] === undefined && coarsePitch === undefined) {
    badSpec(
      api,
      spec,
      `a size in the ISO 261 coarse table (M1–M64, e.g. M3, M6, M8, M10, M12, M16, M20, M24) — M${key(diameter)} has no coarse pitch, so give it: 'M${key(diameter)}x<pitch>'`,
    );
  }
  const pitch = m[2] === undefined ? coarsePitch : Number(m[2]);
  if (!(diameter > 0) || !(pitch > 0) || pitch > diameter / 4) {
    badSpec(
      api,
      spec,
      `diameter > 0 and 0 < pitch ≤ diameter / 4 — M${key(diameter)} allows a pitch up to ${diameter / 4} mm`,
    );
  }
  const coarse = coarsePitch !== undefined && Math.abs(coarsePitch - pitch) < 1e-9;
  const standard = coarse || (FINE[key(diameter)] ?? []).some((p) => Math.abs(p - pitch) < 1e-9);
  const minorDiameter = diameter - 2 * (5 / 8) * H_PER_P * pitch;
  return {
    spec: `M${key(diameter)}x${key(pitch)}`,
    diameter,
    pitch,
    coarse,
    standard,
    pitchDiameter: diameter - 2 * (3 / 8) * H_PER_P * pitch,
    minorDiameter,
    rootDiameter: minorDiameter,
    tapDrill: diameter - pitch,
    threadDepth: (5 / 8) * H_PER_P * pitch,
  };
}

/**
 * Radial profile ρ(s) of an external thread: radius at axial offset `s` from
 * the nearest ridge centre (|s| ≤ P/2). The basic ISO profile pulled in by a
 * radial/normal `clearance`: crest at R − c, each 30° flank moved c along its
 * normal, flat root at the basic minor radius.
 */
interface ExternalProfile {
  /** Crest radius R − c. */
  crest: number;
  /** Root radius (basic minor). */
  root: number;
  /** |s| where the flank meets the crest. */
  sCrest: number;
  /** |s| where the flank meets the root. */
  sRoot: number;
}

function externalProfile(info: IsoThreadInfo, clearance: number): ExternalProfile {
  const P = info.pitch;
  const root = info.minorDiameter / 2;
  const crest = info.diameter / 2 - clearance;
  // Flank: half-width at radius r is 3P/8 − c/cos30 − (r − root)·tan30.
  const halfWidth = (r: number) => (3 / 8) * P - clearance / COS30 - (r - root) * TAN30;
  return { crest, root, sCrest: halfWidth(crest), sRoot: halfWidth(root) };
}

/** Largest external-thread clearance the transverse section accepts: the
 *  crest flat must keep a positive width. */
export function maxRodClearance(pitch: number): number {
  return pitch / 10;
}

/** A path recipe in plain numbers: the PathBuilder calls that draw the
 *  transverse section of a thread. */
export type SectionStep =
  | { kind: 'moveTo'; p: [number, number] }
  | { kind: 'arc'; to: [number, number]; via: [number, number] }
  | { kind: 'spline'; points: Array<[number, number]>; startTangent: [number, number]; endTangent: [number, number] };

/** Points per flank spline. The flank is an Archimedean spiral; a cubic
 *  interpolant through this many points stays within ~1e-4·P of it. */
const FLANK_POINTS = 11;

/**
 * Transverse section (perpendicular to the axis, origin on the axis) of a
 * right-hand external ISO thread at z = 0, with the ridge centre on +X.
 *
 * A point at angle θ on the section sits at axial offset s = −P·θ/2π from the
 * ridge that crosses +X at z = 0, so its radius is ρ(s): a crest arc
 * (|θ| ≤ θc), two Archimedean-spiral flanks, and a root arc opposite.
 */
export function externalThreadSection(info: IsoThreadInfo, clearance: number): SectionStep[] {
  const P = info.pitch;
  const prof = externalProfile(info, clearance);
  const thetaOf = (s: number) => (2 * Math.PI * s) / P;
  const tc = thetaOf(prof.sCrest);
  const tr = thetaOf(prof.sRoot);
  // Radius on the flank as a function of |θ| (linear: an Archimedean spiral).
  const slope = -(P / (2 * Math.PI)) / TAN30; // dr/d|θ|
  const rFlank = (absTheta: number) => prof.crest + (absTheta - tc) * slope;
  const at = (r: number, th: number): [number, number] => [r * Math.cos(th), r * Math.sin(th)];
  // Tangent of the polar curve r(θ): (r' cos θ − r sin θ, r' sin θ + r cos θ).
  const tangent = (r: number, dr: number, th: number): [number, number] => [
    dr * Math.cos(th) - r * Math.sin(th),
    dr * Math.sin(th) + r * Math.cos(th),
  ];
  const flank = (from: number, to: number, sign: 1 | -1): SectionStep => {
    const points: Array<[number, number]> = [];
    for (let i = 0; i < FLANK_POINTS; i++) {
      const th = from + ((to - from) * i) / (FLANK_POINTS - 1);
      points.push(at(rFlank(Math.abs(sign > 0 ? th : th - 2 * Math.PI)), th));
    }
    return {
      kind: 'spline',
      points,
      startTangent: tangent(sign > 0 ? prof.crest : prof.root, sign * slope, from),
      endTangent: tangent(sign > 0 ? prof.root : prof.crest, sign * slope, to),
    };
  };
  return [
    { kind: 'moveTo', p: at(prof.crest, -tc) },
    { kind: 'arc', to: at(prof.crest, tc), via: at(prof.crest, 0) },
    flank(tc, tr, 1),
    { kind: 'arc', to: at(prof.root, 2 * Math.PI - tr), via: at(prof.root, Math.PI) },
    flank(2 * Math.PI - tr, 2 * Math.PI - tc, -1),
  ];
}

/** Exact area of {@link externalThreadSection} (for tests and docs): the
 *  rod volume is this × length. */
export function externalThreadSectionArea(info: IsoThreadInfo, clearance: number): number {
  const prof = externalProfile(info, clearance);
  const tc = (2 * Math.PI * prof.sCrest) / info.pitch;
  const tr = (2 * Math.PI * prof.sRoot) / info.pitch;
  const R = prof.crest;
  const r = prof.root;
  const flank = ((tr - tc) * (R * R + R * r + r * r)) / 3;
  return 0.5 * (R * R * 2 * tc + r * r * (2 * Math.PI - 2 * tr) + 2 * flank);
}
