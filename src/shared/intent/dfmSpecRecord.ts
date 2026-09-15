// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/dfmSpecRecord.ts
//
// Types for the dfmSpec() top-level API. A dfmSpec feature is a capture-only
// (virtual) node that declares printability gates (minimum wall thickness,
// inter-part clearance, internal-channel topology, and — with
// `process: 'fdm'` — the FDM printability check) for the model. It never
// produces OCCT geometry — the check engine reads the last dfmSpec record
// from the feature graph at evaluate time and enforces the declared gates.

import type { FeatureId } from './types';

export interface DfmChannelSpec {
  /** Assembly part name owning the channel (single-shape scripts: 'shape'). */
  part: string;
  /** Author-facing label, echoed in diagnostics. */
  name: string;
  /** Expected count of distinct mouth openings to the outside. */
  openings: number;
  /** Declares an intentionally sealed internal void (openings is then 0). */
  sealed?: boolean;
}

/** Axis-aligned build directions accepted by `dfmSpec({ buildDirection })`:
 *  the part-local axis that points UP (away from the bed) while printing. */
export type FdmAxisDirection = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

/** Defaults for the FDM printability check (process: 'fdm'). The overhang
 *  and bridge limits are the common FDM design-guide values; the nozzle is
 *  the stock 0.4 mm. */
export const FDM_DEFAULTS = {
  buildDirection: [0, 0, 1] as [number, number, number],
  nozzleMm: 0.4,
  maxOverhangDeg: 45,
  maxBridgeMm: 10,
} as const;

export interface DfmSpec {
  /** mm — minimum printed wall thickness, per non-excluded part. Omit to skip. */
  minWall?: number;
  /** mm — minimum distance between distinct parts. Omit to skip. */
  minClearance?: number;
  /** Also apply minClearance to mates with remaining degrees of freedom.
   *  Fastened mates remain exempt because their contact is checked separately. */
  includeArticulatedMates?: boolean;
  /** Part-name pairs exempt from the clearance check (design-intent contacts). */
  ignore?: ReadonlyArray<readonly [string, string]>;
  /** Non-printed parts (vendor STEP imports, electronics). Skip minWall + void
   *  checks. Supports a trailing-'*' glob per entry ('servo-*'). */
  exclude?: readonly string[];
  channels?: readonly DfmChannelSpec[];
  /** Printing process whose design rules apply. `'fdm'` runs the FDM
   *  printability check (overhangs, bridges, nozzle-relative walls and
   *  features, bed contact, bed fit, orientation ranking). */
  process?: 'fdm';
  /** process 'fdm': part-local direction pointing UP from the bed while
   *  printing — an axis token or a non-zero vector. Default '+z'. The gcode
   *  export places the part in this orientation before slicing. */
  buildDirection?: FdmAxisDirection | readonly [number, number, number];
  /** process 'fdm': nozzle diameter, mm. Walls under 2× and holes/pins under
   *  5× / 7.5× this are flagged. Default 0.4. */
  nozzleMm?: number;
  /** process 'fdm': steepest printable overhang, degrees from vertical
   *  (0 = wall, 90 = flat ceiling). Default 45; 90 disables the overhang
   *  gate (printing with supports). */
  maxOverhangDeg?: number;
  /** process 'fdm': longest printable unsupported bridge span, mm. Default 10. */
  maxBridgeMm?: number;
  /** process 'fdm': bundled printer profile for the bed-fit check (same names
   *  as the gcode export's `options.printer`). Default 'generic-fdm'. */
  printer?: string;
}

/** Normalized FDM settings stored on the record when `process: 'fdm'`. */
export interface DfmFdmMetadata {
  /** Unit vector, part-local frame. */
  buildDirection: [number, number, number];
  nozzleMm: number;
  maxOverhangDeg: number;
  maxBridgeMm: number;
  printer: string;
}

/** Normalized channel entry stored on the record — `sealed` always present. */
export interface DfmChannelMetadata {
  part: string;
  name: string;
  openings: number;
  sealed: boolean;
}

export interface DfmSpecMetadata {
  minWall?: number;
  minClearance?: number;
  includeArticulatedMates: boolean;
  ignore: ReadonlyArray<readonly [string, string]>;
  exclude: readonly string[];
  channels: readonly DfmChannelMetadata[];
  /** Present only when the spec declares `process: 'fdm'`. */
  fdm?: DfmFdmMetadata;
  virtual: true;
}

export interface DfmSpecHandle {
  readonly id: FeatureId;
  readonly metadata: DfmSpecMetadata;
}
