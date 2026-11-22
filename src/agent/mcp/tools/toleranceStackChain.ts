// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Resolve analyze_tolerance_stack chain entries against declared dimensions.
// Nominals come from the viewer measurement, with a point-to-point fallback.

import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { viewerDimensionsForModel } from '../../../composition/viewerDimensionsForModel';
import type { BuiltModel } from '../../../modeling/buildModel';
import { collectDrawingDeclarations } from '../../../modeling/runtime/drawingDeclarations';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { DrawingDimensionSpec } from '../../../shared/intent/drawingGdtRecord';
import type { ViewerDimension } from '../../../shared/intent/viewerDimension';
import {
  analyzeToleranceStack,
  parseDimensionTol,
  DimensionTolError,
  TOLERANCE_STACK_DISCLAIMER,
  type StackResult,
} from '../../../shared/tol/stackup';

export interface ChainRequest {
  file?: string;
  code?: string;
  chain: unknown;
  requirement?: unknown;
}

interface ChainEntry {
  id: string;
  sense: '+' | '-';
  tol?: unknown;
}

function refused(error: string): StackResult {
  return { ok: false, errorCode: 'cli.invalid-args', error, disclaimer: TOLERANCE_STACK_DISCLAIMER };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function span(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

function asPoint(v: unknown): [number, number, number] | undefined {
  if (!Array.isArray(v) || v.length !== 3) return undefined;
  if (!v.every(n => typeof n === 'number' && Number.isFinite(n))) return undefined;
  return [v[0], v[1], v[2]];
}

function readChainEntry(raw: unknown, index: number): { entry: ChainEntry } | { error: string } {
  if (typeof raw === 'string') {
    if (raw.trim() === '') return { error: `chain[${index}] must be a nonempty dimension id` };
    return { entry: { id: raw, sense: '+' } };
  }
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.trim() === '') {
    return { error: `chain[${index}] must be a dimension id or { id, sense?, tol? }` };
  }
  if (raw.sense !== undefined && raw.sense !== '+' && raw.sense !== '-') {
    return { error: `${raw.id} sense must be '+' or '-'` };
  }
  return {
    entry: {
      id: raw.id,
      sense: raw.sense === '-' ? '-' : '+',
      ...(raw.tol !== undefined ? { tol: raw.tol } : {}),
    },
  };
}

function parseChain(raw: unknown): { entries: ChainEntry[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'chain must be a non-empty array of dimension ids' };
  const entries: ChainEntry[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const read = readChainEntry(raw[i], i);
    if ('error' in read) return read;
    if (seen.has(read.entry.id)) return { error: `chain lists '${read.entry.id}' more than once` };
    seen.add(read.entry.id);
    entries.push(read.entry);
  }
  return { entries };
}

function locate(dims: readonly DrawingDimensionSpec[], id: string, elsewhere: readonly string[]): number | string {
  const byId = dims.flatMap((d, i) => d.id === id ? [i] : []);
  if (byId.length > 1) return `dimension id '${id}' is declared more than once`;
  if (byId.length === 1) return byId[0];
  const byLabel = dims.flatMap((d, i) => d.label === id ? [i] : []);
  if (byLabel.length > 1) return `dimension label '${id}' is ambiguous`;
  if (byLabel.length === 1) return byLabel[0];
  if (elsewhere.includes(id)) return `dimension '${id}' is declared, but not on the returned shape`;
  const known = dims.map(d => d.id ?? d.label).filter((name): name is string => typeof name === 'string');
  return known.length > 0
    ? `no dimension '${id}' on the returned shape; declared: ${known.join(', ')}`
    : `no dimension '${id}' on the returned shape`;
}

function nominalMm(spec: DrawingDimensionSpec, index: number, measured: readonly ViewerDimension[]): number | undefined {
  const hit = measured.find(d => d.id === `declared:${index}`);
  if (hit !== undefined && hit.kind !== 'angular') return span(hit.a, hit.b);
  if (spec.kind !== 'linear') return undefined;
  const a = asPoint(spec.from);
  const b = asPoint(spec.to);
  return a !== undefined && b !== undefined ? span(a, b) : undefined;
}

function declaredElsewhere(records: readonly FeatureRecord[]): string[] {
  const ids: string[] = [];
  for (const record of records) {
    if (record.kind !== 'drawingDimension') continue;
    const id = (record.metadata as { id?: unknown } | undefined)?.id;
    if (typeof id === 'string') ids.push(id);
  }
  return ids;
}

const MISSING_TOL =
  'needs a tolerance. Set shape.dimension({ tol }) or pass tol on the chain entry. ' +
  'A missing upper/lower is refused; this tool does not apply ISO 2768 or any other general tolerance class.';

function oneContributor(
  entry: ChainEntry,
  spec: DrawingDimensionSpec,
  index: number,
  measured: readonly ViewerDimension[],
): { contributor: { id: string; nominalMm: number; upperMm: number; lowerMm: number; sense: '+' | '-' } } | { error: string } {
  if (spec.kind === 'angular') return { error: `${entry.id} is an angular dimension (degrees) and cannot join a millimetre stack` };
  const nominal = nominalMm(spec, index, measured);
  if (nominal === undefined) {
    return { error: `could not measure a nominal for '${entry.id}'. Use resolved anchors or pass explicit contributors.` };
  }
  const rawTol = entry.tol !== undefined ? entry.tol : spec.tol;
  if (rawTol === undefined) return { error: `${entry.id} ${MISSING_TOL}` };
  try {
    const tol = parseDimensionTol(rawTol);
    return {
      contributor: {
        id: entry.id,
        nominalMm: nominal,
        upperMm: tol.upper,
        lowerMm: tol.lower,
        sense: entry.sense,
      },
    };
  } catch (err) {
    const message = err instanceof DimensionTolError ? err.message : 'tolerance is invalid';
    return { error: `${entry.id} tol ${message}` };
  }
}

function contributorsFromModel(model: BuiltModel, entries: readonly ChainEntry[]): StackResult | { rows: unknown[] } {
  if (model.rootId === undefined) return refused('Script did not return a shape to measure.');
  const dims = collectDrawingDeclarations(model.records, model.rootId).dimensions;
  let measured: ViewerDimension[] = [];
  try {
    measured = viewerDimensionsForModel(model, { auto: false }).dimensions;
  } catch (err) {
    return refused(err instanceof Error ? err.message : 'Could not measure declared dimensions.');
  }
  const elsewhere = declaredElsewhere(model.records);
  const rows = [];
  for (const entry of entries) {
    const found = locate(dims, entry.id, elsewhere);
    if (typeof found === 'string') return refused(found);
    const resolved = oneContributor(entry, dims[found], found, measured);
    if ('error' in resolved) return refused(resolved.error);
    rows.push(resolved.contributor);
  }
  return { rows };
}

function buildFailure(message: string | undefined): StackResult {
  return refused(message ?? 'Script did not build.');
}

/** Measure `chain` on a built script and run the shared stack. */
export async function analyzeToleranceChain(input: ChainRequest): Promise<StackResult> {
  const parsed = parseChain(input.chain);
  if ('error' in parsed) return refused(parsed.error);
  const built = await evaluateAndBuildScript({ file: input.file, code: input.code });
  if (built.model === undefined || built.evaluation.exitCode !== 0) {
    return buildFailure(built.evaluation.diagnostics[0]?.message);
  }
  const resolved = contributorsFromModel(built.model, parsed.entries);
  if ('ok' in resolved) return resolved;
  return analyzeToleranceStack(resolved.rows, input.requirement);
}
