// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// 1D arithmetic tolerance stack. Worst case walks each signed limit. RSS treats
// each drawing half-width as an independent ±3σ proxy and reports that same
// ±3σ band. It is not a GD&T capability study.

export const RSS_SIGMA_EQUIVALENT = 3 as const;

export const TOLERANCE_STACK_DISCLAIMER =
  '1D arithmetic tolerance stack. Not a full GD&T capability study. Datum shift, bonus tolerance, and process capability are not included.';

export const RSS_CONVENTION =
  'Each contributor half-width (upperMm − lowerMm) / 2 is the drawing ±3σ limit. ' +
  'The RSS half-width is the square root of the sum of squared half-widths, assuming independent contributors, and is reported as the ±3σ band (sigmaEquivalent 3). ' +
  'The RSS centre is the signed sum of tolerance-zone midpoints, so an asymmetric zone shifts it off the drawing nominal. ' +
  'A missing tolerance is refused; ISO 2768 is not applied.';

/** Signed deviations from the drawing nominal, in millimetres. */
export interface SignedTol {
  upper: number;
  lower: number;
}

export class DimensionTolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DimensionTolError';
  }
}

export interface StackContributor {
  id: string;
  nominalMm: number;
  upperMm: number;
  lowerMm: number;
  sense: '+' | '-';
}

export interface StackRequirement {
  kind: 'gap' | 'clearance' | 'length';
  minMm?: number;
  maxMm?: number;
}

export interface StackContributorReport {
  id: string;
  sense: '+' | '-';
  sensitivity: 1 | -1;
  nominalMm: number;
  upperMm: number;
  lowerMm: number;
  halfWidthMm: number;
  varianceShare: number;
}

export interface StackSuccess {
  ok: true;
  method: '1d-arithmetic';
  nominalMm: number;
  worstCase: { minMm: number; maxMm: number };
  rss: {
    minMm: number;
    maxMm: number;
    centerMm: number;
    halfWidthMm: number;
    sigmaEquivalent: typeof RSS_SIGMA_EQUIVALENT;
    convention: string;
  };
  contributors: StackContributorReport[];
  disclaimer: string;
  requirement?: {
    kind: StackRequirement['kind'];
    minMm?: number;
    maxMm?: number;
    worstCase: 'pass' | 'fail';
    rss: 'pass' | 'fail';
    pass: boolean;
  };
}

export interface StackFailure {
  ok: false;
  errorCode: 'cli.invalid-args';
  error: string;
  disclaimer: string;
}

export type StackResult = StackSuccess | StackFailure;

const FIT_EPS_MM = 1e-9;
const REQUIREMENT_KINDS = new Set<StackRequirement['kind']>(['gap', 'clearance', 'length']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finiteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function refused(error: string): StackFailure {
  return { ok: false, errorCode: 'cli.invalid-args', error, disclaimer: TOLERANCE_STACK_DISCLAIMER };
}

function bilateral(raw: number): SignedTol {
  if (!Number.isFinite(raw) || raw < 0) {
    throw new DimensionTolError('number must be a finite bilateral ±mm of 0 or more');
  }
  return { upper: raw, lower: -raw };
}

function signedPair(upper: unknown, lower: unknown): SignedTol {
  if (!finiteNumber(upper) || !finiteNumber(lower)) {
    throw new DimensionTolError('upper and lower must be finite mm deviations');
  }
  if (upper < lower) throw new DimensionTolError('upper must be greater than or equal to lower');
  return { upper, lower };
}

function plusMinus(plus: unknown, minus: unknown): SignedTol {
  if (!finiteNumber(plus) || !finiteNumber(minus) || plus < 0 || minus < 0) {
    throw new DimensionTolError('plus and minus must be finite non-negative magnitudes');
  }
  return { upper: plus, lower: -minus };
}

/** Normalize a dimension `tol` to signed deviations. A fit-class string is refused. */
export function parseDimensionTol(raw: unknown): SignedTol {
  if (typeof raw === 'number') return bilateral(raw);
  if (typeof raw === 'string') {
    throw new DimensionTolError(`fit class '${raw}' is a drawing label, not a numeric deviation`);
  }
  if (!isRecord(raw)) {
    throw new DimensionTolError('must be a number (±mm) or { upper, lower } or { plus, minus }');
  }
  const hasUL = 'upper' in raw || 'lower' in raw;
  const hasPM = 'plus' in raw || 'minus' in raw;
  if (hasUL && hasPM) throw new DimensionTolError('cannot mix { upper, lower } with { plus, minus }');
  if (hasUL) return signedPair(raw.upper, raw.lower);
  if (hasPM) return plusMinus(raw.plus, raw.minus);
  throw new DimensionTolError('must be a number (±mm) or { upper, lower } or { plus, minus }');
}

/**
 * Sheet suffix for a linear annotation. Symmetric zones become a bilateral
 * number (`±`). Asymmetric zones that stay on the usual plus/minus side of
 * nominal become `{ plus, minus }` magnitudes. Other zones stay off the sheet.
 */
export function drawingTolSuffix(tol: SignedTol): number | { plus: number; minus: number } | undefined {
  const { upper, lower } = tol;
  if (!(upper >= 0 && lower <= 0)) return undefined;
  if (Math.abs(upper + lower) <= 1e-12) return upper;
  return { plus: upper, minus: Math.abs(lower) };
}

interface SignedEnds {
  nominal: number;
  low: number;
  high: number;
  mid: number;
  half: number;
  sensitivity: 1 | -1;
}

function signedEnds(c: StackContributor): SignedEnds {
  const sensitivity: 1 | -1 = c.sense === '+' ? 1 : -1;
  const at = (dev: number) => sensitivity * (c.nominalMm + dev);
  const a = at(c.lowerMm);
  const b = at(c.upperMm);
  return {
    nominal: sensitivity * c.nominalMm,
    low: Math.min(a, b),
    high: Math.max(a, b),
    mid: sensitivity * (c.nominalMm + (c.upperMm + c.lowerMm) / 2),
    half: (c.upperMm - c.lowerMm) / 2,
    sensitivity,
  };
}

function contributorId(raw: Record<string, unknown>, index: number): { id: string } | { error: string } {
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    return { error: `contributors[${index}] needs a nonempty id` };
  }
  return { id: raw.id };
}

/** Canonical MCP name wins. The camelCase alias stays for in-process callers. */
function wireField(raw: Record<string, unknown>, snake: string, camel: string): unknown {
  return raw[snake] !== undefined ? raw[snake] : raw[camel];
}

function contributorTol(
  raw: Record<string, unknown>,
  id: string,
): { upperMm: number; lowerMm: number } | { error: string } {
  const upper = wireField(raw, 'upper_mm', 'upperMm');
  const lower = wireField(raw, 'lower_mm', 'lowerMm');
  if (upper === undefined || lower === undefined) {
    return {
      error: `${id} needs upper_mm and lower_mm. A missing tolerance is refused; this tool does not apply ISO 2768 or any other general tolerance class.`,
    };
  }
  if (!finiteNumber(upper) || !finiteNumber(lower)) {
    return { error: `${id} upper_mm and lower_mm must be finite mm deviations` };
  }
  if (upper < lower) {
    return { error: `${id} upper_mm must be greater than or equal to lower_mm` };
  }
  return { upperMm: upper, lowerMm: lower };
}

function readContributor(raw: unknown, index: number): { contributor: StackContributor } | { error: string } {
  if (!isRecord(raw)) return { error: `contributors[${index}] must be an object` };
  const named = contributorId(raw, index);
  if ('error' in named) return named;
  const nominal = wireField(raw, 'nominal_mm', 'nominalMm');
  if (!finiteNumber(nominal)) return { error: `${named.id} nominal_mm must be a finite number` };
  const tol = contributorTol(raw, named.id);
  if ('error' in tol) return tol;
  if (raw.sense !== '+' && raw.sense !== '-') return { error: `${named.id} sense must be '+' or '-'` };
  return {
    contributor: {
      id: named.id,
      nominalMm: nominal,
      upperMm: tol.upperMm,
      lowerMm: tol.lowerMm,
      sense: raw.sense,
    },
  };
}

function optionalMm(value: unknown, field: string): { value?: number } | { error: string } {
  if (value === undefined) return {};
  if (!finiteNumber(value)) return { error: `requirement.${field} must be a finite number` };
  return { value };
}

function readRequirement(raw: unknown): { requirement: StackRequirement } | { error: string } {
  if (!isRecord(raw)) return { error: 'requirement must be an object' };
  if (!REQUIREMENT_KINDS.has(raw.kind as StackRequirement['kind'])) {
    return { error: "requirement.kind must be 'gap', 'clearance', or 'length'" };
  }
  const minRaw = wireField(raw, 'min_mm', 'minMm');
  const maxRaw = wireField(raw, 'max_mm', 'maxMm');
  if (minRaw === undefined && maxRaw === undefined) {
    return { error: 'requirement needs min_mm or max_mm' };
  }
  const min = optionalMm(minRaw, 'min_mm');
  if ('error' in min) return min;
  const max = optionalMm(maxRaw, 'max_mm');
  if ('error' in max) return max;
  if (min.value !== undefined && max.value !== undefined && min.value > max.value) {
    return { error: 'requirement.min_mm must be less than or equal to max_mm' };
  }
  return {
    requirement: {
      kind: raw.kind as StackRequirement['kind'],
      ...(min.value !== undefined ? { minMm: min.value } : {}),
      ...(max.value !== undefined ? { maxMm: max.value } : {}),
    },
  };
}

function inside(min: number, max: number, req: StackRequirement): boolean {
  if (req.minMm !== undefined && min < req.minMm - FIT_EPS_MM) return false;
  if (req.maxMm !== undefined && max > req.maxMm + FIT_EPS_MM) return false;
  return true;
}

function judge(req: StackRequirement, stack: StackSuccess): NonNullable<StackSuccess['requirement']> {
  const worstCase = inside(stack.worstCase.minMm, stack.worstCase.maxMm, req) ? 'pass' : 'fail';
  const rss = inside(stack.rss.minMm, stack.rss.maxMm, req) ? 'pass' : 'fail';
  return {
    kind: req.kind,
    ...(req.minMm !== undefined ? { minMm: req.minMm } : {}),
    ...(req.maxMm !== undefined ? { maxMm: req.maxMm } : {}),
    worstCase,
    rss,
    pass: worstCase === 'pass',
  };
}

function reportRow(c: StackContributor, ends: SignedEnds, share: number): StackContributorReport {
  return {
    id: c.id,
    sense: c.sense,
    sensitivity: ends.sensitivity,
    nominalMm: c.nominalMm,
    upperMm: c.upperMm,
    lowerMm: c.lowerMm,
    halfWidthMm: ends.half,
    varianceShare: share,
  };
}

function finishStack(contributors: readonly StackContributor[], requirement?: StackRequirement): StackSuccess {
  const ends = contributors.map(signedEnds);
  let nominal = 0;
  let wcMin = 0;
  let wcMax = 0;
  let center = 0;
  let sumSq = 0;
  for (const e of ends) {
    nominal += e.nominal;
    wcMin += e.low;
    wcMax += e.high;
    center += e.mid;
    sumSq += e.half * e.half;
  }
  const half = Math.sqrt(sumSq);
  const result: StackSuccess = {
    ok: true,
    method: '1d-arithmetic',
    nominalMm: nominal,
    worstCase: { minMm: wcMin, maxMm: wcMax },
    rss: {
      minMm: center - half,
      maxMm: center + half,
      centerMm: center,
      halfWidthMm: half,
      sigmaEquivalent: RSS_SIGMA_EQUIVALENT,
      convention: RSS_CONVENTION,
    },
    contributors: contributors.map((c, i) => reportRow(c, ends[i], sumSq === 0 ? 0 : (ends[i].half * ends[i].half) / sumSq)),
    disclaimer: TOLERANCE_STACK_DISCLAIMER,
  };
  if (requirement !== undefined) result.requirement = judge(requirement, result);
  return result;
}

/** Worst-case and RSS stack of a 1D chain. `contributors` are validated here. */
export function analyzeToleranceStack(contributors: readonly unknown[], requirement?: unknown): StackResult {
  if (!Array.isArray(contributors) || contributors.length === 0) {
    return refused('contributors must be a non-empty array');
  }
  const rows: StackContributor[] = [];
  for (let i = 0; i < contributors.length; i++) {
    const read = readContributor(contributors[i], i);
    if ('error' in read) return refused(read.error);
    rows.push(read.contributor);
  }
  if (requirement === undefined) return finishStack(rows);
  const req = readRequirement(requirement);
  if ('error' in req) return refused(req.error);
  return finishStack(rows, req.requirement);
}
