// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { fitSheet, frameRect, sheetMarkup, zoomAt } from './drawingSheetCamera';
import { clientToSheet, edgeNearPoint, type TaggedView } from './drawingSheetHit';

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

const front: TaggedView = { view: 'front', tx: 10, ty: 20, s: 1, segments: [[0, 5, 40, 5]] };

describe('edge hit testing', () => {
  it('picks the straight edge under the pointer and lifts it onto the view plane', () => {
    const hit = edgeNearPoint([front], 30, 15, 2);
    expect(hit).toMatchObject({ view: 'front', from: [0, 0, 5], to: [40, 0, 5], label: '40', sheet: [[10, 15], [50, 15]] });
  });

  it('ignores a click farther than the slop and a short edge', () => {
    expect(edgeNearPoint([front], 30, 30, 8)).toBeNull();
    expect(edgeNearPoint([{ view: 'front', tx: 0, ty: 0, s: 1, segments: [[0, 0, 0.2, 0]] }], 0.1, 0, 8)).toBeNull();
  });

  it('prefers the closer of two edges', () => {
    const hit = edgeNearPoint([{
      view: 'front', tx: 10, ty: 20, s: 1, segments: [[0, 5, 40, 5], [0, 0, 0, 20]],
    }], 12, 18, 8);
    expect(hit?.from).toEqual([0, 0, 0]);
    expect(hit?.to).toEqual([0, 0, 20]);
  });

  it('maps a pointer through the svg viewBox', () => {
    const svg = {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }),
      viewBox: { baseVal: { x: 0, y: 0, width: 200, height: 100 } },
    };
    expect(clientToSheet(svg, 40, 45)).toEqual({ x: 30, y: 25 });
    expect(clientToSheet({ ...svg, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 100 }) }, 1, 1)).toBeNull();
  });
});
