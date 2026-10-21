// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * A high overlap is not a good construction. A flange extruded 24 mm instead
 * of 12 mm, or plain holes where the part has counterbores, still looks like
 * the solid. The count of those features decides before the overlap does.
 */
export interface ManufacturingCounts {
  plainHoles: number;
  counterbores: number;
  fillets: number;
  booleanCuts: number;
  /** One driving depth, when the caller knows it. */
  depthMm?: number;
}

export interface ConstructionCandidate<T> {
  iou: number;
  counts: ManufacturingCounts;
  value: T;
}

/** How far `actual` is from the features the part is supposed to have. */
export function manufacturingDistance(expected: ManufacturingCounts, actual: ManufacturingCounts): number {
  const depth = expected.depthMm !== undefined && actual.depthMm !== undefined
    && Math.abs(expected.depthMm - actual.depthMm) > 0.5
    ? 1
    : 0;
  return Math.abs(expected.plainHoles - actual.plainHoles)
    + Math.abs(expected.counterbores - actual.counterbores)
    + Math.abs(expected.fillets - actual.fillets)
    + Math.abs(expected.booleanCuts - actual.booleanCuts)
    + depth;
}

export interface RankedPass {
  verdict: 'faithful' | 'approximate' | 'failed';
  iou: number;
  deviationMm: number;
  counts: ManufacturingCounts;
}

/**
 * Pick one reconstruction. Verdict first. Inside 0.02 of the best overlap
 * for that verdict, counterbores, then fillets, then fewer boolean cuts,
 * then plain holes. The band is measured from the best overlap, so the
 * order does not depend on which pair is compared first.
 */
export function pickNearOverlap<T extends RankedPass>(candidates: readonly T[]): T | undefined {
  if (candidates.length === 0) return undefined;
  const verdictRank = { faithful: 0, approximate: 1, failed: 2 } as const;
  const bestVerdict = Math.min(...candidates.map((candidate) => verdictRank[candidate.verdict]));
  const inVerdict = candidates.filter((candidate) => verdictRank[candidate.verdict] === bestVerdict);
  const bestIou = Math.max(...inVerdict.map((candidate) => candidate.iou));
  const band = inVerdict.filter((candidate) => bestIou - candidate.iou <= 0.02);
  return [...band].sort((a, b) =>
    featureCompare(a.counts, b.counts) || b.iou - a.iou || a.deviationMm - b.deviationMm
  )[0];
}

/** Negative when `a` should come first. Counterbores outrank plain holes. */
function featureCompare(a: ManufacturingCounts, b: ManufacturingCounts): number {
  return (b.counterbores - a.counterbores)
    || (b.fillets - a.fillets)
    || (a.booleanCuts - b.booleanCuts)
    || (b.plainHoles - a.plainHoles);
}

/**
 * Pick the construction whose feature counts match `expected`. Overlap breaks
 * a tie. A lookalike with a higher overlap and the wrong holes loses.
 */
export function chooseConstruction<T>(
  candidates: readonly ConstructionCandidate<T>[],
  expected: ManufacturingCounts,
): ConstructionCandidate<T> | undefined {
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((a, b) =>
    manufacturingDistance(expected, a.counts) - manufacturingDistance(expected, b.counts)
    || b.iou - a.iou
  )[0];
}
