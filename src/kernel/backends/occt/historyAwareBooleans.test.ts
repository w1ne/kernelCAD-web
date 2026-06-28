// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/historyAwareBooleans.test.ts
import { describe, it, expect } from 'vitest';
import { assertBooleanSucceeded } from './historyAwareBooleans';

// A degenerate OCCT boolean (coplanar/tangent tool faces, a tool that misses
// the body) can leave the builder with IsDone()==false / HasErrors()==true
// while Shape() returns the UNMODIFIED body. Reading the result without
// checking status reports a no-op cut as a successful one. assertBooleanSucceeded
// is the guard: it throws so the failure surfaces as a lowering diagnostic
// instead of silently-unchanged geometry.
describe('assertBooleanSucceeded', () => {
  it('does not throw when the builder is done with no errors', () => {
    expect(() => assertBooleanSucceeded({ IsDone: () => true, HasErrors: () => false }, 'cut')).not.toThrow();
  });

  it('does not throw when the builder is done and exposes no HasErrors()', () => {
    // Some OCCT builder bindings do not expose HasErrors(); IsDone() alone must pass.
    expect(() => assertBooleanSucceeded({ IsDone: () => true }, 'fuse')).not.toThrow();
  });

  it('throws when the builder is not done, naming the operation', () => {
    expect(() => assertBooleanSucceeded({ IsDone: () => false }, 'cut')).toThrow(/cut/);
  });

  it('throws when the builder reports errors', () => {
    expect(() => assertBooleanSucceeded({ IsDone: () => true, HasErrors: () => true }, 'intersect')).toThrow(/intersect/);
  });
});
