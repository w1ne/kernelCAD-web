// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/whyDidThisFail.ts
//
// Walk the upstream chain of a failing feature. Returns the diagnostics
// array of the requested feature and the diagnostics of every upstream
// feature in topological order, ending with the requested feature.
//
// Per-code hints are now inline on every diagnostic (Phase 1/2 of the
// vocabulary collapse), so this tool no longer carries an HINTS map.
// Agents can call list_diagnostic_codes for the full catalogue.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import type { FeatureKind } from '../../../shared/intent/types';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { runMcpScript } from '../runMcpScript';

export interface WhyDidThisFailInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export interface ChainEntry {
  feature_id: string;
  kind: FeatureKind;
  health: 'healthy' | 'warning' | 'error' | 'unknown';
  diagnostics: CompilerDiagnostic[];
}

export interface WhyDidThisFailOutput {
  ok: boolean;
  feature_id?: string;
  /**
   * Topologically ordered chain ending at the requested feature_id.
   * Each entry: the feature's id, kind, health, and diagnostics array.
   * The requested feature is the last entry. Walk in reverse to find
   * the root cause.
   */
  chain?: ChainEntry[];
  error?: string;
  /**
   * Structured diagnostic code when the underlying script-runtime
   * exception was a `KernelError`; otherwise `cli.script-exception` for
   * non-kernel throws. Only set on `ok=false` from the runScript catch path.
   */
  errorCode?: string;
}

export async function whyDidThisFailTool(input: WhyDidThisFailInput): Promise<WhyDidThisFailOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;

  if (run.records.length === 0) return { ok: false, error: 'Script produced no features.' };

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const targetRecord = run.records.find(r => r.id === targetId);
  if (!targetRecord) return { ok: false, error: `feature_id '${targetId}' not found.` };

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });

  // Collect upstream feature ids reachable from the target via input edges.
  // The walk is BFS so every transitive predecessor is included; the final
  // emit order is then re-sorted by record-array index to give a topological
  // ordering (records are already in declaration order, which is a valid
  // topological order since features can only reference earlier-declared ids).
  const upstreamIds = new Set<string>();
  const queue: string[] = [];
  for (const ref of Object.values(targetRecord.inputs)) {
    // W1.3: 'surface' refs point to a SurfaceRecord (not a FeatureRecord),
    // so there's no upstream Feature to walk through. Skip.
    const upId =
      ref.kind === 'surface'
        ? undefined
        : ref.kind === 'feature'
          ? ref.id
          : ref.featureId;
    if (upId && !upstreamIds.has(upId)) {
      upstreamIds.add(upId);
      queue.push(upId);
    }
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const rec = run.records.find(r => r.id === id);
    if (!rec) continue;
    for (const ref of Object.values(rec.inputs)) {
      // W1.3: 'surface' refs point to a SurfaceRecord (not a FeatureRecord),
    // so there's no upstream Feature to walk through. Skip.
    const upId =
      ref.kind === 'surface'
        ? undefined
        : ref.kind === 'feature'
          ? ref.id
          : ref.featureId;
      if (upId && !upstreamIds.has(upId)) {
        upstreamIds.add(upId);
        queue.push(upId);
      }
    }
  }

  const chain: ChainEntry[] = [];
  for (const rec of run.records) {
    if (rec.id !== targetId && !upstreamIds.has(rec.id)) continue;
    const featureDiags = result.diagnostics.filter(d => d.featureId === rec.id);
    chain.push({
      feature_id: rec.id,
      kind: rec.kind,
      health: result.health.get(rec.id) ?? (result.shapes.has(rec.id) ? 'healthy' : 'unknown'),
      diagnostics: withNextActions(featureDiags),
    });
  }

  return {
    ok: true,
    feature_id: targetId,
    chain,
  };
}
