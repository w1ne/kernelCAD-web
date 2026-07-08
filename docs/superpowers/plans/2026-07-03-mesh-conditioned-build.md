# Mesh-conditioned "Build as parametric CAD" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When "Build as parametric CAD →" fires with a concept mesh in hand, generate the kernelCAD script from a single-shot vision-LLM conditioned on the Tripo mesh render + measured proportions — reusing the existing generation SSE + review UI end to end.

**Architecture:** `/api/v1/generate` gains an optional `mesh` body field. When present, the route calls a new single-shot vision path (`generateFromMesh`, Qwen3-VL-30B) instead of the text tool-loop, emitting the SAME SSE events. The preview endpoint additionally returns the Tripo render URL + GLB bbox proportions so the web can carry them to the build call. Backward compatible: no `mesh` → today's behavior.

**Tech Stack:** TypeScript (Node/Express ESM, `.js` import specifiers), the `openai` SDK (already vision-capable) via DeepInfra, zod, vitest. Web: React/Vite/vitest.

## Global Constraints

- Server repo trunk = `main`; work in worktree `~/projects/kernelCAD-server-worktrees/mesh-build` (branch `feat/mesh-conditioned-generate`). Web repo trunk = `develop`; worktree `~/projects/kernelCAD-web-worktrees/mesh-build` (branch `feat/mesh-conditioned-build`).
- ESM `.js` import specifiers in server TS (e.g. `import { x } from './y.js'`).
- Vision model id: `Qwen/Qwen3-VL-30B-A3B-Instruct` (verified on DeepInfra with the existing `LLM_API_KEY`/`LLM_BASE_URL`).
- Generated scripts MUST be **param-free** (plain numeric literals) — the `param()` arithmetic rules broke both spike paths; the system prompt forbids `param()`.
- Dimension-aware: when the prompt states explicit mm/cm dimensions, they are authoritative and the mesh is form-only (fixes the enclosure regression).
- All conditioning is best-effort: any mesh/image/fingerprint failure degrades to prompt-only generation, never blocks or errors the build.
- Reuse, don't duplicate: `parseArtifact` + `Artifact` (`src/agent/artifactSchema.js`), `createServerGateRunner` (`src/agent/serverGateRunner.js`), `getLLM` (`src/lib/llmClient.js`).
- Deploy order: server first (additive), then web.
- Server tests run with `npx vitest run <file>`; the worktree needs `node_modules` (symlinked) and a built `vendor/kernelcad` (symlinked) — both already set up.

---

## Task 1: GLB proportion fingerprint (server)

**Files:**
- Create: `src/lib/meshFingerprint.ts`
- Test: `src/lib/meshFingerprint.test.ts`

Worktree: `~/projects/kernelCAD-server-worktrees/mesh-build`.

**Interfaces:**
- Produces: `export async function fingerprintGlb(url: string): Promise<{ extentRatios: [number, number, number] } | null>` — fetches the GLB, unions every `POSITION` accessor's `min`/`max`, returns bbox extents normalized to the longest axis (longest = 1.0). Returns `null` on any fetch/parse failure.
- Produces: `export function extentRatiosFromMinMax(mins: number[][], maxs: number[][]): [number, number, number]` — pure core (each `min`/`max` is `[x,y,z]`), exported for direct unit testing without network.

Background: a `.glb` is `magic(4) version(4) length(4)` then chunks: `chunkLen(4) chunkType(4) chunkData`. The first chunk (`0x4E4F534A` = "JSON") is the glTF JSON. Each `accessors[i]` with a matching `POSITION` (via `meshes[].primitives[].attributes.POSITION`) carries `min:[x,y,z]` / `max:[x,y,z]`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/meshFingerprint.test.ts
import { describe, it, expect } from 'vitest';
import { extentRatiosFromMinMax } from './meshFingerprint.js';

describe('extentRatiosFromMinMax', () => {
  it('normalizes bbox extents to the longest axis', () => {
    // union bbox: x 0..80, y 0..50, z 0..5  => extents 80,50,5 => ratios 1, .625, .0625
    const r = extentRatiosFromMinMax([[0, 0, 0]], [[80, 50, 5]]);
    expect(r[0]).toBeCloseTo(1, 3);
    expect(r[1]).toBeCloseTo(0.625, 3);
    expect(r[2]).toBeCloseTo(0.0625, 3);
  });

  it('unions multiple accessors before computing extents', () => {
    const r = extentRatiosFromMinMax([[0, 0, 0], [10, -20, 0]], [[10, 0, 40], [20, 0, 40]]);
    // union: x 0..20 (20), y -20..0 (20), z 0..40 (40) => ratios .5,.5,1
    expect(r).toEqual([0.5, 0.5, 1]);
  });

  it('returns zeros safely for a degenerate (zero-size) box', () => {
    expect(extentRatiosFromMinMax([[0, 0, 0]], [[0, 0, 0]])).toEqual([0, 0, 0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/meshFingerprint.test.ts`
Expected: FAIL — cannot find module `./meshFingerprint.js`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/meshFingerprint.ts
import { logger } from '../logger.js';

/** Normalize a unioned bbox (mins/maxs arrays, each [x,y,z]) to ratios vs the longest axis. */
export function extentRatiosFromMinMax(mins: number[][], maxs: number[][]): [number, number, number] {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const m of mins) for (let i = 0; i < 3; i++) lo[i] = Math.min(lo[i], m[i]);
  for (const m of maxs) for (let i = 0; i < 3; i++) hi[i] = Math.max(hi[i], m[i]);
  const ext = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  const longest = Math.max(...ext) || 0;
  if (longest <= 0) return [0, 0, 0];
  return [ext[0] / longest, ext[1] / longest, ext[2] / longest].map(v => Number(v.toFixed(3))) as [number, number, number];
}

/** Parse the glTF JSON chunk out of a GLB ArrayBuffer. */
function parseGltfJson(buf: ArrayBuffer): unknown {
  const view = new DataView(buf);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB'); // "glTF"
  const chunkLen = view.getUint32(12, true);
  const chunkType = view.getUint32(16, true);
  if (chunkType !== 0x4e4f534a) throw new Error('first chunk is not JSON'); // "JSON"
  const json = new TextDecoder().decode(new Uint8Array(buf, 20, chunkLen));
  return JSON.parse(json);
}

export async function fingerprintGlb(url: string): Promise<{ extentRatios: [number, number, number] } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const gltf = parseGltfJson(await res.arrayBuffer()) as {
      accessors?: { min?: number[]; max?: number[] }[];
      meshes?: { primitives?: { attributes?: { POSITION?: number } }[] }[];
    };
    const posIdx = new Set<number>();
    for (const mesh of gltf.meshes ?? [])
      for (const prim of mesh.primitives ?? [])
        if (typeof prim.attributes?.POSITION === 'number') posIdx.add(prim.attributes.POSITION);
    const mins: number[][] = [];
    const maxs: number[][] = [];
    for (const i of posIdx) {
      const a = gltf.accessors?.[i];
      if (a?.min?.length === 3 && a?.max?.length === 3) { mins.push(a.min); maxs.push(a.max); }
    }
    if (!mins.length) return null;
    return { extentRatios: extentRatiosFromMinMax(mins, maxs) };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'fingerprintGlb failed');
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/meshFingerprint.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/meshFingerprint.ts src/lib/meshFingerprint.test.ts
git commit -m "feat: GLB proportion fingerprint (bbox extent ratios from accessor min/max)"
```

---

## Task 2: Dimension gate + conditioned prompt (server)

**Files:**
- Create: `src/agent/dimensionPrompt.ts`
- Test: `src/agent/dimensionPrompt.test.ts`

Worktree: server.

**Interfaces:**
- Produces: `export function hasExplicitDimensions(prompt: string): boolean` — true when the prompt states explicit sizes (`\d mm`, `\d cm`, `\d x \d`, `Ø\d`).
- Produces: `export function buildMeshConditionedPrompt(input: { prompt: string; proportions?: number[] | null }): { system: string; userText: string }` — the param-free system prompt + conditioning user text. When `hasExplicitDimensions(prompt)` the conditioning states the prompt's dimensions are authoritative and the mesh is form-only.

- [ ] **Step 1: Write the failing test**

```typescript
// src/agent/dimensionPrompt.test.ts
import { describe, it, expect } from 'vitest';
import { hasExplicitDimensions, buildMeshConditionedPrompt } from './dimensionPrompt.js';

describe('hasExplicitDimensions', () => {
  it('is false for an underspecified prompt', () => {
    expect(hasExplicitDimensions('a wall-mount bracket for a 30mm round sensor')).toBe(true); // 30mm present
    expect(hasExplicitDimensions('a wall-mount bracket for a sensor')).toBe(false);
  });
  it('detects mm, cm, NxM and diameter forms', () => {
    expect(hasExplicitDimensions('enclosure 70x50x30mm')).toBe(true);
    expect(hasExplicitDimensions('a 4 cm knob')).toBe(true);
    expect(hasExplicitDimensions('Ø40 dial')).toBe(true);
    expect(hasExplicitDimensions('a small organic vase')).toBe(false);
  });
});

describe('buildMeshConditionedPrompt', () => {
  it('always forbids param() (param-free rule) in the system prompt', () => {
    const { system } = buildMeshConditionedPrompt({ prompt: 'a bracket', proportions: [1, 0.7, 0.6] });
    expect(system.toLowerCase()).toContain('do not call param');
  });
  it('includes measured proportions when provided', () => {
    const { userText } = buildMeshConditionedPrompt({ prompt: 'a bracket', proportions: [1, 0.76, 0.61] });
    expect(userText).toContain('1');
    expect(userText).toContain('0.76');
  });
  it('marks prompt dimensions authoritative when the prompt states dimensions', () => {
    const { userText } = buildMeshConditionedPrompt({ prompt: 'enclosure 70x50x30mm', proportions: [1, 0.7, 0.4] });
    expect(userText.toLowerCase()).toContain('authoritative');
  });
  it('omits the authoritative clause and the proportions block gracefully with no dims/proportions', () => {
    const { userText } = buildMeshConditionedPrompt({ prompt: 'a sculpted handle', proportions: null });
    expect(userText.toLowerCase()).not.toContain('authoritative');
    expect(userText).toContain('a sculpted handle');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/agent/dimensionPrompt.test.ts`
Expected: FAIL — cannot find module `./dimensionPrompt.js`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/agent/dimensionPrompt.ts
import { AUTHORING_PRIMER } from './authoringPrimer.js';

const DIM_RE = /\d\s*(mm|cm|millimet|centimet)\b|\d\s*[x×]\s*\d|Ø\s*\d|⌀\s*\d/i;

export function hasExplicitDimensions(prompt: string): boolean {
  return DIM_RE.test(prompt);
}

const SYSTEM = `${AUTHORING_PRIMER}

---
You are generating ONE kernelCAD \`.kcad.ts\` script for a mechanical part, guided
by an AI-generated 3D concept of the target.
Rules:
- Output ONLY a single \`\`\`typescript fenced code block. No prose before or after.
- The script's final statement MUST \`return\` one shape.
- Prefer a SIMPLE, manufacturable interpretation: a few primitives + booleans.
  Do NOT reproduce organic surface detail; abstract to the essential part.
- CRITICAL: do NOT call param(). Use plain numeric literals in millimetres for
  every dimension (e.g. box(80, 50, 5)). Ordinary JS math on plain numbers is fine.`;

export function buildMeshConditionedPrompt(input: { prompt: string; proportions?: number[] | null }): { system: string; userText: string } {
  const dimsAuthoritative = hasExplicitDimensions(input.prompt);
  const lines: string[] = [`Design this part as a kernelCAD script: ${input.prompt}`, ''];
  lines.push(
    'The reference image is an AI-generated 3D concept of the target — use it for',
    'the OVERALL FORM and FEATURE LAYOUT, not as a surface to copy. It is often',
    'over-elaborate; abstract it to the essential mechanical part.',
  );
  if (input.proportions && input.proportions.length === 3) {
    lines.push(
      '',
      `Measured proportions of the concept mesh (longest axis = 1.0): ${JSON.stringify(input.proportions)}.`,
      'Use these to get the STANCE right (e.g. balanced 3D extents => an upright',
      'bracket/cradle, not a flat plate).',
    );
  }
  if (dimsAuthoritative) {
    lines.push(
      '',
      'The dimensions stated in the request above are AUTHORITATIVE — use them for',
      'all real-world sizes; take only shape and feature layout from the mesh.',
    );
  }
  return { system: SYSTEM, userText: lines.join('\n') };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/agent/dimensionPrompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/agent/dimensionPrompt.ts src/agent/dimensionPrompt.test.ts
git commit -m "feat: dimension-aware, param-free mesh-conditioned prompt builder"
```

---

## Task 3: Single-shot vision generation (server)

**Files:**
- Create: `src/agent/meshToScript.ts`
- Test: `src/agent/meshToScript.test.ts`

Worktree: server.

**Interfaces:**
- Consumes: `buildMeshConditionedPrompt` (Task 2); `getLLM` (`src/lib/llmClient.js`); `createServerGateRunner` (`src/agent/serverGateRunner.js`) — `.run(scriptPath): Promise<{ ok: boolean; verdicts: GateVerdict[] }>`; `Artifact` (`src/agent/artifactSchema.js`) = `{ title: string; code: string; parameters?: ...; suggestions: string[] }`; `AgentResult` (`src/agent/orchestrator.js`).
- Produces: `export async function generateFromMesh(input: MeshGenInput): Promise<AgentResult>` where
  `export interface MeshGenInput { prompt: string; renderImageUrl?: string | null; proportions?: number[] | null; onEvent?: (e: { type: string; [k: string]: unknown }) => void; signal?: AbortSignal; }`.
- Produces: `export function extractFencedScript(text: string): string | null` — pull the first ` ```typescript ` (or ```ts/js) fenced block; `null` if none.

Model behavior: one vision completion (text + optional `image_url`) → extract script → write to a temp file → gate. On gate failure, ONE repair completion with the gate error appended → gate again. Map to `AgentResult`: gate ok → `done`; extract-null → `llm_failed{stage:'parse'}`; gate-fail-twice → `gate_failed`. Emit `onEvent({type:'status', phase:'running'})` at start.

Image handling: if `renderImageUrl` is set, fetch it and pass a base64 `data:` URI (DeepInfra fetches data URIs reliably; Tripo signed URLs can expire). On image-fetch failure, proceed text-only (proportions still condition).

- [ ] **Step 1: Write the failing test**

```typescript
// src/agent/meshToScript.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();
vi.mock('../lib/llmClient.js', () => ({
  getLLM: () => ({ chat: { completions: { create: createMock } } }),
  DEFAULT_MODEL: 'x',
}));
const gateRun = vi.fn();
vi.mock('./serverGateRunner.js', () => ({ createServerGateRunner: () => ({ run: gateRun }) }));

import { extractFencedScript, generateFromMesh } from './meshToScript.js';

function completion(text: string) {
  return { choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 20 } };
}

beforeEach(() => {
  vi.clearAllMocks();
  gateRun.mockResolvedValue({ ok: true, verdicts: [{ gate: 'evaluate', ok: true, message: 'ok' }] });
});

describe('extractFencedScript', () => {
  it('pulls a typescript fenced block', () => {
    expect(extractFencedScript('blah\n```typescript\nreturn box(1,2,3);\n```\ndone')).toBe('return box(1,2,3);');
  });
  it('returns null when there is no fence', () => {
    expect(extractFencedScript('no code here')).toBeNull();
  });
});

describe('generateFromMesh', () => {
  it('returns done with an artifact when the gate passes', async () => {
    createMock.mockResolvedValue(completion('```typescript\nreturn box(80,50,5);\n```'));
    const r = await generateFromMesh({ prompt: 'a bracket', proportions: [1, 0.7, 0.6] });
    expect(r.status).toBe('done');
    if (r.status === 'done') {
      expect(r.artifact.code).toContain('box(80,50,5)');
      expect(r.artifact.title.length).toBeGreaterThan(0);
    }
  });

  it('sends image_url content when a render url is provided', async () => {
    // stub image fetch -> tiny png bytes
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })));
    createMock.mockResolvedValue(completion('```typescript\nreturn box(1,1,1);\n```'));
    await generateFromMesh({ prompt: 'a bracket', renderImageUrl: 'https://x/y.png', proportions: [1, 1, 1] });
    const msg = createMock.mock.calls[0][0].messages.at(-1);
    const hasImage = Array.isArray(msg.content) && msg.content.some((c: { type: string }) => c.type === 'image_url');
    expect(hasImage).toBe(true);
    vi.unstubAllGlobals();
  });

  it('retries once with the gate error when the first script fails the gate', async () => {
    gateRun
      .mockResolvedValueOnce({ ok: false, verdicts: [{ gate: 'evaluate', ok: false, message: 'boom' }] })
      .mockResolvedValueOnce({ ok: true, verdicts: [{ gate: 'evaluate', ok: true, message: 'ok' }] });
    createMock
      .mockResolvedValueOnce(completion('```typescript\nreturn bad();\n```'))
      .mockResolvedValueOnce(completion('```typescript\nreturn box(1,1,1);\n```'));
    const r = await generateFromMesh({ prompt: 'a bracket' });
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(r.status).toBe('done');
  });

  it('returns gate_failed after two failed attempts', async () => {
    gateRun.mockResolvedValue({ ok: false, verdicts: [{ gate: 'evaluate', ok: false, message: 'boom' }] });
    createMock.mockResolvedValue(completion('```typescript\nreturn bad();\n```'));
    const r = await generateFromMesh({ prompt: 'a bracket' });
    expect(r.status).toBe('gate_failed');
  });

  it('returns llm_failed(parse) when no fenced block is produced', async () => {
    createMock.mockResolvedValue(completion('sorry I cannot'));
    const r = await generateFromMesh({ prompt: 'a bracket' });
    expect(r.status).toBe('llm_failed');
    if (r.status === 'llm_failed') expect(r.stage).toBe('parse');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/agent/meshToScript.test.ts`
Expected: FAIL — cannot find module `./meshToScript.js`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/agent/meshToScript.ts
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type OpenAI from 'openai';
import { getLLM } from '../lib/llmClient.js';
import { createServerGateRunner } from './serverGateRunner.js';
import { buildMeshConditionedPrompt } from './dimensionPrompt.js';
import { logger } from '../logger.js';
import type { AgentResult } from './orchestrator.js';
import type { GateVerdict } from '../../vendor/kernelcad/dist/mcp/toolRegistry.js';

const MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct';

export interface MeshGenInput {
  prompt: string;
  renderImageUrl?: string | null;
  proportions?: number[] | null;
  onEvent?: (e: { type: string; [k: string]: unknown }) => void;
  signal?: AbortSignal;
}

export function extractFencedScript(text: string): string | null {
  const m = text.match(/```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

function titleFromPrompt(prompt: string): string {
  const t = prompt.trim().replace(/^(a|an|the)\s+/i, '');
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 80) || 'Generated part';
}

async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') ?? 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function gateScript(code: string): Promise<{ ok: boolean; verdicts: GateVerdict[] }> {
  const path = join(tmpdir(), `mesh-cand-${process.pid}-${Math.round(performance.now())}.kcad.ts`);
  await writeFile(path, code, 'utf8');
  return createServerGateRunner().run(path);
}

export async function generateFromMesh(input: MeshGenInput): Promise<AgentResult> {
  input.onEvent?.({ type: 'status', phase: 'running' });
  const { system, userText } = buildMeshConditionedPrompt({ prompt: input.prompt, proportions: input.proportions });

  const dataUri = input.renderImageUrl ? await toDataUri(input.renderImageUrl) : null;
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: userText }];
  if (dataUri) userContent.push({ type: 'image_url', image_url: { url: dataUri } });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];

  const llm = getLLM();
  let lastSource: string | null = null;
  let lastVerdicts: GateVerdict[] = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    let text: string;
    try {
      const res = await llm.chat.completions.create(
        { model: MODEL, messages, max_tokens: 2000 },
        { signal: input.signal },
      );
      text = res.choices[0]?.message?.content ?? '';
    } catch (err) {
      return { status: 'llm_failed', message: err instanceof Error ? err.message : String(err), iterations: attempt, stage: 'llm' };
    }

    const code = extractFencedScript(text);
    if (!code) {
      if (attempt === 2) return { status: 'llm_failed', message: 'no code fence in answer', iterations: attempt, stage: 'parse', source: text.slice(0, 2000) };
      messages.push({ role: 'assistant', content: text });
      messages.push({ role: 'user', content: 'Reply with ONLY a ```typescript fenced kernelCAD script.' });
      continue;
    }
    lastSource = code;

    const gate = await gateScript(code);
    if (gate.ok) {
      return { status: 'done', artifact: { title: titleFromPrompt(input.prompt), code, suggestions: [] }, iterations: attempt, costUsd: null };
    }
    lastVerdicts = gate.verdicts;
    if (attempt === 2) break;
    const errs = gate.verdicts.filter(v => !v.ok).map(v => `${v.gate}: ${v.message}`).join('; ');
    messages.push({ role: 'assistant', content: text });
    messages.push({ role: 'user', content: `Your script FAILED to build: ${errs}\nReturn a corrected param-free ```typescript script.` });
  }

  logger.info({ prompt: input.prompt }, 'generateFromMesh: gate_failed after 2 attempts');
  return { status: 'gate_failed', verdicts: lastVerdicts, iterations: 2, costUsd: null, source: lastSource };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/agent/meshToScript.test.ts`
Expected: PASS (7/7). If the `Response` global isn't available in the test env, the image test stubs it — no code change needed.

- [ ] **Step 5: Commit**

```bash
git add src/agent/meshToScript.ts src/agent/meshToScript.test.ts
git commit -m "feat: generateFromMesh — single-shot vision draft with gate + one repair"
```

---

## Task 4: Preview returns render URL + proportions (server)

**Files:**
- Modify: `src/lib/tripoClient.ts` (add `renderImageUrl` to `Text3dResult` + return it)
- Modify: `src/routes/preview.ts` (fingerprint the GLB; add fields to `preview_done`)
- Test: `src/routes/preview.test.ts` (extend — assert new fields)

Worktree: server.

**Interfaces:**
- Consumes: `fingerprintGlb` (Task 1).
- Produces (wire): `preview_done` SSE data = `{ glbUrl, costUsd, taskId, renderImageUrl: string | null, proportions: number[] | null }`.
- Modifies: `Text3dResult` gains `renderImageUrl: string | null`.

- [ ] **Step 1: Write the failing test** — extend `src/routes/preview.test.ts` with a case asserting `preview_done` carries the new fields. Mock `generatePreview` to resolve `{ glbUrl:'https://t/m.glb', costUsd:null, taskId:'t1', renderImageUrl:'https://t/r.png' }` and mock `fingerprintGlb` to resolve `{ extentRatios:[1,0.5,0.2] }`:

```typescript
// add to src/routes/preview.test.ts
import { vi } from 'vitest';
vi.mock('../lib/meshFingerprint.js', () => ({ fingerprintGlb: vi.fn(async () => ({ extentRatios: [1, 0.5, 0.2] })) }));
// ...in the existing describe, after the success-path setup:
it('preview_done carries renderImageUrl and proportions', async () => {
  generatePreviewMock.mockResolvedValue({ glbUrl: 'https://t/m.glb', costUsd: null, taskId: 't1', renderImageUrl: 'https://t/r.png' });
  const res = await post({ prompt: 'a mug' });
  const body = await res.text();
  expect(body).toContain('preview_done');
  expect(body).toContain('"renderImageUrl":"https://t/r.png"');
  expect(body).toContain('"proportions":[1,0.5,0.2]');
});
```

(If the existing test file does not already mock at module scope in a way that allows this, follow its established `vi.hoisted`/`vi.mock` pattern for `generatePreview`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/preview.test.ts`
Expected: FAIL — `preview_done` lacks `renderImageUrl`/`proportions`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/tripoClient.ts`:
```typescript
// change the interface:
export interface Text3dResult { glbUrl: string; costUsd: number | null; taskId: string; renderImageUrl: string | null }
// widen the poll output type:
//   output?: { pbr_model?: string; model?: string; rendered_image?: string };
// and the success return:
return { glbUrl, costUsd: null, taskId, renderImageUrl: poll.data?.output?.rendered_image ?? null };
```

In `src/routes/preview.ts`, replace the success emit:
```typescript
import { fingerprintGlb } from '../lib/meshFingerprint.js';
// ...
const result = await generatePreview(prompt, p => sse.send('status', { progress: p.progress }));
const fp = await fingerprintGlb(result.glbUrl).catch(() => null);
sse.send('preview_done', {
  glbUrl: result.glbUrl,
  costUsd: result.costUsd,
  taskId: result.taskId,
  renderImageUrl: result.renderImageUrl,
  proportions: fp?.extentRatios ?? null,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routes/preview.test.ts`
Expected: PASS. Also run `npx vitest run src/lib/tripoClient.test.ts` — update any `Text3dResult` fixture there to include `renderImageUrl` if it asserts the exact object.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tripoClient.ts src/routes/preview.ts src/routes/preview.test.ts src/lib/tripoClient.test.ts
git commit -m "feat: preview_done returns Tripo render URL + GLB proportions"
```

---

## Task 5: Route generate to the mesh path (server)

**Files:**
- Modify: `src/routes/generate.ts` (accept optional `mesh`; branch to `generateFromMesh`)
- Test: `src/routes/generate.integration.test.ts` (extend — mesh present routes to mesh path)

Worktree: server.

**Interfaces:**
- Consumes: `generateFromMesh` (Task 3), existing `dispatchAgentResult`.
- Wire: request body gains `mesh?: { renderImageUrl?: string; proportions?: number[] }`. When present → `generateFromMesh({ prompt, renderImageUrl, proportions, onEvent })`; else the existing `runAgentEscalating`. Both feed `dispatchAgentResult` unchanged.

- [ ] **Step 1: Write the failing test** — extend the generate integration test: a POST body with `mesh` invokes the mesh path. Mock `generateFromMesh` to resolve a `done` AgentResult and assert the response streams a `done` event with the artifact; assert `runAgentEscalating` was NOT called. Follow the file's existing harness (`express + app.listen(0) + fetch`, per repo convention). Sketch:

```typescript
// in src/routes/generate.integration.test.ts (add mocks + case)
const generateFromMeshMock = vi.fn();
vi.mock('../agent/meshToScript.js', () => ({ generateFromMesh: generateFromMeshMock }));
// ...
it('routes to the mesh path when body.mesh is present', async () => {
  generateFromMeshMock.mockResolvedValue({ status: 'done', artifact: { title: 'T', code: 'return box(1,1,1);', suggestions: [] }, iterations: 1, costUsd: null });
  const res = await postGenerate({ prompt: 'a bracket', mesh: { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] } });
  const body = await res.text();
  expect(generateFromMeshMock).toHaveBeenCalledOnce();
  expect(runAgentEscalatingMock).not.toHaveBeenCalled();
  expect(body).toContain('"code":"return box(1,1,1);"');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/generate.integration.test.ts`
Expected: FAIL — mesh body is ignored; `generateFromMesh` never called.

- [ ] **Step 3: Write minimal implementation**

Extend the zod `requestSchema`:
```typescript
mesh: z.object({
  renderImageUrl: z.string().url().optional(),
  proportions: z.array(z.number()).length(3).optional(),
}).optional(),
```

Branch the generation (replace the single `runAgentEscalating` call):
```typescript
import { generateFromMesh } from '../agent/meshToScript.js';
// ...after sse.send('generation', ...):
const t0 = Date.now();
const onEvent = (e: { type: string; [k: string]: unknown }) => {
  if (e.type === 'done' || e.type === 'error') return;
  sse.send(e.type, e);
};
const result = parsed.data.mesh
  ? await generateFromMesh({
      prompt: parsed.data.prompt,
      renderImageUrl: parsed.data.mesh.renderImageUrl,
      proportions: parsed.data.mesh.proportions,
      onEvent,
    })
  : await runAgentEscalating({
      prompt: parsed.data.prompt,
      currentCode: parsed.data.currentCode,
      timeoutMs: getGenerationTimeoutMs(),
      onEvent,
    });
const durationMs = Date.now() - t0;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routes/generate.integration.test.ts`
Expected: PASS. Then run the full changed-area suite: `npx vitest run src/agent src/routes src/lib`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/generate.ts src/routes/generate.integration.test.ts
git commit -m "feat: /api/v1/generate routes to the mesh-conditioned path when body.mesh is present"
```

---

## Task 6: Web preview carries render URL + proportions

**Files:**
- Modify: `src/funnel/lib/previewClient.ts` (parse new `preview_done` fields)
- Modify: `src/funnel/hooks/useTextTo3dPreview.ts` (`done` phase carries them)
- Test: `src/funnel/hooks/useTextTo3dPreview.test.ts` (extend)

Worktree: `~/projects/kernelCAD-web-worktrees/mesh-build`.

**Interfaces:**
- Produces: `PreviewEvent`'s `preview_done` gains `renderImageUrl: string | null; proportions: number[] | null`.
- Produces: `PreviewPhase` `done` state gains `renderImageUrl: string | null; proportions: number[] | null`.

- [ ] **Step 1: Write the failing test** — extend `useTextTo3dPreview.test.ts`: a `preview_done` SSE carrying the new fields surfaces them on the done phase.

```typescript
it('surfaces renderImageUrl and proportions from preview_done', async () => {
  vi.spyOn(client, 'startPreview').mockResolvedValue(
    sseResponse('event: preview_done\ndata: {"glbUrl":"https://t/o.glb","costUsd":null,"taskId":"t1","renderImageUrl":"https://t/r.png","proportions":[1,0.7,0.6]}\n\n'),
  );
  const { result } = renderHook(() => useTextTo3dPreview());
  await act(async () => { await result.current.submit('a bracket'); });
  await waitFor(() => expect(result.current.phase.state).toBe('done'));
  expect(result.current.phase).toMatchObject({ renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/funnel/hooks/useTextTo3dPreview.test.ts`
Expected: FAIL — fields undefined on the phase.

- [ ] **Step 3: Write minimal implementation**

In `previewClient.ts`, extend the `preview_done` event type and its parse:
```typescript
// event union member:
| { kind: 'preview_done'; glbUrl: string; costUsd: number | null; taskId: string; renderImageUrl: string | null; proportions: number[] | null }
// in parseBlock, the 'preview_done' case:
case 'preview_done': return {
  kind: 'preview_done',
  glbUrl: typeof p['glbUrl'] === 'string' ? p['glbUrl'] : '',
  costUsd: typeof p['costUsd'] === 'number' ? p['costUsd'] : null,
  taskId: typeof p['taskId'] === 'string' ? p['taskId'] : '',
  renderImageUrl: typeof p['renderImageUrl'] === 'string' ? p['renderImageUrl'] : null,
  proportions: Array.isArray(p['proportions']) ? (p['proportions'] as number[]) : null,
};
```

In `useTextTo3dPreview.ts`, extend the `done` phase + the `preview_done` handler:
```typescript
// PreviewPhase done member:
| { state: 'done'; glbUrl: string; costUsd: number | null; renderImageUrl: string | null; proportions: number[] | null }
// in the loop:
else if (e.kind === 'preview_done') {
  setPhase({ state: 'done', glbUrl: proxiedAssetUrl(e.glbUrl), costUsd: e.costUsd, renderImageUrl: e.renderImageUrl, proportions: e.proportions });
  return;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/funnel/hooks/useTextTo3dPreview.test.ts src/funnel/lib`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/funnel/lib/previewClient.ts src/funnel/hooks/useTextTo3dPreview.ts src/funnel/hooks/useTextTo3dPreview.test.ts
git commit -m "feat(web): preview carries render URL + proportions to the done phase"
```

---

## Task 7: Web generate client forwards mesh context

**Files:**
- Modify: `src/funnel/lib/generateClient.ts` (`GenerateRequest.mesh`, forwarded in body)
- Modify: `src/funnel/hooks/useGeneration.ts` (`submit` accepts optional `mesh`)
- Test: `src/funnel/hooks/useGeneration.test.ts` (extend, or create if absent)

Worktree: web.

**Interfaces:**
- Produces: `GenerateRequest` gains `mesh?: { renderImageUrl?: string | null; proportions?: number[] | null }`; forwarded verbatim in the POST body.
- Produces: `useGeneration().submit(prompt, currentCode?, mesh?)` — third arg threaded into `startGeneration`.

- [ ] **Step 1: Write the failing test** — assert `submit` forwards `mesh` into `startGeneration`.

```typescript
it('forwards mesh context to startGeneration', async () => {
  const spy = vi.spyOn(client, 'startGeneration').mockResolvedValue(
    sseResponse('event: generation\ndata: {"generationId":"g1","anonId":"a1"}\n\nevent: done\ndata: {"artifact":{"title":"T","code":"return box(1,1,1);"},"generationId":"g1","anonId":"a1","durationMs":1}\n\n'),
  );
  const { result } = renderHook(() => useGeneration());
  await act(async () => { await result.current.submit('a bracket', undefined, { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] }); });
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'a bracket', mesh: { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] } }));
});
```

(Mirror the SSE test helpers already used in `useTextTo3dPreview.test.ts`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/funnel/hooks/useGeneration.test.ts`
Expected: FAIL — `submit` has no third param; `mesh` not forwarded.

- [ ] **Step 3: Write minimal implementation**

In `generateClient.ts`:
```typescript
export interface GenerateRequest {
  prompt: string;
  currentCode?: string;
  mesh?: { renderImageUrl?: string | null; proportions?: number[] | null };
}
```
(No change to `startGeneration`'s body build — it already does `JSON.stringify(req)`, so `mesh` is forwarded once it's on the type.)

In `useGeneration.ts`, thread the third arg:
```typescript
const submit = useCallback(async (prompt: string, currentCode?: string, mesh?: GenerateRequest['mesh']) => {
  // ...
  res = await startGeneration({ prompt, currentCode, mesh });
  // ...
}, []);
```
(Add `GenerateRequest` to the existing import from `../lib/generateClient`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/funnel/hooks/useGeneration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/funnel/lib/generateClient.ts src/funnel/hooks/useGeneration.ts src/funnel/hooks/useGeneration.test.ts
git commit -m "feat(web): generate client + useGeneration forward mesh context"
```

---

## Task 8: Wire the Build-as-CAD button to the concept mesh

**Files:**
- Modify: `src/studio/StudioGenerate.tsx` (`buildConceptAsCad` passes the preview's mesh context)
- Test: `src/studio/StudioGenerate.test.tsx` (extend)

Worktree: web.

**Interfaces:**
- Consumes: `useGeneration().submit(prompt, currentCode?, mesh?)` (Task 7); `useTextTo3dPreview()` done-phase `renderImageUrl` + `proportions` (Task 6).
- Behavior: `buildConceptAsCad` remembers the concept's mesh context (captured when the preview completed) and passes `{ renderImageUrl, proportions }` as the third `submit` arg. Still a fresh generation (never an edit).

- [ ] **Step 1: Write the failing test** — extend `StudioGenerate.test.tsx`: after a `done` preview with mesh fields, clicking "Build as parametric CAD" calls the agent submit with the mesh context.

```typescript
it('Build-as-CAD passes the concept mesh context into the agent submit', () => {
  const { rerender } = render(<StudioGenerate />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a bracket' } });
  fireEvent.click(screen.getByRole('button', { name: /3d concept/i }));
  previewPhase = { state: 'done', glbUrl: 'https://t/x.glb', costUsd: null, renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] };
  rerender(<StudioGenerate />);
  fireEvent.click(screen.getByRole('button', { name: /build as parametric cad/i }));
  expect(generationSubmit).toHaveBeenCalledWith('a bracket', undefined, { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] });
});
```

(Extend the existing `useTextTo3dPreview` mock's `PreviewPhase` union in the test to include the two new done-state fields.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/studio/StudioGenerate.test.tsx`
Expected: FAIL — submit called with 2 args, no mesh context.

- [ ] **Step 3: Write minimal implementation**

In `StudioGenerate.tsx`, capture the concept mesh alongside the concept prompt and pass it through. Add state and set it when a preview completes, then use it in `buildConceptAsCad`:
```typescript
// alongside conceptPrompt state:
const [conceptMesh, setConceptMesh] = useState<{ renderImageUrl: string | null; proportions: number[] | null } | null>(null);

// capture when the preview reaches done — add an effect:
React.useEffect(() => {
  if (preview.phase.state === 'done') {
    setConceptMesh({ renderImageUrl: preview.phase.renderImageUrl, proportions: preview.phase.proportions });
  }
}, [preview.phase]);

// in buildConceptAsCad:
const buildConceptAsCad = () => {
  if (!conceptPrompt || busy) return;
  setBaseline(code);
  void submit(conceptPrompt, undefined, conceptMesh ?? undefined);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/studio/StudioGenerate.test.tsx`
Expected: PASS. Then `npx vitest run src/studio src/funnel` and `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/studio/StudioGenerate.tsx src/studio/StudioGenerate.test.tsx
git commit -m "feat(web): Build-as-CAD conditions generation on the concept mesh"
```

---

## Integration & deploy

- [ ] Server: open PR `feat/mesh-conditioned-generate` → main, CI green, merge, wait for Hetzner deploy (healthz commit == main tip). Set no new env — the mesh path reuses `LLM_API_KEY`/`LLM_BASE_URL` (DeepInfra hosts Qwen3-VL-30B).
- [ ] Web: open PR `feat/mesh-conditioned-build` → develop, CI green, merge, wait for Cloudflare deploy.
- [ ] Live verify (paid test account `shylenkoa+kernelcad-test@gmail.com`): prompt "a wall-mount bracket for a 30mm round sensor" → 3D concept → Build as parametric CAD → the result reads as a bracket (base + arm/mount), not a flat plate; accept applies it.
