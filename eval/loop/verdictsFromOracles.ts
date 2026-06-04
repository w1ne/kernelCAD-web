import type { GateVerdict } from '../../src/agent/loop/types';

interface EvaluateLike {
  ok: boolean;
  diagnostics: Array<{ code: string; message: string; hint?: string; featureId?: string }>;
  featureCount?: number;
}
interface InterferenceLike {
  ok: boolean;
  pairs: Array<{ partA: string; partB: string; volumeMm3: number }>;
  diagnostics: Array<{ code: string; message: string; hint?: string }>;
}

/**
 * Pure mapping from oracle results to typed gate verdicts.
 * - Interference verdicts get margin = volumeMm3 and locus = `${partA}∩${partB}`,
 *   pairing each diagnostic with the overlap pair at the same index when available.
 * - Evaluate verdicts get locus = diagnostic.featureId when present.
 * Extracted as a pure function so margin/locus population is unit-testable without the CLI.
 */
export function verdictsFromOracles(evaluateResult: EvaluateLike, interferenceResult: InterferenceLike): GateVerdict[] {
  const verdicts: GateVerdict[] = [];
  if (evaluateResult.diagnostics.length === 0) {
    verdicts.push({ gate: 'evaluate', ok: evaluateResult.ok, message: evaluateResult.ok ? 'Script evaluated cleanly.' : 'Script evaluation failed.' });
  } else {
    for (const diag of evaluateResult.diagnostics) {
      verdicts.push({ gate: 'evaluate', ok: false, code: diag.code, message: diag.message, hint: diag.hint, locus: diag.featureId });
    }
  }
  if (interferenceResult.diagnostics.length === 0) {
    verdicts.push({ gate: 'interference', ok: interferenceResult.ok, message: interferenceResult.ok ? 'No part interferences detected.' : 'Interference detected.' });
  } else {
    interferenceResult.diagnostics.forEach((diag, index) => {
      const pair = interferenceResult.pairs[index];
      verdicts.push({ gate: 'interference', ok: false, code: diag.code, message: diag.message, hint: diag.hint, margin: pair?.volumeMm3, locus: pair ? `${pair.partA}∩${pair.partB}` : undefined });
    });
  }
  return verdicts;
}
