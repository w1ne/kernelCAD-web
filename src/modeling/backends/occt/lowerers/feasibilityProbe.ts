// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Max-feasible-value probe for kernel ops that fail above some size (fillet
 * radius, chamfer distance, shell wall). FIX-10: instead of a generic
 * "try a smaller radius", bisect the value against the real kernel op and
 * report the largest one that VERIFIABLY builds.
 *
 * Runs only on the failure path, bounded to `iterations` kernel calls (+1 to
 * verify the rounded value), and never applies the value — the caller reports
 * it. Assumes feasibility is monotone in the value (true for fillet/chamfer on
 * a fixed edge set); the reported value is always one that was built.
 */

export interface FeasibilityProbeResult {
  /** Largest value that built, rounded down to a readable step; undefined
   *  when nothing down to `requested / 2^iterations` built. */
  maxFeasible: number | undefined;
  /** Kernel attempts spent. */
  attempts: number;
}

/** Round `v` down to 3 significant figures (2.3456 → 2.34, 0.012345 → 0.0123). */
export function floorToReadable(v: number): number {
  if (!(v > 0)) return 0;
  const step = 10 ** (Math.floor(Math.log10(v)) - 2);
  return Math.floor(v / step + 1e-9) * step;
}

/**
 * Bisect (0, requested) for the largest value `tryValue` accepts.
 * `tryValue` must return true iff the kernel op builds at that value.
 */
export function probeMaxFeasible(
  requested: number,
  tryValue: (value: number) => boolean,
  iterations = 7,
): FeasibilityProbeResult {
  let lo = 0;
  let hi = requested;
  let attempts = 0;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    attempts++;
    if (tryValue(mid)) lo = mid;
    else hi = mid;
  }
  if (lo <= 0) return { maxFeasible: undefined, attempts };
  const readable = Number(floorToReadable(lo).toPrecision(3));
  if (readable > 0 && readable !== lo) {
    attempts++;
    if (tryValue(readable)) return { maxFeasible: readable, attempts };
  }
  return { maxFeasible: lo, attempts };
}
