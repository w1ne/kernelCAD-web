// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// withNextAction must not throw on a diagnostic that arrives without a hint
// (hand-built literals in tests and some emit paths): it used to call
// routeRetiredToolMentions(undefined) and throw a TypeError.
import { describe, it, expect } from 'vitest';
import { withNextAction, withNextActions, type CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

describe('withNextAction without a hint', () => {
  it('fills nextAction and leaves the missing hint missing', () => {
    const d = { target: 'export-occt', code: 'fea.mesh.quality-low', severity: 'warn', message: 'stress untrusted' } as unknown as CompilerDiagnostic;
    const out = withNextAction(d);
    expect(out.hint).toBeUndefined();
    expect(out.message).toBe('stress untrusted');
    expect(out.nextAction).toEqual({ kind: 'retry-with-smaller-param', param: 'feaStudy.meshSize', factor: 0.5 });
    expect(() => withNextActions([d, { ...d, message: undefined } as unknown as CompilerDiagnostic])).not.toThrow();
  });

  it('still routes retired tool names inside a real hint', () => {
    const d: CompilerDiagnostic = { target: 'export-occt', code: 'fea.mesh.quality-low', severity: 'warn', message: 'm', hint: 'h' };
    expect(withNextAction(d).hint).toBe('h');
  });
});
