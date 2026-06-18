// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/exportSvgDrawing.ts
//
// Engineering-drawing SVG exporter: a standard third-angle sheet with
// front / top / left orthographic views plus an isometric pictorial,
// rendered from OCCT hidden-line-removal projections.
//
// Sheet anatomy (all coordinates in millimetres, y down):
//   - frame border + title block (model name, scale, units, date,
//     third-angle projection symbol) anchored bottom-right.
//   - third-angle arrangement: top view above the front view (shared x
//     mapping), left view to the left of the front view (shared y mapping),
//     isometric in the upper-right cell. One drawing scale for all views,
//     snapped to the standard scale series.
//   - line styling per drafting convention: visible edges solid full-weight,
//     hidden edges dashed half-weight, tangent (smooth-transition) edges
//     thin solid. Hidden tangent edges are omitted — they carry no contour
//     information and only add noise.
//   - overall bounding-box dimensions: width under the front view, height
//     right of the front view, depth left of the top view.
//
// Coincident projected segments (e.g. a through-bore's front and back rims
// landing on the same 2D arc) are deduplicated visible-first, so a segment
// never renders twice and never renders dashed underneath a solid copy.

import { makeCompound, type AnyShape } from 'replicad';
import type { WorldFramePart } from './sceneToWorldFrame';
import {
  makeDrawingCamera,
  projectShapeForDrawing,
} from './drawingProjection';
import {
  SHEETS,
  computeSheetLayout,
  dedupPolylineClasses,
  dimensionToSvg,
  formatDimValue,
  viewBoxOfPolylines,
  type DrawingViewName,
  type LinearDimension,
  type Polyline2,
  type SheetSpec,
  type ViewBox2,
  type ViewPlacement,
} from './drawingLayout';

export interface SvgDrawingOptions {
  format: 'svg-drawing';
  /** Sheet size; default `a4` (landscape 297×210 mm). */
  sheet?: 'a4' | 'a3';
  /** Model name shown in the title block. */
  modelName?: string;
  /** Title-block date text. Defaults to a blank placeholder so the output
   *  stays byte-deterministic; pass an ISO date to stamp it. */
  date?: string;
}

interface StyledView {
  visible: Polyline2[];
  tangent: Polyline2[];
  hidden: Polyline2[];
  box: ViewBox2;
}

const VIEW_NAMES: readonly DrawingViewName[] = ['front', 'top', 'left', 'iso'];

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
): string {
  const paths = polylines
    .map(pl => `<path d="${bakePath(pl, placement, scale)}"/>`)
    .join('');
  return `<g class="${cls}" ${style}>${paths}</g>`;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Third-angle projection symbol: truncated-cone side view (small end
 *  toward the end view) with the end view's concentric circles beside it. */
function thirdAngleSymbol(cx: number, cy: number): string {
  // Trapezoid (frustum side view), small end facing right.
  const trap =
    `<path d="M ${round3(cx - 11)} ${round3(cy - 3.4)} L ${round3(cx - 4)} ${round3(cy - 1.9)} ` +
    `L ${round3(cx - 4)} ${round3(cy + 1.9)} L ${round3(cx - 11)} ${round3(cy + 3.4)} Z"/>`;
  // End view: two concentric circles on the small-end side.
  const circles =
    `<circle cx="${round3(cx + 6.5)}" cy="${round3(cy)}" r="3.4"/>` +
    `<circle cx="${round3(cx + 6.5)}" cy="${round3(cy)}" r="1.9"/>`;
  return `<g class="third-angle-symbol" fill="none" stroke="#000" stroke-width="0.25">${trap}${circles}</g>`;
}

function titleBlock(
  sheet: SheetSpec,
  fields: { name: string; scaleText: string; units: string; date: string },
): string {
  const { w, h } = sheet.titleBlock;
  const x = sheet.w - sheet.margin - w;
  const y = sheet.h - sheet.margin - h;
  const rowH = h / 2;
  const nameW = w - 30;
  const cellW2 = (w - 26) / 2;
  const caption = (cx: number, cy: number, t: string) =>
    `<text x="${round3(cx)}" y="${round3(cy)}" font-size="1.8" fill="#555" stroke="none">${esc(t)}</text>`;
  const value = (cx: number, cy: number, t: string, size = 3) =>
    `<text x="${round3(cx)}" y="${round3(cy)}" font-size="${size}" fill="#000" stroke="none">${esc(t)}</text>`;
  const lines = [
    `<rect x="${round3(x)}" y="${round3(y)}" width="${w}" height="${h}" fill="#fff"/>`,
    `<line x1="${round3(x)}" y1="${round3(y + rowH)}" x2="${round3(x + w)}" y2="${round3(y + rowH)}"/>`,
    // Row 1: NAME | third-angle symbol cell.
    `<line x1="${round3(x + nameW)}" y1="${round3(y)}" x2="${round3(x + nameW)}" y2="${round3(y + rowH)}"/>`,
    // Row 2: SCALE | UNITS | DATE.
    `<line x1="${round3(x + cellW2)}" y1="${round3(y + rowH)}" x2="${round3(x + cellW2)}" y2="${round3(y + h)}"/>`,
    `<line x1="${round3(x + 2 * cellW2)}" y1="${round3(y + rowH)}" x2="${round3(x + 2 * cellW2)}" y2="${round3(y + h)}"/>`,
  ];
  return (
    `<g id="title-block" fill="none" stroke="#000" stroke-width="0.35">` +
    lines.join('') +
    caption(x + 1.5, y + 3, 'NAME') +
    value(x + 1.5, y + rowH - 3, fields.name, 3.4) +
    thirdAngleSymbol(x + nameW + 16, y + rowH / 2) +
    caption(x + 1.5, y + rowH + 3, 'SCALE') +
    value(x + 1.5, y + h - 3, fields.scaleText) +
    caption(x + cellW2 + 1.5, y + rowH + 3, 'UNITS') +
    value(x + cellW2 + 1.5, y + h - 3, fields.units) +
    caption(x + 2 * cellW2 + 1.5, y + rowH + 3, 'DATE') +
    value(x + 2 * cellW2 + 1.5, y + h - 3, fields.date) +
    `</g>`
  );
}

const VIEW_LABELS: Record<DrawingViewName, string> = {
  front: 'FRONT',
  top: 'TOP',
  left: 'LEFT',
  iso: 'ISOMETRIC',
};

/**
 * Render `parts` (one entry for a single body; one per assembly part in
 * world frame for a Scene) as a third-angle engineering-drawing sheet.
 * Multi-part inputs are compounded so the hidden-line pass sees inter-part
 * occlusion. Returns UTF-8 SVG bytes.
 */
export function exportSvgDrawing(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
): Uint8Array {
  if (parts.length === 0) {
    throw new Error('svg-drawing export requires at least one part.');
  }
  const shape: AnyShape =
    parts.length === 1
      ? parts[0].shape.getReplicadShape()
      : makeCompound(parts.map(p => p.shape.getReplicadShape()));

  const sheet = SHEETS[options.sheet ?? 'a4'];
  const [bbMin, bbMax] = shape.boundingBox.bounds;
  const dims = {
    w: bbMax[0] - bbMin[0],
    d: bbMax[1] - bbMin[1],
    h: bbMax[2] - bbMin[2],
  };

  // Project + classify + dedup each view. Class order is the dedup priority:
  // visible full-weight first, then tangent, then hidden — a coincident
  // segment renders once, in its strongest role.
  const styled = {} as Record<DrawingViewName, StyledView>;
  for (const name of VIEW_NAMES) {
    const camera = makeDrawingCamera(name);
    const raw = projectShapeForDrawing(shape, camera, {
      withHidden: name !== 'iso',
    });
    const [vSharp, vOutline, vSmooth, hSharp, hOutline] = dedupPolylineClasses([
      raw.visibleSharp,
      raw.visibleOutline,
      raw.visibleSmooth,
      raw.hiddenSharp,
      raw.hiddenOutline,
      // hiddenSmooth deliberately dropped — tangent hidden lines are noise.
    ]);
    const view: StyledView = {
      visible: [...vSharp, ...vOutline],
      tangent: vSmooth,
      hidden: [...hSharp, ...hOutline],
      box: { x: 0, y: 0, w: 1, h: 1 },
    };
    const box = viewBoxOfPolylines([view.visible, view.tangent, view.hidden]);
    if (box) view.box = box;
    styled[name] = view;
  }

  const layout = computeSheetLayout(
    {
      front: styled.front.box,
      top: styled.top.box,
      left: styled.left.box,
      iso: styled.iso.box,
    },
    sheet,
  );
  const s = layout.scale;

  // --- view groups -------------------------------------------------------
  const viewGroups = VIEW_NAMES.map(name => {
    const v = styled[name];
    const p = layout.views[name];
    // The front view carries the width dimension underneath (at +8 mm) —
    // push its label below the dimension band so they never collide.
    const labelOffset = name === 'front' ? 13 : 5;
    const label =
      `<text class="view-label" x="${round3(p.box.x + p.box.w / 2)}" ` +
      `y="${round3(p.box.y + p.box.h + labelOffset)}" font-size="2.6" text-anchor="middle" ` +
      `fill="#555" stroke="none">${VIEW_LABELS[name]}</text>`;
    return (
      `<g id="view-${name}" data-view="${name}" fill="none" stroke="#000" ` +
      `stroke-linecap="round" stroke-linejoin="round">` +
      pathGroup('hidden', 'stroke-width="0.25" stroke-dasharray="1.6 0.8"', v.hidden, p, s) +
      pathGroup('tangent', 'stroke-width="0.13"', v.tangent, p, s) +
      pathGroup('visible', 'stroke-width="0.5"', v.visible, p, s) +
      label +
      `</g>`
    );
  });

  // --- overall bounding-box dimensions ------------------------------------
  const f = layout.views.front.box;
  const t = layout.views.top.box;
  const dimSpecs: LinearDimension[] = [
    {
      kind: 'horizontal',
      from: [f.x, f.y + f.h],
      to: [f.x + f.w, f.y + f.h],
      linePos: f.y + f.h + 8,
      label: formatDimValue(dims.w),
    },
    {
      kind: 'vertical',
      from: [f.x + f.w, f.y],
      to: [f.x + f.w, f.y + f.h],
      linePos: f.x + f.w + 8,
      label: formatDimValue(dims.h),
    },
    {
      kind: 'vertical',
      from: [t.x, t.y],
      to: [t.x, t.y + t.h],
      linePos: t.x - 8,
      label: formatDimValue(dims.d),
    },
  ];
  const dimensions =
    `<g id="dimensions">` + dimSpecs.map(d => dimensionToSvg(d)).join('') + `</g>`;

  // --- sheet ---------------------------------------------------------------
  const frame =
    `<rect class="frame" x="${sheet.margin}" y="${sheet.margin}" ` +
    `width="${sheet.w - 2 * sheet.margin}" height="${sheet.h - 2 * sheet.margin}" ` +
    `fill="none" stroke="#000" stroke-width="0.35"/>`;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheet.w} ${sheet.h}" ` +
      `width="${sheet.w}mm" height="${sheet.h}mm" font-family="sans-serif" ` +
      `data-kc-format="svg-drawing" data-kc-scale="${layout.scaleText}" data-kc-units="mm">`,
    `<rect x="0" y="0" width="${sheet.w}" height="${sheet.h}" fill="#fff"/>`,
    frame,
    ...viewGroups,
    dimensions,
    titleBlock(sheet, {
      name: options.modelName ?? 'model',
      scaleText: layout.scaleText,
      units: 'mm',
      date: options.date ?? '—',
    }),
    `</svg>`,
  ].join('\n');

  return new TextEncoder().encode(svg);
}
