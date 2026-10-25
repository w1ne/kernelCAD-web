// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/standardPartRanges.ts
//
// S3 range proofs for the standard parts. Each covered `lib.standard.*`
// shortcut declares its parameter domain (the stocked thread and length
// values) and the requirements that must hold at every sampled point. The CI
// runner (scripts/standardPartRangeProof.ts) feeds these cases through
// `sweepTolerance`, so the catalog can state the range a part was checked
// over instead of "it built at the default".
//
// This is a coherent first slice: the fastener, nut and washer families. The
// remaining standard parts (heat-set inserts, bearings, servos, motors,
// headers, JST housings) are listed in STANDARD_PART_RANGE_REMAINING.

import type { StandardParts } from './standardParts';
import {
  BHCS_HEAD,
  BHCS_LENGTHS,
  FLATHEAD_HEAD,
  FLATHEAD_LENGTHS,
  FLAT_WASHER,
  HEX_BOLT_HEAD,
  HEX_BOLT_LENGTHS,
  HEX_NUT,
  LOCK_NUT,
  LOCK_WASHER,
  ROD_LENGTHS,
  SET_SCREW_LENGTHS,
  SHCS_HEAD,
  SHCS_LENGTHS,
} from './familyTable';

export type StandardPartMember = keyof StandardParts;

export interface StandardPartRequirementDeclaration {
  /** Requirement name within one script (the runner prefixes the member). */
  readonly name: string;
  readonly description: string;
}

export interface StandardPartParameterDeclaration {
  readonly name: 'Thread' | 'Length';
  readonly kind: 'thread' | 'length';
  readonly values: ReadonlyArray<string>;
  /** Human range, e.g. "M2–M12 (9 stocked threads)". */
  readonly description: string;
}

export interface StandardPartRangeCase {
  readonly parameter: 'Thread' | 'Length';
  /** Inline .kcad.ts body. */
  readonly script: string;
  /** Sweep input for this case. */
  readonly params: Readonly<Record<string, { readonly values: ReadonlyArray<string> }>>;
  readonly expectedPoints: number;
}

export interface StandardPartRangeDeclaration {
  readonly member: StandardPartMember;
  readonly family: string;
  readonly standard?: string;
  readonly label: string;
  readonly parameters: ReadonlyArray<StandardPartParameterDeclaration>;
  readonly requirements: ReadonlyArray<StandardPartRequirementDeclaration>;
  readonly cases: ReadonlyArray<StandardPartRangeCase>;
  /** Catalog-record attributes shown by find_part. */
  readonly catalogAttributes: Readonly<Record<string, string>>;
}

interface TableDims {
  readonly D?: number;
  readonly K?: number;
  readonly S?: number;
  readonly m?: number;
  readonly Dout?: number;
  readonly Din?: number;
  readonly t?: number;
}

interface ScrewDeclarationInput {
  readonly member: StandardPartMember;
  readonly family: string;
  readonly standard: string;
  readonly label: string;
  readonly heads: Readonly<Record<string, TableDims>>;
  readonly lengths: Readonly<Record<string, readonly number[]>>;
  /** Threads the public lib.standard member accepts. */
  readonly allowedThreads: ReadonlyArray<string>;
  /** Thread whose stocked length series the length case samples. */
  readonly lengthThread: string;
}

interface HardwareDeclarationInput {
  readonly member: StandardPartMember;
  readonly family: string;
  readonly standard: string;
  readonly label: string;
  readonly dims: Readonly<Record<string, TableDims>>;
  /** Threads the public lib.standard member accepts. */
  readonly allowedThreads: ReadonlyArray<string>;
}

const METRIC_THREADS: ReadonlyArray<string> = [
  'M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12',
];

const REQUIREMENTS: ReadonlyArray<StandardPartRequirementDeclaration> = [
  { name: 'envelope', description: 'bbox inside the family envelope band' },
  { name: 'material', description: 'volume at least 1 mm^3' },
];

function threadsOf(table: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(table).map((key) => key.replace('_', '.'));
}

function nominalOf(thread: string): number {
  const n = Number.parseFloat(thread.slice(1));
  return Number.isFinite(n) ? n : 0;
}

function maxOf(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.max(...values);
}

function threadRange(threads: readonly string[]): string {
  if (threads.length === 0) return 'none';
  return threads.length === 1
    ? `${threads[0]} (1 stocked thread)`
    : `${threads[0]}–${threads[threads.length - 1]} (${threads.length} stocked threads)`;
}

/** First / middle / last of a stocked series, de-duplicated. */
function sampleSeries(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  if (values.length <= 3) return [...values];
  const middle = values[Math.floor((values.length - 1) / 2)]!;
  return [...new Set([values[0]!, middle, values[values.length - 1]!])];
}

function requirementLines(prefix: string, xMax: number, zLimit: string): string {
  return [
    `require('${prefix}.envelope', bbox(part).within({ x: [0, ${xMax}], y: [0, ${xMax}], z: [0, ${zLimit}] }));`,
    `require('${prefix}.material', volume(part).gte(1));`,
  ].join('\n');
}

function threadCase(args: {
  readonly member: StandardPartMember;
  readonly threads: readonly string[];
  readonly threadLengths?: Readonly<Record<string, number>>;
  readonly xMax: number;
  readonly zLimit: string;
}): StandardPartRangeCase {
  const choices = args.threads;
  const lengthLookup = args.threadLengths === undefined
    ? ''
    : `const ThreadLengths = ${JSON.stringify(args.threadLengths)};\n`;
  const lengthArg = args.threadLengths === undefined
    ? ''
    : 'lengthMm: ThreadLengths[Thread.value], ';
  const script = `
const Thread = param('Thread', ${JSON.stringify(choices[0])}, { choices: ${JSON.stringify(choices)} });
${lengthLookup}const part = await lib.standard.${args.member}({ thread: Thread.value, ${lengthArg}detail: 'envelope' });
${requirementLines(args.member, args.xMax, args.zLimit)}
return part;
`;
  return {
    parameter: 'Thread',
    script,
    params: { Thread: { values: choices } },
    expectedPoints: choices.length,
  };
}

function lengthCase(args: {
  readonly member: StandardPartMember;
  readonly thread: string;
  readonly dims: TableDims;
  readonly stockedLengths: readonly number[];
  readonly xMax: number;
}): StandardPartRangeCase {
  const sampled = sampleSeries(args.stockedLengths);
  const choices = sampled.map((v) => String(v));
  const headExtra = Math.ceil((args.dims.K ?? 0) + 1);
  const script = `
const Length = param('Length', ${JSON.stringify(choices[0])}, { choices: ${JSON.stringify(choices)} });
const L = Number(Length.value);
const part = await lib.standard.${args.member}({ thread: ${JSON.stringify(args.thread)}, lengthMm: L, detail: 'envelope' });
require('${args.member}.length-envelope', bbox(part).within({ x: [0, ${args.xMax}], y: [0, ${args.xMax}], z: [0, L + ${headExtra}] }));
require('${args.member}.material', volume(part).gte(1));
return part;
`;
  return {
    parameter: 'Length',
    script,
    params: { Length: { values: choices } },
    expectedPoints: choices.length,
  };
}

function screwDeclaration(input: ScrewDeclarationInput): StandardPartRangeDeclaration {
  const threads = threadsOf(input.heads).filter((t) => input.allowedThreads.includes(t));
  const headDiameters = threads.map((t) => input.heads[t.replace('.', '_')]?.D ?? 0);
  const headHeights = threads.map((t) => input.heads[t.replace('.', '_')]?.K ?? 0);
  const nominalDiameters = threads.map(nominalOf);
  const threadLengths = Object.fromEntries(
    threads.map((t) => [t, input.lengths[t.replace('.', '_')]?.[0] ?? Number.NaN]),
  );
  const firstLengths = Object.values(threadLengths).filter((v) => Number.isFinite(v));
  const xMax = Math.ceil(Math.max(maxOf(headDiameters), maxOf(nominalDiameters))) + 1;
  const zLimit = String(Math.ceil(maxOf(firstLengths) + maxOf(headHeights) + 1));
  const lengthDims = input.heads[input.lengthThread.replace('.', '_')] ?? {};
  const lengthStocked = input.lengths[input.lengthThread.replace('.', '_')] ?? [];
  const lengthXMax = Math.ceil(Math.max(lengthDims.D ?? 0, nominalOf(input.lengthThread))) + 1;
  const lengthCaseValue = lengthCase({
    member: input.member,
    thread: input.lengthThread,
    dims: lengthDims,
    stockedLengths: lengthStocked,
    xMax: lengthXMax,
  });
  const threadCaseValue = threadCase({
    member: input.member,
    threads,
    threadLengths,
    xMax,
    zLimit,
  });
  const sampled = sampleSeries(lengthStocked);
  const lengthRange = lengthStocked.length === 0
    ? 'none'
    : `${input.lengthThread} ${lengthStocked[0]}–${lengthStocked[lengthStocked.length - 1]} mm; sampled ${sampled.join(', ')} of ${lengthStocked.length}`;

  return {
    member: input.member,
    family: input.family,
    standard: input.standard,
    label: input.label,
    parameters: [
      { name: 'Thread', kind: 'thread', values: threads, description: threadRange(threads) },
      { name: 'Length', kind: 'length', values: sampled.map(String), description: lengthRange },
    ],
    requirements: REQUIREMENTS,
    cases: [threadCaseValue, lengthCaseValue],
    catalogAttributes: {
      verifiedMethod: 'S3 sweep; checked, not proven',
      verifiedThreads: threads.join(', '),
      verifiedThreadPoints: String(threads.length),
      verifiedLengths: lengthRange,
      verifiedLengthPoints: String(sampled.length),
      verifiedRequirements: 'envelope bbox band, volume >= 1 mm^3',
      verifiedBoundaries: '0 (discrete domain)',
      verifiedPoints: String(threads.length + sampled.length),
    },
  };
}

function hardwareDeclaration(input: HardwareDeclarationInput): StandardPartRangeDeclaration {
  const threads = threadsOf(input.dims).filter((t) => input.allowedThreads.includes(t));
  const widths = threads.map((t) => input.dims[t.replace('.', '_')]?.S ?? input.dims[t.replace('.', '_')]?.Dout ?? 0);
  const heights = threads.map((t) => input.dims[t.replace('.', '_')]?.m ?? input.dims[t.replace('.', '_')]?.t ?? 0);
  const xMax = Math.ceil(maxOf(widths) * 1.5) + 1;
  const zLimit = String(Math.ceil(maxOf(heights)) + 1);
  const threadCaseValue = threadCase({
    member: input.member,
    threads,
    xMax,
    zLimit,
  });
  return {
    member: input.member,
    family: input.family,
    standard: input.standard,
    label: input.label,
    parameters: [
      { name: 'Thread', kind: 'thread', values: threads, description: threadRange(threads) },
    ],
    requirements: REQUIREMENTS,
    cases: [threadCaseValue],
    catalogAttributes: {
      verifiedMethod: 'S3 sweep; checked, not proven',
      verifiedThreads: threads.join(', '),
      verifiedThreadPoints: String(threads.length),
      verifiedRequirements: 'envelope bbox band, volume >= 1 mm^3',
      verifiedBoundaries: '0 (discrete domain)',
      verifiedPoints: String(threads.length),
    },
  };
}

/** Covered standard-part ranges. The order matches the standardParts surface
 *  for the families in this first slice. */
export const STANDARD_PART_RANGES: ReadonlyArray<StandardPartRangeDeclaration> = [
  screwDeclaration({
    member: 'boltSHCS',
    family: 'socket-head-cap-screw',
    standard: 'ISO 4762',
    label: 'socket head cap screw',
    heads: SHCS_HEAD,
    lengths: SHCS_LENGTHS,
    allowedThreads: METRIC_THREADS,
    lengthThread: 'M5',
  }),
  screwDeclaration({
    member: 'boltBHCS',
    family: 'button-head-cap-screw',
    standard: 'ISO 7380',
    label: 'button head cap screw',
    heads: BHCS_HEAD,
    lengths: BHCS_LENGTHS,
    allowedThreads: ['M3', 'M4', 'M5', 'M6', 'M8', 'M10'],
    lengthThread: 'M8',
  }),
  screwDeclaration({
    member: 'boltFlatHead',
    family: 'flat-head-countersunk',
    standard: 'ISO 10642',
    label: 'flat head countersunk screw',
    heads: FLATHEAD_HEAD,
    lengths: FLATHEAD_LENGTHS,
    allowedThreads: ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'],
    lengthThread: 'M6',
  }),
  screwDeclaration({
    member: 'boltHex',
    family: 'hex-head-bolt',
    standard: 'ISO 4017',
    label: 'hex head bolt',
    heads: HEX_BOLT_HEAD,
    lengths: HEX_BOLT_LENGTHS,
    allowedThreads: ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20'],
    lengthThread: 'M10',
  }),
  screwDeclaration({
    member: 'setScrew',
    family: 'set-screw',
    standard: 'ISO 4026',
    label: 'set screw',
    heads: Object.fromEntries(threadsOf(SET_SCREW_LENGTHS).map((t) => [t.replace('.', '_'), {}])),
    lengths: SET_SCREW_LENGTHS,
    allowedThreads: ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'],
    lengthThread: 'M6',
  }),
  screwDeclaration({
    member: 'rodThreaded',
    family: 'threaded-rod',
    standard: 'DIN 975',
    label: 'threaded rod',
    heads: Object.fromEntries(threadsOf(ROD_LENGTHS).map((t) => [t.replace('.', '_'), {}])),
    lengths: ROD_LENGTHS,
    allowedThreads: METRIC_THREADS,
    lengthThread: 'M8',
  }),
  hardwareDeclaration({
    member: 'nutHex',
    family: 'hex-nut',
    standard: 'ISO 4032',
    label: 'hex nut',
    dims: HEX_NUT,
    allowedThreads: METRIC_THREADS,
  }),
  hardwareDeclaration({
    member: 'nutLock',
    family: 'lock-nut',
    standard: 'DIN 985',
    label: 'lock nut',
    dims: LOCK_NUT,
    allowedThreads: ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'],
  }),
  hardwareDeclaration({
    member: 'washerFlat',
    family: 'flat-washer',
    standard: 'ISO 7089',
    label: 'flat washer',
    dims: FLAT_WASHER,
    allowedThreads: METRIC_THREADS,
  }),
  hardwareDeclaration({
    member: 'washerLock',
    family: 'lock-washer',
    standard: 'DIN 127B',
    label: 'lock washer',
    dims: LOCK_WASHER,
    allowedThreads: ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'],
  }),
];

const BY_FAMILY = new Map(STANDARD_PART_RANGES.map((d) => [d.family, d]));

/** Catalog attributes for a family in this first slice, or undefined when the
 *  family is still in STANDARD_PART_RANGE_REMAINING. */
export function standardPartVerificationAttributes(
  family: string,
): Readonly<Record<string, string>> | undefined {
  return BY_FAMILY.get(family)?.catalogAttributes;
}

/** Standard parts deliberately left for the next Stage B slice. They need a
 *  catalog STEP / mesh file, or a non-threaded variant domain, so they are not
 *  claimed as verified here. */
export const STANDARD_PART_RANGE_REMAINING: ReadonlyArray<StandardPartMember> = [
  'heatSetInsert',
  'bearing608',
  'bearing623',
  'bearing688',
  'bearing6800',
  'sg90',
  'sg90HornSingleArm',
  'nema17',
  'nema23',
  'pinHeader254',
  'pinHeader127',
  'jstXH',
];
