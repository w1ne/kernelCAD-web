// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/pdfVectors.ts
//
// Stage 1 of the drawing-to-CAD pipeline: read one PDF page into vector
// primitives in SHEET MILLIMETRES (origin top-left, y down — the same frame
// the svg-drawing exporter writes).
//
// What is kept, because later stages classify on it:
//   - every stroked / filled subpath, flattened to a polyline, with its
//     effective line width and dash array in millimetres (the CTM scale is
//     applied, so a sheet written in points and one written in millimetres
//     read identically);
//   - every text run with its baseline origin, baseline direction, font size
//     and advance width, adjacent runs on one baseline merged (PDF producers
//     split "4× ⌀6.5 THRU" into several runs whenever the font changes);
//   - the count and page coverage of painted images, which is how a scanned
//     (raster-only) sheet is recognised.
//
// pdf.js (Apache-2.0) does the PDF parsing. It is loaded with a dynamic
// import so nothing in the browser runtime's static graph reaches it.

export type Pt = readonly [number, number];

export interface VectorPath {
  /** Flattened polyline in sheet mm (y down). */
  points: Pt[];
  closed: boolean;
  /** Effective stroke width in mm (0 for fill-only paths). */
  widthMm: number;
  /** Dash array in mm; empty for a solid line. */
  dash: number[];
  stroked: boolean;
  filled: boolean;
  /** True when any segment of the source path was a Bézier curve. */
  curved: boolean;
}

export interface PositionedText {
  text: string;
  /** Baseline start in sheet mm. */
  x: number;
  y: number;
  /** Unit baseline direction in sheet coordinates (y down). */
  dir: Pt;
  /** Font size (em height) in mm. */
  sizeMm: number;
  /** Advance width along `dir` in mm. */
  widthMm: number;
}

export interface PdfPageVectors {
  page: number;
  pageCount: number;
  widthMm: number;
  heightMm: number;
  paths: VectorPath[];
  texts: PositionedText[];
  imageCount: number;
  /** Fraction of the page area covered by painted images (bbox union upper bound, clamped to 1). */
  imageCoverage: number;
}

export class PdfReadError extends Error {
  readonly reason: 'unreadable' | 'page-out-of-range';
  constructor(reason: 'unreadable' | 'page-out-of-range', message: string) {
    super(message);
    this.reason = reason;
    this.name = 'PdfReadError';
  }
}

export const MM_PER_PT = 25.4 / 72;

type Mat = [number, number, number, number, number, number];

const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** `m` applied first, then `ctm` — PDF `cm` concatenation. */
function mul(ctm: Mat, m: Mat): Mat {
  return [
    ctm[0] * m[0] + ctm[2] * m[1],
    ctm[1] * m[0] + ctm[3] * m[1],
    ctm[0] * m[2] + ctm[2] * m[3],
    ctm[1] * m[2] + ctm[3] * m[3],
    ctm[0] * m[4] + ctm[2] * m[5] + ctm[4],
    ctm[1] * m[4] + ctm[3] * m[5] + ctm[5],
  ];
}

function apply(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

const linearScale = (m: Mat): number => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

// pdf.js operator codes (OPS) and path-buffer codes (DrawOPS), pinned here
// so this module needs no value import from the library at load time.
const OP = {
  setLineWidth: 2, setDash: 6, setGState: 9, save: 10, restore: 11, transform: 12,
  stroke: 20, closeStroke: 21, fill: 22, eoFill: 23, fillStroke: 24, eoFillStroke: 25,
  closeFillStroke: 26, closeEOFillStroke: 27,
  paintFormXObjectBegin: 74, paintFormXObjectEnd: 75,
  paintImageMaskXObject: 83, paintImageXObject: 85, paintInlineImageXObject: 86,
  paintImageXObjectRepeat: 88, constructPath: 91,
} as const;
const DRAW = { moveTo: 0, lineTo: 1, curveTo: 2, quadraticCurveTo: 3, closePath: 4 } as const;

const STROKE_OPS = new Set<number>([OP.stroke, OP.closeStroke, OP.fillStroke, OP.eoFillStroke, OP.closeFillStroke, OP.closeEOFillStroke]);
const FILL_OPS = new Set<number>([OP.fill, OP.eoFill, OP.fillStroke, OP.eoFillStroke, OP.closeFillStroke, OP.closeEOFillStroke]);
const IMAGE_OPS = new Set<number>([OP.paintImageMaskXObject, OP.paintImageXObject, OP.paintInlineImageXObject, OP.paintImageXObjectRepeat]);

interface GState {
  ctm: Mat;
  lineWidth: number;
  dash: number[];
}

/** Subdivide a cubic Bézier (device coordinates) into chords. */
function flattenCubic(out: [number, number][], p0: Pt, p1: Pt, p2: Pt, p3: Pt): void {
  const approxLen =
    Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) +
    Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) +
    Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
  // ~0.35 mm chords in device points, bounded so a circle quadrant gets 4–32.
  const steps = Math.max(4, Math.min(32, Math.ceil(approxLen / 1)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([
      a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
    ]);
  }
}

interface PdfJsTextItem { str: string; transform: number[]; width: number }

/** Merge adjacent runs that share a baseline, direction and size. */
export function mergeTextRuns(runs: readonly PositionedText[]): PositionedText[] {
  const out: PositionedText[] = [];
  const sorted = [...runs].sort((a, b) => {
    // Group by rounded baseline offset perpendicular to the direction, then along it.
    const pa = a.x * -a.dir[1] + a.y * a.dir[0];
    const pb = b.x * -b.dir[1] + b.y * b.dir[0];
    if (Math.abs(pa - pb) > 0.3 * Math.max(a.sizeMm, b.sizeMm)) return pa - pb;
    return a.x * a.dir[0] + a.y * a.dir[1] - (b.x * b.dir[0] + b.y * b.dir[1]);
  });
  for (const run of sorted) {
    const prev = out[out.length - 1];
    if (prev && run.text.length > 0) {
      const sameDir = prev.dir[0] * run.dir[0] + prev.dir[1] * run.dir[1] > 0.999;
      const sameSize = Math.abs(prev.sizeMm - run.sizeMm) <= 0.15 * Math.max(prev.sizeMm, run.sizeMm);
      const endX = prev.x + prev.dir[0] * prev.widthMm;
      const endY = prev.y + prev.dir[1] * prev.widthMm;
      const along = (run.x - endX) * prev.dir[0] + (run.y - endY) * prev.dir[1];
      const across = Math.abs((run.x - prev.x) * -prev.dir[1] + (run.y - prev.y) * prev.dir[0]);
      if (sameDir && sameSize && across <= 0.3 * prev.sizeMm && along >= -0.3 * prev.sizeMm && along <= 0.6 * prev.sizeMm) {
        const needsSpace = along > 0.15 * prev.sizeMm && !prev.text.endsWith(' ') && !run.text.startsWith(' ');
        out[out.length - 1] = {
          ...prev,
          text: prev.text + (needsSpace ? ' ' : '') + run.text,
          widthMm: along + prev.widthMm + run.widthMm,
        };
        continue;
      }
    }
    if (run.text.length > 0) out.push({ ...run });
  }
  return out
    .map(t => ({ ...t, text: t.text.replace(/\s+/g, ' ').trim() }))
    .filter(t => t.text.length > 0);
}

/**
 * Read page `page` (1-based) of a PDF into sheet-millimetre vectors and text.
 *
 * @throws {PdfReadError} when the bytes are not a readable PDF or the page
 *   number is out of range.
 */
export async function readPdfPageVectors(data: Uint8Array, page = 1): Promise<PdfPageVectors> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
  try {
    doc = await pdfjs.getDocument({
      // pdf.js transfers (detaches) the buffer it is given; hand it a copy.
      data: new Uint8Array(data),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    }).promise;
  } catch (err) {
    throw new PdfReadError('unreadable', `not a readable PDF: ${err instanceof Error ? err.message : String(err)}`);
  }
  try {
    if (!Number.isInteger(page) || page < 1 || page > doc.numPages) {
      throw new PdfReadError('page-out-of-range', `page ${page} is out of range — the document has ${doc.numPages} page(s).`);
    }
    const pdfPage = await doc.getPage(page);
    const viewport = pdfPage.getViewport({ scale: 1 });
    // Viewport maps PDF user space to a y-down, rotation-applied frame in points.
    const V = viewport.transform as Mat;
    const widthMm = viewport.width * MM_PER_PT;
    const heightMm = viewport.height * MM_PER_PT;
    const toSheet = (m: Mat, x: number, y: number): [number, number] => {
      const [dx, dy] = apply(m, x, y);
      const [vx, vy] = apply(V, dx, dy);
      return [vx * MM_PER_PT, vy * MM_PER_PT];
    };

    const ops = await pdfPage.getOperatorList();
    const paths: VectorPath[] = [];
    let imageCount = 0;
    let imageArea = 0;
    const stack: GState[] = [];
    let gs: GState = { ctm: IDENTITY, lineWidth: 1, dash: [] };

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i] as unknown[];
      switch (fn) {
        case OP.save:
          stack.push({ ...gs, dash: [...gs.dash] });
          break;
        case OP.restore:
          gs = stack.pop() ?? gs;
          break;
        case OP.transform:
          gs = { ...gs, ctm: mul(gs.ctm, args as unknown as Mat) };
          break;
        case OP.paintFormXObjectBegin: {
          stack.push({ ...gs, dash: [...gs.dash] });
          const matrix = args[0] as number[] | null;
          if (Array.isArray(matrix) || ArrayBuffer.isView(matrix)) {
            gs = { ...gs, ctm: mul(gs.ctm, Array.from(matrix as ArrayLike<number>) as Mat) };
          }
          break;
        }
        case OP.paintFormXObjectEnd:
          gs = stack.pop() ?? gs;
          break;
        case OP.setLineWidth:
          gs = { ...gs, lineWidth: Number(args[0]) };
          break;
        case OP.setDash:
          gs = { ...gs, dash: Array.from((args[0] as ArrayLike<number>) ?? []).map(Number) };
          break;
        case OP.setGState: {
          for (const [key, value] of (args[0] as Array<[string, unknown]>) ?? []) {
            if (key === 'LW') gs = { ...gs, lineWidth: Number(value) };
            if (key === 'D' && Array.isArray(value)) {
              gs = { ...gs, dash: Array.from((value[0] as ArrayLike<number>) ?? []).map(Number) };
            }
          }
          break;
        }
        case OP.constructPath: {
          const paintOp = Number(args[0]);
          const buffers = args[1] as ArrayLike<number>[] | undefined;
          const buf = buffers?.[0];
          const stroked = STROKE_OPS.has(paintOp);
          const filled = FILL_OPS.has(paintOp);
          if (!buf || (!stroked && !filled)) break;
          const scale = linearScale(gs.ctm);
          const widthMm = stroked ? gs.lineWidth * scale * MM_PER_PT : 0;
          const dash = stroked ? gs.dash.map(d => d * scale * MM_PER_PT) : [];
          let current: [number, number][] = [];
          let start: [number, number] | null = null;
          let curved = false;
          let closed = false;
          const flush = () => {
            if (current.length >= 2) {
              const pts: Pt[] = current.map(([x, y]) => toSheet(gs.ctm, x, y));
              paths.push({ points: pts, closed, widthMm, dash, stroked, filled, curved });
            }
            current = [];
            curved = false;
            closed = false;
          };
          for (let k = 0; k < buf.length;) {
            const code = buf[k++];
            if (code === DRAW.moveTo) {
              flush();
              start = [buf[k], buf[k + 1]];
              current.push(start);
              k += 2;
            } else if (code === DRAW.lineTo) {
              current.push([buf[k], buf[k + 1]]);
              k += 2;
            } else if (code === DRAW.curveTo) {
              const p0 = current[current.length - 1] ?? [buf[k + 4], buf[k + 5]];
              flattenCubic(current, p0, [buf[k], buf[k + 1]], [buf[k + 2], buf[k + 3]], [buf[k + 4], buf[k + 5]]);
              curved = true;
              k += 6;
            } else if (code === DRAW.quadraticCurveTo) {
              const p0 = current[current.length - 1] ?? [buf[k + 2], buf[k + 3]];
              const c: Pt = [buf[k], buf[k + 1]];
              const p3: Pt = [buf[k + 2], buf[k + 3]];
              flattenCubic(
                current,
                p0,
                [p0[0] + (2 / 3) * (c[0] - p0[0]), p0[1] + (2 / 3) * (c[1] - p0[1])],
                [p3[0] + (2 / 3) * (c[0] - p3[0]), p3[1] + (2 / 3) * (c[1] - p3[1])],
                p3,
              );
              curved = true;
              k += 4;
            } else if (code === DRAW.closePath) {
              if (start && current.length > 0) {
                const last = current[current.length - 1];
                if (last[0] !== start[0] || last[1] !== start[1]) current.push([start[0], start[1]]);
              }
              closed = true;
              const reopen = start;
              flush();
              if (reopen) current.push(reopen);
            } else {
              break; // unknown code: stop reading this buffer rather than misparse it
            }
          }
          if (current.length >= 2) flush();
          break;
        }
        default:
          if (IMAGE_OPS.has(fn)) {
            imageCount++;
            const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => toSheet(gs.ctm, x, y));
            const xs = corners.map(c => c[0]);
            const ys = corners.map(c => c[1]);
            imageArea += (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
          }
          break;
      }
    }

    const content = await pdfPage.getTextContent();
    const runs: PositionedText[] = [];
    for (const raw of content.items as unknown[]) {
      const item = raw as PdfJsTextItem;
      if (typeof item.str !== 'string' || !Array.isArray(item.transform)) continue;
      const [a, b, c, d, e, f] = item.transform;
      const [x, y] = toSheet(IDENTITY, e, f);
      const [dx0, dy0] = apply(V, a, b);
      const [ox, oy] = apply(V, 0, 0);
      const dirX = dx0 - ox, dirY = dy0 - oy;
      const dirLen = Math.hypot(dirX, dirY) || 1;
      runs.push({
        text: item.str,
        x,
        y,
        dir: [dirX / dirLen, dirY / dirLen],
        sizeMm: Math.hypot(c, d) * MM_PER_PT,
        widthMm: item.width * MM_PER_PT,
      });
    }

    return {
      page,
      pageCount: doc.numPages,
      widthMm,
      heightMm,
      paths,
      texts: mergeTextRuns(runs),
      imageCount,
      imageCoverage: Math.min(1, imageArea / (widthMm * heightMm)),
    };
  } finally {
    await doc.destroy();
  }
}
