// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Standard-table detail the 'full' fastener geometry draws beyond the
// envelope dimensions in familyTable.ts: hex socket, under-head fillet,
// thread length b, washer face, set-screw point, coarse pitch.

import { isoThreadInfo } from '../threads';

/** Detail dimensions the 'full' geometry draws, nominal values from the
 *  standards' tables (not certified): socket across flats s and depth t
 *  (t min), under-head fillet r (r min) and reference thread length b. */
export const SHCS_DETAIL: Record<string, { s: number; t: number; r: number; b: number }> = {
  // ISO 4762
  M2: { s: 1.5, t: 1.0, r: 0.1, b: 16 },
  M2_5: { s: 2, t: 1.1, r: 0.1, b: 17 },
  M3: { s: 2.5, t: 1.3, r: 0.1, b: 18 },
  M4: { s: 3, t: 2, r: 0.2, b: 20 },
  M5: { s: 4, t: 2.5, r: 0.2, b: 22 },
  M6: { s: 5, t: 3, r: 0.25, b: 24 },
  M8: { s: 6, t: 4, r: 0.4, b: 28 },
  M10: { s: 8, t: 5, r: 0.4, b: 32 },
  M12: { s: 10, t: 6, r: 0.6, b: 36 },
  M16: { s: 14, t: 8, r: 0.6, b: 44 },
  M20: { s: 17, t: 10, r: 0.8, b: 52 },
};

/** ISO 7380-1 button head: socket s, t and fillet r. Fully threaded. */
export const BHCS_DETAIL: Record<string, { s: number; t: number; r: number }> = {
  M3: { s: 2, t: 1.04, r: 0.1 },
  M4: { s: 2.5, t: 1.3, r: 0.2 },
  M5: { s: 3, t: 1.56, r: 0.2 },
  M6: { s: 4, t: 2.08, r: 0.25 },
  M8: { s: 5, t: 2.6, r: 0.4 },
  M10: { s: 6, t: 3.12, r: 0.4 },
};

/** ISO 10642 countersunk: socket s, t and reference thread length b. */
export const FLATHEAD_DETAIL: Record<string, { s: number; t: number; b: number }> = {
  M3: { s: 2, t: 1.1, b: 18 },
  M4: { s: 2.5, t: 1.5, b: 20 },
  M5: { s: 3, t: 1.9, b: 22 },
  M6: { s: 4, t: 2.2, b: 24 },
  M8: { s: 5, t: 3.0, b: 28 },
  M10: { s: 6, t: 3.6, b: 32 },
  M12: { s: 8, t: 4.3, b: 36 },
};

/** ISO 4017 hex head (fully threaded): washer face dw min and c max, and
 *  the under-head fillet r min. */
export const HEX_BOLT_DETAIL: Record<string, { dw: number; c: number; r: number }> = {
  M3: { dw: 4.57, c: 0.4, r: 0.1 },
  M4: { dw: 5.88, c: 0.4, r: 0.2 },
  M5: { dw: 6.88, c: 0.5, r: 0.2 },
  M6: { dw: 8.88, c: 0.5, r: 0.25 },
  M8: { dw: 11.63, c: 0.6, r: 0.4 },
  M10: { dw: 14.63, c: 0.6, r: 0.4 },
  M12: { dw: 16.63, c: 0.6, r: 0.6 },
  M16: { dw: 22.49, c: 0.8, r: 0.6 },
  M20: { dw: 28.19, c: 0.8, r: 0.8 },
};

/** ISO 4026 flat-point set screw: socket s, t (long-length t min) and flat
 *  point diameter dp max. */
export const SET_SCREW_DETAIL: Record<string, { s: number; t: number; dp: number }> = {
  M3: { s: 1.5, t: 1.2, dp: 2.0 },
  M4: { s: 2, t: 1.5, dp: 2.5 },
  M5: { s: 2.5, t: 2.0, dp: 3.5 },
  M6: { s: 3, t: 2.0, dp: 4.0 },
  M8: { s: 4, t: 3.0, dp: 5.5 },
  M10: { s: 5, t: 4.0, dp: 7.0 },
  M12: { s: 6, t: 4.8, dp: 8.5 },
};

/** Detail the 'full' geometry needs beyond the envelope dims. */
export interface FastenerIsoDims {
  /** ISO 261 coarse pitch. */
  pitchMm: number;
  /** Threaded length measured from the tip (screws, rods). */
  threadLengthMm?: number;
  socketAcrossFlatsMm?: number;
  socketDepthMm?: number;
  underHeadFilletMm?: number;
  washerFaceDiameterMm?: number;
  washerFaceHeightMm?: number;
  pointDiameterMm?: number;
}

/** ISO 261 coarse pitch for a stocked metric size. */
export function coarsePitchOf(thread: string): number {
  return isoThreadInfo(thread.replace('_', '.')).pitch;
}

/** ISO 4762 / ISO 10642 thread length: short screws are threaded to the
 *  head, longer ones carry b from the tip. The standards shade the
 *  full-thread lengths in a table; this reproduces that boundary as "the
 *  plain shank l − b − 5P would be shorter than d / 2". */
export function partialThreadLength(lengthMm: number, b: number, pitch: number, nominalMm: number): number {
  return lengthMm - b - 5 * pitch >= nominalMm / 2 ? b : lengthMm;
}

export function screwIso(family: string, thread: string, lengthMm: number, nominalMm: number): FastenerIsoDims {
  const key = thread.replace('.', '_');
  const pitchMm = coarsePitchOf(thread);
  if (family === 'socket-head-cap-screw') {
    const d = SHCS_DETAIL[key];
    if (d === undefined) return { pitchMm, threadLengthMm: lengthMm };
    return { pitchMm, threadLengthMm: partialThreadLength(lengthMm, d.b, pitchMm, nominalMm), socketAcrossFlatsMm: d.s, socketDepthMm: d.t, underHeadFilletMm: d.r };
  }
  if (family === 'button-head-cap-screw') {
    const d = BHCS_DETAIL[key];
    return d === undefined ? { pitchMm, threadLengthMm: lengthMm } : { pitchMm, threadLengthMm: lengthMm, socketAcrossFlatsMm: d.s, socketDepthMm: d.t, underHeadFilletMm: d.r };
  }
  if (family === 'flat-head-countersunk') {
    const d = FLATHEAD_DETAIL[key];
    if (d === undefined) return { pitchMm, threadLengthMm: lengthMm };
    return { pitchMm, threadLengthMm: partialThreadLength(lengthMm, d.b, pitchMm, nominalMm), socketAcrossFlatsMm: d.s, socketDepthMm: d.t };
  }
  if (family === 'hex-head-bolt') {
    const d = HEX_BOLT_DETAIL[key];
    return d === undefined ? { pitchMm, threadLengthMm: lengthMm } : { pitchMm, threadLengthMm: lengthMm, washerFaceDiameterMm: d.dw, washerFaceHeightMm: d.c, underHeadFilletMm: d.r };
  }
  if (family === 'set-screw') {
    const d = SET_SCREW_DETAIL[key];
    return d === undefined ? { pitchMm, threadLengthMm: lengthMm } : { pitchMm, threadLengthMm: lengthMm, socketAcrossFlatsMm: d.s, socketDepthMm: d.t, pointDiameterMm: d.dp };
  }
  return { pitchMm, threadLengthMm: lengthMm };
}
