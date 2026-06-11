// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/corpus-sheet-metal.test.ts
//
// W2.2 corpus tests — verify the expert solutions for the 3 sheet-metal
// tasks pass their respective harness gates.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';

let kernelcadAvailable = false;
let runsDir: string;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
});

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'eval-corpus-sheet-metal-'));
});

const tasks: Array<{ id: string; dir: string }> = [
  { id: 'sheet-metal-l-bracket',         dir: './eval/tasks/sheet-metal-l-bracket' },
  { id: 'sheet-metal-u-channel',         dir: './eval/tasks/sheet-metal-u-channel' },
  { id: 'sheet-metal-flatten-roundtrip', dir: './eval/tasks/sheet-metal-flatten-roundtrip' },
];

describe('W2.2 sheet-metal corpus — expert solutions pass gates', () => {
  for (const t of tasks) {
    it(`${t.id} — expert solution passes harness gates`, async (ctx) => {
      if (!kernelcadAvailable) return ctx.skip();
      const expertScript = readFileSync(join(t.dir, 'solution-expert.kcad.ts'), 'utf8');
      const client = new MockAgentClient([
        {
          text: 'Here is the part:\n```typescript\n' + expertScript + '\n```',
          tokens_in: 4000,
          tokens_out: 200,
        },
      ]);
      const result = await runTask({
        taskDir: t.dir,
        runDir: runsDir,
        agent: client,
        model: 'mock-model',
        skillMd: 'fake skill content',
        startedAt: 'W2.2-CORPUS',
      });
      expect(result.score, `${t.id}: ${JSON.stringify(result.score)}`).not.toBeNull();
      expect(result.score!.gate_pass, `${t.id} gates: ${JSON.stringify(result.score!.gates)}`).toBe(true);
    }, 60000);
  }
});
