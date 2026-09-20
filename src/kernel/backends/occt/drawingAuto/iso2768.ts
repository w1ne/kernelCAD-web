// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/iso2768.ts

import type { Iso2768Class } from './options';

/** ISO 2768-1 permissible deviation for the finest range (0.5–3 mm). */
export const POSITION_ZONE: Record<Iso2768Class, number> = {
  'ISO2768-f': 0.05,
  'ISO2768-m': 0.1,
  'ISO2768-c': 0.2,
};

/** ISO 2768-2 Table 1 straightness and flatness: [up to length, H, K, L]. */
const FLATNESS_TABLE: ReadonlyArray<readonly [number, number, number, number]> = [
  [10, 0.02, 0.05, 0.1],
  [30, 0.05, 0.1, 0.2],
  [100, 0.1, 0.2, 0.4],
  [300, 0.2, 0.4, 0.8],
  [1000, 0.3, 0.6, 1.2],
  [3000, 0.4, 0.8, 1.6],
];

const GEOMETRIC_CLASS: Record<Iso2768Class, { letter: 'H' | 'K' | 'L'; column: 1 | 2 | 3; linear: string }> = {
  'ISO2768-f': { letter: 'H', column: 1, linear: 'f' },
  'ISO2768-m': { letter: 'K', column: 2, linear: 'm' },
  'ISO2768-c': { letter: 'L', column: 3, linear: 'c' },
};

export function flatnessFor(cls: Iso2768Class, longestSide: number): number {
  const col = GEOMETRIC_CLASS[cls].column;
  const row = FLATNESS_TABLE.find(r => longestSide <= r[0]) ?? FLATNESS_TABLE[FLATNESS_TABLE.length - 1];
  return row[col];
}

export function generalToleranceNote(cls: Iso2768Class): string {
  const g = GEOMETRIC_CLASS[cls];
  return `ISO 2768-${g.linear}${g.letter}`;
}
