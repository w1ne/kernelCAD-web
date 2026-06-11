// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/shopcheck-bracket-preflight/harness.ts
//
// Gates:
//   - evaluates clean
//   - preflight ok (no error-severity findings)
//   - zero dfm.* error findings

import { evaluateScript } from '../../oracle/kernelcad-client';
import { dfmPreflightTool } from '../../../src/agent/mcp/tools/dfmPreflight';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }
  await initOcct();

  const pre = await dfmPreflightTool({
    file: scriptPath,
    vendor: 'sendcutsend',
    material: 'aluminum-6061-t6',
    thicknessIn: 0.125,
    service: 'bending',
  });

  const errorFindings = pre.findings.filter(f => f.severity === 'error');
  return {
    gates: {
      'evaluates clean': true,
      'preflight ok': pre.ok,
      'zero dfm error findings': errorFindings.length === 0,
    },
    scored: {
      'has at most one warn finding': pre.findings.filter(f => f.severity === 'warn').length <= 1,
    },
  };
}
