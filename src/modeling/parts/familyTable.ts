// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One fastener table. The catalog generator, lib.standard, and lib.part all
// read these rows. Adding a size is a row, not a new function.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { ConnectorEntry } from '../../shared/parts/connectorManifestSchema';

export const SHCS_LENGTHS = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50] as const;
export const BHCS_LENGTHS = [5, 6, 8, 10, 12, 14, 16, 18, 20, 25] as const;
export const FLATHEAD_LENGTHS = [6, 8, 10, 12, 14, 16, 18, 20, 25] as const;

/** Head diameter D and height K. Keys use '_' for the decimal (M2_5). */
export const SHCS_HEAD: Record<string, { D: number; K: number }> = {
  M2: { D: 3.8, K: 2.0 },
  M2_5: { D: 4.5, K: 2.5 },
  M3: { D: 5.5, K: 3.0 },
  M4: { D: 7.0, K: 4.0 },
  M5: { D: 8.5, K: 5.0 },
  M6: { D: 10.0, K: 6.0 },
};

export const BHCS_HEAD: Record<string, { D: number; K: number }> = {
  M3: { D: 5.7, K: 1.65 },
  M4: { D: 7.6, K: 2.2 },
  M5: { D: 9.5, K: 2.75 },
};

export const FLATHEAD_HEAD: Record<string, { D: number; K: number }> = {
  M3: { D: 6.72, K: 1.86 },
  M4: { D: 8.96, K: 2.48 },
  M5: { D: 11.2, K: 3.1 },
};

export const HEX_NUT: Record<string, { S: number; m: number }> = {
  M2: { S: 4, m: 1.6 },
  M2_5: { S: 5, m: 2 },
  M3: { S: 5.5, m: 2.4 },
  M4: { S: 7, m: 3.2 },
  M5: { S: 8, m: 4.0 },
  M6: { S: 10, m: 5.0 },
};

export const LOCK_NUT: Record<string, { S: number; m: number }> = {
  M3: { S: 5.5, m: 4.0 },
  M4: { S: 7, m: 5.0 },
  M5: { S: 8, m: 6.0 },
};

export const FLAT_WASHER: Record<string, { Dout: number; Din: number; t: number }> = {
  M2: { Dout: 5, Din: 2.2, t: 0.3 },
  M3: { Dout: 7, Din: 3.2, t: 0.5 },
  M4: { Dout: 9, Din: 4.3, t: 0.8 },
  M5: { Dout: 10, Din: 5.3, t: 1.0 },
  M6: { Dout: 12, Din: 6.4, t: 1.6 },
};

export const LOCK_WASHER: Record<string, { Dout: number; Din: number; t: number }> = {
  M3: { Dout: 6.2, Din: 3.1, t: 0.8 },
  M4: { Dout: 7.6, Din: 4.1, t: 1.0 },
  M5: { Dout: 9.2, Din: 5.1, t: 1.2 },
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

interface HeadDims { D: number; K: number }
interface NutDims { S: number; m: number }
interface WasherDims { Dout: number; Din: number; t: number }

interface ScrewFamily {
  standard: string;
  idPrefix: string;
  kind: 'screw';
  threads: Record<string, HeadDims>;
  lengths: readonly number[];
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
 *  Nominal envelope dimensions from the stock table; slot/thread pairing
 *  follows common machine-table practice. Check the supplier drawing before
 *  ordering. */
const FIXTURES: Record<string, FixtureFamily> = {
  't-slot-nut': {
    idPrefix: 'tslot-nut',
    kind: 't-slot-nut',
    threads: {
      M8: { slotMm: 10, baseWidthMm: 15.8, neckWidthMm: 9.7, baseHeightMm: 6, neckHeightMm: 8, lengthMm: 22 },
      M10: { slotMm: 12, baseWidthMm: 17.8, neckWidthMm: 11.7, baseHeightMm: 7, neckHeightMm: 9, lengthMm: 26 },
      M12: { slotMm: 14, baseWidthMm: 19.8, neckWidthMm: 13.7, baseHeightMm: 8, neckHeightMm: 10, lengthMm: 30 },
    },
  },
  'clamping-stud': {
    idPrefix: 'clamp-stud',
    kind: 'stud',
    threads: { M8: {}, M10: {}, M12: {} },
    lengths: { M8: [63, 100], M10: [80, 125], M12: [100, 160] },
  },
  'flange-nut': {
    idPrefix: 'flange-nut',
    kind: 'flange-nut',
    threads: {
      M8: { acrossFlatsMm: 13, heightMm: 8, flangeDiameterMm: 18, flangeThicknessMm: 1.6 },
      M10: { acrossFlatsMm: 16, heightMm: 10, flangeDiameterMm: 22, flangeThicknessMm: 2 },
      M12: { acrossFlatsMm: 18, heightMm: 12, flangeDiameterMm: 26, flangeThicknessMm: 2.4 },
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
  'socket-head-cap-screw': { standard: 'ISO 4762', idPrefix: 'iso-4762', kind: 'screw', threads: SHCS_HEAD, lengths: SHCS_LENGTHS },
  'button-head-cap-screw': { standard: 'ISO 7380', idPrefix: 'iso-7380', kind: 'screw', threads: BHCS_HEAD, lengths: BHCS_LENGTHS },
  'flat-head-countersunk': { standard: 'ISO 10642', idPrefix: 'iso-10642', kind: 'screw', threads: FLATHEAD_HEAD, lengths: FLATHEAD_LENGTHS },
  'hex-nut': { standard: 'ISO 4032', idPrefix: 'iso-4032', kind: 'nut', threads: HEX_NUT },
  'lock-nut': { standard: 'DIN 985', idPrefix: 'din-985', kind: 'nut', threads: LOCK_NUT },
  'flat-washer': { standard: 'ISO 7089', idPrefix: 'iso-7089', kind: 'washer', threads: FLAT_WASHER },
  'lock-washer': { standard: 'DIN 127B', idPrefix: 'din-127b', kind: 'washer', threads: LOCK_WASHER },
  ...FIXTURES,
};

/** Machining-fixture family names, for the catalog generator and docs. */
export const FIXTURE_FAMILY_NAMES: readonly string[] = Object.keys(FIXTURES);

/** Stocked variants of one fixture family, for the catalog generator. */
export function fixtureVariants(family: string): Array<{ thread: string; lengthMm?: number }> {
  const spec = FIXTURES[family];
  if (spec === undefined) {
    invalidArgs({
      api: 'lib.fixture.*',
      path: 'family',
      got: family,
      requires: `a stocked fixture family: ${FIXTURE_FAMILY_NAMES.join(', ')}`,
      example: "lib.fixture.tSlotNut({ thread: 'M10' })",
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
  const lengthMm = screwLength(spec.lengths, request, thread);
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
    acrossFlatsMm: 0,
    innerDiameterMm: 0,
    tags: ['screw', 'metric', thread],
    connectors: [
      { name: 'head-bearing', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
      { name: 'thread-tip', type: 'axis', origin: [0, 0, -lengthMm], axis: [0, 0, 1] },
      { name: 'head-top', type: 'frame', origin: [0, 0, dims.K], normal: [0, 0, 1] },
    ],
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

/** Screw, washer under the head, and for mode 'bolt' a washer and nut on the far side. */
export function planStack(request: StackRequest): StackPlan {
  const mode = stackMode(request.mode);
  const gripMm = positiveGrip(request.gripMm);
  const washer = mode === 'bolt'
    ? resolvePart({ family: 'flat-washer', thread: request.thread })
    : undefined;
  const nut = mode === 'bolt'
    ? resolvePart({ family: 'hex-nut', thread: request.thread })
    : undefined;
  const washerT = washer?.headHeightMm ?? 0;
  const nutT = nut?.headHeightMm ?? 0;
  const needed = gripMm + (mode === 'bolt' ? washerT + nutT : 0);
  const lengthMm = shortestAtLeast(SHCS_LENGTHS, needed, `socket-head-cap-screw ${request.thread}`);
  const screw = resolvePart({
    family: 'socket-head-cap-screw',
    thread: request.thread,
    lengthMm,
  });
  const members: StackMemberPlan[] = [];
  if (washer) members.push({ role: 'head-washer', part: washer, offsetZ: 0 });
  members.push({ role: 'screw', part: screw, offsetZ: washerT });
  if (washer && nut) {
    members.push({ role: 'tail-washer', part: washer, offsetZ: -(gripMm + washerT) });
    members.push({ role: 'nut', part: nut, offsetZ: -(gripMm + washerT + nutT) });
  }
  return { lengthMm, members };
}
