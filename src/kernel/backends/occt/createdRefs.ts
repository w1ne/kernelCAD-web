// src/backends/occt/createdRefs.ts
//
// Slice-2 generic created-refs subsystem. Replaces slice-1's hard-coded
// classifyHoleFace / classifyCutoutFace tracker (deleted in Phase 3) with a
// uniform `CreatedRefSpec`-returning protocol that any lowerer implements
// inline. The propagator (applyCreatedRefs) writes labelName + snapshot
// entries into the result HistoryMap; the resolver reads them.
//
// Phase-1 deliverable: types + capture helper + propagator. Existing slice-1
// holeLowerer / cutoutLowerer continue to use their inline attachCreatedRefs;
// migration to LowererResult.createdRefs is Phase 3.

import { measureArea, type Face } from 'replicad';
import type { Vec3, FeatureKind, FeatureId } from '../../../intent/types';
import type { HistoryMap, FaceHash, FaceLineage } from '../../naming/evolutionRecord';

/** Geometric fingerprint captured at face creation. Centroid + normal +
 *  area form the (loose) discriminator the geometry-snapshot resolver uses
 *  when topology-based lookup returns zero hits. */
export interface FaceSnapshot {
  /** World-space face center (replicad `face.center`). */
  centroid: Vec3;
  /** Unit outward normal at the face center (`face.normalAt()`). */
  normal: Vec3;
  /** Surface area in mm² (`face.area`). */
  area: number;
}

/** What every lowerer returns for each face it semantically created. The
 *  result HistoryMap stores the labelName + snapshot; the resolver reads
 *  both. */
export interface CreatedRefSpec {
  faceHash: FaceHash;
  /** Lowercase, hyphenated. Slice-1 catalog: `wall`, `floor`, `wall-back`,
   *  `counterbore-wall`, `counterbore-floor`, `countersink-cone`. New
   *  feature kinds extend this freely. */
  refName: string;
  snapshot: FaceSnapshot;
  /** OCCT surface type captured at create time. Read by lowerers from
   *  `face.geomType` (e.g. 'PLANE', 'CYLINDRE', 'CONE'). */
  surfaceType: 'PLANE' | 'CYLINDRE' | 'CONE' | 'SPHERE' | 'TORUS' | 'BSPLINE' | 'OTHER';
}

/** Default snapshot tolerance — used by the geometry-fallback resolver
 *  (Phase 4). Tightened or loosened per-call via SnapshotTolerance. */
export const DEFAULT_SNAPSHOT_TOLERANCE = {
  centroidMm: 0.5,
  normalDot: 0.9999,   // cos(0.8°)
  areaRelative: 0.05,  // 5%
} as const;

/** Read centroid + normal + area off a replicad Face. Returns null when
 *  the face exposes neither `normalAt()` nor a sufficient surrogate; the
 *  caller decides whether to skip or store a partial snapshot.
 *
 *  Defensive: replicad's Face geometry varies by surface type. CONE faces
 *  may not always expose `normalAt()`. We fall back to a [0,0,1] normal in
 *  that case — the resolver's normalDot tolerance will treat it as a
 *  non-match against any non-Z face, which is the correct conservative
 *  failure mode. */
function snapshotOf(face: Face): FaceSnapshot {
  const c = face.center;
  const centroid: Vec3 = [c.x, c.y, c.z];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (face as any).normalAt;
  let normal: Vec3 = [0, 0, 1];
  if (typeof fn === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = (face as any).normalAt() as { x?: number; y?: number; z?: number } | undefined;
    if (n && typeof n.x === 'number' && typeof n.y === 'number') {
      const nx = n.x, ny = n.y, nz = typeof n.z === 'number' ? n.z : 0;
      const len = Math.hypot(nx, ny, nz);
      if (len > 1e-9) normal = [nx / len, ny / len, nz / len];
    }
  }

  let area = 0;
  try {
    area = measureArea(face);
  } catch {
    // Defensive: if the face is degenerate or measureArea throws, leave area=0
    // and let the resolver's areaRelative tolerance treat it as a non-match.
  }

  return { centroid, normal, area };
}

/** Read the OCCT surface type off a replicad Face. Returns one of the
 *  enumerated `CreatedRefSpec['surfaceType']` strings; defaults to `'OTHER'`
 *  when the underlying handle does not expose `geomType` in a recognized form.
 *  Used by lowerers at create time so the geometry-snapshot fallback resolver
 *  can use surface kind as the 4th discriminator. */
export function surfaceTypeOf(face: Face): CreatedRefSpec['surfaceType'] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gt = (face as any).geomType;
  const raw = typeof gt === 'function' ? gt.call(face) : gt;
  if (typeof raw !== 'string') return 'OTHER';
  const up = raw.toUpperCase();
  if (up === 'PLANE' || up === 'CYLINDRE' || up === 'CONE' ||
      up === 'SPHERE' || up === 'TORUS' || up === 'BSPLINE') return up;
  return 'OTHER';
}

/** Hash a single replicad face via its underlying TopoDS handle. Mirrors the
 *  helper inlined in holeLowerer / cutoutLowerer; kept here so slice-2 callers
 *  don't reach into those files. */
export function faceHashOf(face: Face): FaceHash {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (face as any).wrapped ?? (face as any)._wrapped ?? face;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((w as any).HashCode(2147483647) as number).toString(16);
}

/** Capture a snapshot for every face on a Shape. Used in Phase 2 by the
 *  generic post-op capture site. Phase-1 callers (the test suite) use it
 *  directly to validate snapshot correctness on simple primitives. */
export function captureAllFaceSnapshots(faces: readonly Face[]): Map<FaceHash, FaceSnapshot> {
  const out = new Map<FaceHash, FaceSnapshot>();
  for (const face of faces) {
    out.set(faceHashOf(face), snapshotOf(face));
  }
  return out;
}

/** Refresh the `snapshot` field of every lineage entry in `resultMap` whose
 *  face hash maps to a face in `faces`. Used as a post-op capture site so
 *  every lineage entry on the result Shape carries a snapshot reflecting
 *  current geometry — the geometry-fallback resolver in Phase 4 reads these
 *  entries when the topology path returns zero hits.
 *
 *  Lineage entries are deep-copied before mutation so that any input map
 *  sharing the same lineage by reference (slice-1 path) is not affected. */
export function refreshSnapshots(
  resultMap: HistoryMap,
  faces: readonly Face[],
): void {
  const fresh = captureAllFaceSnapshots(faces);
  for (const [hash, snap] of fresh) {
    const lineage = resultMap.get(hash);
    if (!lineage) continue;
    resultMap.set(hash, { ...lineage, snapshot: snap });
  }
}

/** Write a list of CreatedRefSpec entries into a result HistoryMap. For
 *  each spec, attach the labelName + snapshot to the existing FaceLineage
 *  if one exists, or create a new lineage rooted at the feature id.
 *
 *  Phase-1 contract: this function is the SOLE write path for slice-2's
 *  five new FaceLineage fields (snapshot, featureId, featureName,
 *  featureOrdinal, featureKind). Phase-3 lowerers route through here;
 *  slice-1 lowerers continue to use their inline attachCreatedRefs (which
 *  writes only labelName) until migration. */
export function applyCreatedRefs(
  resultMap: HistoryMap,
  createdRefs: readonly CreatedRefSpec[],
  featureId: FeatureId,
  featureKind: FeatureKind,
  featureName: string | undefined,
  ordinal: number | undefined,
): void {
  for (const ref of createdRefs) {
    const existing = resultMap.get(ref.faceHash);
    const lineage: FaceLineage = existing
      ? { ...existing }
      : { rootHash: ref.faceHash, rootFeatureId: featureId };
    lineage.labelName = ref.refName;
    lineage.snapshot = ref.snapshot;
    // Immutable create-time fingerprint. Only written here, never refreshed.
    if (lineage.snapshotAtCreate === undefined) {
      lineage.snapshotAtCreate = ref.snapshot;
    }
    lineage.surfaceType = ref.surfaceType;
    lineage.featureId = featureId;
    lineage.featureKind = featureKind;
    if (featureName !== undefined) lineage.featureName = featureName;
    if (ordinal !== undefined) lineage.featureOrdinal = ordinal;
    resultMap.set(ref.faceHash, lineage);
  }
}
