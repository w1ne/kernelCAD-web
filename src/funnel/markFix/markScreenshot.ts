// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * A small JPEG of the viewer with the painted strokes drawn on it, for the
 * agent to look at next to the structured targets. Best effort: returns null
 * when the canvas cannot be read or the image will not fit the budget.
 */
import { MAX_SCREENSHOT_CHARS } from './marks';

const MAX_EDGE_PX = 512;
const QUALITIES = [0.72, 0.55, 0.4];

export interface ScreenPoint {
  x: number;
  y: number;
}

export function markScreenshot(source: HTMLCanvasElement | null, strokes: readonly (readonly ScreenPoint[])[]): string | null {
  if (!source || source.width === 0 || source.height === 0) return null;
  const cssW = source.clientWidth || source.width;
  const cssH = source.clientHeight || source.height;
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(cssW, cssH));
  const w = Math.max(1, Math.round(cssW * scale));
  const h = Math.max(1, Math.round(cssH * scale));
  try {
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);
    drawStrokes(ctx, strokes, scale);
    for (const q of QUALITIES) {
      const url = out.toDataURL('image/jpeg', q);
      if (url.startsWith('data:image/jpeg') && url.length <= MAX_SCREENSHOT_CHARS) return url;
    }
  } catch {
    // Tainted or lost context: send without the picture.
  }
  return null;
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: readonly (readonly ScreenPoint[])[], scale: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  strokes.forEach((stroke, i) => {
    if (stroke.length === 0) return;
    ctx.beginPath();
    stroke.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x * scale, p.y * scale) : ctx.lineTo(p.x * scale, p.y * scale)));
    if (stroke.length === 1) ctx.lineTo(stroke[0]!.x * scale + 0.1, stroke[0]!.y * scale);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = '#e8590c';
    ctx.lineWidth = 5;
    ctx.stroke();
    // Number the stroke at its start so the text can say "#1", "#2".
    const s0 = stroke[0]!;
    ctx.beginPath();
    ctx.arc(s0.x * scale, s0.y * scale - 12, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#e8590c';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(i + 1), s0.x * scale, s0.y * scale - 11.5);
  });
}
