import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { shellStore } from '../../../store/shellStore';

/**
 * Inpainting-style review overlay. When `markingMode` is on, a transparent
 * HTML canvas sits above the three.js viewer canvas, absorbs pointer events,
 * and lets the user paint red strokes over what's wrong in the viewport.
 *
 * UX is intentionally bare: the toolbar's `Brush` button is the toggle.
 * On (red ring) = paint. Off = save + dismiss. There is no in-overlay
 * panel, no size slider, no undo/clear/Send — if a stroke goes wrong, the
 * user toggles off (saving the bad strokes) and on (starting fresh). The
 * agent's hook + MCP `review_paint_peek_latest` tool always picks up the
 * newest packet, so older bad packets are harmless.
 *
 * Save: on unmount (toolbar toggle off, Esc, or markingMode→false from any
 * other path) the overlay fire-and-forget POSTs the canvas + a viewport
 * screenshot to `/__kernelcad/review-paint`. `keepalive: true` lets the
 * fetch survive the component unmount.
 */

const FIXED_BRUSH_PX = 24;

export function MarkingOverlay({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // True once the user has painted anything; gates the auto-save on
  // close so blank-canvas opens don't write an empty packet.
  const dirtyRef = useRef(false);
  // Live cursor coords for brush-size preview (Krita/Procreate style).
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Escape closes marking mode — Photoshop / Figma muscle memory.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        shellStore.setMarkingMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // CSS-pixel point → canvas-bitmap coordinate. Bitmap may be briefly
  // smaller than the CSS box before the ResizeObserver settles.
  function toBitmap(p: { x: number; y: number }) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width > 0 ? canvas.width / rect.width : 1;
    const sy = rect.height > 0 ? canvas.height / rect.height : 1;
    return { x: p.x * sx, y: p.y * sy };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    dirtyRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    lastPointRef.current = p;
    const bp = toBitmap(p);
    paintDot(ctx, bp.x, bp.y, FIXED_BRUSH_PX);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = pointerPos(e);
    setCursorPos(p);
    if (!drawingRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const last = lastPointRef.current;
    if (last) {
      const bpLast = toBitmap(last);
      const bp = toBitmap(p);
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

  function findRendererCanvas(): HTMLCanvasElement | null {
    const all = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
    return all.find((c) => c !== canvasRef.current) ?? null;
  }

  function maskAsPng(): string {
    const canvas = canvasRef.current!;
    return canvas.toDataURL('image/png');
  }

  function screenshotAsPng(): string | null {
    const renderer = findRendererCanvas();
    if (!renderer) return null;
    return renderer.toDataURL('image/png');
  }

  // Fire-and-forget save on unmount. Agents pick the packet up via the
  // `review_paint_peek_latest` MCP tool (any client) or the UserPromptSubmit
  // hook (Claude Code). `keepalive: true` lets the fetch survive the
  // unmount that triggered it.
  function persistMark() {
    if (!dirtyRef.current) return;
    const screenshot = screenshotAsPng();
    if (!screenshot) return;
    const mask = maskAsPng();
    const scriptParam = new URLSearchParams(window.location.search).get('script');
    const meta = {
      note: '',
      scriptPath: scriptParam,
      ts: new Date().toISOString(),
      ua: navigator.userAgent,
    };
    // POST to the standalone save server (port 5174, auto-spawned by vite as
    // a worker thread). Posting to the same vite origin was unreliable
    // because vite's main thread routinely saturates on OCCT/replicad
    // transforms and drops connections; the worker thread keeps responding
    // through that. Vite's middleware also still handles the route as a
    // fallback when the worker isn't running.
    const saveUrl =
      `${window.location.protocol}//${window.location.hostname}:5174/__kernelcad/review-paint`;
    fetch(saveUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ screenshot, mask, meta }),
      keepalive: true,
    }).catch((err) => {
      console.warn('[marking-overlay] save to :5174 failed, trying same-origin fallback:', err);
      fetch('/__kernelcad/review-paint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ screenshot, mask, meta }),
        keepalive: true,
      }).catch((err2) => {
        console.warn('[marking-overlay] same-origin fallback also failed:', err2);
      });
    });
  }

  useEffect(() => {
    return () => { persistMark(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="marking-overlay-root"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="marking-overlay-canvas"
        width={canvasSize.w}
        height={canvasSize.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.45,
          cursor: 'none',
          touchAction: 'none',
        }}
      />
      {cursorPos && (
        <div
          data-testid="marking-brush-preview"
          style={{
            position: 'absolute',
            left: cursorPos.x - FIXED_BRUSH_PX / 2,
            top: cursorPos.y - FIXED_BRUSH_PX / 2,
            width: FIXED_BRUSH_PX,
            height: FIXED_BRUSH_PX,
            border: '1.5px solid rgba(239, 68, 68, 0.9)',
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            mixBlendMode: 'difference',
          }}
        />
      )}
    </div>
  );
}
