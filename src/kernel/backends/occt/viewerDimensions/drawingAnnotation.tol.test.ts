// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { declaredDrawingAnnotation } from './drawingAnnotation';

describe('declared linear tolerance suffix', () => {
  const linear = { kind: 'linear' as const, from: [0, 0, 0] as const, to: [10, 0, 0] as const };

  it('renders a symmetric zone as a bilateral number', () => {
    expect(declaredDrawingAnnotation([], { ...linear, tol: { upper: 0.1, lower: -0.1 } })).toMatchObject({ tol: 0.1 });
  });

  it('renders an asymmetric zone as plus and minus magnitudes', () => {
    expect(declaredDrawingAnnotation([], { ...linear, tol: { upper: 0.2, lower: 0 } }))
      .toMatchObject({ tol: { plus: 0.2, minus: 0 } });
  });

  it('leaves a dimension with no tolerance unchanged', () => {
    expect(declaredDrawingAnnotation([], linear)).not.toHaveProperty('tol');
  });
});
