// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The mech40 agent runner end to end without an API key: scripted agents,
// the real in-process gate and the real task harness.
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AgentClient, AgentResponse } from '../types';
import { createInProcessGateRunner } from './inProcessGate';
import { parseCli, ReferenceAgentClient, runMech40, type Mech40Options } from './runAgent';
import { listMech40Tasks, MECH40_DIR } from './tasks';

const TASK = '01-plate-four-corner-holes';

/** Replies with the given scripts in turn (the last one repeats). */
class ScriptedAgent implements AgentClient {
  private i = 0;
  private readonly scripts: string[];
  constructor(scripts: string[]) {
    this.scripts = scripts;
  }
  async generate(): Promise<AgentResponse> {
    const code = this.scripts[Math.min(this.i++, this.scripts.length - 1)];
    return { text: `\`\`\`typescript\n${code}\n\`\`\``, tokens_in: 100, tokens_out: 50 };
  }
}

function opts(k: number): Mech40Options {
  return {
    k, model: 'test', tasks: [TASK], maxAttempts: 3, concurrency: 1, mock: true,
    skills: 'none', skillMd: '', runRoot: mkdtempSync(join(tmpdir(), 'mech40-run-')),
  };
}

describe('mech40 task set', () => {
  it('has 40 tasks, each with prompt, checker and reference solution', () => {
    expect(listMech40Tasks()).toHaveLength(40);
    expect(readdirSync(MECH40_DIR)).toHaveLength(40);
  });
});

describe('runMech40', () => {
  const gateRunner = createInProcessGateRunner();

  it('reference agent: every sample passes on the first evaluation', async () => {
    const r = await runMech40(opts(2), { agentFor: (t) => new ReferenceAgentClient(t.solution), gateRunner });
    expect(r.summary).toMatchObject({ tasks: 1, samples: 2, pass_at_1: 1, pass_at_k: 1, mean_evals_to_success: 1 });
    expect(r.schema).toBe('kernelcad.mech40.results/v1');
  }, 120_000);

  it('repairs after a failing evaluation, and scores wrong geometry as a check failure', async () => {
    const ref = (t: { solution: string }) => readFileSync(t.solution, 'utf8');
    const broken = 'const w = param("w", 10);\nreturn box(w + 1, 10, 10);';
    const wrong = 'return box(100, 60, 6);'; // evaluates clean, no holes
    let call = 0;
    const r = await runMech40(opts(2), {
      agentFor: (t) => (call++ === 0 ? new ScriptedAgent([broken, ref(t)]) : new ScriptedAgent([wrong])),
      gateRunner,
    });
    const [repaired, wrongSample] = r.tasks[0].samples;
    expect(repaired).toMatchObject({ pass: true, evals: 2 });
    expect(wrongSample.pass).toBe(false);
    expect(wrongSample.failureCode).toMatch(/^check:/);
    expect(r.summary.pass_at_1).toBe(0.5);
    expect(r.summary.mean_evals_to_success).toBe(2);
  }, 180_000);
});

describe('parseCli', () => {
  it('defaults and flags', () => {
    expect(parseCli(['--mock'])).toMatchObject({ k: 3, maxAttempts: 3, concurrency: 1, mock: true, model: 'mock-reference' });
    expect(parseCli(['--k', '5', '--tasks', 'a,b', '--temperature', '0.7', '--model', 'm'])).toMatchObject({
      k: 5, tasks: ['a', 'b'], temperature: 0.7, model: 'm',
    });
  });

  it('rejects bad values and unknown flags', () => {
    expect(() => parseCli(['--k', '0'])).toThrow(/--k/);
    expect(() => parseCli(['--temperature', '3'])).toThrow(/temperature/);
    expect(() => parseCli(['--nope'])).toThrow(/unknown flag/);
  });
});
