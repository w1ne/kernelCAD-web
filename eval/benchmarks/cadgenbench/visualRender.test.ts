// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { formatExtents, sharedFrame } from './visualRender';

describe('candidate preview dimensions', () => {
  it('shows world-axis extents in millimetres with consistent precision', () => {
    expect(formatExtents({ min:[-10,-3,-1], max:[10,7,2.5] })).toBe('Mesh extents: X 20.00  Y 10.00  Z 3.50 mm');
  });
  it('rejects non-finite or inverted bounds rather than showing false dimensions', () => {
    expect(() => formatExtents({ min:[0,0,0], max:[NaN,1,1] })).toThrow();
    expect(() => formatExtents({ min:[2,0,0], max:[1,1,1] })).toThrow();
  });
});

describe('shared comparison frame', () => {
  it('uses the union of both projected bounds for equal scale and position', () => {
    expect(sharedFrame([[0,0,0], [10,4,0]], [[-10,-2,0], [20,2,0]])).toEqual({centerX:5, centerY:1, scale:440/30});
  });
});
