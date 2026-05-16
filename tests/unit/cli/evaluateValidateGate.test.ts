// tests/unit/cli/evaluateValidateGate.test.ts
//
// T10 of v0.6 assembly-mates plan: `kernelcad evaluate` flips the
// `Assembly.solvedModel` validate gate to `'error'` so harness runs trip
// on invalid assemblies rather than silently emitting warnings.
//
// T9 wired `Assembly.solvedModel` to read `KERNELCAD_VALIDATE_DEFAULT`;
// this test pins the evaluate-entry behavior that sets it.
//
// Per spec 2026-05-11-assembly-mates-validator-design.md §"Validity gate".

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyEvaluateDefaults } from '../../../src/agent/cli/commands/evaluate';

describe('kernelcad evaluate — validate gate', () => {
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env.KERNELCAD_VALIDATE_DEFAULT;
    delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
    else process.env.KERNELCAD_VALIDATE_DEFAULT = prev;
  });

  it('sets KERNELCAD_VALIDATE_DEFAULT=error when unset', () => {
    expect(process.env.KERNELCAD_VALIDATE_DEFAULT).toBeUndefined();
    applyEvaluateDefaults();
    expect(process.env.KERNELCAD_VALIDATE_DEFAULT).toBe('error');
  });

  it('does NOT override an explicit KERNELCAD_VALIDATE_DEFAULT=warn', () => {
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
    applyEvaluateDefaults();
    expect(process.env.KERNELCAD_VALIDATE_DEFAULT).toBe('warn');
  });

  it('does NOT override an explicit KERNELCAD_VALIDATE_DEFAULT=off', () => {
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'off';
    applyEvaluateDefaults();
    expect(process.env.KERNELCAD_VALIDATE_DEFAULT).toBe('off');
  });

  it('does NOT override an explicit KERNELCAD_VALIDATE_DEFAULT=error (idempotent)', () => {
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'error';
    applyEvaluateDefaults();
    expect(process.env.KERNELCAD_VALIDATE_DEFAULT).toBe('error');
  });
});
