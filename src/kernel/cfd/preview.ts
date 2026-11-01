// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/preview.ts
//
// Velocity-magnitude preview of the mid-plane cut. The cutting plane is the
// solver's own cell-centred sample (no interpolation), drawn as flat
// polygons with a labelled colour bar, as SVG rasterized by sharp. When the
// cut is very elongated (a long pipe) the short axis is stretched so the
// profile is visible, and the stretch factor is printed on the image: a
// distorted picture must say so.

import sharp from 'sharp';
import type { VtkPlane } from './parsers';
import type { Vec3 } from './types';

/** Perceptually ordered stops (viridis), 0..1. */
const STOPS: Array<[number, [number, number, number]]> = [
  [0, [68, 1, 84]], [0.25, [59, 82, 139]], [0.5, [33, 145, 140]], [0.75, [94, 201, 98]], [1, [253, 231, 37]],
];

export function colormap(t: number): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    const [t0, c0] = STOPS[i - 1];
    if (x <= t1) {
      const f = (x - t0) / (t1 - t0);
      const c = c0.map((v, k) => Math.round(v + f * (c1[k] - v)));
      return `rgb(${c.join(',')})`;
    }
  }
  return 'rgb(253,231,37)';
}

const MAX_ASPECT = 5;

export interface PreviewMeta {
  title: string;
  /** Plane normal; picks the two in-plane axes. */
  normal: Vec3;
}

function axesFor(normal: Vec3): [number, number] {
  const n = normal.map(Math.abs);
  const k = n.indexOf(Math.max(...n));
  return k === 0 ? [1, 2] : k === 1 ? [0, 2] : [0, 1];
}

/** SVG of |U| on the plane. Exported for tests. */
export function planeSvg(plane: VtkPlane, meta: PreviewMeta, width = 1200): { svg: string; maxSpeed: number; stretch: number } {
  const U = plane.cellFields.U;
  const [a, b] = axesFor(meta.normal);
  const xs = plane.points.map(p => p[a]);
  const ys = plane.points.map(p => p[b]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = Math.max(x1 - x0, 1e-12);
  const h = Math.max(y1 - y0, 1e-12);
  const stretch = w / h > MAX_ASPECT ? w / h / MAX_ASPECT : 1;
  const plotW = width - 160;
  const plotH = Math.max(120, Math.round((plotW * h * stretch) / w));
  const sx = plotW / w;
  const sy = plotH / h;
  const mags = plane.polygons.map((_, i) => (U === undefined ? 0 : Math.hypot(U.values[3 * i], U.values[3 * i + 1], U.values[3 * i + 2])));
  const vmax = Math.max(...mags, 1e-30);
  const polys = plane.polygons.map((poly, i) => {
    const pts = poly.map(j => `${(20 + (plane.points[j][a] - x0) * sx).toFixed(1)},${(50 + plotH - (plane.points[j][b] - y0) * sy).toFixed(1)}`).join(' ');
    const c = colormap(mags[i] / vmax);
    return `<polygon points="${pts}" fill="${c}" stroke="${c}" stroke-width="0.6"/>`;
  });
  const barX = 20 + plotW + 30;
  const bar = Array.from({ length: 50 }, (_, i) =>
    `<rect x="${barX}" y="${(50 + (plotH * i) / 50).toFixed(1)}" width="24" height="${(plotH / 50 + 0.8).toFixed(1)}" fill="${colormap(1 - i / 50)}"/>`);
  const H = plotH + 100;
  const axisName = ['X', 'Y', 'Z'];
  const text = (x: number, y: number, s: string, size = 18, anchor = 'start'): string =>
    `<text x="${x}" y="${y}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" fill="#e8e8e8" text-anchor="${anchor}">${s}</text>`;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">`,
    `<rect width="100%" height="100%" fill="#1d1f23"/>`,
    text(20, 32, meta.title, 20),
    ...polys,
    ...bar,
    text(barX + 12, 44, `${vmax.toPrecision(3)} m/s`, 14, 'middle'),
    text(barX + 12, 50 + plotH + 18, '0', 14, 'middle'),
    text(20, 50 + plotH + 26, `|U| on the ${axisName[a]}${axisName[b]} mid-plane, ${(w * 1000).toFixed(1)} x ${(h * 1000).toFixed(1)} mm` +
      (stretch > 1 ? ` (${axisName[b]} stretched ${stretch.toFixed(1)}x for legibility)` : ''), 15),
    text(20, 50 + plotH + 46, 'kernelCAD run_cfd · OpenFOAM simpleFoam · cell values, not interpolated · not a certification', 13),
    '</svg>',
  ].join('\n');
  return { svg, maxSpeed: vmax, stretch };
}

export async function renderPlanePng(plane: VtkPlane, meta: PreviewMeta, outPath: string): Promise<{ maxSpeed: number; stretch: number }> {
  const { svg, maxSpeed, stretch } = planeSvg(plane, meta);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  return { maxSpeed, stretch };
}
