// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingDimensionSets.ts

import { invalidArgs } from '../../../shared/intent/invalidArgs';
import type { Vec3 } from '../../../shared/intent/types';
import { resolveAnchor } from './drawingAnchors';
import type { DrawingAnchor } from './drawingAnchors';
import { formatDimValue, sheetSizeLabel } from './drawingLayout';
import type { DrawingSheetSize, DrawingViewName, Pt2, SheetSpec, ViewPlacement } from './drawingLayout';
import { projectPointForDrawing } from './drawingProjection';
import type { WorldFramePart } from './sceneToWorldFrame';

export type DimensionTolerance = number | { plus: number; minus: number } | string;

export interface BaselineDimensionAnnotation {
  kind: 'baseline';
  origin: DrawingAnchor;
  targets: DrawingAnchor[];
  axis: 'x' | 'y';
  view?: DrawingViewName;
  side?: 'positive' | 'negative';
  offset?: number;
  tol?: DimensionTolerance;
  prefix?: string;
}

export interface OrdinateDimensionAnnotation {
  kind: 'ordinate';
  origin: DrawingAnchor;
  targets: DrawingAnchor[];
  axis: 'x' | 'y';
  view?: DrawingViewName;
  side?: 'positive' | 'negative';
  offset?: number;
  originLabel?: string;
  prefix?: string;
}

export interface DimensionSetContext {
  parts: readonly WorldFramePart[];
  view: DrawingViewName;
  placement: ViewPlacement;
  scale: number;
  role: string;
  extra: number;
  nextIndex: (view: DrawingViewName, side: string) => number;
  bottomReserve: Record<DrawingViewName, number>;
  rightReserve: Record<DrawingViewName, number>;
}

export interface OrdinateItem {
  coord: number;
  anchor: Pt2;
  label: string;
  isOrigin: boolean;
}

export interface OrdinateLayoutResult {
  svg: string;
  boxes: Array<{ x0: number; y0: number; x1: number; y1: number }>;
  segments: Array<[number, number, number, number]>;
  clearance: number;
}

const DIM_BASE = 8;
const DIM_STEP = 8;
const EXT_GAP = 1;
const EXT_OVER = 1.5;
const ORD_FONT = 3.0;
const ORD_MIN_PITCH = 4.5;
const ORD_TEXT_GAP = 1.2;
const ORD_CHAR_W = 0.62;

const fmt = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function formatTolerance(tol: DimensionTolerance | undefined): string {
  if (tol === undefined) return '';
  if (typeof tol === 'string') return ` ${tol}`;
  if (typeof tol === 'number') return ` ± ${formatDimValue(tol)}`;
  return ` +${formatDimValue(tol.plus)}/−${formatDimValue(tol.minus)}`;
}

function projectToSheet(p: Vec3, view: DrawingViewName, placement: ViewPlacement, scale: number): { model2d: Pt2; sheet: Pt2 } {
  const model2d = projectPointForDrawing(p, view);
  return { model2d, sheet: [placement.tx + model2d[0] * scale, placement.ty - model2d[1] * scale] };
}

function arrowhead(tip: Pt2, dx: number, dy: number): string {
  const L = 2.6, W = 0.45;
  const bx = tip[0] - dx * L, by = tip[1] - dy * L;
  const px = -dy, py = dx;
  return (
    `<path d="M ${fmt(tip[0])} ${fmt(tip[1])} L ${fmt(bx + px * W)} ${fmt(by + py * W)} ` +
    `L ${fmt(bx - px * W)} ${fmt(by - py * W)} Z" fill="#000" stroke="none"/>`
  );
}

function resolveDimSide(axis: 'x' | 'y', side: 'positive' | 'negative' | undefined): 'top' | 'bottom' | 'left' | 'right' {
  if (axis === 'x') return side === 'positive' ? 'top' : 'bottom';
  return side === 'negative' ? 'left' : 'right';
}

function validateDimSet(
  api: string,
  a: { axis: unknown; side?: unknown; targets: unknown; offset?: unknown },
): { axis: 'x' | 'y'; side: 'top' | 'bottom' | 'left' | 'right' } {
  if (a.axis !== 'x' && a.axis !== 'y') {
    invalidArgs({
      api, path: 'axis', got: a.axis, requires: "'x' or 'y'",
      example: "{ kind: 'baseline', axis: 'x', origin: [0,0,0], targets: [[20,0,0]] }",
    });
  }
  if (a.side !== undefined && a.side !== 'positive' && a.side !== 'negative') {
    invalidArgs({
      api, path: 'side', got: a.side, requires: "'positive' or 'negative'",
      example: "{ kind: 'baseline', axis: 'x', side: 'negative', origin: [0,0,0], targets: [[20,0,0]] }",
    });
  }
  if (!Array.isArray(a.targets) || a.targets.length === 0) {
    invalidArgs({
      api, path: 'targets', got: a.targets, requires: 'a non-empty array of DrawingAnchor targets',
      example: "{ kind: 'baseline', axis: 'x', origin: [0,0,0], targets: [[20,0,0], [50,0,0]] }",
    });
  }
  if (a.offset !== undefined && (typeof a.offset !== 'number' || !Number.isFinite(a.offset))) {
    invalidArgs({
      api, path: 'offset', got: a.offset, requires: 'a finite number in mm',
      example: "{ kind: 'ordinate', axis: 'x', offset: 6, origin: [0,0,0], targets: [[20,0,0]] }",
    });
  }
  return { axis: a.axis, side: resolveDimSide(a.axis, a.side) };
}

function sideDirection(side: 'top' | 'bottom' | 'left' | 'right', box: { x: number; y: number; w: number; h: number }): { edge: number; dir: 1 | -1 } {
  if (side === 'top') return { edge: box.y, dir: -1 };
  if (side === 'bottom') return { edge: box.y + box.h, dir: 1 };
  if (side === 'left') return { edge: box.x, dir: -1 };
  return { edge: box.x + box.w, dir: 1 };
}

function resolveDimSetAnchors(
  api: string,
  parts: readonly WorldFramePart[],
  origin: DrawingAnchor,
  targets: readonly DrawingAnchor[],
  view: DrawingViewName,
  placement: ViewPlacement,
  scale: number,
  axis: 'x' | 'y',
): { originPt: Pt2; items: Array<{ targetPt: Pt2; distance: number }> } {
  const o = projectToSheet(resolveAnchor(parts, origin, `${api}.origin`), view, placement, scale);
  const idx = axis === 'x' ? 0 : 1;
  const items = targets.map((t, i) => {
    const p = projectToSheet(resolveAnchor(parts, t, `${api}.targets[${i}]`), view, placement, scale);
    return { targetPt: p.sheet, distance: Math.abs(p.model2d[idx] - o.model2d[idx]) };
  });
  return { originPt: o.sheet, items };
}

function baselineLineFragment(
  axis: 'x' | 'y',
  originPt: Pt2,
  targetPt: Pt2,
  linePos: number,
  dir: 1 | -1,
  label: string,
): string {
  const parts: string[] = [];
  if (axis === 'x') {
    const x1 = originPt[0], x2 = targetPt[0];
    const sign = x2 >= x1 ? 1 : -1;
    const extStart = targetPt[1] + dir * EXT_GAP;
    parts.push(`<line x1="${fmt(x2)}" y1="${fmt(extStart)}" x2="${fmt(x2)}" y2="${fmt(linePos + dir * EXT_OVER)}"/>`);
    parts.push(`<line x1="${fmt(x1)}" y1="${fmt(linePos)}" x2="${fmt(x2)}" y2="${fmt(linePos)}"/>`);
    parts.push(arrowhead([x1, linePos], -sign, 0), arrowhead([x2, linePos], sign, 0));
    parts.push(
      `<text x="${fmt((x1 + x2) / 2)}" y="${fmt(linePos - 1)}" font-size="3.2" ` +
      `text-anchor="middle" fill="#000" stroke="none">${esc(label)}</text>`,
    );
  } else {
    const y1 = originPt[1], y2 = targetPt[1];
    const sign = y2 >= y1 ? 1 : -1;
    const extStart = targetPt[0] + dir * EXT_GAP;
    parts.push(`<line x1="${fmt(extStart)}" y1="${fmt(y2)}" x2="${fmt(linePos + dir * EXT_OVER)}" y2="${fmt(y2)}"/>`);
    parts.push(`<line x1="${fmt(linePos)}" y1="${fmt(y1)}" x2="${fmt(linePos)}" y2="${fmt(y2)}"/>`);
    parts.push(arrowhead([linePos, y1], 0, -sign), arrowhead([linePos, y2], 0, sign));
    const tx = linePos - 1, ty = (y1 + y2) / 2;
    parts.push(
      `<text x="${fmt(tx)}" y="${fmt(ty)}" font-size="3.2" text-anchor="middle" ` +
      `fill="#000" stroke="none" transform="rotate(-90 ${fmt(tx)} ${fmt(ty)})">${esc(label)}</text>`,
    );
  }
  return parts.join('');
}

export function renderBaselineSetSvg(a: BaselineDimensionAnnotation, ctx: DimensionSetContext): string {
  const { axis, side } = validateDimSet(ctx.role, a);
  const { view, placement, extra } = ctx;
  const { originPt, items } = resolveDimSetAnchors(
    ctx.role, ctx.parts, a.origin, a.targets, view, placement, ctx.scale, axis,
  );
  const sorted = [...items].sort((p, q) => p.distance - q.distance);
  const { edge, dir } = sideDirection(side, placement.box);
  const slots = sorted.map(() => ctx.nextIndex(view, side));
  const dists = slots.map(idx => DIM_BASE + idx * DIM_STEP + extra);
  const outerDist = dists[dists.length - 1];
  const outerPos = edge + dir * outerDist;
  if (side === 'bottom') ctx.bottomReserve[view] = Math.max(ctx.bottomReserve[view], outerDist);
  if (side === 'right') ctx.rightReserve[view] = Math.max(ctx.rightReserve[view], outerDist);

  // Single shared origin extension line to the outermost dimension line (ISO 129-1 / ASME Y14.5).
  const sharedOriginExt = axis === 'x'
    ? `<line data-kc-baseline-origin="true" x1="${fmt(originPt[0])}" y1="${fmt(originPt[1] + dir * EXT_GAP)}" x2="${fmt(originPt[0])}" y2="${fmt(outerPos + dir * EXT_OVER)}"/>`
    : `<line data-kc-baseline-origin="true" x1="${fmt(originPt[0] + dir * EXT_GAP)}" y1="${fmt(originPt[1])}" x2="${fmt(outerPos + dir * EXT_OVER)}" y2="${fmt(originPt[1])}"/>`;

  const prefix = a.prefix ? `${a.prefix} ` : '';
  const suffix = formatTolerance(a.tol);
  const lines = sorted.map((item, i) =>
    baselineLineFragment(axis, originPt, item.targetPt, edge + dir * dists[i], dir, `${prefix}${formatDimValue(item.distance)}${suffix}`),
  );
  return (
    `<g class="dim dim-baseline" data-kc-dim-set="baseline" data-kc-axis="${axis}" ` +
    `fill="none" stroke="#000" stroke-width="0.18">${sharedOriginExt}${lines.join('')}</g>`
  );
}

/** Spread sorted 1D coordinates so every adjacent pair is at least `minPitch`
 *  apart, recentering pushed clusters around their original mean without
 *  invading earlier clusters. */
export function spreadOrdinateCoords(sortedCoords: readonly number[], minPitch = ORD_MIN_PITCH): number[] {
  const n = sortedCoords.length;
  if (n <= 1) return [...sortedCoords];
  const out = [...sortedCoords];
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && out[j + 1] < out[j] + minPitch) {
      out[j + 1] = out[j] + minPitch;
      j++;
    }
    if (j > i) {
      let origSum = 0, pushedSum = 0;
      for (let k = i; k <= j; k++) { origSum += sortedCoords[k]; pushedSum += out[k]; }
      const desiredShift = (origSum - pushedSum) / (j - i + 1);
      const minAllowed = i > 0 ? (out[i - 1] + minPitch) - out[i] : -Infinity;
      const shift = Math.max(desiredShift, minAllowed);
      for (let k = i; k <= j; k++) out[k] += shift;
    }
    i = j + 1;
  }
  return out;
}

function ordinateWitness(
  axis: 'x' | 'y',
  item: OrdinateItem,
  labelCoord: number,
  edge: number,
  tipPos: number,
  dir: 1 | -1,
): { svg: string; segs: Array<[number, number, number, number]> } {
  const jogged = Math.abs(labelCoord - item.coord) > 0.05;
  const originAttr = item.isOrigin ? ' data-kc-ordinate-origin="true"' : '';
  const startPerp = (axis === 'x' ? item.anchor[1] : item.anchor[0]) + dir * EXT_GAP;
  if (!jogged) {
    const seg: [number, number, number, number] = axis === 'x'
      ? [item.coord, startPerp, item.coord, tipPos]
      : [startPerp, item.coord, tipPos, item.coord];
    const svg = `<line${originAttr} x1="${fmt(seg[0])}" y1="${fmt(seg[1])}" x2="${fmt(seg[2])}" y2="${fmt(seg[3])}"/>`;
    return { svg, segs: [seg] };
  }
  const span = Math.abs(tipPos - edge);
  const jogStart = edge + dir * Math.min(2.5, span * 0.25);
  const jogEnd = edge + dir * Math.max(span - 3.0, span * 0.65);
  const pts: Pt2[] = axis === 'x'
    ? [[item.coord, startPerp], [item.coord, jogStart], [labelCoord, jogEnd], [labelCoord, tipPos]]
    : [[startPerp, item.coord], [jogStart, item.coord], [jogEnd, labelCoord], [tipPos, labelCoord]];
  const pointsAttr = pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');
  const segs: Array<[number, number, number, number]> = [
    [pts[0][0], pts[0][1], pts[1][0], pts[1][1]],
    [pts[1][0], pts[1][1], pts[2][0], pts[2][1]],
    [pts[2][0], pts[2][1], pts[3][0], pts[3][1]],
  ];
  return { svg: `<polyline${originAttr} data-kc-ordinate-jog="true" points="${pointsAttr}"/>`, segs };
}

function ordinateLabel(
  axis: 'x' | 'y',
  label: string,
  labelCoord: number,
  tipPos: number,
  dir: 1 | -1,
): { svg: string; box: { x0: number; y0: number; x1: number; y1: number }; extent: number } {
  const w = Math.max(label.length, 1) * ORD_FONT * ORD_CHAR_W;
  const extent = ORD_TEXT_GAP + w;
  if (axis === 'x') {
    const tx = labelCoord + ORD_FONT * 0.35;
    const ty = tipPos + dir * ORD_TEXT_GAP;
    const anchor = dir === 1 ? 'end' : 'start';
    const svg =
      `<text x="${fmt(tx)}" y="${fmt(ty)}" font-size="${ORD_FONT}" text-anchor="${anchor}" ` +
      `fill="#000" stroke="none" transform="rotate(-90 ${fmt(tx)} ${fmt(ty)})">${esc(label)}</text>`;
    const y0 = dir === 1 ? ty : ty - w;
    const y1 = dir === 1 ? ty + w : ty;
    return { svg, box: { x0: labelCoord - ORD_FONT * 0.55, y0, x1: labelCoord + ORD_FONT * 0.55, y1 }, extent };
  }
  const tx = tipPos + dir * ORD_TEXT_GAP;
  const ty = labelCoord + ORD_FONT * 0.35;
  const anchor = dir === 1 ? 'start' : 'end';
  const svg =
    `<text x="${fmt(tx)}" y="${fmt(ty)}" font-size="${ORD_FONT}" text-anchor="${anchor}" ` +
    `fill="#000" stroke="none">${esc(label)}</text>`;
  const x0 = dir === 1 ? tx : tx - w;
  const x1 = dir === 1 ? tx + w : tx;
  return { svg, box: { x0, y0: labelCoord - ORD_FONT * 0.55, x1, y1: labelCoord + ORD_FONT * 0.55 }, extent };
}

export function layoutOrdinateSetSvg(input: {
  axis: 'x' | 'y';
  side: 'top' | 'bottom' | 'left' | 'right';
  box: { x: number; y: number; w: number; h: number };
  baseDist: number;
  items: readonly OrdinateItem[];
  extraAttrs?: string;
}): OrdinateLayoutResult {
  const { axis, side, box, baseDist, extraAttrs = '' } = input;
  const sorted = [...input.items].sort((p, q) => p.coord - q.coord);
  const labelCoords = spreadOrdinateCoords(sorted.map(i => i.coord));
  const { edge, dir } = sideDirection(side, box);
  const tipPos = edge + dir * baseDist;
  const parts: string[] = [];
  const boxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
  const segments: Array<[number, number, number, number]> = [];
  let maxExtent = 0;

  sorted.forEach((item, i) => {
    const witness = ordinateWitness(axis, item, labelCoords[i], edge, tipPos, dir);
    const text = ordinateLabel(axis, item.label, labelCoords[i], tipPos, dir);
    parts.push(witness.svg, text.svg);
    segments.push(...witness.segs);
    boxes.push(text.box);
    if (text.extent > maxExtent) maxExtent = text.extent;
  });

  const svg =
    `<g class="dim dim-ordinate" data-kc-dim-set="ordinate" data-kc-axis="${axis}"${extraAttrs} ` +
    `fill="none" stroke="#000" stroke-width="0.18">${parts.join('')}</g>`;
  return { svg, boxes, segments, clearance: baseDist + maxExtent + 2 };
}

export function renderOrdinateSetSvg(a: OrdinateDimensionAnnotation, ctx: DimensionSetContext): string {
  const { axis, side } = validateDimSet(ctx.role, a);
  const { view, placement, extra } = ctx;
  const { originPt, items } = resolveDimSetAnchors(
    ctx.role, ctx.parts, a.origin, a.targets, view, placement, ctx.scale, axis,
  );
  const slot = ctx.nextIndex(view, side);
  const baseDist = DIM_BASE + slot * DIM_STEP + extra;
  const idx = axis === 'x' ? 0 : 1;
  const prefix = a.prefix ? `${a.prefix} ` : '';
  const ordItems: OrdinateItem[] = [
    { coord: originPt[idx], anchor: originPt, label: a.originLabel ?? '0', isOrigin: true },
    ...items.map(t => ({
      coord: t.targetPt[idx],
      anchor: t.targetPt,
      label: `${prefix}${formatDimValue(t.distance)}`,
      isOrigin: false,
    })),
  ];
  const laid = layoutOrdinateSetSvg({ axis, side, box: placement.box, baseDist, items: ordItems });
  if (side === 'bottom') ctx.bottomReserve[view] = Math.max(ctx.bottomReserve[view], laid.clearance);
  if (side === 'right') ctx.rightReserve[view] = Math.max(ctx.rightReserve[view], laid.clearance);
  return laid.svg;
}

function isoZoneCols(sheetWidthMm: number): number {
  if (sheetWidthMm >= 1000) return 24;
  if (sheetWidthMm >= 700) return 16;
  if (sheetWidthMm >= 500) return 12;
  if (sheetWidthMm >= 350) return 8;
  return 6;
}

const ISO_ZONE_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** ISO 5457 zone reference border frame: vertical zone letters (A..D),
 *  horizontal zone numbers (1..N), centering ticks, and margin sheet-size stamp. */
export function zoneGridSvg(sheet: SheetSpec, sheetSize: DrawingSheetSize): string {
  const { w, h, margin } = sheet;
  const band = Math.min(5, Math.max(3, margin - 2));
  const outer = margin - band;
  const innerW = w - 2 * margin;
  const innerH = h - 2 * margin;
  const cols = isoZoneCols(w);
  const rows = ISO_ZONE_LETTERS.length;
  const colW = innerW / cols;
  const rowH = innerH / rows;
  const font = 2.6;
  const parts: string[] = [
    `<rect x="${fmt(outer)}" y="${fmt(outer)}" width="${fmt(w - 2 * outer)}" height="${fmt(h - 2 * outer)}"/>`,
    // Corner dividers closing the four corner cells.
    `<line x1="${fmt(margin)}" y1="${fmt(outer)}" x2="${fmt(margin)}" y2="${fmt(margin)}"/>`,
    `<line x1="${fmt(w - margin)}" y1="${fmt(outer)}" x2="${fmt(w - margin)}" y2="${fmt(margin)}"/>`,
    `<line x1="${fmt(margin)}" y1="${fmt(h - margin)}" x2="${fmt(margin)}" y2="${fmt(h - outer)}"/>`,
    `<line x1="${fmt(w - margin)}" y1="${fmt(h - margin)}" x2="${fmt(w - margin)}" y2="${fmt(h - outer)}"/>`,
    `<line x1="${fmt(outer)}" y1="${fmt(margin)}" x2="${fmt(margin)}" y2="${fmt(margin)}"/>`,
    `<line x1="${fmt(outer)}" y1="${fmt(h - margin)}" x2="${fmt(margin)}" y2="${fmt(h - margin)}"/>`,
    `<line x1="${fmt(w - margin)}" y1="${fmt(margin)}" x2="${fmt(w - outer)}" y2="${fmt(margin)}"/>`,
    `<line x1="${fmt(w - margin)}" y1="${fmt(h - margin)}" x2="${fmt(w - outer)}" y2="${fmt(h - margin)}"/>`,
  ];

  const topY = outer + band / 2 + font * 0.35;
  const botY = h - margin + band / 2 + font * 0.35;
  for (let i = 0; i < cols; i++) {
    if (i > 0) {
      const x = margin + i * colW;
      parts.push(`<line x1="${fmt(x)}" y1="${fmt(outer)}" x2="${fmt(x)}" y2="${fmt(margin)}"/>`);
      parts.push(`<line x1="${fmt(x)}" y1="${fmt(h - margin)}" x2="${fmt(x)}" y2="${fmt(h - outer)}"/>`);
    }
    const cx = margin + (i + 0.5) * colW;
    const num = String(i + 1);
    parts.push(`<text x="${fmt(cx)}" y="${fmt(topY)}" font-size="${font}" text-anchor="middle" fill="#000" stroke="none">${num}</text>`);
    parts.push(`<text x="${fmt(cx)}" y="${fmt(botY)}" font-size="${font}" text-anchor="middle" fill="#000" stroke="none">${num}</text>`);
  }

  const leftX = outer + band / 2;
  const rightX = w - margin + band / 2;
  for (let j = 0; j < rows; j++) {
    if (j > 0) {
      const y = margin + j * rowH;
      parts.push(`<line x1="${fmt(outer)}" y1="${fmt(y)}" x2="${fmt(margin)}" y2="${fmt(y)}"/>`);
      parts.push(`<line x1="${fmt(w - margin)}" y1="${fmt(y)}" x2="${fmt(w - outer)}" y2="${fmt(y)}"/>`);
    }
    const cy = margin + (j + 0.5) * rowH + font * 0.35;
    const letter = ISO_ZONE_LETTERS[j];
    parts.push(`<text x="${fmt(leftX)}" y="${fmt(cy)}" font-size="${font}" text-anchor="middle" fill="#000" stroke="none">${letter}</text>`);
    parts.push(`<text x="${fmt(rightX)}" y="${fmt(cy)}" font-size="${font}" text-anchor="middle" fill="#000" stroke="none">${letter}</text>`);
  }

  const stampFont = 2.2;
  const stampY = h - outer / 2 + stampFont * 0.35;
  const stampText = `${sheetSizeLabel(sheetSize)} (${formatDimValue(w)}×${formatDimValue(h)})`;
  parts.push(
    `<text x="${fmt(outer)}" y="${fmt(stampY)}" font-size="${stampFont}" text-anchor="start" ` +
    `fill="#000" stroke="none" data-kc-sheet-stamp="true">${esc(stampText)}</text>`,
  );

  return (
    `<g id="zone-grid" data-kc-zone-grid="iso5457" data-kc-zone-cols="${cols}" data-kc-zone-rows="${rows}" ` +
    `fill="none" stroke="#000" stroke-width="0.25">${parts.join('')}</g>`
  );
}
