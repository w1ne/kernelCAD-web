// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { EvaluateResult, TranscriptEvent } from '../types';
import { evaluateScript } from '../oracle/kernelcad-client';
import { extractFencedScript } from '../lib';
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
  const fenced = extractFencedScript(finalText);
  if (fenced !== null && fenced.length > 0) return fenced;
  return lastEvaluatedCode ?? null;
}

// Strictness matters: extractScript falls back to the whole reply, so a truncated
// or prose reply would be written as the artifact. extractFencedScript accepts
// only a properly closed fenced block; otherwise fall back to the last code the
// model actually evaluated (verified), else no-script.

/**
 * Args for the tool arm. The returned `status` reflects `evaluateScript` (the
 * code-valid check) only — this arm does not run the interference gate; the
 * sweep's score path still runs the full harness against `output.kcad.ts`.
 */
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
  mkdirSync(callDir, { recursive: true });

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
  const fenced = extractFencedScript(loop.finalText);
  const hasFenced = fenced !== null && fenced.length > 0;
  const artifactSource: 'fence' | 'last-evaluated' | 'none' = hasFenced
    ? 'fence'
    : artifact !== null
      ? 'last-evaluated'
      : 'none';

  let finalEvaluate: Pick<EvaluateResult, 'ok' | 'diagnostics'>;
  if (artifact === null) {
    writeFileSync(outputScriptPath, '// (no script extracted from any attempt)');
    finalEvaluate = { ok: false, diagnostics: [{ code: 'eval.no-script-extracted', message: 'No script produced.' }] };
  } else {
    writeFileSync(outputScriptPath, artifact);
    const evaluateArtifact = args.evaluateArtifact ?? ((p: string) => evaluateScript(p));
    finalEvaluate = await evaluateArtifact(outputScriptPath);
  }

  const status: GenerateCaseResult['status'] =
    artifact === null ? 'no_script' : finalEvaluate.ok ? 'passed' : 'gate_failed';
  const firstFailureCode = finalEvaluate.ok ? undefined : finalEvaluate.diagnostics[0]?.code;

  writeFileSync(
    join(args.runDir, 'tool-loop.json'),
    JSON.stringify(
      {
        toolCallCount: loop.toolCallCount,
        stopReason: loop.stopReason,
        finishReason: loop.finishReason,
        tokensIn: loop.tokensIn,
        tokensOut: loop.tokensOut,
        artifactSource,
        status,
        firstFailureCode,
        maxCalls: args.maxCalls,
        startedAt: args.startedAt,
      },
      null,
      2,
    ),
  );

  return {
    events,
    status,
    attempts: 1,
    tokensIn: loop.tokensIn,
    tokensOut: loop.tokensOut,
    timeMs: Date.now() - start,
    firstFailureCode,
    outputScriptPath,
  };
}
