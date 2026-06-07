// src/shared/intent/dfmSpecRecord.ts
//
// Types for the dfmSpec() top-level API. A dfmSpec feature is a capture-only
// (virtual) node that declares printability gates (minimum wall thickness,
// inter-part clearance, internal-channel topology) for the model. It never
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

export interface DfmSpec {
  /** mm — minimum printed wall thickness, per non-excluded part. Omit to skip. */
  minWall?: number;
  /** mm — minimum distance between distinct parts. Omit to skip. */
  minClearance?: number;
  /** Part-name pairs exempt from the clearance check (design-intent contacts). */
  ignore?: ReadonlyArray<readonly [string, string]>;
  /** Non-printed parts (vendor STEP imports, electronics). Skip minWall + void
   *  checks. Supports a trailing-'*' glob per entry ('servo-*'). */
  exclude?: readonly string[];
  channels?: readonly DfmChannelSpec[];
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
  ignore: ReadonlyArray<readonly [string, string]>;
  exclude: readonly string[];
  channels: readonly DfmChannelMetadata[];
  virtual: true;
}

export interface DfmSpecHandle {
  readonly id: FeatureId;
  readonly metadata: DfmSpecMetadata;
}
