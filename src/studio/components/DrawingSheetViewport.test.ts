// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { fitSheet, frameRect, sheetMarkup, zoomAt } from './DrawingSheetViewport';

describe('drawing sheet camera', () => {
  it('zooms toward the pointer', () => {
    const next = zoomAt({ x: 0, y: 0, scale: 1 }, 100, 50, 2);
    expect(next.scale).toBe(2);
    expect(next.x).toBe(-100);
    expect(next.y).toBe(-50);
  });

  it('fits the sheet inside the viewport', () => {
    const view = fitSheet(200, 100, 100, 100, 0);
    expect(view.scale).toBe(1);
    expect(view.x).toBe(50);
    expect(view.y).toBe(0);
  });

  it('frames an annotation in the middle of the viewport', () => {
    const view = frameRect(200, 100, { x: 0, y: 0, width: 10, height: 10 }, 0);
    expect(view.scale).toBe(8);
    expect(view.x).toBe(100 - 5 * 8);
    expect(view.y).toBe(50 - 5 * 8);
  });

  it('strips scripts and inline handlers from a sheet', () => {
    const clean = sheetMarkup('<svg><script>alert(1)</script><g onclick="evil()"></g></svg>');
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('<g');
  });
});
