// src/lib/imageSimilarity/judge.ts
//
// W2 — Harden the oracle. A pluggable VisualJudge.
//
// Policy context (see image-replicator/SKILL.md): SSIM and silhouette IoU are
// SELECTORS/GATES ONLY — never an iterative reward target, because they are
// gameable (a wide solid slab with no lens openings can score high). The VLM
// rubric judge is the qualitative signal used WHEN there is no deterministic
// 3D geometry oracle (no reference.stl). When a reference.stl exists, the
// deterministic 3D oracle stays primary and this judge is supplementary.
//
// VlmRubricJudge reuses the visionLlmBackend pattern: a tiny injected client
// seam (so tests need no API key), one retry on malformed JSON, code-fence
// stripping before JSON.parse, model + temperature pinned, and a sha256 cache
// keyed on the render + reference bytes + rubric (deterministic re-scoring).

import { createHash } from 'node:crypto';

/** Output of any visual judge. `score` is the headline in [0, 1]. */
export interface VisualJudgeResult {
  score: number;
  perCriterion: Record<string, number>;
  reason: string;
}

export interface VisualJudgeArgs {
  renderPng: Buffer;
  referencePng?: Buffer;
  rubric: string[];
}

/** Pluggable judge. Implemented by VlmRubricJudge (prod) and MockVisualJudge (tests). */
export interface VisualJudge {
  judge(args: VisualJudgeArgs): Promise<VisualJudgeResult>;
}

// ─── Mock (tests / CI without an API key) ────────────────────────────────────

export class MockVisualJudge implements VisualJudge {
  private readonly canned: VisualJudgeResult;
  constructor(canned: VisualJudgeResult) {
    this.canned = canned;
  }
  async judge(_args: VisualJudgeArgs): Promise<VisualJudgeResult> {
    return this.canned;
  }
}

// ─── Injected client seam (mirrors visionLlmBackend's VisionLlmClient) ───────

export interface JudgeLlmRequest {
  model: string;
  temperature: number;
  prompt: string;
  renderPng: Buffer;
  referencePng?: Buffer;
}

/** Minimal client surface — accepts the production client or a test counter. */
export interface JudgeLlmClient {
  create(req: JudgeLlmRequest): Promise<{ text: string }>;
}

// Pinned for determinism. Temperature 0 → repeatable judgments.
const JUDGE_MODEL = 'claude-sonnet-4-6';
const JUDGE_TEMPERATURE = 0;

function buildRubricPrompt(rubric: string[]): string {
  const lines = rubric.map((c, i) => `  ${i + 1}. ${c}`);
  return [
    'You are a strict visual-fidelity judge. Compare the RENDER to the REFERENCE',
    '(when provided) and score how well the render satisfies each criterion.',
    '',
    `Criteria (${rubric.length}):`,
    ...lines,
    '',
    'Score each criterion in the closed interval [0, 1]: 1 = fully satisfied,',
    '0 = absent or wrong. Be conservative — a plausible-looking shape that is',
    'missing the requested distinctive feature scores low on that criterion.',
    '',
    'Return ONLY a single JSON object (no prose, no markdown fence) of this shape:',
    '{',
    '  "perCriterion": { "<criterion text>": 0.0, ... },',
    '  "reason": "<one-sentence justification>"',
    '}',
  ].join('\n');
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n');
    if (firstNewline >= 0) {
      const body = trimmed.slice(firstNewline + 1);
      const closeIdx = body.lastIndexOf('```');
      return (closeIdx >= 0 ? body.slice(0, closeIdx) : body).trim();
    }
  }
  return trimmed;
}

function parseRubricResponse(text: string, rubric: string[]): VisualJudgeResult {
  const parsed = JSON.parse(stripCodeFences(text)) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { perCriterion?: unknown }).perCriterion !== 'object' ||
    (parsed as { perCriterion?: unknown }).perCriterion === null
  ) {
    throw new Error('judge: response JSON missing "perCriterion" object');
  }
  const rawPer = (parsed as { perCriterion: Record<string, unknown> }).perCriterion;
  const reason =
    typeof (parsed as { reason?: unknown }).reason === 'string'
      ? (parsed as { reason: string }).reason
      : '';

  const perCriterion: Record<string, number> = {};
  for (const c of rubric) {
    const v = rawPer[c];
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    perCriterion[c] = n;
  }
  const values = Object.values(perCriterion);
  const score = values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
  return { score, perCriterion, reason };
}

export class VlmRubricJudge implements VisualJudge {
  private cache = new Map<string, VisualJudgeResult>();
  private readonly client: JudgeLlmClient;
  private readonly model: string;
  private readonly temperature: number;

  constructor(
    client: JudgeLlmClient,
    model: string = JUDGE_MODEL,
    temperature: number = JUDGE_TEMPERATURE,
  ) {
    this.client = client;
    this.model = model;
    this.temperature = temperature;
  }

  private cacheKey(args: VisualJudgeArgs): string {
    const h = createHash('sha256');
    h.update(args.renderPng);
    if (args.referencePng) h.update(args.referencePng);
    h.update(JSON.stringify(args.rubric));
    h.update(this.model);
    h.update(String(this.temperature));
    return h.digest('hex');
  }

  async judge(args: VisualJudgeArgs): Promise<VisualJudgeResult> {
    const key = this.cacheKey(args);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const prompt = buildRubricPrompt(args.rubric);
    const req: JudgeLlmRequest = {
      model: this.model,
      temperature: this.temperature,
      prompt,
      renderPng: args.renderPng,
      referencePng: args.referencePng,
    };

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const resp = await this.client.create(req);
      try {
        const result = parseRubricResponse(resp.text, args.rubric);
        this.cache.set(key, result);
        return result;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw new Error(`judge: malformed JSON after retry (${lastErr?.message ?? 'unknown'})`);
  }
}
