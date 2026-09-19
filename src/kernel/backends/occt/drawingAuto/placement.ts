// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/placement.ts

import { FCF_CELL_H, escAttr, fcfFrameSvg, fcfFrameWidth } from '../drawingAnnotations';
import type { Pt2 } from '../drawingLayout';
import type { Box, Seg } from '../drawingObstacles';
import { round3 } from './vectors';

export const TEXT_H = 3.2;
export const CHAR_W = 0.62;

export function textBox(x: number, y: number, size: number, anchor: 'start' | 'middle' | 'end', text: string): Box {
  const w = Math.max(text.length, 1) * size * CHAR_W;
  const h = size * 1.15;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return { x0: left, y0: y - h * 0.8, x1: left + w, y1: y + h * 0.25 };
}

function arrowheadSvg(tip: Pt2, dx: number, dy: number): string {
  const L = 2.6;
  const W = 0.45;
  const bx = tip[0] - dx * L;
  const by = tip[1] - dy * L;
  return (
    `<path d="M ${round3(tip[0])} ${round3(tip[1])} L ${round3(bx - dy * W)} ${round3(by + dx * W)} ` +
    `L ${round3(bx + dy * W)} ${round3(by - dx * W)} Z" fill="#000" stroke="none"/>`
  );
}

export interface Rendered {
  svg: string;
  boxes: Box[];
  segments: Seg[];
}

const LAND = 3;

/** A leader with a horizontal shoulder, a label past the shoulder, and
 *  optional feature-control-frame rows stacked under the label. */
export function leaderCallout(
  tip: Pt2,
  angle: number,
  stem: number,
  label: string,
  rows: readonly string[][],
  groupOpen: string,
  arrow: boolean,
): Rendered {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const ex = tip[0] + ux * stem;
  const ey = tip[1] + uy * stem;
  const dir = ux >= 0 ? 1 : -1;
  const sx = ex + dir * LAND;
  const tx = sx + dir * 0.8;
  const ty = ey + 1.1;
  const anchor = dir === 1 ? 'start' : 'end';
  const boxes: Box[] = [textBox(tx, ty, TEXT_H, anchor, label)];
  const parts: string[] = [
    `<line x1="${round3(tip[0])}" y1="${round3(tip[1])}" x2="${round3(ex)}" y2="${round3(ey)}"/>`,
    `<line x1="${round3(ex)}" y1="${round3(ey)}" x2="${round3(sx)}" y2="${round3(ey)}"/>`,
  ];
  if (arrow) parts.push(arrowheadSvg(tip, -ux, -uy));
  parts.push(
    `<text x="${round3(tx)}" y="${round3(ty)}" font-size="${TEXT_H}" text-anchor="${anchor}" ` +
    `fill="#000" stroke="none">${escAttr(label)}</text>`,
  );
  rows.forEach((cells, k) => {
    const w = fcfFrameWidth(cells);
    const x = dir === 1 ? tx : tx - w;
    const top = ey + 2.4 + k * FCF_CELL_H;
    parts.push(
      `<g class="dim fcf" data-kc-fcf="${escAttr(cells.join(' '))}">${fcfFrameSvg(x, top, cells)}</g>`,
    );
    boxes.push({ x0: x, y0: top, x1: x + w, y1: top + FCF_CELL_H });
  });
  return {
    svg: `${groupOpen}${parts.join('')}</g>`,
    boxes,
    segments: [[tip[0], tip[1], ex, ey], [ex, ey, sx, ey]],
  };
}

/** Angles (sheet radians, y down) ordered by closeness to `preferred`,
 *  skipping near-vertical leaders whose shoulders read badly. */
export function orderedAngles(preferred: number): number[] {
  const out: Array<{ a: number; d: number }> = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    if (Math.abs(Math.cos(a)) < 0.3) continue;
    let d = Math.abs(a - preferred) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    out.push({ a: a > Math.PI ? a - 2 * Math.PI : a, d });
  }
  return out.sort((p, q) => p.d - q.d || p.a - q.a).map(x => x.a);
}

export const STEMS = [6, 10, 15, 21, 28, 36];
