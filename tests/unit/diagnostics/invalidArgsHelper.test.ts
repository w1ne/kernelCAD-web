// tests/unit/diagnostics/invalidArgsHelper.test.ts
//
// Unit tests for the shared `invalid-args` raiser, plus the ratchet that keeps
// new raise sites going through it.
//
// Context: `feature.invalid-args` was the top `evaluate_script` failure in the
// 2026-10-03 usage triage (74 of 472 real calls) and the top cause of
// hosted-agent gate failures, because the messages named the problem but not
// the fix. The contract the helper enforces is that every message carries, in
// order: API + argument path, received value, requirement, inline example.

import { describe, it, expect } from 'vitest';
import {
  invalidArgs,
  invalidArgsError,
  invalidArgsText,
  describeArgValue,
  MAX_GOT_CHARS,
} from '../../../src/shared/intent/invalidArgs';
import { KernelError } from '../../../src/shared/intent/kernelError';

describe('invalidArgs: message shape', () => {
  const spec = {
    api: 'hole(face, { diameter })',
    path: 'opts.diameter',
    got: 0,
    requires: 'a finite number > 0 and ≤ 1000',
    unit: 'mm' as const,
    example: "plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through' })",
  };

  it('names the API, the path, the value, the requirement and the example in that order', () => {
    const { message } = invalidArgsText(spec);
    const iApi = message.indexOf('hole(face, { diameter })');
    const iPath = message.indexOf('opts.diameter');
    const iGot = message.indexOf('got 0');
    const iReq = message.indexOf('requires a finite number > 0 and ≤ 1000');
    const iEx = message.indexOf('Example: plate.hole(');
    expect(iApi).toBe(0);
    expect(iPath).toBeGreaterThan(iApi);
    expect(iGot).toBeGreaterThan(iPath);
    expect(iReq).toBeGreaterThan(iGot);
    expect(iEx).toBeGreaterThan(iReq);
  });

  it('names the unit, so a cm/inch value is self-diagnosing', () => {
    expect(invalidArgsText(spec).message).toContain('(mm)');
    expect(invalidArgsText({ ...spec, unit: 'deg' }).message).toContain('(deg)');
  });

  it('omits a unit suffix for non-dimensional args', () => {
    const { message } = invalidArgsText({ ...spec, unit: undefined });
    expect(message).not.toContain('(mm)');
    expect(message).not.toContain('()');
  });

  it('passes a user-declared param unit through verbatim', () => {
    expect(invalidArgsText({ ...spec, unit: 'inch' }).message).toContain('(inch)');
  });

  it('builds a hint that repeats the requirement and the example', () => {
    const { hint } = invalidArgsText(spec);
    expect(hint).toContain('opts.diameter');
    expect(hint).toContain('a finite number > 0 and ≤ 1000 (mm)');
    expect(hint).toContain(spec.example);
  });

  it('lets a call site override only the hint, keeping the four-part message', () => {
    const { message, hint } = invalidArgsText({ ...spec, hint: 'grow the nominal diameter instead' });
    expect(hint).toBe('grow the nominal diameter instead');
    expect(message).toContain('Example: plate.hole(');
  });

  it('raises a KernelError with code feature.invalid-args by default', () => {
    expect(() => invalidArgs(spec)).toThrow(KernelError);
    try {
      invalidArgs(spec);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });

  it('keeps the code the call site asks for', () => {
    expect(invalidArgsError({ ...spec, code: 'cli.invalid-args' }).code).toBe('cli.invalid-args');
    expect(invalidArgsError({ ...spec, code: 'feature.sheetMetal.kfactor-invalid' }).code)
      .toBe('feature.sheetMetal.kfactor-invalid');
  });

  it('carries the featureId through', () => {
    expect(invalidArgsError({ ...spec, featureId: 'hole-3' }).featureId).toBe('hole-3');
  });

  it('falls back to "argument" when no path applies', () => {
    expect(invalidArgsText({ ...spec, path: '' }).message).toContain('argument — got 0');
  });

  it('says "got nothing" for an omitted argument', () => {
    const { message } = invalidArgsText({
      api: 'shell(thickness, { face })',
      path: 'thickness',
      requires: 'a finite number > 0',
      unit: 'mm',
      example: "box(40, 30, 10).shell(2, { face: 'top' })",
    });
    expect(message).toContain('got nothing');
  });
});

describe('describeArgValue', () => {
  it('preserves NaN and Infinity instead of JSON\'s null', () => {
    expect(describeArgValue(Number.NaN)).toBe('NaN');
    expect(describeArgValue(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });

  it('appends the JS type when the type is the problem', () => {
    expect(describeArgValue('3.4', true)).toBe('"3.4" (string)');
    expect(describeArgValue(null, true)).toBe('null (null)');
    expect(describeArgValue([1, 2], true)).toBe('[1, 2] (array)');
    expect(describeArgValue(undefined, true)).toBe('undefined (undefined)');
  });

  it('truncates a long value so the requirement and example survive', () => {
    const long = Array.from({ length: 400 }, (_, i) => i);
    const rendered = describeArgValue(long);
    expect(rendered.length).toBeLessThanOrEqual(MAX_GOT_CHARS);
    expect(rendered.endsWith('…')).toBe(true);
  });

  it('truncates pre-rendered received text too', () => {
    const { message } = invalidArgsText({
      api: 'extrudePolygon(points, depth)',
      path: 'points',
      gotText: 'x'.repeat(500),
      requires: 'a closed, non-self-intersecting point list',
      example: 'extrudePolygon([[0, 0], [20, 0], [20, 10], [0, 10]], 5)',
    });
    expect(message).toContain('…');
    expect(message).toContain('Example: extrudePolygon(');
  });
});
