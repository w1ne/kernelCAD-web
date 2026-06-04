import type { GateReport, GateRunner, GateVerdict } from '../../src/agent/loop/types.js';
import { evaluateScript } from '../oracle/kernelcad-client.js';
import { runInterference } from '../oracle/interference.js';

/**
 * Web (CLI-oracle) GateRunner. Runs the build-blocking suite on a written script:
 *  - evaluate_script via evaluateScript() (mechanism.* failures surface here as diagnostics)
 *  - interference via runInterference()
 * Maps both into the shared GateVerdict[] contract. ok = evaluate.ok && interference.ok.
 */
export function createWebGateRunner(epsilonMm3 = 0.01): GateRunner {
  return {
    async run(scriptPath: string): Promise<GateReport> {
      const verdicts: GateVerdict[] = [];

      const evaluate = await evaluateScript(scriptPath);
      if (evaluate.ok) {
        verdicts.push({ gate: 'evaluate', ok: true, message: 'evaluate passed' });
      } else if (evaluate.diagnostics.length === 0) {
        verdicts.push({ gate: 'evaluate', ok: false, message: 'evaluate failed' });
      } else {
        for (const d of evaluate.diagnostics) {
          verdicts.push({ gate: 'evaluate', ok: false, code: d.code, message: d.message, hint: d.hint, locus: d.featureId });
        }
      }

      const interference = await runInterference(scriptPath, epsilonMm3);
      if (interference.ok) {
        verdicts.push({ gate: 'interference', ok: true, message: 'no interferences' });
      } else {
        for (const pair of interference.pairs) {
          verdicts.push({ gate: 'interference', ok: false, code: 'interference.overlap', message: `${pair.partA} overlaps ${pair.partB} by ${pair.volumeMm3} mm³`, locus: `${pair.partA}∩${pair.partB}`, margin: pair.volumeMm3 });
        }
        if (interference.pairs.length === 0) {
          for (const d of interference.diagnostics) {
            verdicts.push({ gate: 'interference', ok: false, code: d.code, message: d.message, hint: d.hint });
          }
        }
      }

      const ok = evaluate.ok && interference.ok;
      return { ok, verdicts };
    },
  };
}
