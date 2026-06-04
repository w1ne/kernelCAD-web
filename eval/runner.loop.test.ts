import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AgentClient, AgentMessage, AgentResponse } from './types';

// Evaluate is ALWAYS clean. We mock BOTH specifier forms — the runner imports
// './oracle/kernelcad-client' (no .js) while webGateRunner imports
// '../oracle/kernelcad-client.js'. vitest resolves both to the same module, so
// one mock factory per module suffices, but we register the exact specifiers
// each importer uses to be safe across resolver quirks.
vi.mock('./oracle/kernelcad-client', () => ({
  evaluateScript: vi.fn().mockResolvedValue({ ok: true, diagnostics: [] }),
  // getShapeInfo / isKernelcadAvailable unused on this path; provide stubs.
  getShapeInfo: vi.fn(),
  isKernelcadAvailable: vi.fn().mockResolvedValue(true),
}));
vi.mock('../oracle/kernelcad-client.js', () => ({
  evaluateScript: vi.fn().mockResolvedValue({ ok: true, diagnostics: [] }),
  getShapeInfo: vi.fn(),
  isKernelcadAvailable: vi.fn().mockResolvedValue(true),
}));

// Interference fails the first 2 calls, then passes — proving the loop retries
// on interference (not just on evaluate, which is always clean here).
const interferenceFail = {
  ok: false,
  noSceneToCheck: false,
  partCount: 2,
  comparisonCount: 1,
  epsilonMm3: 0.01,
  pairs: [{ partA: 'a', partB: 'b', volumeMm3: 5 }],
  diagnostics: [],
};
const interferencePass = {
  ok: true,
  noSceneToCheck: false,
  partCount: 2,
  comparisonCount: 1,
  epsilonMm3: 0.01,
  pairs: [],
  diagnostics: [],
};
vi.mock('../oracle/interference.js', () => ({
  runInterference: vi
    .fn()
    .mockResolvedValueOnce(interferenceFail)
    .mockResolvedValueOnce(interferenceFail)
    .mockResolvedValue(interferencePass),
}));

// Import AFTER mocks are registered.
import { runTask } from './runner';

class CountingAgent implements AgentClient {
  public calls = 0;
  constructor(private readonly script: string) {}
  async generate(_args: {
    system: string;
    systemAddendum?: string;
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
  }): Promise<AgentResponse> {
    this.calls += 1;
    return {
      text: '```typescript\n' + this.script + '\n```',
      tokens_in: 100,
      tokens_out: 20,
    };
  }
}

// The harness is dynamically imported by absolute path and its relative
// imports ('../../oracle/...') resolve from the harness file's location — so
// the fixture MUST live inside eval/tasks/ for those to resolve. We create a
// throwaway sibling dir and clean it up afterward.
function makeTaskDir(): string {
  const taskDir = mkdtempSync(join(process.cwd(), 'eval', 'tasks', '.loop-fixture-'));
  writeFileSync(join(taskDir, 'prompt.md'), 'Build a two-part assembly.');
  // Trivial harness that always passes its (mocked-clean) evaluate gate. The
  // harness only runs when the final evaluate is clean.
  const harness = `import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';
export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  return { gates: { 'evaluates clean': ev.ok }, scored: {} };
}
`;
  writeFileSync(join(taskDir, 'harness.ts'), harness);
  return taskDir;
}

let runsDir: string;
let taskDir: string | undefined;
beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'eval-loop-run-'));
});
afterEach(() => {
  if (taskDir && existsSync(taskDir)) rmSync(taskDir, { recursive: true, force: true });
  taskDir = undefined;
});

describe('runTask closed-loop integration', () => {
  it('retries on interference failures (not just evaluate failures)', async () => {
    taskDir = makeTaskDir();
    const agent = new CountingAgent('return cube(10);');

    const result = await runTask({
      taskDir,
      runDir: runsDir,
      agent,
      model: 'mock-model',
      skillMd: 'fake skill content',
      startedAt: '2026-06-04T00-00-00',
    });

    // The load-bearing assertion: 3 generate() calls means the loop retried
    // through the 2 interference failures. Evaluate-only gating would stop at 1.
    expect(agent.calls).toBe(3);
    expect(result.score!.attempts).toBe(3);

    // Final attempt's interference passed → evaluate-clean → harness ran.
    expect(existsSync(join(runsDir, 'output.kcad.ts'))).toBe(true);
    expect(existsSync(join(runsDir, 'transcript.md'))).toBe(true);
    expect(existsSync(join(runsDir, 'score.json'))).toBe(true);
    expect(result.score!.gates['evaluates clean']).toBe(true);

    const score = JSON.parse(readFileSync(join(runsDir, 'score.json'), 'utf8'));
    expect(score.attempts).toBe(3);
  }, 30000);
});
