// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One fastener table. The catalog generator, lib.standard, and lib.part all
// read these rows. Stocked lengths and envelope dimensions live in
// fastenerStockTables.ts. Adding a size is a row, not a new function.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { ConnectorEntry } from '../../shared/parts/connectorManifestSchema';
import { coarsePitchOf, iso4014ReferenceThreadMm, screwIso, type FastenerIsoDims } from './fastenerIsoDims';
import {
  canonicalFastenerFamily,
  dinAliasTag,
  fastenerCallout,
  kindFromFamily,
} from './fastenerDesignation';
import {
  BHCS_HEAD,
  BHCS_LENGTHS,
  FLATHEAD_HEAD,
  FLATHEAD_LENGTHS,
  FLAT_WASHER,
  HEX_BOLT_HEAD,
  HEX_BOLT_LENGTHS,
  HEX_BOLT_PARTIAL_HEAD,
  HEX_BOLT_PARTIAL_LENGTHS,
  HEX_NUT,
  LOCK_NUT,
  LOCK_WASHER,
  ROD_LENGTHS,
  SET_SCREW_LENGTHS,
  SHCS_HEAD,
  SHCS_LENGTHS,
} from './fastenerStockTables';

export type { FastenerIsoDims };

export {
  BHCS_HEAD,
  BHCS_LENGTHS,
  FLATHEAD_HEAD,
  FLATHEAD_LENGTHS,
  FLAT_WASHER,
  HEX_BOLT_HEAD,
  HEX_BOLT_LENGTHS,
  HEX_BOLT_PARTIAL_HEAD,
  HEX_BOLT_PARTIAL_LENGTHS,
  HEX_NUT,
  LOCK_NUT,
  LOCK_WASHER,
  ROD_LENGTHS,
  SET_SCREW_LENGTHS,
  SHCS_HEAD,
  SHCS_LENGTHS,
} from './fastenerStockTables';

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

/** Geometric detail of a standard fastener: `'full'` (default) draws the
 *  head form, hex socket, chamfers and modeled threads; `'envelope'` the
 *  nominal solid, for big assemblies. Fit and clash checks always measure
 *  the envelope. */
export type FastenerDetail = 'full' | 'envelope';

/** Validate a `detail` option; omitted means `'full'`. */
export function resolveDetail(detail: unknown, api: string): FastenerDetail {
  if (detail === undefined || detail === 'full') return 'full';
  if (detail === 'envelope') return 'envelope';
  invalidArgs({
    api,
    path: 'detail',
    got: detail,
    requires: "'full' (head form, socket, chamfers, modeled threads) or 'envelope' (nominal solid, fast)",
    example: "lib.part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16, detail: 'envelope' })",
  });
}

export interface PartRequest {
  family: string;
  thread?: string;
  lengthMm?: number;
  /** Geometric detail; default `'full'`. */
  detail?: FastenerDetail;
  /** Ordering property class. ISO 10642 steel classes gain a leading zero (8.8 → 08.8). */
  propertyClass?: string;
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
  /** Standard-table detail for the 'full' geometry (threaded fasteners). */
  iso?: FastenerIsoDims;
  tags: string[];
  connectors: ConnectorEntry[];
  /** Canonical ordering designation, for example `ISO 4762 M5x16 - 8.8`. */
  designation?: string;
}

export interface StackRequest {
  thread: string;
  gripMm: number;
  mode?: 'screw' | 'bolt';
  /** Geometric detail of every member; default `'full'`. */
  detail?: FastenerDetail;
  /** Bolt mode: whole thread pitches the tip must reach past the nut's outer
   *  face; default 2. */
  protrusionPitches?: number;
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
  /** Bolt mode: tip distance past the nut's outer face, mm. */
  protrusionMm?: number;
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
  'hex-head-bolt-partial': { standard: 'ISO 4014', idPrefix: 'iso-4014', kind: 'screw', headStyle: 'hex', threads: HEX_BOLT_PARTIAL_HEAD, lengths: HEX_BOLT_PARTIAL_LENGTHS },
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
  // Public scope of ISO 10642:2026 (M2–M20). Not a reading of its dimension tables.
  const libraryLimit = family === 'flat-head-countersunk'
    ? ' ISO 10642:2026 covers M2 to M20; this library stocks M3 to M12 only.'
    : '';
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'thread',
    got: thread,
    requires: `a stocked thread for ${family}: ${stockedThreads(threads)}.${libraryLimit}`,
    example: PART_EXAMPLE,
  });
}

const PROPERTY_CLASS = /^[A-Za-z0-9][A-Za-z0-9.-]{0,15}$/;
const PART_CLASS_EXAMPLE = "lib.part({ family: 'flat-head-countersunk', thread: 'M5', lengthMm: 16, propertyClass: '10.9' })";

function assertPropertyClass(request: PartRequest, kind: 'screw' | 'nut' | 'washer'): void {
  const value = request.propertyClass;
  if (value === undefined) return;
  if (kind !== 'screw') {
    invalidArgs({
      api: 'lib.part({ family, thread, lengthMm, propertyClass })',
      path: 'propertyClass',
      got: value,
      requires: 'a screw family. Nuts and washers keep their own callout',
      example: PART_CLASS_EXAMPLE,
    });
  }
  if (!PROPERTY_CLASS.test(value)) {
    invalidArgs({
      api: 'lib.part({ family, thread, lengthMm, propertyClass })',
      path: 'propertyClass',
      got: value,
      requires: 'a property class token such as 8.8, 10.9 or 12.9. ISO 10642 writes a steel class with a leading zero, so 10.9 becomes 010.9',
      example: PART_CLASS_EXAMPLE,
    });
  }
}

function exactStocked(lengths: readonly number[], requested: number, label: string, why?: string): number {
  if (lengths.some((length) => length === requested)) return requested;
  const base = `a stocked length for ${label}: ${lengths.join(', ')}`;
  invalidArgs({
    api: 'lib.part({ family, thread, lengthMm })',
    path: 'lengthMm',
    got: requested,
    requires: why === undefined ? base : `${base}. ${why}`,
    unit: 'mm',
    example: PART_EXAMPLE,
  });
}

function screwLength(lengths: readonly number[], request: PartRequest, thread: string): number {
  if (request.lengthMm !== undefined) {
    const belowPartial = request.family === 'hex-head-bolt-partial' && request.lengthMm < lengths[0];
    const why = belowPartial
      ? `${request.lengthMm} mm is below the shortest partial-thread length in ISO 4014:2022; a fully threaded hexagon head screw of this size is ISO 4017 (family hex-head-bolt)`
      : undefined;
    return exactStocked(lengths, request.lengthMm, `${request.family} ${thread}`, why);
  }
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

function fastenerTags(kind: 'screw' | 'nut' | 'washer', standard: string, thread: string): string[] {
  const din = dinAliasTag(standard);
  return [kind, 'metric', thread, standard, ...(din === undefined ? [] : [din])];
}

function calloutFor(
  standard: string,
  thread: string,
  family: string,
  lengthMm: number,
  propertyClass?: string,
): string | undefined {
  return fastenerCallout({
    standard,
    thread,
    lengthMm: lengthMm > 0 ? lengthMm : undefined,
    kind: kindFromFamily(family),
    ...(propertyClass !== undefined ? { propertyClass } : {}),
  });
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
    iso: screwIso(request.family, thread, lengthMm, nominalMm),
    tags: fastenerTags('screw', spec.standard, thread),
    connectors: screwConnectors(spec.headStyle, dims, lengthMm),
    designation: calloutFor(spec.standard, thread, request.family, lengthMm, request.propertyClass),
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
    iso: { pitchMm: coarsePitchOf(thread) },
    tags: fastenerTags('nut', spec.standard, thread),
    designation: calloutFor(spec.standard, thread, request.family, 0),
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
    tags: fastenerTags('washer', spec.standard, thread),
    designation: calloutFor(spec.standard, thread, request.family, 0),
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
  const requestFamily = canonicalFastenerFamily(request.family);
  const resolved: PartRequest = requestFamily === request.family ? request : { ...request, family: requestFamily };
  const spec = requireFamily(resolved.family);
  if (isFixtureSpec(spec)) return fixturePart(resolved, spec);
  assertPropertyClass(resolved, spec.kind);
  const thread = requireThread(resolved, stockedThreads(spec.threads));
  const nominalMm = nominalOf(thread);
  if (spec.kind === 'screw') {
    return screwPart(resolved, spec, requireRow(spec.threads, thread, resolved.family), thread, nominalMm);
  }
  if (spec.kind === 'nut') {
    return nutPart(resolved, spec, requireRow(spec.threads, thread, resolved.family), thread, nominalMm);
  }
  return washerPart(resolved, spec, requireRow(spec.threads, thread, resolved.family), thread, nominalMm);
}

/** A stocked fastener family id, after DIN/ISO aliases. Undefined for fixtures and unknown names. */
export function libraryFamily(name: string): string | undefined {
  const canonical = canonicalFastenerFamily(name);
  const spec = FAMILIES[canonical];
  if (spec === undefined || isFixtureSpec(spec)) return undefined;
  return canonical;
}

/** Every stocked variant of one fastener family. Pure table data, no solids. */
export function libraryVariants(family: string): ResolvedPart[] {
  const canonical = libraryFamily(family);
  if (canonical === undefined) return [];
  const spec = FAMILIES[canonical];
  if (spec === undefined || isFixtureSpec(spec)) return [];
  return Object.keys(spec.threads).flatMap((key) => {
    const thread = key.replace('_', '.');
    if (spec.kind !== 'screw') return [resolvePart({ family: canonical, thread })];
    const lengths = spec.lengths[key] ?? [];
    return lengths.map((lengthMm) => resolvePart({ family: canonical, thread, lengthMm }));
  });
}

function shortestAtLeast(
  lengths: readonly number[],
  needed: number,
  why: { label: string; minOut: number; gripMm: number },
): number {
  const hit = lengths.find((length) => length + 1e-9 >= needed);
  if (hit !== undefined) return hit;
  const longest = lengths[lengths.length - 1];
  const out = why.minOut > 0 ? ` (including ${round3(why.minOut)} mm of thread past the nut)` : '';
  invalidArgs({
    api: 'lib.stack({ thread, gripMm, mode, protrusionPitches })',
    path: 'gripMm',
    got: why.gripMm,
    requires: `a grip the ${why.label} can reach: the stack needs a ${round3(needed)} mm screw${out}, the longest stocked is ${longest} mm. Use a thinner grip, a larger thread, threaded rod, or a lower protrusionPitches`,
    unit: 'mm',
    example: STACK_EXAMPLE,
  });
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function protrusionPitchesOf(value: number | undefined): number {
  if (value === undefined) return 2;
  if (Number.isFinite(value) && value >= 0) return value;
  invalidArgs({
    api: 'lib.stack({ thread, gripMm, mode, protrusionPitches })',
    path: 'protrusionPitches',
    got: value,
    requires: 'a number of thread pitches ≥ 0 the bolt tip must reach past the nut (default 2)',
    example: "lib.stack({ thread: 'M5', gripMm: 12, mode: 'bolt', protrusionPitches: 2 })",
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

/** The nut's two faces lie on the screw's threaded length.
 *  Stack Z: the screw tip is `offsetZ − length`, and the thread runs
 *  `threadLengthMm` up from the tip. The nut occupies `[offsetZ, offsetZ + m]`,
 *  with `m` the modeled ISO 4032 height (m max). */
export function nutLiesOnThread(plan: StackPlan): boolean {
  const screw = plan.members.find((member) => member.role === 'screw');
  const nut = plan.members.find((member) => member.role === 'nut');
  if (screw === undefined || nut === undefined) return false;
  const threadLength = screw.part.iso?.threadLengthMm ?? screw.part.lengthMm;
  const tip = screw.offsetZ - screw.part.lengthMm;
  const threadTop = tip + threadLength;
  const nutBottom = nut.offsetZ;
  const nutTop = nut.offsetZ + nut.part.headHeightMm;
  return nutBottom >= tip - 1e-6 && nutTop <= threadTop + 1e-6;
}

/** Shortest ISO 4014 length whose plain shank (l − b) ends before the nut. */
function shortestPartialBolt(
  lengths: readonly number[],
  thread: string,
  gripMm: number,
  headT: number,
  tailT: number,
  nutT: number,
  minOut: number,
): number {
  const nominal = nominalOf(thread);
  const minLength = headT + gripMm + tailT + nutT + minOut;
  for (const length of [...lengths].sort((a, b) => a - b)) {
    if (length + 1e-9 < minLength) continue;
    const threadLength = iso4014ReferenceThreadMm(nominal, length);
    const maxLength = headT + gripMm + tailT + threadLength;
    if (length <= maxLength + 1e-9) return length;
  }
  invalidArgs({
    api: 'lib.stack({ thread, gripMm, mode, protrusionPitches })',
    path: 'gripMm',
    got: gripMm,
    requires: `a grip that keeps the ISO 4032 nut on the ISO 4014 thread. The plain shank is l − b. No stocked ${thread} length both reaches past the nut and leaves the nut clear of that plain shank. Use a longer grip, or a fully threaded ISO 4017 bolt (family hex-head-bolt)`,
    unit: 'mm',
    example: "lib.insert(plate, { family: 'hex-head-bolt-partial', diameterMm: 6.6, gripMm: 14, mode: 'bolt' })",
  });
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
  // Head washer + grip + tail washer + nut, plus the protrusion the bolt
  // needs past the nut's outer face. The nut height is ISO 4032 m max.
  const headT = wear.headWasher?.headHeightMm ?? 0;
  const tailT = wear.tailWasher?.headHeightMm ?? 0;
  const nutT = wear.nut?.headHeightMm ?? 0;
  const reach = headT + gripMm + tailT + nutT;
  const minOut = wear.nut ? protrusionPitchesOf(request.protrusionPitches) * coarsePitchOf(request.thread) : 0;
  const lengths = lengthsFor(spec, request.thread);
  const lengthMm = family === 'hex-head-bolt-partial' && wear.nut
    ? shortestPartialBolt(lengths, request.thread, gripMm, headT, tailT, nutT, minOut)
    : shortestAtLeast(lengths, reach + minOut, { label: `${family} ${request.thread}`, minOut, gripMm });
  const screw = resolvePart({ family, thread: request.thread, lengthMm });
  const out = wear.nut ? { protrusionMm: Math.round((lengthMm - reach) * 1000) / 1000 } : {};
  const plan = { lengthMm, members: stackMembersFor(wear, screw, gripMm), ...out };
  if (family === 'hex-head-bolt-partial' && wear.nut && !nutLiesOnThread(plan)) {
    invalidArgs({
      api: 'lib.stack({ thread, gripMm, mode, protrusionPitches })',
      path: 'gripMm',
      got: gripMm,
      requires: `a grip that keeps the ISO 4032 nut on the ISO 4014 thread of the ${lengthMm} mm bolt. Use a longer grip, or a fully threaded ISO 4017 bolt (family hex-head-bolt)`,
      unit: 'mm',
      example: "lib.insert(plate, { family: 'hex-head-bolt-partial', diameterMm: 6.6, gripMm: 14, mode: 'bolt' })",
    });
  }
  return plan;
}
