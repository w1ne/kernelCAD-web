// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { runClosedLoop } from './closedLoop.js';
import type { GateReport, GateRunner, LoopMessage } from './types.js';

const PASS_REPORT: GateReport = { ok: true, verdicts: [{ gate: 'evaluate', ok: true, message: 'ok' }] };
const FAIL_REPORT: GateReport = {
  ok: false,
  verdicts: [{ gate: 'evaluate', ok: false, code: 'evaluate.broken', message: 'broken' }],
};

function scriptedGate(reports: GateReport[]): GateRunner {
  let i = 0;
  return { run: async () => reports[Math.min(i++, reports.length - 1)] };
}

function scriptedGenerate(texts: string[]) {
  const calls: LoopMessage[][] = [];
  let i = 0;
  const generate = async (messages: LoopMessage[]) => {
    calls.push(messages.map((m) => ({ ...m })));
    const text = texts[Math.min(i++, texts.length - 1)];
    return { text, tokensIn: 1, tokensOut: 2 };
  };
  return { generate, calls };
}

const fence = (body: string) => '```ts\n' + body + '\n```';
const extractScript = (text: string): string | null => {
  const m = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return m ? m[1].trimEnd() : null;
};
const writeScript = async (code: string) => `/tmp/closedloop-test-${code.length}.kcad.ts`;

// Generates one text per variant on the fan-out turn; a fixed text on repair turns.
function bestOfNGenerate(byVariant: string[], repairTexts: string[] = []) {
  const variants: (number | undefined)[] = [];
  let r = 0;
  const generate = async (_messages: LoopMessage[], opts?: { variant?: number }) => {
    variants.push(opts?.variant);
    if (opts?.variant !== undefined) {
      return { text: byVariant[opts.variant], tokensIn: 1, tokensOut: 1 };
    }
    const text = repairTexts.length ? repairTexts[Math.min(r++, repairTexts.length - 1)] : fence('repaired');
    return { text, tokensIn: 1, tokensOut: 1 };
  };
  return { generate, variants };
}

describe('runClosedLoop', () => {
  it('(a) passes on first attempt when gate ok', async () => {
    const { generate } = scriptedGenerate([fence('cube(10)')]);
    const result = await runClosedLoop({ prompt: 'make a cube', generate, gateRunner: scriptedGate([PASS_REPORT]), extractScript, writeScript });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') {
      expect(result.attempts).toBe(1);
      expect(result.scriptPath).toContain('.kcad.ts');
      expect(result.tokensIn).toBe(1);
      expect(result.tokensOut).toBe(2);
    }
  });

  it('(b) fails twice then passes at attempt 3, sending a repair prompt between attempts', async () => {
    const { generate, calls } = scriptedGenerate([fence('bad1'), fence('bad2'), fence('good')]);
    const result = await runClosedLoop({ prompt: 'make it', generate, gateRunner: scriptedGate([FAIL_REPORT, FAIL_REPORT, PASS_REPORT]), extractScript, writeScript, maxAttempts: 3 });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') expect(result.attempts).toBe(3);
    expect(calls.length).toBe(3);
    const lastCall = calls[2];
    const repairMsg = lastCall[lastCall.length - 1];
    expect(repairMsg.role).toBe('user');
    expect(repairMsg.content).toContain('evaluate.broken');
    expect(repairMsg.content).toContain('Fix and return the full corrected script.');
    expect(result.tokensIn).toBe(3);
    expect(result.tokensOut).toBe(6);
  });

  it('(c) always-broken gate returns gate_failed after maxAttempts with verdicts', async () => {
    const { generate } = scriptedGenerate([fence('bad')]);
    const result = await runClosedLoop({ prompt: 'x', generate, gateRunner: scriptedGate([FAIL_REPORT]), extractScript, writeScript, maxAttempts: 2 });
    expect(result.status).toBe('gate_failed');
    if (result.status === 'gate_failed') {
      expect(result.attempts).toBe(2);
      expect(result.verdicts[0].code).toBe('evaluate.broken');
      expect(result.scriptPath).toContain('.kcad.ts');
    }
  });

  it('(d) no code fence returns no_script', async () => {
    const { generate } = scriptedGenerate(['sorry, here is some prose with no code']);
    const result = await runClosedLoop({ prompt: 'x', generate, gateRunner: scriptedGate([PASS_REPORT]), extractScript, writeScript, maxAttempts: 2 });
    expect(result.status).toBe('no_script');
    if (result.status === 'no_script') expect(result.attempts).toBe(2);
  });

  it('uses an injected buildRepairPrompt when provided', async () => {
    const { generate, calls } = scriptedGenerate([fence('bad'), fence('good')]);
    await runClosedLoop({ prompt: 'x', generate, gateRunner: scriptedGate([FAIL_REPORT, PASS_REPORT]), extractScript, writeScript, maxAttempts: 2, buildRepairPrompt: () => 'CUSTOM_REPAIR' });
    const lastCall = calls[1];
    expect(lastCall[lastCall.length - 1].content).toBe('CUSTOM_REPAIR');
  });
});

describe('runClosedLoop best-of-N', () => {
  it('selects the only gate-passing candidate as winner', async () => {
    const { generate } = bestOfNGenerate([fence('v0aaaa'), fence('v1bb'), fence('v2c'), fence('v3dddd')]);
    const events: import('./types.js').ClosedLoopEvent[] = [];
    const result = await runClosedLoop({
      prompt: 'make it',
      generate,
      gateRunner: scriptedGate([FAIL_REPORT, FAIL_REPORT, PASS_REPORT, FAIL_REPORT]),
      extractScript,
      writeScript,
      candidates: 4,
      onEvent: (e) => events.push(e),
    });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') expect(result.attempts).toBe(1);
    const bon = events.find((e) => e.type === 'best_of_n');
    expect(bon && bon.type === 'best_of_n' && bon.winnerIndex).toBe(2);
    expect(result.tokensIn).toBe(4);
  });

  it('uses oracleScore to break ties among gate-passing candidates', async () => {
    const { generate } = bestOfNGenerate([fence('a'), fence('bb'), fence('ccc')]);
    const scores = [0.2, 0.9, 0.5];
    let i = 0;
    const result = await runClosedLoop({
      prompt: 'make it',
      generate,
      gateRunner: scriptedGate([PASS_REPORT, PASS_REPORT, PASS_REPORT]),
      extractScript,
      writeScript,
      candidates: 3,
      scoreCandidate: async () => scores[i++],
    });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') {
      expect(result.scriptPath).toContain('-2.kcad.ts');
    }
  });

  it('repairs the winner when it fails gates (fan-out then repair)', async () => {
    const { generate, variants } = bestOfNGenerate(
      [fence('v0a'), fence('v1bb')],
      [fence('fixed')],
    );
    const result = await runClosedLoop({
      prompt: 'make it',
      generate,
      gateRunner: scriptedGate([FAIL_REPORT, FAIL_REPORT, PASS_REPORT]),
      extractScript,
      writeScript,
      candidates: 2,
      maxAttempts: 3,
    });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') expect(result.attempts).toBe(2);
    expect(variants).toEqual([0, 1, undefined]);
  });

  it('falls back to no_script when no candidate yields a script', async () => {
    const { generate } = bestOfNGenerate(['no fence here', 'still none']);
    const result = await runClosedLoop({
      prompt: 'make it',
      generate,
      gateRunner: scriptedGate([PASS_REPORT]),
      extractScript,
      writeScript,
      candidates: 2,
      maxAttempts: 1,
    });
    expect(result.status).toBe('no_script');
  });

  it('winner scriptPath holds winner code even when writeScript reuses one path', async () => {
    // One shared path for all candidates (mirrors the eval runner). Winner is the
    // gate-passing candidate at index 0, which is NOT the last one written.
    const store: Record<string, string> = {};
    const sharedWrite = async (code: string) => {
      store['/shared.kcad.ts'] = code;
      return '/shared.kcad.ts';
    };
    const { generate } = bestOfNGenerate([fence('WINNER'), fence('lastX1'), fence('lastX2'), fence('lastX3')]);
    const result = await runClosedLoop({
      prompt: 'x',
      generate,
      gateRunner: scriptedGate([PASS_REPORT, FAIL_REPORT, FAIL_REPORT, FAIL_REPORT]),
      extractScript,
      writeScript: sharedWrite,
      candidates: 4,
    });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') {
      expect(store[result.scriptPath]).toBe('WINNER'); // not 'lastX3'
    }
  });
});

describe('runClosedLoop best-of-N invariants', () => {
  it('candidates unset → single-sample path unchanged (no best_of_n event)', async () => {
    const events: import('./types.js').ClosedLoopEvent[] = [];
    const { generate } = scriptedGenerate([fence('cube(10)')]);
    const result = await runClosedLoop({
      prompt: 'make a cube',
      generate,
      gateRunner: scriptedGate([PASS_REPORT]),
      extractScript,
      writeScript,
      onEvent: (e) => events.push(e),
    });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') expect(result.attempts).toBe(1);
    expect(events.some((e) => e.type === 'best_of_n')).toBe(false);
    expect(result.tokensIn).toBe(1); // exactly one generation
  });

  it('the oracle score never appears in any repair prompt', async () => {
    const SENTINEL = 0.7777;
    const repairPrompts: string[] = [];
    const { generate } = bestOfNGenerate([fence('v0a'), fence('v1bb')], [fence('fixed')]);
    await runClosedLoop({
      prompt: 'make it',
      generate,
      gateRunner: scriptedGate([FAIL_REPORT, FAIL_REPORT, PASS_REPORT]),
      extractScript,
      writeScript,
      candidates: 2,
      maxAttempts: 3,
      scoreCandidate: async () => SENTINEL,
      onEvent: (e) => {
        if (e.type === 'repair') repairPrompts.push(e.prompt);
      },
    });
    expect(repairPrompts.length).toBeGreaterThan(0);
    for (const p of repairPrompts) expect(p).not.toContain(String(SENTINEL));
  });
});

describe('runClosedLoop best-of-N with consensus selection', () => {
  type BestOfN = Extract<import('./types.js').ClosedLoopEvent, { type: 'best_of_n' }>;
  const bestOfNEvent = (events: import('./types.js').ClosedLoopEvent[]): BestOfN => {
    const e = events.find((ev): ev is BestOfN => ev.type === 'best_of_n');
    if (e === undefined) throw new Error('no best_of_n event');
    return e;
  };
  /** Unit-cube mesh translated along x: the candidate's "geometry". */
  const cubeAt = (x: number): import('../../kernel/backends/runtimeMesh').RuntimeMesh => {
    const p: number[] = [];
    for (const z of [0, 1]) for (const y of [0, 1]) for (const dx of [0, 1]) p.push(x + dx, y, z);
    const idx: number[] = [];
    for (const [a, b, c, d] of [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]) {
      idx.push(a, b, c, a, c, d);
    }
    return { positions: new Float32Array(p), normals: new Float32Array(p.length), indices: new Uint32Array(idx) };
  };
  // Script text → x position; 'BROKEN' produces no solid.
  const geometryFor = (code: string) =>
    code === 'BROKEN' ? { mesh: null, invalidReason: 'no solid' } : { mesh: cubeAt(Number(code.replace(/\D/g, ''))) };

  it('picks the geometric medoid over the gate/oracle favourite', async () => {
    const store: Record<string, string> = {};
    const sharedWrite = async (code: string) => {
      store['/c.kcad.ts'] = code;
      return '/c.kcad.ts';
    };
    // x = 0..3 agree; x = 50 is the outlier — and the oracle loves it.
    const { generate } = bestOfNGenerate([fence('x0'), fence('x50'), fence('x1'), fence('x2'), fence('x3')]);
    const oracle = [0.1, 1.0, 0.1, 0.1, 0.1];
    let k = 0;
    const events: import('./types.js').ClosedLoopEvent[] = [];
    const result = await runClosedLoop({
      prompt: 'x',
      generate,
      gateRunner: scriptedGate([PASS_REPORT]),
      extractScript,
      writeScript: sharedWrite,
      candidates: 5,
      scoreCandidate: async () => oracle[k++],
      candidateGeometry: async (path) => geometryFor(store[path]),
      onEvent: (e) => events.push(e),
    });
    expect(result.status).toBe('passed');
    if (result.status === 'passed') expect(store[result.scriptPath]).toBe('x2');
    const bon = bestOfNEvent(events);
    expect(bon.selector).toBe('consensus');
    expect(bon.winnerIndex).toBe(3); // x2: the middle of the agreeing cluster
    expect(bon.candidates[1].meanDistanceMm).toBeGreaterThan(10);
    expect(bon.reason).toMatch(/geometric medoid/);
  });

  it('drops invalid candidates and falls back to gates when none is valid', async () => {
    const store: Record<string, string> = {};
    const sharedWrite = async (code: string) => {
      store['/c.kcad.ts'] = code;
      return '/c.kcad.ts';
    };
    const events: import('./types.js').ClosedLoopEvent[] = [];
    const { generate } = bestOfNGenerate([fence('BROKEN'), fence('BROKEN')]);
    const result = await runClosedLoop({
      prompt: 'x',
      generate,
      gateRunner: scriptedGate([FAIL_REPORT, PASS_REPORT]),
      extractScript,
      writeScript: sharedWrite,
      candidates: 2,
      candidateGeometry: async (path) => geometryFor(store[path]),
      onEvent: (e) => events.push(e),
    });
    const bon = bestOfNEvent(events);
    expect(bon.selector).toBe('gates-oracle');
    expect(bon.winnerIndex).toBe(1); // the gate-passing one
    expect(bon.candidates.map((c) => c.meanDistanceMm)).toEqual([null, null]);
    expect(result.status).toBe('passed');
  });
});
