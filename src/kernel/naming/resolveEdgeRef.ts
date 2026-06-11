// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/naming/resolveEdgeRef.ts
//
// Slice scope: edge `created` refs are resolved by delegating to
// resolveFaceRef on a synthesized face ref ({ kind:'created', rewriteId,
// slot }), then the caller (edgeSelection) collects boundary edges of the
// resolved face. Full edge-lineage parity (separate EdgeLineage with
// featureId/featureKind/snapshotAtCreate) is deferred to a follow-up patch.

import type { EdgeRef } from '../../shared/intent/types';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { FaceHash } from './evolutionRecord';
import { resolveFaceRef } from './resolveFaceRef';

export type EdgeResolveResult =
  | { ok: true; faceHashForBoundaryEdges: FaceHash; warnings?: CompilerDiagnostic[] }
  | { ok: false; diagnostic: CompilerDiagnostic };

export interface EdgeResolveContext {
  currentShape: OcctBackend;
  featureId: string;
  surface: 'edge-feature' | 'face-feature';
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
  const synth = resolveFaceRef(
    { kind: 'created', rewriteId: ref.rewriteId, slot: ref.slot },
    { currentShape: ctx.currentShape, featureId: ctx.featureId, surface: ctx.surface },
  );
  if (!synth.ok) return { ok: false, diagnostic: synth.diagnostic };
  return { ok: true, faceHashForBoundaryEdges: synth.faceHash, warnings: synth.warnings };
}
