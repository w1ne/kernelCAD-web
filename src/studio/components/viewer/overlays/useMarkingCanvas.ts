// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useLayoutEffect, useRef, useState } from 'react';

export const FIXED_BRUSH_PX = 24;

function pointerPos(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// CSS-pixel point → canvas-bitmap coordinate. Bitmap may be briefly
// smaller than the CSS box before the ResizeObserver settles.
function toBitmap(canvas: HTMLCanvasElement, p: { x: number; y: number }) {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const sy = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: p.x * sx, y: p.y * sy };
}

function paintDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.fillStyle = 'rgb(239, 68, 68)';
  ctx.beginPath();
  ctx.arc(x, y, radius / 2, 0, Math.PI * 2);
  ctx.fill();
}

export function useMarkingCanvas(visible: boolean, persist: () => void) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // True once the user has painted anything; gates the auto-save on
  // close so blank-canvas opens don't write an empty packet.
  const dirtyRef = useRef(false);
  // Live cursor coords for brush-size preview (Krita/Procreate style).
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas BITMAP sizing — see history for the 300×150 default-attribute trap.
  // useLayoutEffect: synchronous after DOM mutation, before paint, so the
  // first painted frame already has the correct bitmap size (a state
  // bump from 800×600 fallback to the real parent rect would clear the
  // canvas mid-interaction).
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      setCanvasSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    const onWinResize = () => measure();
    window.addEventListener('resize', onWinResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    dirtyRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const p = pointerPos(canvas, e);
    lastPointRef.current = p;
    const bp = toBitmap(canvas, p);
    paintDot(ctx, bp.x, bp.y, FIXED_BRUSH_PX);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = pointerPos(canvas, e);
    setCursorPos(p);
    if (!drawingRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const last = lastPointRef.current;
    if (last) {
      const bpLast = toBitmap(canvas, last);
      const bp = toBitmap(canvas, p);
      // Highlighter semantics: solid red on the bitmap + CSS opacity on
      // the canvas. Overlapping strokes do not stack alpha.
      ctx.strokeStyle = 'rgb(239, 68, 68)';
      ctx.lineWidth = FIXED_BRUSH_PX;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(bpLast.x, bpLast.y);
      ctx.lineTo(bp.x, bp.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
  }

  function onPointerLeave() {
    setCursorPos(null);
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    canvas?.releasePointerCapture(e.pointerId);
    // Save after every stroke so the agent can see the in-progress mark
    // without the user having to toggle the brush off. Debounced so a
    // multi-stroke flurry only POSTs once after the user pauses.
    schedulePersist();
  }

  // 500 ms after the last pointer-up, persist the current mark. Resets on
  // every new stroke — only the final state hits disk per gesture.
  const persistTimerRef = useRef<number | null>(null);
  function schedulePersist() {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      persist();
    }, 500);
  }

  return {
    canvasRef,
    dirtyRef,
    cursorPos,
    canvasSize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
  };
}
