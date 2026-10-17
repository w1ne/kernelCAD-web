// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One fastener table. The catalog generator, lib.standard, and lib.part all
// read these rows. Adding a size is a row, not a new function.

import { KernelError } from '../../shared/intent/kernelError';
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

const FAMILIES: Record<string, {
  standard: string;
  idPrefix: string;
  kind: PartKind;
  threads: Record<string, unknown>;
  lengths?: readonly number[];
}> = {
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
  if (!Number.isFinite(n) || n <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `Thread '${thread}' is not a metric size like M5.`,
      undefined,
      'Pass a thread such as M3, M4, or M5.',
    );
  }
  return n;
}

function requireFamily(family: string) {
  const spec = FAMILIES[family];
  if (!spec) {
    throw new KernelError(
      'feature.invalid-args',
      `Unknown part family '${family}'. Known families: ${Object.keys(FAMILIES).join(', ')}.`,
      undefined,
      'Use a family from lib.part, for example socket-head-cap-screw.',
    );
  }
  return spec;
}

export function resolvePart(request: PartRequest): ResolvedPart {
  const spec = requireFamily(request.family);
  if (!request.thread) {
    throw new KernelError(
      'feature.invalid-args',
      `lib.part family '${request.family}' needs a thread.`,
      undefined,
      'Pass thread: "M5".',
    );
  }
  const key = threadKey(request.thread);
  const dims = spec.threads[key] as
    | { D: number; K: number }
    | { S: number; m: number }
    | { Dout: number; Din: number; t: number }
    | undefined;
  if (!dims) {
    throw new KernelError(
      'feature.invalid-args',
      `${request.family} has no ${request.thread}. Stocked threads: ${Object.keys(spec.threads).map((k) => k.replace('_', '.')).join(', ')}.`,
      undefined,
      'Pick one of the stocked threads.',
    );
  }
  const nominalMm = nominalOf(request.thread);
  let lengthMm = 0;
  if (spec.kind === 'screw') {
    if (request.lengthMm === undefined) {
      throw new KernelError(
        'feature.invalid-args',
        `${request.family} ${request.thread} needs lengthMm.`,
        undefined,
        `Stocked lengths: ${(spec.lengths ?? []).join(', ')}.`,
      );
    }
    lengthMm = nearestStocked(spec.lengths ?? [], request.lengthMm, `${request.family} ${request.thread}`);
  }

  const id = spec.kind === 'screw'
    ? `${spec.idPrefix}-${threadSlug(request.thread)}x${lengthMm}`
    : `${spec.idPrefix}-${threadSlug(request.thread)}`;

  if (spec.kind === 'screw' && 'D' in dims) {
    return {
      id,
      name: `${request.thread} × ${lengthMm} ${request.family} (${spec.standard})`,
      family: request.family,
      standard: spec.standard,
      category: 'fastener',
      kind: 'screw',
      thread: request.thread,
      lengthMm,
      nominalMm,
      headDiameterMm: dims.D,
      headHeightMm: dims.K,
      acrossFlatsMm: 0,
      innerDiameterMm: 0,
      tags: ['screw', 'metric', request.thread],
      connectors: [
        { name: 'head-bearing', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
        { name: 'thread-tip', type: 'axis', origin: [0, 0, -lengthMm], axis: [0, 0, 1] },
        { name: 'head-top', type: 'frame', origin: [0, 0, dims.K], normal: [0, 0, 1] },
      ],
    };
  }
  if (spec.kind === 'nut' && 'S' in dims) {
    return {
      id,
      name: `${request.thread} ${request.family} (${spec.standard})`,
      family: request.family,
      standard: spec.standard,
      category: 'fastener',
      kind: 'nut',
      thread: request.thread,
      lengthMm: 0,
      nominalMm,
      headDiameterMm: 0,
      headHeightMm: dims.m,
      acrossFlatsMm: dims.S,
      innerDiameterMm: nominalMm,
      tags: ['nut', 'metric', request.thread],
      connectors: [
        { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
        { name: 'top-face', type: 'frame', origin: [0, 0, dims.m], normal: [0, 0, 1] },
        { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
      ],
    };
  }
  const washer = dims as { Dout: number; Din: number; t: number };
  return {
    id,
    name: `${request.thread} ${request.family} (${spec.standard})`,
    family: request.family,
    standard: spec.standard,
    category: 'fastener',
    kind: 'washer',
    thread: request.thread,
    lengthMm: 0,
    nominalMm,
    headDiameterMm: washer.Dout,
    headHeightMm: washer.t,
    acrossFlatsMm: 0,
    innerDiameterMm: washer.Din,
    tags: ['washer', 'metric', request.thread],
    connectors: [
      { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
      { name: 'top-face', type: 'frame', origin: [0, 0, washer.t], normal: [0, 0, 1] },
      { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
    ],
  };
}

function nearestStocked(lengths: readonly number[], requested: number, label: string): number {
  if (lengths.some((length) => length === requested)) return requested;
  throw new KernelError(
    'feature.invalid-args',
    `Length ${requested} is not stocked for ${label}. Stocked lengths: ${lengths.join(', ')}.`,
    undefined,
    'Pass a stocked length, or use lib.stack so the grip picks the next stocked length.',
  );
}

function shortestAtLeast(lengths: readonly number[], needed: number, label: string): number {
  const hit = lengths.find((length) => length + 1e-9 >= needed);
  if (hit !== undefined) return hit;
  throw new KernelError(
    'feature.invalid-args',
    `No stocked length for ${label} reaches ${needed} mm. Longest stocked length: ${lengths[lengths.length - 1]}.`,
    undefined,
    'Shorten the grip or pick a larger family.',
  );
}

/** Screw, washer under the head, and for mode 'bolt' a washer and nut on the far side. */
export function planStack(request: StackRequest): StackPlan {
  const mode = request.mode ?? 'bolt';
  if (mode !== 'screw' && mode !== 'bolt') {
    throw new KernelError(
      'feature.invalid-args',
      `lib.stack mode must be 'screw' or 'bolt'.`,
      undefined,
      "Pass mode: 'bolt' for a washer and nut on the back.",
    );
  }
  if (!(request.gripMm > 0)) {
    throw new KernelError(
      'feature.invalid-args',
      'lib.stack needs gripMm, the thickness the screw passes through.',
      undefined,
      'Pass gripMm: 10 for a 10 mm plate.',
    );
  }
  const washer = mode === 'bolt'
    ? resolvePart({ family: 'flat-washer', thread: request.thread })
    : undefined;
  const nut = mode === 'bolt'
    ? resolvePart({ family: 'hex-nut', thread: request.thread })
    : undefined;
  const washerT = washer?.headHeightMm ?? 0;
  const nutT = nut?.headHeightMm ?? 0;
  const needed = request.gripMm + (mode === 'bolt' ? washerT + nutT : 0);
  const lengthMm = shortestAtLeast(SHCS_LENGTHS, needed, `socket-head-cap-screw ${request.thread}`);
  const screw = resolvePart({
    family: 'socket-head-cap-screw',
    thread: request.thread,
    lengthMm,
  });
  const members: StackMemberPlan[] = [];
  if (washer) {
    members.push({ role: 'head-washer', part: washer, offsetZ: 0 });
  }
  members.push({ role: 'screw', part: screw, offsetZ: washerT });
  if (washer && nut) {
    members.push({ role: 'tail-washer', part: washer, offsetZ: -(request.gripMm + washerT) });
    members.push({ role: 'nut', part: nut, offsetZ: -(request.gripMm + washerT + nutT) });
  }
  return { lengthMm, members };
}
