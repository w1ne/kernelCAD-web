// SPDX-License-Identifier: MIT

/** Camera over the drawing sheet, in viewport pixels. */
export interface SheetView { x: number; y: number; scale: number }

export const MIN_SCALE = 0.08;
const MAX_SCALE = 16;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Zoom toward a viewport point, keeping that point fixed on the sheet. */
export function zoomAt(view: SheetView, px: number, py: number, nextScale: number): SheetView {
  const scale = clampScale(nextScale);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** Fit a sheet of `sheetW`×`sheetH` user units into the viewport. */
export function fitSheet(vpW: number, vpH: number, sheetW: number, sheetH: number, pad = 32): SheetView {
  const scale = clampScale(Math.min((vpW - pad) / Math.max(sheetW, 1), (vpH - pad) / Math.max(sheetH, 1)));
  return { scale, x: (vpW - sheetW * scale) / 2, y: (vpH - sheetH * scale) / 2 };
}

/** Frame one annotation box (sheet user units) in the viewport. */
export function frameRect(vpW: number, vpH: number, rect: { x: number; y: number; width: number; height: number }, pad = 72): SheetView {
  const w = Math.max(rect.width, 8);
  const h = Math.max(rect.height, 8);
  const scale = clampScale(Math.min((vpW - pad) / w, (vpH - pad) / h, 8));
  return { scale, x: vpW / 2 - (rect.x + rect.width / 2) * scale, y: vpH / 2 - (rect.y + rect.height / 2) * scale };
}

/** Drop script and event-handler attributes from a server sheet before injecting it. */
export function sheetMarkup(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/** View box size from the sheet markup. Happy-dom often reports a zero box. */
export function sheetViewBox(svg: string): { width: number; height: number } | null {
  const raw = /viewBox\s*=\s*"([^"]+)"/.exec(svg)?.[1];
  if (!raw) return null;
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || !(parts[2] > 0) || !(parts[3] > 0)) return null;
  return { width: parts[2], height: parts[3] };
}
