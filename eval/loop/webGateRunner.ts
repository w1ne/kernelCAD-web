import type { GateReport, GateRunner } from '../../src/agent/loop/types.js';
import { evaluateScript } from '../oracle/kernelcad-client.js';
import { runInterference } from '../oracle/interference.js';
import { verdictsFromOracles } from './verdictsFromOracles';

/**
 * Web (CLI-oracle) GateRunner. Runs the build-blocking suite on a written script:
 *  - evaluate_script via evaluateScript() (mechanism.* failures surface here as diagnostics)
 *  - interference via runInterference()
 * Maps both into the shared GateVerdict[] contract. ok = evaluate.ok && interference.ok.
 */
export function createWebGateRunner(epsilonMm3 = 0.01): GateRunner {
  return {
    async run(scriptPath: string): Promise<GateReport> {
      const evaluate = await evaluateScript(scriptPath);
      const interference = await runInterference(scriptPath, epsilonMm3);
      const verdicts = verdictsFromOracles(evaluate, interference);
      return { ok: verdicts.every((v) => v.ok), verdicts };
    },
  };
}
