// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// An agent copies the assemblies skill Query snippets, so each one must pass
// the gate the agent's own work is held to: evaluate_script with `ok: true`
// and `mechanism: 'real'`. Q-S4 failed it with 1 error: the servo cylinder
// stood inside the bracket box and had no mate. Q-S5 failed it with 2 errors:
// both connectors were off the seating faces, so the fastened mate put the
// bracket 2.5 mm inside the base. Each child part now sits on the parent's
// top face with both connectors on the shared face.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const SNIPPET_DIR = 'src/agent/skills/kernelcad-assemblies/cookbook/snippets';
const VERIFIED_REAL = [
  'Q-S4-ownership-and-part-queries.kcad.ts',
  'Q-S5-connector-queries.kcad.ts',
];

describe('assemblies skill Query snippets pass evaluate_script', () => {
  for (const name of VERIFIED_REAL) {
    it(`${name} is ok with a real mechanism`, async () => {
      const out = (await callMcpTool('evaluate_script', { file: `${SNIPPET_DIR}/${name}`, autosave: false } as never)) as {
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
