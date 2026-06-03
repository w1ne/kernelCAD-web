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
