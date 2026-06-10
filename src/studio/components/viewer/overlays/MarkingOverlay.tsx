import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { shellStore } from '../../../store/shellStore';
import { rendererSnapshot } from '../rendererSnapshot';
import { resolveReviewPaintTargets } from './reviewPaintTargets';

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
 * screenshot. Targets come from `resolveReviewPaintTargets`: hosted /p pages
 * go to the backend (`/api/v1/review-paint`, packet keyed by project slug),
 * local dev goes to the :5174 save server, same-origin as fallback either way.
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

  /** Raycast painted pixels into the live three.js scene and return the
   *  unique structural identifiers the brush hit. Walks the parent chain
   *  because the named ownerId may live on a parent group rather than the
   *  leaf mesh (consolidated meshes have it, but spring/coil segments
   *  rendered as separate primitives often don't). */
  function struckPartsFromMask(): { parts: string[]; debug: Record<string, number | boolean> } {
    const canvas = canvasRef.current;
    const { scene, camera } = rendererSnapshot;
    const debug = {
      snapshotReady: !!(scene && camera),
      paintedSamples: 0,
      raysCast: 0,
      anyIntersection: 0,
      namedHits: 0,
    };
    if (!canvas || !scene || !camera) return { parts: [], debug };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { parts: [], debug };
    let img: ImageData;
    try {
      img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return { parts: [], debug };
    }
    const STEP = 16;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hits = new Set<string>();
    // Both canvases share the same parent box and fill it 100%/100%, so
    // their CSS rects coincide. Use the mask's own rect for NDC — no need
    // to cross-reference the renderer canvas.
    const mRect = canvas.getBoundingClientRect();
    for (let y = 0; y < canvas.height; y += STEP) {
      for (let x = 0; x < canvas.width; x += STEP) {
        const i = (y * canvas.width + x) * 4;
        if (img.data[i + 3] < 100) continue;
        if (img.data[i] < 200 || img.data[i + 1] > 120) continue;
        debug.paintedSamples++;
        // Pixel (x,y) in the mask bitmap → NDC. Bitmap may differ from CSS
        // box size; the ratio collapses out because we go bitmap→fraction→NDC.
        ndc.x = (x / canvas.width) * 2 - 1;
        ndc.y = -((y / canvas.height) * 2 - 1);
        raycaster.setFromCamera(ndc, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        debug.raysCast++;
        if (intersects.length > 0) debug.anyIntersection++;
        // Walk first few intersections + their parent chains looking for ANY
        // identifier. Hierarchy: ownerId (named consolidated shape) → name
        // userData → object3D.name → shapeIndex (unnamed shape, still
        // disambiguating). The shapeIndex fallback matters because Luxo-style
        // scripts often leave springs/anchors unnamed but they still have a
        // distinct shapeIndex set on the consolidated mesh's userData.
        let found = false;
        for (let k = 0; k < Math.min(3, intersects.length) && !found; k++) {
          let obj: THREE.Object3D | null = intersects[k].object;
          while (obj && !found) {
            const u = obj.userData as {
              ownerId?: unknown;
              assemblyPartName?: unknown;
              partName?: unknown;
              name?: unknown;
              shapeIndex?: unknown;
            };
            const named =
              (typeof u?.ownerId === 'string' && u.ownerId) ||
              (typeof u?.assemblyPartName === 'string' && u.assemblyPartName) ||
              (typeof u?.partName === 'string' && u.partName) ||
              (typeof u?.name === 'string' && u.name) ||
              (typeof obj.name === 'string' && obj.name.length > 0 && obj.name) ||
              null;
            if (named) {
              hits.add(named);
              debug.namedHits++;
              found = true;
              break;
            }
            if (typeof u?.shapeIndex === 'number') {
              hits.add(`shape#${u.shapeIndex}`);
              debug.namedHits++;
              found = true;
              break;
            }
            obj = obj.parent;
          }
        }
        void mRect; // mRect unused after the rect-collapse simplification — keep for future viewport partial-overlap fixes
      }
    }
    return { parts: Array.from(hits), debug };
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
    const { parts: struckParts, debug: raycastDebug } = struckPartsFromMask();
    console.log(`[marking-overlay] struck parts:`, struckParts, 'debug:', raycastDebug);
    const scriptParam = new URLSearchParams(window.location.search).get('script');
    // Same env resolution order as apiBase.ts, but NOT session-gated:
    // anonymous brushing on hosted /p pages is the point, so the backend
    // target comes straight from the build env — no Supabase session needed.
    const apiBase =
      import.meta.env.VITE_KERNELCAD_API_BASE ??
      import.meta.env.VITE_API_BASE_URL ??
      undefined;
    const { slug, urls } = resolveReviewPaintTargets(
      window.location.pathname,
      apiBase,
    );
    const meta = {
      note: '',
      scriptPath: scriptParam,
      ts: new Date().toISOString(),
      ua: navigator.userAgent,
      screenshotMissing: screenshot === null,
      struckParts,
      raycastDebug,
      // On hosted /p pages the backend keys the packet by project slug so
      // `review_paint_peek_latest {slug}` can fetch it without auth.
      ...(slug ? { projectSlug: slug } : {}),
    };
    // Local dev: POST to the standalone save server (port 5174, auto-spawned
    // by vite as a worker thread) so saves keep working when vite's main
    // thread saturates on OCCT/replicad transforms. Hosted /p pages: POST to
    // the backend first. Either way, same-origin is the fallback.
    //
    // We deliberately do NOT set `keepalive: true`: Chrome silently rejects
    // keepalive fetches with bodies over 64 KB, and a viewport screenshot +
    // mask base64-encoded blows through that cap easily. Without keepalive,
    // the fetch fires as a normal request — the component is unmounting but
    // the request is in flight on the global queue and completes regardless.
    const [saveUrl, fallbackUrl] = urls;
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
        console.warn(`[marking-overlay] save to ${saveUrl} failed, trying fallback:`, err);
        fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
        }).catch((err2) => {
          console.warn('[marking-overlay] fallback save also failed:', err2);
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
