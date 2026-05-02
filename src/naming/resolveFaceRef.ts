/**
 * Walk-back-to-primitive + walk-forward-through-history face/edge ref resolver.
 *
 * v0.2 algorithm:
 *  1. Walk back through inputs.base chain to find the originating primitive.
 *  2. Resolve the canonical name there using existing canonical resolvers.
 *  3. Walk forward through every operation's HistoryMap to current handle.
 *  4. Count children: 1 = success, 0 = removed, >1 = ambiguous.
 *
 * Out of scope (v0.3): geometry-snapshot fallback for ambiguous splits.
 */

import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import type { FaceRef } from '../intent/types';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { FaceHash } from './evolutionRecord';

export type ResolveResult =
  | { ok: true; faceHash: FaceHash }
  | { ok: false; diagnostic: CompilerDiagnostic };

export interface ResolveContext {
  /** The shape on which we're resolving the ref (the input to the edge/face feature being lowered). */
  currentShape: OcctBackend;
  /** The feature ID of the operation being lowered (used for diagnostic.featureId). */
  featureId: string;
  /** Surface for diagnostic codes — 'edge-feature' for fillet/chamfer; 'face-feature' for shell. */
  surface: 'edge-feature' | 'face-feature';
}

export function resolveFaceRef(ref: FaceRef, ctx: ResolveContext): ResolveResult {
  if (ref.kind !== 'canonical') {
    // Other variants (label/query) are handled by their existing resolvers; this
    // function only handles canonical refs (which is where v0.2 changes behavior).
    // Caller should dispatch on ref.kind before reaching here.
    return {
      ok: false,
      diagnostic: {
        target: 'export-occt',
        code: `feature.${ctx.surface}.face-ref-not-resolvable`,
        featureId: ctx.featureId,
        severity: 'error',
        message: `resolveFaceRef called with non-canonical ref kind '${ref.kind}'; this is a controller bug.`,
      },
    };
  }

  // Walk back through `currentShape` to find the originating primitive.
  // OcctBackend.kind === 'box'/'cylinder'/'sphere' identifies a primitive.
  // Each derived shape has a historyMap pointing back via FaceLineage.rootHash.
  // Algorithm:
  //   - For each face in currentShape, look up its lineage in historyMap.
  //   - Find lineages whose canonicalName matches ref.face.
  //   - Count distinct currentShape face hashes that resolve to this canonical name.

  const map = ctx.currentShape.historyMap;
  if (!map || map.size === 0) {
    // No history: must be an un-transformed primitive. Fall back to the existing
    // canonical resolver path. (This branch maintains backward compat: existing
    // behavior on raw box/cylinder/sphere is unchanged.)
    return {
      ok: false,
      diagnostic: {
        target: 'export-occt',
        code: `feature.${ctx.surface}.face-ref-not-resolvable`,
        featureId: ctx.featureId,
        severity: 'error',
        message: `historyMap not initialized on shape kind '${ctx.currentShape.kind ?? 'unknown'}'; resolver expected lineage data.`,
      },
    };
  }

  const matches: FaceHash[] = [];
  for (const [currentHash, lineage] of map.entries()) {
    if (lineage.canonicalName === ref.face) {
      matches.push(currentHash);
    }
  }

  if (matches.length === 1) {
    return { ok: true, faceHash: matches[0] };
  }
  if (matches.length === 0) {
    return {
      ok: false,
      diagnostic: {
        target: 'export-occt',
        code: `feature.${ctx.surface}.face-ref-removed`,
        featureId: ctx.featureId,
        severity: 'error',
        message: `Face '${ref.face}' was removed by an upstream operation. Reference a different face that still exists in the current shape.`,
      },
    };
  }
  // matches.length > 1
  return {
    ok: false,
    diagnostic: {
      target: 'export-occt',
      code: `feature.${ctx.surface}.face-ref-ambiguous-after-split`,
      featureId: ctx.featureId,
      severity: 'error',
      message: `Face '${ref.face}' was split into ${matches.length} children by an upstream operation. Geometry-fallback disambiguation ships in v0.3.0; for now, apply this feature before the splitting operation, or use a query-based selector.`,
    },
  };
}
