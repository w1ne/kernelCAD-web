import type { GateReport } from './types.js';

/** A generated candidate with its gate report and (optional) selector score. */
export interface ScoredCandidate {
  scriptPath: string;
  text: string;
  report: GateReport;
  /** Selector score in [0,1] for cross-candidate ranking only; null if unscoreable. */
  oracleScore: number | null;
}

function stagesPassed(report: GateReport): number {
  return report.verdicts.filter((v) => v.ok).length;
}

/** True if `a` should rank strictly above `b` (lexicographic; strict so ties keep earlier). */
function betterThan(a: ScoredCandidate, b: ScoredCandidate): boolean {
  const aOk = a.report.ok ? 1 : 0;
  const bOk = b.report.ok ? 1 : 0;
  if (aOk !== bOk) return aOk > bOk;
  const aStages = stagesPassed(a.report);
  const bStages = stagesPassed(b.report);
  if (aStages !== bStages) return aStages > bStages;
  const aScore = a.oracleScore ?? -Infinity;
  const bScore = b.oracleScore ?? -Infinity;
  return aScore > bScore;
}

/**
 * Pick the best candidate. Ranking: gate-passing > gate-failing, then more
 * stages passed, then higher oracleScore (null lowest), then lowest index.
 * The oracleScore participates in SELECTION ONLY — never in repair (see
 * closedLoop.ts anti-hack invariant).
 */
export function selectBest(candidates: ScoredCandidate[]): ScoredCandidate {
  if (candidates.length === 0) throw new Error('selectBest: no candidates');
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (betterThan(candidates[i], best)) best = candidates[i];
  }
  return best;
}
