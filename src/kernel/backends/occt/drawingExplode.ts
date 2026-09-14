// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingExplode.ts
//
// Balloons, explode-direction traces, and parts-list table for svg-drawing.

import { detectLabelOverlaps } from './drawingAnnotations';
import { projectPointForDrawing } from './drawingProjection';
import type { ViewPlacement } from './drawingLayout';
import type { WorldFramePart } from './sceneToWorldFrame';

export interface DrawingBomRow {
  item: number;
  name: string;
  quantity: number;
  material: string | null;
  instancePaths: string[];
}

const round3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function partCentroid(part: WorldFramePart): [number, number, number] {
  const bb = part.shape.boundingBox({ exact: true });
  return [
    (bb.min[0] + bb.max[0]) / 2,
    (bb.min[1] + bb.max[1]) / 2,
    (bb.min[2] + bb.max[2]) / 2,
  ];
}

export function partCentroids(parts: readonly WorldFramePart[]): Map<string, [number, number, number]> {
  const m = new Map<string, [number, number, number]>();
  for (const p of parts) m.set(p.name, partCentroid(p));
  return m;
}

function toSheet(p: ViewPlacement, mx: number, my: number, scale: number): [number, number] {
  return [p.tx + mx * scale, p.ty - my * scale];
}

const BALLOON_R = 3.4;
const LEADER_BASE = -Math.PI / 4;
const LEADER_STEP = -Math.PI / 6;

export function balloonAndTraceSvg(args: {
  assembledCentroids: ReadonlyMap<string, [number, number, number]>;
  explodedCentroids: ReadonlyMap<string, [number, number, number]>;
  bomRows: readonly DrawingBomRow[];
  iso: ViewPlacement;
  scale: number;
}): { svg: string; fragments: string[] } {
  const { assembledCentroids, explodedCentroids, bomRows, iso, scale } = args;
  const cx = iso.box.x + iso.box.w / 2;
  const cy = iso.box.y + iso.box.h / 2;
  const reach = Math.max(iso.box.w, iso.box.h) / 2 + 16;
  const fragments: string[] = [];
  const traces: string[] = [];

  bomRows.forEach((row, i) => {
    const instance = row.instancePaths[0] ?? row.name;
    const explodedAt = explodedCentroids.get(instance);
    if (!explodedAt) return;
    const [mx, my] = projectPointForDrawing(explodedAt, 'iso');
    const [tx, ty] = toSheet(iso, mx, my, scale);
    const ang = LEADER_BASE + i * LEADER_STEP;
    const bx = cx + reach * Math.cos(ang);
    const by = cy + reach * Math.sin(ang);
    const balloon =
      `<g class="balloon" data-kc-balloon="${row.item}" data-kc-part="${esc(instance)}">` +
      `<line x1="${round3(tx)}" y1="${round3(ty)}" x2="${round3(bx)}" y2="${round3(by)}" ` +
      `stroke="#000" stroke-width="0.25" fill="none"/>` +
      `<circle cx="${round3(bx)}" cy="${round3(by)}" r="${BALLOON_R}" fill="#fff" stroke="#000" stroke-width="0.35"/>` +
      `<text x="${round3(bx)}" y="${round3(by + 1.1)}" font-size="2.8" text-anchor="middle" ` +
      `fill="#000" stroke="none">${row.item}</text>` +
      `</g>`;
    fragments.push(balloon);

    const assembledAt = assembledCentroids.get(instance);
    if (assembledAt) {
      const [ax, ay] = projectPointForDrawing(assembledAt, 'iso');
      const [sx, sy] = toSheet(iso, ax, ay, scale);
      traces.push(
        `<line class="explode-trace" data-kc-part="${esc(instance)}" ` +
        `x1="${round3(sx)}" y1="${round3(sy)}" x2="${round3(tx)}" y2="${round3(ty)}" ` +
        `stroke="#666" stroke-width="0.2" stroke-dasharray="1.2 0.8" fill="none"/>`,
      );
    }
  });

  const svg =
    (traces.length > 0 ? `<g id="explode-traces" fill="none">${traces.join('')}</g>` : '') +
    (fragments.length > 0 ? `<g id="balloons">${fragments.join('')}</g>` : '');
  return { svg, fragments };
}

export function partsListSvg(args: {
  rows: readonly DrawingBomRow[];
  sheet: { w: number; h: number; margin: number; titleBlock: { w: number; h: number } };
}): { svg: string; fragment: string } {
  const { rows, sheet } = args;
  const colW = [12, sheet.titleBlock.w - 12 - 14 - 28, 14, 28];
  const rowH = 4.4;
  const headerH = 5.2;
  const tableW = sheet.titleBlock.w;
  const tableH = headerH + Math.max(rows.length, 1) * rowH;
  const x = sheet.w - sheet.margin - tableW;
  const y = sheet.h - sheet.margin - sheet.titleBlock.h - tableH - 2;
  const headers = ['ITEM', 'NAME', 'QTY', 'MATERIAL'];
  const cell = (cx: number, cy: number, text: string, size = 2.4, weight = '400') =>
    `<text x="${round3(cx)}" y="${round3(cy)}" font-size="${size}" font-weight="${weight}" fill="#000" stroke="none">${esc(text)}</text>`;

  const lines: string[] = [
    `<rect x="${round3(x)}" y="${round3(y)}" width="${tableW}" height="${round3(tableH)}" fill="#fff" stroke="#000" stroke-width="0.3"/>`,
    `<line x1="${round3(x)}" y1="${round3(y + headerH)}" x2="${round3(x + tableW)}" y2="${round3(y + headerH)}" stroke="#000" stroke-width="0.3"/>`,
  ];
  let cx = x;
  for (let c = 0; c < 3; c++) {
    cx += colW[c]!;
    lines.push(`<line x1="${round3(cx)}" y1="${round3(y)}" x2="${round3(cx)}" y2="${round3(y + tableH)}" stroke="#000" stroke-width="0.2"/>`);
  }
  let hx = x + 1.2;
  headers.forEach((h, i) => {
    lines.push(cell(hx, y + 3.6, h, 2.1, '600'));
    hx += colW[i]!;
  });
  rows.forEach((row, i) => {
    const ry = y + headerH + i * rowH;
    const material = row.material ?? '—';
    const vals = [String(row.item), row.name, String(row.quantity), material];
    let vx = x + 1.2;
    const rowGroup =
      `<g data-kc-bom-item="${row.item}" data-kc-bom-name="${esc(row.name)}" ` +
      `data-kc-bom-qty="${row.quantity}" data-kc-bom-material="${esc(material)}">` +
      vals.map((v, ci) => {
        const t = cell(vx, ry + 3.2, v);
        vx += colW[ci]!;
        return t;
      }).join('') +
      `</g>`;
    lines.push(rowGroup);
    if (i + 1 < rows.length) {
      lines.push(
        `<line x1="${round3(x)}" y1="${round3(ry + rowH)}" x2="${round3(x + tableW)}" y2="${round3(ry + rowH)}" stroke="#000" stroke-width="0.15"/>`,
      );
    }
  });
  const fragment = lines.join('');
  const svg = `<g id="parts-list" fill="none">${fragment}</g>`;
  return { svg, fragment };
}

export function explodeLabelOverlaps(fragments: readonly string[]): Array<readonly [number, number]> {
  return detectLabelOverlaps(fragments);
}
