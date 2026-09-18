// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/sheet.ts
//
// Stage 2: classify a page's linework and read its lettering.
//
//   frame / title block  — the sheet border and the block holding SCALE /
//                           UNITS / NAME captions; removed from geometry.
//   scale, units,        — read from the title block (a projection symbol is
//   projection angle       recognised by geometry, not by a font glyph).
//   arrowheads            — small filled triangles; their tips anchor every
//                           dimension association.
//   dimension / extension — a line with an arrow tip at both ends (or two
//   / leader lines          collinear lines broken around the lettering, one
//                           tip each), the extension lines through those
//                           tips, and the leader + shoulder of radial callouts.
//   visible / thin /      — what is left: full-weight solid geometry, thin
//   hidden / center         solid geometry (tangent edges), uniform-dash
//                           hidden lines, long-short-dash center lines.
//
// Classification is structural first (arrows, perpendicularity, text
// placement) and weight/dash second, so a sheet that draws every line at one
// width still separates dimensions from geometry.

import { parseDimensionText, parseScaleText, parseUnitsText, type ParsedDimText } from './dimensionText';
import type { PdfPageVectors, PositionedText, Pt, VectorPath } from './pdfVectors';
import {
  asFullCircle,
  bboxOf,
  dist,
  pointLine,
  pointSegment,
  type BBox2,
  type CircleFit,
} from './geometry2d';

export type LineClass =
  | 'visible'
  | 'thin'
  | 'hidden'
  | 'center'
  | 'dimension'
  | 'extension'
  | 'leader'
  | 'arrowhead'
  | 'frame'
  | 'title-block'
  | 'ignored';

export interface ClassifiedPath extends VectorPath {
  id: number;
  cls: LineClass;
  bbox: BBox2;
}

export interface Arrowhead {
  tip: Pt;
  /** Unit vector pointing from the arrow's base to its tip. */
  dir: Pt;
  pathId: number;
}

export interface LinearDimension {
  id: string;
  text: PositionedText;
  parsed: ParsedDimText;
  /** Unit direction of the measured span (sheet coordinates). */
  dir: Pt;
  tips: [Pt, Pt];
  /** Geometry-side ends of the extension lines (the tips when there are none). */
  feet: [Pt, Pt];
  /** Tip-to-tip distance on the sheet, mm. */
  sheetLength: number;
}

export interface RadialCallout {
  id: string;
  text: PositionedText;
  parsed: ParsedDimText;
  /** Arrow tips on the leader — they land on the rim of the called-out circle. */
  tips: Pt[];
  /** Leader stem, when found, as a line through the feature. */
  stem?: [Pt, Pt];
}

export interface TitleBlockInfo {
  bbox?: BBox2;
  /** Sheet mm per model mm, when lettered. */
  scale?: { value: number; text: string };
  units?: { value: 'mm' | 'in'; text: string };
  projection?: { value: 'third' | 'first'; source: 'symbol' | 'text' };
  texts: PositionedText[];
}

export interface SheetAnalysis {
  widthMm: number;
  heightMm: number;
  paths: ClassifiedPath[];
  arrows: Arrowhead[];
  frame?: BBox2;
  title: TitleBlockInfo;
  linearDims: LinearDimension[];
  radialCallouts: RadialCallout[];
  /** Dimension-shaped lettering no arrow/leader structure could be tied to. */
  unassociated: Array<{ text: PositionedText; parsed: ParsedDimText }>;
  /** Everything else lettered on the sheet (view labels, notes). */
  notes: PositionedText[];
}

const TITLE_WORDS = /^(SCALE|UNITS|DATE|NAME|TITLE|DRAWN|CHECKED|APPROVED|SHEET|REV(ISION)?|MATERIAL|DWG\.?\s*NO\.?|PART\s*NO\.?|WEIGHT|SIZE|FINISH)\b/i;

const cross = (a: Pt, b: Pt): number => a[0] * b[1] - a[1] * b[0];
const dot = (a: Pt, b: Pt): number => a[0] * b[0] + a[1] * b[1];
const unit = (a: Pt, b: Pt): Pt => {
  const l = dist(a, b) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};

/** Visual centre of a text run (baseline start + half advance + ~⅓ em up). */
export function textCenter(t: PositionedText): Pt {
  const up: Pt = [t.dir[1], -t.dir[0]];
  return [
    t.x + t.dir[0] * t.widthMm / 2 + up[0] * t.sizeMm * 0.35,
    t.y + t.dir[1] * t.widthMm / 2 + up[1] * t.sizeMm * 0.35,
  ];
}

function inside(b: BBox2, outer: BBox2, pad = 0): boolean {
  return b.x0 >= outer.x0 - pad && b.y0 >= outer.y0 - pad && b.x1 <= outer.x1 + pad && b.y1 <= outer.y1 + pad;
}

/** Axis-aligned rectangle path (4 corners, closed). */
function asRectangle(p: VectorPath): BBox2 | null {
  const pts = p.points;
  const closedPts = dist(pts[0], pts[pts.length - 1]) < 1e-3 ? pts.slice(0, -1) : p.closed ? pts : null;
  if (!closedPts || closedPts.length !== 4) return null;
  for (let i = 0; i < 4; i++) {
    const a = closedPts[i], b = closedPts[(i + 1) % 4];
    if (Math.abs(a[0] - b[0]) > 1e-3 && Math.abs(a[1] - b[1]) > 1e-3) return null;
  }
  return bboxOf(closedPts);
}

/** Small filled triangle → arrowhead with tip and direction. */
export function asArrowhead(p: VectorPath): { tip: Pt; dir: Pt } | null {
  if (!p.filled) return null;
  let pts = p.points;
  if (pts.length >= 2 && dist(pts[0], pts[pts.length - 1]) < 1e-3) pts = pts.slice(0, -1);
  if (pts.length !== 3) return null;
  const box = bboxOf(pts);
  if (!box || Math.hypot(box.x1 - box.x0, box.y1 - box.y0) > 8) return null;
  const sides = [dist(pts[1], pts[2]), dist(pts[2], pts[0]), dist(pts[0], pts[1])];
  const shortest = sides.indexOf(Math.min(...sides));
  const tip = pts[shortest];
  const base1 = pts[(shortest + 1) % 3];
  const base2 = pts[(shortest + 2) % 3];
  const mid: Pt = [(base1[0] + base2[0]) / 2, (base1[1] + base2[1]) / 2];
  const length = dist(tip, mid);
  if (length < 1.5 * sides[shortest] || length < 0.5) return null;
  return { tip, dir: unit(mid, tip) };
}

interface SolidSeg {
  a: Pt;
  b: Pt;
  pathId: number;
}

/**
 * Classify every path on the page and associate dimension lettering with the
 * linework that carries it.
 */
/**
 * Classify every path on the page and associate dimension lettering with the
 * linework that carries it.
 */
export function analyseSheet(page: PdfPageVectors): SheetAnalysis {
  const { paths, frame } = setupPathsAndFrame(page);

  // --- title block ---------------------------------------------------------
  const title = readTitleBlock(page, paths);
  if (title.bbox) {
    for (const p of paths) {
      if (p.cls === 'ignored' && inside(p.bbox, title.bbox, 0.6)) p.cls = 'title-block';
    }
  }
  const titleTextSet = new Set(title.texts);

  // --- arrowheads ------------------------------------------------------------
  const arrows = collectArrowheads(paths);

  // --- candidate lettering ---------------------------------------------------
  const lettering = page.texts
    .filter(t => !titleTextSet.has(t))
    .map(t => ({ text: t, parsed: parseDimensionText(t.text) }));
  const usedText = new Set<PositionedText>();

  // --- solid segments --------------------------------------------------------
  const { solid, pathById, claim, tipOn } = buildSolidSegments(paths);

  // --- linear dimensions -------------------------------------------------------
  const { linearDims, dimArrowTips } = buildLinearDimensions(solid, pathById, claim, tipOn, lettering, usedText, arrows);

  // --- radial callouts (leader + shoulder) ---------------------------------------
  const { radialCallouts, unassociated } = buildRadialCallouts(lettering, usedText, solid, arrows, dimArrowTips, tipOn, claim);

  // --- remaining linework by weight / dash ----------------------------------------
  classifyRemainingLinework(paths);

  const notes = page.texts.filter(t => !titleTextSet.has(t) && !usedText.has(t));
  return {
    widthMm: page.widthMm,
    heightMm: page.heightMm,
    paths,
    arrows,
    ...(frame ? { frame } : {}),
    title,
    linearDims,
    radialCallouts,
    unassociated,
    notes,
  };
}

function setupPathsAndFrame(page: PdfPageVectors): { paths: ClassifiedPath[]; pageArea: number; frame: BBox2 | undefined } {
  const paths: ClassifiedPath[] = page.paths
    .map((p, id) => ({ ...p, id, cls: 'ignored' as LineClass, bbox: bboxOf(p.points)! }))
    .filter(p => p.bbox !== null);
  const pageArea = page.widthMm * page.heightMm;

  // --- frame ---------------------------------------------------------------
  let frame: BBox2 | undefined;
  for (const p of paths) {
    if (!p.stroked) {
      // Page-sized fill-only rectangles are sheet backgrounds, not geometry.
      const r = asRectangle(p);
      if (r && (r.x1 - r.x0) * (r.y1 - r.y0) > 0.5 * pageArea) p.cls = 'ignored';
      continue;
    }
    const r = asRectangle(p);
    if (r && (r.x1 - r.x0) * (r.y1 - r.y0) > 0.5 * pageArea) {
      p.cls = 'frame';
      if (!frame || (r.x1 - r.x0) * (r.y1 - r.y0) < (frame.x1 - frame.x0) * (frame.y1 - frame.y0)) frame = r;
    }
  }
  return { paths, pageArea, frame };
}

function collectArrowheads(paths: ClassifiedPath[]): Arrowhead[] {
  const arrows: Arrowhead[] = [];
  for (const p of paths) {
    if (p.cls !== 'ignored') continue;
    const a = asArrowhead(p);
    if (a) {
      arrows.push({ ...a, pathId: p.id });
      p.cls = 'arrowhead';
    }
  }
  return arrows;
}

function buildSolidSegments(paths: ClassifiedPath[]): {
  solid: SolidSeg[];
  pathById: Map<number, ClassifiedPath>;
  claim: (pathId: number, cls: LineClass) => void;
  tipOn: (seg: SolidSeg, arrow: Arrowhead, tol?: number) => boolean;
} {
  const solid: SolidSeg[] = [];
  for (const p of paths) {
    if (p.cls !== 'ignored' || !p.stroked || p.dash.length > 0) continue;
    for (let i = 0; i + 1 < p.points.length; i++) {
      if (dist(p.points[i], p.points[i + 1]) > 1e-3) solid.push({ a: p.points[i], b: p.points[i + 1], pathId: p.id });
    }
  }
  const pathById = new Map(paths.map(p => [p.id, p] as const));
  const claim = (pathId: number, cls: LineClass) => {
    const p = pathById.get(pathId);
    if (p && (p.cls === 'ignored' || p.cls === 'thin' || p.cls === 'visible')) p.cls = cls;
  };
  const tipOn = (seg: SolidSeg, arrow: Arrowhead, tol = 0.3): boolean =>
    pointSegment(arrow.tip, seg.a, seg.b).d <= tol && Math.abs(cross(unit(seg.a, seg.b), arrow.dir)) < 0.2;
  return { solid, pathById, claim, tipOn };
}

function buildLinearDimensions(
  solid: SolidSeg[],
  pathById: Map<number, ClassifiedPath>,
  claim: (pathId: number, cls: LineClass) => void,
  tipOn: (seg: SolidSeg, arrow: Arrowhead, tol?: number) => boolean,
  lettering: Array<{ text: PositionedText; parsed: ParsedDimText | null }>,
  usedText: Set<PositionedText>,
  arrows: Arrowhead[],
): { linearDims: LinearDimension[]; dimArrowTips: Set<Arrowhead> } {
  const linearDims: LinearDimension[] = [];

  /** Unused dimension lettering parallel to the line a→b and sitting on it. */
  const labelFor = (a: Pt, b: Pt): { text: PositionedText; parsed: ParsedDimText } | null => {
    const len = dist(a, b);
    const dir = unit(a, b);
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let best: { text: PositionedText; parsed: ParsedDimText; score: number } | null = null;
    for (const { text, parsed } of lettering) {
      if (!parsed || usedText.has(text) || parsed.kind === 'radius') continue;
      if (Math.abs(dot(text.dir, dir)) < 0.98) continue;
      const c = textCenter(text);
      const perp = pointLine(c, a, b);
      const along = Math.abs(dot([c[0] - mid[0], c[1] - mid[1]], dir));
      if (perp > 1.6 * text.sizeMm + 0.5) continue;
      if (along > len / 2 + text.widthMm / 2 + 3) continue;
      const score = perp + 0.1 * along;
      if (!best || score < best.score) best = { text, parsed, score };
    }
    return best;
  };

  /** Record a dimension measured tip to tip, finding its extension lines. */
  const addLinear = (a: Pt, b: Pt, linePathIds: number[], label: { text: PositionedText; parsed: ParsedDimText }): void => {
    usedText.add(label.text);
    for (const id of linePathIds) claim(id, 'dimension');
    const dir = unit(a, b);
    // Extension lines are drawn with the dimension line's pen. Where stacked
    // dimensions share a feature edge, several collinear extension lines pass
    // through one tip; the one that belongs to THIS dimension is the one that
    // ends (overshoots) right at its tip.
    const penWidth = Math.max(...linePathIds.map(id => pathById.get(id)?.widthMm ?? 0));
    const feet: [Pt, Pt] = [a, b];
    [a, b].forEach((tip, k) => {
      let chosen: SolidSeg | null = null;
      let chosenOvershoot = Infinity;
      for (const cand of solid) {
        if ((pathById.get(cand.pathId)?.widthMm ?? 0) > penWidth + 0.01) continue;
        const cl = dist(cand.a, cand.b);
        if (cl < 0.5 || Math.abs(dot(unit(cand.a, cand.b), dir)) > 0.15) continue;
        if (pointLine(tip, cand.a, cand.b) > 0.3) continue;
        const { t } = pointSegment(tip, cand.a, cand.b);
        const overshoot = Math.min(dist(tip, cand.a), dist(tip, cand.b));
        if ((t <= 0 || t >= 1) && overshoot > 2.5) continue;
        if (overshoot < chosenOvershoot) { chosen = cand; chosenOvershoot = overshoot; }
      }
      if (chosen) {
        claim(chosen.pathId, 'extension');
        feet[k] = pointLine(chosen.a, a, b) >= pointLine(chosen.b, a, b) ? chosen.a : chosen.b;
      }
    });
    linearDims.push({ id: `dim${linearDims.length + 1}`, text: label.text, parsed: label.parsed, dir, tips: [a, b], feet, sheetLength: dist(a, b) });
  };

  // One line carrying an arrow tip at each end.
  for (const seg of solid) {
    if (dist(seg.a, seg.b) < 0.5) continue;
    const atA = arrows.find(ar => dist(ar.tip, seg.a) <= 0.35 && tipOn(seg, ar));
    const atB = arrows.find(ar => dist(ar.tip, seg.b) <= 0.35 && tipOn(seg, ar));
    if (!atA || !atB || atA === atB) continue;
    const label = labelFor(seg.a, seg.b);
    if (label) addLinear(seg.a, seg.b, [seg.pathId], label);
  }

  // A dimension line broken around its lettering (the usual ANSI style): two
  // collinear lines, each ending in an arrow tip, the tips pointing apart or
  // together along one line.
  const tipTaken = (ar: Arrowhead) => linearDims.some(d => d.tips.some(t => dist(t, ar.tip) <= 0.35));
  const lineEndingAt = (ar: Arrowhead): SolidSeg | undefined =>
    solid.find(sg => dist(sg.a, sg.b) >= 0.5 && (dist(sg.a, ar.tip) <= 0.35 || dist(sg.b, ar.tip) <= 0.35) && tipOn(sg, ar) &&
      pathById.get(sg.pathId)?.cls === 'ignored');
  for (let i = 0; i < arrows.length; i++) {
    for (let j = i + 1; j < arrows.length; j++) {
      const p = arrows[i], q = arrows[j];
      if (tipTaken(p) || tipTaken(q)) continue;
      if (dot(p.dir, q.dir) > -0.98) continue;
      if (pointLine(q.tip, p.tip, [p.tip[0] + p.dir[0], p.tip[1] + p.dir[1]]) > 0.3) continue;
      const sp = lineEndingAt(p), sq = lineEndingAt(q);
      if (!sp || !sq || sp === sq) continue;
      const label = labelFor(p.tip, q.tip);
      if (label) addLinear(p.tip, q.tip, [sp.pathId, sq.pathId], label);
    }
  }
  const dimArrowTips = new Set<Arrowhead>();
  for (const d of linearDims) {
    for (const ar of arrows) {
      if (d.tips.some(t => dist(t, ar.tip) <= 0.35)) dimArrowTips.add(ar);
    }
  }
  return { linearDims, dimArrowTips };
}

/** Shoulder: parallel to the baseline, just under it, spanning under the lettering. */
function findShoulder(text: PositionedText, solid: SolidSeg[]): SolidSeg | null {
  const up: Pt = [text.dir[1], -text.dir[0]];
  const start: Pt = [text.x, text.y];
  for (const s of solid) {
    if (Math.abs(dot(unit(s.a, s.b), text.dir)) < 0.98) continue;
    const below = -dot([s.a[0] - text.x, s.a[1] - text.y], up);
    if (below < -0.2 || below > 2.2) continue;
    const alongA = dot([s.a[0] - start[0], s.a[1] - start[1]], text.dir);
    const alongB = dot([s.b[0] - start[0], s.b[1] - start[1]], text.dir);
    const lo = Math.min(alongA, alongB), hi = Math.max(alongA, alongB);
    const overlap = Math.min(hi, text.widthMm) - Math.max(lo, 0);
    if (overlap < Math.min(2, text.widthMm * 0.3)) continue;
    return s;
  }
  return null;
}

function findStemAndTips(
  shoulder: SolidSeg,
  solid: SolidSeg[],
  arrows: Arrowhead[],
  dimArrowTips: Set<Arrowhead>,
  tipOn: (seg: SolidSeg, arrow: Arrowhead, tol?: number) => boolean,
  claim: (pathId: number, cls: LineClass) => void,
): { tips: Pt[]; stem?: [Pt, Pt] } {
  const tips: Pt[] = [];
  let stem: [Pt, Pt] | undefined;
  for (const s of solid) {
    if (s === shoulder || Math.abs(dot(unit(s.a, s.b), unit(shoulder.a, shoulder.b))) > 0.98) continue;
    const joins = [shoulder.a, shoulder.b].some(e => dist(e, s.a) <= 0.3 || dist(e, s.b) <= 0.3);
    if (!joins) continue;
    const onStem = arrows.filter(ar => !dimArrowTips.has(ar) && tipOn(s, ar));
    if (onStem.length === 0) continue;
    stem = [s.a, s.b];
    tips.push(...onStem.map(ar => ar.tip));
    claim(s.pathId, 'leader');
    claim(shoulder.pathId, 'leader');
    break;
  }
  return { tips, stem };
}

function buildRadialCallouts(
  lettering: Array<{ text: PositionedText; parsed: ParsedDimText | null }>,
  usedText: Set<PositionedText>,
  solid: SolidSeg[],
  arrows: Arrowhead[],
  dimArrowTips: Set<Arrowhead>,
  tipOn: (seg: SolidSeg, arrow: Arrowhead, tol?: number) => boolean,
  claim: (pathId: number, cls: LineClass) => void,
): { radialCallouts: RadialCallout[]; unassociated: SheetAnalysis['unassociated'] } {
  const radialCallouts: RadialCallout[] = [];
  const unassociated: SheetAnalysis['unassociated'] = [];
  for (const { text, parsed } of lettering) {
    if (!parsed || usedText.has(text)) continue;
    const shoulder = findShoulder(text, solid);
    const { tips, stem } = shoulder ? findStemAndTips(shoulder, solid, arrows, dimArrowTips, tipOn, claim) : { tips: [] as Pt[], stem: undefined };
    if (tips.length === 0) {
      if (parsed.kind === 'linear' && !parsed.through && parsed.depth === undefined) {
        // A bare number with no dimension line is a note or a label, not a callout.
        continue;
      }
      unassociated.push({ text, parsed });
      usedText.add(text);
      continue;
    }
    usedText.add(text);
    radialCallouts.push({ id: `callout${radialCallouts.length + 1}`, text, parsed, tips, ...(stem ? { stem } : {}) });
  }
  // Lettered linear dims whose line was never found are reported, not dropped.
  for (const { text, parsed } of lettering) {
    if (parsed && !usedText.has(text) && parsed.kind !== 'linear') {
      unassociated.push({ text, parsed });
      usedText.add(text);
    }
  }
  return { radialCallouts, unassociated };
}

function classifyRemainingLinework(paths: ClassifiedPath[]): void {
  const remainingSolid = paths.filter(p => p.cls === 'ignored' && p.stroked && p.dash.length === 0);
  let thick = 0;
  for (const p of remainingSolid) thick = Math.max(thick, p.widthMm);
  for (const p of paths) {
    if (p.cls !== 'ignored' || !p.stroked) continue;
    if (p.dash.length >= 2) {
      const on = p.dash.filter((_, i) => i % 2 === 0);
      p.cls = on.length >= 2 && Math.max(...on) > 2.5 * Math.min(...on) ? 'center' : 'hidden';
    } else {
      p.cls = p.widthMm >= 0.7 * thick ? 'visible' : 'thin';
    }
  }
}

function readTitleBlock(page: PdfPageVectors, paths: ClassifiedPath[]): TitleBlockInfo {
  const captions = page.texts.filter(t => TITLE_WORDS.test(t.text));
  const info: TitleBlockInfo = { texts: [] };

  let bbox: BBox2 | undefined;
  if (captions.length >= 2) {
    const cb = bboxOf(captions.flatMap(t => [[t.x, t.y - t.sizeMm], [t.x + t.widthMm, t.y]] as Pt[]))!;
    // The smallest stroked rectangle that encloses every caption is the block.
    let bestArea = Infinity;
    for (const p of paths) {
      if (!p.stroked || p.cls === 'frame') continue;
      const r = asRectangle(p);
      if (!r || !inside(cb, r, 0.5)) continue;
      const area = (r.x1 - r.x0) * (r.y1 - r.y0);
      if (area < bestArea && area < 0.5 * page.widthMm * page.heightMm) { bestArea = area; bbox = r; }
    }
    bbox ??= { x0: cb.x0 - 4, y0: cb.y0 - 4, x1: cb.x1 + 30, y1: cb.y1 + 8 };
  }
  if (bbox) {
    info.bbox = bbox;
    info.texts = page.texts.filter(t => inside({ x0: t.x, y0: t.y - t.sizeMm, x1: t.x + t.widthMm, y1: t.y }, bbox!, 0.5));
  }

  // Scale / units: inline ("SCALE 1:2") or the parseable value nearest its caption.
  const valueNear = <T>(caption: RegExp, parse: (s: string) => T | null): { value: T; text: string } | undefined => {
    const inline = page.texts.find(t => caption.test(t.text) && parse(t.text) !== null);
    if (inline) return { value: parse(inline.text) as T, text: inline.text };
    if (info.texts.length === 0) return undefined;
    const cap = info.texts.find(t => caption.test(t.text));
    const candidates = info.texts.filter(t => parse(t.text) !== null);
    if (candidates.length === 0) return undefined;
    if (cap) candidates.sort((p, q) => dist([p.x, p.y], [cap.x, cap.y]) - dist([q.x, q.y], [cap.x, cap.y]));
    return { value: parse(candidates[0].text) as T, text: candidates[0].text };
  };
  const scale = valueNear(/SCALE/i, parseScaleText);
  if (scale) info.scale = scale;
  const units = valueNear(/UNITS|DIMENSIONS\s+(ARE\s+)?IN/i, parseUnitsText);
  if (units) info.units = units;

  const angleText = page.texts.find(t => /(THIRD|3RD|FIRST|1ST)\s*ANGLE/i.test(t.text));
  if (angleText) {
    info.projection = { value: /(THIRD|3RD)/i.test(angleText.text) ? 'third' : 'first', source: 'text' };
  } else if (bbox) {
    const symbol = projectionSymbol(paths.filter(p => inside(p.bbox, bbox!, 0.6)));
    if (symbol) info.projection = { value: symbol, source: 'symbol' };
  }
  return info;
}

/**
 * Read the ISO projection symbol: a truncated cone's side view (trapezoid)
 * beside its end view (two concentric circles). The end view drawn on the
 * SAME side as the cone's narrow end is third-angle; on the opposite side,
 * first-angle.
 */
export function projectionSymbol(candidates: readonly VectorPath[]): 'third' | 'first' | null {
  const circles: CircleFit[] = [];
  const traps: Pt[][] = [];
  for (const p of candidates) {
    const c = asFullCircle(p.points);
    if (c) { circles.push(c); continue; }
    let pts = p.points;
    if (pts.length >= 2 && dist(pts[0], pts[pts.length - 1]) < 1e-3) pts = pts.slice(0, -1);
    if (pts.length === 4) traps.push([...pts]);
  }
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      const a = circles[i], b = circles[j];
      if (Math.hypot(a.cx - b.cx, a.cy - b.cy) > 0.3) continue;
      const ratio = Math.max(a.r, b.r) / Math.min(a.r, b.r);
      if (ratio < 1.15 || ratio > 4) continue;
      for (const t of traps) {
        const verticals: Array<{ x: number; len: number }> = [];
        for (let k = 0; k < 4; k++) {
          const p = t[k], q = t[(k + 1) % 4];
          if (Math.abs(p[0] - q[0]) < 0.3 && Math.abs(p[1] - q[1]) > 0.3) verticals.push({ x: (p[0] + q[0]) / 2, len: Math.abs(p[1] - q[1]) });
        }
        if (verticals.length !== 2 || Math.abs(verticals[0].len - verticals[1].len) < 0.3) continue;
        const cy = t.reduce((s, p) => s + p[1], 0) / 4;
        if (Math.abs(cy - a.cy) > Math.max(a.r, b.r) * 2) continue;
        const centerX = (verticals[0].x + verticals[1].x) / 2;
        const narrow = verticals[0].len < verticals[1].len ? verticals[0] : verticals[1];
        const narrowSide = Math.sign(narrow.x - centerX);
        const circleSide = Math.sign(a.cx - centerX);
        if (narrowSide === 0 || circleSide === 0) continue;
        return narrowSide === circleSide ? 'third' : 'first';
      }
    }
  }
  return null;
}
