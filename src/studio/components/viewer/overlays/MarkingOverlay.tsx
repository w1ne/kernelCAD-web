import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { shellStore } from '../../../store/shellStore';
import { rendererSnapshot } from '../rendererSnapshot';

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
      persistMark();
    }, 500);
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

  /** Raycast each painted pixel of the mask into the live three.js scene
   *  and return the unique assembly part names (and other userData
   *  identifiers) the brush hit. Lets the agent see *which structures* the
   *  user marked, not just where on screen.
   *
   *  Sampling: every N px on both axes — 1280×800 viewport at 16-px stride
   *  is ~4000 rays, cheap and exhaustive enough that small painted regions
   *  don't get missed. */
  function struckPartsFromMask(): string[] {
    const canvas = canvasRef.current;
    const { scene, camera, gl } = rendererSnapshot;
    if (!canvas || !scene || !camera || !gl) return [];
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    let img: ImageData;
    try {
      img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return [];
    }
    const STEP = 16;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hits = new Set<string>();
    const rendererCanvas = gl.domElement;
    const rRect = rendererCanvas.getBoundingClientRect();
    const mRect = canvas.getBoundingClientRect();
    for (let y = 0; y < canvas.height; y += STEP) {
      for (let x = 0; x < canvas.width; x += STEP) {
        const i = (y * canvas.width + x) * 4;
        // Red strokes with high red, low green/blue channel, opaque alpha.
        if (img.data[i + 3] < 100) continue;
        if (img.data[i] < 200 || img.data[i + 1] > 120) continue;
        // Mask-canvas px → CSS px (in viewport) → renderer-canvas NDC.
        const cssX = mRect.left + (x / canvas.width) * mRect.width;
        const cssY = mRect.top + (y / canvas.height) * mRect.height;
        ndc.x = ((cssX - rRect.left) / rRect.width) * 2 - 1;
        ndc.y = -(((cssY - rRect.top) / rRect.height) * 2 - 1);
        if (ndc.x < -1 || ndc.x > 1 || ndc.y < -1 || ndc.y > 1) continue;
        raycaster.setFromCamera(ndc, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        // First-hit-with-name wins. We only walk a couple intersections
        // because the meshes are usually opaque — the front face is what
        // the user "sees" and intended to mark.
        for (let k = 0; k < Math.min(2, intersects.length); k++) {
          const obj = intersects[k].object;
          const u = obj.userData as { ownerId?: unknown; assemblyPartName?: unknown; name?: unknown };
          const id =
            (typeof u?.ownerId === 'string' && u.ownerId) ||
            (typeof u?.assemblyPartName === 'string' && u.assemblyPartName) ||
            (typeof u?.name === 'string' && u.name) ||
            (typeof obj.name === 'string' && obj.name) ||
            null;
          if (id) {
            hits.add(id);
            break;
          }
        }
      }
    }
    return Array.from(hits);
  }

  function screenshotAsPng(): string | null {
    const renderer = findRendererCanvas();
    if (!renderer) return null;
    return renderer.toDataURL('image/png');
  }

  // Fire-and-forget save on unmount. Agents pick the packet up via the
  // `review_paint_peek_latest` MCP tool (any client) or the UserPromptSubmit
  // hook (Claude Code).
  //
  // Robust against partial state: if the three.js canvas isn't found (e.g.
  // user toggled the brush before the kernel was ready and the renderer
  // canvas hadn't mounted), we still save the mask — the agent can read
  // the red strokes from the mask alone and ask "what's marked here?".
  function persistMark() {
    console.log('[marking-overlay] persistMark fired, dirty=' + dirtyRef.current);
    if (!dirtyRef.current) {
      console.log('[marking-overlay] nothing painted — skipping save');
      return;
    }
    let screenshot: string | null;
    try {
      screenshot = screenshotAsPng();
    } catch (err) {
      console.warn('[marking-overlay] screenshot capture threw:', err);
      screenshot = null;
    }
    if (!screenshot) {
      console.warn('[marking-overlay] no renderer canvas found — saving mask only');
    }
    const mask = maskAsPng();
    const struckParts = struckPartsFromMask();
    console.log(`[marking-overlay] struck parts:`, struckParts);
    const scriptParam = new URLSearchParams(window.location.search).get('script');
    const meta = {
      note: '',
      scriptPath: scriptParam,
      ts: new Date().toISOString(),
      ua: navigator.userAgent,
      screenshotMissing: screenshot === null,
      struckParts,
    };
    // POST to the standalone save server (port 5174, auto-spawned by vite as
    // a worker thread) so saves keep working when vite's main thread
    // saturates on OCCT/replicad transforms.
    //
    // We deliberately do NOT set `keepalive: true`: Chrome silently rejects
    // keepalive fetches with bodies over 64 KB, and a viewport screenshot +
    // mask base64-encoded blows through that cap easily. Without keepalive,
    // the fetch fires as a normal request — the component is unmounting but
    // the request is in flight on the global queue and completes regardless.
    const saveUrl =
      `${window.location.protocol}//${window.location.hostname}:5174/__kernelcad/review-paint`;
    // mask is always present; screenshot may be empty string if renderer canvas
    // was missing — server stores both keys regardless.
    const body = JSON.stringify({ screenshot: screenshot ?? '', mask, meta });
    console.log(`[marking-overlay] saving mark (${(body.length / 1024).toFixed(0)} KB) to ${saveUrl}`);
    fetch(saveUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log(`[marking-overlay] mark saved (${saveUrl})`);
      })
      .catch((err) => {
        console.warn('[marking-overlay] save to :5174 failed, trying same-origin fallback:', err);
        fetch('/__kernelcad/review-paint', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
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
