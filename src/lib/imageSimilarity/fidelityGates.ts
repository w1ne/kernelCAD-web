// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/imageSimilarity/fidelityGates.ts
//
// W2 — Harden the oracle. Boolean fidelity gates that the eval harness ANDs
// BEFORE any visual (SSIM / silhouette / VLM) score. The point: a wrong object
// must never be rescued by a high pixel-similarity number (the "slab hack" — a
// solid slab can score high on silhouette IoU yet is plainly not eyewear).
//
// The "expected feature" gate is STRUCTURAL, not pixel-based. Earlier a render
// heuristic (see-through hole / chroma / luma) was tried and empirically failed:
// it false-negatives a correct wayfarer modelled with tinted lens inserts (the
// lens fills the opening, so there is no see-through hole), and a volume/bbox
// fill-ratio is fooled the same way (the lens adds the volume back). The only
// signal invariant to lens insertion is the BREP topology: the frame's front
// face keeps its inner boundary loops (the lens cutouts) whether or not a lens
// body sits in them. So the gate consumes `maxFaceInnerLoops` from list_faces.
//
// Design: gates take ALREADY-PARSED data (small numbers), never file paths or
// pixels — the harness produces the numbers from the model + render-inspect.

/** One boolean fidelity gate result. */
export interface FidelityGate {
  name: string;
  pass: boolean;
  reason: string;
}

/**
 * Already-parsed inputs the gates operate on.
 * - `maxFaceInnerLoops` is the maximum inner-loop (hole) count across the
 *   model's faces, from `list_faces` — e.g. 2 for an eyewear front with two
 *   lens openings, 0 for a solid slab.
 * - `partsCount` / `solidVolume` come from the model's shape info.
 */
export interface FidelityBundle {
  maxFaceInnerLoops?: number;
  partsCount: number;
  solidVolume: number;
}

export interface FidelityGateOpts {
  /**
   * When set, emit an `expectedFeatureVisibleAtPose` gate requiring the model
   * to have at least this many inner boundary loops on some face (e.g. 2 lens
   * openings on an eyewear front). When undefined, the gate is omitted.
   */
  expectedInteriorLoops?: number;
  /**
   * When set, emit a `partsCountMatches` gate comparing `bundle.partsCount`
   * to this value. When undefined, the gate is omitted.
   */
  expectedPartsCount?: number;
  /** Minimum solid volume to count as non-degenerate. Default: > 0. */
  minSolidVolume?: number;
}

/**
 * Compute the boolean fidelity gates for a model. Gates that are not applicable
 * to the task (per opts) are omitted from the array, not emitted as pass:true.
 */
export function computeFidelityGates(
  bundle: FidelityBundle,
  opts: FidelityGateOpts,
): FidelityGate[] {
  const gates: FidelityGate[] = [];
  const minVol = opts.minSolidVolume ?? 0;

  // nonDegenerateSolid — always emitted.
  gates.push({
    name: 'nonDegenerateSolid',
    pass: bundle.solidVolume > minVol,
    reason:
      bundle.solidVolume > minVol
        ? `solid volume ${bundle.solidVolume} > ${minVol}`
        : `solid volume ${bundle.solidVolume} is not greater than ${minVol} — degenerate or empty solid`,
  });

  // partsCountMatches — only when expectedPartsCount is set.
  if (opts.expectedPartsCount !== undefined) {
    const ok = bundle.partsCount === opts.expectedPartsCount;
    gates.push({
      name: 'partsCountMatches',
      pass: ok,
      reason: ok
        ? `parts count ${bundle.partsCount} matches expected ${opts.expectedPartsCount}`
        : `expected ${opts.expectedPartsCount} part(s) but got ${bundle.partsCount}`,
    });
  }

  // expectedFeatureVisibleAtPose — structural: the model must carry the
  // expected interior loops (e.g. lens openings). Invariant to lens inserts.
  if (opts.expectedInteriorLoops !== undefined) {
    const loops = bundle.maxFaceInnerLoops ?? 0;
    const ok = loops >= opts.expectedInteriorLoops;
    gates.push({
      name: 'expectedFeatureVisibleAtPose',
      pass: ok,
      reason: ok
        ? `model has ${loops} inner loop(s) on a face (>= ${opts.expectedInteriorLoops} expected) — the lens openings are present in the geometry`
        : `model has only ${loops} inner loop(s) on any face, expected >= ${opts.expectedInteriorLoops} — the lens openings are missing from the geometry (a solid blob, not a frame)`,
    });
  }

  return gates;
}

/** True iff every gate passes. Convenience for the harness AND-step. */
export function allFidelityGatesPass(gates: FidelityGate[]): boolean {
  return gates.every((g) => g.pass);
}
