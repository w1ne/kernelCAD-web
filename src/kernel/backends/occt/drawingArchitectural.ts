// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingArchitectural.ts
//
// `style: 'architectural'` drawing sheet: a floor plan instead of the
// mechanical 4-view sheet with datums, flatness and an ISO 2768 note.
//
//   - Plan view: the building is fused, cut by a horizontal plane (default
//     1000 mm above its lowest point), and drawn from above. Cut walls are
//     filled (poché) with a heavy outline; everything below the cut (floor
//     edges, sills, fixtures) is drawn thin from the kept lower half.
//   - Wall / opening dimensions: along each exterior side, a scanline just
//     inside the outermost wall face reads where wall material starts and
//     stops, giving the chain of wall and opening widths, plus the overall
//     length on the bottom and left sides.
//   - Room labels with net area: rooms are the enclosed floor regions of a
//     section. Door openings break walls at the cut height, so rooms are read
//     from the section (among the cut height and 2.0–2.5 m above the base)
//     with the most enclosed regions — above the door heads walls close.
//     Names come from `plan.rooms` ({ name, at: [x, y] }), else ROOM 1..n.
//   - A scale bar, a north arrow (`plan.northDeg`, clockwise from sheet up),
//     and a title block with the architectural scale.
//   - Units: millimetres, or feet-inches when the model is imperial
//     (`plan.units`, else detected from its lengths).
//
// Reuses the drawing pipeline pieces: the exact planar section of
// `sketchFromShapeOps.sectionLoops`, the half-space cut of
// `drawingSections.buildKeptHalf`, the HLR projection of `drawingProjection`
// and the sheet sizes / dimension renderer of `drawingLayout`.

import { makeCompound, measureArea, type AnyShape } from 'replicad';
import type { WorldFramePart } from './sceneToWorldFrame';
import { OcctBackend } from './occtBackend';
import { buildKeptHalf } from './drawingSections';
import { makeDrawingCamera, projectShapeForDrawing } from './drawingProjection';
import {
  SHEETS,
  SHEET_SERIES,
  dedupPolylineClasses,
  dimensionToSvg,
  sheetSizeLabel,
  type DrawingSheetSize,
  type Polyline2,
  type SheetSpec,
} from './drawingLayout';
import { sectionLoops } from './sketchFromShapeOps';
import { cardinalFrame, chainSegments } from './sketchFromShape';
import {
  chainBreakpoints,
  detectPlanUnits,
  detectRooms,
  formatPlanArea,
  formatPlanLength,
  loopToPolygon,
  pickPlanScale,
  pointInPolygon,
  polygonsBBox,
  scaleBarLengthMm,
  scanIntervals,
  type P2,
  type PlanRoom,
  type PlanScale,
  type PlanUnits,
  type Polygon,
} from './drawingPlanGeometry';
import { KernelError } from '../../../shared/intent/kernelError';
import { attributionGenerator } from '../../../shared/links/attribution';
import { fitTextSize } from '../../export/pdf/helveticaMetrics';

export interface ArchitecturalPlanOptions {
  /** 'metric' (mm) or 'imperial' (feet-inches). Default: detected from the
   *  model's lengths (whole inches → imperial). */
  units?: PlanUnits;
  /** Cut height above the finished floor (the top of the largest upward
   *  horizontal face in the model's bottom quarter, else its lowest point),
   *  mm. Default 1000 (metric) or 3'-6" (imperial). */
  cutHeight?: number;
  /** Room names: the room containing `at` ([x, y] world mm) gets `name`. */
  rooms?: ReadonlyArray<{ name: string; at: readonly [number, number] }>;
  /** North arrow direction, degrees clockwise from sheet up. Default 0. */
  northDeg?: number;
}

export interface ArchitecturalSheetOptions {
  sheet?: DrawingSheetSize | 'auto' | 'auto-ansi';
  title?: string;
  modelName?: string;
  date?: string;
  revision?: string;
  plan?: ArchitecturalPlanOptions;
}

export interface ArchitecturalPlanReport {
  units: PlanUnits;
  scale: string;
  /** World Z of the plan cut. */
  cutZ: number;
  /** World Z of the section the rooms were read from. */
  roomZ: number;
  rooms: Array<{ name: string; areaMm2: number; area: string; at: P2 }>;
  /** Chain / overall dimension labels per side. */
  dimensions: Record<'bottom' | 'top' | 'left' | 'right', string[]>;
}

export interface ArchitecturalPlanResult {
  bytes: Uint8Array;
  report: ArchitecturalPlanReport;
}

const DEFAULT_CUT_MM = 1000;
const DEFAULT_CUT_IN = 42;
/** Room-reading sections above the base, tried after the plan cut. */
const ROOM_LEVELS_MM = [2300, 2200, 2500, 2000];
/** Sheet mm reserved around the plan for the dimension rows. */
const DIM_BAND = 26;
const TEXT = 2.5;

const r3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * True when a model is building-sized: a footprint of at least 2.5 m on both
 * horizontal axes and a height of at least 2 m. Used to suggest
 * `style: 'architectural'` for a mechanical sheet.
 */
export function looksLikeBuilding(bbox: { min: readonly number[]; max: readonly number[] }): boolean {
  const w = bbox.max[0] - bbox.min[0];
  const d = bbox.max[1] - bbox.min[1];
  const h = bbox.max[2] - bbox.min[2];
  return w >= 2500 && d >= 2500 && h >= 2000;
}

/** Render the architectural floor-plan sheet for world-frame `parts`. */
export function renderArchitecturalPlan(
  parts: readonly WorldFramePart[],
  options: ArchitecturalSheetOptions,
): ArchitecturalPlanResult {
  if (parts.length === 0) throw new Error('architectural drawing requires at least one part.');
  validatePlanOptions(options.plan);
  const body = fuseParts(parts);
  const bb = body.boundingBox();
  const topZ = bb.max[2];
  const baseZ = floorLevel(body, bb.min[2], topZ);
  // Unit system from the overall size and wall height (whole feet / inches →
  // imperial); it also picks the default cut: 1 m, or 3'-6" imperial.
  const units = options.plan?.units ?? detectPlanUnits([
    bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2], topZ - baseZ,
  ]);
  const cutHeight = options.plan?.cutHeight ?? (units === 'imperial' ? DEFAULT_CUT_IN * 25.4 : DEFAULT_CUT_MM);
  const cutZ = baseZ + cutHeight;
  if (!(cutZ > bb.min[2] && cutZ < topZ)) {
    throw new KernelError(
      'drawing.section.plane-misses-body',
      `architectural plan: the cut at ${r3(cutZ)} mm (cutHeight ${r3(cutHeight)} above the floor at ${r3(baseZ)}) ` +
        `does not pass through the model (Z range [${r3(bb.min[2])}, ${r3(topZ)}]).`,
      undefined,
      'Pass options.plan.cutHeight between 0 and the wall height (mm above the floor).',
    );
  }

  const cutPolys = sectionPolygons(body, cutZ);
  const cutBox = polygonsBBox(cutPolys) ?? { min: [bb.min[0], bb.min[1]] as P2, max: [bb.max[0], bb.max[1]] as P2 };
  const { rooms, roomZ } = readRooms(body, cutZ, baseZ, topZ, cutPolys);

  const sides = exteriorChains(cutPolys, cutBox);

  // Plan extent: the whole footprint seen from above (cut walls + floor).
  const planMin: P2 = [Math.min(bb.min[0], cutBox.min[0]), Math.min(bb.min[1], cutBox.min[1])];
  const planMax: P2 = [Math.max(bb.max[0], cutBox.max[0]), Math.max(bb.max[1], cutBox.max[1])];
  const { sheet, size, scale, origin } = fitSheet(options.sheet, planMin, planMax, units);
  const toSheet = (p: P2): P2 => [origin[0] + (p[0] - planMin[0]) * scale.factor, origin[1] + (planMax[1] - p[1]) * scale.factor];

  const below = belowCutLinework(body, cutZ);
  const named = nameRooms(rooms, options.plan?.rooms);
  const dims = renderDimensions(sides, cutBox, toSheet, units);

  const planH = (planMax[1] - planMin[1]) * scale.factor;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheet.w} ${sheet.h}" width="${sheet.w}mm" height="${sheet.h}mm" ` +
      `font-family="sans-serif" data-kc-format="svg-drawing" data-kc-style="architectural" data-kc-scale="${esc(scale.label)}" ` +
      `data-kc-units="${units === 'imperial' ? 'ft-in' : 'mm'}" data-kc-sheet="${size}" data-kc-generator="${esc(attributionGenerator())}">`,
    `<rect x="0" y="0" width="${sheet.w}" height="${sheet.h}" fill="#fff"/>`,
    `<rect class="frame" x="${sheet.margin}" y="${sheet.margin}" width="${r3(sheet.w - 2 * sheet.margin)}" ` +
      `height="${r3(sheet.h - 2 * sheet.margin)}" fill="none" stroke="#000" stroke-width="0.35"/>`,
    `<g id="plan-below-cut" fill="none" stroke="#000" stroke-width="0.18" stroke-linecap="round">` +
      below.map(pl => `<path d="${polylineD(pl.map(p => toSheet(p)))}"/>`).join('') + `</g>`,
    `<g id="plan-cut" fill="#555" fill-rule="evenodd" stroke="#000" stroke-width="0.5" stroke-linejoin="round">` +
      (cutPolys.length > 0 ? `<path d="${cutPolys.map(p => polygonD(p.map(toSheet))).join(' ')}"/>` : '') + `</g>`,
    `<g id="room-labels" fill="#000" stroke="none" text-anchor="middle">` +
      named.map(r => roomLabelSvg(r, toSheet, units)).join('') + `</g>`,
    `<g id="dimensions">${dims.svg}</g>`,
    northArrowSvg(sheet, options.plan?.northDeg ?? 0),
    scaleBarSvg(sheet, origin, planH, scale, units),
    titleBlockSvg(sheet, size, options, scale, units, cutZ - baseZ),
    `</svg>`,
  ].join('\n');

  return {
    bytes: new TextEncoder().encode(svg),
    report: {
      units,
      scale: scale.label,
      cutZ,
      roomZ,
      rooms: named.map(r => ({ name: r.name, areaMm2: r.areaMm2, area: formatPlanArea(r.areaMm2, units), at: r.labelAt })),
      dimensions: dims.labels,
    },
  };
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** One solid for the whole building, so overlapping walls section as one
 *  region. Falls back to a compound when the union fails. */
function fuseParts(parts: readonly WorldFramePart[]): OcctBackend {
  if (parts.length === 1) return parts[0]!.shape;
  try {
    let fused: OcctBackend = parts[0]!.shape;
    for (let i = 1; i < parts.length; i++) fused = fused.union(parts[i]!.shape);
    return fused;
  } catch {
    const compound: AnyShape = makeCompound(parts.map(p => p.shape.getReplicadShape()));
    return new OcctBackend(compound as never);
  }
}

/**
 * Finished-floor level: the largest upward-facing horizontal face in the
 * bottom quarter of the model (the top of the slab), else the model's lowest
 * point. Cut and room heights are measured from here, so a slab under the
 * walls does not eat into the 1 m plan cut.
 */
function floorLevel(body: OcctBackend, minZ: number, maxZ: number): number {
  const limit = minZ + (maxZ - minZ) / 4;
  let best = { z: minZ, area: 0 };
  for (const face of body.getReplicadShape().faces) {
    try {
      if (face.geomType !== 'PLANE') continue;
      const n = face.normalAt();
      if (n.z < 0.999) continue;
      const z = face.center.z;
      if (z > limit) continue;
      const area = measureArea(face);
      if (area > best.area) best = { z, area };
    } catch {
      // A face that cannot be measured does not decide the floor.
    }
  }
  return best.z;
}

/** Closed loops of the exact horizontal section at `z`, as polygons. */
function sectionPolygons(body: OcctBackend, z: number): P2[][] {
  const loops = sectionLoops(body, cardinalFrame('xy', z));
  return chainSegments(loops.segments, 1e-3).loops.map(loopToPolygon).filter(p => p.length >= 3);
}

/** Rooms from the section with the most enclosed regions: the plan cut
 *  first, then 2.0–2.5 m above the base, where walls close over the doors. */
function readRooms(
  body: OcctBackend,
  cutZ: number,
  baseZ: number,
  topZ: number,
  cutPolys: P2[][],
): { rooms: PlanRoom[]; roomZ: number } {
  let best = { rooms: detectRooms(cutPolys), roomZ: cutZ };
  for (const h of ROOM_LEVELS_MM) {
    const z = baseZ + h;
    if (!(z > cutZ && z < topZ - 1)) continue;
    let rooms: PlanRoom[];
    try {
      rooms = detectRooms(sectionPolygons(body, z));
    } catch {
      continue;
    }
    if (rooms.length > best.rooms.length) best = { rooms, roomZ: z };
  }
  return best;
}

/** Visible edges of the part of the building below the cut, seen from above. */
function belowCutLinework(body: OcctBackend, cutZ: number): Polyline2[] {
  const kept = buildKeptHalf(body, 'z', cutZ);
  const raw = projectShapeForDrawing(kept.getReplicadShape(), makeDrawingCamera('top'), { withHidden: false });
  const [sharp, outline, smooth] = dedupPolylineClasses([raw.visibleSharp, raw.visibleOutline, raw.visibleSmooth]);
  return [...sharp, ...outline, ...smooth];
}

type Side = 'bottom' | 'top' | 'left' | 'right';

/** Wall / opening breakpoints along each exterior side, read by a scanline
 *  just inside the outermost wall face. */
function exteriorChains(polys: readonly Polygon[], box: { min: P2; max: P2 }): Record<Side, number[]> {
  const inset = Math.min(20, (box.max[0] - box.min[0]) / 50, (box.max[1] - box.min[1]) / 50);
  const along = (axis: 'x' | 'y', pos: number) => chainBreakpoints(scanIntervals(polys, axis, pos));
  return {
    bottom: along('x', box.min[1] + inset),
    top: along('x', box.max[1] - inset),
    left: along('y', box.min[0] + inset),
    right: along('y', box.max[0] - inset),
  };
}

function nameRooms(
  rooms: readonly PlanRoom[],
  names: ArchitecturalPlanOptions['rooms'],
): Array<PlanRoom & { name: string }> {
  const out = rooms.map(r => ({ ...r, name: '' }));
  for (const n of names ?? []) {
    const hit = out.find(r => r.name === '' && pointInPolygon([n.at[0], n.at[1]], r.polygon));
    if (hit) hit.name = n.name;
  }
  // Unnamed rooms: ROOM 1..n reading order (top to bottom, left to right).
  const unnamed = out.filter(r => r.name === '').sort((a, b) =>
    Math.abs(b.labelAt[1] - a.labelAt[1]) > 1 ? b.labelAt[1] - a.labelAt[1] : a.labelAt[0] - b.labelAt[0]);
  unnamed.forEach((r, i) => { r.name = `ROOM ${i + 1}`; });
  return out;
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

function fitSheet(
  requested: ArchitecturalSheetOptions['sheet'],
  min: P2,
  max: P2,
  units: PlanUnits,
): { sheet: SheetSpec; size: DrawingSheetSize; scale: PlanScale; origin: P2 } {
  const w = Math.max(max[0] - min[0], 1);
  const h = Math.max(max[1] - min[1], 1);
  const place = (size: DrawingSheetSize) => {
    const sheet = SHEETS[size];
    const availW = sheet.w - 2 * sheet.margin - 2 * DIM_BAND;
    // Bottom: the chain + overall dimension rows, then the title block and
    // scale bar row under them.
    const availH = sheet.h - 2 * sheet.margin - 2 * DIM_BAND - sheet.titleBlock.h - 4;
    const scale = pickPlanScale(Math.min(availW / w, availH / h), units);
    const originX = sheet.margin + DIM_BAND + (availW - w * scale.factor) / 2;
    const originY = sheet.margin + DIM_BAND + (availH - h * scale.factor) / 2;
    return { sheet, size, scale, origin: [originX, originY] as P2 };
  };
  if (requested === 'auto' || requested === 'auto-ansi') {
    // Smallest sheet that holds the plan at 1:100 (1/8" = 1'-0") or larger.
    const series = SHEET_SERIES[requested === 'auto' ? 'iso' : 'ansi'];
    const target = units === 'imperial' ? 1 / 96 : 1 / 100;
    for (const size of series) {
      const fit = place(size);
      if (fit.scale.factor >= target) return fit;
    }
    return place(series[series.length - 1]!);
  }
  return place(requested ?? 'a3');
}

function renderDimensions(
  sides: Record<Side, number[]>,
  box: { min: P2; max: P2 },
  toSheet: (p: P2) => P2,
  units: PlanUnits,
): { svg: string; labels: Record<Side, string[]> } {
  const labels: Record<Side, string[]> = { bottom: [], top: [], left: [], right: [] };
  const parts: string[] = [];
  const row = (side: Side, pts: number[], rowIndex: number) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const label = formatPlanLength(b - a, units);
      labels[side].push(label);
      parts.push(dimensionSvg(side, a, b, rowIndex, box, toSheet, label));
    }
  };
  for (const side of ['bottom', 'top', 'left', 'right'] as const) {
    const pts = sides[side];
    if (pts.length > 2) row(side, pts, 1);
  }
  // Overall length on the bottom and left, outside the chains.
  row('bottom', [box.min[0], box.max[0]], 2);
  row('left', [box.min[1], box.max[1]], 2);
  return { svg: parts.join(''), labels };
}

function dimensionSvg(
  side: Side,
  a: number,
  b: number,
  rowIndex: number,
  box: { min: P2; max: P2 },
  toSheet: (p: P2) => P2,
  label: string,
): string {
  const off = 8 * rowIndex;
  if (side === 'bottom' || side === 'top') {
    const y = side === 'bottom' ? box.min[1] : box.max[1];
    const [x1, sy] = toSheet([a, y]);
    const [x2] = toSheet([b, y]);
    const linePos = side === 'bottom' ? sy + off : sy - off;
    return dimensionToSvg({ kind: 'horizontal', from: [x1, sy], to: [x2, sy], linePos, label: esc(label) }, TEXT);
  }
  const x = side === 'left' ? box.min[0] : box.max[0];
  const [sx, y1] = toSheet([x, a]);
  const [, y2] = toSheet([x, b]);
  const linePos = side === 'left' ? sx - off : sx + off;
  return dimensionToSvg({ kind: 'vertical', from: [sx, y1], to: [sx, y2], linePos, label: esc(label) }, TEXT);
}

function roomLabelSvg(r: PlanRoom & { name: string }, toSheet: (p: P2) => P2, units: PlanUnits): string {
  const [x, y] = toSheet(r.labelAt);
  return (
    `<text class="room-name" x="${r3(x)}" y="${r3(y - 0.6)}" font-size="3" font-weight="bold">${esc(r.name.toUpperCase())}</text>` +
    `<text class="room-area" x="${r3(x)}" y="${r3(y + 3.2)}" font-size="${TEXT}">${esc(formatPlanArea(r.areaMm2, units))}</text>`
  );
}

function northArrowSvg(sheet: SheetSpec, northDeg: number): string {
  const cx = sheet.w - sheet.margin - 14;
  const cy = sheet.margin + 16;
  return (
    `<g id="north-arrow" transform="rotate(${r3(northDeg)} ${r3(cx)} ${r3(cy)})">` +
    `<circle cx="${r3(cx)}" cy="${r3(cy)}" r="7" fill="none" stroke="#000" stroke-width="0.3"/>` +
    `<path d="M ${r3(cx)} ${r3(cy - 7)} L ${r3(cx + 3)} ${r3(cy + 4)} L ${r3(cx)} ${r3(cy + 2)} Z" fill="#000" stroke="none"/>` +
    `<path d="M ${r3(cx)} ${r3(cy - 7)} L ${r3(cx - 3)} ${r3(cy + 4)} L ${r3(cx)} ${r3(cy + 2)} Z" fill="none" stroke="#000" stroke-width="0.3"/>` +
    `<text x="${r3(cx)}" y="${r3(cy - 8.5)}" font-size="3.2" font-weight="bold" text-anchor="middle" fill="#000" stroke="none">N</text>` +
    `</g>`
  );
}

function scaleBarSvg(sheet: SheetSpec, origin: P2, planH: number, scale: PlanScale, units: PlanUnits): string {
  const L = scaleBarLengthMm(scale.factor, units);
  const len = L * scale.factor;
  const x0 = sheet.margin + 8;
  const y0 = Math.min(sheet.h - sheet.margin - 8, origin[1] + planH + DIM_BAND + 10);
  const segs = 4;
  const rects: string[] = [];
  for (let i = 0; i < segs; i++) {
    rects.push(
      `<rect x="${r3(x0 + (len * i) / segs)}" y="${r3(y0)}" width="${r3(len / segs)}" height="1.6" ` +
        `fill="${i % 2 === 0 ? '#000' : '#fff'}" stroke="#000" stroke-width="0.2"/>`,
    );
  }
  const unitText = (mm: number) => (units === 'imperial' ? `${r3(mm / 304.8)}'` : `${r3(mm / 1000)} m`);
  return (
    `<g id="scale-bar">${rects.join('')}` +
    `<text x="${r3(x0)}" y="${r3(y0 + 4.6)}" font-size="2.2" text-anchor="middle" fill="#000" stroke="none">0</text>` +
    `<text x="${r3(x0 + len / 2)}" y="${r3(y0 + 4.6)}" font-size="2.2" text-anchor="middle" fill="#000" stroke="none">${esc(unitText(L / 2))}</text>` +
    `<text x="${r3(x0 + len)}" y="${r3(y0 + 4.6)}" font-size="2.2" text-anchor="middle" fill="#000" stroke="none">${esc(unitText(L))}</text>` +
    `<text x="${r3(x0)}" y="${r3(y0 - 1.6)}" font-size="2.2" fill="#000" stroke="none">SCALE ${esc(scale.label)}</text>` +
    `</g>`
  );
}

function titleBlockSvg(
  sheet: SheetSpec,
  size: DrawingSheetSize,
  options: ArchitecturalSheetOptions,
  scale: PlanScale,
  units: PlanUnits,
  cutHeight: number,
): string {
  const { w, h } = sheet.titleBlock;
  const x = sheet.w - sheet.margin - w;
  const y = sheet.h - sheet.margin - h;
  const title = options.title ?? options.modelName ?? 'FLOOR PLAN';
  const rowH = h / 4;
  const half = w / 2;
  const cell = (label: string, value: string, cx: number, cy: number, cw: number) => {
    const fit = fitTextSize(value, 3, cw - 3, 1.6);
    return (
      `<text x="${r3(cx + 1.5)}" y="${r3(cy + 2.4)}" font-size="1.8" fill="#555" stroke="none">${esc(label)}</text>` +
      `<text x="${r3(cx + 1.5)}" y="${r3(cy + rowH - 1.4)}" font-size="${fit.size}" fill="#000" stroke="none">${esc(fit.text)}</text>`
    );
  };
  return (
    `<g id="title-block" fill="none" stroke="#000" stroke-width="0.35">` +
    `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(w)}" height="${r3(h)}"/>` +
    [1, 2, 3].map(k => `<line x1="${r3(x)}" y1="${r3(y + rowH * k)}" x2="${r3(x + w)}" y2="${r3(y + rowH * k)}"/>`).join('') +
    `<line x1="${r3(x + half)}" y1="${r3(y + rowH)}" x2="${r3(x + half)}" y2="${r3(y + h)}"/>` +
    cell('TITLE', title.toUpperCase(), x, y, w) +
    cell('DRAWING', `FLOOR PLAN, CUT ${formatPlanLength(cutHeight, units)} ABOVE FLOOR`, x, y + rowH, half) +
    cell('SCALE', scale.label, x + half, y + rowH, half) +
    cell('UNITS', units === 'imperial' ? 'FEET-INCHES' : 'MILLIMETRES', x, y + 2 * rowH, half) +
    cell('SHEET', sheetSizeLabel(size), x + half, y + 2 * rowH, half) +
    cell('DATE', options.date ?? '', x, y + 3 * rowH, half) +
    cell('REV', options.revision ?? '', x + half, y + 3 * rowH, half) +
    `</g>`
  );
}

function polylineD(pts: readonly P2[]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${r3(x)} ${r3(y)}`).join(' ');
}

function polygonD(pts: readonly P2[]): string {
  return `${polylineD(pts)} Z`;
}

function validatePlanOptions(plan: ArchitecturalPlanOptions | undefined): void {
  if (plan === undefined) return;
  const problems: Array<[string, unknown, boolean, string]> = [
    ['units', plan.units, plan.units === undefined || plan.units === 'metric' || plan.units === 'imperial', "must be 'metric' or 'imperial'"],
    ['cutHeight', plan.cutHeight, plan.cutHeight === undefined || (Number.isFinite(plan.cutHeight) && plan.cutHeight > 0), 'must be a positive number of mm'],
    ['northDeg', plan.northDeg, plan.northDeg === undefined || Number.isFinite(plan.northDeg), 'must be a finite number'],
    ...(plan.rooms ?? []).map((r, i): [string, unknown, boolean, string] =>
      [`rooms[${i}]`, r, isRoomName(r), 'must be { name: string, at: [x, y] }']),
  ];
  const bad = problems.find(([, , ok]) => !ok);
  if (bad === undefined) return;
  const [field, value, , rule] = bad;
  throw new KernelError('cli.invalid-args', `architectural plan: options.plan.${field} ${rule}; got ${JSON.stringify(value)}.`, undefined,
    "options.plan is { units?: 'metric'|'imperial', cutHeight?: mm > 0, rooms?: [{ name, at: [x, y] }], northDeg?: number }.");
}

function isRoomName(r: unknown): boolean {
  const room = r as { name?: unknown; at?: unknown } | null;
  return typeof room?.name === 'string' && room.name.length > 0 &&
    Array.isArray(room.at) && room.at.length === 2 && room.at.every(Number.isFinite);
}
