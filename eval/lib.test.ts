import { describe, it, expect } from 'vitest';
import { extractScript, formatDiagnostics, computeScore } from './lib';
import type { Diagnostic } from './types';

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
