// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { straightSpans } from './drawingLayout';
import type { DrawingViewName, Polyline2, SheetLayout, ViewPlacement } from './drawingLayout';
import { DRAWING_VIEW_NAMES as VIEW_NAMES } from './drawingViewSelection';
import type { StyledDrawingView } from './exportSvgDrawing';

const round3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/** Bake one model-space polyline into a sheet-space SVG path `d` string. */
function bakePath(pl: Polyline2, p: ViewPlacement, s: number): string {
  return pl
    .map(([mx, my], i) =>
      `${i === 0 ? 'M' : 'L'} ${round3(p.tx + mx * s)} ${round3(p.ty - my * s)}`)
    .join(' ');
}

function pathGroup(
  cls: string,
  style: string,
  polylines: Polyline2[],
  placement: ViewPlacement,
  scale: number,
  view?: DrawingViewName,
): string {
  const paths = polylines
    .map(pl => `<path d="${bakePath(pl, placement, scale)}"/>`)
    .join('');
  const spans = cls === 'visible' && view !== 'iso' ? polylines.flatMap((pl) => straightSpans(pl)) : [];
  const edges = spans.length
    ? ` data-kc-edges="${spans.map(([a, b]) => [a[0], a[1], b[0], b[1]].map(round3).join(' ')).join(';')}"`
    : '';
  return `<g class="${cls}" ${style}${edges}>${paths}</g>`;
}

const VIEW_LABELS: Record<DrawingViewName, string> = {
  front: 'FRONT',
  top: 'TOP',
  left: 'LEFT',
  iso: 'ISOMETRIC',
};

/** View-groups phase: one styled `<g>` per standard view, with the caption
 *  pushed below any dimension band the view carries. */
export function renderViewGroups(
  styled: Record<DrawingViewName, StyledDrawingView>,
  layout: SheetLayout,
  bottomReserve: Record<DrawingViewName, number>,
  s: number,
  isExploded: boolean,
  names: readonly DrawingViewName[] = VIEW_NAMES,
): string[] {
  return names.map(name => {
    const v = styled[name];
    const p = layout.views[name];
    // A view carrying dimensions underneath must push its caption below the
    // deepest of them, or the two collide. With the automatic bbox dimensions
    // this reserves the front view's single 8 mm band (label at 13 mm), which
    // is exactly where the caption sat before annotations existed.
    const labelOffset = 5 + bottomReserve[name];
    const label =
      `<text class="view-label" x="${round3(p.box.x + p.box.w / 2)}" ` +
      `y="${round3(p.box.y + p.box.h + labelOffset)}" font-size="2.6" text-anchor="middle" ` +
      `fill="#555" stroke="none">${name === 'iso' && isExploded ? 'ISOMETRIC — EXPLODED' : VIEW_LABELS[name]}</text>`;
    return (
      `<g id="view-${name}" data-view="${name}" data-kc-tx="${round3(p.tx)}" data-kc-ty="${round3(p.ty)}" data-kc-s="${round3(s)}" fill="none" stroke="#000" ` +
      `stroke-linecap="round" stroke-linejoin="round">` +
      pathGroup('hidden', 'stroke-width="0.25" stroke-dasharray="1.6 0.8"', v.hidden, p, s) +
      pathGroup('tangent', 'stroke-width="0.13"', v.tangent, p, s) +
      pathGroup('visible', 'stroke-width="0.5"', v.visible, p, s, name) +
      label +
      `</g>`
    );
  });
}
