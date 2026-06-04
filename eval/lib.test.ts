import { describe, it, expect } from 'vitest';
import { extractScript, formatDiagnostics, computeScore, renderTranscript } from './lib';
import type { Diagnostic, TranscriptEvent, Score } from './types';

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

describe('formatDiagnostics', () => {
  it('renders a single diagnostic with code and message', () => {
    const diags: Diagnostic[] = [
      { code: 'feature.kernel-failed', message: 'OCCT could not apply that fillet.' },
    ];
    expect(formatDiagnostics(diags)).toBe(
      '- `feature.kernel-failed` — OCCT could not apply that fillet.',
    );
  });

  it('appends hint on a new indented line when present', () => {
    const diags: Diagnostic[] = [
      {
        code: 'feature.face-ref.not-resolvable',
        message: 'Canonical face refs only work on un-transformed primitives.',
        hint: 'Apply transforms after the fillet/chamfer.',
      },
    ];
    expect(formatDiagnostics(diags)).toBe(
      '- `feature.face-ref.not-resolvable` — Canonical face refs only work on un-transformed primitives.\n  Hint: Apply transforms after the fillet/chamfer.',
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
            code: 'feature.face-ref.not-resolvable',
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
    expect(md).toContain('- `feature.face-ref.not-resolvable`');
    expect(md).toContain('Hint: Apply transforms after the fillet/chamfer.');
    expect(md).toContain('## Turn 2 (in: 4,500 tok, out: 60 tok, 3.5s)');
    expect(md).toContain('## Evaluate (attempt 2) — OK');
    expect(md).toContain('- Attempts: 2');
  });
});

describe('renderTranscript — cookbook_inject', () => {
  const baseScore: Score = {
    gates: { 'evaluates clean': true },
    scored: {},
    gate_pass: true,
    score: 1,
    attempts: 1,
    tokens: { input: 0, output: 0, total: 0 },
    time_ms: 0,
  };

  it('renders a non-empty cookbook_inject as a Cookbook section', () => {
    const events: TranscriptEvent[] = [
      { kind: 'cookbook_inject', query: 'fillet after subtract', hits: [{ id: 'fillet-face-after-subtract', score: 1.42 }] },
    ];
    const out = renderTranscript({ task: 't', model: 'm', started_at: 's', events, score: baseScore });
    expect(out).toContain('## Cookbook injection');
    expect(out).toContain('query: "fillet after subtract"');
    expect(out).toContain('fillet-face-after-subtract');
    expect(out).toContain('1.42');
  });

  it('renders an empty cookbook_inject as a no-match line', () => {
    const events: TranscriptEvent[] = [
      { kind: 'cookbook_inject', query: 'xyzzy', hits: [] },
    ];
    const out = renderTranscript({ task: 't', model: 'm', started_at: 's', events, score: baseScore });
    expect(out).toContain('## Cookbook injection');
    expect(out).toContain('query: "xyzzy"');
    expect(out).toMatch(/no match above floor/i);
  });
});

import type { HarnessResult } from './types';

describe('computeScore — funnel cascade (W2)', () => {
  const meta = { attempts: 1, tokens_in: 10, tokens_out: 20, time_ms: 100 };

  it('does not change score/gate_pass for an all-pass result (regression)', () => {
    const result: HarnessResult = {
      gates: { 'evaluates clean': true, 'non-empty solid': true },
      scored: { 'silhouette IoU >= 0.45 vs photo': true, 'SSIM >= 0.35 vs photo': false },
    };
    const score = computeScore(result, meta);
    expect(score.gate_pass).toBe(true);
    expect(score.score).toBe(0.5); // 1 of 2 scored passed — unchanged behavior
  });

  it('still returns score 0 when a gate fails (regression)', () => {
    const result: HarnessResult = {
      gates: { 'evaluates clean': false },
      scored: { 'silhouette IoU >= 0.45 vs photo': true },
    };
    const score = computeScore(result, meta);
    expect(score.gate_pass).toBe(false);
    expect(score.score).toBe(0);
  });

  it('populates the funnel with per-stage pass counts for a partially-failing result', () => {
    const result: HarnessResult = {
      gates: {
        'evaluates clean': true,
        'non-empty solid': true,
        'no unintended interferences': false,
        'eyewear-wide (>= 100 mm in some axis)': true,
      },
      scored: {
        'silhouette IoU >= 0.45 vs photo': true,
        'SSIM >= 0.35 vs photo': false,
        'chamfer distance <= 25 mm vs STL': true,
      },
    };
    const score = computeScore(result, meta);
    expect(score.funnel).toBeDefined();
    const byStage = Object.fromEntries((score.funnel ?? []).map((s) => [s.stage, s]));

    expect(byStage['code-valid']).toEqual({ stage: 'code-valid', passed: 1, total: 1 });
    // non-empty solid (pass) + no unintended interferences (fail) = 1/2
    expect(byStage['watertight/non-overlapping']).toEqual({
      stage: 'watertight/non-overlapping',
      passed: 1,
      total: 2,
    });
    // eyewear-wide (pass) = 1/1
    expect(byStage['mechanism-real']).toEqual({ stage: 'mechanism-real', passed: 1, total: 1 });
    // silhouette (pass) + ssim (fail) + chamfer (pass) = 2/3
    expect(byStage['design-intent']).toEqual({ stage: 'design-intent', passed: 2, total: 3 });
  });

  it('omits a stage that has no matching gate/scored item', () => {
    const result: HarnessResult = {
      gates: { 'evaluates clean': true },
      scored: {},
    };
    const score = computeScore(result, meta);
    const stages = (score.funnel ?? []).map((s) => s.stage);
    expect(stages).toContain('code-valid');
    expect(stages).not.toContain('design-intent');
    expect(stages).not.toContain('watertight/non-overlapping');
  });
});
