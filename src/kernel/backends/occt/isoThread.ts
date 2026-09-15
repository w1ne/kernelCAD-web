// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/isoThread.ts
//
// ISO 68-1 basic metric thread profile, as polygons ready for the helical
// sweep in `helicalSweep.ts`.
//
// Basic profile (pitch P, fundamental triangle height H = √3/2 · P, 60°):
//   - major radius  R  = D / 2
//   - minor radius  r1 = R − 5H/8          (D1 = D − 1.0825·P)
//   - at r1 the external ridge is 3P/4 wide (root gap P/4)
//   - at R  the external ridge is  P/8 wide (crest flat)
//   - flanks at ±30° to the radial direction.
// The internal thread of a nut is the complement: its groove is the external
// ridge. With `clearance` c the groove grows outward by c everywhere — the
// crest radius by c and each flank by c measured perpendicular to the flank —
// so a basic external thread fits with c of play.
//
// Profile coordinates are local to the helix point: x = radial offset from the
// helix radius, y = axial offset (the helicalSweep convention). Below the root
// both profiles continue a little way with STRAIGHT sides into the mating
// solid (the core for a ridge, the bore void for a groove), so the flank/side
// kink sits strictly inside that solid and the boolean against its cylinder
// meets the flanks transversally instead of along an edge.

/** √3/2 — fundamental triangle height per unit pitch. */
const H_PER_P = Math.sqrt(3) / 2;
const TAN30 = Math.tan(Math.PI / 6);
const COS30 = Math.cos(Math.PI / 6);

/** Radial depth of the straight-sided root extension, in pitches. */
const ROOT_EXTENSION = 0.15;
/** Where the straight sides meet the flanks, inside the mating solid, in pitches. */
const KINK_INSET = 0.05;

/** ISO basic minor radius r1 = D/2 − 5H/8. */
export function isoMinorRadius(majorDiameter: number, pitch: number): number {
  return majorDiameter / 2 - (5 / 8) * H_PER_P * pitch;
}

/** Largest clearance an ISO groove profile accepts before adjacent turns of
 *  the groove would touch (kept well below that geometric limit). */
export function maxThreadClearance(pitch: number): number {
  return pitch / 8;
}

/**
 * External ridge profile (the material of a bolt thread outside the minor
 * cylinder), for a helix at `minorRadius(D, P)`.
 */
export function isoExternalRidgeProfile(majorDiameter: number, pitch: number): Array<[number, number]> {
  const rMin = isoMinorRadius(majorDiameter, pitch);
  const rMaj = majorDiameter / 2;
  const halfWidth = (r: number) => (3 / 8) * pitch - (r - rMin) * TAN30;
  const rKink = rMin - KINK_INSET * pitch;
  const rIn = rMin - ROOT_EXTENSION * pitch;
  const x = (r: number) => r - rMin;
  return [
    [x(rIn), -halfWidth(rKink)],
    [x(rKink), -halfWidth(rKink)],
    [x(rMaj), -halfWidth(rMaj)],
    [x(rMaj), halfWidth(rMaj)],
    [x(rKink), halfWidth(rKink)],
    [x(rIn), halfWidth(rKink)],
  ];
}

/**
 * Internal thread groove (the void cut into a nut beyond its bore) with
 * `clearance`, for a helix at the bore radius `minorRadius(D, P) + clearance`.
 */
export function isoInternalGrooveProfile(
  majorDiameter: number,
  pitch: number,
  clearance: number,
): Array<[number, number]> {
  const rMin = isoMinorRadius(majorDiameter, pitch);
  const rBore = rMin + clearance;
  const rMaj = majorDiameter / 2 + clearance;
  // Basic flank half-width, pushed out by the clearance measured normal to the
  // 30° flank (an axial shift of c / cos 30°).
  const halfWidth = (r: number) => (3 / 8) * pitch - (r - rMin) * TAN30 + clearance / COS30;
  const rKink = rBore - KINK_INSET * pitch;
  const rIn = rBore - ROOT_EXTENSION * pitch;
  const x = (r: number) => r - rBore;
  return [
    [x(rIn), -halfWidth(rKink)],
    [x(rKink), -halfWidth(rKink)],
    [x(rMaj), -halfWidth(rMaj)],
    [x(rMaj), halfWidth(rMaj)],
    [x(rKink), halfWidth(rKink)],
    [x(rIn), halfWidth(rKink)],
  ];
}

/** Largest axial half-extent of a profile polygon. */
export function profileHalfExtent(profile: ReadonlyArray<readonly [number, number]>): number {
  return Math.max(...profile.map(([, y]) => Math.abs(y)));
}
