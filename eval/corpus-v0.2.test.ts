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
  // In CI we must fail loudly rather than silently skip — a green build with
  // zero corpus coverage is worse than a red one. Local dev still gets the skip.
  if (!kernelcadAvailable && process.env.CI) {
    throw new Error(
      'kernelcad CLI not available in CI. Set KERNELCAD_BIN=./dist/cli/index.js after `npm run build:cli`, or `npm link`.',
    );
  }
});

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'eval-corpus-v0.2-'));
});

const tasks: Array<{ id: string; dir: string }> = [
  { id: 'fillet-translated-box', dir: './eval/tasks/fillet-translated-box' },
  { id: 'subtract-then-fillet-rim', dir: './eval/tasks/subtract-then-fillet-rim' },
  { id: 'chamfer-rotated-wedge', dir: './eval/tasks/chamfer-rotated-wedge' },
  { id: 'labeled-bracket-fillet', dir: './eval/tasks/labeled-bracket-fillet' },
];

describe('v0.2 tracked-refs corpus — expert solutions score 100%', () => {
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
        startedAt: 'CORPUS-V02',
      });

      expect(result.score).not.toBeNull();
      expect(result.score!.gate_pass).toBe(true);
      expect(result.score!.score).toBe(1);
      expect(result.score!.attempts).toBe(1);
    }, 60000);
  }
});
