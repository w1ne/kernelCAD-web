// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { CompilerDiagnostic } from './diagnostic';
import { HINT_TEMPLATES } from './registry';
import { refuseEnvelope, refuseFromDiagnostics } from './refuse';

function diag(partial: Partial<CompilerDiagnostic> & Pick<CompilerDiagnostic, 'code' | 'severity' | 'message'>): CompilerDiagnostic {
  return { target: 'export-occt', hint: 'hint', ...partial };
}

const firstError = diag({
  code: 'feature.invalid-args',
  severity: 'error',
  message: 'radius must be positive',
  hint: 'Shrink the radius.',
  featureId: 'fillet_1',
  details: { param: 'radius' },
  scriptLocation: { file: 'bracket.kcad.ts', line: 12, column: 4 },
});

describe('refuseFromDiagnostics', () => {
  it('picks the first error and ignores a leading warning', () => {
    const warn = diag({ code: 'script.no-return', severity: 'warn', message: 'no return', hint: 'Add a return.' });
    const later = diag({ code: 'feature.kernel-failed', severity: 'error', message: 'later', hint: 'Retry later.' });
    expect(refuseFromDiagnostics([warn, firstError, later])).toEqual({
      code: 'feature.invalid-args',
      message: 'radius must be positive',
      location: {
        featureId: 'fillet_1',
        param: 'radius',
        scriptLocation: { line: 12, column: 4, path: 'bracket.kcad.ts' },
      },
      try: 'Shrink the radius.',
    });
  });

  it('returns undefined when there is no error', () => {
    const warn = diag({ code: 'script.no-return', severity: 'warn', message: 'no return', hint: 'Add a return.' });
    const info = diag({ code: 'feature.boolean.recovered', severity: 'info', message: 'recovered', hint: 'No action.' });
    expect(refuseFromDiagnostics([])).toBeUndefined();
    expect(refuseFromDiagnostics([warn])).toBeUndefined();
    expect(refuseFromDiagnostics([info, warn])).toBeUndefined();
  });

  it('maps location fields and omits an empty location', () => {
    expect(refuseFromDiagnostics([firstError])?.location).toEqual({
      featureId: 'fillet_1',
      param: 'radius',
      scriptLocation: { line: 12, column: 4, path: 'bracket.kcad.ts' },
    });
    const featureOnly = diag({
      code: 'feature.kernel-failed',
      severity: 'error',
      message: 'failed',
      hint: 'Retry.',
      featureId: 'box_1',
      details: { param: 2 },
    });
    expect(refuseFromDiagnostics([featureOnly])?.location).toEqual({ featureId: 'box_1' });
    const bare = diag({ code: 'feature.kernel-failed', severity: 'error', message: 'failed', hint: 'Retry.' });
    expect(refuseFromDiagnostics([bare])).toEqual({
      code: 'feature.kernel-failed',
      message: 'failed',
      try: 'Retry.',
    });
  });

  it('falls back try text to the hint template, then a generic line', () => {
    const missingHint = diag({
      code: 'feature.invalid-args',
      severity: 'error',
      message: 'bad field',
      hint: '   ',
    });
    expect(refuseFromDiagnostics([missingHint])?.try).toBe(HINT_TEMPLATES['feature.invalid-args'].template);
    const unknown = {
      target: 'export-occt',
      code: 'not.a.real.code',
      severity: 'error',
      message: 'unknown',
    } as unknown as CompilerDiagnostic;
    expect(refuseFromDiagnostics([unknown])?.try).toBe('Fix the reported error and re-evaluate.');
  });
});

describe('refuseEnvelope', () => {
  it('omits refuse when ok is true or the failure has no error diagnostic', () => {
    expect(refuseEnvelope(true, [firstError])).toBeUndefined();
    const warn = diag({ code: 'script.no-return', severity: 'warn', message: 'no return', hint: 'Add a return.' });
    expect(refuseEnvelope(false, [warn])).toBeUndefined();
  });

  it('attaches refuse when ok is false and an error is present', () => {
    expect(refuseEnvelope(false, [firstError])?.refuse.code).toBe('feature.invalid-args');
    expect(refuseEnvelope(false, [firstError])?.refuse.try).toBe('Shrink the radius.');
  });
});
