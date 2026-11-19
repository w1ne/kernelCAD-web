// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// An agent copies the kinematic skill cookbook scripts, so each one must pass
// the gate the agent's own work is held to: evaluate_script with `ok: true`
// and `mechanism: 'real'`. Snippet 1 failed it with 10 errors: the base wall
// was 100 mm from the shoulder pivot, the forearm butted the upper arm on the
// elbow axis, and the ±180° shoulder limit put the arm inside the wall. The
// arm is now seated on a pedestal, the forearm laps the upper arm, and the
// shoulder limit stops short of the band the sweep reports.
//
// VERIFIED_REAL only grows. Add a snippet here when it is rebuilt.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const COOKBOOK_DIR = 'src/agent/skills/kernelcad-kinematic/cookbook';
const VERIFIED_REAL = [
  '01-swept-collision-shoulder.kcad.ts',
  '03-cantilever-beam-stress.kcad.ts',
  '04-scissor-jack-swept.kcad.ts',
];

describe('kinematic skill cookbook scripts pass evaluate_script', () => {
  for (const name of VERIFIED_REAL) {
    it(`${name} is ok with a real mechanism`, async () => {
      const out = (await callMcpTool('evaluate_script', { file: `${COOKBOOK_DIR}/${name}`, autosave: false } as never)) as {
        ok: boolean;
        mechanism?: string;
        diagnostics: { code: string; severity: string; message: string }[];
      };
      const errors = out.diagnostics
        .filter((d) => d.severity === 'error')
        .map((d) => `${d.code}: ${d.message}`);
      expect(errors, name).toEqual([]);
      expect(out.ok, name).toBe(true);
      expect(out.mechanism, name).toBe('real');
    }, 120_000);
  }
});
