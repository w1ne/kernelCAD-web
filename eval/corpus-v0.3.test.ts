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
  runsDir = mkdtempSync(join(tmpdir(), 'eval-corpus-v0.3-'));
});

const tasks: Array<{ id: string; dir: string }> = [
  { id: 'single-counterbored-hole', dir: './eval/tasks/single-counterbored-hole' },
  { id: 'bolt-pattern-4',           dir: './eval/tasks/bolt-pattern-4' },
  { id: 'mixed-fastener-plate',     dir: './eval/tasks/mixed-fastener-plate' },
  { id: 'keyhole-cutout',           dir: './eval/tasks/keyhole-cutout' },
  { id: 'through-slot',             dir: './eval/tasks/through-slot' },
  // slice 2 — named features + ordinal fallback + snapshot fallback
  { id: 'named-feature-disambiguation',     dir: './eval/tasks/named-feature-disambiguation' },
  { id: 'ordinal-feature-fallback',         dir: './eval/tasks/ordinal-feature-fallback' },
  { id: 'named-bore-survives-transform',     dir: './eval/tasks/named-bore-survives-transform' },
];

describe('v0.3 hole + cutout corpus — expert solutions score 100%', () => {
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
        skillMd: 'fake skill content',
        startedAt: 'CORPUS-V03',
      });

      expect(result.score).not.toBeNull();
      expect(result.score!.gate_pass).toBe(true);
      expect(result.score!.score).toBe(1);
      expect(result.score!.attempts).toBe(1);
    }, 60000);
  }
});
