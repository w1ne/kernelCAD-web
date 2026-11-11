// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  computeFrontSheetLayout,
  computeSheetLayout,
  SHEETS,
  type DrawingViewName,
  type SheetLayout,
  type ViewPlacement,
} from './drawingLayout';
import { reviewSheetViewPlacement } from './drawingSheetPreflight';

const box = (x: number, y: number, w = 30, h = 20): ViewPlacement =>
  ({ tx: 0, ty: 0, box: { x, y, w, h } });

const layout = (overrides: Partial<SheetLayout['views']> = {}): SheetLayout => ({
  scale: 1,
  scaleText: '1:1',
  views: {
    front: box(70, 100),
    top: box(70, 40),
    left: box(20, 100),
    iso: box(170, 40),
    ...overrides,
  },
});
const names: readonly DrawingViewName[] = ['front', 'top', 'left', 'iso'];

describe('drawing sheet geometric preflight', () => {
  it('passes separated views fully inside the frame', () => {
    expect(reviewSheetViewPlacement(layout(), SHEETS.a4, names)).toEqual({
      status: 'clear', checkedViews: names, issues: [],
    });
  });

  it('reports off-sheet views and title-block intrusion separately', () => {
    const r = reviewSheetViewPlacement(layout({ front: box(210, 185, 40, 20) }), SHEETS.a4, names);
    expect(r.issues).toContainEqual({ kind: 'outside-frame', views: ['front'] });
    expect(r.issues).toContainEqual({ kind: 'title-block-overlap', views: ['front'] });
  });

  it('reports true view overlap, but not shared edges', () => {
    expect(reviewSheetViewPlacement(layout({ top: box(85, 110) }), SHEETS.a4, names).issues)
      .toContainEqual({ kind: 'view-overlap', views: ['front', 'top'] });
    expect(reviewSheetViewPlacement(layout({ top: box(100, 100) }), SHEETS.a4, names).issues)
      .not.toContainEqual({ kind: 'view-overlap', views: ['front', 'top'] });
  });

  it('detects general tolerance cell collisions only when the cell is present', () => {
    const positioned = layout({ iso: box(140, 185, 25, 10) });
    expect(reviewSheetViewPlacement(positioned, SHEETS.a4, names, false).issues)
      .not.toContainEqual({ kind: 'general-tolerance-overlap', views: ['iso'] });
    expect(reviewSheetViewPlacement(positioned, SHEETS.a4, names, true).issues)
      .toContainEqual({ kind: 'general-tolerance-overlap', views: ['iso'] });
  });

  it('never treats hidden aliases as rendered views in front-only mode', () => {
    const selected = computeFrontSheetLayout({ x: 0, y: 0, w: 50, h: 30 }, SHEETS.a4);
    expect(reviewSheetViewPlacement(selected, SHEETS.a4, ['front']).issues).toEqual([]);
  });

  it('reports non-finite geometry without throwing or claiming a clean sheet', () => {
    const r = reviewSheetViewPlacement(layout({ front: box(Number.NaN, 20) }), SHEETS.a4, names);
    expect(r.issues).toContainEqual({ kind: 'non-finite-view', views: ['front'] });
    expect(r.status).toBe('issues');
  });

  it('checks actual first- and third-angle layouts at normal scale', () => {
    const views = { front: { x: 0, y: 0, w: 40, h: 30 }, top: { x: 0, y: 0, w: 40, h: 20 },
      left: { x: 0, y: 0, w: 20, h: 30 }, iso: { x: 0, y: 0, w: 48, h: 38 } };
    for (const projection of ['first', 'third'] as const) {
      const actual = computeSheetLayout(views, SHEETS.a3, projection);
      expect(reviewSheetViewPlacement(actual, SHEETS.a3, names).issues).toEqual([]);
    }
  });
});
