// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared analytic references and fixtures for the thread tests: the fast
// required checks (tests/unit/backends/occt/helicalSweep.test.ts,
// holeThread.test.ts) and the slow modeled-thread proofs
// (tests/integration/modeling/modeledThreadProofs.test.ts).

import { getOC } from 'replicad';
import type { OcctBackend } from '../src/kernel/backends/occt/occtBackend';
import { isoExternalRidgeProfile, isoInternalGrooveProfile, isoMinorRadius } from '../src/kernel/backends/occt/isoThread';

/** Set by the non-required `geometry-proofs` CI job to run the slow modeled
 *  thread proofs; unset in the required sharded suite. */
export const SLOW_GEOMETRY_TESTS = process.env.KERNELCAD_SLOW_GEOMETRY_TESTS === '1';

type Profile = ReadonlyArray<readonly [number, number]>;

/** ∫∫ (R + x) dA over the part of a profile polygon with x ≥ x0. With x0 = −∞
 *  (the default) this is the whole profile. */
export function profileMoment(profile: Profile, R: number, x0 = -Infinity): number {
  const clipped: Array<[number, number]> = [];
  for (let i = 0; i < profile.length; i++) {
    const a = profile[i];
    const b = profile[(i + 1) % profile.length];
    if (a[0] >= x0) clipped.push([a[0], a[1]]);
    if ((a[0] >= x0) !== (b[0] >= x0)) {
      const t = (x0 - a[0]) / (b[0] - a[0]);
      clipped.push([x0, a[1] + t * (b[1] - a[1])]);
    }
  }
  let area2 = 0;
  let mx6 = 0;
  for (let i = 0; i < clipped.length; i++) {
    const [xa, ya] = clipped[i];
    const [xb, yb] = clipped[(i + 1) % clipped.length];
    const c = xa * yb - xb * ya;
    area2 += c;
    mx6 += (xa + xb) * c;
  }
  return Math.abs((R * area2) / 2 + mx6 / 6);
}

/** Volume a through tapped hole (ISO basic groove grown by `c`) removes from a
 *  slab of thickness h: minor bore + (h/P)·2π·∫∫ r dA of the groove beyond it. */
export function tappedRemoval(D: number, P: number, c: number, h: number): number {
  const rBore = isoMinorRadius(D, P) + c;
  return Math.PI * rBore * rBore * h + (h / P) * 2 * Math.PI * profileMoment(isoInternalGrooveProfile(D, P, c), rBore, 0);
}

/** A script sweeping the ISO external ridge of M`d` × `pitch` along `turns`
 *  of an exact helix at the minor radius. */
export function ridgeScript(d: number, pitch: number, turns: number): string {
  const pts = isoExternalRidgeProfile(d, pitch);
  const chain = pts.slice(1).map(([x, y]) => `.lineTo(${x}, ${y})`).join('');
  return `
    const profile = path().moveTo(${pts[0][0]}, ${pts[0][1]})${chain}.close();
    return profile.sweep(helix({ radius: ${isoMinorRadius(d, pitch)}, pitch: ${pitch}, turns: ${turns} }), { spine: 'helix' });
  `;
}

/** OCCT BRepCheck_Analyzer validity of a lowered shape. */
export function brepValid(shape: OcctBackend): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analyzer = new oc.BRepCheck_Analyzer((shape.getReplicadShape() as any).wrapped, true, false);
  const valid = analyzer.IsValid_2();
  analyzer.delete();
  return valid;
}
