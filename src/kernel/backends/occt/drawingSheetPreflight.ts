// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Deterministic geometric preflight for projected drawing views. This checks
// view bounding boxes, not annotation glyphs or GD&T correctness. It is not
// a manufacturing certification.

import type { DrawingViewName, SheetLayout, SheetSpec } from './drawingLayout';

type Rect = { x: number; y: number; w: number; h: number };

export type SheetPlacementIssueKind =
  | 'non-finite-view'
  | 'outside-frame'
  | 'view-overlap'
  | 'title-block-overlap'
  | 'general-tolerance-overlap';

export interface SheetPlacementIssue {
  kind: SheetPlacementIssueKind;
  views: DrawingViewName[];
}

export interface SheetPlacementReview {
  status: 'clear' | 'issues';
  checkedViews: DrawingViewName[];
  issues: SheetPlacementIssue[];
}

/** Ignore sub-0.01 mm numerical contact; coincident edges are not overlaps. */
const EPS_MM = 0.01;

function overlaps(a: Rect, b: Rect): boolean {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > EPS_MM
    && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > EPS_MM;
}

function finiteRect(r: Rect): boolean {
  return [r.x, r.y, r.w, r.h].every(Number.isFinite) && r.w >= 0 && r.h >= 0;
}

function insideFrame(r: Rect, sheet: SheetSpec): boolean {
  const minX = sheet.margin;
  const minY = sheet.margin;
  return r.x >= minX - EPS_MM && r.y >= minY - EPS_MM
    && r.x + r.w <= sheet.w - minX + EPS_MM
    && r.y + r.h <= sheet.h - minY + EPS_MM;
}

/** Check only actually rendered views, never the alias placements of front-only drawings. */
export function reviewSheetViewPlacement(
  layout: SheetLayout,
  sheet: SheetSpec,
  visibleViews: readonly DrawingViewName[],
  hasGeneralTolerance = false,
): SheetPlacementReview {
  const issues: SheetPlacementIssue[] = [];
  const checkedViews = [...visibleViews];
  const title: Rect = {
    x: sheet.w - sheet.margin - sheet.titleBlock.w,
    y: sheet.h - sheet.margin - sheet.titleBlock.h,
    ...{ w: sheet.titleBlock.w, h: sheet.titleBlock.h },
  };
  const tolerance: Rect = { x: title.x - 46, y: title.y, w: 46, h: title.h };
  const valid: DrawingViewName[] = [];

  for (const name of checkedViews) {
    const r = layout.views[name]?.box;
    if (!r || !finiteRect(r) || !Number.isFinite(layout.scale) || layout.scale <= 0) {
      issues.push({ kind: 'non-finite-view', views: [name] });
      continue;
    }
    valid.push(name);
    if (!insideFrame(r, sheet)) issues.push({ kind: 'outside-frame', views: [name] });
    if (overlaps(r, title)) issues.push({ kind: 'title-block-overlap', views: [name] });
    if (hasGeneralTolerance && overlaps(r, tolerance)) {
      issues.push({ kind: 'general-tolerance-overlap', views: [name] });
    }
  }

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i]!;
      const b = valid[j]!;
      if (overlaps(layout.views[a].box, layout.views[b].box)) {
        issues.push({ kind: 'view-overlap', views: [a, b] });
      }
    }
  }

  return { status: issues.length ? 'issues' : 'clear', checkedViews, issues };
}
