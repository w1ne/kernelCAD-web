// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Hand-entered standard dimensions for the fastener table test.
// This file must not import the family table. Values are nominal table
// figures, not certified measurements.
//
// ISO 261 coarse pitch.
// ISO 4762 Table 1: dk max, k max.
// ISO 7380-1 Table 1: dk max, k max. Stocked through M10.
// ISO 10642:2004 Table 1 for stocked M3–M12: theoretical dk max, k max,
//   reference thread length b, socket s nominal and t min. The 2026 edition's
//   dimension tables were not used. Its public scope is M2–M20, and its steel
//   class marking (a leading zero) is the callout only.
//   Cross-check 2026-11-17, no table text copied: Fuller Fasteners ISO 10642
//   specification (dk, k, s, t for M3–M12; their b is three length bands, and
//   the 125 < l ≤ 200 band equals this b for M6, M8, M10 and M12) and
//   Westfield Fasteners ISO 10642 table (Standards/ScrewBolt-SHCsk-M.html:
//   dk, k, b, s and t for M3–M12).
//   partialLength is a stocked length whose modeled thread length is b.
//   fullLength is a stocked length that stays threaded to the head.
// ISO 4014:2022 Tables 1–2 and ISO 4017: s nom, k nom.
//   ISO 4014 dw min is the 2022 value (M5 is 7.20). ISO 4017 M5 dw min stays 6.88.
//   Stocked ISO 4014 lengths are product grade A, between the stepped lines,
//   l ≤ 10d. b for every stocked length is 2d+6 because each l is ≤ 125 mm.
// ISO 4032:2023 Table 1: s nom and m max. mMin is the table minimum for
//   M5–M12. The solid uses m. Sizes below M5 are Annex A; their m values
//   stay the stocked m max figures.
// ISO 7089: outside diameter, inside diameter, thickness.

export interface HeadRow { thread: string; d: number; k: number }
/** ISO 10642:2004 Table 1 row. `d` is theoretical dk max. `t` is t min. */
export interface CountersunkRow extends HeadRow {
  b: number;
  s: number;
  t: number;
  partialLength: number;
  fullLength: number;
}
export interface HexRow { thread: string; s: number; k: number; dw: number }
export interface NutRow { thread: string; s: number; /** m max, the modeled height. */ m: number; /** ISO 4032:2023 Table 1 m min, where read. */ mMin?: number }
export interface WasherRow { thread: string; outside: number; inside: number; t: number }
export interface PartialRow { thread: string; lengths: readonly number[]; b: number }

export const COARSE_PITCH: Readonly<Record<string, number>> = {
  M2: 0.4,
  'M2.5': 0.45,
  M3: 0.5,
  M4: 0.7,
  M5: 0.8,
  M6: 1,
  M8: 1.25,
  M10: 1.5,
  M12: 1.75,
};

export const ISO_4762: readonly HeadRow[] = [
  { thread: 'M2', d: 3.8, k: 2 },
  { thread: 'M2.5', d: 4.5, k: 2.5 },
  { thread: 'M3', d: 5.5, k: 3 },
  { thread: 'M4', d: 7, k: 4 },
  { thread: 'M5', d: 8.5, k: 5 },
  { thread: 'M6', d: 10, k: 6 },
  { thread: 'M8', d: 13, k: 8 },
  { thread: 'M10', d: 16, k: 10 },
  { thread: 'M12', d: 18, k: 12 },
];

export const ISO_7380: readonly HeadRow[] = [
  { thread: 'M3', d: 5.7, k: 1.65 },
  { thread: 'M4', d: 7.6, k: 2.2 },
  { thread: 'M5', d: 9.5, k: 2.75 },
  { thread: 'M6', d: 10.5, k: 3.3 },
  { thread: 'M8', d: 14, k: 4.4 },
  { thread: 'M10', d: 17.5, k: 5.5 },
];

export const ISO_10642: readonly CountersunkRow[] = [
  { thread: 'M3', d: 6.72, k: 1.86, b: 18, s: 2, t: 1.1, partialLength: 25, fullLength: 16 },
  { thread: 'M4', d: 8.96, k: 2.48, b: 20, s: 2.5, t: 1.5, partialLength: 30, fullLength: 16 },
  { thread: 'M5', d: 11.2, k: 3.1, b: 22, s: 3, t: 1.9, partialLength: 30, fullLength: 16 },
  { thread: 'M6', d: 13.44, k: 3.72, b: 24, s: 4, t: 2.2, partialLength: 35, fullLength: 16 },
  { thread: 'M8', d: 17.92, k: 4.96, b: 28, s: 5, t: 3, partialLength: 40, fullLength: 20 },
  { thread: 'M10', d: 22.4, k: 6.2, b: 32, s: 6, t: 3.6, partialLength: 50, fullLength: 25 },
  { thread: 'M12', d: 26.88, k: 7.44, b: 36, s: 8, t: 4.3, partialLength: 60, fullLength: 40 },
];

/** s nom and k nom. dw is ISO 4014:2022 dw min. */
export const ISO_4014_HEAD: readonly HexRow[] = [
  { thread: 'M2', s: 4, k: 1.4, dw: 3.34 },
  { thread: 'M2.5', s: 5, k: 1.7, dw: 4.34 },
  { thread: 'M3', s: 5.5, k: 2, dw: 4.84 },
  { thread: 'M4', s: 7, k: 2.8, dw: 6.2 },
  { thread: 'M5', s: 8, k: 3.5, dw: 7.2 },
  { thread: 'M6', s: 10, k: 4, dw: 8.88 },
  { thread: 'M8', s: 13, k: 5.3, dw: 11.63 },
  { thread: 'M10', s: 16, k: 6.4, dw: 14.63 },
  { thread: 'M12', s: 18, k: 7.5, dw: 16.63 },
];

/** ISO 4017 washer face that must stay distinct from the 2022 ISO 4014 value. */
export const ISO_4017_M5_DW = 6.88;

export const ISO_4014_LENGTHS: readonly PartialRow[] = [
  { thread: 'M2', lengths: [16, 20], b: 10 },
  { thread: 'M2.5', lengths: [16, 20, 25], b: 11 },
  { thread: 'M3', lengths: [20, 25, 30], b: 12 },
  { thread: 'M4', lengths: [25, 30, 35, 40], b: 14 },
  { thread: 'M5', lengths: [25, 30, 35, 40, 45, 50], b: 16 },
  { thread: 'M6', lengths: [30, 35, 40, 45, 50, 55, 60], b: 18 },
  { thread: 'M8', lengths: [40, 45, 50, 55, 60, 65, 70, 80], b: 22 },
  { thread: 'M10', lengths: [45, 50, 55, 60, 65, 70, 80, 90, 100], b: 26 },
  { thread: 'M12', lengths: [50, 55, 60, 65, 70, 80, 90, 100, 110, 120], b: 30 },
];

export const ISO_4032: readonly NutRow[] = [
  { thread: 'M2', s: 4, m: 1.6 },
  { thread: 'M2.5', s: 5, m: 2 },
  { thread: 'M3', s: 5.5, m: 2.4 },
  { thread: 'M4', s: 7, m: 3.2 },
  { thread: 'M5', s: 8, m: 4.7, mMin: 4.4 },
  { thread: 'M6', s: 10, m: 5.2, mMin: 4.9 },
  { thread: 'M8', s: 13, m: 6.8, mMin: 6.44 },
  { thread: 'M10', s: 16, m: 8.4, mMin: 8.04 },
  { thread: 'M12', s: 18, m: 10.8, mMin: 10.37 },
];

export const ISO_7089: readonly WasherRow[] = [
  { thread: 'M2', outside: 5, inside: 2.2, t: 0.3 },
  { thread: 'M2.5', outside: 6, inside: 2.7, t: 0.5 },
  { thread: 'M3', outside: 7, inside: 3.2, t: 0.5 },
  { thread: 'M4', outside: 9, inside: 4.3, t: 0.8 },
  { thread: 'M5', outside: 10, inside: 5.3, t: 1 },
  { thread: 'M6', outside: 12, inside: 6.4, t: 1.6 },
  { thread: 'M8', outside: 16, inside: 8.4, t: 1.6 },
  { thread: 'M10', outside: 20, inside: 10.5, t: 2 },
  { thread: 'M12', outside: 24, inside: 13, t: 2.5 },
];
