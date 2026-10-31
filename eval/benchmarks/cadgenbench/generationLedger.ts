// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/generationLedger.ts
//
// The generation prompt asks the model to write the drawing's primary
// extents (and, when it can compute one, the volume) into a ledger comment.
// After a valid export, compare that ledger with the solid that was actually
// exported. A mismatch is a repair signal for scale, axis-swap, and missing
// stock. A script with no ledger is left alone: the check must not reject a
// valid solid just because the comment is missing.

export interface MeasuredSolid {
  /** Axis-aligned bounding sizes in millimetres, X then Y then Z. */
  extentsMm?: [number, number, number];
  volumeMm3?: number;
}

const LEDGER = /ledger:\s*extents\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)(?:\s*;\s*volume\s+([+-]?\d+(?:\.\d+)?))?/i;

function within(actual: number, expected: number, relative: number, absolute: number): boolean {
  return Math.abs(actual - expected) <= Math.max(absolute, Math.abs(expected) * relative);
}

function fmt(value: number): string {
  return value.toFixed(3);
}

/**
 * Null when the script has no ledger, the export was not measured, or the
 * measured solid agrees with the ledger. Otherwise a repair message that
 * quotes both sides.
 */
export function generationLedgerMismatch(script: string, measured: MeasuredSolid): string | null {
  if (!measured.extentsMm) return null;
  const matches = [...script.matchAll(new RegExp(LEDGER, 'gi'))];
  const match = matches.at(-1);
  if (!match) return null;
  const expected: [number, number, number] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const expectedVolume = match[4] !== undefined ? Number(match[4]) : undefined;
  const [x, y, z] = measured.extentsMm;
  const extentsOk = expected.every((value, i) => within(measured.extentsMm![i], value, 0.02, 0.5));
  const volumeOk =
    expectedVolume === undefined ||
    measured.volumeMm3 === undefined ||
    within(measured.volumeMm3, expectedVolume, 0.05, 1);
  if (extentsOk && volumeOk) return null;
  const parts = [
    `ledger extents ${expected.map(fmt).join(' ')} mm`,
    expectedVolume !== undefined ? `volume ${fmt(expectedVolume)} mm³` : '',
  ].filter(Boolean);
  const actual = [
    `the exported solid measures ${fmt(x)} × ${fmt(y)} × ${fmt(z)} mm`,
    measured.volumeMm3 !== undefined ? `volume ${fmt(measured.volumeMm3)} mm³` : '',
  ].filter(Boolean);
  return `${parts.join(' and ')}, but ${actual.join(' and ')}. Rebuild the solid so the measured bounding box and volume match the drawing; do not only edit the ledger comment.`;
}
