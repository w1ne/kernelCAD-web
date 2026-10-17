// SPDX-License-Identifier: MIT
import { edgeDimensionSvg, formatDimValue, orthoModelPoint, type Pt2 } from '../../kernel/backends/occt/drawingLayout';

export interface SheetEdgeDim {
  id: string;
  view: 'front' | 'top' | 'left';
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  gap?: number;
  hover?: boolean;
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

function drawDim(svg: string, dim: SheetEdgeDim): string {
  const frame = viewFrame(svg, dim.view);
  if (!frame) return '';
  const a = sheetPoint(frame, dim.view, dim.from);
  const b = sheetPoint(frame, dim.view, dim.to);
  const [x0, y0] = orthoModelPoint(dim.view, dim.from);
  const [x1, y1] = orthoModelPoint(dim.view, dim.to);
  const body = edgeDimensionSvg(a, b, formatDimValue(Math.hypot(x1 - x0, y1 - y0)), dim.gap ?? 8);
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
