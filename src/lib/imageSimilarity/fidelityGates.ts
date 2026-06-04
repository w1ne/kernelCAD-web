// src/lib/imageSimilarity/fidelityGates.ts
//
// W2 — Harden the oracle. Boolean fidelity gates that the eval harness ANDs
// BEFORE any visual (SSIM / silhouette / VLM) score. The point: a wrong object
// must never be rescued by a high pixel-similarity number (see the "slab hack"
// lesson — a wide solid slab with no lens openings can score high on
// silhouette IoU yet is plainly not eyewear).
//
// Design: gates take ALREADY-PARSED data (a square mask Uint8Array + a small
// numeric summary), never file paths. This keeps the module pure and lets unit
// tests feed synthetic arrays with no PNG fixtures. The harness is responsible
// for turning a render-inspect bundle into a FidelityBundle.

/** One boolean fidelity gate result. */
export interface FidelityGate {
  name: string;
  pass: boolean;
  reason: string;
}

/**
 * Already-parsed inputs the gates operate on.
 * - `mask` is a size×size foreground mask (1 = subject, 0 = background),
 *   matching the convention produced by the imageSimilarity scorer.
 * - `partsCount` / `solidVolume` come from the model's shape info.
 */
export interface FidelityBundle {
  size: number;
  mask: Uint8Array;
  partsCount: number;
  solidVolume: number;
}

export interface FidelityGateOpts {
  /**
   * When true, require at least one background-enclosed hole inside the
   * subject bbox (e.g. lens openings on eyewear). When false, the
   * `expectedFeatureVisibleAtPose` gate is omitted entirely.
   */
  requireInteriorOpenings: boolean;
  /**
   * When set, emit a `partsCountMatches` gate comparing `bundle.partsCount`
   * to this value. When undefined, the gate is omitted.
   */
  expectedPartsCount?: number;
  /** Minimum solid volume to count as non-degenerate. Default: > 0. */
  minSolidVolume?: number;
}

/**
 * Detect whether the subject mask has at least one interior opening: a
 * background-valued region fully enclosed by foreground inside the subject's
 * bounding box. Implemented as a flood fill of background pixels from the
 * bbox border; any background pixel inside the bbox NOT reached by the flood
 * is an interior hole.
 */
function hasInteriorOpening(mask: Uint8Array, size: number): boolean {
  // Subject bbox.
  let minX = size, minY = size, maxX = -1, maxY = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mask[y * size + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return false; // empty mask — no subject, no openings

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  // `reached[i]` marks background pixels (within bbox) connected to the border.
  const reached = new Uint8Array(w * h);
  const idx = (lx: number, ly: number) => ly * w + lx;
  const isBg = (lx: number, ly: number) => mask[(minY + ly) * size + (minX + lx)] === 0;

  // Seed the flood with every background pixel on the bbox border.
  const stack: number[] = [];
  const push = (lx: number, ly: number) => {
    if (lx < 0 || ly < 0 || lx >= w || ly >= h) return;
    if (reached[idx(lx, ly)]) return;
    if (!isBg(lx, ly)) return;
    reached[idx(lx, ly)] = 1;
    stack.push(lx, ly);
  };
  for (let lx = 0; lx < w; lx++) {
    push(lx, 0);
    push(lx, h - 1);
  }
  for (let ly = 0; ly < h; ly++) {
    push(0, ly);
    push(w - 1, ly);
  }
  // 4-connected flood.
  while (stack.length > 0) {
    const ly = stack.pop() as number;
    const lx = stack.pop() as number;
    push(lx + 1, ly);
    push(lx - 1, ly);
    push(lx, ly + 1);
    push(lx, ly - 1);
  }

  // Any background pixel inside bbox NOT reached from the border = interior hole.
  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      if (isBg(lx, ly) && !reached[idx(lx, ly)]) return true;
    }
  }
  return false;
}

/**
 * Compute the boolean fidelity gates for a render-inspect bundle. Gates that
 * are not applicable to the task (per opts) are omitted from the array, not
 * emitted as `pass: true`.
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

  // expectedFeatureVisibleAtPose — only when interior openings are required.
  if (opts.requireInteriorOpenings) {
    const hasOpening = hasInteriorOpening(bundle.mask, bundle.size);
    gates.push({
      name: 'expectedFeatureVisibleAtPose',
      pass: hasOpening,
      reason: hasOpening
        ? 'at least one interior opening is visible inside the subject silhouette'
        : 'no interior opening detected inside the subject silhouette — the expected feature (e.g. lens openings) is not visible at this pose',
    });
  }

  return gates;
}

/** True iff every gate passes. Convenience for the harness AND-step. */
export function allFidelityGatesPass(gates: FidelityGate[]): boolean {
  return gates.every((g) => g.pass);
}
