// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Stocked fastener lengths and envelope dimensions. Kept out of familyTable.ts
// so that file stays under the max-lines ratchet. Adding a size is a row here,
// not a new function. Values are nominal table geometry, not a certified part.

/** Stocked screw lengths per thread, the standard preferred series (a stocked
 *  subset). A 50 mm M2 is not hardware; per-size lists keep the table honest. */
export const SHCS_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  M2: [4, 5, 6, 8, 10, 12, 16, 20],
  M2_5: [4, 5, 6, 8, 10, 12, 16, 20, 25],
  M3: [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30],
  M4: [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40],
  M5: [5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50],
  M6: [6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60],
  M8: [8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80],
  M10: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100],
  M12: [12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120],
  M16: [16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160],
  M20: [20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200],
};

export const BHCS_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  M3: [5, 6, 8, 10, 12, 14, 16, 18, 20],
  M4: [5, 6, 8, 10, 12, 14, 16, 18, 20, 25],
  M5: [6, 8, 10, 12, 14, 16, 18, 20, 25, 30],
  M6: [6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40],
  M8: [8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50],
  M10: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60],
};

export const FLATHEAD_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  M3: [6, 8, 10, 12, 14, 16, 18, 20, 25],
  M4: [6, 8, 10, 12, 14, 16, 18, 20, 25, 30],
  M5: [6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40],
  M6: [6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50],
  M8: [8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60],
  M10: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80],
  M12: [12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100],
};

/** ISO 4014:2022 product grade A lengths inside the table's partial-thread
 *  range and at or under 10d (Clause 4 note e). M2–M4 from Table 1, M5–M12
 *  from Table 2. Shorter lengths are fully threaded and are ISO 4017, not
 *  rows invented here. M16 and above are in the standard and are not stocked. */
export const HEX_BOLT_PARTIAL_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  M2: [16, 20],
  M2_5: [16, 20, 25],
  M3: [20, 25, 30],
  M4: [25, 30, 35, 40],
  M5: [25, 30, 35, 40, 45, 50],
  M6: [30, 35, 40, 45, 50, 55, 60],
  M8: [40, 45, 50, 55, 60, 65, 70, 80],
  M10: [45, 50, 55, 60, 65, 70, 80, 90, 100],
  M12: [50, 55, 60, 65, 70, 80, 90, 100, 110, 120],
};

export const HEX_BOLT_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  M3: [8, 10, 12, 16, 20, 25, 30],
  M4: [8, 10, 12, 16, 20, 25, 30, 35, 40],
  M5: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50],
  M6: [12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60],
  M8: [16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80],
  M10: [20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100],
  M12: [25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120],
  M16: [30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160],
  M20: [40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200],
};

export const SET_SCREW_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  M3: [4, 5, 6, 8, 10, 12, 16, 20],
  M4: [5, 6, 8, 10, 12, 16, 20, 25],
  M5: [5, 6, 8, 10, 12, 16, 20, 25, 30],
  M6: [6, 8, 10, 12, 16, 20, 25, 30, 35, 40],
  M8: [8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50],
  M10: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60],
  M12: [12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80],
};

/** DIN 975 threaded rod: the stocked cut lengths. */
export const ROD_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  M3: [250, 1000],
  M4: [250, 1000],
  M5: [250, 1000],
  M6: [250, 1000],
  M8: [250, 1000],
  M10: [250, 1000],
  M12: [250, 1000],
};

/** Head diameter dk max and height k max. ISO 4762 Table 1. Keys use '_' for the decimal (M2_5). Nominal, not certified. */
export const SHCS_HEAD: Record<string, { D: number; K: number }> = {
  M2: { D: 3.8, K: 2.0 },
  M2_5: { D: 4.5, K: 2.5 },
  M3: { D: 5.5, K: 3.0 },
  M4: { D: 7.0, K: 4.0 },
  M5: { D: 8.5, K: 5.0 },
  M6: { D: 10.0, K: 6.0 },
  M8: { D: 13.0, K: 8.0 },
  M10: { D: 16.0, K: 10.0 },
  M12: { D: 18.0, K: 12.0 },
  M16: { D: 24.0, K: 16.0 },
  M20: { D: 30.0, K: 20.0 },
};

/** ISO 7380-1 Table 1, dk max and k max. Stocked M3–M10; the standard continues and those further rows are not in this table. */
export const BHCS_HEAD: Record<string, { D: number; K: number }> = {
  M3: { D: 5.7, K: 1.65 },
  M4: { D: 7.6, K: 2.2 },
  M5: { D: 9.5, K: 2.75 },
  M6: { D: 10.5, K: 3.3 },
  M8: { D: 14.0, K: 4.4 },
  M10: { D: 17.5, K: 5.5 },
};

/** ISO 10642:2004 Table 1 90° head, stocked M3–M12. D is theoretical dk max
 *  and K is k max. The public ISO 10642:2026 scope is M2–M20; this library
 *  does not stock the sizes outside M3–M12. The 2026 dimension tables were
 *  not used. Nominal, not certified. */
export const FLATHEAD_HEAD: Record<string, { D: number; K: number }> = {
  M3: { D: 6.72, K: 1.86 },
  M4: { D: 8.96, K: 2.48 },
  M5: { D: 11.2, K: 3.1 },
  M6: { D: 13.44, K: 3.72 },
  M8: { D: 17.92, K: 4.96 },
  M10: { D: 22.4, K: 6.2 },
  M12: { D: 26.88, K: 7.44 },
};

/** Across-corners diameter of a hexagon of across-flats width `s`, mm. */
function hexAcrossCorners(s: number): number {
  return Math.round((2 * s) / Math.sqrt(3) * 1000) / 1000;
}

/** ISO 4017 hex head: S is the across-flats width s nom, K is k nom, D the circumscribed circle. Nominal, not certified. */
export const HEX_BOLT_HEAD: Record<string, { D: number; K: number; S: number }> = {
  M3: { S: 5.5, K: 2.0, D: 6.351 },
  M4: { S: 7.0, K: 2.8, D: 8.083 },
  M5: { S: 8.0, K: 3.5, D: 9.238 },
  M6: { S: 10.0, K: 4.0, D: 11.547 },
  M8: { S: 13.0, K: 5.3, D: 15.011 },
  M10: { S: 16.0, K: 6.4, D: 18.475 },
  M12: { S: 18.0, K: 7.5, D: 20.785 },
  M16: { S: 24.0, K: 10.0, D: 27.713 },
  M20: { S: 30.0, K: 12.5, D: 34.641 },
};

/** ISO 4014:2022 Tables 1 and 2, k nom and s nom. k and s for M3–M12 match
 *  the ISO 4017 head. M2 and M2.5 are Table 1 only. D is the circumscribed
 *  circle of s nom. Nominal, not certified. */
export const HEX_BOLT_PARTIAL_HEAD: Record<string, { D: number; K: number; S: number }> = {
  M2: { S: 4, K: 1.4, D: hexAcrossCorners(4) },
  M2_5: { S: 5, K: 1.7, D: hexAcrossCorners(5) },
  M3: HEX_BOLT_HEAD.M3,
  M4: HEX_BOLT_HEAD.M4,
  M5: HEX_BOLT_HEAD.M5,
  M6: HEX_BOLT_HEAD.M6,
  M8: HEX_BOLT_HEAD.M8,
  M10: HEX_BOLT_HEAD.M10,
  M12: HEX_BOLT_HEAD.M12,
};

/** ISO 4032:2023 style 1 hex nut. `m` is m max, the height the solid uses.
 *  Table 1 (M5 and up, product grade A) m max / m min: M5 4.7/4.4, M6 5.2/4.9,
 *  M8 6.8/6.44, M10 8.4/8.04, M12 10.8/10.37, M16 14.8/14.1. M20 stays at the
 *  stocked m max of 18. Sizes below M5 are Annex A in that edition; M2 1.6,
 *  M2.5 2, M3 2.4 and M4 3.2 remain the m max values already stocked.
 *  m min is lower than the solid and is not a fit ceiling. Nominal, not certified. */
export const HEX_NUT: Record<string, { S: number; m: number }> = {
  M2: { S: 4, m: 1.6 },
  M2_5: { S: 5, m: 2 },
  M3: { S: 5.5, m: 2.4 },
  M4: { S: 7, m: 3.2 },
  M5: { S: 8, m: 4.7 },
  M6: { S: 10, m: 5.2 },
  M8: { S: 13, m: 6.8 },
  M10: { S: 16, m: 8.4 },
  M12: { S: 18, m: 10.8 },
  M16: { S: 24, m: 14.8 },
  M20: { S: 30, m: 18 },
};

export const LOCK_NUT: Record<string, { S: number; m: number }> = {
  M3: { S: 5.5, m: 4.0 },
  M4: { S: 7, m: 5.0 },
  M5: { S: 8, m: 6.0 },
  M6: { S: 10, m: 6.0 },
  M8: { S: 13, m: 8.0 },
  M10: { S: 16, m: 10.0 },
  M12: { S: 18, m: 12.0 },
};

/** ISO 7089 Table 1, product grade A nominal: d1 clearance (Din), d2 outside (Dout), h thickness (t). Nominal, not certified. */
export const FLAT_WASHER: Record<string, { Dout: number; Din: number; t: number }> = {
  M2: { Dout: 5, Din: 2.2, t: 0.3 },
  M2_5: { Dout: 6, Din: 2.7, t: 0.5 },
  M3: { Dout: 7, Din: 3.2, t: 0.5 },
  M4: { Dout: 9, Din: 4.3, t: 0.8 },
  M5: { Dout: 10, Din: 5.3, t: 1.0 },
  M6: { Dout: 12, Din: 6.4, t: 1.6 },
  M8: { Dout: 16, Din: 8.4, t: 1.6 },
  M10: { Dout: 20, Din: 10.5, t: 2.0 },
  M12: { Dout: 24, Din: 13.0, t: 2.5 },
  M16: { Dout: 30, Din: 17.0, t: 3.0 },
  M20: { Dout: 37, Din: 21.0, t: 3.0 },
};

export const LOCK_WASHER: Record<string, { Dout: number; Din: number; t: number }> = {
  M3: { Dout: 6.2, Din: 3.1, t: 0.8 },
  M4: { Dout: 7.6, Din: 4.1, t: 1.0 },
  M5: { Dout: 9.2, Din: 5.1, t: 1.2 },
  M6: { Dout: 11.5, Din: 6.1, t: 1.6 },
  M8: { Dout: 14.8, Din: 8.1, t: 2.0 },
  M10: { Dout: 18.1, Din: 10.2, t: 2.2 },
  M12: { Dout: 21.1, Din: 12.2, t: 2.5 },
};
