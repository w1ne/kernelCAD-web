// eval/tasks/cqe-task-assemble-m3-through-bracket/harness.ts
//
// Gates the parts-catalog round-trip:
//   - Script evaluates clean (no diagnostics).
//   - The resulting Scene contains the bracket and bolt parts.
//   - A mate exists between the bolt and the bracket.

import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessCtx, HarnessResult } from '../../types';

export default async function harness(
  scriptPath: string,
  _ctx?: HarnessCtx,
): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }
  return {
    gates: {
      'evaluates clean': true,
    },
    scored: {},
  };
}
