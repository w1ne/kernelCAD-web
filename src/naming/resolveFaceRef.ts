/**
 * Walk-back-to-primitive + walk-forward-through-history face/edge ref resolver.
 *
 * v0.2 algorithm:
 *  1. Walk back through inputs.base chain to find the originating primitive.
 *  2. Resolve the canonical name there using existing canonical resolvers.
 *  3. Walk forward through every operation's HistoryMap to current handle.
 *  4. Count children: 1 = success, 0 = removed, >1 = ambiguous.
 *
 * v0.3 additions:
 *  - `created` face refs: dispatched to a parallel branch that walks the
 *    historyMap by (featureId, slot), with a geometry-snapshot fallback when
 *    the topology lookup loses the face (emits `feature.created-ref.fallback-used`
 *    as a warn-severity diagnostic in `result.warnings`).
 */

import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';
import type { FaceRef } from '../intent/types';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { FaceHash } from './evolutionRecord';
import { findByGeometrySnapshot } from './geometrySnapshotFallback';
import { DEFAULT_SNAPSHOT_TOLERANCE } from '../backends/occt/createdRefs';
import { HINT_TEMPLATES } from '../shared/diagnostics/codes';

export type ResolveResult =
  | { ok: true; faceHash: FaceHash; warnings?: CompilerDiagnostic[] }
  | { ok: false; diagnostic: CompilerDiagnostic };

export interface ResolveContext {
  /** The shape on which we're resolving the ref (the input to the edge/face feature being lowered). */
  currentShape: OcctBackend;
  /** The feature ID of the operation being lowered (used for diagnostic.featureId). */
  featureId: string;
  /**
   * Surface for diagnostic context — 'edge-feature' for fillet/chamfer;
   * 'face-feature' for shell. Codes are now identical across surfaces
   * (feature.face-ref.*); the surface is preserved here only because the
   * resolver may use it to specialize messages in the future.
   */
  surface: 'edge-feature' | 'face-feature';
}

type FaceSnapshotImported = import('../backends/occt/createdRefs').FaceSnapshot;

export function resolveFaceRef(ref: FaceRef, ctx: ResolveContext): ResolveResult {
  if (ref.kind === 'canonical') return resolveCanonical(ref, ctx);
  if (ref.kind === 'created') return resolveCreated(ref, ctx);
  // Other variants (label/query/tracked/propagated) are handled by their own
  // dedicated resolvers / dispatch paths. This function only handles canonical
  // and created refs.
  return {
    ok: false,
    diagnostic: {
      target: 'export-occt',
      code: 'feature.face-ref.not-resolvable',
      featureId: ctx.featureId,
      severity: 'error',
      message: `resolveFaceRef called with unsupported ref kind '${ref.kind}'; this is a controller bug.`,
      hint: 'Dispatch on ref.kind before calling resolveFaceRef; canonical and created refs only.',
    },
  };
}

function resolveCanonical(ref: Extract<FaceRef, { kind: 'canonical' }>, ctx: ResolveContext): ResolveResult {
  // Walk back through `currentShape` to find the originating primitive.
  // OcctBackend.kind === 'box'/'cylinder'/'sphere' identifies a primitive.
  // Each derived shape has a historyMap pointing back via FaceLineage.rootHash.
  // Algorithm:
  //   - For each face in currentShape, look up its lineage in historyMap.
  //   - Find lineages whose canonicalName matches ref.face.
  //   - Count distinct currentShape face hashes that resolve to this canonical name.

  const map = ctx.currentShape.historyMap;
  if (map === undefined) {
    // No history: historyMap was never seeded (e.g. sphere, which has no canonical
    // planar face names). Caller should have dispatched to the legacy path.
    return {
      ok: false,
      diagnostic: {
        target: 'export-occt',
        code: 'feature.face-ref.not-resolvable',
        featureId: ctx.featureId,
        severity: 'error',
        message: `historyMap not initialized on shape kind '${ctx.currentShape.kind ?? 'unknown'}'; resolver expected lineage data.`,
        hint: 'Apply this feature before any transform, or fillet/shell the primitive first then translate.',
      },
    };
  }
  // An empty map (map.size === 0) is valid: all faces were removed by an upstream
  // boolean. Proceed to the matches loop; it will find 0 matches → face-ref.removed.

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
        code: 'feature.face-ref.removed',
        featureId: ctx.featureId,
        severity: 'error',
        message: `Face '${ref.face}' was removed by an upstream operation. Reference a different face that still exists in the current shape.`,
        hint: 'Reference a face that still exists, or apply this feature before the removing boolean.',
      },
    };
  }
  // matches.length > 1
  return {
    ok: false,
    diagnostic: {
      target: 'export-occt',
      code: 'feature.face-ref.ambiguous-after-split',
      featureId: ctx.featureId,
      severity: 'error',
      message: `Face '${ref.face}' was split into ${matches.length} children by an upstream operation. Geometry-fallback disambiguation ships in v0.3.0; for now, apply this feature before the splitting operation, or use a query-based selector.`,
      hint: 'Apply this feature before the splitting boolean, or use a query-based selector.',
    },
  };
}

function resolveCreated(ref: Extract<FaceRef, { kind: 'created' }>, ctx: ResolveContext): ResolveResult {
  const map = ctx.currentShape.historyMap;
  if (map === undefined) {
    return {
      ok: false,
      diagnostic: {
        target: 'export-occt',
        code: 'feature.face-ref.not-resolvable',
        featureId: ctx.featureId,
        severity: 'error',
        message: `historyMap not initialized; created-ref '${ref.rewriteId}.${ref.slot}' cannot resolve.`,
        hint: 'Apply this feature before any transform.',
      },
    };
  }

  // 1. Topology route: lineage.featureId === ref.rewriteId && labelName === ref.slot.
  //    Only entries with a live `snapshot` field count as topology hits — a
  //    lineage that retains only `snapshotAtCreate` (and no live snapshot) is
  //    an orphan record of a removed face, not a live face on the result.
  const topology: FaceHash[] = [];
  let snapshotAtCreate: FaceSnapshotImported | undefined;
  let surfaceType: 'PLANE' | 'CYLINDRE' | 'CONE' | 'SPHERE' | 'TORUS' | 'BSPLINE' | 'OTHER' | undefined;
  for (const [hash, lineage] of map.entries()) {
    if (lineage.featureId === ref.rewriteId && lineage.labelName === ref.slot) {
      if (lineage.snapshot) {
        topology.push(hash);
      }
      // Capture the create-time fingerprint while we're walking — any lineage
      // entry with this (featureId, slot) carries the same snapshotAtCreate.
      if (lineage.snapshotAtCreate) {
        snapshotAtCreate = lineage.snapshotAtCreate;
        surfaceType = lineage.surfaceType;
      }
    }
  }
  if (topology.length === 1) {
    return { ok: true, faceHash: topology[0] };
  }

  // 2. Fallback. We need a create-time fingerprint even when topology
  //    returned zero hits. If no lineage in the map carries it, walk again
  //    to pick up any orphan lineage that kept the fingerprint under a
  //    different labelName (e.g. an upstream rename).
  if (!snapshotAtCreate) {
    for (const lineage of map.values()) {
      if (lineage.featureId === ref.rewriteId && lineage.snapshotAtCreate) {
        snapshotAtCreate = lineage.snapshotAtCreate;
        surfaceType = lineage.surfaceType;
        break;
      }
    }
  }
  if (!snapshotAtCreate || !surfaceType) {
    if (topology.length === 0) return removed(ref, ctx);
    // topology.length > 1 with no fingerprint → genuine ambiguity.
    return ambiguous(ref, ctx, topology.length);
  }

  const { matches } = findByGeometrySnapshot(map, snapshotAtCreate, surfaceType, DEFAULT_SNAPSHOT_TOLERANCE);
  // 3. If topology.length > 1, restrict matches to that subset.
  const restricted = topology.length > 1 ? matches.filter((h) => topology.includes(h)) : matches;

  if (restricted.length === 1) {
    return {
      ok: true,
      faceHash: restricted[0],
      warnings: [{
        target: 'export-occt',
        code: 'feature.created-ref.fallback-used',
        featureId: ctx.featureId,
        severity: 'warn',
        message: `Created face ref '${ref.rewriteId}.${ref.slot}' resolved via geometry-snapshot fallback after the topology route lost it. The downstream feature continues, but a future edit may shift this match.`,
        hint: HINT_TEMPLATES['feature.created-ref.fallback-used'].template,
      }],
    };
  }
  if (restricted.length === 0) return removed(ref, ctx);
  return ambiguous(ref, ctx, restricted.length);
}

function removed(ref: Extract<FaceRef, { kind: 'created' }>, ctx: ResolveContext): ResolveResult {
  return {
    ok: false,
    diagnostic: {
      target: 'export-occt',
      code: 'feature.face-ref.removed',
      featureId: ctx.featureId,
      severity: 'error',
      message: `Created face '${ref.rewriteId}.${ref.slot}' was removed by an upstream operation.`,
      hint: HINT_TEMPLATES['feature.face-ref.removed'].template,
    },
  };
}
function ambiguous(ref: Extract<FaceRef, { kind: 'created' }>, ctx: ResolveContext, count: number): ResolveResult {
  return {
    ok: false,
    diagnostic: {
      target: 'export-occt',
      code: 'feature.face-ref.ambiguous-after-split',
      featureId: ctx.featureId,
      severity: 'error',
      message: `Created face '${ref.rewriteId}.${ref.slot}' was split into ${count} children.`,
      hint: HINT_TEMPLATES['feature.face-ref.ambiguous-after-split'].template,
    },
  };
}
