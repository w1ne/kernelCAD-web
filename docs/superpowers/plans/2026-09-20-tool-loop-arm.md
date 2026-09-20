# Tool-Loop Agent Arm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in one-tool agent arm (`evaluate_script`) to the sweep and A/B it on the 58-case subset against the paired `full` baseline (16/58 sandbox).

**Architecture:** `eval/lib/toolLoop.ts` (client-agnostic loop) + `chatWithTools` on the OpenAI-compatible client + `eval/lib/toolGenerate.ts` (produces the same `GenerateCaseResult` shape so the state machine is untouched) + `--tool-loop` wiring.

**Tech Stack:** TypeScript, vitest, OpenAI-compatible function calling (probe-verified on DeepSeek-V4.1-Flash/DeepInfra), existing `evaluateScript` oracle.

**Spec:** `docs/superpowers/specs/2026-09-20-tool-loop-arm-design.md`

---

### Task 1: Tool-loop core

**Files:**
- Create: `eval/lib/toolLoop.ts`
- Test: `eval/lib/toolLoop.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { runToolLoop, type ToolChatClient, type ToolChatResult } from './toolLoop';

function clientFrom(responses: ToolChatResult[]): ToolChatClient {
  let i = 0;
  return {
    chatWithTools: async () => {
      const r = responses[i++];
      if (!r) throw new Error('client exhausted');
      return r;
    },
  };
}

const TOOL = {
  type: 'function' as const,
  function: { name: 'evaluate_script', description: 'eval', parameters: { type: 'object' } },
};

describe('runToolLoop', () => {
  it('stops on an assistant message without tool calls', async () => {
    const client = clientFrom([
      { text: '```ts\nreturn box(1,1,1);\n```', toolCalls: [], finishReason: 'stop', tokensIn: 10, tokensOut: 5 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async () => ({ content: '{}', ok: true, diagnostics: [] }),
    });
    expect(r.stopReason).toBe('final');
    expect(r.toolCallCount).toBe(0);
    expect(r.finalText).toContain('box(1,1,1)');
    expect(r.tokensIn).toBe(10);
  });

  it('executes tool calls, feeds results back, and records the evaluated code', async () => {
    const client = clientFrom([
      {
        text: 'checking',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return box(1,1,1);"}' }],
        finishReason: 'tool_calls', tokensIn: 20, tokensOut: 8,
      },
      { text: '```ts\nreturn box(1,1,1);\n```', toolCalls: [], finishReason: 'stop', tokensIn: 30, tokensOut: 9 },
    ]);
    const seen: string[] = [];
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async (_name, args) => {
        seen.push(String(args.code));
        return { content: '{"ok":true}', ok: true, diagnostics: [], evaluatedCode: String(args.code) };
      },
    });
    expect(r.stopReason).toBe('final');
    expect(r.toolCallCount).toBe(1);
    expect(seen).toEqual(['return box(1,1,1);']);
    expect(r.lastEvaluatedCode).toBe('return box(1,1,1);');
    expect(r.tokensIn).toBe(50);
    // The second request must include the assistant tool_calls message and the tool result.
    expect(r.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
  });

  it('returns an error result to the model for malformed arguments JSON', async () => {
    const client = clientFrom([
      {
        text: '',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{not json' }],
        finishReason: 'tool_calls', tokensIn: 1, tokensOut: 1,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 1, tokensOut: 1 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async () => ({ content: '{}', ok: true, diagnostics: [] }),
    });
    const toolMsg = r.messages.find((m) => m.role === 'tool');
    expect(toolMsg?.content).toContain('invalid arguments JSON');
  });

  it('caps at maxCalls and reports stopReason cap', async () => {
    const client: ToolChatClient = {
      chatWithTools: async () => ({
        text: 'more',
        toolCalls: [{ id: 'c', name: 'evaluate_script', arguments: '{"code":"x"}' }],
        finishReason: 'tool_calls', tokensIn: 1, tokensOut: 1,
      }),
    };
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 3, tools: [TOOL],
      execute: async () => ({ content: '{}', ok: false, diagnostics: [] }),
    });
    expect(r.stopReason).toBe('cap');
    expect(r.toolCallCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run eval/lib/toolLoop.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `eval/lib/toolLoop.ts`**

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export interface ToolSpec {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ToolCallPayload {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCallPayload[];
  tool_call_id?: string;
}

export interface ToolChatResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
  finishReason: string;
  tokensIn: number;
  tokensOut: number;
}

export interface ToolChatClient {
  chatWithTools(args: {
    system: string;
    messages: ToolChatMessage[];
    tools: ToolSpec[];
    model: string;
    max_tokens: number;
    temperature?: number;
  }): Promise<ToolChatResult>;
}

export type ToolLoopEvent =
  | { type: 'assistant'; call: number; textChars: number; toolCalls: number; tokensIn: number; tokensOut: number }
  | { type: 'tool'; call: number; name: string; ok: boolean; diagnostics: string[] };

export interface ToolExecuteResult {
  content: string;
  ok: boolean;
  diagnostics: string[];
  evaluatedCode?: string;
}

export interface ToolLoopResult {
  finalText: string;
  toolCallCount: number;
  tokensIn: number;
  tokensOut: number;
  stopReason: 'final' | 'cap';
  lastEvaluatedCode?: string;
  messages: ToolChatMessage[];
}

export async function runToolLoop(opts: {
  client: ToolChatClient;
  system: string;
  user: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  maxCalls: number;
  tools: ToolSpec[];
  execute: (name: string, args: Record<string, unknown>) => Promise<ToolExecuteResult>;
  onEvent?: (e: ToolLoopEvent) => void;
}): Promise<ToolLoopResult> {
  const messages: ToolChatMessage[] = [{ role: 'user', content: opts.user }];
  let tokensIn = 0;
  let tokensOut = 0;
  let toolCallCount = 0;
  let lastEvaluatedCode: string | undefined;
  let finalText = '';

  for (let call = 1; call <= opts.maxCalls; call++) {
    const resp = await opts.client.chatWithTools({
      system: opts.system,
      messages,
      tools: opts.tools,
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    });
    tokensIn += resp.tokensIn;
    tokensOut += resp.tokensOut;
    finalText = resp.text;

    const assistant: ToolChatMessage = { role: 'assistant', content: resp.text };
    if (resp.toolCalls.length > 0) {
      assistant.tool_calls = resp.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }
    messages.push(assistant);
    opts.onEvent?.({
      type: 'assistant',
      call,
      textChars: resp.text.length,
      toolCalls: resp.toolCalls.length,
      tokensIn: resp.tokensIn,
      tokensOut: resp.tokensOut,
    });

    if (resp.toolCalls.length === 0) {
      return { finalText, toolCallCount, tokensIn, tokensOut, stopReason: 'final', lastEvaluatedCode, messages };
    }

    for (const tc of resp.toolCalls) {
      toolCallCount++;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(tc.arguments) as Record<string, unknown>;
      } catch {
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: 'invalid arguments JSON' }),
        });
        opts.onEvent?.({ type: 'tool', call, name: tc.name, ok: false, diagnostics: ['invalid-arguments-json'] });
        continue;
      }
      let result: ToolExecuteResult;
      try {
        result = await opts.execute(tc.name, args);
      } catch (err) {
        result = {
          content: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          ok: false,
          diagnostics: ['tool-execute-failed'],
        };
      }
      if (result.evaluatedCode !== undefined) lastEvaluatedCode = result.evaluatedCode;
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result.content });
      opts.onEvent?.({
        type: 'tool',
        call,
        name: tc.name,
        ok: result.ok,
        diagnostics: result.diagnostics.slice(0, 5),
      });
    }
  }

  return { finalText, toolCallCount, tokensIn, tokensOut, stopReason: 'cap', lastEvaluatedCode, messages };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run eval/lib/toolLoop.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add eval/lib/toolLoop.ts eval/lib/toolLoop.test.ts
git commit -m "eval: add client-agnostic tool-call loop"
```

---

### Task 2: `chatWithTools` on the OpenAI-compatible client

**Files:**
- Modify: `eval/agentOpenAICompat.ts`
- Test: `eval/agentOpenAICompat.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `eval/agentOpenAICompat.test.ts`:

```ts
  it('chatWithTools maps tool definitions and tool_calls responses', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: 'checking',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'evaluate_script', arguments: '{"code":"x"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { prompt_tokens: 21, completion_tokens: 6 },
      }),
    );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.chatWithTools({
      system: 'S',
      messages: [{ role: 'user', content: 'hi' }],
      tools: [{ type: 'function', function: { name: 'evaluate_script', description: 'd', parameters: { type: 'object' } } }],
      model: 'm',
      max_tokens: 100,
    });
    expect(out.toolCalls).toEqual([{ id: 'call_1', name: 'evaluate_script', arguments: '{"code":"x"}' }]);
    expect(out.finishReason).toBe('tool_calls');
    expect(out.tokensIn).toBe(21);
    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tools[0].function.name).toBe('evaluate_script');
    expect(body.tool_choice).toBe('auto');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'S' });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run eval/agentOpenAICompat.test.ts`
Expected: FAIL — `chatWithTools` is not a function.

- [ ] **Step 3: Implement**

In `eval/agentOpenAICompat.ts`:

1. Import types:
```ts
import type { ToolChatClient, ToolChatMessage, ToolChatResult, ToolSpec } from './lib/toolLoop';
```
2. Extend the class declaration: `export class OpenAICompatAgentClient implements AgentClient, ToolChatClient {`
3. Extend `ChatCompletionResponse`'s message type with tool calls:
```ts
    message?: {
      content?: string | null;
      tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }>;
    };
```
4. Add the method (uses the existing private `request` and `num`):
```ts
  async chatWithTools(args: {
    system: string;
    messages: ToolChatMessage[];
    tools: ToolSpec[];
    model: string;
    max_tokens: number;
    temperature?: number;
  }): Promise<ToolChatResult> {
    const data = await this.request({
      model: args.model,
      max_tokens: args.max_tokens,
      messages: [{ role: 'system', content: args.system }, ...args.messages],
      tools: args.tools,
      tool_choice: 'auto',
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    });
    const choice = data.choices?.[0];
    const toolCalls = (choice?.message?.tool_calls ?? [])
      .map((tc, i) => ({
        id: tc.id ?? `call_${i}`,
        name: tc.function?.name ?? '',
        arguments: tc.function?.arguments ?? '{}',
      }))
      .filter((tc) => tc.name.length > 0);
    return {
      text: choice?.message?.content ?? '',
      toolCalls,
      finishReason: choice?.finish_reason ?? 'stop',
      tokensIn: num(data.usage?.prompt_tokens),
      tokensOut: num(data.usage?.completion_tokens),
    };
  }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run eval/agentOpenAICompat.test.ts`
Expected: PASS (all existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add eval/agentOpenAICompat.ts eval/agentOpenAICompat.test.ts
git commit -m "eval: add chatWithTools to the OpenAI-compatible client"
```

---

### Task 3: Tool-driven generation + transcript events

**Files:**
- Create: `eval/lib/toolGenerate.ts`
- Modify: `eval/types.ts` (transcript event)
- Modify: `eval/lib.ts` (render the event)
- Test: `eval/lib/toolGenerate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateCaseWithTools, pickArtifact } from './toolGenerate';
import type { ToolChatClient, ToolChatResult } from './toolLoop';

const TASK_DIR = join(__dirname, '..', 'tasks', 'bracket-holes');

function clientFrom(responses: ToolChatResult[]): ToolChatClient {
  let i = 0;
  return {
    chatWithTools: async () => {
      const r = responses[i++];
      if (!r) throw new Error('exhausted');
      return r;
    },
  };
}

describe('pickArtifact', () => {
  it('prefers the fenced block, falls back to the last evaluated code', () => {
    expect(pickArtifact('text ```ts\nreturn A;\n```', 'return B;')).toBe('return A;');
    expect(pickArtifact('no fence here', 'return B;')).toBe('return B;');
    expect(pickArtifact('no fence', undefined)).toBeNull();
  });
});

describe('generateCaseWithTools', () => {
  it('writes the fenced artifact and reports status from the injected evaluator', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: '```ts\nreturn box(1, 1, 1);\n```',
        toolCalls: [],
        finishReason: 'stop',
        tokensIn: 100,
        tokensOut: 10,
      },
    ]);
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 4,
      execute: async () => ({ content: '{"ok":true}', ok: true, diagnostics: [] }),
      evaluateArtifact: async () => ({ ok: true, diagnostics: [] }),
    });
    expect(readFileSync(result.outputScriptPath, 'utf8')).toContain('box(1, 1, 1)');
    expect(result.status).toBe('passed');
    expect(result.tokensIn).toBe(100);
  });

  it('falls back to the last evaluated code when the model never emits a fence', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: 'evaluating',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return last;"}' }],
        finishReason: 'tool_calls',
        tokensIn: 1,
        tokensOut: 1,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 1, tokensOut: 1 },
    ]);
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 4,
      execute: async () => ({
        content: '{"ok":false}',
        ok: false,
        diagnostics: ['feature.invalid-args'],
        evaluatedCode: 'return last;',
      }),
      evaluateArtifact: async () => ({ ok: false, diagnostics: [{ code: 'feature.invalid-args' }] }),
    });
    expect(readFileSync(result.outputScriptPath, 'utf8')).toBe('return last;');
    expect(result.status).toBe('gate_failed');
    expect(result.firstFailureCode).toBe('feature.invalid-args');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run eval/lib/toolGenerate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the transcript event type**

In `eval/types.ts`, extend `TranscriptEvent`:

```ts
  | { kind: 'tool_call'; call: number; name: string; ok: boolean; diagnostics: string[] }
```

In `eval/lib.ts` `renderTranscript`, add a branch beside the other event kinds:

```ts
    } else if (ev.kind === 'tool_call') {
      lines.push(`## Tool call ${ev.call} — ${ev.name} — ${ev.ok ? 'OK' : 'FAIL'}`);
      if (ev.diagnostics.length > 0) {
        for (const d of ev.diagnostics) lines.push(`- ${d}`);
      }
      lines.push('');
    }
```

- [ ] **Step 4: Implement `eval/lib/toolGenerate.ts`**

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { EvaluateResult, TranscriptEvent } from '../types';
import { evaluateScript } from '../oracle/kernelcad-client';
import { extractScript } from '../lib';
import type { GenerateCaseResult } from '../runner';
import { runToolLoop, type ToolChatClient, type ToolExecuteResult, type ToolSpec } from './toolLoop';

export const EVALUATE_SCRIPT_TOOL: ToolSpec = {
  type: 'function',
  function: {
    name: 'evaluate_script',
    description:
      'Run a candidate kernelCAD .kcad.ts script and return diagnostics. Call repeatedly to iterate; when diagnostics are clean, return the final complete script in one fenced block.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Complete kernelCAD TypeScript source for the whole model' },
      },
      required: ['code'],
      additionalProperties: false,
    },
  },
};

export const TOOL_PROTOCOL = [
  '## Verification tool',
  '',
  'You can call `evaluate_script({ code })` to run a candidate `.kcad.ts` and get real diagnostics back.',
  'Iterate: call it as many times as needed until the diagnostics are clean.',
  'When satisfied, output the FINAL complete script in a single ```ts fenced block.',
].join('\n');

export function pickArtifact(finalText: string, lastEvaluatedCode?: string): string | null {
  return extractScript(finalText) ?? lastEvaluatedCode ?? null;
}

export interface GenerateCaseWithToolsArgs {
  taskDir: string;
  runDir: string;
  client: ToolChatClient;
  model: string;
  skillMd: string;
  startedAt: string;
  maxCalls: number;
  maxTokens?: number;
  temperature?: number;
  /** Test overrides; production builds them from `evaluateScript`. */
  execute?: (name: string, args: Record<string, unknown>) => Promise<ToolExecuteResult>;
  evaluateArtifact?: (scriptPath: string) => Promise<Pick<EvaluateResult, 'ok' | 'diagnostics'>>;
}

export async function generateCaseWithTools(args: GenerateCaseWithToolsArgs): Promise<GenerateCaseResult> {
  const taskDirAbs = resolve(args.taskDir);
  const prompt = readFileSync(join(taskDirAbs, 'prompt.md'), 'utf8');
  mkdirSync(args.runDir, { recursive: true });
  const outputScriptPath = join(args.runDir, 'output.kcad.ts');
  const callDir = join(args.runDir, 'tool-calls');

  const events: TranscriptEvent[] = [];
  events.push({ kind: 'system_prompt', chars: args.skillMd.length + TOOL_PROTOCOL.length });
  events.push({ kind: 'user_prompt', content: prompt });

  let callNo = 0;
  const execute =
    args.execute ??
    (async (name: string, a: Record<string, unknown>): Promise<ToolExecuteResult> => {
      if (name !== EVALUATE_SCRIPT_TOOL.function.name) {
        return { content: JSON.stringify({ error: `unknown tool ${name}` }), ok: false, diagnostics: ['unknown-tool'] };
      }
      const code = typeof a.code === 'string' ? a.code : '';
      if (code.length === 0) {
        return { content: JSON.stringify({ error: 'code is required' }), ok: false, diagnostics: ['missing-code'] };
      }
      mkdirSync(callDir, { recursive: true });
      callNo += 1;
      const candidate = join(callDir, `call-${callNo}.kcad.ts`);
      writeFileSync(candidate, code);
      const ev = await evaluateScript(candidate);
      return {
        content: JSON.stringify({
          ok: ev.ok,
          featureCount: ev.featureCount ?? 0,
          diagnostics: ev.diagnostics.slice(0, 5).map((d) => ({ code: d.code, message: d.message, hint: d.hint })),
        }),
        ok: ev.ok,
        diagnostics: ev.diagnostics.map((d) => d.code),
        evaluatedCode: code,
      };
    });

  const start = Date.now();
  const loop = await runToolLoop({
    client: args.client,
    system: `${args.skillMd}\n\n---\n\n${TOOL_PROTOCOL}`,
    user: prompt,
    model: args.model,
    maxTokens: args.maxTokens ?? 16000,
    temperature: args.temperature,
    maxCalls: args.maxCalls,
    tools: [EVALUATE_SCRIPT_TOOL],
    execute,
    onEvent: (e) => {
      if (e.type === 'tool') {
        events.push({ kind: 'tool_call', call: e.call, name: e.name, ok: e.ok, diagnostics: e.diagnostics });
      }
    },
  });

  const artifact = pickArtifact(loop.finalText, loop.lastEvaluatedCode);
  let finalEvaluate: Pick<EvaluateResult, 'ok' | 'diagnostics'>;
  if (artifact === null) {
    writeFileSync(outputScriptPath, '// (no script extracted from any attempt)');
    finalEvaluate = { ok: false, diagnostics: [{ code: 'eval.no-script-extracted', message: 'No script produced.' }] };
  } else {
    writeFileSync(outputScriptPath, artifact);
    const evaluateArtifact = args.evaluateArtifact ?? ((p: string) => evaluateScript(p));
    finalEvaluate = await evaluateArtifact(outputScriptPath);
  }

  return {
    events,
    status: artifact === null ? 'no_script' : finalEvaluate.ok ? 'passed' : 'gate_failed',
    attempts: Math.max(1, loop.toolCallCount),
    tokensIn: loop.tokensIn,
    tokensOut: loop.tokensOut,
    timeMs: Date.now() - start,
    firstFailureCode: finalEvaluate.ok ? undefined : finalEvaluate.diagnostics[0]?.code,
    outputScriptPath,
  };
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run eval/lib/toolGenerate.test.ts`
Expected: PASS (3 tests). Note: the test task dir must exist (`eval/tasks/bracket-holes`) — it does.

- [ ] **Step 6: Commit**

```bash
git add eval/lib/toolGenerate.ts eval/types.ts eval/lib.ts eval/lib/toolGenerate.test.ts
git commit -m "eval: add tool-driven generation with transcript events"
```

---

### Task 4: Sweep wiring (`--tool-loop`)

**Files:**
- Modify: `scripts/runMuseSweep.ts`
- Test: `scripts/runMuseSweep.test.ts`

- [ ] **Step 1: Extend the test**

Add to `scripts/runMuseSweep.test.ts`:

```ts
  it('parses tool-loop flags', () => {
    const cfg = parseSweepArgs(['--cases', 'stool', '--tool-loop', '--tool-max-calls', '5']);
    expect(cfg.toolLoop).toBe(true);
    expect(cfg.toolMaxCalls).toBe(5);
    expect(parseSweepArgs(['--cases', 'stool']).toolLoop).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/runMuseSweep.test.ts`
Expected: FAIL — fields missing.

- [ ] **Step 3: Implement**

In `scripts/runMuseSweep.ts`:

1. Import `generateCaseWithTools` from `../eval/lib/toolGenerate` and `ToolChatClient` from `../eval/lib/toolLoop`.
2. `SweepConfig` gains:
```ts
  toolLoop: boolean;
  toolMaxCalls: number;
```
3. `parseSweepArgs` returns:
```ts
    toolLoop: has('--tool-loop'),
    toolMaxCalls: Number(flagValue('--tool-max-calls') ?? 8),
```
(validate integer ≥ 1 like the other numeric flags)
4. Resume guard: compare `toolLoop` and `toolMaxCalls` too (include them in the mismatch message).
5. Envelope: add `toolLoop: cfg.toolLoop`, `toolMaxCalls: cfg.toolMaxCalls`.
6. In `runOneCase`, replace the generation block:
```ts
      const gen = cfg.toolLoop
        ? await generateCaseWithTools({
            taskDir,
            runDir: caseDir,
            client: agent as unknown as ToolChatClient,
            model: cfg.model,
            skillMd,
            startedAt: cfg.startedAt,
            maxCalls: cfg.toolMaxCalls,
            maxTokens: cfg.maxTokens,
            temperature: cfg.temperature,
          })
        : await generateCase({ /* existing args unchanged */ });
```
The rest of the block (state write, tokens, scoreCase) is unchanged.

- [ ] **Step 4: Run the test**

Run: `npx vitest run scripts/runMuseSweep.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint scripts/runMuseSweep.ts scripts/runMuseSweep.test.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/runMuseSweep.ts scripts/runMuseSweep.test.ts
git commit -m "eval: wire --tool-loop agent arm into the sweep"
```

---

### Task 5: Verification

- [ ] **Step 1: Targeted suites**

Run: `npx vitest run eval/lib eval/agentOpenAICompat.test.ts scripts/runMuseSweep.test.ts`
Expected: PASS.

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Live 2-case smoke**

```bash
set -a; source ~/.local/secrets/deepinfra.env; set +a
export KERNELCAD_BIN=./dist/cli/index.js MUSE_ROOT=~/projects/muse MUSE_PYTHON=~/projects/muse/.venv/bin/python
npx tsx scripts/runMuseSweep.ts --cases stool pen_holder --workers 2 --tool-loop --run-id smoke-tool-loop 2>&1 | tail -4
```

Expected: both cases complete; transcripts contain `## Tool call` sections; `tool-calls/` dirs have candidates; sandbox results present.

---

### Task 6: Subset A/B, runbook, PR

- [ ] **Step 1: Run the 58-case subset with the tool loop**

```bash
nohup npx tsx scripts/runMuseSweep.ts --cases $(tr '\n' ' ' < /tmp/opencode/ab-cases.txt) --workers 6 \
  --tool-loop --prompt-preset full --run-id ab-tools > /tmp/ab-tools.log 2>&1 &
```

Expected: ~58 cases; cap-induced `stopReason: cap` visible in transcripts; report the average tool calls and tokens.

- [ ] **Step 2: Compare vs `ab-full` (16/13/13)**

```bash
python3 - <<'EOF'
import json, os
cases=[c.strip() for c in open('/tmp/opencode/ab-cases.txt') if c.strip()]
def stats(run):
    sb=ov=judged=0
    for c in cases:
        p=f'{run}/cases/{c}/score.json'
        if not os.path.exists(p): continue
        d=json.load(open(p)); m=d.get('metrics',{})
        sb+= m.get('muse_sandbox_ok') is True
        ov+= m.get('muse_overlap_free') is True
        j=os.path.join(os.path.dirname(p),'judge.json')
        if os.path.exists(j) and not json.load(open(j)).get('forcedZero'): judged+=1
    return sb, ov, judged
for name,run in [('full(paired)','eval/runs/ab-full'),('tools','eval/runs/ab-tools')]:
    if os.path.isdir(run): print(name, stats(run))
EOF
```

- [ ] **Step 3: Record the result** in `kernelCAD-private/docs/process/running-muse-benchmark.md` §7 (arm table, tool-call/token stats, verdict) and commit.

- [ ] **Step 4: Push and update PR #741** with the tool-loop section and A/B outcome.

---

## Self-review notes

- Spec coverage: loop/client → Tasks 1–2; generation + transcript → Task 3; sweep arm → Task 4; verification → Task 5; measurement → Task 6.
- Type consistency: `ToolChatClient`/`ToolChatResult` defined in Task 1 and implemented in Task 2; `GenerateCaseResult` reused from `eval/runner.ts` so the state machine is untouched; `toolLoop`/`toolMaxCalls` added once in Task 4 and consumed in the same task.
- No placeholders: all code blocks complete; the only runtime-dependent values (smoke cases, subset file) are explicit commands.
