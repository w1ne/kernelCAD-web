// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/naming/resolveEdgeRef.ts
//
// A created edge ref resolves in two steps, both on the lineage that already
// exists. A birth label on EdgeLineage (`corner`, `top-perimeter`, a sketch
// segment label) returns those edge hashes. Otherwise the ref is a face slot:
// resolveFaceRef on a synthesized face ref, and the caller takes that face's
// boundary edges.

import type { EdgeRef } from '../../shared/intent/types';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { EdgeHash, EdgeHistoryMap, FaceHash } from './evolutionRecord';
import { resolveFaceRef } from './resolveFaceRef';

export type EdgeResolveResult =
  | { ok: true; edgeHashes: readonly EdgeHash[] }
  | { ok: true; faceHashForBoundaryEdges: FaceHash; warnings?: CompilerDiagnostic[] }
  | { ok: false; diagnostic: CompilerDiagnostic };

export interface EdgeResolveContext {
  currentShape: OcctBackend;
  featureId: string;
  surface: 'edge-feature' | 'face-feature';
}

/** Edges whose stored birth label is this slot, born on `rewriteId`. */
function edgesWithBirthLabel(
  map: EdgeHistoryMap | undefined,
  ref: Extract<EdgeRef, { kind: 'created' }>,
): EdgeHash[] {
  if (!map) return [];
  const out: EdgeHash[] = [];
  for (const [hash, lineage] of map) {
    if (lineage.labelName !== ref.slot) continue;
    if (lineage.featureId === ref.rewriteId || lineage.rootFeatureId === ref.rewriteId) out.push(hash);
  }
  return out;
}

export function resolveEdgeRef(ref: EdgeRef, ctx: EdgeResolveContext): EdgeResolveResult {
  if (ref.kind !== 'created') {
    return {
      ok: false,
      diagnostic: {
        target: 'export-occt',
        code: 'feature.face-ref.not-resolvable',
        featureId: ctx.featureId,
        severity: 'error',
        message: `resolveEdgeRef: ref kind '${ref.kind}' not handled by this helper.`,
        hint: 'Use queries/segments through their dedicated resolvers; created refs only here.',
      },
    };
  }
  const labeled = edgesWithBirthLabel(ctx.currentShape.edgeHistoryMap, ref);
  if (labeled.length > 0) return { ok: true, edgeHashes: labeled };
  const synth = resolveFaceRef(
    { kind: 'created', rewriteId: ref.rewriteId, slot: ref.slot },
    { currentShape: ctx.currentShape, featureId: ctx.featureId, surface: ctx.surface },
  );
  if (!synth.ok) return { ok: false, diagnostic: synth.diagnostic };
  return { ok: true, faceHashForBoundaryEdges: synth.faceHash, warnings: synth.warnings };
}
