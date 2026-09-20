// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Aggregation mirrors MUSE's leaderboard arithmetic
// (`scripts/bench_evaluate/generate_latex_tables_gemini.py` at commit 547a724^):
//   functionality      = mean(functional_adaptation, usage_stability)
//   manufacturability  = mean(tolerance, manufacturability)
//   assemblability     = mean(assembly_readiness, joint_design)
//   final              = mean(functionality, manufacturability, assemblability)
// Any stage-1/stage-2 failure zeroes all six categories.

export interface JudgeCategories {
  assembly_readiness: number;
  joint_design: number;
  tolerance: number;
  functional_adaptation: number;
  usage_stability: number;
  manufacturability: number;
}

export interface MuseSample {
  case: string;
  sandboxOk: boolean;
  overlapFree: boolean;
  /** Judge categories (0/1); absent when the judge was not run. */
  categories?: JudgeCategories;
  /**
   * Infra-error cases are excluded from all aggregate denominators and
   * returned separately as `infraCases`.
   */
  infra?: boolean;
}

export interface MuseLeaderboardRow {
  model: string;
  /**
   * Samples with effective categories (forced-zero and infra cases excluded).
   * As a count, this is not a percentage; every other numeric column is 0–100.
   */
  judged: number;
  /** Non-infra samples, i.e. the denominator of every percentage column. */
  cases: number;
  sandbox: number;
  overlap_free: number;
  /** Validator-only column: always null locally (upstream validator unpublished). */
  watertight: number | null;
  /** Validator-only column: always null locally (upstream validator unpublished). */
  manifold: number | null;
  /** Validator-only column: always null locally (upstream validator unpublished). */
  self_int_free: number | null;
  /** Validator-only column: always null locally (upstream validator unpublished). */
  geom_valid: number | null;
  functionality: number;
  manufacturability: number;
  assemblability: number;
  final: number;
  functional: number;
  robust: number;
  well_toleranced: number;
  manufacturable: number;
  assembly_ready: number;
  connectable: number;
}

export const ZERO_CATEGORIES: Readonly<JudgeCategories> = {
  assembly_readiness: 0,
  joint_design: 0,
  tolerance: 0,
  functional_adaptation: 0,
  usage_stability: 0,
  manufacturability: 0,
};

const pct = (x: number): number => Math.round(x * 10000) / 100;

/** Effective categories for one sample after the funnel forced-zero rule. */
export function effectiveCategories(sample: MuseSample): JudgeCategories | null {
  if (!sample.sandboxOk || !sample.overlapFree) return null;
  return sample.categories ?? null;
}

function samplePillars(categories: JudgeCategories): {
  functional: number;
  robust: number;
  well_toleranced: number;
  manufacturable: number;
  assembly_ready: number;
  connectable: number;
  functionality: number;
  manufacturability: number;
  assemblability: number;
  final: number;
} {
  const functionality =
    (categories.functional_adaptation + categories.usage_stability) / 2;
  const manufacturability = (categories.tolerance + categories.manufacturability) / 2;
  const assemblability = (categories.assembly_readiness + categories.joint_design) / 2;
  return {
    functional: categories.functional_adaptation,
    robust: categories.usage_stability,
    well_toleranced: categories.tolerance,
    manufacturable: categories.manufacturability,
    assembly_ready: categories.assembly_readiness,
    connectable: categories.joint_design,
    functionality,
    manufacturability,
    assemblability,
    final: (functionality + manufacturability + assemblability) / 3,
  };
}

export function aggregateMuseSamples(
  samples: readonly MuseSample[],
  meta: { model: string },
): {
  row: MuseLeaderboardRow;
  forcedZeroCases: string[];
  judgedCases: number;
  infraCases: string[];
} {
  const counted = samples.filter((s) => !s.infra);
  const infraCases = samples.filter((s) => s.infra).map((s) => s.case);
  // Empty and all-infra inputs would otherwise divide by zero.
  const cases = counted.length || 1;
  const forcedZeroCases: string[] = [];
  let sandboxPass = 0;
  let overlapPass = 0;
  let judged = 0;
  const sums = {
    functionality: 0,
    manufacturability: 0,
    assemblability: 0,
    final: 0,
    functional: 0,
    robust: 0,
    well_toleranced: 0,
    manufacturable: 0,
    assembly_ready: 0,
    connectable: 0,
  };

  for (const sample of counted) {
    if (sample.sandboxOk) sandboxPass++;
    if (sample.sandboxOk && sample.overlapFree) overlapPass++;
    const effective = effectiveCategories(sample);
    if (!effective) {
      if (sample.categories) forcedZeroCases.push(sample.case);
      continue;
    }
    judged++;
    const pillars = samplePillars(effective);
    sums.functional += pillars.functional;
    sums.robust += pillars.robust;
    sums.well_toleranced += pillars.well_toleranced;
    sums.manufacturable += pillars.manufacturable;
    sums.assembly_ready += pillars.assembly_ready;
    sums.connectable += pillars.connectable;
    sums.functionality += pillars.functionality;
    sums.manufacturability += pillars.manufacturability;
    sums.assemblability += pillars.assemblability;
    sums.final += pillars.final;
  }

  const row: MuseLeaderboardRow = {
    model: meta.model,
    judged,
    cases: counted.length,
    sandbox: pct(sandboxPass / cases),
    overlap_free: pct(overlapPass / cases),
    watertight: null,
    manifold: null,
    self_int_free: null,
    geom_valid: null,
    functionality: pct(sums.functionality / cases),
    manufacturability: pct(sums.manufacturability / cases),
    assemblability: pct(sums.assemblability / cases),
    final: pct(sums.final / cases),
    functional: pct(sums.functional / cases),
    robust: pct(sums.robust / cases),
    well_toleranced: pct(sums.well_toleranced / cases),
    manufacturable: pct(sums.manufacturable / cases),
    assembly_ready: pct(sums.assembly_ready / cases),
    connectable: pct(sums.connectable / cases),
  };
  return { row, forcedZeroCases, judgedCases: judged, infraCases };
}
