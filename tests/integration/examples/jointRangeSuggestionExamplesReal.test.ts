// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The two joint-range-suggestion examples must pass evaluate_script with
// `ok: true` and `mechanism: 'real'`. Both failed with
// `mechanism.orphan-part`: the wall that stops the carriage had no mate, so
// it was not part of the assembly graph. The rail now has a bed, the wall
// stands on the bed and is fastened to it at the shared face, and the
// carriage slides on the bed. Each script itself throws if the suggested
// stop is not the clear side of the 9.7 mm carriage-to-wall crossing.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const EXAMPLES = [
  'examples/kinematic/joint-range-suggestion.kcad.ts',
  'examples/kinematic/joint-range-suggestion-motion.kcad.ts',
];

describe('joint-range-suggestion examples pass evaluate_script', () => {
  for (const file of EXAMPLES) {
    it(`${file} is ok with a real mechanism and no diagnostics`, async () => {
      const out = (await callMcpTool('evaluate_script', { file, autosave: false } as never)) as {
        ok: boolean;
        mechanism?: string;
        diagnostics: { code: string; severity: string; message: string }[];
      };
      expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
      expect(out.ok).toBe(true);
      expect(out.mechanism).toBe('real');
    }, 120_000);
  }
});
