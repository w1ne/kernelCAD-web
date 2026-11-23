// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/kinematic/four-bar-swept.kcad.ts is the full version of kinematic
// cookbook snippet 9, so it must pass the same gate: evaluate_script with
// `ok: true` and `mechanism: 'real'`. It failed with 16 errors: the links sat
// in separate Y layers joined by pins that touched no mating part, the stop
// was fastened at the world origin, and the full-turn limits ran through the
// stop and the poses where the rocker reverses. Mated parts now share a face
// on the pin plane, the stop is seated on the ground bar, and the mate limits
// are the crank travel where every loop joint angle is monotonic. The script
// itself throws if the 0° to 200° sweep does not find the rocker-to-stop
// contact at the closed-form crank angle.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

describe('four-bar-swept example passes evaluate_script', () => {
  it('is ok with a real mechanism and no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', {
      file: 'examples/kinematic/four-bar-swept.kcad.ts',
      autosave: false,
    } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string; message: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);
});
