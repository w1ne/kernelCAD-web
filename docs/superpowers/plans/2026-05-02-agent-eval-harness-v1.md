# Agent Eval Harness v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the smallest agent-eval harness that closes the Karpathy loop — author tweaks SKILL.md / a tool description / a HINTS entry, runs `npm run eval`, reads a transcript, sees what changed, iterates.

**Architecture:** New `eval/` directory at repo root. One TS entry point (`eval/run.ts`) orchestrates: load task → drive Anthropic Messages API with SKILL.md as cached system prompt → extract `.kcad.ts` from response → subprocess `kernelcad evaluate --json` → retry up to 3x on diagnostics → run task harness → write `runs/<ts>/<task>/{transcript.md, output.kcad.ts, score.json}`. Pure helpers extracted to `eval/lib.ts` for unit testing. Subprocess wrapper in `eval/oracle/kernelcad-client.ts`. Mock agent client enables byte-identical CI replay against a committed golden fixture.

**Tech Stack:** TypeScript 5.9, Node 22+ ESM, Vitest, `@anthropic-ai/sdk` (new dep, with prompt caching on the SKILL.md system prompt), `kernelcad` CLI on PATH (or `KERNELCAD_BIN` env override for local dev), `npx tsx` to run TS directly without a build step.

**Spec:** `docs/superpowers/specs/2026-05-02-agent-eval-harness-design.md`

---

## File Structure

```
kernelCAD-web/
├── eval/
│   ├── .gitignore                          # ignores runs/* except runs/golden-*/
│   ├── run.ts                              # orchestrator: CLI args, main loop, side effects
│   ├── lib.ts                              # pure helpers (extractScript, formatDiagnostics, computeScore, renderTranscript)
│   ├── lib.test.ts                         # vitest unit tests for lib.ts
│   ├── types.ts                            # shared types (HarnessResult, Diagnostic, Score, TranscriptEvent, AgentClient)
│   ├── agent.ts                            # AgentClient interface + AnthropicAgentClient + MockAgentClient
│   ├── agent.test.ts                       # mock-client tests
│   ├── runner.ts                           # runTask function (testable end-to-end with mock agent)
│   ├── runner.test.ts                      # integration test: runTask with MockAgentClient
│   ├── oracle/
│   │   ├── kernelcad-client.ts             # evaluateScript + getShapeInfo (subprocess)
│   │   └── kernelcad-client.test.ts        # smoke test against real kernelcad CLI (skips if absent)
│   ├── tasks/
│   │   └── bracket-holes/
│   │       ├── prompt.md                   # what the agent reads
│   │       ├── harness.ts                  # default-exports harness function
│   │       └── solution-expert.kcad.ts     # gold reference; harness must score 100% on this
│   └── runs/
│       └── golden-2026-05-02-bracket-holes/  # CI fixture
│           ├── fixture.json                # canned MockAgentClient response sequence
│           ├── transcript.md               # expected transcript output (byte-for-byte)
│           ├── output.kcad.ts              # expected agent script
│           └── score.json                  # expected score
├── package.json                            # MODIFY: add @anthropic-ai/sdk, add eval script
└── vitest.config.ts                        # MODIFY: include eval/**/*.test.ts
```

---

## Task 1: Project plumbing — deps, scripts, gitignore

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Create: `eval/.gitignore`

- [ ] **Step 1: Install Anthropic SDK**

```bash
cd ~/projects/kernelCAD-web
npm install @anthropic-ai/sdk
```

Expected: a new entry under `dependencies` in `package.json`, e.g. `"@anthropic-ai/sdk": "^0.x.y"`. Verify:

```bash
node -e "console.log(require('./package.json').dependencies['@anthropic-ai/sdk'])"
```

Expected: prints a version string, not `undefined`.

- [ ] **Step 2: Add `eval` script to package.json**

Edit `package.json`. In the `"scripts"` block, add (alphabetical order, place after `"dev"` and before `"lint"`):

```json
    "eval": "npx tsx eval/run.ts",
```

Verify:

```bash
node -e "console.log(require('./package.json').scripts.eval)"
```

Expected: prints `npx tsx eval/run.ts`.

- [ ] **Step 3: Add `eval/**/*.test.ts` to vitest include**

Edit `vitest.config.ts`. Find the `include:` array and add `'eval/**/*.test.ts'` as the last entry. The full block should read:

```typescript
        include: [
            'src/**/*.test.{ts,tsx}',
            'src/**/*.spec.{ts,tsx}',
            'tests/unit/**/*.test.{ts,tsx}',
            'tests/e2e/**/*.test.ts',
            'tests/integration/**/*.test.ts',
            'eval/**/*.test.ts',
        ],
```

- [ ] **Step 4: Create `eval/.gitignore`**

```bash
mkdir -p eval
```

Create `eval/.gitignore` with:

```
# Live runs are not committed; only golden fixtures (runs/golden-*) are.
runs/*
!runs/golden-*/
```

- [ ] **Step 5: Verify the empty eval dir is recognised**

```bash
ls -la eval/
```

Expected: shows `.gitignore`. The directory is otherwise empty.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts eval/.gitignore
git commit -m "feat(eval): add @anthropic-ai/sdk, npm run eval script, vitest include"
```

---

## Task 2: Shared types

**Files:**
- Create: `eval/types.ts`

- [ ] **Step 1: Write `eval/types.ts`**

Create `eval/types.ts` with the full content:

```typescript
// Shared types for the eval harness. No runtime code here.

export interface Diagnostic {
  code: string;
  message: string;
  hint?: string;
  featureId?: string;
  // Whatever else `kernelcad evaluate --json` returns; we use these fields
  // for retry feedback and transcript rendering.
}

export interface EvaluateResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  featureCount?: number;
}

export interface ShapeInfo {
  volume: number;
  surfaceArea: number;
  bbox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface HarnessResult {
  gates: Record<string, boolean>;
  scored: Record<string, boolean>;
}

export interface Score {
  gates: Record<string, boolean>;
  scored: Record<string, boolean>;
  gate_pass: boolean;
  score: number; // 0..1
  attempts: number; // 1..3
  tokens: { input: number; output: number; total: number };
  time_ms: number;
}

// Transcript events — captured during a run, rendered to markdown afterward.
export type TranscriptEvent =
  | { kind: 'system_prompt'; chars: number } // we don't dump the full SKILL.md into the transcript; just record its size
  | { kind: 'user_prompt'; content: string }
  | {
      kind: 'turn';
      attempt: number;
      assistant_text: string;
      script_extracted: string | null;
      tokens_in: number;
      tokens_out: number;
      ms: number;
    }
  | { kind: 'evaluate'; attempt: number; ok: boolean; diagnostics: Diagnostic[] }
  | { kind: 'score'; gates: Record<string, boolean>; scored: Record<string, boolean> };

// Agent client abstraction — lets us swap in a MockAgentClient for tests.
export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  text: string;
  tokens_in: number;
  tokens_out: number;
}

export interface AgentClient {
  generate(opts: {
    system: string;
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
  }): Promise<AgentResponse>;
}

// Aggregate result for the summary table.
export interface TaskResult {
  task: string;
  score: Score | null; // null ⇒ infra_error
  infra_error?: string; // when set, this task is excluded from the summary aggregate
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit -p tsconfig.node.json eval/types.ts 2>&1 || npx tsc --noEmit eval/types.ts
```

The repo's tsconfig.node.json is for `vite.config.ts` only; for our eval files we want a typecheck that uses the same `strict` settings. The simplest: `npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --allowImportingTsExtensions eval/types.ts`. Expected: no output (success).

- [ ] **Step 3: Commit**

```bash
git add eval/types.ts
git commit -m "feat(eval): shared types (Diagnostic, Score, TranscriptEvent, AgentClient)"
```

---

## Task 3: `extractScript` pure helper (TDD)

**Files:**
- Create: `eval/lib.ts`
- Create: `eval/lib.test.ts`

`extractScript` finds the first fenced code block in a model response with language tag `typescript`, `ts`, `kcad`, or empty. If no fence, returns the whole text. Returns `null` if input is empty.

- [ ] **Step 1: Write the failing test**

Create `eval/lib.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractScript } from './lib';

describe('extractScript', () => {
  it('extracts a typescript-fenced block', () => {
    const input = 'Here is the script:\n```typescript\nreturn box(10, 10, 10);\n```\nDone.';
    expect(extractScript(input)).toBe('return box(10, 10, 10);');
  });

  it('extracts a ts-fenced block', () => {
    const input = '```ts\nreturn box(1,2,3);\n```';
    expect(extractScript(input)).toBe('return box(1,2,3);');
  });

  it('extracts a kcad-fenced block', () => {
    const input = '```kcad\nreturn sphere(5);\n```';
    expect(extractScript(input)).toBe('return sphere(5);');
  });

  it('extracts a fenced block with no language tag', () => {
    const input = '```\nreturn cylinder(10, 5);\n```';
    expect(extractScript(input)).toBe('return cylinder(10, 5);');
  });

  it('uses the first fence when multiple are present', () => {
    const input = '```typescript\nreturn box(1,1,1);\n```\nNo wait:\n```typescript\nreturn box(2,2,2);\n```';
    expect(extractScript(input)).toBe('return box(1,1,1);');
  });

  it('returns the whole text when no fence is present', () => {
    expect(extractScript('return box(3,3,3);')).toBe('return box(3,3,3);');
  });

  it('returns null on empty input', () => {
    expect(extractScript('')).toBeNull();
    expect(extractScript('   \n\n  ')).toBeNull();
  });

  it('ignores fences with unrecognised language tags', () => {
    const input = '```python\nprint("nope")\n```\n```typescript\nreturn box(1,1,1);\n```';
    expect(extractScript(input)).toBe('return box(1,1,1);');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -20
```

Expected: FAIL — module `./lib` not found.

- [ ] **Step 3: Write minimal `extractScript` implementation**

Create `eval/lib.ts`:

```typescript
const FENCED_LANGS = ['typescript', 'ts', 'kcad', ''];

export function extractScript(text: string): string | null {
  if (!text || !text.trim()) return null;

  // Match fenced blocks: ``` followed by optional language tag, newline, body, then ```
  const fenceRegex = /```(\w*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(text)) !== null) {
    const lang = (m[1] ?? '').toLowerCase();
    if (FENCED_LANGS.includes(lang)) {
      return m[2].trim();
    }
  }

  // No matching fence — return the whole text trimmed.
  return text.trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -15
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add eval/lib.ts eval/lib.test.ts
git commit -m "feat(eval): extractScript helper for fenced code block extraction"
```

---

## Task 4: `formatDiagnostics` pure helper (TDD)

**Files:**
- Modify: `eval/lib.ts`
- Modify: `eval/lib.test.ts`

`formatDiagnostics` renders the diagnostics from `kernelcad evaluate --json` into a markdown bullet list to feed back to the agent on retry. Code, message, optional hint, optional feature ID.

- [ ] **Step 1: Write failing tests**

Append to `eval/lib.test.ts`:

```typescript
import { formatDiagnostics } from './lib';
import type { Diagnostic } from './types';

describe('formatDiagnostics', () => {
  it('renders a single diagnostic with code and message', () => {
    const diags: Diagnostic[] = [
      { code: 'feature.fillet.failed', message: 'OCCT could not apply that fillet.' },
    ];
    expect(formatDiagnostics(diags)).toBe(
      '- `feature.fillet.failed` — OCCT could not apply that fillet.',
    );
  });

  it('appends hint on a new indented line when present', () => {
    const diags: Diagnostic[] = [
      {
        code: 'feature.edge-feature.face-ref-not-resolvable',
        message: 'Canonical face refs only work on un-transformed primitives.',
        hint: 'Apply transforms after the fillet/chamfer.',
      },
    ];
    expect(formatDiagnostics(diags)).toBe(
      '- `feature.edge-feature.face-ref-not-resolvable` — Canonical face refs only work on un-transformed primitives.\n  Hint: Apply transforms after the fillet/chamfer.',
    );
  });

  it('appends feature id when present', () => {
    const diags: Diagnostic[] = [
      { code: 'recompute.input.missing', message: 'Upstream feature failed.', featureId: 'fillet_3' },
    ];
    expect(formatDiagnostics(diags)).toBe(
      '- `recompute.input.missing` — Upstream feature failed. (feature: fillet_3)',
    );
  });

  it('joins multiple diagnostics with newlines', () => {
    const diags: Diagnostic[] = [
      { code: 'a', message: 'A.' },
      { code: 'b', message: 'B.' },
    ];
    expect(formatDiagnostics(diags)).toBe('- `a` — A.\n- `b` — B.');
  });

  it('returns empty string for empty input', () => {
    expect(formatDiagnostics([])).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -15
```

Expected: FAIL — `formatDiagnostics` not exported.

- [ ] **Step 3: Implement `formatDiagnostics` in `eval/lib.ts`**

Append to `eval/lib.ts`:

```typescript
import type { Diagnostic } from './types';

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics
    .map((d) => {
      let line = `- \`${d.code}\` — ${d.message}`;
      if (d.featureId) line += ` (feature: ${d.featureId})`;
      if (d.hint) line += `\n  Hint: ${d.hint}`;
      return line;
    })
    .join('\n');
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -15
```

Expected: PASS, 13 tests total.

- [ ] **Step 5: Commit**

```bash
git add eval/lib.ts eval/lib.test.ts
git commit -m "feat(eval): formatDiagnostics helper for retry feedback"
```

---

## Task 5: `computeScore` pure helper (TDD)

**Files:**
- Modify: `eval/lib.ts`
- Modify: `eval/lib.test.ts`

`computeScore` takes a `HarnessResult` plus run metadata and produces a `Score`. Gate-then-score: if any gate is false, score = 0. Otherwise score = passed_scored / total_scored. Empty `scored` ⇒ if all gates pass, score = 1.0 (gates-only success).

- [ ] **Step 1: Write failing tests**

Append to `eval/lib.test.ts`:

```typescript
import { computeScore } from './lib';

describe('computeScore', () => {
  const meta = { attempts: 1, tokens_in: 100, tokens_out: 50, time_ms: 5000 };

  it('returns 0 when any gate fails', () => {
    const s = computeScore(
      { gates: { a: true, b: false }, scored: { x: true, y: true } },
      meta,
    );
    expect(s.gate_pass).toBe(false);
    expect(s.score).toBe(0);
  });

  it('returns passed/total when all gates pass and scored has entries', () => {
    const s = computeScore(
      { gates: { a: true }, scored: { x: true, y: true, z: false } },
      meta,
    );
    expect(s.gate_pass).toBe(true);
    expect(s.score).toBeCloseTo(2 / 3);
  });

  it('returns 1.0 when all gates pass and scored is empty (gates-only success)', () => {
    const s = computeScore({ gates: { a: true, b: true }, scored: {} }, meta);
    expect(s.gate_pass).toBe(true);
    expect(s.score).toBe(1);
  });

  it('returns 0 when gates is empty (no gates ⇒ vacuously true ⇒ scored math applies)', () => {
    // Empty gates: no false gates, so gate_pass = true; scored carries the weight.
    const s = computeScore({ gates: {}, scored: { x: true } }, meta);
    expect(s.gate_pass).toBe(true);
    expect(s.score).toBe(1);
  });

  it('passes through metadata', () => {
    const s = computeScore({ gates: { a: true }, scored: {} }, {
      attempts: 3,
      tokens_in: 1000,
      tokens_out: 500,
      time_ms: 30000,
    });
    expect(s.attempts).toBe(3);
    expect(s.tokens).toEqual({ input: 1000, output: 500, total: 1500 });
    expect(s.time_ms).toBe(30000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -15
```

Expected: FAIL — `computeScore` not exported.

- [ ] **Step 3: Implement `computeScore`**

Append to `eval/lib.ts`:

```typescript
import type { HarnessResult, Score } from './types';

export function computeScore(
  result: HarnessResult,
  meta: { attempts: number; tokens_in: number; tokens_out: number; time_ms: number },
): Score {
  const gateValues = Object.values(result.gates);
  const gate_pass = gateValues.every((v) => v);

  let score: number;
  if (!gate_pass) {
    score = 0;
  } else {
    const scoredValues = Object.values(result.scored);
    const total = scoredValues.length;
    if (total === 0) {
      score = 1; // gates-only success
    } else {
      const passed = scoredValues.filter((v) => v).length;
      score = passed / total;
    }
  }

  return {
    gates: result.gates,
    scored: result.scored,
    gate_pass,
    score,
    attempts: meta.attempts,
    tokens: { input: meta.tokens_in, output: meta.tokens_out, total: meta.tokens_in + meta.tokens_out },
    time_ms: meta.time_ms,
  };
}
```

Note: the imports in `lib.ts` should be consolidated at the top of the file. After this step, `eval/lib.ts` should have a single `import type { Diagnostic, HarnessResult, Score } from './types';` at the top.

- [ ] **Step 4: Consolidate imports + run tests**

Open `eval/lib.ts`, move all `import type` lines to the top of the file (just below any leading comments). The file should look like:

```typescript
import type { Diagnostic, HarnessResult, Score } from './types';

const FENCED_LANGS = ['typescript', 'ts', 'kcad', ''];

export function extractScript(text: string): string | null {
  // ... (existing implementation)
}

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  // ... (existing implementation)
}

export function computeScore(/* ... */): Score {
  // ... (existing implementation)
}
```

Then:

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -15
```

Expected: PASS, 18 tests total.

- [ ] **Step 5: Commit**

```bash
git add eval/lib.ts eval/lib.test.ts
git commit -m "feat(eval): computeScore helper (gate-then-partial-credit math)"
```

---

## Task 6: `renderTranscript` pure helper (TDD)

**Files:**
- Modify: `eval/lib.ts`
- Modify: `eval/lib.test.ts`

`renderTranscript` takes the recorded `TranscriptEvent[]`, the task name, the model id, the wall-clock start time, and the final `Score`. Returns a markdown string matching the format in the spec's "Transcript format" section.

- [ ] **Step 1: Write failing tests**

Append to `eval/lib.test.ts`:

```typescript
import { renderTranscript } from './lib';
import type { TranscriptEvent, Score } from './types';

describe('renderTranscript', () => {
  it('renders a successful single-turn run', () => {
    const events: TranscriptEvent[] = [
      { kind: 'system_prompt', chars: 22000 },
      { kind: 'user_prompt', content: 'Build an L-bracket.' },
      {
        kind: 'turn',
        attempt: 1,
        assistant_text: "Here's the bracket:\n```typescript\nreturn box(50, 30, 10);\n```",
        script_extracted: 'return box(50, 30, 10);',
        tokens_in: 4231,
        tokens_out: 1892,
        ms: 6300,
      },
      { kind: 'evaluate', attempt: 1, ok: true, diagnostics: [] },
      { kind: 'score', gates: { 'evaluates clean': true }, scored: { 'L-shape': true } },
    ];
    const score: Score = {
      gates: { 'evaluates clean': true },
      scored: { 'L-shape': true },
      gate_pass: true,
      score: 1,
      attempts: 1,
      tokens: { input: 4231, output: 1892, total: 6123 },
      time_ms: 6300,
    };
    const md = renderTranscript({
      task: 'bracket-holes',
      model: 'claude-sonnet-4-6',
      started_at: '2026-05-02T14-32-01',
      events,
      score,
    });

    expect(md).toContain('# bracket-holes — claude-sonnet-4-6 — 2026-05-02T14-32-01');
    expect(md).toContain('## Prompt');
    expect(md).toContain('> Build an L-bracket.');
    expect(md).toContain('## Turn 1 (in: 4,231 tok, out: 1,892 tok, 6.3s)');
    expect(md).toContain('## Evaluate (attempt 1) — OK');
    expect(md).toContain('## Score');
    expect(md).toContain('- Gates: ✓ evaluates clean');
    expect(md).toContain('- Scored: 1/1 — 100%');
    expect(md).toContain('- Tokens: 4,231 in / 1,892 out / 6,123 total');
    expect(md).toContain('- Time: 6.3s');
    expect(md).toContain('- Attempts: 1');
  });

  it('renders a failed-then-retried run with diagnostics', () => {
    const events: TranscriptEvent[] = [
      { kind: 'system_prompt', chars: 22000 },
      { kind: 'user_prompt', content: 'Build a thing.' },
      {
        kind: 'turn',
        attempt: 1,
        assistant_text: '```typescript\nreturn box(20,20,20).translate(5,0,0).fillet(2, { face: "top" });\n```',
        script_extracted: 'return box(20,20,20).translate(5,0,0).fillet(2, { face: "top" });',
        tokens_in: 4000,
        tokens_out: 50,
        ms: 3000,
      },
      {
        kind: 'evaluate',
        attempt: 1,
        ok: false,
        diagnostics: [
          {
            code: 'feature.edge-feature.face-ref-not-resolvable',
            message: 'Canonical face refs only work on un-transformed primitives.',
            hint: 'Apply transforms after the fillet/chamfer.',
          },
        ],
      },
      {
        kind: 'turn',
        attempt: 2,
        assistant_text: '```typescript\nreturn box(20,20,20).fillet(2, { face: "top" }).translate(5,0,0);\n```',
        script_extracted: 'return box(20,20,20).fillet(2, { face: "top" }).translate(5,0,0);',
        tokens_in: 4500,
        tokens_out: 60,
        ms: 3500,
      },
      { kind: 'evaluate', attempt: 2, ok: true, diagnostics: [] },
      { kind: 'score', gates: { 'evaluates clean': true }, scored: {} },
    ];
    const score: Score = {
      gates: { 'evaluates clean': true },
      scored: {},
      gate_pass: true,
      score: 1,
      attempts: 2,
      tokens: { input: 8500, output: 110, total: 8610 },
      time_ms: 6500,
    };
    const md = renderTranscript({
      task: 't',
      model: 'm',
      started_at: 's',
      events,
      score,
    });

    expect(md).toContain('## Evaluate (attempt 1) — FAIL');
    expect(md).toContain('- `feature.edge-feature.face-ref-not-resolvable`');
    expect(md).toContain('Hint: Apply transforms after the fillet/chamfer.');
    expect(md).toContain('## Turn 2 (in: 4,500 tok, out: 60 tok, 3.5s)');
    expect(md).toContain('## Evaluate (attempt 2) — OK');
    expect(md).toContain('- Attempts: 2');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -15
```

Expected: FAIL — `renderTranscript` not exported.

- [ ] **Step 3: Implement `renderTranscript`**

Append to `eval/lib.ts`. Update the top-of-file import to include `TranscriptEvent`:

```typescript
import type { Diagnostic, HarnessResult, Score, TranscriptEvent } from './types';
```

Add at the bottom:

```typescript
export interface RenderTranscriptArgs {
  task: string;
  model: string;
  started_at: string;
  events: TranscriptEvent[];
  score: Score;
}

const formatNum = (n: number) => n.toLocaleString('en-US');
const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function renderTranscript(args: RenderTranscriptArgs): string {
  const lines: string[] = [];
  lines.push(`# ${args.task} — ${args.model} — ${args.started_at}`);
  lines.push('');

  for (const ev of args.events) {
    if (ev.kind === 'system_prompt') {
      // We deliberately do not dump the full SKILL.md into the transcript;
      // the chars count is enough for forensics.
      continue;
    }
    if (ev.kind === 'user_prompt') {
      lines.push('## Prompt');
      for (const line of ev.content.split('\n')) {
        lines.push(`> ${line}`);
      }
      lines.push('');
    } else if (ev.kind === 'turn') {
      lines.push(
        `## Turn ${ev.attempt} (in: ${formatNum(ev.tokens_in)} tok, out: ${formatNum(
          ev.tokens_out,
        )} tok, ${formatSeconds(ev.ms)})`,
      );
      lines.push('');
      lines.push(ev.assistant_text);
      lines.push('');
    } else if (ev.kind === 'evaluate') {
      const verdict = ev.ok ? 'OK' : 'FAIL';
      lines.push(`## Evaluate (attempt ${ev.attempt}) — ${verdict}`);
      if (ev.diagnostics.length > 0) {
        lines.push(formatDiagnostics(ev.diagnostics));
      }
      lines.push('');
    } else if (ev.kind === 'score') {
      // Score block is rendered at end from the score arg, not from this event.
    }
  }

  // Final score block.
  lines.push('## Score');
  const gatesLine = Object.entries(args.score.gates)
    .map(([n, v]) => `${v ? '✓' : '✗'} ${n}`)
    .join(', ');
  lines.push(`- Gates: ${gatesLine || '(none)'}`);

  const scoredEntries = Object.entries(args.score.scored);
  const passed = scoredEntries.filter(([, v]) => v).length;
  const total = scoredEntries.length;
  const pct = total === 0 ? (args.score.gate_pass ? 100 : 0) : Math.round((passed / total) * 100);
  lines.push(`- Scored: ${passed}/${total} — ${pct}%`);

  const t = args.score.tokens;
  lines.push(`- Tokens: ${formatNum(t.input)} in / ${formatNum(t.output)} out / ${formatNum(t.total)} total`);
  lines.push(`- Time: ${formatSeconds(args.score.time_ms)}`);
  lines.push(`- Attempts: ${args.score.attempts}`);

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- eval/lib.test.ts 2>&1 | tail -20
```

Expected: PASS, 20 tests total.

- [ ] **Step 5: Commit**

```bash
git add eval/lib.ts eval/lib.test.ts
git commit -m "feat(eval): renderTranscript helper for markdown event log"
```

---

## Task 7: `kernelcad-client.ts` — subprocess wrapper

**Files:**
- Create: `eval/oracle/kernelcad-client.ts`
- Create: `eval/oracle/kernelcad-client.test.ts`

Wraps two CLI/MCP calls. `KERNELCAD_BIN` env var overrides the default `kernelcad` PATH lookup (test setups use this to point at `./dist/cli/index.js`).

- [ ] **Step 1: Write the implementation**

Create `eval/oracle/kernelcad-client.ts`:

```typescript
import { spawn } from 'node:child_process';
import type { EvaluateResult, ShapeInfo } from '../types';

function getBin(): { cmd: string; baseArgs: string[] } {
  const override = process.env.KERNELCAD_BIN;
  if (override) {
    // If the override ends in .js, we run it via node.
    if (override.endsWith('.js')) {
      return { cmd: 'node', baseArgs: [override] };
    }
    return { cmd: override, baseArgs: [] };
  }
  return { cmd: 'kernelcad', baseArgs: [] };
}

async function runOnce(args: string[], stdin?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  const { cmd, baseArgs } = getBin();
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, [...baseArgs, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

export async function evaluateScript(scriptPath: string): Promise<EvaluateResult> {
  const r = await runOnce(['evaluate', '--json', scriptPath]);
  // The CLI may print the JSON to stdout regardless of exit code; try to parse.
  try {
    const parsed = JSON.parse(r.stdout);
    return {
      ok: !!parsed.ok && Array.isArray(parsed.diagnostics) && parsed.diagnostics.length === 0,
      diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [],
      featureCount: parsed.featureCount,
    };
  } catch {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'cli.script.exception',
          message: `kernelcad evaluate exited with code ${r.code}: ${r.stderr.trim() || r.stdout.trim() || '(no output)'}`,
        },
      ],
    };
  }
}

export async function getShapeInfo(scriptPath: string): Promise<ShapeInfo> {
  // One-shot MCP call: open the server, send a single tools/call request, read response, kill.
  // Per MCP stdio transport, requests are JSON-RPC newline-delimited.
  const initialize = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'kernelcad-eval', version: '0.1.0' } },
  });
  const initialized = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const callTool = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'get_shape_info', arguments: { file: scriptPath } },
  });
  const stdin = `${initialize}\n${initialized}\n${callTool}\n`;

  const r = await runOnce(['mcp'], stdin);
  // Parse newline-delimited JSON responses; find the one with id === 2.
  const lines = r.stdout.split('\n').filter((l) => l.trim().length > 0);
  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      (parsed as { id: unknown }).id === 2 &&
      'result' in parsed
    ) {
      // MCP tool result is a content array; the first item is text JSON for our tools.
      const result = (parsed as { result: { content?: Array<{ type: string; text?: string }> } }).result;
      const text = result.content?.[0]?.text;
      if (typeof text !== 'string') {
        throw new Error(`get_shape_info returned no text content: ${JSON.stringify(result)}`);
      }
      const shapeJson = JSON.parse(text);
      if (
        typeof shapeJson.volume !== 'number' ||
        typeof shapeJson.surfaceArea !== 'number' ||
        !shapeJson.bbox ||
        !Array.isArray(shapeJson.bbox.min) ||
        !Array.isArray(shapeJson.bbox.max)
      ) {
        throw new Error(`get_shape_info returned unexpected shape: ${text}`);
      }
      return {
        volume: shapeJson.volume,
        surfaceArea: shapeJson.surfaceArea,
        bbox: { min: shapeJson.bbox.min, max: shapeJson.bbox.max },
      };
    }
  }
  throw new Error(
    `get_shape_info: no response with id=2 in stdout. stdout=${r.stdout.slice(0, 500)} stderr=${r.stderr.slice(0, 500)}`,
  );
}

export async function isKernelcadAvailable(): Promise<boolean> {
  try {
    const r = await runOnce(['--version']);
    return r.code === 0;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Write the smoke test**

Create `eval/oracle/kernelcad-client.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateScript, getShapeInfo, isKernelcadAvailable } from './kernelcad-client';

let kernelcadAvailable = false;
let tmpDir: string;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
  if (!kernelcadAvailable) {
    console.warn(
      'kernelcad CLI not found on PATH and KERNELCAD_BIN not set — skipping kernelcad-client smoke tests. Run `npm run build:cli` and set KERNELCAD_BIN=./dist/cli/index.js, or `npm link`.',
    );
  }
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-client-test-'));
});

describe('kernelcad-client', () => {
  it.runIf(() => kernelcadAvailable)('evaluateScript returns ok=true for a valid script', async () => {
    const path = join(tmpDir, 'box.kcad.ts');
    writeFileSync(path, 'return box(10, 20, 30);');
    const r = await evaluateScript(path);
    expect(r.ok).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it.runIf(() => kernelcadAvailable)('evaluateScript returns ok=false with diagnostics for a broken script', async () => {
    const path = join(tmpDir, 'broken.kcad.ts');
    // Sphere with face filter — should fail per SKILL.md ("Sphere with any { face } filter → error.")
    writeFileSync(path, 'return sphere(5).fillet(1, { face: "top" });');
    const r = await evaluateScript(path);
    expect(r.ok).toBe(false);
    expect(r.diagnostics.length).toBeGreaterThan(0);
    expect(r.diagnostics[0].code).toMatch(/^feature\./);
  });

  it.runIf(() => kernelcadAvailable)('getShapeInfo returns volume and bbox for a known box', async () => {
    const path = join(tmpDir, 'box-known.kcad.ts');
    writeFileSync(path, 'return box(10, 20, 30);');
    const info = await getShapeInfo(path);
    expect(info.volume).toBeCloseTo(6000, 0); // 10 * 20 * 30
    expect(info.bbox.min).toEqual([0, 0, 0]);
    expect(info.bbox.max).toEqual([10, 20, 30]);
  });
});
```

The `it.runIf` predicate is Vitest 4.x syntax (the repo is on `vitest@^4.0.18`). If for any reason a runner is on an older minor, `it.skipIf(() => !kernelcadAvailable)` is the equivalent.

- [ ] **Step 3: Build the CLI so the test can find it**

```bash
npm run build:cli 2>&1 | tail -3
```

Expected: prints `dist/cli/index.js built`.

- [ ] **Step 4: Run the smoke tests with the local build**

```bash
KERNELCAD_BIN=./dist/cli/index.js npm test -- eval/oracle/kernelcad-client.test.ts 2>&1 | tail -20
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Verify graceful skip when kernelcad isn't available**

```bash
PATH=/usr/bin:/bin npm test -- eval/oracle/kernelcad-client.test.ts 2>&1 | tail -10
```

Expected: tests are skipped with the warning message printed once. Test run reports PASS with 0 tests run (or 3 skipped, depending on vitest reporter).

- [ ] **Step 6: Commit**

```bash
git add eval/oracle/
git commit -m "feat(eval): kernelcad-client wrapper (evaluateScript + getShapeInfo)"
```

---

## Task 8: bracket-holes seed task

**Files:**
- Create: `eval/tasks/bracket-holes/prompt.md`
- Create: `eval/tasks/bracket-holes/solution-expert.kcad.ts`
- Create: `eval/tasks/bracket-holes/harness.ts`

The task content. The expert solution is the rubric sanity-check: harness called against it must score 100%.

- [ ] **Step 1: Write the prompt**

Create `eval/tasks/bracket-holes/prompt.md`:

```md
# Task: Parametric L-Bracket

Build an L-shaped mounting bracket that works for different bolt sizes.

The script must accept this parameter (verbatim — name and unit matter):

```typescript
const boltDiam = param("Bolt Diameter", 5, { unit: 'mm', min: 3, max: 10 });
```

Functional requirements:

- The bracket is L-shaped: two perpendicular flat plates joined at a right angle.
- Each plate has a single mounting hole. Hole diameter = `boltDiam + 0.5` mm (a 0.5mm clearance fit).
- Wall thickness (the dimension across each plate's smallest face) is at least `2 * boltDiam` mm.
- Each plate is at least `3 * boltDiam` mm in width and at least `3 * boltDiam` mm in height.
- The plates are connected (a single solid, not two free-floating slabs).

The script must `return` a single Shape.

Use kernelCAD's primitives and boolean operations. Z-up, millimetres, degrees.
```

- [ ] **Step 2: Write the expert solution**

Create `eval/tasks/bracket-holes/solution-expert.kcad.ts`:

```typescript
const boltDiam = param("Bolt Diameter", 5, { unit: 'mm', min: 3, max: 10 });

const t = 2 * boltDiam;       // wall thickness
const w = 3 * boltDiam;       // plate width
const h = 3 * boltDiam;       // plate height
const holeR = (boltDiam + 0.5) / 2;

// Horizontal plate (in XY plane, thickness along Z) with a hole through Z.
const horiz = box(w, h, t).subtract(
  cylinder(t + 2, holeR).translate(w / 2, h / 2, -1),
);

// Vertical plate (in YZ plane, thickness along X) standing up off the horizontal plate's near edge.
// Span: x in [0, t], y in [0, h], z in [0, w]. Hole through X at the centroid of the YZ face.
const vert = box(t, h, w).subtract(
  cylinder(t + 2, holeR).rotate([0, 1, 0], 90).translate(-1, h / 2, w / 2),
);

return horiz.union(vert);
```

- [ ] **Step 3: Write the harness**

Create `eval/tasks/bracket-holes/harness.ts`:

```typescript
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  const dims = [
    s.bbox.max[0] - s.bbox.min[0],
    s.bbox.max[1] - s.bbox.min[1],
    s.bbox.max[2] - s.bbox.min[2],
  ].sort((a, b) => b - a); // sorted descending: [largest, mid, smallest]
  const bboxVol = dims[0] * dims[1] * dims[2];

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'L-shape (2 axes > 10mm)': dims[0] > 10 && dims[1] > 10,
      'has holes (vol < 70% bbox)': s.volume < bboxVol * 0.7,
      'not paper-thin (min dim > 2mm)': dims[2] > 2,
    },
  };
}
```

(Note: the spec showed `< 50% bbox`. An L-bracket's bbox is mostly hollow corner, so a real L scores around 25-40% — `< 70%` is the right threshold for catching "agent built a solid box without holes" while passing real L-brackets. The spec's example used 50% as illustrative; this is the calibrated value.)

- [ ] **Step 4: Sanity-check that the expert solution scores 100%**

Write a quick one-shot ad-hoc verification:

```bash
KERNELCAD_BIN=./dist/cli/index.js npx tsx -e "
import('./eval/tasks/bracket-holes/harness.ts').then(async ({ default: h }) => {
  const r = await h('./eval/tasks/bracket-holes/solution-expert.kcad.ts');
  console.log(JSON.stringify(r, null, 2));
});
"
```

Expected output (the values must all be `true`):

```json
{
  "gates": {
    "evaluates clean": true,
    "non-empty solid": true
  },
  "scored": {
    "L-shape (2 axes > 10mm)": true,
    "has holes (vol < 70% bbox)": true,
    "not paper-thin (min dim > 2mm)": true
  }
}
```

If the expert solution fails any gate or scored test, FIX THE EXPERT SOLUTION until it passes — do not loosen the harness rubric. The harness rubric defines what "this task is solved" means; the expert proves the rubric is achievable.

- [ ] **Step 5: Commit**

```bash
git add eval/tasks/bracket-holes/
git commit -m "feat(eval): bracket-holes seed task (prompt + expert solution + harness)"
```

---

## Task 9: AgentClient interface + Mock + Anthropic implementation

**Files:**
- Create: `eval/agent.ts`
- Create: `eval/agent.test.ts`

`AgentClient` interface declared in `eval/types.ts` (Task 2). Two implementations: `MockAgentClient` (replays a fixture for tests + `--mock` mode) and `AnthropicAgentClient` (real API calls with prompt caching on the system prompt).

- [ ] **Step 1: Write the failing test**

Create `eval/agent.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MockAgentClient } from './agent';

describe('MockAgentClient', () => {
  it('replays canned responses in order', async () => {
    const client = new MockAgentClient([
      { text: '```typescript\nreturn box(1,1,1);\n```', tokens_in: 100, tokens_out: 20 },
      { text: '```typescript\nreturn box(2,2,2);\n```', tokens_in: 110, tokens_out: 25 },
    ]);
    const r1 = await client.generate({ system: 'sys', messages: [], model: 'm', max_tokens: 1000 });
    expect(r1.text).toContain('box(1,1,1)');
    expect(r1.tokens_in).toBe(100);
    const r2 = await client.generate({ system: 'sys', messages: [], model: 'm', max_tokens: 1000 });
    expect(r2.text).toContain('box(2,2,2)');
    expect(r2.tokens_out).toBe(25);
  });

  it('throws when responses are exhausted', async () => {
    const client = new MockAgentClient([
      { text: 'one', tokens_in: 1, tokens_out: 1 },
    ]);
    await client.generate({ system: '', messages: [], model: 'm', max_tokens: 1 });
    await expect(
      client.generate({ system: '', messages: [], model: 'm', max_tokens: 1 }),
    ).rejects.toThrow(/exhausted/i);
  });

  it('records every call for inspection', async () => {
    const client = new MockAgentClient([{ text: 'r', tokens_in: 1, tokens_out: 1 }]);
    await client.generate({
      system: 'sys',
      messages: [{ role: 'user', content: 'hello' }],
      model: 'm',
      max_tokens: 100,
    });
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].messages[0].content).toBe('hello');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- eval/agent.test.ts 2>&1 | tail -15
```

Expected: FAIL — module `./agent` not found.

- [ ] **Step 3: Implement both clients**

Create `eval/agent.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AgentClient, AgentMessage, AgentResponse } from './types';

interface GenerateArgs {
  system: string;
  messages: AgentMessage[];
  model: string;
  max_tokens: number;
}

export class MockAgentClient implements AgentClient {
  public calls: GenerateArgs[] = [];
  private idx = 0;

  constructor(private readonly responses: AgentResponse[]) {}

  async generate(args: GenerateArgs): Promise<AgentResponse> {
    this.calls.push(args);
    if (this.idx >= this.responses.length) {
      throw new Error(
        `MockAgentClient: response queue exhausted (asked for #${this.idx + 1}, only ${this.responses.length} canned)`,
      );
    }
    return this.responses[this.idx++];
  }
}

export class AnthropicAgentClient implements AgentClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(args: GenerateArgs): Promise<AgentResponse> {
    const resp = await this.client.messages.create({
      model: args.model,
      max_tokens: args.max_tokens,
      // Cache the system prompt — SKILL.md is large and reused across every task.
      system: [
        {
          type: 'text',
          text: args.system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    // Concatenate text content blocks. Tool-use isn't expected in CLI single-shot mode.
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      tokens_in: resp.usage.input_tokens + (resp.usage.cache_creation_input_tokens ?? 0) + (resp.usage.cache_read_input_tokens ?? 0),
      tokens_out: resp.usage.output_tokens,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- eval/agent.test.ts 2>&1 | tail -15
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add eval/agent.ts eval/agent.test.ts
git commit -m "feat(eval): AgentClient interface with Anthropic + Mock implementations"
```

---

## Task 10: `runTask` — single-task orchestration

**Files:**
- Create: `eval/runner.ts`
- Create: `eval/runner.test.ts`

`runTask` is the unit that runs one task end-to-end given an `AgentClient` (real or mock) and writes artifacts. The CLI in Task 11 wraps this for many tasks.

- [ ] **Step 1: Write the failing integration test**

Create `eval/runner.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';

let kernelcadAvailable = false;
let runsDir: string;

beforeEach(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
  runsDir = mkdtempSync(join(tmpdir(), 'eval-runner-'));
});

describe('runTask', () => {
  it.runIf(() => kernelcadAvailable)(
    'runs a task end-to-end and writes artifacts when the agent succeeds first try',
    async () => {
      const expertScript = readFileSync('./eval/tasks/bracket-holes/solution-expert.kcad.ts', 'utf8');
      const client = new MockAgentClient([
        {
          text: 'Here is the bracket:\n```typescript\n' + expertScript + '\n```',
          tokens_in: 4000,
          tokens_out: 200,
        },
      ]);

      const result = await runTask({
        taskDir: './eval/tasks/bracket-holes',
        runDir: runsDir,
        agent: client,
        model: 'mock-model',
        skillMd: 'fake skill content',
        startedAt: '2026-05-02T14-00-00',
      });

      expect(result.score).not.toBeNull();
      expect(result.score!.gate_pass).toBe(true);
      expect(result.score!.score).toBe(1);
      expect(result.score!.attempts).toBe(1);

      // Artifacts written?
      expect(existsSync(join(runsDir, 'transcript.md'))).toBe(true);
      expect(existsSync(join(runsDir, 'output.kcad.ts'))).toBe(true);
      expect(existsSync(join(runsDir, 'score.json'))).toBe(true);

      const score = JSON.parse(readFileSync(join(runsDir, 'score.json'), 'utf8'));
      expect(score.gate_pass).toBe(true);
      expect(score.score).toBe(1);

      const tx = readFileSync(join(runsDir, 'transcript.md'), 'utf8');
      expect(tx).toContain('# bracket-holes');
      expect(tx).toContain('## Turn 1');
      expect(tx).toContain('## Evaluate (attempt 1) — OK');
    },
    30000,
  );

  it.runIf(() => kernelcadAvailable)(
    'retries up to 3 attempts when the agent first generates a broken script',
    async () => {
      const expertScript = readFileSync('./eval/tasks/bracket-holes/solution-expert.kcad.ts', 'utf8');
      const client = new MockAgentClient([
        // Attempt 1: broken (sphere with face filter — guaranteed-fail diagnostic)
        {
          text: '```typescript\nreturn sphere(5).fillet(1, { face: "top" });\n```',
          tokens_in: 4000,
          tokens_out: 50,
        },
        // Attempt 2: correct
        {
          text: '```typescript\n' + expertScript + '\n```',
          tokens_in: 4500,
          tokens_out: 200,
        },
      ]);

      const result = await runTask({
        taskDir: './eval/tasks/bracket-holes',
        runDir: runsDir,
        agent: client,
        model: 'mock-model',
        skillMd: 'fake skill content',
        startedAt: '2026-05-02T14-00-00',
      });

      expect(result.score!.attempts).toBe(2);
      expect(result.score!.score).toBe(1);

      const tx = readFileSync(join(runsDir, 'transcript.md'), 'utf8');
      expect(tx).toContain('## Evaluate (attempt 1) — FAIL');
      expect(tx).toContain('## Turn 2');
      expect(tx).toContain('## Evaluate (attempt 2) — OK');
    },
    30000,
  );

  it.runIf(() => kernelcadAvailable)(
    'gives up after 3 failed attempts and marks gate-fail',
    async () => {
      const broken = '```typescript\nreturn sphere(5).fillet(1, { face: "top" });\n```';
      const client = new MockAgentClient([
        { text: broken, tokens_in: 4000, tokens_out: 50 },
        { text: broken, tokens_in: 4000, tokens_out: 50 },
        { text: broken, tokens_in: 4000, tokens_out: 50 },
      ]);

      const result = await runTask({
        taskDir: './eval/tasks/bracket-holes',
        runDir: runsDir,
        agent: client,
        model: 'mock-model',
        skillMd: 'fake skill content',
        startedAt: '2026-05-02T14-00-00',
      });

      expect(result.score!.attempts).toBe(3);
      expect(result.score!.gate_pass).toBe(false);
      expect(result.score!.score).toBe(0);
    },
    30000,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
KERNELCAD_BIN=./dist/cli/index.js npm test -- eval/runner.test.ts 2>&1 | tail -15
```

Expected: FAIL — module `./runner` not found.

- [ ] **Step 3: Implement `runTask`**

Create `eval/runner.ts`:

```typescript
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AgentClient, AgentMessage, TranscriptEvent, TaskResult, HarnessResult } from './types';
import { extractScript, formatDiagnostics, computeScore, renderTranscript } from './lib';
import { evaluateScript } from './oracle/kernelcad-client';

const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 8000;

export interface RunTaskArgs {
  taskDir: string;            // e.g. ./eval/tasks/bracket-holes
  runDir: string;             // e.g. ./eval/runs/2026-05-02T14-00-00/bracket-holes
  agent: AgentClient;
  model: string;
  skillMd: string;
  startedAt: string;          // ISO timestamp string (filesystem-safe), used for transcript header
}

export async function runTask(args: RunTaskArgs): Promise<TaskResult> {
  const taskDirAbs = resolve(args.taskDir);
  const taskName = taskDirAbs.split('/').pop() ?? 'unknown';
  const promptPath = join(taskDirAbs, 'prompt.md');
  const harnessPath = join(taskDirAbs, 'harness.ts');
  const prompt = readFileSync(promptPath, 'utf8');

  mkdirSync(args.runDir, { recursive: true });
  const outputScriptPath = join(args.runDir, 'output.kcad.ts');
  const transcriptPath = join(args.runDir, 'transcript.md');
  const scorePath = join(args.runDir, 'score.json');

  const events: TranscriptEvent[] = [];
  events.push({ kind: 'system_prompt', chars: args.skillMd.length });
  events.push({ kind: 'user_prompt', content: prompt });

  const messages: AgentMessage[] = [{ role: 'user', content: prompt }];
  let attempts = 0;
  let totalIn = 0;
  let totalOut = 0;
  let lastEvaluateOk = false;
  let finalScript: string | null = null;

  const start = Date.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    const turnStart = Date.now();
    const resp = await args.agent.generate({
      system: args.skillMd,
      messages,
      model: args.model,
      max_tokens: MAX_TOKENS,
    });
    const turnMs = Date.now() - turnStart;
    totalIn += resp.tokens_in;
    totalOut += resp.tokens_out;
    const script = extractScript(resp.text);

    events.push({
      kind: 'turn',
      attempt,
      assistant_text: resp.text,
      script_extracted: script,
      tokens_in: resp.tokens_in,
      tokens_out: resp.tokens_out,
      ms: turnMs,
    });

    if (!script) {
      // Couldn't extract a script — append a guidance message and retry.
      events.push({
        kind: 'evaluate',
        attempt,
        ok: false,
        diagnostics: [
          { code: 'eval.no-script-extracted', message: 'No script extracted from model response.' },
        ],
      });
      messages.push({ role: 'assistant', content: resp.text });
      messages.push({
        role: 'user',
        content: 'I could not extract a script from your response. Please return the full script in a single ```typescript code block.',
      });
      continue;
    }

    writeFileSync(outputScriptPath, script);
    finalScript = script;

    const ev = await evaluateScript(outputScriptPath);
    events.push({ kind: 'evaluate', attempt, ok: ev.ok, diagnostics: ev.diagnostics });

    if (ev.ok) {
      lastEvaluateOk = true;
      break;
    }

    // Feed diagnostics back and retry (unless this was the last attempt).
    if (attempt < MAX_ATTEMPTS) {
      messages.push({ role: 'assistant', content: resp.text });
      messages.push({
        role: 'user',
        content: `Diagnostics:\n${formatDiagnostics(ev.diagnostics)}\nFix and return the full corrected script.`,
      });
    }
  }

  // If we never got a clean evaluate, finalScript may still be the last broken attempt or null.
  // Write whatever we have so the human can read it; harness will mark gate-fail.
  if (!finalScript) {
    writeFileSync(outputScriptPath, '// (no script extracted from any attempt)');
  }

  // Run the task's harness against the final output.
  let harnessResult: HarnessResult;
  if (lastEvaluateOk) {
    const harnessModule = await import(harnessPath);
    harnessResult = await harnessModule.default(outputScriptPath);
  } else {
    harnessResult = { gates: { 'evaluates clean': false }, scored: {} };
  }

  events.push({
    kind: 'score',
    gates: harnessResult.gates,
    scored: harnessResult.scored,
  });

  const score = computeScore(harnessResult, {
    attempts,
    tokens_in: totalIn,
    tokens_out: totalOut,
    time_ms: Date.now() - start,
  });

  writeFileSync(scorePath, JSON.stringify(score, null, 2));
  writeFileSync(
    transcriptPath,
    renderTranscript({
      task: taskName,
      model: args.model,
      started_at: args.startedAt,
      events,
      score,
    }),
  );

  return { task: taskName, score };
}
```

- [ ] **Step 4: Run tests**

```bash
KERNELCAD_BIN=./dist/cli/index.js npm test -- eval/runner.test.ts 2>&1 | tail -20
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add eval/runner.ts eval/runner.test.ts
git commit -m "feat(eval): runTask single-task orchestrator with retry loop"
```

---

## Task 11: `run.ts` CLI entry point

**Files:**
- Create: `eval/run.ts`

CLI args, env validation, task discovery, summary table, error handling.

- [ ] **Step 1: Write `eval/run.ts`**

Create `eval/run.ts`:

```typescript
#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runTask } from './runner';
import { AnthropicAgentClient, MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';
import type { AgentClient, AgentResponse, TaskResult } from './types';

const MODEL = process.env.EVAL_MODEL ?? 'claude-sonnet-4-6';
const TASKS_DIR = resolve('eval/tasks');
const RUNS_DIR = resolve('eval/runs');
const SKILL_PATH = resolve('src/skill/SKILL.md');

function timestamp(): string {
  // YYYY-MM-DDTHH-MM-SS — filesystem-safe ISO.
  return new Date().toISOString().replace(/\..+$/, '').replace(/:/g, '-');
}

function fail(message: string): never {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function discoverTasks(filter?: string): string[] {
  if (!existsSync(TASKS_DIR)) {
    fail(`Tasks directory not found: ${TASKS_DIR}`);
  }
  const all = readdirSync(TASKS_DIR).filter((name) => {
    const full = join(TASKS_DIR, name);
    return statSync(full).isDirectory() && existsSync(join(full, 'prompt.md')) && existsSync(join(full, 'harness.ts'));
  });
  return filter ? all.filter((n) => n === filter) : all;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

function printSummary(results: TaskResult[]): void {
  const COLS = { task: 18, score: 8, attempts: 9, tokens: 9, time: 8 };
  const pad = (s: string, w: number) => s.padEnd(w);

  console.error('');
  console.error(
    `${pad('TASK', COLS.task)} ${pad('SCORE', COLS.score)} ${pad('ATTEMPTS', COLS.attempts)} ${pad('TOKENS', COLS.tokens)} ${pad('TIME', COLS.time)}`,
  );

  let totalTokens = 0;
  let totalTimeMs = 0;
  let passed = 0;
  let infraErrors = 0;

  for (const r of results) {
    if (!r.score) {
      console.error(`${pad(r.task, COLS.task)} ${pad('— infra —', COLS.score + COLS.attempts + COLS.tokens + COLS.time + 4)}`);
      infraErrors++;
      continue;
    }
    const s = r.score;
    const mark = s.gate_pass && s.score === 1 ? '✓' : (s.gate_pass ? '~' : '✗');
    if (s.gate_pass && s.score === 1) passed++;
    const scoreStr = `${mark} ${s.score.toFixed(2)}`;
    const tokensStr = formatNum(s.tokens.total);
    const timeStr = `${(s.time_ms / 1000).toFixed(1)}s`;
    const note = !s.gate_pass ? '   gate fail' : '';
    console.error(
      `${pad(r.task, COLS.task)} ${pad(scoreStr, COLS.score)} ${pad(String(s.attempts), COLS.attempts)} ${pad(tokensStr, COLS.tokens)} ${pad(timeStr, COLS.time)}${note}`,
    );
    totalTokens += s.tokens.total;
    totalTimeMs += s.time_ms;
  }

  console.error('─'.repeat(60));
  const counted = results.length - infraErrors;
  console.error(
    `${counted} tasks, ${passed} passed     ${formatNum(totalTokens)} total   ${(totalTimeMs / 1000).toFixed(1)}s${infraErrors > 0 ? `   (${infraErrors} infra failures)` : ''}`,
  );
}

function loadFixture(fixturePath: string): AgentResponse[] {
  const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
  if (!Array.isArray(data.responses)) {
    fail(`Fixture missing responses array: ${fixturePath}`);
  }
  return data.responses;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isMock = args.includes('--mock');
  const taskArg = args.find((a) => !a.startsWith('--'));

  // --mock fixture path (optional; defaults to runs/golden-2026-05-02-bracket-holes)
  const fixtureFlagIdx = args.indexOf('--fixture');
  const fixturePath =
    fixtureFlagIdx >= 0 && args[fixtureFlagIdx + 1]
      ? args[fixtureFlagIdx + 1]
      : 'eval/runs/golden-2026-05-02-bracket-holes/fixture.json';

  // Pre-flight
  if (!existsSync(SKILL_PATH)) {
    fail(`SKILL.md not found at ${SKILL_PATH}`);
  }
  if (!(await isKernelcadAvailable())) {
    fail(
      'kernelcad CLI not found. Run `npm run build:cli` and set KERNELCAD_BIN=./dist/cli/index.js, or `npm link` to make it global.',
    );
  }
  if (!isMock && !process.env.ANTHROPIC_API_KEY) {
    fail('ANTHROPIC_API_KEY env var is required (or pass --mock to replay a fixture).');
  }

  const skillMd = readFileSync(SKILL_PATH, 'utf8');
  const tasks = discoverTasks(taskArg);
  if (tasks.length === 0) {
    fail(taskArg ? `No task named '${taskArg}' under ${TASKS_DIR}` : `No tasks found under ${TASKS_DIR}`);
  }

  const startedAt = timestamp();
  const runRoot = isMock ? `eval/runs/_mock-${startedAt}` : `eval/runs/${startedAt}`;

  const results: TaskResult[] = [];
  for (const task of tasks) {
    let agent: AgentClient;
    if (isMock) {
      agent = new MockAgentClient(loadFixture(fixturePath));
    } else {
      agent = new AnthropicAgentClient(process.env.ANTHROPIC_API_KEY!);
    }
    try {
      const r = await runTask({
        taskDir: join(TASKS_DIR, task),
        runDir: join(runRoot, task),
        agent,
        model: isMock ? 'mock-model' : MODEL,
        skillMd,
        startedAt,
      });
      results.push(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n[${task}] infra error: ${msg}`);
      results.push({ task, score: null, infra_error: msg });
    }
  }

  printSummary(results);

  // Exit 0 unless every task was infra_error.
  const allInfra = results.every((r) => r.infra_error);
  process.exit(allInfra ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke-test the CLI in mock-failure mode (no fixture yet)**

The fixture doesn't exist yet (Task 12 creates it). Verify the pre-flight error path works:

```bash
KERNELCAD_BIN=./dist/cli/index.js npm run eval -- --mock 2>&1 | tail -10
```

Expected: pre-flight check passes (kernelcad found), then errors with a fixture-load failure ("Fixture missing responses array" or "ENOENT"). This confirms the CLI is wired up; the fixture is created in Task 12.

- [ ] **Step 3: Smoke-test the CLI without ANTHROPIC_API_KEY**

```bash
unset ANTHROPIC_API_KEY; KERNELCAD_BIN=./dist/cli/index.js npm run eval 2>&1 | tail -5
```

Expected: `ERROR: ANTHROPIC_API_KEY env var is required ...` and exit 1.

- [ ] **Step 4: Smoke-test the CLI without kernelcad**

```bash
PATH=/usr/bin:/bin npm run eval 2>&1 | tail -5
```

Expected: `ERROR: kernelcad CLI not found ...` and exit 1.

- [ ] **Step 5: Commit**

```bash
git add eval/run.ts
git commit -m "feat(eval): run.ts CLI entry point with task discovery and summary table"
```

---

## Task 12: Golden mock fixture + CI integration

**Files:**
- Create: `eval/runs/golden-2026-05-02-bracket-holes/fixture.json`
- Create: `eval/runs/golden-2026-05-02-bracket-holes/transcript.md`
- Create: `eval/runs/golden-2026-05-02-bracket-holes/output.kcad.ts`
- Create: `eval/runs/golden-2026-05-02-bracket-holes/score.json`
- Create: `eval/golden.test.ts`

The fixture replays a deterministic two-attempt sequence: attempt 1 has a face-ref-on-transformed-primitive bug, attempt 2 fixes it. The fixture matters because it exercises the retry path; if we recorded a one-shot success, the test wouldn't catch retry-loop regressions.

- [ ] **Step 1: Author the fixture's expected agent responses**

Create `eval/runs/golden-2026-05-02-bracket-holes/fixture.json`:

```json
{
  "_comment": "Golden mock fixture for bracket-holes. Two attempts: attempt 1 fails with face-ref-not-resolvable, attempt 2 succeeds. The script in attempt 2 is the expert solution verbatim.",
  "_authored": "2026-05-02",
  "responses": [
    {
      "text": "Here's the bracket — putting the fillet on first then translating, but I made a small mistake by transforming before filleting:\n\n```typescript\nconst boltDiam = param(\"Bolt Diameter\", 5, { unit: 'mm', min: 3, max: 10 });\nconst t = 2 * boltDiam;\nconst w = 3 * boltDiam;\nconst h = 3 * boltDiam;\nreturn box(w, h, t).translate(5, 0, 0).fillet(1, { face: 'top' });\n```",
      "tokens_in": 4231,
      "tokens_out": 180
    },
    {
      "text": "I see — the canonical face ref `'top'` only resolves on un-transformed primitives. Here's the corrected bracket without the broken fillet:\n\n```typescript\nconst boltDiam = param(\"Bolt Diameter\", 5, { unit: 'mm', min: 3, max: 10 });\n\nconst t = 2 * boltDiam;\nconst w = 3 * boltDiam;\nconst h = 3 * boltDiam;\nconst holeR = (boltDiam + 0.5) / 2;\n\nconst horiz = box(w, h, t).subtract(\n  cylinder(t + 2, holeR).translate(w / 2, h / 2, -1),\n);\n\nconst vert = box(t, h, w).subtract(\n  cylinder(t + 2, holeR).rotate([0, 1, 0], 90).translate(-1, h / 2, w / 2),\n);\n\nreturn horiz.union(vert);\n```",
      "tokens_in": 4801,
      "tokens_out": 290
    }
  ]
}
```

- [ ] **Step 2: Run the harness in mock mode and record artifacts**

```bash
KERNELCAD_BIN=./dist/cli/index.js npm run eval -- --mock --fixture eval/runs/golden-2026-05-02-bracket-holes/fixture.json bracket-holes 2>&1 | tail -15
```

Expected: a `_mock-<timestamp>` run directory is created under `eval/runs/`. The summary line should show `bracket-holes` with `score: 1.00` (or close), `attempts: 2`, and a non-zero token count.

- [ ] **Step 3: Copy the just-produced artifacts into the golden fixture dir**

```bash
LATEST=$(ls -td eval/runs/_mock-* | head -1)
cp $LATEST/bracket-holes/transcript.md eval/runs/golden-2026-05-02-bracket-holes/transcript.md
cp $LATEST/bracket-holes/output.kcad.ts eval/runs/golden-2026-05-02-bracket-holes/output.kcad.ts
cp $LATEST/bracket-holes/score.json eval/runs/golden-2026-05-02-bracket-holes/score.json
rm -rf $LATEST
```

The `time_ms` field in `score.json` is wall-clock and will vary run-to-run. To make the fixture byte-deterministic for CI, post-process score.json to zero out time_ms:

```bash
node -e "
const fs = require('fs');
const p = 'eval/runs/golden-2026-05-02-bracket-holes/score.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.time_ms = 0;
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
"
```

Similarly, the transcript has a timestamp in its header AND time values in two places (per-turn `(in: X tok, out: Y tok, Z.Zs)` and the Score block's `- Time: Z.Zs`). Normalize all of them to fixed strings:

```bash
TX=eval/runs/golden-2026-05-02-bracket-holes/transcript.md
# Header: lock to GOLDEN.
sed -i 's/^# bracket-holes — mock-model — .*$/# bracket-holes — mock-model — GOLDEN/' $TX
# Per-turn elapsed: ", X.Xs)" at end of "## Turn N (...)" headings.
sed -i 's/, [0-9]\+\.[0-9]s)$/, 0.0s)/' $TX
# Score block elapsed: "- Time: X.Xs".
sed -i 's/^- Time: [0-9]\+\.[0-9]s$/- Time: 0.0s/' $TX
```

- [ ] **Step 4: Write the golden integration test**

Create `eval/golden.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';

const GOLDEN = 'eval/runs/golden-2026-05-02-bracket-holes';

let kernelcadAvailable = false;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
});

describe('golden mock replay', () => {
  it.runIf(() => kernelcadAvailable)(
    'replays the golden fixture and produces matching score (deterministic fields only)',
    async () => {
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
    },
    30000,
  );
});
```

- [ ] **Step 5: Run the golden test**

```bash
KERNELCAD_BIN=./dist/cli/index.js npm test -- eval/golden.test.ts 2>&1 | tail -15
```

Expected: PASS, 1 test.

If the test fails on transcript comparison: inspect the diff between expected and actual, decide whether to update the golden artifacts (record the new run as canonical) or fix the runner logic. For first-time setup, expect to iterate once or twice on the normalization (e.g., other timestamp formats elsewhere in the transcript).

- [ ] **Step 6: Commit the fixture + integration test**

```bash
git add eval/runs/golden-2026-05-02-bracket-holes/ eval/golden.test.ts
git commit -m "feat(eval): golden mock fixture for bracket-holes (CI replay)"
```

---

## Task 13: Live smoke test (manual acceptance)

**Files:** none (manual verification of acceptance criteria 1, 2, 4 from spec)

This task is not automated; it confirms the harness works end-to-end against the real Anthropic API.

- [ ] **Step 1: Run a single task against the live API**

Set the API key (do NOT commit):

```bash
export ANTHROPIC_API_KEY="<your-key>"
KERNELCAD_BIN=./dist/cli/index.js npm run eval -- bracket-holes
```

Expected: a real run-directory under `eval/runs/<timestamp>/bracket-holes/` with `transcript.md`, `output.kcad.ts`, `score.json`. The summary table prints. Non-trivial token count and time. Score should be `1.00` more often than not (Sonnet 4.6 should solve bracket-holes reliably).

- [ ] **Step 2: Eyeball the transcript**

```bash
cat eval/runs/$(ls -t eval/runs/ | grep -v "^_mock\|^golden" | head -1)/bracket-holes/transcript.md
```

Verify:
- Prompt section quotes `prompt.md` content.
- Each turn shows token counts and elapsed seconds.
- Evaluate sections show OK/FAIL clearly.
- Score section shows gates + scored + tokens + time + attempts.

- [ ] **Step 3: Try the Karpathy loop manually**

Edit `src/skill/SKILL.md` — add a deliberately misleading sentence near the top (e.g., "All boxes must be centered by default" — false). Save. Re-run:

```bash
KERNELCAD_BIN=./dist/cli/index.js npm run eval -- bracket-holes
```

Compare the new transcript to the previous one. The misleading guidance should produce different agent behavior — e.g., the agent passes `centered: true` to `box()` and the volume changes, or it asks for clarification, or it produces a wrongly-centered bracket. Whatever the change, observe that the transcript clearly shows it.

Then revert SKILL.md:

```bash
git checkout src/skill/SKILL.md
```

This step proves acceptance criterion 4: "The author can edit one section of `src/skill/SKILL.md`, re-run `npm run eval`, and observe the score and transcript change accordingly."

- [ ] **Step 4: Commit a closure note (optional)**

If everything works:

```bash
# nothing to commit — this task is verification, not code.
```

If you found a bug during smoke-testing, fix it on a fresh branch with its own task list — do not patch under this plan.

---

## Self-Review Checklist (executed by plan author after writing)

**Spec coverage** — every requirement from the spec maps to a task:

- ✓ `eval/run.ts`, `oracle/kernelcad-client.ts`, `tasks/`, `runs/` directory structure → Task 1, 7, 8, 11.
- ✓ Anthropic SDK with prompt caching on SKILL.md → Task 9 (`AnthropicAgentClient` uses `cache_control: { type: 'ephemeral' }`).
- ✓ `EVAL_MODEL` env override, `ANTHROPIC_API_KEY` validation, `kernelcad` PATH check → Task 11.
- ✓ Generate / evaluate / retry-up-to-3 loop → Task 10 (`runTask`).
- ✓ Code-fence extraction with `typescript`/`ts`/`kcad`/empty tags → Task 3.
- ✓ Diagnostic feedback formatting on retry → Task 4.
- ✓ `score.json` shape (gates, scored, gate_pass, score, attempts, tokens, time_ms) → Task 5.
- ✓ Transcript markdown format with prompt + turns + evaluates + score → Task 6.
- ✓ Task contract: `prompt.md` + `harness.ts` (+ optional `solution-expert.kcad.ts`) → Task 8.
- ✓ Summary table to stderr → Task 11 (`printSummary`).
- ✓ `--mock` flag for CI replay against committed fixture → Task 11 + Task 12.
- ✓ Error handling: API errors, missing kernelcad, missing API key, no script extracted, harness import errors → Task 11 + Task 10.
- ✓ Self-test mode + golden fixture → Task 12.
- ✓ Vitest unit tests for code fence, diagnostics, score → Tasks 3, 4, 5, 6 + Task 12.
- ✓ Acceptance criteria 1-4 → Task 13.

**Placeholder scan:** searched plan for `TODO`, `TBD`, "implement later" — none found. Every step has actual code or actual commands.

**Type consistency:**
- `HarnessResult` shape (`gates`, `scored`) used in Tasks 2, 5, 8, 10 — consistent.
- `AgentClient.generate` signature `(opts: { system, messages, model, max_tokens })` consistent across Tasks 2, 9, 10, 11.
- `Score.tokens` is `{ input, output, total }` everywhere — consistent.
- `EvaluateResult.ok` semantic ("ok=true ⇒ no diagnostics, no failure") consistent between client (Task 7) and runner (Task 10).

**Scope check:** v1 only. No multi-mode, no Tier-2, no friction tagger, no parallelism, no baseline tooling, no LLM judge — all deferred items live in the spec's "Extension points" section and are not in this plan.

---

## Quality Gates Before Considering V1 Done

After all 13 tasks are complete, run the repo's quality command set and verify:

```bash
npm run lint
npm run typecheck
KERNELCAD_BIN=./dist/cli/index.js npm test
```

All three must pass cleanly. The eval tests are now part of `npm test` because of Task 1's vitest config edit.

For an end-to-end live verification, Task 13's Step 1 with a real API key is the canonical smoke test.
