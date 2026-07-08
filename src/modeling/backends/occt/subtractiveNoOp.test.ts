// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/subtractiveNoOp.test.ts
import { describe, it, expect } from 'vitest';
import { subtractiveNoOpDiagnostic } from './subtractiveNoOp';

// A subtractive op (boolean difference / hole / cutout) that leaves the volume
// unchanged means the tool never touched the body (cutter missed, hole off-face,
// blind hole too shallow) — a silent no-op that the kernel otherwise reports as
// success. This pure guard generalizes the embossText no-op check: it returns an
// error diagnostic to emit, or null when material was actually removed.
describe('subtractiveNoOpDiagnostic', () => {
  it('returns null when the operation removed material', () => {
    const d = subtractiveNoOpDiagnostic({
      featureId: 'boolean_1', opLabel: 'boolean difference', volumeBefore: 1000, volumeAfter: 600,
    });
    expect(d).toBeNull();
  });

  it('returns an error diagnostic when the volume is unchanged (tool missed)', () => {
    const d = subtractiveNoOpDiagnostic({
      featureId: 'boolean_1', opLabel: 'boolean difference', volumeBefore: 1000, volumeAfter: 1000,
    });
    expect(d).not.toBeNull();
    expect(d?.severity).toBe('error');
    expect(d?.code).toBe('feature.subtractive-noop');
    expect(d?.featureId).toBe('boolean_1');
    expect(d?.message).toMatch(/boolean difference/);
  });

  it('treats a sub-tolerance decrease as a no-op (relative tolerance)', () => {
    // tol = max(1e-6, 1e9 * 1e-9) = 1; a 0.5 mm³ drop is below tolerance → no-op.
    const d = subtractiveNoOpDiagnostic({
      featureId: 'hole_1', opLabel: 'hole', volumeBefore: 1e9, volumeAfter: 1e9 - 0.5,
    });
    expect(d).not.toBeNull();
  });

  it('treats a decrease above tolerance as material removed', () => {
    // a 2 mm³ drop exceeds the tolerance of 1 → real removal.
    const d = subtractiveNoOpDiagnostic({
      featureId: 'hole_1', opLabel: 'hole', volumeBefore: 1e9, volumeAfter: 1e9 - 2,
    });
    expect(d).toBeNull();
  });
});
