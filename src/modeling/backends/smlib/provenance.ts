// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { EdgeHistoryMap, HistoryMap } from '../../../kernel/naming/evolutionRecord';
import { GuardError } from './guards';

const HASH_UPPER = 2147483647;
/** Far below the gap between distinct primitive edges, wide enough for STEP noise. */
const EDGE_TOL = 1e-4;

interface CurveEdge {
  length: number;
  pointAt(t: number): { x: number; y: number; z: number };
  wrapped: { HashCode(upper: number): number };
}

interface CurveKey {
  hash: string;
  mid: [number, number, number];
  length: number;
}

function curvesOf(shape: OcctBackend): CurveKey[] {
  const edges = (shape.getReplicadShape() as unknown as { edges: CurveEdge[] }).edges;
  try {
    return edges.map((edge) => {
      const p = edge.pointAt(0.5);
      return {
        hash: edge.wrapped.HashCode(HASH_UPPER).toString(16),
        mid: [p.x, p.y, p.z],
        length: edge.length,
      };
    });
  } catch {
    throw new GuardError('NAMING_HISTORY', 'Primitive edge correspondence is ambiguous');
  }
}

function sameCurve(a: CurveKey, b: CurveKey): boolean {
  return Math.abs(a.length - b.length) <= EDGE_TOL
    && Math.abs(a.mid[0] - b.mid[0]) <= EDGE_TOL
    && Math.abs(a.mid[1] - b.mid[1]) <= EDGE_TOL
    && Math.abs(a.mid[2] - b.mid[2]) <= EDGE_TOL;
}

/** Each reference edge must land on one imported edge. A split or a shared
 * midpoint is not a correspondence we can certify. */
function remapEdges(reference: OcctBackend, imported: OcctBackend): EdgeHistoryMap | undefined {
  const source = reference.edgeHistoryMap;
  if (!source?.size) return undefined;
  const referenceEdges = curvesOf(reference);
  const importedEdges = curvesOf(imported);
  const out: EdgeHistoryMap = new Map();
  const used = new Set<string>();
  for (const [hash, lineage] of source) {
    const ref = referenceEdges.find((edge) => edge.hash === hash);
    const hits = ref ? importedEdges.filter((edge) => sameCurve(edge, ref)) : [];
    if (!ref || hits.length !== 1 || used.has(hits[0].hash)) {
      throw new GuardError('NAMING_HISTORY', 'Primitive edge correspondence is ambiguous');
    }
    used.add(hits[0].hash);
    out.set(hits[0].hash, { ...lineage, rootHash: hits[0].hash });
  }
  if (importedEdges.some((edge) => !used.has(edge.hash))) {
    throw new GuardError('NAMING_HISTORY', 'Primitive edge correspondence is ambiguous');
  }
  return out;
}

/** STEP has no kernelCAD lineage. Re-seed primitive names geometrically;
 * never pretend that old face hashes address the reconstructed solid.
 * Non-primitive lineage needs certified face correspondence, so fail closed. */
export function preserveProvenance(reference: OcctBackend, imported: OcctBackend): OcctBackend {
  const kind = reference.kind;
  const primitive = kind === 'box' || kind === 'cylinder' || kind === 'sphere';
  if (reference.historyMap?.size && !primitive) {
    throw new GuardError('NAMING_HISTORY', 'STEP reconstruction cannot preserve non-primitive face lineage');
  }
  const shape = imported.getReplicadShape();
  const placed = new OcctBackend(shape, primitive ? kind : undefined);
  if (!reference.historyMap?.size) return placed;
  const history: HistoryMap = new Map();
  const seeded = new Set<string>();
  for (const [refHash, lineage] of reference.historyMap) {
    // A cylinder wall is seeded with only rootHash and rootFeatureId. STEP has
    // no name for it; the single unnamed imported face receives it below.
    if (!lineage.canonicalName && !lineage.featureId && !lineage.labelName) continue;
    if (!lineage.canonicalName || lineage.featureId || lineage.labelName) {
      throw new GuardError('NAMING_HISTORY', 'Primitive carries additional lineage that STEP cannot preserve');
    }
    const hash = placed.findCanonicalFaceHash(lineage.canonicalName);
    if (history.has(hash)) throw new GuardError('NAMING_HISTORY', 'Primitive face correspondence is ambiguous');
    history.set(hash, { ...lineage, rootHash: hash });
    seeded.add(refHash);
  }
  const skipped = [...reference.historyMap.entries()].filter(([hash]) => !seeded.has(hash));
  const unmatched = [...new Set(placed.faceHashes())].filter((hash) => !history.has(hash));
  if (skipped.length === 1 && unmatched.length === 1) {
    const [, lineage] = skipped[0];
    history.set(unmatched[0], { ...lineage, rootHash: unmatched[0] });
  } else if (skipped.length !== 0 || unmatched.length !== 0) {
    throw new GuardError('NAMING_HISTORY', 'Primitive face correspondence is ambiguous');
  }
  const out = new OcctBackend(shape, kind, history);
  const edges = remapEdges(reference, imported);
  if (edges) out.edgeHistoryMap = edges;
  return out;
}
