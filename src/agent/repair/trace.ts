// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Build the feature trace: the persistent link between a modeling step, the
// script lines that authored it, the evidence it produced, and its neighbours
// in the dependency graph.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureRef } from '../../shared/intent/types';
import { ScriptSpanIndex } from './scriptSpans';
import type {
  FeatureHealth,
  FeatureTraceEntry,
  RepairRegion,
  RepairRegionRange,
} from './types';

export interface BuildTraceInput {
  records: readonly FeatureRecord[];
  /** Original script text, used to resolve AST ranges. */
  source: string;
  fileName: string;
  health: ReadonlyMap<string, 'healthy' | 'warning' | 'error'>;
  diagnostics: readonly CompilerDiagnostic[];
  /** Reusable parse of `source`; built on demand when omitted. */
  spans?: ScriptSpanIndex;
}

/** The upstream feature a ref points at, or undefined for non-feature refs. */
export function upstreamFeatureId(ref: FeatureRef): string | undefined {
  // Surface refs point at a SurfaceRecord rather than a FeatureRecord, so they
  // contribute no upstream feature edge.
  if (ref.kind === 'surface') return undefined;
  return ref.kind === 'feature' ? ref.id : ref.featureId;
}

export function buildFeatureTrace(input: BuildTraceInput): FeatureTraceEntry[] {
  const spans = input.spans ?? ScriptSpanIndex.parse(input.source, input.fileName);

  const dependents = new Map<string, string[]>();
  for (const record of input.records) {
    for (const ref of Object.values(record.inputs)) {
      const upstream = upstreamFeatureId(ref);
      if (upstream === undefined) continue;
      const list = dependents.get(upstream) ?? [];
      if (!list.includes(record.id)) list.push(record.id);
      dependents.set(upstream, list);
    }
  }

  return input.records.map(record => {
    const inputs: string[] = [];
    for (const ref of Object.values(record.inputs)) {
      const upstream = upstreamFeatureId(ref);
      if (upstream !== undefined && !inputs.includes(upstream)) inputs.push(upstream);
    }

    const span = record.scriptLocation === undefined
      ? undefined
      : spans.callAt(record.scriptLocation);

    const health: FeatureHealth = input.health.get(record.id) ?? 'unknown';
    const paramRefs = (record.metadata as { paramRefs?: unknown } | undefined)?.paramRefs;

    return {
      feature_id: record.id,
      kind: record.kind,
      health,
      ...(record.scriptLocation !== undefined ? { location: record.scriptLocation } : {}),
      ...(span !== undefined
        ? { nodeRange: span.nodeRange, statementRange: span.statementRange }
        : {}),
      diagnostics: withNextActions(
        input.diagnostics.filter(d => d.featureId === record.id),
      ),
      inputs,
      dependents: dependents.get(record.id) ?? [],
      paramRefs: Array.isArray(paramRefs) ? (paramRefs as string[]).map(String) : [],
    };
  });
}

/**
 * The minimal set of line ranges whose edit can address a failure at
 * `featureId`: the failing feature's own statement, the statements that
 * authored its direct inputs (a boolean's cutter is a parameter source, not
 * bystander geometry), and the `param(…)` declarations it reads.
 *
 * Deliberately NOT transitive. A region that grows with the upstream chain
 * stops bounding anything; when the root cause is further upstream, the agent
 * re-runs `why_did_this_fail` against that feature and gets its own region.
 */
export function computeRepairRegion(args: {
  trace: readonly FeatureTraceEntry[];
  featureId: string;
  fileName: string;
  spans: ScriptSpanIndex;
}): RepairRegion {
  const byId = new Map(args.trace.map(entry => [entry.feature_id, entry]));
  const target = byId.get(args.featureId);
  const ranges: RepairRegionRange[] = [];

  const push = (range: RepairRegionRange): void => {
    const duplicate = ranges.some(
      existing =>
        existing.startLine === range.startLine &&
        existing.endLine === range.endLine &&
        existing.role === range.role,
    );
    if (!duplicate) ranges.push(range);
  };

  if (target?.statementRange !== undefined) {
    push({ ...target.statementRange, role: 'failing-feature', featureId: target.feature_id });
  }

  for (const inputId of target?.inputs ?? []) {
    const upstream = byId.get(inputId);
    if (upstream?.statementRange === undefined) continue;
    push({ ...upstream.statementRange, role: 'input-feature', featureId: inputId });
  }

  const paramNames = new Set<string>(target?.paramRefs ?? []);
  for (const inputId of target?.inputs ?? []) {
    for (const name of byId.get(inputId)?.paramRefs ?? []) paramNames.add(name);
  }
  for (const name of paramNames) {
    const range = args.spans.paramDeclarationRange(name);
    if (range === undefined) continue;
    push({ ...range, role: 'parameter-source', paramName: name });
  }

  ranges.sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine);
  return { file: args.fileName, ranges };
}

/** True when `[startLine, endLine]` lies entirely inside one region range. */
export function isWithinRegion(
  region: RepairRegion,
  startLine: number,
  endLine: number,
): boolean {
  return region.ranges.some(
    range => startLine >= range.startLine && endLine <= range.endLine,
  );
}
