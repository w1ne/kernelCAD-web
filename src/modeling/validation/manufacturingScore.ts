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

/** Higher means more named manufacturing features and fewer anonymous cuts. */
export function constructionRank(counts: ManufacturingCounts): number {
  return counts.counterbores + counts.fillets + counts.plainHoles - counts.booleanCuts;
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
