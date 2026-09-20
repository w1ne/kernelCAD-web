# Model Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three highest-leverage quality gaps found by the MUSE 106-case sweep — no-shape scripts passing `evaluate`, interference repairs lacking guidance, and truncated replies treated as final — plus compound-solid interference hardening.

**Architecture:** A pure `detectNoShapeReturn` validator wired into the shared `evaluateAndBuildScript`/`dryRunScript` seam; a hint on `interference.overlap` gate verdicts; `finish_reason`-aware continuation in the OpenAI-compatible eval client; `detectCompoundInterferences` over `ShapeBackend.solidComponents()`.

**Tech Stack:** TypeScript, vitest, OCCT backend, OpenAI-compatible fetch client.

**Spec:** `docs/superpowers/specs/2026-09-20-model-quality-gates-design.md`

---

### Task 1: No-shape detection module

**Files:**
- Create: `src/modeling/validation/noShapeReturn.ts`
- Test: `tests/unit/diagnostics/noShapeReturn.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/diagnostics/noShapeReturn.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { dryRunScript } from '../../../src/agent/cli/commands/evaluate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const CODE = 'export.no-shape';

describe('export.no-shape from the evaluate seam', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('fires when a script builds features but never returns', async () => {
    const r = await evaluateScriptTool({
      code: `
        const b = box(10, 10, 10);
        const c = b.translate(20, 0, 0);
      `,
    });
    expect(r.ok).toBe(false);
    const d = r.diagnostics.find(x => x.code === CODE);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.nextAction).toEqual({ kind: 'add-return' });
  });

  it('fires when a script returns nothing at all', async () => {
    const r = await evaluateScriptTool({ code: `const x = 1 + 1;` });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(true);
  });

  it('fires on a primitive return', async () => {
    const r = await evaluateScriptTool({ code: `return 42;` });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(true);
  });

  it('stays silent on a Shape return', async () => {
    const r = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(r.ok).toBe(true);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(false);
  });

  it('stays silent on a non-empty array of Shapes', async () => {
    const r = await evaluateScriptTool({
      code: `return [box(10, 10, 10), box(10, 10, 10).translate(20, 0, 0)];`,
    });
    expect(r.ok).toBe(true);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(false);
  });

  it('fires from dryRunScript too (cheap pre-check)', async () => {
    const r = await dryRunScript({ code: `const b = box(10, 10, 10);` });
    expect(r.evaluation.diagnostics.some(d => d.code === CODE)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/diagnostics/noShapeReturn.test.ts`
Expected: FAIL — no `export.no-shape` diagnostic is emitted.

- [ ] **Step 3: Implement the module**

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Evaluate-scope no-shape gate: a script that does not return an exportable
// model artifact is not a model. Emits `export.no-shape` (error) so the gate
// suite and the repair loop catch it instead of shipping an empty model.
//
// Exportable: Shape | Scene | Region | non-empty array of Shape.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { isRegion } from '../../shared/intent/region';
import { Shape } from '../capture/proxy';
import { Scene } from './scene';

export interface NoShapeReturnInput {
  /** The raw value the script `return`ed. */
  returnValue: unknown;
}

/** True when the value is a model artifact the exporters can consume. */
export function isExportableReturn(value: unknown): boolean {
  if (value instanceof Shape || value instanceof Scene) return true;
  if (isRegion(value)) return true;
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((el) => el instanceof Shape);
  }
  return false;
}

export function detectNoShapeReturn(input: NoShapeReturnInput): CompilerDiagnostic[] {
  if (isExportableReturn(input.returnValue)) return [];
  return [
    {
      target: 'export-occt',
      code: 'export.no-shape',
      severity: 'error',
      message:
        'Script produced no model: evaluate requires the script to return a Shape, Scene, or Region.',
      hint: 'End the script with `return <shape>` (or `return asm.model()` for assemblies).',
      nextAction: NEXT_ACTIONS['export.no-shape'],
    },
  ];
}
```

- [ ] **Step 4: Wire it into the evaluate seam**

In `src/agent/cli/commands/evaluate.ts`:

Add the import beside the `detectUnstructuredBodies` import:

```ts
import { detectNoShapeReturn } from '../../../modeling/validation/noShapeReturn';
```

In `evaluateAndBuildScript`, inside the existing `if (!fatal) { ... }` block that pushes `detectUnstructuredBodies`, append:

```ts
    model.diagnostics.push(...detectNoShapeReturn({ returnValue: model.returnValue }));
```

In `dryRunScript`, extend the existing diagnostics line:

```ts
  const diagnostics = [
    ...detectUnstructuredBodies({ returnValue: run.returnValue, code }),
    ...detectNoShapeReturn({ returnValue: run.returnValue }),
  ];
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/diagnostics/noShapeReturn.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Check for false positives across the existing suites**

Run: `npx vitest run tests/unit/cli tests/unit/diagnostics tests/unit/capture tests/unit/compute`
Expected: PASS. If a legitimate non-model `evaluate` caller surfaces, fix that caller's script to return a shape — do not weaken the gate.

- [ ] **Step 7: Commit**

```bash
git add src/modeling/validation/noShapeReturn.ts src/agent/cli/commands/evaluate.ts tests/unit/diagnostics/noShapeReturn.test.ts
git commit -m "feat(evaluate): flag scripts that return no exportable model"
```

---

### Task 2: Interference repair hint

**Files:**
- Modify: `eval/loop/verdictsFromOracles.ts`
- Test: `eval/loop/verdictsFromOracles.test.ts`

- [ ] **Step 1: Extend the failing test**

In `eval/loop/verdictsFromOracles.test.ts`, extend the first test with a hint assertion:

```ts
    expect(interference!.hint).toMatch(/clearance/i);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run eval/loop/verdictsFromOracles.test.ts`
Expected: FAIL — `hint` is undefined.

- [ ] **Step 3: Implement**

In `eval/loop/verdictsFromOracles.ts`, in the per-pair loop inside `if (interferenceResult.pairs.length > 0)`:

```ts
      verdicts.push({
        gate: 'interference',
        ok: false,
        code: 'interference.overlap',
        message: `${pair.partA} overlaps ${pair.partB} by ${Math.round(pair.volumeMm3)} mm³`,
        hint:
          'Clear the overlap: shorten or offset the mating feature along its insertion axis, add clearance, or move the part. Target zero intersection volume for every listed pair.',
        margin: pair.volumeMm3,
        locus: `${pair.partA}∩${pair.partB}`,
      });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run eval/loop/verdictsFromOracles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/loop/verdictsFromOracles.ts eval/loop/verdictsFromOracles.test.ts
git commit -m "eval: give interference verdicts actionable repair hints"
```

---

### Task 3: Truncation-aware OpenAI-compatible client

**Files:**
- Modify: `eval/types.ts`
- Modify: `eval/agentOpenAICompat.ts`
- Modify: `eval/agent.ts`
- Modify: `scripts/runMuseSweep.ts`
- Test: `eval/agentOpenAICompat.test.ts`

- [ ] **Step 1: Extend the failing tests**

In `eval/agentOpenAICompat.test.ts`, update the first test's expectation and add two tests:

```ts
    expect(out).toEqual({ text: 'hello', tokens_in: 11, tokens_out: 7, finish_reason: 'stop' });
```

```ts
  it('continues once when the reply is truncated (finish_reason length)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: 'const a = ' }, finish_reason: 'length' }],
          usage: { prompt_tokens: 10, completion_tokens: 3 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: 'box(1,1,1);' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 12, completion_tokens: 4 },
        }),
      );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out.text).toBe('const a = box(1,1,1);');
    expect(out.tokens_in).toBe(22);
    expect(out.tokens_out).toBe(7);
    expect(out.finish_reason).toBe('stop');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      (fetchImpl.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(secondBody.messages.at(-1).role).toBe('user');
    expect(secondBody.messages.at(-1).content).toMatch(/continue/i);
  });

  it('caps continuation at two turns', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: 'x' }, finish_reason: 'length' }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out.text).toBe('xxx');
    expect(out.finish_reason).toBe('length');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run eval/agentOpenAICompat.test.ts`
Expected: FAIL — no `finish_reason`, no continuation.

- [ ] **Step 3: Add `finish_reason` to the response type**

In `eval/types.ts`, extend `AgentResponse`:

```ts
export interface AgentResponse {
  text: string;
  tokens_in: number;
  tokens_out: number;
  /** Provider stop reason when available (OpenAI-compatible `finish_reason`,
   *  Anthropic `stop_reason`). 'length' means the reply was truncated. */
  finish_reason?: string;
}
```

- [ ] **Step 4: Refactor the OpenAI-compatible client**

Replace the `ChatCompletionResponse` interface and `generate` in `eval/agentOpenAICompat.ts` with:

```ts
interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const MAX_CONTINUATIONS = 2;
const CONTINUATION_PROMPT =
  'Your previous reply was truncated. Continue exactly where you left off; do not repeat anything.';
```

```ts
  private async request(body: Record<string, unknown>): Promise<ChatCompletionResponse> {
    let lastErr: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** (attempt - 1));
        await sleep(backoff + Math.random() * backoff * 0.25);
      }
      let resp: Response;
      try {
        resp = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180_000),
        });
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        continue;
      }
      if (RETRYABLE_STATUS(resp.status)) {
        const text = await resp.text().catch(() => '');
        lastErr = new Error(`HTTP ${resp.status} ${text.slice(0, 300)}`);
        continue;
      }
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`OpenAI-compat request failed: HTTP ${resp.status} ${text.slice(0, 300)}`);
      }
      try {
        return (await resp.json()) as ChatCompletionResponse;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }
    throw lastErr ?? new Error('OpenAI-compat request failed after retries');
  }

  async generate(args: {
    system: string;
    systemAddendum?: string;
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
    temperature?: number;
  }): Promise<AgentResponse> {
    const system =
      args.systemAddendum && args.systemAddendum.length > 0
        ? `${args.system}\n\n${args.systemAddendum}`
        : args.system;
    const base = {
      model: args.model,
      max_tokens: args.max_tokens,
      messages: [
        { role: 'system', content: system },
        ...args.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    };

    const first = await this.request(base);
    let text = first.choices?.[0]?.message?.content ?? '';
    let tokensIn = num(first.usage?.prompt_tokens);
    let tokensOut = num(first.usage?.completion_tokens);
    let finish = first.choices?.[0]?.finish_reason ?? 'stop';

    let continuations = 0;
    while (finish === 'length' && continuations < MAX_CONTINUATIONS) {
      continuations += 1;
      const cont = await this.request({
        ...base,
        messages: [
          ...base.messages,
          { role: 'assistant', content: text },
          { role: 'user', content: CONTINUATION_PROMPT },
        ],
      });
      text += cont.choices?.[0]?.message?.content ?? '';
      tokensIn += num(cont.usage?.prompt_tokens);
      tokensOut += num(cont.usage?.completion_tokens);
      finish = cont.choices?.[0]?.finish_reason ?? 'stop';
    }

    if (text.length === 0) {
      return { text: '', tokens_in: tokensIn, tokens_out: 0, finish_reason: finish };
    }
    return { text, tokens_in: tokensIn, tokens_out: tokensOut, finish_reason: finish };
  }
```

- [ ] **Step 5: Populate `finish_reason` on the Anthropic client**

In `eval/agent.ts` `AnthropicAgentClient.generate`, extend the return:

```ts
    return {
      text,
      tokens_in: resp.usage.input_tokens + (resp.usage.cache_creation_input_tokens ?? 0) + (resp.usage.cache_read_input_tokens ?? 0),
      tokens_out: resp.usage.output_tokens,
      ...(resp.stop_reason !== null ? { finish_reason: resp.stop_reason } : {}),
    };
```

- [ ] **Step 6: Raise the sweep default**

In `scripts/runMuseSweep.ts`, change the max-tokens default:

```ts
  const maxTokens = Number(flagValue('--max-tokens') ?? 16000);
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run eval/agentOpenAICompat.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 8: Commit**

```bash
git add eval/types.ts eval/agentOpenAICompat.ts eval/agent.ts scripts/runMuseSweep.ts eval/agentOpenAICompat.test.ts
git commit -m "eval: continue truncated completions via finish_reason; 16k sweep default"
```

---

### Task 4: Compound-solid interference

**Files:**
- Modify: `src/modeling/runtime/detectInterferences.ts`
- Modify: `src/agent/script-runtime/checkInterference.ts`
- Modify: `src/agent/cli/commands/interference.ts`
- Test: `tests/unit/runtime/detectCompoundInterferences.test.ts`
- Test: `tests/unit/runtime/compoundInterference.integration.test.ts`

- [ ] **Step 1: Write the failing unit test**

```ts
// tests/unit/runtime/detectCompoundInterferences.test.ts
import { describe, it, expect } from 'vitest';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';
import { detectCompoundInterferences } from '../../../src/modeling/runtime/detectInterferences';

function stubSolid(volumeMm3: number, max: [number, number, number] = [10, 10, 10]) {
  return {
    boundingBox: () => ({ min: [0, 0, 0] as [number, number, number], max }),
    intersectionVolume: () => volumeMm3,
  } as unknown as ShapeBackend;
}

function stubCompound(solids: ShapeBackend[]): ShapeBackend {
  return { solidComponents: () => solids } as unknown as ShapeBackend;
}

describe('detectCompoundInterferences', () => {
  it('reports a pair above epsilon with solid[i] names', () => {
    const r = detectCompoundInterferences(stubCompound([stubSolid(5), stubSolid(0)]), 0.01, new Set());
    expect(r.partCount).toBe(2);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0]).toEqual({ a: 'solid[0]', b: 'solid[1]', volumeMm3: 5 });
  });

  it('ignores sub-epsilon intersections', () => {
    const r = detectCompoundInterferences(stubCompound([stubSolid(0.001), stubSolid(0)]), 0.01, new Set());
    expect(r.pairs).toHaveLength(0);
    expect(r.comparisonCount).toBe(1);
  });

  it('skips pairs whose bounding boxes do not overlap', () => {
    const r = detectCompoundInterferences(
      stubCompound([stubSolid(5), stubSolid(5, [-1, -1, -1])]),
      0.01,
      new Set(),
    );
    expect(r.pairs).toHaveLength(0);
    expect(r.comparisonCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/runtime/detectCompoundInterferences.test.ts`
Expected: FAIL — `detectCompoundInterferences` is not exported.

- [ ] **Step 3: Implement in `detectInterferences.ts`**

Refactor the pair loop into a shared helper and add the compound entry point (replace the body of `detectInterferences` with a call to the helper, keeping its signature and behavior):

```ts
interface NamedShape {
  readonly name: string;
  readonly shape: ShapeBackend;
  readonly bbox: { min: Vec3; max: Vec3 };
}

function pairwiseClash(
  items: readonly NamedShape[],
  epsilonMm3: number,
  ignored: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[],
): { pairs: InterferencePair[]; comparisonCount: number } {
  const pairs: InterferencePair[] = [];
  let comparisons = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (ignored.has(pairKey(a.name, b.name))) continue;
      if (!bboxesOverlap(a.bbox, b.bbox)) continue;
      comparisons++;
      let vol: number;
      try {
        vol = a.shape.intersectionVolume(b.shape);
      } catch (e) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.kernel-failed',
          severity: 'warn',
          message: `interference probe failed on pair (${a.name}, ${b.name}): ${e instanceof Error ? e.message : String(e)}; overlap not measured.`,
          hint: 'Check both parts for degenerate geometry with evaluate_script, or add the pair to the ignore list if its clearance is established another way.',
        });
        continue;
      }
      if (vol > epsilonMm3) {
        pairs.push({ a: a.name, b: b.name, volumeMm3: vol });
      }
    }
  }
  return { pairs, comparisonCount: comparisons };
}
```

`detectInterferences` becomes:

```ts
export function detectInterferences(
  scene: SceneBackend,
  epsilonMm3: number,
  ignored: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[] = [],
): CheckInterferenceResult {
  const transformed = scene.parts.map((p) => {
    const clone = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform);
    return { name: p.name, shape: clone, bbox: clone.boundingBox() };
  });
  const { pairs, comparisonCount } = pairwiseClash(transformed, epsilonMm3, ignored, diagnostics);
  return {
    pairs,
    partCount: transformed.length,
    comparisonCount,
    diagnostics,
    scope: 'scene',
  };
}

/** Pairwise clash detection inside a single ShapeBackend with ≥2 top-level
 *  solids (e.g. a union of disjoint bodies). Pair names are `solid[i]`. */
export function detectCompoundInterferences(
  shape: ShapeBackend,
  epsilonMm3: number,
  ignored: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[] = [],
): CheckInterferenceResult {
  const solids = shape.solidComponents().map((s, i) => ({
    name: `solid[${i}]`,
    shape: s,
    bbox: s.boundingBox(),
  }));
  const { pairs, comparisonCount } = pairwiseClash(solids, epsilonMm3, ignored, diagnostics);
  return {
    pairs,
    partCount: solids.length,
    comparisonCount,
    diagnostics,
    scope: 'compound',
  };
}
```

Add `readonly scope?: 'scene' | 'compound' | 'none';` to `CheckInterferenceResult`. Add the `ShapeBackend` import (`import type { ShapeBackend } from '../../kernel/backends/backend';`) and `Vec3` (`import type { Vec3 } from '../../shared/intent/types';`). The `OcctBackend` import already exists.

- [ ] **Step 4: Wire `checkInterference`**

In `src/agent/script-runtime/checkInterference.ts`, import `detectCompoundInterferences` alongside `detectInterferences`, and replace the tail:

```ts
  const lowered = r.shapes.get(targetId);
  if (!lowered) {
    return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics, scope: 'none' };
  }
  if (isSceneBackend(lowered)) {
    return detectInterferences(lowered, epsilon, ignored, r.diagnostics);
  }
  // Non-Scene Shape: still clash-check multi-solid compounds (a union of
  // disjoint bodies lowers to one ShapeBackend with several solids).
  if (lowered.solidComponents().length >= 2) {
    return detectCompoundInterferences(lowered, epsilon, ignored, r.diagnostics);
  }
  return { pairs: [], partCount: 0, comparisonCount: 0, diagnostics: r.diagnostics, scope: 'none' };
```

Also add `scope: 'none'` to the two earlier early-return literals in the same function.

- [ ] **Step 5: Surface `scope` in the CLI**

In `src/agent/cli/commands/interference.ts` JSON payload add:

```ts
      scope: r.scope ?? 'none',
```

and in the human branch, change the no-pair success message to name the scope:

```ts
    if (r.pairs.length === 0) {
      const scopeNote = r.scope === 'compound' ? `compound of ${r.partCount} solids` : `${r.partCount} parts`;
      console.log(`No interferences detected (${scopeNote}, ${r.comparisonCount} comparisons, ε=${input.epsilon}mm³).`);
    }
```

- [ ] **Step 6: Write the integration test**

```ts
// tests/unit/runtime/compoundInterference.integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('compound interference (real OCCT)', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports scope compound for a disjoint two-solid union', async () => {
    const r = await checkInterference({
      code: `
        const a = box(10, 10, 10);
        const b = box(10, 10, 10).translate(20, 0, 0);
        return a.union(b);
      `,
      fileName: 'compound.kcad.ts',
    });
    expect(r.scope).toBe('compound');
    expect(r.partCount).toBe(2);
    expect(r.pairs).toHaveLength(0);
  });

  it('keeps scope none for a single solid', async () => {
    const r = await checkInterference({
      code: `return box(10, 10, 10);`,
      fileName: 'single.kcad.ts',
    });
    expect(r.scope).toBe('none');
    expect(r.partCount).toBe(0);
  });
});
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run tests/unit/runtime/detectCompoundInterferences.test.ts tests/unit/runtime/compoundInterference.integration.test.ts tests/unit/runtime/interferenceClassification.test.ts`
Expected: PASS. If the disjoint union lowers to two solids, `partCount` is 2; if the backend fuses them into one solid, change the fixture to a shape that genuinely yields a compound (e.g. `a.union(b)` with a 1 mm gap) — verify with `node dist/cli/index.js interference --json` and record the observed `solidComponents()` count before adjusting the assertion.

- [ ] **Step 8: Commit**

```bash
git add src/modeling/runtime/detectInterferences.ts src/agent/script-runtime/checkInterference.ts src/agent/cli/commands/interference.ts tests/unit/runtime/detectCompoundInterferences.test.ts tests/unit/runtime/compoundInterference.integration.test.ts
git commit -m "feat(interference): clash-check multi-solid compounds in Shape returns"
```

---

### Task 5: Verification and sweep rerun

- [ ] **Step 1: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: 0 errors (pre-existing warnings allowed).

- [ ] **Step 2: Targeted suites**

Run: `npx vitest run tests/unit/diagnostics tests/unit/cli tests/unit/runtime eval/loop eval/agentOpenAICompat.test.ts scripts/`
Expected: PASS.

- [ ] **Step 3: Rebuild the CLI**

Run: `npm run build:cli`
Expected: `dist/cli/index.js` updated.

- [ ] **Step 4: Re-verify the MUSE failure classes against the new gates**

```bash
RUN=eval/runs/muse106-1a94f82-deepseek-ai-deepseek-v4-1-flash-20260920-005150
# no-shape cases now fail evaluate:
node dist/cli/index.js evaluate --json $RUN/cases/chair_4/output.kcad.ts | head -5
# interference cases still fail (unchanged, now with hints in the eval loop):
node dist/cli/index.js interference --json $RUN/cases/stool_hex/output.kcad.ts | head -5
```

Expected: `chair_4` reports `export.no-shape` (exit 1); `stool_hex` still reports pairs.

- [ ] **Step 5: Mock replay + live smoke**

```bash
set -a; source ~/.local/secrets/deepinfra.env; set +a
export KERNELCAD_BIN=./dist/cli/index.js MUSE_ROOT=~/projects/muse MUSE_PYTHON=~/projects/muse/.venv/bin/python
npx tsx scripts/runMuseSweep.ts --cases stool chair --workers 2 --mock-fixture eval/runs/golden-muse-sweep/fixture.json --run-id _mock-gates --skip-judge
npx tsx scripts/runMuseSweep.ts --cases stool vase_teardrop --workers 2 --run-id smoke-gates
```

Expected: mock replay passes; live smoke completes with judge scores present.

- [ ] **Step 6: Full 106 rerun**

```bash
nohup npx tsx scripts/runMuseSweep.ts --workers 6 > /tmp/muse-sweep-gates.log 2>&1 &
```

Expected: 106/106, 0 infra errors; record the new leaderboard row.

- [ ] **Step 7: Delta report**

Compare run 1 vs run 2: sandbox %, overlap-free %, judged count, final, and the failure-code taxonomy. Append the delta to `kernelCAD-private/docs/process/running-muse-benchmark.md` §7 and open a PR with the code changes (run artifacts stay out of the PR).

---

## Self-review notes

- Spec coverage: P0 → Task 1; P1a → Task 2; P1b → Task 3; P1c → Task 4; verification/delta → Task 5.
- Type consistency: `isExportableReturn`/`detectNoShapeReturn` defined in Task 1 and used only there; `scope` optional on `CheckInterferenceResult` so existing literals in other call sites keep compiling; `finish_reason` optional on `AgentResponse` (Task 3) and set by both clients; `pairwiseClash` used by both detectors.
- No placeholders: every code step carries the full snippet; the one empirical unknown (disjoint-union solid count) has an explicit verification command and adjustment instruction in Task 4 Step 7.
