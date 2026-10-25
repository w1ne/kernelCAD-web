// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 1: capture-only feature-graph snapshots.
//
// The script runs exactly as it does for a normal evaluation, so capture-time
// semantics (ids, params, assembly solving) are the real ones. We do NOT lower
// records through the OCCT recompute engine: the graph is derived from the
// captured records plus AST source spans.

import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId, Param } from '../shared/intent/types';
import type { RequirementPredicateSpec } from '../shared/intent/requirementRecord';
import { collectParamRefs, resolveParams } from '../shared/runtime/resolveParams';
import { stableStringify } from '../modeling/compute/prefixReuse';
import { runScript } from '../modeling/runtime/runScript';
import { parseTopoRef } from '../kernel/naming/topoRef';
import { CollabSpanIndex } from './sourceSpans';
import type {
  FeatureGraph,
  FeatureNode,
  RequirementNode,
  SourceSpan,
  UnownedSpan,
} from './types';

export interface CaptureFeatureGraphOptions {
  scriptDir?: string;
  /** Runtime file name; only affects reported diagnostics, not ids. */
  fileName?: string;
}

interface NameIndex {
  byName: Map<string, FeatureId>;
}

function recordNames(record: FeatureRecord): string[] {
  const meta = record.metadata as Record<string, unknown> | undefined;
  const names: string[] = [];
  for (const key of ['name', 'featureName', 'partName'] as const) {
    const value = meta?.[key];
    if (typeof value === 'string' && value.length > 0) names.push(value);
  }
  const paramName = (record.params as { name?: Param } | undefined)?.name;
  if (paramName !== undefined && typeof paramName.evaluated === 'string') names.push(paramName.evaluated);
  return names;
}

function resolveFeatureId(raw: string, records: readonly FeatureRecord[], names: NameIndex): FeatureId | undefined {
  if (records.some((r) => r.id === raw)) return raw;
  return names.byName.get(raw);
}

function collectRefs(
  value: unknown,
  records: readonly FeatureRecord[],
  names: NameIndex,
  out: Set<FeatureId>,
  seen: WeakSet<object>,
): void {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    if (!value.startsWith('@kc[')) return;
    const parsed = parseTopoRef(value);
    if ('error' in parsed) return;
    const id = resolveFeatureId(parsed.owner, records, names);
    if (id !== undefined) out.add(id);
    return;
  }
  if (typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, records, names, out, seen);
    return;
  }

  const obj = value as Record<string, unknown>;
  if (typeof obj.kind === 'string') {
    if (typeof obj.id === 'string') {
      const id = resolveFeatureId(obj.id, records, names);
      if (id !== undefined) out.add(id);
    }
    if (typeof obj.featureId === 'string') {
      const id = resolveFeatureId(obj.featureId, records, names);
      if (id !== undefined) out.add(id);
    }
  }
  for (const [key, child] of Object.entries(obj)) {
    if (key === 'paramRef' || key === 'paramRefs') continue;
    collectRefs(child, records, names, out, seen);
  }
}

function refsFor(
  record: FeatureRecord,
  records: readonly FeatureRecord[],
  names: NameIndex,
): Record<string, FeatureId[]> {
  const refs: Record<string, FeatureId[]> = {};
  for (const [slot, value] of Object.entries(record.inputs)) {
    const ids = new Set<FeatureId>();
    collectRefs(value, records, names, ids, new WeakSet());
    if (ids.size > 0) refs[slot] = [...ids];
  }
  if (record.metadata !== undefined) {
    const ids = new Set<FeatureId>();
    collectRefs(record.metadata, records, names, ids, new WeakSet());
    if (ids.size > 0) refs.metadata = [...ids];
  }
  return refs;
}

function plainParamValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const param = value as Param;
  if (typeof param.evaluated === 'number' && Number.isFinite(param.evaluated)) {
    if (param.unit === 'mm' || param.unit === 'deg' || param.unit === 'rad' || param.unit === 'in' || param.unit === 'm') {
      return param.evaluated;
    }
    if (param.expression === 'true') return true;
    if (param.expression === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(param.expression.trim())) return param.evaluated;
    const quoted = /^(['"])(.*)\1$/s.exec(param.expression.trim());
    if (quoted !== null) return quoted[2];
    return param.evaluated;
  }
  return param.expression;
}

function paramRefsFor(record: FeatureRecord): Record<string, string[]> | undefined {
  const out: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(record.params)) {
    const refs = [...collectParamRefs(value)];
    if (refs.length > 0) out[name] = refs;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function requirementInputs(
  predicate: RequirementPredicateSpec | undefined,
  records: readonly FeatureRecord[],
  names: NameIndex,
): FeatureId[] {
  if (predicate === undefined) return [];
  const inputs = new Set<FeatureId>();
  for (const operand of [predicate.a, predicate.b]) {
    if (operand === undefined) continue;
    const id = resolveFeatureId(operand.ref, records, names);
    if (id !== undefined) inputs.add(id);
    for (const entityRef of operand.entityRefs ?? []) {
      const parsed = parseTopoRef(entityRef);
      if ('error' in parsed) continue;
      const owner = resolveFeatureId(parsed.owner, records, names);
      if (owner !== undefined) inputs.add(owner);
    }
  }
  return [...inputs];
}

function canonicalGraph(graph: Omit<FeatureGraph, 'revisionHash' | 'unowned'>): string {
  return stableStringify({
    order: graph.order,
    features: graph.order.map((id) => {
      const node = graph.features.get(id)!;
      return {
        id: node.id,
        kind: node.kind,
        params: node.params,
        refs: node.refs,
        orderKey: node.orderKey,
        ...(node.paramRefs !== undefined ? { paramRefs: node.paramRefs } : {}),
      };
    }),
    params: graph.params,
    ...(graph.paramDeclarations !== undefined ? { paramDeclarations: graph.paramDeclarations } : {}),
    requirements: graph.requirements,
  });
}

/** FNV-1a 64-bit over the canonical JSON, as fixed-width hex. */
function hashCanonical(text: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Capture a feature graph from source without lowering any record. Throws when
 * the script itself throws — the same failure a normal evaluation reports.
 */
export async function captureFeatureGraph(
  source: string,
  opts: CaptureFeatureGraphOptions = {},
): Promise<FeatureGraph> {
  const fileName = opts.fileName ?? 'model.kcad.ts';
  const run = await runScript({
    code: source,
    fileName,
    ...(opts.scriptDir !== undefined ? { scriptDir: opts.scriptDir } : {}),
  });
  const records = run.records;
  const spans = CollabSpanIndex.parse(source, fileName);

  const names: NameIndex = { byName: new Map() };
  for (const record of records) {
    for (const name of recordNames(record)) {
      if (!names.byName.has(name)) names.byName.set(name, record.id);
    }
  }

  const features = new Map<FeatureId, FeatureNode>();
  const order: FeatureId[] = [];
  const requirements: Record<string, RequirementNode> = {};
  const ownedSpans: SourceSpan[] = [];

  for (const record of records) {
    const location = record.scriptLocation;
    const call = location !== undefined ? spans.callAt(location) : undefined;
    const sourceSpan = call?.statement ?? { start: 0, end: 0 };
    if (call !== undefined) ownedSpans.push(sourceSpan);

    if (record.kind === 'require') {
      const meta = record.metadata as { name?: unknown; predicate?: unknown } | undefined;
      const name = typeof meta?.name === 'string' ? meta.name : `requirement_${Object.keys(requirements).length + 1}`;
      const predicate = typeof meta?.predicate === 'object' && meta.predicate !== null
        ? meta.predicate as RequirementPredicateSpec
        : undefined;
      requirements[name] = {
        inputs: requirementInputs(predicate, records, names),
        ...(predicate !== undefined ? { predicate } : {}),
        sourceSpan,
      };
      continue;
    }

    const resolved = resolveParams(record, run.paramTable) as FeatureRecord;
    const params: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(resolved.params)) params[name] = plainParamValue(value);
    const paramRefs = paramRefsFor(record);
    const node: FeatureNode = {
      id: record.id,
      kind: record.kind,
      params,
      refs: refsFor(record, records, names),
      orderKey: order.length,
      sourceSpan,
      ...(call !== undefined ? { callSpan: call.call } : {}),
      ...(paramRefs !== undefined ? { paramRefs } : {}),
    };
    features.set(record.id, node);
    order.push(record.id);
  }

  const params: Record<string, unknown> = {};
  const paramDeclarations: Record<string, { type: string; meta?: Record<string, unknown> }> = {};
  for (const entry of run.paramTable.list()) {
    params[entry.name] = entry.value;
    paramDeclarations[entry.name] = {
      type: entry.type,
      ...(entry.meta !== undefined ? { meta: entry.meta as Record<string, unknown> } : {}),
    };
  }

  const unowned: UnownedSpan[] = spans.unownedStatements(ownedSpans);
  const graphWithoutHash = {
    features,
    order,
    params,
    ...(Object.keys(paramDeclarations).length > 0 ? { paramDeclarations } : {}),
    requirements,
    unowned,
  };
  const revisionHash = hashCanonical(canonicalGraph(graphWithoutHash));
  return { revisionHash, ...graphWithoutHash };
}

/** Canonical JSON of a graph, useful for diagnostics and equality checks. */
export function featureGraphCanonicalJson(graph: FeatureGraph): string {
  return canonicalGraph(graph);
}
