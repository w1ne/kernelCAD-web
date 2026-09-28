// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/candidates.ts

import {
  DATUM_BOX,
  FCF_CELL_H,
  datumBoxCentre,
  datumSymbolToSvg,
  escAttr,
  fcfFrameWidth,
  fcfToSvg,
} from '../drawingAnnotations';
import type { DrawingViewName, Pt2 } from '../drawingLayout';
import { viewBasis } from '../drawingProjection';
import type { V3 } from '../drawingFeatures';
import { FAR_STEMS, fallbackAngles, leaderCallout, orderedAngles, STEMS } from './placement';
import type { Rendered } from './placement';
import { dot } from './vectors';
import type { EdgeLine } from './views';

export function datumRendered(tip: Pt2, angle: number, label: string, stem: number, attrs: string): Rendered {
  const svgText = datumSymbolToSvg(tip, angle, label, stem - 6, attrs);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const ex = tip[0] + ux * stem;
  const ey = tip[1] + uy * stem;
  const { cx, cy } = datumBoxCentre(ex, ey, ux, uy);
  const half = DATUM_BOX / 2;
  return {
    svg: svgText,
    boxes: [{ x0: cx - half, y0: cy - half, x1: cx + half, y1: cy + half }],
    segments: [[tip[0], tip[1], ex, ey]],
  };
}

export function fcfRendered(tip: Pt2, angle: number, cells: string[], stem: number, kind: string): Rendered {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const ex = tip[0] + ux * stem;
  const ey = tip[1] + uy * stem;
  const w = fcfFrameWidth(cells);
  const left = ux >= 0 ? ex : ex - w;
  return {
    svg: fcfToSvg(tip, angle, cells, stem - 7, ` data-kc-auto="${kind}" data-kc-fcf="${escAttr(cells.join(' '))}"`),
    boxes: [{ x0: left, y0: ey - FCF_CELL_H / 2, x1: left + w, y1: ey + FCF_CELL_H / 2 }],
    segments: [[tip[0], tip[1], ex, ey]],
  };
}

/** Anchor points along an edge-on line for the fallback tier, middle first. */
export const FALLBACK_FRACTIONS = [0.5, 0.75, 0.25, 0.9, 0.1, 0.6, 0.4, 0.65, 0.35, 0.8, 0.2, 0.55, 0.45, 0.85, 0.15, 0.7, 0.3, 0.95, 0.05];

/** Frames on leaders off an edge-on line. `wide` gives the fallback tier:
 *  more anchors, steeper tilts and longer leaders. */
export function fcfLineCandidates(
  line: EdgeLine,
  cells: string[],
  kind: string,
  toSheet: (p: V3, view: DrawingViewName) => Pt2,
  wide = false,
): Array<{ render: () => Rendered; penalty: number }> {
  const a = toSheet(line.a, line.view);
  const b = toSheet(line.b, line.view);
  const basis = viewBasis(line.view);
  const normalAngle = Math.atan2(-dot(line.normal, basis.y), dot(line.normal, basis.x));
  const out: Array<{ render: () => Rendered; penalty: number }> = [];
  const fractions = wide ? FALLBACK_FRACTIONS : [0.75, 0.25, 0.9, 0.1, 0.6, 0.4];
  const tilts = wide
    ? [0, Math.PI / 7, -Math.PI / 7, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3]
    : [0, Math.PI / 7, -Math.PI / 7, Math.PI / 4, -Math.PI / 4];
  fractions.forEach((f, fi) => {
    const tip: Pt2 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    tilts.forEach((da, ai) => {
      (wide ? FAR_STEMS : STEMS).forEach(stem => {
        out.push({
          penalty: stem + fi * 3 + ai * 4,
          render: () => fcfRendered(tip, normalAngle + da, cells, stem, kind),
        });
      });
    });
  });
  return out;
}

/** Leader notes off the feature. `wide` gives the fallback tier: every
 *  anchor, every 15° and longer leaders. */
export function noteCandidates(
  targets: readonly Pt2[],
  label: string,
  kind: string,
  view: DrawingViewName,
  outwardAngle: (p: Pt2, view: DrawingViewName) => number,
  wide = false,
): Array<{ render: () => Rendered; penalty: number }> {
  const out: Array<{ render: () => Rendered; penalty: number }> = [];
  // Spread the anchor choice: a handful of distinct targets, most outward first.
  const unique: Pt2[] = [];
  for (const t of targets) {
    if (!unique.some(u => Math.hypot(u[0] - t[0], u[1] - t[1]) < 0.5)) unique.push(t);
  }
  const reps = wide ? unique : unique.slice(0, 12);
  reps.forEach((tip, ri) => {
    const angles = wide ? fallbackAngles(outwardAngle(tip, view)) : orderedAngles(outwardAngle(tip, view)).slice(0, 8);
    angles.forEach((angle, ai) => {
      (wide ? FAR_STEMS : STEMS).forEach(stem => {
        out.push({
          penalty: stem + ai * 4 + ri,
          render: () => leaderCallout(
            tip, angle, stem, label, [],
            `<g class="dim note" data-kc-auto="${kind}" fill="none" stroke="#000" stroke-width="0.18">`,
            true,
          ),
        });
      });
    });
  });
  return out;
}
