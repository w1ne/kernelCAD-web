import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';

const GOLDEN = 'eval/runs/golden-2026-05-02-bracket-holes';

let kernelcadAvailable = false;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
  // In CI we must fail loudly rather than silently skip — a green build with
  // zero golden coverage is worse than a red one. Local dev still gets the skip.
  if (!kernelcadAvailable && process.env.CI) {
    throw new Error(
      'kernelcad CLI not available in CI. Set KERNELCAD_BIN=./dist/cli/index.js after `npm run build:cli`, or `npm link`.',
    );
  }
});

describe('golden mock replay', () => {
  it('replays the golden fixture and produces matching score (deterministic fields only)', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();

    const fixture = JSON.parse(readFileSync(join(GOLDEN, 'fixture.json'), 'utf8'));
    const client = new MockAgentClient(fixture.responses);
    const tmpRun = mkdtempSync(join(tmpdir(), 'eval-golden-'));

    const result = await runTask({
      taskDir: 'eval/tasks/bracket-holes',
      runDir: tmpRun,
      agent: client,
      model: 'mock-model',
      skillMd: readFileSync('src/skill/SKILL.md', 'utf8'),
      startedAt: 'GOLDEN',
    });

    // Compare score.json fields except time_ms (wall-clock).
    const expectedScore = JSON.parse(readFileSync(join(GOLDEN, 'score.json'), 'utf8'));
    const actualScore = JSON.parse(readFileSync(join(tmpRun, 'score.json'), 'utf8'));

    expect(actualScore.gates).toEqual(expectedScore.gates);
    expect(actualScore.scored).toEqual(expectedScore.scored);
    expect(actualScore.gate_pass).toBe(expectedScore.gate_pass);
    expect(actualScore.score).toBe(expectedScore.score);
    expect(actualScore.attempts).toBe(expectedScore.attempts);
    expect(actualScore.tokens).toEqual(expectedScore.tokens);

    // Compare output.kcad.ts byte-for-byte.
    const expectedScript = readFileSync(join(GOLDEN, 'output.kcad.ts'), 'utf8');
    const actualScript = readFileSync(join(tmpRun, 'output.kcad.ts'), 'utf8');
    expect(actualScript).toBe(expectedScript);

    // Compare transcript after normalizing wall-clock time fields to 0.0s
    // (same normalization the recorded golden underwent).
    const expectedTx = readFileSync(join(GOLDEN, 'transcript.md'), 'utf8');
    const actualTxRaw = readFileSync(join(tmpRun, 'transcript.md'), 'utf8');
    const actualTx = actualTxRaw
      .replace(/, [0-9]+\.[0-9]s\)$/gm, ', 0.0s)')         // per-turn elapsed
      .replace(/^- Time: [0-9]+\.[0-9]s$/gm, '- Time: 0.0s'); // score block elapsed
    expect(actualTx).toBe(expectedTx);

    expect(result.score!.gate_pass).toBe(true);
  }, 30000);
});
