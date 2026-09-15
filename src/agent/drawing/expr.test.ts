// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { add, half, num, ref, renderExpr, sub } from './expr';

describe('expr', () => {
  const width = ref('width', 80);
  const inset = ref('hole1X', 10);

  it('folds literals and renders params through the ParamRef method API', () => {
    expect(renderExpr(add(num(2), num(3)))).toBe('5');
    expect(renderExpr(add(num(0), width))).toBe('width');
    expect(renderExpr(sub(width, inset))).toBe('width.subtract(hole1X)');
    expect(renderExpr(add(width, num(2)))).toBe('width.add(2)');
    expect(renderExpr(sub(num(0), inset))).toBe('hole1X.negate()');
    expect(renderExpr(half(width))).toBe('width.divide(2)');
  });

  it('carries the numeric value and collapses a mirror of a mirror', () => {
    expect(sub(width, inset).v).toBe(70);
    const mirrored = sub(width, sub(width, inset));
    expect(renderExpr(mirrored)).toBe('hole1X');
    expect(mirrored.v).toBe(10);
  });
});
