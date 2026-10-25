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
import type { ParamTable } from '../shared/runtime/paramTable';
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

interface CapturedGraphParts {
  features: Map<FeatureId, FeatureNode>;
  order: FeatureId[];
  requirements: Record<string, RequirementNode>;
  ownedSpans: SourceSpan[];
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

function nameIndex(records: readonly FeatureRecord[]): NameIndex {
  const byName = new Map<string, FeatureId>();
  for (const record of records) {
    for (const name of recordNames(record)) {
      if (!byName.has(name)) byName.set(name, record.id);
    }
  }
  return { byName };
}

function resolveFeatureId(raw: string, records: readonly FeatureRecord[], names: NameIndex): FeatureId | undefined {
  if (records.some((r) => r.id === raw)) return raw;
  return names.byName.get(raw);
}

function addResolved(raw: unknown, records: readonly FeatureRecord[], names: NameIndex, out: Set<FeatureId>): void {
  if (typeof raw !== 'string') return;
  const id = resolveFeatureId(raw, records, names);
  if (id !== undefined) out.add(id);
}

function collectTopoString(value: string, records: readonly FeatureRecord[], names: NameIndex, out: Set<FeatureId>): void {
  if (!value.startsWith('@kc[')) return;
  const parsed = parseTopoRef(value);
  if ('error' in parsed) return;
  addResolved(parsed.owner, records, names, out);
}

function collectObjectRefs(
  obj: Record<string, unknown>,
  records: readonly FeatureRecord[],
  names: NameIndex,
  out: Set<FeatureId>,
  seen: WeakSet<object>,
): void {
  if (typeof obj.kind === 'string') {
    addResolved(obj.id, records, names, out);
    addResolved(obj.featureId, records, names, out);
  }
  for (const [key, child] of Object.entries(obj)) {
    if (key === 'paramRef' || key === 'paramRefs') continue;
    collectRefs(child, records, names, out, seen);
  }
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
    collectTopoString(value, records, names, out);
    return;
  }
  if (typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, records, names, out, seen);
    return;
  }
  collectObjectRefs(value as Record<string, unknown>, records, names, out, seen);
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
  if (typeof param.evaluated !== 'number' || !Number.isFinite(param.evaluated)) return param.expression;
  if (param.expression === 'true') return true;
  if (param.expression === 'false') return false;
  const quoted = /^(['"])(.*)\1$/s.exec(param.expression.trim());
  if (quoted !== null) return quoted[2];
  return param.evaluated;
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
    addResolved(operand.ref, records, names, inputs);
    for (const entityRef of operand.entityRefs ?? []) collectTopoString(entityRef, records, names, inputs);
  }
  return [...inputs];
}

function requirementNode(
  record: FeatureRecord,
  records: readonly FeatureRecord[],
  names: NameIndex,
  span: SourceSpan,
): { name: string; node: RequirementNode } {
  const meta = record.metadata as { name?: unknown; predicate?: unknown } | undefined;
  const name = typeof meta?.name === 'string' ? meta.name : `requirement_${record.id}`;
  const predicate = typeof meta?.predicate === 'object' && meta.predicate !== null
    ? meta.predicate as RequirementPredicateSpec
    : undefined;
  return {
    name,
    node: {
      inputs: requirementInputs(predicate, records, names),
      ...(predicate !== undefined ? { predicate } : {}),
      sourceSpan: span,
    },
  };
}

function featureNode(
  record: FeatureRecord,
  records: readonly FeatureRecord[],
  names: NameIndex,
  span: SourceSpan,
  orderKey: number,
  paramTable: ParamTable,
  callSpan?: SourceSpan,
): FeatureNode {
  const resolved = resolveParams(record, paramTable) as FeatureRecord;
  const params: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(resolved.params)) params[name] = plainParamValue(value);
  const paramRefs = paramRefsFor(record);
  return {
    id: record.id,
    kind: record.kind,
    params,
    refs: refsFor(record, records, names),
    orderKey,
    sourceSpan: span,
    ...(callSpan !== undefined ? { callSpan } : {}),
    ...(paramRefs !== undefined ? { paramRefs } : {}),
  };
}

function capturedGraphParts(
  records: readonly FeatureRecord[],
  spans: CollabSpanIndex,
  names: NameIndex,
  paramTable: ParamTable,
): CapturedGraphParts {
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
      const captured = requirementNode(record, records, names, sourceSpan);
      requirements[captured.name] = captured.node;
      continue;
    }

    features.set(
      record.id,
      featureNode(record, records, names, sourceSpan, order.length, paramTable, call?.call),
    );
    order.push(record.id);
  }
  return { features, order, requirements, ownedSpans };
}

function paramSnapshot(paramTable: ParamTable): {
  params: Record<string, unknown>;
  paramDeclarations?: Record<string, { type: string; meta?: Record<string, unknown> }>;
} {
  const params: Record<string, unknown> = {};
  const paramDeclarations: Record<string, { type: string; meta?: Record<string, unknown> }> = {};
  for (const entry of paramTable.list()) {
    params[entry.name] = entry.value;
    paramDeclarations[entry.name] = {
      type: entry.type,
      ...(entry.meta !== undefined ? { meta: entry.meta as Record<string, unknown> } : {}),
    };
  }
  return {
    params,
    ...(Object.keys(paramDeclarations).length > 0 ? { paramDeclarations } : {}),
  };
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
  const names = nameIndex(records);
  const captured = capturedGraphParts(records, spans, names, run.paramTable);
  const snapshot = paramSnapshot(run.paramTable);
  const unowned: UnownedSpan[] = spans.unownedStatements(captured.ownedSpans);
  const graphWithoutHash = {
    features: captured.features,
    order: captured.order,
    ...snapshot,
    requirements: captured.requirements,
    unowned,
  };
  return { revisionHash: hashCanonical(canonicalGraph(graphWithoutHash)), ...graphWithoutHash };
}

/** Canonical JSON of a graph, useful for diagnostics and equality checks. */
export function featureGraphCanonicalJson(graph: FeatureGraph): string {
  return canonicalGraph(graph);
}
