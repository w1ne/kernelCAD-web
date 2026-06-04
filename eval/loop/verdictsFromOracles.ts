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
 * - Interference verdicts are driven by `pairs` (where the CLI actually reports
 *   the overlap), giving margin = volumeMm3 and locus = `${partA}∩${partB}`.
 *   The CLI emits the overlap data in `pairs` with `diagnostics` empty, so we
 *   must read `pairs` — not `diagnostics` — to surface the typed evidence.
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
  if (interferenceResult.pairs.length > 0) {
    // Real overlaps — one typed verdict per pair, carrying margin (mm³) and locus.
    for (const pair of interferenceResult.pairs) {
      verdicts.push({
        gate: 'interference',
        ok: false,
        code: 'interference.overlap',
        message: `${pair.partA} overlaps ${pair.partB} by ${Math.round(pair.volumeMm3)} mm³`,
        margin: pair.volumeMm3,
        locus: `${pair.partA}∩${pair.partB}`,
      });
    }
  } else if (!interferenceResult.ok && interferenceResult.diagnostics.length > 0) {
    // Failed without pair detail (e.g. a CLI exception) — surface the diagnostics.
    for (const diag of interferenceResult.diagnostics) {
      verdicts.push({ gate: 'interference', ok: false, code: diag.code, message: diag.message, hint: diag.hint });
    }
  } else {
    verdicts.push({ gate: 'interference', ok: interferenceResult.ok, message: interferenceResult.ok ? 'No part interferences detected.' : 'Interference detected.' });
  }
  return verdicts;
}
