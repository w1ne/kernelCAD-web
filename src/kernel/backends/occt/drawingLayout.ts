// src/kernel/backends/occt/drawingLayout.ts
//
// Pure 2D logic for the engineering-drawing SVG exporter: projected-segment
// dedup, drawing-scale selection, third-angle sheet layout, and linear
// dimension geometry. No OCCT / kernel-backend imports — everything here is
// deterministic math on number pairs, unit-testable without the wasm kernel.
//
// Coordinate conventions:
//   - "model 2D" coords come out of the per-view projection with y UP
//     (engineering convention).
//   - "sheet" coords are SVG millimetres with y DOWN, origin at the sheet's
//     top-left corner. `ViewPlacement` carries the affine map between the two
//     (`sheetX = tx + s·mx`, `sheetY = ty − s·my`).

export type Pt2 = readonly [number, number];
export type Polyline2 = Pt2[];

// ---------------------------------------------------------------------------
// Segment dedup + re-chaining
// ---------------------------------------------------------------------------

/** Axis-aligned bbox of a set of polylines (model coords). */
export interface ViewBox2 {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function viewBoxOfPolylines(groups: Polyline2[][]): ViewBox2 | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const polylines of groups) {
    for (const pl of polylines) {
      for (const [x, y] of pl) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x0 === Infinity) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const qkey = (p: Pt2, quantum: number): string =>
  `${Math.round(p[0] / quantum)},${Math.round(p[1] / quantum)}`;

interface Seg {
  a: Pt2;
  b: Pt2;
}

/**
 * Remove coincident duplicate segments across an ordered list of line
 * classes, then re-chain the survivors into polylines.
 *
 * The hidden-line pass projects symmetric / coincident 3D edges onto the
 * same 2D segment more than once (e.g. the front and back rim of a bore in
 * the front view: one visible, one hidden, both at the identical 2D spot).
 * Classes are processed in priority order — a segment claimed by an earlier
 * class is dropped from every later class — so callers should order classes
 * visible-first. Within a class, exact duplicates collapse too.
 *
 * Segments are keyed by their endpoints quantized to `quantum` (mm), with a
 * canonical endpoint ordering so reversed duplicates also collapse.
 * Zero-length (sub-quantum) segments are dropped.
 */
export function dedupPolylineClasses(
  classes: Polyline2[][],
  quantum = 1e-3,
): Polyline2[][] {
  const seen = new Set<string>();
  return classes.map(polylines => {
    const kept: Seg[] = [];
    for (const pl of polylines) {
      for (let i = 0; i + 1 < pl.length; i++) {
        const a = pl[i];
        const b = pl[i + 1];
        const ka = qkey(a, quantum);
        const kb = qkey(b, quantum);
        if (ka === kb) continue; // zero-length
        const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (seen.has(key)) continue;
        seen.add(key);
        kept.push({ a, b });
      }
    }
    return chainSegments(kept, quantum);
  });
}

/**
 * Greedily chain segments that share endpoints back into polylines so the
 * SVG ships one `<path>` per connected run instead of one per chord.
 */
export function chainSegments(segs: Seg[], quantum = 1e-3): Polyline2[] {
  const byEndpoint = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [qkey(s.a, quantum), qkey(s.b, quantum)]) {
      const list = byEndpoint.get(k);
      if (list) list.push(i);
      else byEndpoint.set(k, [i]);
    }
  });
  const used = new Array<boolean>(segs.length).fill(false);
  const out: Polyline2[] = [];

  const takeAt = (pointKey: string): Seg | undefined => {
    const candidates = byEndpoint.get(pointKey);
    if (!candidates) return undefined;
    for (const i of candidates) {
      if (used[i]) continue;
      used[i] = true;
      const s = segs[i];
      // Orient so `a` is at pointKey.
      return qkey(s.a, quantum) === pointKey ? s : { a: s.b, b: s.a };
    }
    return undefined;
  };

  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const chain: Pt2[] = [segs[i].a, segs[i].b];
    // Extend forward from the tail.
    for (;;) {
      const next = takeAt(qkey(chain[chain.length - 1], quantum));
      if (!next) break;
      chain.push(next.b);
    }
    // Extend backward from the head.
    for (;;) {
      const prev = takeAt(qkey(chain[0], quantum));
      if (!prev) break;
      chain.unshift(prev.b);
    }
    out.push(chain);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Drawing scale
// ---------------------------------------------------------------------------

/** Preferred drawing scales, largest first (sheet mm per model mm). */
export const STANDARD_SCALES: readonly number[] = [
  100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01,
];

/** Largest standard scale that does not exceed `raw`. Falls back to `raw`
 *  itself when the model is too large even for the smallest standard scale. */
export function pickDrawingScale(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  for (const s of STANDARD_SCALES) {
    if (s <= raw) return s;
  }
  return raw;
}

/** Human title-block label: `2:1`, `1:1`, `1:5`, … */
export function scaleLabel(s: number): string {
  if (s >= 1) {
    const n = Math.round(s * 100) / 100;
    return `${Number.isInteger(n) ? n : n.toFixed(2)}:1`;
  }
  const inv = 1 / s;
  const n = Math.round(inv * 100) / 100;
  return `1:${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Sheet layout (third-angle: top view above front, left view left of front,
// isometric pictorial in the upper-right cell)
// ---------------------------------------------------------------------------

export interface SheetSpec {
  /** Sheet size in mm. */
  w: number;
  h: number;
  /** Outer margin (frame inset) in mm. */
  margin: number;
  /** Gap between adjacent views in mm (also hosts dimensions). */
  gap: number;
  /** Title block size in mm (anchored bottom-right inside the frame). */
  titleBlock: { w: number; h: number };
}

export const SHEETS: Record<'a4' | 'a3', SheetSpec> = {
  a4: { w: 297, h: 210, margin: 10, gap: 18, titleBlock: { w: 96, h: 24 } },
  a3: { w: 420, h: 297, margin: 12, gap: 24, titleBlock: { w: 110, h: 28 } },
};

export type DrawingViewName = 'front' | 'top' | 'left' | 'iso';

/** Affine map from model-2D (y up) into sheet coords (y down):
 *  `sheetX = tx + scale·mx`, `sheetY = ty − scale·my`. */
export interface ViewPlacement {
  tx: number;
  ty: number;
  /** Sheet-space bbox of the placed view (for dimension anchoring). */
  box: { x: number; y: number; w: number; h: number };
}

export interface SheetLayout {
  scale: number;
  scaleText: string;
  views: Record<DrawingViewName, ViewPlacement>;
}

/** Vertical band under the front view reserved for the width dimension. */
const DIM_BAND = 12;

/**
 * Compute the shared drawing scale and per-view placements for the
 * third-angle sheet. `views` carries each view's projected bbox in model
 * coords. The front and top views are locked to the same sheet-x mapping
 * and the front and left views to the same sheet-y mapping, so shared model
 * axes stay aligned across views (projection alignment).
 */
export function computeSheetLayout(
  views: Record<DrawingViewName, ViewBox2>,
  sheet: SheetSpec,
): SheetLayout {
  const { margin, gap } = sheet;
  const availW = sheet.w - 2 * margin;
  const availH = sheet.h - 2 * margin - sheet.titleBlock.h;

  const rowTopH = Math.max(views.top.h, views.iso.h);
  const needW = views.left.w + views.front.w + views.iso.w;
  const needH = rowTopH + views.front.h;

  const raw = Math.min(
    (availW - 2 * gap) / needW,
    (availH - gap - DIM_BAND) / needH,
  );
  const s = pickDrawingScale(raw);

  const contentW = needW * s + 2 * gap;
  const contentH = needH * s + gap + DIM_BAND;
  const x0 = margin + Math.max(0, (availW - contentW) / 2);
  const y0 = margin + Math.max(0, (availH - contentH) / 2);

  const topRowBottom = y0 + rowTopH * s;
  const frontRowTop = topRowBottom + gap;

  const place = (
    box: ViewBox2,
    sheetX: number,
    sheetY: number,
  ): ViewPlacement => ({
    tx: sheetX - box.x * s,
    ty: sheetY + (box.y + box.h) * s,
    box: { x: sheetX, y: sheetY, w: box.w * s, h: box.h * s },
  });

  const leftX = x0;
  const frontX = leftX + views.left.w * s + gap;
  const isoX = frontX + views.front.w * s + gap;

  const front = place(views.front, frontX, frontRowTop);
  // Lock the top view onto the front view's x mapping (shared model x axis),
  // bottom-aligned against the top row so it sits adjacent to the front view.
  // Bottom alignment: sheetY(my = box.y) = ty − box.y·s = topRowBottom
  // ⇒ ty = topRowBottom + box.y·s.
  const top: ViewPlacement = {
    tx: front.tx,
    ty: topRowBottom + views.top.y * s,
    box: {
      x: front.tx + views.top.x * s,
      y: topRowBottom - views.top.h * s,
      w: views.top.w * s,
      h: views.top.h * s,
    },
  };

  // Lock the left view onto the front view's y mapping (shared model y axis).
  const left: ViewPlacement = {
    tx: leftX - views.left.x * s,
    ty: front.ty,
    box: {
      x: leftX,
      y: front.ty - (views.left.y + views.left.h) * s,
      w: views.left.w * s,
      h: views.left.h * s,
    },
  };

  // Isometric pictorial: centered in the upper-right cell.
  const isoCellW = views.iso.w * s;
  const iso = place(
    views.iso,
    Math.min(isoX, sheet.w - margin - isoCellW),
    y0 + Math.max(0, (rowTopH - views.iso.h) * s) / 2,
  );

  return { scale: s, scaleText: scaleLabel(s), views: { front, top, left, iso } };
}

// ---------------------------------------------------------------------------
// Linear dimensions
// ---------------------------------------------------------------------------

export interface LinearDimension {
  kind: 'horizontal' | 'vertical';
  /** Measured span in sheet coords: for horizontal, [x1, x2] at anchor y;
   *  for vertical, [y1, y2] at anchor x. */
  from: Pt2;
  to: Pt2;
  /** Position of the dimension line: y for horizontal, x for vertical. */
  linePos: number;
  label: string;
}

/** Format a millimetre value for a dimension label (≤2 decimals, trimmed). */
export function formatDimValue(v: number): string {
  const r = Math.round(v * 100) / 100;
  return String(r);
}

const fmt = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/** Filled arrowhead at `tip` pointing along the unit vector (dx, dy). */
function arrowhead(tip: Pt2, dx: number, dy: number): string {
  const L = 2.6; // arrow length (mm)
  const W = 0.45; // half-width (mm)
  const bx = tip[0] - dx * L;
  const by = tip[1] - dy * L;
  const px = -dy, py = dx;
  return (
    `<path d="M ${fmt(tip[0])} ${fmt(tip[1])} L ${fmt(bx + px * W)} ${fmt(by + py * W)} ` +
    `L ${fmt(bx - px * W)} ${fmt(by - py * W)} Z" fill="#000" stroke="none"/>`
  );
}

/**
 * Render one linear dimension (extension lines + dimension line + arrowheads
 * + centered label) as an SVG fragment in sheet coords.
 */
export function dimensionToSvg(d: LinearDimension, textHeight = 3.2): string {
  const EXT_GAP = 1; // gap between geometry and extension-line start
  const EXT_OVER = 1.5; // extension-line overshoot past the dimension line
  const parts: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    parts.push(
      `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"/>`,
    );

  if (d.kind === 'horizontal') {
    const y = d.linePos;
    const [x1, y1] = d.from;
    const [x2, y2] = d.to;
    const dir = y > Math.max(y1, y2) ? 1 : -1; // extension direction
    line(x1, y1 + dir * EXT_GAP, x1, y + dir * EXT_OVER);
    line(x2, y2 + dir * EXT_GAP, x2, y + dir * EXT_OVER);
    line(x1, y, x2, y);
    parts.push(arrowhead([x1, y], -1, 0));
    parts.push(arrowhead([x2, y], 1, 0));
    parts.push(
      `<text x="${fmt((x1 + x2) / 2)}" y="${fmt(y - 1)}" font-size="${textHeight}" ` +
      `text-anchor="middle" fill="#000" stroke="none">${d.label}</text>`,
    );
  } else {
    const x = d.linePos;
    const [x1, y1] = d.from;
    const [x2, y2] = d.to;
    const dir = x > Math.max(x1, x2) ? 1 : -1;
    line(x1 + dir * EXT_GAP, y1, x + dir * EXT_OVER, y1);
    line(x2 + dir * EXT_GAP, y2, x + dir * EXT_OVER, y2);
    line(x, y1, x, y2);
    parts.push(arrowhead([x, Math.min(y1, y2)], 0, -1));
    parts.push(arrowhead([x, Math.max(y1, y2)], 0, 1));
    const cy = (y1 + y2) / 2;
    parts.push(
      `<text x="${fmt(x - 1)}" y="${fmt(cy)}" font-size="${textHeight}" text-anchor="middle" ` +
      `fill="#000" stroke="none" transform="rotate(-90 ${fmt(x - 1)} ${fmt(cy)})">${d.label}</text>`,
    );
  }
  return (
    `<g class="dim" fill="none" stroke="#000" stroke-width="0.18">` +
    parts.join('') +
    `</g>`
  );
}
