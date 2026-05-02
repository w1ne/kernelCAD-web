/**
 * Per-shape history machinery. Each OcctBackend carries a `HistoryMap` that
 * tracks every face's lineage back to its originating primitive and canonical name.
 *
 * Resolution (in `resolveFaceRef.ts`) walks the input chain back to a primitive,
 * resolves the canonical name there, then walks forward through every operation's
 * history-derived map to the current handle.
 *
 * v0.2 scope: identity preservation for unambiguous cases. Ambiguous splits and
 * deleted faces are reported via diagnostics; geometry-fallback is v0.3.
 */

export type FaceHash = string;
export type EdgeHash = string;

export type CanonicalFaceName = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export interface FaceLineage {
  /** Hash of the corresponding face on the originating primitive. */
  rootHash: FaceHash;
  /** Canonical name on the originating primitive, if any. */
  canonicalName?: CanonicalFaceName;
  /** Sketch label, if the face came from a labeled sketch segment (extrude/revolve/etc). */
  labelName?: string;
  /** Originating primitive feature ID. */
  rootFeatureId: string;
}

export interface EdgeLineage {
  rootHash: EdgeHash;
  rootFeatureId: string;
  /** If the edge comes from a labeled sketch segment. */
  labelName?: string;
}

export type HistoryMap = Map<FaceHash, FaceLineage>;
export type EdgeHistoryMap = Map<EdgeHash, EdgeLineage>;

/**
 * Map an input HistoryMap through a topology-preserving transform (translate,
 * rotate, scale, reflect, mirror).
 *
 * Both `inputHashes` and `outputHashes` are produced by enumerating faces in
 * `TopExp_Explorer` order on the input and output shapes respectively. OCCT
 * preserves topology order across rigid-body and affine transforms, so the
 * i-th input face corresponds to the i-th output face.
 *
 * Length mismatch indicates the operation was not topology-preserving — throw
 * (caller bug; transforms should never split or merge faces).
 */
export function propagateTransformHistory(
  inputMap: HistoryMap,
  inputHashes: readonly FaceHash[],
  outputHashes: readonly FaceHash[],
): HistoryMap {
  if (inputHashes.length !== outputHashes.length) {
    throw new Error(
      `propagateTransformHistory: face count mismatch (input ${inputHashes.length} vs output ${outputHashes.length}). Transforms must preserve topology.`,
    );
  }
  const out: HistoryMap = new Map();
  for (let i = 0; i < inputHashes.length; i++) {
    const inputLineage = inputMap.get(inputHashes[i]);
    if (inputLineage) {
      out.set(outputHashes[i], inputLineage);  // lineage shared by reference; FaceLineage is immutable by convention
    }
  }
  return out;
}
