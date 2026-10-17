// SPDX-License-Identifier: MIT
import { formatDimValue, pointOnViewPlane } from '../../kernel/backends/occt/drawingLayout';

export interface PlacedEdge {
  view: 'front' | 'top' | 'left';
  from: [number, number, number];
  to: [number, number, number];
}

export interface HitEdge extends PlacedEdge {
  sheet: [[number, number], [number, number]];
  label: string;
  /** False when `from`/`to` are not model coordinates. */
  model: boolean;
}

export interface TaggedView {
  view: 'front' | 'top' | 'left';
  tx: number;
  ty: number;
  s: number;
  /** Model-2D segments, y up: x0 y0 x1 y1. Sheet-only edges store `[sheetX, -sheetY]`. */
  segments: ReadonlyArray<readonly [number, number, number, number]>;
  /** False when the sheet has no model transform and segments are sheet coordinates. */
  modelSpace?: boolean;
  /** Sheet millimetres per model millimetre. Used for sheet-only edges. */
  drawingScale?: number;
}

type SheetSvg = {
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  viewBox: { baseVal: { x: number; y: number; width: number; height: number } };
};

/** Map a pointer position into sheet millimetres through the svg box. */
export function clientToSheet(svg: SheetSvg, clientX: number, clientY: number): { x: number; y: number } | null {
  const rect = svg.getBoundingClientRect();
  const box = svg.viewBox?.baseVal;
  if (!box || rect.width <= 0 || rect.height <= 0 || box.width <= 0 || box.height <= 0) return null;
  return {
    x: box.x + ((clientX - rect.left) / rect.width) * box.width,
    y: box.y + ((clientY - rect.top) / rect.height) * box.height,
  };
}

function parseSegments(raw: string): [number, number, number, number][] {
  const segments: [number, number, number, number][] = [];
  for (const part of raw.split(';')) {
    const nums = part.trim().split(/\s+/).map(Number);
    if (nums.length === 4 && nums.every(Number.isFinite)) segments.push([nums[0], nums[1], nums[2], nums[3]]);
  }
  return segments;
}

/** Read `data-kc-edges` (model 2D) plus the view's sheet transform. Iso is skipped. */
export function readTaggedViews(root: ParentNode): TaggedView[] {
  const views: TaggedView[] = [];
  root.querySelectorAll('[data-view]').forEach((node) => {
    const view = node.getAttribute('data-view');
    if (view !== 'front' && view !== 'top' && view !== 'left') return;
    const tx = Number(node.getAttribute('data-kc-tx'));
    const ty = Number(node.getAttribute('data-kc-ty'));
    const s = Number(node.getAttribute('data-kc-s'));
    if (![tx, ty, s].every(Number.isFinite) || s === 0) return;
    const segments = [
      ...parseSegments(node.getAttribute('data-kc-edges') ?? ''),
      ...[...node.querySelectorAll('[data-kc-edges]')].flatMap((el) => parseSegments(el.getAttribute('data-kc-edges') ?? '')),
    ];
    if (segments.length > 0) views.push({ view, tx, ty, s, segments });
  });
  return views;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return Math.hypot(px - ax, py - ay);
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Closest straight edge within `maxDist` sheet millimetres.
 * Sheet map matches the exporter: sheetX = tx + s·mx, sheetY = ty − s·my.
 */
export function edgeNearPoint(views: readonly TaggedView[], sheetX: number, sheetY: number, maxDist: number): HitEdge | null {
  let bestDist = maxDist;
  let best: HitEdge | null = null;
  for (const view of views) {
    for (const [x0, y0, x1, y1] of view.segments) {
      const ax = view.tx + view.s * x0;
      const ay = view.ty - view.s * y0;
      const bx = view.tx + view.s * x1;
      const by = view.ty - view.s * y1;
      const sheetLen = Math.hypot(bx - ax, by - ay);
      const measured = view.modelSpace === false ? sheetLen / (view.drawingScale || 1) : Math.hypot(x1 - x0, y1 - y0);
      if (measured < 0.5) continue;
      const dist = distanceToSegment(sheetX, sheetY, ax, ay, bx, by);
      if (dist > bestDist || (best && dist >= bestDist)) continue;
      bestDist = dist;
      best = {
        view: view.view,
        from: pointOnViewPlane(view.view, x0, y0),
        to: pointOnViewPlane(view.view, x1, y1),
        sheet: [[ax, ay], [bx, by]],
        label: formatDimValue(measured),
        model: view.modelSpace !== false,
      };
    }
  }
  return best;
}

export function edgeNear(root: ParentNode, sheetX: number, sheetY: number, maxDist: number): HitEdge | null {
  return edgeNearPoint(readTaggedViews(root), sheetX, sheetY, maxDist);
}
