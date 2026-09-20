// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importSvgParsing.test.ts
//
// Characterisation tests for `parseTransform`, pinning the current matrix
// outputs, composition order and error messages before the function is split.

import { describe, it, expect } from 'vitest';
import {
  parseTransform,
  apply,
  SvgParseError,
  type Matrix,
} from './importSvgParsing';

const WHERE = '<g> at offset 5';

function failure(fn: () => unknown): SvgParseError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(SvgParseError);
    return e as SvgParseError;
  }
  throw new Error('expected parseTransform to throw');
}

function transformedPoint(m: Matrix, x: number, y: number): [number, number] {
  return apply(m, x, y);
}

describe('parseTransform characterisation', () => {
  it('an empty or whitespace-only spec is the identity', () => {
    expect(parseTransform('', WHERE)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(parseTransform('   ', WHERE)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('translate defaults the missing y to zero', () => {
    expect(parseTransform('translate(10,20)', WHERE)).toEqual([1, 0, 0, 1, 10, 20]);
    expect(parseTransform('translate(10)', WHERE)).toEqual([1, 0, 0, 1, 10, 0]);
  });

  it('scale defaults the missing y to the x factor', () => {
    expect(parseTransform('scale(2,3)', WHERE)).toEqual([2, 0, 0, 3, 0, 0]);
    expect(parseTransform('scale(2)', WHERE)).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it('rotate about the origin matches the closed-form matrix', () => {
    const a = (90 * Math.PI) / 180;
    expect(parseTransform('rotate(90)', WHERE)).toEqual([
      Math.cos(a),
      Math.sin(a),
      -Math.sin(a),
      Math.cos(a),
      0,
      0,
    ]);
  });

  it('rotate with a centre keeps that centre fixed', () => {
    const m = parseTransform('rotate(90, 10, 20)', WHERE);
    expect(transformedPoint(m, 10, 20)[0]).toBeCloseTo(10, 12);
    expect(transformedPoint(m, 10, 20)[1]).toBeCloseTo(20, 12);
    expect(transformedPoint(m, 11, 20)[0]).toBeCloseTo(10, 12);
    expect(transformedPoint(m, 11, 20)[1]).toBeCloseTo(21, 12);
  });

  it('matrix passes its six coefficients through verbatim', () => {
    expect(parseTransform('matrix(1,2,3,4,5,6)', WHERE)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('composes left to right, so the rightmost function applies first', () => {
    const m = parseTransform('translate(10,0) scale(2)', WHERE);
    expect(m).toEqual([2, 0, 0, 2, 10, 0]);
    expect(transformedPoint(m, 1, 1)).toEqual([12, 2]);
  });

  it('a non-numeric argument names the function and the raw argument list', () => {
    const e = failure(() => parseTransform('translate(10,oops)', WHERE));
    expect(e.reason).toBe('malformed-attribute');
    expect(e.message).toBe(
      `${WHERE}: transform 'translate(10,oops)' has a non-numeric argument.`,
    );
  });

  it('matrix with the wrong arity names the count it got', () => {
    const e = failure(() => parseTransform('matrix(1,2,3)', WHERE));
    expect(e.reason).toBe('malformed-attribute');
    expect(e.message).toBe(`${WHERE}: transform 'matrix' needs 6 numbers, got 3.`);
  });

  it('an unsupported function names itself and lists the supported set', () => {
    const e = failure(() => parseTransform('skewX(20)', WHERE));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toBe(
      `${WHERE}: transform function 'skewX(...)' is not supported. ` +
        'Supported: translate, scale, rotate, matrix. Flatten the transform in the source tool.',
    );
  });

  it('text that is not a transform list is refused', () => {
    const e = failure(() => parseTransform('wat', WHERE));
    expect(e.reason).toBe('malformed-attribute');
    expect(e.message).toBe(
      `${WHERE}: transform='wat' is not a sequence of transform functions.`,
    );
  });
});
