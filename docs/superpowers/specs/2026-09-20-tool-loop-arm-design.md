# Tool-Loop Agent Arm — design

Status: design approved 2026-09-20. Drives
`docs/superpowers/plans/2026-09-20-tool-loop-arm.md`.

## Evidence

Paired A/B on the 58-case attribution subset showed prompt compaction hurts
(full 16/58 sandbox vs v2_lean 12, v1 10). Failure classes remain model
authoring errors (ParamRef math, wrong args, no-op booleans). The sweep's
generate→gate→repair loop only feeds diagnostics *after* a failed attempt and
never lets the model verify its own code. The real product exposes
`evaluate_script` as an MCP tool; a probe confirmed DeepSeek-V4.1-Flash on
DeepInfra supports OpenAI-style tool calls (`finish_reason: tool_calls`,
well-formed arguments).

## Goal

Add a minimal one-tool agent arm — `evaluate_script({code})` — to the sweep,
so the model can iterate against real diagnostics before submitting, and
measure it on the same 58-case subset against the paired `full` baseline
(16/58 sandbox). Adopt if sandbox pass exceeds the baseline.

## Non-goals

- No other tools (inspect/list_features/etc.) in this iteration.
- No change to the default repair loop; the tool arm is opt-in (`--tool-loop`).
- No frontier-driver run here.

## Design

### Tool client

`eval/agentOpenAICompat.ts` gains `chatWithTools()` (reuses the private
`request` retry path) implementing a new interface in `eval/lib/toolLoop.ts`:

```ts
export interface ToolSpec { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }
export interface ToolChatMessage { role: 'user' | 'assistant' | 'tool'; content: string; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>; tool_call_id?: string }
export interface ToolChatResult { text: string; toolCalls: Array<{ id: string; name: string; arguments: string }>; finishReason: string; tokensIn: number; tokensOut: number }
export interface ToolChatClient { chatWithTools(args: { system: string; messages: ToolChatMessage[]; tools: ToolSpec[]; model: string; max_tokens: number; temperature?: number }): Promise<ToolChatResult> }
```

### Loop

`runToolLoop({client, system, user, model, maxTokens, temperature, maxCalls,
execute, onEvent})`:

- append user message; repeat up to `maxCalls`:
  - call `chatWithTools`; append the assistant message (text + tool_calls);
  - no tool calls → stop `final` with the text;
  - execute each call (arguments JSON-parsed; parse failure is returned to the
    model as `{"error": "invalid arguments JSON"}`), append a `tool` message
    with the JSON result; remember `lastEvaluatedCode` for `evaluate_script`.
- on cap: stop `cap`, `finalText` = last assistant text.
- returns `{finalText, toolCallCount, tokensIn, tokensOut, stopReason,
  lastEvaluatedCode, messages}`.

### Tool

`EVALUATE_SCRIPT_TOOL` — `code` (string, required). Execute writes the candidate
to `<caseDir>/tool-calls/call-<n>.kcad.ts` and runs the existing
`evaluateScript`; returns `{ok, featureCount, diagnostics: first 5 of
{code,message,hint}}`.

### Sweep integration

- Flags: `--tool-loop`, `--tool-max-calls <n>` (default 8).
- `eval/lib/toolGenerate.ts`: `generateCaseWithTools(args): Promise<GenerateCaseResult>`
  — builds `system = skillMd + '\n\n---\n\n' + TOOL_PROTOCOL` (protocol text
  instructs: call `evaluate_script` to check candidates, iterate until clean,
  then return the final script in one fenced block); runs the loop; artifact =
  fenced block via `extractScript`, else `lastEvaluatedCode`, else the
  no-script placeholder; writes `output.kcad.ts`; evaluates the artifact once
  to set `status`; emits transcript events.
- `scripts/runMuseSweep.ts`: when `--tool-loop`, call `generateCaseWithTools`
  instead of `generateCase`; the rest of the state machine/score path is
  unchanged. `run.json` records `toolLoop` and `toolMaxCalls`; resume guard
  compares them too.
- Transcript: new event `{kind:'tool_call', call, name, codeChars, ok,
  diagnostics: string[]}` rendered in `eval/lib.ts`.

## Measurement

58-case subset, `--tool-loop --prompt-preset full`, vs `ab-full` (16/13/13).
Collect sandbox/overlap/judged plus avg tool calls, tokens, and stop reasons
(from per-case transcripts/`run.json` outcomes). Decision: adopt if sandbox >
16/58; report the negative result otherwise.

## Risks

- Non-convergence: capped calls + last-evaluated-code fallback (the product
  behavior is "whatever the model last verified").
- Protocol ambiguity: the fenced-block instruction plus fallback covers it.
- Cost: up to ~8 calls × ~50k-token context per case (~5–8× tokens); flash
  pricing keeps the subset under a few dollars.
- Fairness: the arm uses more inference per case by design — it models the
  product's iterative-verification surface, not a one-shot comparison; the
  runbook will say so.
