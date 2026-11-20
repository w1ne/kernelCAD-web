// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { computeFrontSheetLayout, computeSheetLayout } from './drawingLayout';
import type { DrawingViewName, ProjectionAngle, SheetLayout, SheetSpec, ViewBox2 } from './drawingLayout';

export const DRAWING_VIEW_NAMES: readonly DrawingViewName[] = ['front', 'top', 'left', 'iso'];

interface ViewSelectionOptions {
  views?: readonly DrawingViewName[];
  annotations?: readonly { view?: DrawingViewName }[];
  balloons?: boolean;
  exploded?: unknown;
  explodedParts?: unknown;
}

export type OrthographicView = Exclude<DrawingViewName, 'iso'>;

export function singleOrthographicView(views?: readonly DrawingViewName[]): OrthographicView | undefined {
  if (views?.length !== 1) return undefined;
  const view = views[0];
  return view === 'front' || view === 'top' || view === 'left' ? view : undefined;
}

export function validateDrawingViewSelection(options: ViewSelectionOptions): OrthographicView | undefined {
  const view = singleOrthographicView(options.views);
  if (view !== undefined) {
    if (options.annotations?.some(a => a.view !== undefined && a.view !== view)) {
      throw new Error(`Single-view drawings require annotations on the ${view} view.`);
    }
    if (options.balloons === true || options.exploded !== undefined || options.explodedParts !== undefined) {
      throw new Error('Balloons and exploded overlays require an isometric view.');
    }
  } else if (options.views !== undefined) {
    const complete = options.views.length === 4 && new Set(options.views).size === 4
      && options.views.every(v => DRAWING_VIEW_NAMES.includes(v));
    if (!complete) throw new Error('Select a single orthographic view or the complete front/top/left/iso set.');
  }
  return view;
}

export function selectedDrawingLayout(
  view: OrthographicView | undefined,
  boxes: Record<DrawingViewName, ViewBox2>,
  sheet: SheetSpec,
  projection: ProjectionAngle,
  scale?: number,
): SheetLayout {
  return view === undefined ? computeSheetLayout(boxes, sheet, projection, scale) : computeFrontSheetLayout(boxes[view], sheet, scale);
}
