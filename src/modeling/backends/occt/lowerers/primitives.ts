// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { EdgeHistoryMap, FaceLineage, HistoryMap } from '../../../../kernel/naming/evolutionRecord';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { built, type LowerContext, type LowerOutcome } from './context';

const HASH_UPPER = 2147483647;

type SampledEdge = {
  pointAt(t: number): { z: number; delete?: () => void };
  tangentAt(t: number): { z: number; delete?: () => void };
  wrapped?: { HashCode(upper: number): number };
};

/**
 * Birth roles for a box's twelve edges. Same idea as the six canonical face
 * names: classified once, on the primitive, and stored on EdgeLineage so a
 * later fillet reads the label instead of re-querying direction. `corner` is
 * the four vertical edges; `top-perimeter` / `bottom-perimeter` are the two
 * horizontal loops.
 */
function boxEdgeRoleLabels(shape: OcctBackend): Map<string, string> {
  const edges = (shape.getReplicadShape() as unknown as { edges: SampledEdge[] }).edges;
  const samples: { hash: string; tz: number; z: number }[] = [];
  for (const edge of edges) {
    const mid = edge.pointAt(0.5);
    const tangent = edge.tangentAt(0.5);
    const hash = edge.wrapped?.HashCode(HASH_UPPER).toString(16);
    if (hash) samples.push({ hash, tz: tangent.z, z: mid.z });
    mid.delete?.();
    tangent.delete?.();
  }
  const horizontal = samples.filter((s) => Math.abs(s.tz) < 0.5);
  const split = horizontal.length === 0
    ? 0
    : (Math.min(...horizontal.map((s) => s.z)) + Math.max(...horizontal.map((s) => s.z))) / 2;
  const out = new Map<string, string>();
  for (const sample of samples) {
    if (Math.abs(sample.tz) > 0.9) out.set(sample.hash, 'corner');
    else if (Math.abs(sample.tz) < 0.5) {
      out.set(sample.hash, sample.z >= split ? 'top-perimeter' : 'bottom-perimeter');
    }
  }
  return out;
}

function seedEdges(shape: OcctBackend, featureId: string): EdgeHistoryMap {
  const labels = shape.kind === 'box' ? boxEdgeRoleLabels(shape) : undefined;
  const map: EdgeHistoryMap = new Map();
  for (const hash of shape.edgeHashes()) {
    const label = labels?.get(hash);
    map.set(hash, {
      rootHash: hash,
      rootFeatureId: featureId,
      ...(label !== undefined ? { labelName: label } : {}),
    });
  }
  return map;
}

/** `box(x, y, z, { centered })` — seeds the six canonical face names into the
 *  history map so downstream selectors can name them. */
export function lowerBox(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const x = r.params.x.evaluated;
  const y = r.params.y.evaluated;
  const z = r.params.z.evaluated;
  const centered = (r.params.centered?.evaluated ?? 0) > 0.5;
  const rawBox = OcctBackend.box(x, y, z, centered);
  const boxSeedMap: HistoryMap = new Map();
  const boxFaceNames = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;
  for (const name of boxFaceNames) {
    try {
      const hash = rawBox.findCanonicalFaceHash(name);
      const lineage: FaceLineage = { rootHash: hash, canonicalName: name, rootFeatureId: r.id };
      boxSeedMap.set(hash, lineage);
    } catch {
      // defensive: shouldn't happen for box, but skip silently if it does
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxWrapped = (rawBox as OcctBackend).getReplicadShape() as any;
  const shape: ShapeBackend = new OcctBackend(boxWrapped, 'box', boxSeedMap);
  (shape as OcctBackend).edgeHistoryMap = seedEdges(shape as OcctBackend, r.id);
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'box',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** `cylinder(h, r)` — seeds the two planar cap names ('top', 'bottom'). */
export function lowerCylinder(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const rawCyl = OcctBackend.cylinder(r.params.h.evaluated, r.params.r.evaluated);
  const cylSeedMap: HistoryMap = new Map();
  const cylinderFaceNames = ['top', 'bottom'] as const;
  for (const name of cylinderFaceNames) {
    try {
      const hash = rawCyl.findCanonicalFaceHash(name);
      cylSeedMap.set(hash, { rootHash: hash, canonicalName: name, rootFeatureId: r.id });
    } catch {
      // defensive: skip if face not found
    }
  }
  for (const hash of rawCyl.faceHashes()) {
    if (!cylSeedMap.has(hash)) cylSeedMap.set(hash, { rootHash: hash, rootFeatureId: r.id });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cylWrapped = (rawCyl as OcctBackend).getReplicadShape() as any;
  const shape: ShapeBackend = new OcctBackend(cylWrapped, 'cylinder', cylSeedMap);
  (shape as OcctBackend).edgeHistoryMap = seedEdges(shape as OcctBackend, r.id);
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'cylinder',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** `sphere(r)`. */
export function lowerSphere(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // Sphere has no canonical planar face names — leave historyMap undefined.
  // Falls back to the legacy !base.kind path in edgeSelection (correct behaviour).
  const shape: ShapeBackend = OcctBackend.sphere(r.params.r.evaluated);
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'sphere',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}
