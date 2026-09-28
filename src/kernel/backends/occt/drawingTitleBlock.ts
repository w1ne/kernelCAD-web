// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingTitleBlock.ts
//
// Title blocks for the engineering-drawing sheet: the compact NAME / SCALE /
// UNITS / DATE block, the full 180 mm block the standard (PDF) sheet uses,
// the first- / third-angle projection symbol, and the general-tolerance cell
// beside them. All coordinates are sheet millimetres, y down.

import { fitTextSize } from '../../export/pdf/helveticaMetrics';
import { KERNELCAD_HOMEPAGE, KERNELCAD_NAME, attributionUrl } from '../../../shared/links/attribution';
import { sheetSizeLabel, type DrawingSheetSize, type ProjectionAngle, type SheetSpec } from './drawingLayout';
import type { SvgDrawingOptions } from './exportSvgDrawing';

const round3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Projection symbol (ISO 5456-2): truncated-cone side view with the end
 *  view's concentric circles beside it. Third angle puts the circles at the
 *  cone's small end (the end they show), first angle at its large end. */
function projectionSymbol(cx: number, cy: number, projection: ProjectionAngle = 'third'): string {
  // Trapezoid (frustum side view): half-heights at its left and right ends.
  const [hl, hr] = projection === 'third' ? [3.4, 1.9] : [1.9, 3.4];
  const trap =
    `<path d="M ${round3(cx - 11)} ${round3(cy - hl)} L ${round3(cx - 4)} ${round3(cy - hr)} ` +
    `L ${round3(cx - 4)} ${round3(cy + hr)} L ${round3(cx - 11)} ${round3(cy + hl)} Z"/>`;
  // End view: two concentric circles right of the side view.
  const circles =
    `<circle cx="${round3(cx + 6.5)}" cy="${round3(cy)}" r="3.4"/>` +
    `<circle cx="${round3(cx + 6.5)}" cy="${round3(cy)}" r="1.9"/>`;
  return `<g class="${projection}-angle-symbol" fill="none" stroke="#000" stroke-width="0.25">${trap}${circles}</g>`;
}

/** "Made with kernelCAD · kernelcad.com", right-aligned at (x, y), linked
 *  to the homepage (a clickable link in the PDF sheet). */
function madeWithLine(x: number, y: number): string {
  const host = new URL(KERNELCAD_HOMEPAGE).host;
  return (
    `<a href="${esc(attributionUrl('drawing'))}">` +
    `<text class="attribution" x="${round3(x)}" y="${round3(y)}" font-size="1.6" text-anchor="end" fill="#555" stroke="none">` +
    `Made with ${esc(KERNELCAD_NAME)} · ${esc(host)}</text></a>`
  );
}

/** Size of the full title block (ISO 7200 caps the width at 180 mm). */
export const FULL_TITLE_BLOCK = { w: 180, h: 36 } as const;

/** General-tolerance cell attached to the left of the title block. */
export function generalToleranceCell(sheet: SheetSpec, note: string): string {
  const { w: tbW, h } = sheet.titleBlock;
  const w = 46;
  const x = sheet.w - sheet.margin - tbW - w;
  const y = sheet.h - sheet.margin - h;
  return (
    `<g id="general-tolerance" fill="none" stroke="#000" stroke-width="0.35">` +
    `<rect x="${round3(x)}" y="${round3(y)}" width="${w}" height="${h}" fill="#fff"/>` +
    `<text x="${round3(x + 1.5)}" y="${round3(y + 3)}" font-size="1.8" fill="#555" stroke="none">GENERAL TOLERANCES</text>` +
    `<text x="${round3(x + 1.5)}" y="${round3(y + h / 2 + 2)}" font-size="3.4" fill="#000" stroke="none">${esc(note)}</text>` +
    `</g>`
  );
}

function titleBlock(
  sheet: SheetSpec,
  fields: { name: string; scaleText: string; units: string; date: string; projection: ProjectionAngle },
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
    projectionSymbol(x + nameW + 16, y + rowH / 2, fields.projection) +
    caption(x + 1.5, y + rowH + 3, 'SCALE') +
    value(x + 1.5, y + h - 3, fields.scaleText) +
    caption(x + cellW2 + 1.5, y + rowH + 3, 'UNITS') +
    value(x + cellW2 + 1.5, y + h - 3, fields.units) +
    caption(x + 2 * cellW2 + 1.5, y + rowH + 3, 'DATE') +
    value(x + 2 * cellW2 + 1.5, y + h - 3, fields.date) +
    `</g>`
  );
}

/**
 * Full title block, bottom-right inside the frame:
 *   | TITLE                                 | projection symbol |
 *   | PART NAME          | MATERIAL         | REV               |
 *   | SCALE  | UNITS     | SHEET  | DATE                         |
 * Values shrink to fit their cell (down to 2 mm) before being truncated.
 */
function fullTitleBlock(
  sheet: SheetSpec,
  fields: {
    title: string; partName: string; material: string; revision: string;
    scaleText: string; units: string; sheetText: string; date: string;
    projection: ProjectionAngle;
  },
): string {
  const { w, h } = FULL_TITLE_BLOCK;
  const x = sheet.w - sheet.margin - w;
  const y = sheet.h - sheet.margin - h;
  const r1 = 14, r2 = 11;
  const y2 = y + r1, y3 = y + r1 + r2;
  const caption = (cx: number, cy: number, t: string) =>
    `<text x="${round3(cx)}" y="${round3(cy)}" font-size="1.8" fill="#555" stroke="none">${esc(t)}</text>`;
  const value = (cx: number, cy: number, cellW: number, t: string, size: number) => {
    const fit = fitTextSize(t, size, cellW - 3, 2);
    return `<text x="${round3(cx)}" y="${round3(cy)}" font-size="${round3(fit.size)}" fill="#000" stroke="none">${esc(fit.text)}</text>`;
  };
  const vline = (lx: number, y0: number, y1: number) =>
    `<line x1="${round3(lx)}" y1="${round3(y0)}" x2="${round3(lx)}" y2="${round3(y1)}"/>`;
  const hline = (ly: number) =>
    `<line x1="${round3(x)}" y1="${round3(ly)}" x2="${round3(x + w)}" y2="${round3(ly)}"/>`;
  // Cells: [left edge, width, caption, value, font size] per row.
  const row2: Array<[number, number, string, string]> = [
    [0, 80, 'PART NAME', fields.partName], [80, 70, 'MATERIAL', fields.material], [150, 30, 'REV', fields.revision],
  ];
  const row3: Array<[number, number, string, string]> = [
    [0, 36, 'SCALE', fields.scaleText], [36, 36, 'UNITS', fields.units],
    [72, 36, 'SHEET', fields.sheetText], [108, 72, 'DATE', fields.date],
  ];
  const cells = (row: Array<[number, number, string, string]>, top: number, rh: number) =>
    row.map(([dx, cw, cap, val]) =>
      (dx > 0 ? vline(x + dx, top, top + rh) : '') +
      caption(x + dx + 1.5, top + 3, cap) +
      value(x + dx + 1.5, top + rh - 2.5, cw, val, 3)).join('');
  return (
    `<g id="title-block" data-kc-title-block="full" fill="none" stroke="#000" stroke-width="0.35">` +
    `<rect x="${round3(x)}" y="${round3(y)}" width="${w}" height="${h}" fill="#fff"/>` +
    hline(y2) + hline(y3) +
    vline(x + 130, y, y2) +
    caption(x + 1.5, y + 3, 'TITLE') +
    value(x + 1.5, y2 - 3, 130, fields.title, 5) +
    projectionSymbol(x + 130 + 25, y + r1 / 2 - 1.2, fields.projection) +
    `<text x="${round3(x + 155)}" y="${round3(y2 - 1.2)}" font-size="1.8" text-anchor="middle" fill="#555" stroke="none">` +
    `${fields.projection === 'first' ? 'FIRST' : 'THIRD'} ANGLE PROJECTION</text>` +
    cells(row2, y2, r2) +
    cells(row3, y3, h - r1 - r2) +
    madeWithLine(x + w - 1.5, y3 + 3) +
    `</g>`
  );
}

/** The compact or the full title block, filled from the options. */
export function sheetTitleBlock(
  sheet: SheetSpec,
  options: SvgDrawingOptions,
  scaleText: string,
  sheetSize: DrawingSheetSize,
  projection: ProjectionAngle,
): string {
  const name = options.modelName ?? 'model';
  const date = options.date ?? '—';
  const tb = options.titleBlock;
  if (tb === undefined) return titleBlock(sheet, { name, scaleText, units: 'mm', date, projection });
  return fullTitleBlock(sheet, {
    title: tb.title ?? name,
    partName: tb.partName ?? name,
    material: tb.material ?? '—',
    revision: tb.revision ?? '—',
    scaleText,
    units: 'mm',
    sheetText: sheetSizeLabel(sheetSize),
    date,
    projection,
  });
}

