// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/additiveNoOp.test.ts
import { describe, it, expect } from 'vitest';
import { intersectionEmptyDiagnostic, emptyResultDiagnostic } from './additiveNoOp';

// Additive/primitive post-condition guards — the analog of subtractiveNoOp but
// only for cases that CANNOT have a legitimate empty/zero result.
//
//  - intersection of disjoint bodies: the requested common volume is empty,
//    which is unambiguous breakage (the bodies don't overlap).
//  - a solid primitive (box/cylinder/sphere/extrude/revolve/loft/sweep) that
//    lowers to an empty/zero-volume shape: degenerate, unambiguous breakage.
//
// These are pure helpers returning the diagnostic to emit, or null when the
// result is a legitimate non-empty solid.
describe('intersectionEmptyDiagnostic', () => {
  it('returns null when the intersection produced overlap volume', () => {
    const d = intersectionEmptyDiagnostic({ featureId: 'boolean_1', volumeAfter: 64, isEmpty: false });
    expect(d).toBeNull();
  });

  it('returns an error when the intersection is empty (disjoint bodies)', () => {
    const d = intersectionEmptyDiagnostic({ featureId: 'boolean_1', volumeAfter: 0, isEmpty: true });
    expect(d).not.toBeNull();
    expect(d?.severity).toBe('error');
    expect(d?.code).toBe('feature.intersection-empty');
    expect(d?.featureId).toBe('boolean_1');
    expect(d?.message).toMatch(/intersection/i);
  });

  it('returns an error when the intersection has a face but zero volume', () => {
    // A purely tangential/coplanar intersection yields a non-solid (a shared
    // face or edge), which is not the requested common solid volume.
    const d = intersectionEmptyDiagnostic({ featureId: 'boolean_1', volumeAfter: 0, isEmpty: false });
    expect(d).not.toBeNull();
    expect(d?.code).toBe('feature.intersection-empty');
  });

  it('tolerates a tiny but non-zero overlap volume', () => {
    // tol = 1e-6; a 1e-3 overlap is real material.
    const d = intersectionEmptyDiagnostic({ featureId: 'boolean_1', volumeAfter: 1e-3, isEmpty: false });
    expect(d).toBeNull();
  });
});

describe('emptyResultDiagnostic', () => {
  it('returns null for a normal solid primitive', () => {
    const d = emptyResultDiagnostic({ featureId: 'box_1', opLabel: 'box', volumeAfter: 1000, isEmpty: false });
    expect(d).toBeNull();
  });

  it('returns an error when a primitive lowers to an empty shape', () => {
    const d = emptyResultDiagnostic({ featureId: 'box_1', opLabel: 'box', volumeAfter: 0, isEmpty: true });
    expect(d).not.toBeNull();
    expect(d?.severity).toBe('error');
    expect(d?.code).toBe('feature.empty-result');
    expect(d?.featureId).toBe('box_1');
    expect(d?.message).toMatch(/box/);
  });

  it('returns an error when a primitive has faces but zero volume (degenerate)', () => {
    const d = emptyResultDiagnostic({ featureId: 'extrude_1', opLabel: 'extrude', volumeAfter: 0, isEmpty: false });
    expect(d).not.toBeNull();
    expect(d?.code).toBe('feature.empty-result');
  });

  it('tolerates a tiny but non-zero solid volume', () => {
    const d = emptyResultDiagnostic({ featureId: 'cylinder_1', opLabel: 'cylinder', volumeAfter: 1e-3, isEmpty: false });
    expect(d).toBeNull();
  });
});
