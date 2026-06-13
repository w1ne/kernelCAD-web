// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/corpus-query-dsl.test.ts
//
// Q10 corpus test — verifies the composed-Query-DSL expert solution
// passes its harness gates. Locks the end-to-end pipeline:
// typed `q.face()` constructor → chainable `.and(q.withLabel(...))`
// composition → consumer integration (hole accepts Query<FaceMarker>)
// → Q3 evaluator → OCCT lowerer dispatch. A regression in any
// upstream step shows up here as either a gate failure or a
// `query.*` blocking diagnostic.

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
  runsDir = mkdtempSync(join(tmpdir(), 'eval-corpus-query-dsl-'));
});

const tasks: Array<{ id: string; dir: string }> = [
  { id: 'query-dsl-composed', dir: './eval/tasks/query-dsl-composed' },
];

describe('Q DSL corpus — expert solutions pass gates', () => {
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
        startedAt: 'Q-CORPUS',
      });
      expect(result.score, `${t.id}: ${JSON.stringify(result.score)}`).not.toBeNull();
      expect(
        result.score!.gate_pass,
        `${t.id} gates: ${JSON.stringify(result.score!.gates)}`,
      ).toBe(true);
    }, 60000);
  }
});
