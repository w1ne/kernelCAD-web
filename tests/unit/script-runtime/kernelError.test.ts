// tests/unit/script-runtime/kernelError.test.ts
import { describe, it, expect } from 'vitest';
import { KernelError, isKernelError } from '../../../src/intent/kernelError';
import { kernelErrorToDiagnostic } from '../../../src/script-runtime/kernelErrorToDiagnostic';

describe('KernelError', () => {
  it('carries the code field', () => {
    const e = new KernelError('feature.path.label-without-segment', 'msg here');
    expect(e.code).toBe('feature.path.label-without-segment');
    expect(e.message).toBe('msg here');
  });

  it('is instanceof Error (back-compat)', () => {
    const e = new KernelError('feature.path.duplicate-label', 'msg');
    expect(e instanceof Error).toBe(true);
  });

  it('isKernelError discriminates from plain Error', () => {
    expect(isKernelError(new KernelError('any.code', 'msg'))).toBe(true);
    expect(isKernelError(new Error('plain'))).toBe(false);
    expect(isKernelError('not-error')).toBe(false);
    expect(isKernelError(null)).toBe(false);
  });

  it('isKernelError no longer matches plain object structural shape (rc.9 cleanup)', () => {
    // Cross-realm structural fallback was removed in rc.9 — the scenario it
    // covered (KernelError thrown across vm sandbox boundary) doesn't occur
    // in current code paths because KernelError is not injected into the
    // sandbox. Re-introduce when KernelError becomes a sandbox-visible class.
    const crossRealmShape = { name: 'KernelError', code: 'feature.x.y', message: 'msg' };
    expect(isKernelError(crossRealmShape)).toBe(false);
  });
});

describe('kernelErrorToDiagnostic', () => {
  it('converts KernelError to a diagnostic with the kernel code', () => {
    const d = kernelErrorToDiagnostic(new KernelError('feature.path.label-without-segment', 'foo'));
    expect(d.code).toBe('feature.path.label-without-segment');
    expect(d.severity).toBe('error');
    expect(d.message).toBe('foo');
  });

  it('converts plain Error to cli.script.exception', () => {
    const d = kernelErrorToDiagnostic(new Error('arbitrary failure'));
    expect(d.code).toBe('cli.script.exception');
    expect(d.message).toBe('arbitrary failure');
  });

  it('converts non-Error throws to cli.script.exception', () => {
    const d = kernelErrorToDiagnostic('thrown a string');
    expect(d.code).toBe('cli.script.exception');
    expect(d.message).toBe('thrown a string');
  });
});

import { evaluateScript } from '../../../src/cli/commands/evaluate';

describe('CLI evaluate uses KernelError code', () => {
  it('emits feature.path.duplicate-label as a diagnostic (not cli.script.exception)', async () => {
    const code = `
      return path().moveTo(0,0)
        .lineTo(5,0).label('side')
        .lineTo(5,5).label('side')
        .close().extrude(1);
    `;
    const r = await evaluateScript({ code });
    expect(r.exitCode).toBe(1);
    expect(r.diagnostics[0].code).toBe('feature.path.duplicate-label');
  });

  it('emits feature.path.label-without-segment when label() comes first', async () => {
    const code = `return path().label('orphan').moveTo(0,0).lineTo(5,0).close().extrude(1);`;
    const r = await evaluateScript({ code });
    expect(r.exitCode).toBe(1);
    expect(r.diagnostics[0].code).toBe('feature.path.label-without-segment');
  });

  it('still emits cli.script.exception for non-kernel errors', async () => {
    const code = `throw new Error('arbitrary');`;
    const r = await evaluateScript({ code });
    expect(r.exitCode).toBe(1);
    expect(r.diagnostics[0].code).toBe('cli.script.exception');
  });
});
