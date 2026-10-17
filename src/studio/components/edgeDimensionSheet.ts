// SPDX-License-Identifier: MIT
import { edgeDimensionSvg, formatDimValue, orthoModelPoint, straightSpans, type Pt2 } from '../../kernel/backends/occt/drawingLayout';
import type { TaggedView } from './drawingSheetHit';

export interface SheetEdgeDim {
  id: string;
  view: 'front' | 'top' | 'left';
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  gap?: number;
  hover?: boolean;
  /** Sheet endpoints, when the preview has no model transform. */
  sheet?: readonly [Pt2, Pt2];
}

function viewFrame(svg: string, view: string): { tx: number; ty: number; s: number } | null {
  const group = new RegExp(`data-view="${view}"([^>]*)>`).exec(svg)?.[1] ?? '';
  const num = (name: string) => Number(new RegExp(`data-kc-${name}="([^"]+)"`).exec(group)?.[1]);
  const tx = num('tx');
  const ty = num('ty');
  const s = num('s');
  if (![tx, ty, s].every(Number.isFinite) || s === 0) return null;
  return { tx, ty, s };
}

function sheetPoint(frame: { tx: number; ty: number; s: number }, view: SheetEdgeDim['view'], p: readonly [number, number, number]): Pt2 {
  const [mx, my] = orthoModelPoint(view, p);
  return [frame.tx + frame.s * mx, frame.ty - frame.s * my];
}

export function drawingScale(svg: string): number {
  const raw = /data-kc-scale="([^"]+)"/.exec(svg)?.[1] ?? '1:1';
  const [num, den] = raw.split(':').map(Number);
  if (!num || !den) return 1;
  return num / den;
}

function pathPolylines(d: string): Pt2[][] {
  const out: Pt2[][] = [];
  let cur: Pt2[] = [];
  const tokens = d.match(/[ML]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  for (let i = 0; i < tokens.length;) {
    const token = tokens[i];
    if (token === 'M' || token === 'm') {
      if (cur.length > 1) out.push(cur);
      cur = [];
      i += 1;
      continue;
    }
    if (token === 'L' || token === 'l') { i += 1; continue; }
    const x = Number(token);
    const y = Number(tokens[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) { cur.push([x, y]); i += 2; }
    else i += 1;
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

/** Straight edges from visible path geometry, for a sheet the server did not tag. */
export function edgesFromMarkup(svg: string): TaggedView[] {
  const scale = drawingScale(svg);
  const views: TaggedView[] = [];
  for (const view of ['front', 'top', 'left'] as const) {
    const start = svg.indexOf(`id="view-${view}"`);
    if (start < 0) continue;
    const next = svg.indexOf('id="view-', start + 12);
    const body = svg.slice(start, next < 0 ? undefined : next);
    const visible = /<g class="visible"[^>]*>([\s\S]*?)<\/g>/.exec(body)?.[1] ?? '';
    const segments = [...visible.matchAll(/<path d="([^"]+)"/g)].flatMap((match) =>
      pathPolylines(match[1]).flatMap((pl) => straightSpans(pl).map(([a, b]) => [a[0], -a[1], b[0], -b[1]] as [number, number, number, number])));
    if (segments.length > 0) views.push({ view, tx: 0, ty: 0, s: 1, modelSpace: false, drawingScale: scale, segments });
  }
  return views;
}

function modelLength(dim: SheetEdgeDim): number {
  const [x0, y0] = orthoModelPoint(dim.view, dim.from);
  const [x1, y1] = orthoModelPoint(dim.view, dim.to);
  return Math.hypot(x1 - x0, y1 - y0);
}

function drawDim(svg: string, dim: SheetEdgeDim): string {
  const frame = viewFrame(svg, dim.view);
  const a = dim.sheet?.[0] ?? (frame ? sheetPoint(frame, dim.view, dim.from) : null);
  const b = dim.sheet?.[1] ?? (frame ? sheetPoint(frame, dim.view, dim.to) : null);
  if (!a || !b) return '';
  const length = dim.sheet ? Math.hypot(b[0] - a[0], b[1] - a[1]) / drawingScale(svg) : modelLength(dim);
  const body = edgeDimensionSvg(a, b, formatDimValue(length), dim.gap ?? 8);
  if (!body) return '';
  const id = `authored:${dim.id}`;
  const attrs = dim.hover ? ' pointer-events="none"' : ` data-kc-annotation-id="${id}"`;
  return body.replace(/^(<g\b)/, `$1${attrs}`);
}

/** Draw placed edge dimensions into a sheet that does not already contain them. */
export function injectEdgeDimensions(svg: string, dims: readonly SheetEdgeDim[]): string {
  const extras = dims.flatMap((dim) => {
    const id = `authored:${dim.id}`;
    if (!dim.hover && svg.includes(`data-kc-annotation-id="${id}"`)) return [];
    const drawn = drawDim(svg, dim);
    return drawn ? [drawn] : [];
  });
  if (extras.length === 0 || !svg.includes('</svg>')) return svg;
  return svg.replace('</svg>', `${extras.join('')}</svg>`);
}
