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

export type PartKind = 'screw' | 'nut' | 'washer';

export interface PartRequest {
  family: string;
  thread?: string;
  lengthMm?: number;
}

export interface ResolvedPart {
  id: string;
  name: string;
  family: string;
  standard: string;
  category: 'fastener';
  kind: PartKind;
  thread: string;
  lengthMm: number;
  /** Nominal diameter parsed from the thread, in mm. */
  nominalMm: number;
  headDiameterMm: number;
  headHeightMm: number;
  acrossFlatsMm: number;
  innerDiameterMm: number;
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
type FamilySpec = ScrewFamily | NutFamily | WasherFamily;

const PART_EXAMPLE = "lib.part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 })";
const STACK_EXAMPLE = "lib.stack({ thread: 'M5', gripMm: 10, mode: 'bolt' })";

const FAMILIES: Record<string, FamilySpec> = {
  'socket-head-cap-screw': { standard: 'ISO 4762', idPrefix: 'iso-4762', kind: 'screw', threads: SHCS_HEAD, lengths: SHCS_LENGTHS },
  'button-head-cap-screw': { standard: 'ISO 7380', idPrefix: 'iso-7380', kind: 'screw', threads: BHCS_HEAD, lengths: BHCS_LENGTHS },
  'flat-head-countersunk': { standard: 'ISO 10642', idPrefix: 'iso-10642', kind: 'screw', threads: FLATHEAD_HEAD, lengths: FLATHEAD_LENGTHS },
  'hex-nut': { standard: 'ISO 4032', idPrefix: 'iso-4032', kind: 'nut', threads: HEX_NUT },
  'lock-nut': { standard: 'DIN 985', idPrefix: 'din-985', kind: 'nut', threads: LOCK_NUT },
  'flat-washer': { standard: 'ISO 7089', idPrefix: 'iso-7089', kind: 'washer', threads: FLAT_WASHER },
  'lock-washer': { standard: 'DIN 127B', idPrefix: 'din-127b', kind: 'washer', threads: LOCK_WASHER },
};

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

export function resolvePart(request: PartRequest): ResolvedPart {
  const spec = requireFamily(request.family);
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
  const lengthMm = shortestAtLeast(spec.lengths, needed, `${family} ${request.thread}`);
  const screw = resolvePart({ family, thread: request.thread, lengthMm });
  return { lengthMm, members: stackMembersFor(wear, screw, gripMm) };
}
