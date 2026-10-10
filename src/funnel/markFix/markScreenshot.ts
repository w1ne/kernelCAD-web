// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * A small JPEG of the viewer with the numbered pins drawn on it, for the
 * agent to look at next to the structured targets. Best effort: returns null
 * when the canvas cannot be read or the image will not fit the budget.
 */
import { MAX_SCREENSHOT_CHARS } from './editRequest';

const MAX_EDGE_PX = 512;
const QUALITIES = [0.72, 0.55, 0.4];

export interface ScreenPin {
  x: number;
  y: number;
}

export function markScreenshot(source: HTMLCanvasElement | null, pins: readonly ScreenPin[]): string | null {
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
    drawPins(ctx, pins, scale);
    for (const q of QUALITIES) {
      const url = out.toDataURL('image/jpeg', q);
      if (url.startsWith('data:image/jpeg') && url.length <= MAX_SCREENSHOT_CHARS) return url;
    }
  } catch {
    // Tainted or lost context: send without the picture.
  }
  return null;
}

function drawPins(ctx: CanvasRenderingContext2D, pins: readonly ScreenPin[], scale: number): void {
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  pins.forEach((pin, i) => {
    const x = pin.x * scale;
    const y = pin.y * scale;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#e8590c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(i + 1), x, y + 0.5);
  });
}
