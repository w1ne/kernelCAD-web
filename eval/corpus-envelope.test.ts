// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
  if (!kernelcadAvailable && process.env.CI) {
    throw new Error(
      'kernelcad CLI not available in CI. Set KERNELCAD_BIN=./dist/cli/index.js after `npm run build:cli`, or `npm link`.',
    );
  }
});

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'eval-corpus-envelope-'));
});

const tasks: Array<{ id: string; dir: string }> = [
  { id: 'door-hinge-over-travel',  dir: './eval/tasks/door-hinge-over-travel' },
  { id: 'gripper-aperture-sweep',  dir: './eval/tasks/gripper-aperture-sweep' },
];

describe('pose-envelope corpus — expert solutions score 100%', () => {
  for (const t of tasks) {
    it(`${t.id} — expert solution scores 100%`, async (ctx) => {
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
        skillMd: '',
        startedAt: 'CORPUS-ENVELOPE',
      });

      expect(result.score).not.toBeNull();
      expect(result.score!.gate_pass).toBe(true);
      expect(result.score!.score).toBe(1);
      for (const [name, passed] of Object.entries(result.score!.gates)) {
        expect(passed, `gate '${name}' failed for ${t.id}`).toBe(true);
      }
    }, 60000);
  }
});
