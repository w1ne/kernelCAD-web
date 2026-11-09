// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { SHEETS, SHEET_SERIES } from './drawingLayout';
import type { DrawingSheetSize, DrawingViewName, ProjectionAngle, SheetLayout, SheetSpec, ViewBox2 } from './drawingLayout';
import { FULL_TITLE_BLOCK } from './drawingTitleBlock';
import { isFrontOnlyDrawing, selectedDrawingLayout } from './drawingViewSelection';
import type { SvgDrawingOptions } from './exportSvgDrawing';
import type { Box } from './drawingObstacles';

/** Height reserved for a section row on named, standard sheets. */
export const SECTION_BAND_H = 70;
/**
 * Resolve the sheet: a named size as-is, or for `'auto'` / `'auto-ansi'` the
 * smallest sheet of the series whose view grid reaches 1:1, else the largest.
 *
 * Returns the grid region (`sheet`) and the drawn page. With the compact
 * title block they are the same size and section views grow the page
 * downward (the historical svg-drawing behaviour). The full title block
 * (`options.titleBlock`) means a standard sheet: it is swapped into the
 * spec, and section views take their band out of the grid region so the
 * page keeps the named size.
 */
export function resolveSheet(
  options: SvgDrawingOptions,
  boxes: Record<DrawingViewName, ViewBox2>,
  projection: ProjectionAngle,
  hasSections: boolean,
): { sheet: SheetSpec; page: SheetSpec; size: DrawingSheetSize } {
  const standard = options.titleBlock !== undefined;
  const resolve = (size: DrawingSheetSize): { sheet: SheetSpec; page: SheetSpec; size: DrawingSheetSize } => {
    const base = standard ? { ...SHEETS[size], titleBlock: { ...FULL_TITLE_BLOCK } } : SHEETS[size];
    if (!hasSections) return { sheet: base, page: base, size };
    return standard
      ? { sheet: { ...base, h: base.h - SECTION_BAND_H }, page: base, size }
      : { sheet: base, page: { ...base, h: base.h + SECTION_BAND_H }, size };
  };
  const requested = options.sheet ?? 'a4';
  if (requested !== 'auto' && requested !== 'auto-ansi') {
    if (!(requested in SHEETS)) {
      throw new Error(
        `drawing sheet '${String(requested)}' is not a sheet size; use one of ${Object.keys(SHEETS).join(', ')}, auto, auto-ansi.`,
      );
    }
    return resolve(requested);
  }
  const series = SHEET_SERIES[requested === 'auto' ? 'iso' : 'ansi'];
  for (const size of series) {
    const r = resolve(size);
    const frontOnly = isFrontOnlyDrawing(options.views);
    const layout = selectedDrawingLayout(frontOnly, boxes, r.sheet, projection);
    if (layout.scale >= 1) return r;
  }
  return resolve(series[series.length - 1]!);
}


/**
 * Vertical move (sheet mm, down positive) of the orthographic views that
 * brings them and their labels inside the frame and clear of the
 * title-block band — the region the automatic placer counts as free — when
 * they spill over one side and the other side has the room. Labels of the
 * isometric cell (it does not move) are left out. 0 when nothing spills or
 * the move cannot fit.
 */
export function gridShift(sheet: SheetSpec, layout: SheetLayout, labels: readonly Box[]): number {
  // The placer's free region, less its label padding.
  const top = sheet.margin + 2;
  const bottom = sheet.h - sheet.margin - sheet.titleBlock.h - 2;
  const iso = layout.views.iso.box;
  const inIsoCell = (b: Box) => {
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    return cx >= iso.x && cx <= iso.x + iso.w && cy >= iso.y && cy <= iso.y + iso.h + ISO_CAPTION_BAND;
  };
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const b of labels) {
    if (inIsoCell(b)) continue;
    y0 = Math.min(y0, b.y0);
    y1 = Math.max(y1, b.y1);
  }
  for (const name of ['front', 'top', 'left'] as const) {
    const b = layout.views[name].box;
    y0 = Math.min(y0, b.y);
    y1 = Math.max(y1, b.y + b.h);
  }
  if (y1 > bottom && y0 - (y1 - bottom) >= top) return -(y1 - bottom);
  if (y0 < top && y1 + (top - y0) <= bottom) return top - y0;
  return 0;
}

/** Depth under the isometric view that holds its caption. */
const ISO_CAPTION_BAND = 8;

