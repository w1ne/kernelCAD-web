// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One fastener table. The catalog generator, lib.standard, and lib.part all
// read these rows. Adding a size is a row, not a new function.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { ConnectorEntry } from '../../shared/parts/connectorManifestSchema';

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

/** Head diameter D and height K. Keys use '_' for the decimal (M2_5). */
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

export const BHCS_HEAD: Record<string, { D: number; K: number }> = {
  M3: { D: 5.7, K: 1.65 },
  M4: { D: 7.6, K: 2.2 },
  M5: { D: 9.5, K: 2.75 },
  M6: { D: 10.5, K: 3.3 },
  M8: { D: 14.0, K: 4.4 },
  M10: { D: 17.5, K: 5.5 },
};

export const FLATHEAD_HEAD: Record<string, { D: number; K: number }> = {
  M3: { D: 6.72, K: 1.86 },
  M4: { D: 8.96, K: 2.48 },
  M5: { D: 11.2, K: 3.1 },
  M6: { D: 13.44, K: 3.72 },
  M8: { D: 17.92, K: 4.96 },
  M10: { D: 22.4, K: 6.2 },
  M12: { D: 26.88, K: 7.44 },
};

/** ISO 4017 hex head: S is the across-flats width, D the circumscribed circle. */
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

export const HEX_NUT: Record<string, { S: number; m: number }> = {
  M2: { S: 4, m: 1.6 },
  M2_5: { S: 5, m: 2 },
  M3: { S: 5.5, m: 2.4 },
  M4: { S: 7, m: 3.2 },
  M5: { S: 8, m: 4.0 },
  M6: { S: 10, m: 5.0 },
  M8: { S: 13, m: 6.5 },
  M10: { S: 16, m: 8 },
  M12: { S: 18, m: 10 },
  M16: { S: 24, m: 13 },
  M20: { S: 30, m: 16 },
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

export const FLAT_WASHER: Record<string, { Dout: number; Din: number; t: number }> = {
  M2: { Dout: 5, Din: 2.2, t: 0.3 },
  M2_5: { Dout: 5, Din: 2.7, t: 0.5 },
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

export type PartKind =
  | 'screw'
  | 'nut'
  | 'washer'
  | 't-slot-nut'
  | 'stud'
  | 'flange-nut'
  | 'clamp'
  | 'block';

export type FixtureKind = Extract<PartKind, 't-slot-nut' | 'stud' | 'flange-nut' | 'clamp' | 'block'>;

export interface PartRequest {
  family: string;
  thread?: string;
  lengthMm?: number;
}

export interface ResolvedPart {
  id: string;
  name: string;
  family: string;
  standard?: string;
  category: 'fastener' | 'fixture';
  kind: PartKind;
  thread: string;
  lengthMm: number;
  /** Nominal diameter parsed from the thread, in mm. */
  nominalMm: number;
  headDiameterMm: number;
  headHeightMm: number;
  acrossFlatsMm: number;
  innerDiameterMm: number;
  /** Family-specific envelope dimensions (slot width, clamp length, …). */
  dims?: Record<string, number>;
  tags: string[];
  connectors: ConnectorEntry[];
}

export interface StackRequest {
  thread: string;
  gripMm: number;
  mode?: 'screw' | 'bolt';
}

export interface StackMemberPlan {
  role: 'screw' | 'head-washer' | 'tail-washer' | 'nut';
  part: ResolvedPart;
  /** Shift along +Z after the part is built. Seating face of the stack is z = 0. */
  offsetZ: number;
}

export interface StackPlan {
  lengthMm: number;
  members: StackMemberPlan[];
}

interface HeadDims { D: number; K: number; /** Across-flats width, hex heads only. */ S?: number }
interface NutDims { S: number; m: number }
interface WasherDims { Dout: number; Din: number; t: number }

export type ScrewHeadStyle = 'socket' | 'button' | 'flat' | 'hex' | 'headless';

interface ScrewFamily {
  standard: string;
  idPrefix: string;
  kind: 'screw';
  headStyle: ScrewHeadStyle;
  threads: Record<string, HeadDims>;
  /** thread -> stocked lengths; the standard's preferred series subset. */
  lengths: Record<string, readonly number[]>;
}
interface NutFamily {
  standard: string;
  idPrefix: string;
  kind: 'nut';
  threads: Record<string, NutDims>;
}
interface WasherFamily {
  standard: string;
  idPrefix: string;
  kind: 'washer';
  threads: Record<string, WasherDims>;
}
export interface FixtureFamily {
  /** No `standard`: the stock table holds nominal envelope dimensions for the
   *  classic clamping-kit forms, not certified standard dims. */
  idPrefix: string;
  kind: FixtureKind;
  /** thread -> nominal envelope dimensions. */
  threads: Record<string, Record<string, number>>;
  /** Stocked lengths, clamping studs only. */
  lengths?: Record<string, readonly number[]>;
}
type FamilySpec = ScrewFamily | NutFamily | WasherFamily | FixtureFamily;

const PART_EXAMPLE = "lib.part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 })";
const STACK_EXAMPLE = "lib.stack({ thread: 'M5', gripMm: 10, mode: 'bolt' })";

/** Machining-fixture hardware, keyed by the thread its clamping parts use.
 *  Dimensions are the stock table's envelope values: T-slot nuts follow the
 *  DIN 508 table (a/e/h/k; the envelope length is a stock choice, DIN 508
 *  does not table it) and collar nuts follow the DIN 6331 table (s/m/d1/a),
 *  both read 2026-10-18. Strap clamps and step blocks have no DIN table: their
 *  values stay nominal kit dimensions. Check the supplier drawing before
 *  ordering. */
const FIXTURES: Record<string, FixtureFamily> = {
  't-slot-nut': {
    idPrefix: 'tslot-nut',
    kind: 't-slot-nut',
    // DIN 508: a (slot), e (nut width, min), h (height), k (head height).
    // neckWidth = a min, baseWidth = e min, neck height = k, base = h - k.
    threads: {
      M8: { slotMm: 10, baseWidthMm: 14.5, neckWidthMm: 9.5, baseHeightMm: 6, neckHeightMm: 6, lengthMm: 22 },
      M10: { slotMm: 12, baseWidthMm: 17.5, neckWidthMm: 11.4, baseHeightMm: 7, neckHeightMm: 7, lengthMm: 26 },
      M12: { slotMm: 14, baseWidthMm: 21.5, neckWidthMm: 13.4, baseHeightMm: 8, neckHeightMm: 8, lengthMm: 30 },
    },
  },
  'clamping-stud': {
    idPrefix: 'clamp-stud',
    kind: 'stud',
    // DIN 6379 length series (a stocked subset); the envelope is the nominal
    // thread diameter over that length.
    threads: { M8: {}, M10: {}, M12: {} },
    lengths: { M8: [63, 100], M10: [80, 125], M12: [100, 160] },
  },
  'flange-nut': {
    idPrefix: 'flange-nut',
    kind: 'flange-nut',
    // DIN 6331: s (across flats), m (height), d1 (collar diameter), a (collar
    // height). flangeDiameter/thickness carry d1/a.
    threads: {
      M8: { acrossFlatsMm: 13, heightMm: 12, flangeDiameterMm: 18, flangeThicknessMm: 3.5 },
      M10: { acrossFlatsMm: 16, heightMm: 15, flangeDiameterMm: 22, flangeThicknessMm: 4 },
      M12: { acrossFlatsMm: 18, heightMm: 18, flangeDiameterMm: 25, flangeThicknessMm: 4 },
    },
  },
  'strap-clamp': {
    idPrefix: 'strap-clamp',
    kind: 'clamp',
    threads: {
      M8: { lengthMm: 100, widthMm: 20, thicknessMm: 10, slotWidthMm: 10, slotLengthMm: 36, slotCenterMm: 38 },
      M10: { lengthMm: 125, widthMm: 22, thicknessMm: 12, slotWidthMm: 12, slotLengthMm: 45, slotCenterMm: 48 },
      M12: { lengthMm: 160, widthMm: 25, thicknessMm: 14, slotWidthMm: 14, slotLengthMm: 56, slotCenterMm: 60 },
    },
  },
  'step-block': {
    idPrefix: 'step-block',
    kind: 'block',
    threads: {
      M8: { lengthMm: 60, widthMm: 20, riseMm: 10, runMm: 15, steps: 4 },
      M10: { lengthMm: 72, widthMm: 24, riseMm: 12, runMm: 18, steps: 4 },
      M12: { lengthMm: 88, widthMm: 28, riseMm: 15, runMm: 22, steps: 4 },
    },
  },
};

const FAMILIES: Record<string, FamilySpec> = {
  'socket-head-cap-screw': { standard: 'ISO 4762', idPrefix: 'iso-4762', kind: 'screw', headStyle: 'socket', threads: SHCS_HEAD, lengths: SHCS_LENGTHS },
  'button-head-cap-screw': { standard: 'ISO 7380', idPrefix: 'iso-7380', kind: 'screw', headStyle: 'button', threads: BHCS_HEAD, lengths: BHCS_LENGTHS },
  'flat-head-countersunk': { standard: 'ISO 10642', idPrefix: 'iso-10642', kind: 'screw', headStyle: 'flat', threads: FLATHEAD_HEAD, lengths: FLATHEAD_LENGTHS },
  'hex-head-bolt': { standard: 'ISO 4017', idPrefix: 'iso-4017', kind: 'screw', headStyle: 'hex', threads: HEX_BOLT_HEAD, lengths: HEX_BOLT_LENGTHS },
  'set-screw': { standard: 'ISO 4026', idPrefix: 'iso-4026', kind: 'screw', headStyle: 'headless', threads: setScrewThreads(), lengths: SET_SCREW_LENGTHS },
  'threaded-rod': { standard: 'DIN 975', idPrefix: 'din-975', kind: 'screw', headStyle: 'headless', threads: rodThreads(), lengths: ROD_LENGTHS },
  'hex-nut': { standard: 'ISO 4032', idPrefix: 'iso-4032', kind: 'nut', threads: HEX_NUT },
  'lock-nut': { standard: 'DIN 985', idPrefix: 'din-985', kind: 'nut', threads: LOCK_NUT },
  'flat-washer': { standard: 'ISO 7089', idPrefix: 'iso-7089', kind: 'washer', threads: FLAT_WASHER },
  'lock-washer': { standard: 'DIN 127B', idPrefix: 'din-127b', kind: 'washer', threads: LOCK_WASHER },
  ...FIXTURES,
};

/** Headless families carry no head dims; the row only has to exist. */
function setScrewThreads(): Record<string, HeadDims> {
  return Object.fromEntries(Object.keys(SET_SCREW_LENGTHS).map((key) => [key, { D: 0, K: 0 }]));
}

function rodThreads(): Record<string, HeadDims> {
  return Object.fromEntries(Object.keys(ROD_LENGTHS).map((key) => [key, { D: 0, K: 0 }]));
}

/** Machining-fixture family names, for the catalog generator and docs. */
export const FIXTURE_FAMILY_NAMES: readonly string[] = Object.keys(FIXTURES);

/** Stocked variants of one fixture family, for the catalog generator. */
export function fixtureVariants(family: string): Array<{ thread: string; lengthMm?: number }> {
  const spec = FIXTURES[family];
  if (spec === undefined) {
    invalidArgs({
      api: 'lib.part',
      path: 'family',
      got: family,
      requires: `a stocked fixture family: ${FIXTURE_FAMILY_NAMES.join(', ')}`,
      example: "lib.part({ family: 't-slot-nut', thread: 'M10' })",
    });
  }
  return Object.keys(spec.threads).flatMap((key) => {
    const thread = key.replace('_', '.');
    const lengths = spec.lengths?.[key];
    return lengths === undefined ? [{ thread }] : lengths.map((lengthMm) => ({ thread, lengthMm }));
  });
}

export function isFixtureKind(kind: PartKind): kind is FixtureKind {
  return (
    kind === 't-slot-nut' ||
    kind === 'stud' ||
    kind === 'flange-nut' ||
    kind === 'clamp' ||
    kind === 'block'
  );
}

function isFixtureSpec(spec: FamilySpec): spec is FixtureFamily {
  return isFixtureKind(spec.kind);
}

export function threadKey(thread: string): string {
  return thread.replace('.', '_');
}

export function threadSlug(thread: string): string {
  return thread.toLowerCase().replace('.', '-');
}

function nominalOf(thread: string): number {
  const n = Number.parseFloat(thread.slice(1));
  if (Number.isFinite(n) && n > 0) return n;
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'thread',
    got: thread,
    requires: 'a metric size like M3, M4, or M5',
    example: PART_EXAMPLE,
  });
}

function requireFamily(family: string): FamilySpec {
  const spec = FAMILIES[family];
  if (spec) return spec;
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'family',
    got: family,
    requires: `one of: ${Object.keys(FAMILIES).join(', ')}`,
    example: PART_EXAMPLE,
  });
}

function stockedThreads(threads: Record<string, unknown>): string {
  return Object.keys(threads).map((key) => key.replace('_', '.')).join(', ');
}

function requireThread(request: PartRequest, stocked: string): string {
  if (request.thread) return request.thread;
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'thread',
    gotText: 'omitted',
    requires: `a stocked thread for ${request.family}: ${stocked}`,
    example: PART_EXAMPLE,
  });
}

function requireRow<T>(threads: Record<string, T>, thread: string, family: string): T {
  const dims = threads[threadKey(thread)];
  if (dims) return dims;
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'thread',
    got: thread,
    requires: `a stocked thread for ${family}: ${stockedThreads(threads)}`,
    example: PART_EXAMPLE,
  });
}

function exactStocked(lengths: readonly number[], requested: number, label: string): number {
  if (lengths.some((length) => length === requested)) return requested;
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'lengthMm',
    got: requested,
    requires: `a stocked length for ${label}: ${lengths.join(', ')}`,
    unit: 'mm',
    example: PART_EXAMPLE,
  });
}

function screwLength(lengths: readonly number[], request: PartRequest, thread: string): number {
  if (request.lengthMm !== undefined) return exactStocked(lengths, request.lengthMm, `${request.family} ${thread}`);
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'lengthMm',
    gotText: 'omitted',
    requires: `a stocked length for ${request.family} ${thread}: ${lengths.join(', ')}`,
    unit: 'mm',
    example: PART_EXAMPLE,
  });
}

/** The stocked lengths of one screw family for one thread. */
function lengthsFor(spec: ScrewFamily, thread: string): readonly number[] {
  const lengths = spec.lengths[threadKey(thread)];
  if (lengths !== undefined) return lengths;
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'thread',
    got: thread,
    requires: `a stocked thread for this family: ${stockedThreads(spec.threads)}`,
    example: PART_EXAMPLE,
  });
}

/** Public door for callers that plan lengths (lib.insert's blind-hole rule). */
export function stockedScrewLengths(family: string, thread: string): readonly number[] {
  return lengthsFor(requireScrewFamily(family), thread);
}

function screwConnectors(
  style: ScrewHeadStyle,
  dims: HeadDims,
  lengthMm: number,
): ConnectorEntry[] {
  if (style === 'headless') {
    return [
      { name: 'first-end', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
      { name: 'second-end', type: 'frame', origin: [0, 0, -lengthMm], normal: [0, 0, -1] },
      { name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ];
  }
  return [
    { name: 'head-bearing', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
    { name: 'thread-tip', type: 'axis', origin: [0, 0, -lengthMm], axis: [0, 0, 1] },
    { name: 'head-top', type: 'frame', origin: [0, 0, dims.K], normal: [0, 0, 1] },
  ];
}

function partId(spec: FamilySpec, thread: string, lengthMm: number): string {
  const slug = threadSlug(thread);
  return spec.kind === 'screw' ? `${spec.idPrefix}-${slug}x${lengthMm}` : `${spec.idPrefix}-${slug}`;
}

function screwPart(
  request: PartRequest,
  spec: ScrewFamily,
  dims: HeadDims,
  thread: string,
  nominalMm: number,
): ResolvedPart {
  const lengthMm = screwLength(lengthsFor(spec, thread), request, thread);
  return {
    id: partId(spec, thread, lengthMm),
    name: `${thread} × ${lengthMm} ${request.family} (${spec.standard})`,
    family: request.family,
    standard: spec.standard,
    category: 'fastener',
    kind: 'screw',
    thread,
    lengthMm,
    nominalMm,
    headDiameterMm: dims.D,
    headHeightMm: dims.K,
    acrossFlatsMm: dims.S ?? 0,
    innerDiameterMm: 0,
    tags: ['screw', 'metric', thread],
    connectors: screwConnectors(spec.headStyle, dims, lengthMm),
  };
}

function nutPart(
  request: PartRequest,
  spec: NutFamily,
  dims: NutDims,
  thread: string,
  nominalMm: number,
): ResolvedPart {
  return {
    id: partId(spec, thread, 0),
    name: `${thread} ${request.family} (${spec.standard})`,
    family: request.family,
    standard: spec.standard,
    category: 'fastener',
    kind: 'nut',
    thread,
    lengthMm: 0,
    nominalMm,
    headDiameterMm: 0,
    headHeightMm: dims.m,
    acrossFlatsMm: dims.S,
    innerDiameterMm: nominalMm,
    tags: ['nut', 'metric', thread],
    connectors: [
      { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
      { name: 'top-face', type: 'frame', origin: [0, 0, dims.m], normal: [0, 0, 1] },
      { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ],
  };
}

function washerPart(
  request: PartRequest,
  spec: WasherFamily,
  dims: WasherDims,
  thread: string,
  nominalMm: number,
): ResolvedPart {
  return {
    id: partId(spec, thread, 0),
    name: `${thread} ${request.family} (${spec.standard})`,
    family: request.family,
    standard: spec.standard,
    category: 'fastener',
    kind: 'washer',
    thread,
    lengthMm: 0,
    nominalMm,
    headDiameterMm: dims.Dout,
    headHeightMm: dims.t,
    acrossFlatsMm: 0,
    innerDiameterMm: dims.Din,
    tags: ['washer', 'metric', thread],
    connectors: [
      { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
      { name: 'top-face', type: 'frame', origin: [0, 0, dims.t], normal: [0, 0, 1] },
      { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ],
  };
}

/** Connector frames for one fixture component; the names are the placement
 *  vocabulary `examples/fixture/*` and mate refs use. */
function fixtureConnectors(
  kind: FixtureKind,
  dims: Record<string, number>,
  lengthMm: number,
): ConnectorEntry[] {
  if (kind === 'stud') {
    return [
      { name: 'table-end', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
      { name: 'clamp-end', type: 'frame', origin: [0, 0, lengthMm], normal: [0, 0, 1] },
      { name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ];
  }
  if (kind === 'flange-nut') {
    return [
      { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
      { name: 'top-face', type: 'frame', origin: [0, 0, dims.heightMm ?? 0], normal: [0, 0, 1] },
      { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ];
  }
  if (kind === 't-slot-nut') {
    return [
      { name: 'mating-face', type: 'frame', origin: [0, 0, -(dims.neckHeightMm ?? 0)], normal: [0, 0, 1] },
      { name: 'top-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, 1] },
      { name: 'thread-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ];
  }
  if (kind === 'clamp') {
    const center = dims.slotCenterMm ?? 0;
    return [
      { name: 'nose-bearing', type: 'frame', origin: [-center, 0, 0], normal: [0, 0, -1] },
      { name: 'tail-bearing', type: 'frame', origin: [(dims.lengthMm ?? 0) - center, 0, 0], normal: [0, 0, -1] },
      { name: 'slot-axis', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
      { name: 'top-face', type: 'frame', origin: [(dims.lengthMm ?? 0) / 2 - center, 0, dims.thicknessMm ?? 0], normal: [0, 0, 1] },
    ];
  }
  const steps = Math.max(1, Math.round(dims.steps ?? 1));
  const run = dims.runMm ?? 0;
  const rise = dims.riseMm ?? 0;
  const half = (dims.lengthMm ?? 0) / 2;
  return [
    { name: 'base-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
    ...Array.from({ length: steps }, (_, index) => ({
      name: `step-${index + 1}`,
      type: 'frame' as const,
      origin: [-half + (index + 0.5) * run, 0, (index + 1) * rise] as [number, number, number],
      normal: [0, 0, 1] as [number, number, number],
    })),
  ];
}

const FIXTURE_LABELS: Record<FixtureKind, string> = {
  't-slot-nut': 't-slot nut',
  stud: 'clamping stud',
  'flange-nut': 'flange nut',
  clamp: 'strap clamp',
  block: 'step block',
};

function fixturePart(request: PartRequest, spec: FixtureFamily): ResolvedPart {
  const thread = requireThread(request, stockedThreads(spec.threads));
  const key = threadKey(thread);
  const dims = { ...requireRow(spec.threads, thread, request.family) };
  const lengths = spec.lengths?.[key];
  const lengthMm = lengths === undefined ? 0 : screwLength(lengths, request, thread);
  if (lengths !== undefined) dims.lengthMm = lengthMm;
  const nominalMm = nominalOf(thread);
  const label = FIXTURE_LABELS[spec.kind];
  return {
    id: lengths === undefined
      ? `${spec.idPrefix}-${threadSlug(thread)}`
      : `${spec.idPrefix}-${threadSlug(thread)}x${lengthMm}`,
    name:
      lengths === undefined
        ? `${thread} ${label}`
        : `${thread} \u00d7 ${lengthMm} ${label}`,
    family: request.family,
    category: 'fixture',
    kind: spec.kind,
    thread,
    lengthMm,
    nominalMm,
    headDiameterMm: 0,
    headHeightMm: 0,
    acrossFlatsMm: dims.acrossFlatsMm ?? 0,
    innerDiameterMm: nominalMm,
    dims,
    tags: ['fixture', 'workholding', spec.kind, 'metric', thread],
    connectors: fixtureConnectors(spec.kind, dims, lengthMm),
  };
}

export function resolvePart(request: PartRequest): ResolvedPart {
  const spec = requireFamily(request.family);
  if (isFixtureSpec(spec)) return fixturePart(request, spec);
  const thread = requireThread(request, stockedThreads(spec.threads));
  const nominalMm = nominalOf(thread);
  if (spec.kind === 'screw') {
    return screwPart(request, spec, requireRow(spec.threads, thread, request.family), thread, nominalMm);
  }
  if (spec.kind === 'nut') {
    return nutPart(request, spec, requireRow(spec.threads, thread, request.family), thread, nominalMm);
  }
  return washerPart(request, spec, requireRow(spec.threads, thread, request.family), thread, nominalMm);
}

function shortestAtLeast(lengths: readonly number[], needed: number, label: string): number {
  const hit = lengths.find((length) => length + 1e-9 >= needed);
  if (hit !== undefined) return hit;
  const longest = lengths[lengths.length - 1];
  invalidArgs({
    api: 'lib.stack({ thread, gripMm, mode })',
    path: 'gripMm',
    got: needed,
    requires: `a grip that an ${label} can reach; longest stocked length is ${longest}`,
    unit: 'mm',
    example: STACK_EXAMPLE,
  });
}

function stackMode(mode: StackRequest['mode']): 'screw' | 'bolt' {
  const resolved = mode ?? 'bolt';
  if (resolved === 'screw' || resolved === 'bolt') return resolved;
  invalidArgs({
    api: 'lib.stack({ thread, gripMm, mode })',
    path: 'mode',
    got: mode,
    requires: '"screw" or "bolt"',
    example: STACK_EXAMPLE,
  });
}

function positiveGrip(gripMm: number): number {
  if (gripMm > 0) return gripMm;
  invalidArgs({
    api: 'lib.stack({ thread, gripMm, mode })',
    path: 'gripMm',
    got: gripMm,
    requires: 'the thickness the screw passes through, greater than 0',
    unit: 'mm',
    example: STACK_EXAMPLE,
  });
}

function requireScrewFamily(family: string): ScrewFamily {
  const spec = requireFamily(family);
  if (spec.kind !== 'screw') {
    invalidArgs({
      api: 'lib.stack({ thread, gripMm, mode })',
      path: 'family',
      got: family,
      requires: `a stocked screw family for the stack: ${Object.entries(FAMILIES)
        .filter(([, candidate]) => candidate.kind === 'screw')
        .map(([name]) => name)
        .join(', ')}`,
      example: STACK_EXAMPLE,
    });
  }
  return spec;
}

interface StackWear {
  headWasher?: ResolvedPart;
  tailWasher?: ResolvedPart;
  nut?: ResolvedPart;
}

/** The washers and nut a stack mode adds; a flat head takes no head washer
 *  because it seats inside its countersink. */
function stackWear(family: string, mode: 'screw' | 'bolt', thread: string): StackWear {
  if (mode !== 'bolt') return {};
  return {
    ...(family !== 'flat-head-countersunk'
      ? { headWasher: resolvePart({ family: 'flat-washer', thread }) }
      : {}),
    tailWasher: resolvePart({ family: 'flat-washer', thread }),
    nut: resolvePart({ family: 'hex-nut', thread }),
  };
}

function stackMembersFor(wear: StackWear, screw: ResolvedPart, gripMm: number): StackMemberPlan[] {
  const headT = wear.headWasher?.headHeightMm ?? 0;
  const tailT = wear.tailWasher?.headHeightMm ?? 0;
  const nutT = wear.nut?.headHeightMm ?? 0;
  const members: StackMemberPlan[] = [];
  if (wear.headWasher) members.push({ role: 'head-washer', part: wear.headWasher, offsetZ: 0 });
  members.push({ role: 'screw', part: screw, offsetZ: headT });
  if (wear.tailWasher && wear.nut) {
    members.push({ role: 'tail-washer', part: wear.tailWasher, offsetZ: -(gripMm + tailT) });
    members.push({ role: 'nut', part: wear.nut, offsetZ: -(gripMm + tailT + nutT) });
  }
  return members;
}

/** Screw, washer under the head, and for mode 'bolt' a washer and nut on the far side.
 *  Socket-head is the `lib.stack` front door; `planStackFor` serves any stocked
 *  screw family (a flat head takes no washer under its countersunk head). */
export function planStack(request: StackRequest): StackPlan {
  return planStackFor('socket-head-cap-screw', request);
}

export function planStackFor(family: string, request: StackRequest): StackPlan {
  const mode = stackMode(request.mode);
  const gripMm = positiveGrip(request.gripMm);
  const spec = requireScrewFamily(family);
  const wear = stackWear(family, mode, request.thread);
  const tailT = wear.tailWasher?.headHeightMm ?? 0;
  const nutT = wear.nut?.headHeightMm ?? 0;
  const needed = gripMm + (wear.tailWasher ? tailT + nutT : 0);
  const lengthMm = shortestAtLeast(lengthsFor(spec, request.thread), needed, `${family} ${request.thread}`);
  const screw = resolvePart({ family, thread: request.thread, lengthMm });
  return { lengthMm, members: stackMembersFor(wear, screw, gripMm) };
}
