import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Brush, X as XIcon } from 'lucide-react';
import { shellStore } from '../../../store/shellStore';
import { useShellStore } from '../../../store/useShellStore';

/**
 * (Removed from default mount per user feedback — too visually noisy.) Keeping
 * the export so it can be re-mounted via a settings toggle in a future slice.
 * The toolbar `Brush` button (Toolbar.tsx) is the canonical activator.
 */
export function MarkingFab() {
  const { markingMode } = useShellStore();
  return (
    <button
      type="button"
      data-testid="marking-fab"
      onClick={() => shellStore.toggleMarkingMode()}
      aria-pressed={markingMode}
      aria-label={markingMode ? 'Exit review brush' : 'Paint a review over what is wrong'}
      title={markingMode ? 'Exit review brush' : 'Paint a review over what is wrong'}
      style={{
        position: 'absolute',
        right: 24,
        bottom: 24,
        zIndex: 900,
        width: 64,
        height: 64,
        borderRadius: '50%',
        border: markingMode ? '3px solid #fca5a5' : '3px solid #fef2f2',
        background: markingMode ? '#dc2626' : '#ef4444',
        color: 'white',
        cursor: 'pointer',
        boxShadow: markingMode
          ? '0 0 0 6px rgba(239, 68, 68, 0.25), 0 8px 24px rgba(0,0,0,0.5)'
          : '0 8px 24px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease-out',
        animation: markingMode ? 'none' : 'marking-fab-pulse 2s ease-in-out infinite',
      }}
    >
      <Brush size={28} strokeWidth={2.4} />
      <span
        style={{
          position: 'absolute',
          right: 72,
          background: 'rgba(17,17,17,0.92)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          border: '1px solid #2b313c',
        }}
      >
        {markingMode ? 'Painting — click to exit' : 'Paint a review'}
      </span>
      {/* Keyframes only need to be injected once — multiple <style> tags are
          fine, browsers de-dupe by content. */}
      <style>{`@keyframes marking-fab-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5), 0 8px 24px rgba(0,0,0,0.5); }
        50%      { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0), 0 8px 24px rgba(0,0,0,0.5); }
      }`}</style>
    </button>
  );
}

/**
 * Inpainting-style review overlay. When `markingMode` is on, a transparent
 * HTML canvas sits above the three.js viewer canvas, absorbs pointer events,
 * and lets the user paint red strokes over what's wrong. On Send, the
 * overlay POSTs a packet (viewport screenshot, mask, one-line note,
 * camera + script metadata) to the dev-only `/__kernelcad/review-paint`
 * route. A Claude Code UserPromptSubmit hook auto-attaches the latest
 * packet on the next agent turn so the user never copy-pastes.
 *
 * Single brush, configurable size, one-step undo, clear, send. No labels,
 * no layers, no 3D pinning — see
 * `docs/specs/2026-05-29-studio-marking-tool-design.md` for the YAGNI list.
 */
export function MarkingOverlay({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [note, setNote] = useState('');
  /** True once the user has painted anything; gates the auto-save on
   *  close so blank-canvas opens don't write an empty packet. Reset in
   *  clearAll() since an explicit clear wipes the mark. */
  const dirtyRef = useRef(false);
  /** Refs so the unmount cleanup can read the latest values without
   *  putting them in deps (the cleanup must fire when visible→false
   *  goes false, not whenever the user types in the note field). */
  const noteRef = useRef(note);
  useEffect(() => { noteRef.current = note; }, [note]);
  // Panel position (Photoshop-style draggable tool palette).
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: -1, y: 16 });
  // Live cursor coords for brush-size preview (Krita/Procreate style).
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  /** One-step undo: snapshot of the canvas before the current stroke. */
  const preStrokeSnapshotRef = useRef<ImageData | null>(null);
  /** Two-step undo: snapshot one stroke back. */
  const previousSnapshotRef = useRef<ImageData | null>(null);
  // Drag-state for the floating panel.
  const draggingPanelRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  /** Ref to the overlay's outer wrapper. Used so panel-drag bounds clamp to
   *  the actual viewport area, not the whole window — keeps the panel
   *  inside the model view when dragged toward the edges. */
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  /** Fixed panel pixel width — content reflow used to make the panel look
   *  like it was resizing while being dragged. Pin it. */
  const PANEL_W = 280;
  const PANEL_H_ESTIMATE = 210;

  // First mount: pin the panel to the top-right (16 px from each edge).
  useEffect(() => {
    if (panelPos.x === -1) {
      const panelW = 260;
      setPanelPos({ x: Math.max(16, window.innerWidth - panelW - 16), y: 16 });
    }
  }, [panelPos.x]);

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

  // Size the canvas BITMAP (the `width`/`height` attributes — what the 2D
  // context actually paints into) to track the parent (the 3D viewport
  // wrapper). React state so the canvas JSX gets `width={w} height={h}`
  // props every render; that's more robust than an imperative
  // `canvas.width = w` side-effect, which previously left the bitmap at
  // its default 300×150 even while CSS scaled the canvas up.
  // Initial value is a safe fallback; the post-mount measure() immediately
  // overwrites it with the actual parent rect.
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  // useLayoutEffect (not useEffect): runs SYNCHRONOUSLY after DOM mutations
  // but BEFORE the browser paints. This lets the canvas be resized from the
  // fallback to the real parent dims in a single visible frame — without
  // it, the first paint uses 800×600, then a state update bumps the bitmap
  // and CLEARS the canvas (HTML canvas resize semantics), throwing away
  // any strokes the user managed to deposit on the fallback bitmap and
  // shifting the coordinate system mid-interaction.
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

  /** CSS-pixel position relative to the canvas — used for the brush-size
   *  preview circle which is itself positioned in CSS space. */
  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /** Map a CSS-pixel point to the canvas bitmap's coordinate system. The
   *  bitmap may be briefly smaller than the CSS box (before the
   *  ResizeObserver tick after mount); without this scaling, strokes would
   *  appear shifted from the cursor by the stretch ratio. */
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
    // Snapshot for undo. Rotate previous → second slot so we keep two steps.
    previousSnapshotRef.current = preStrokeSnapshotRef.current;
    preStrokeSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    drawingRef.current = true;
    dirtyRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    lastPointRef.current = p;
    const bp = toBitmap(p);
    paintDot(ctx, bp.x, bp.y, brushSize);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = pointerPos(e);
    // Always track cursor so the brush preview circle follows the mouse.
    setCursorPos(p);
    if (!drawingRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const last = lastPointRef.current;
    if (last) {
      // Solid red on the bitmap; constant translucency comes from CSS
      // opacity on the <canvas> itself (see style.opacity below). Highlighter
      // semantics: overlapping strokes do not stack alpha, so re-marking the
      // same region stays the same shade.
      const bpLast = toBitmap(last);
      const bp = toBitmap(p);
      // Round caps + joins so a swipe reads as a continuous highlight
      // instead of a chain of butt-capped rectangles (looked "chipped").
      // Canvas state was reset when the bitmap was resized, so re-apply
      // these every segment — they're idempotent and cheap.
      ctx.strokeStyle = 'rgb(239, 68, 68)';
      ctx.lineWidth = brushSize;
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

  function onPanelHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingPanelRef.current = {
      offsetX: e.clientX - panelPos.x,
      offsetY: e.clientY - panelPos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPanelHeaderPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = draggingPanelRef.current;
    if (!drag) return;
    // Clamp to the OVERLAY-ROOT's bounds, not the window — keeps the panel
    // inside the model view even when the Inspector or Toolbar would
    // otherwise clip it.
    const root = overlayRootRef.current;
    const rect = root ? root.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const maxX = Math.max(0, rect.width - PANEL_W);
    const maxY = Math.max(0, rect.height - PANEL_H_ESTIMATE);
    setPanelPos({
      x: Math.max(0, Math.min(maxX, e.clientX - drag.offsetX)),
      y: Math.max(0, Math.min(maxY, e.clientY - drag.offsetY)),
    });
  }

  function onPanelHeaderPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingPanelRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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
    // Solid on the bitmap (see note in onPointerMove) — translucency comes
    // from canvas-level CSS opacity so overlapping marks stay one shade.
    ctx.fillStyle = 'rgb(239, 68, 68)';
    ctx.beginPath();
    ctx.arc(x, y, radius / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function undo() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = preStrokeSnapshotRef.current;
    if (snap) {
      ctx.putImageData(snap, 0, 0);
      preStrokeSnapshotRef.current = previousSnapshotRef.current;
      previousSnapshotRef.current = null;
    } else {
      // No snapshot — clear all.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function clearAll() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    preStrokeSnapshotRef.current = null;
    previousSnapshotRef.current = null;
    dirtyRef.current = false;
  }

  function findRendererCanvas(): HTMLCanvasElement | null {
    // The three.js viewport canvas is the only non-overlay <canvas> in the
    // Studio app. Filter our own canvas out by data attribute.
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

  /** Fire-and-forget save: writes the current canvas + note as a
   *  review-paint packet. Called from the unmount cleanup (close X /
   *  Esc / toolbar toggle), not by an explicit Send button — agents
   *  pick the packet up via the `review_paint_peek_latest` MCP tool
   *  (or the UserPromptSubmit hook for Claude Code) whenever the user
   *  asks them to. `keepalive: true` lets the fetch survive the
   *  component unmount that triggered it. */
  function persistMark() {
    if (!dirtyRef.current) return;
    const screenshot = screenshotAsPng();
    if (!screenshot) return;
    const mask = maskAsPng();
    const scriptParam = new URLSearchParams(window.location.search).get('script');
    const meta = {
      note: noteRef.current,
      scriptPath: scriptParam,
      ts: new Date().toISOString(),
      ua: navigator.userAgent,
    };
    fetch('/__kernelcad/review-paint', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ screenshot, mask, meta }),
      keepalive: true,
    }).catch((err) => {
      // The unmount path means nothing to surface to the user; log so
      // the error is discoverable in devtools.
      console.warn('[marking-overlay] save failed:', err);
    });
  }

  // Auto-save on unmount (close X, Esc, or Brush toggle off).
  useEffect(() => {
    return () => { persistMark(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={overlayRootRef}
      data-testid="marking-overlay-root"
      style={{
        // `absolute` so we size to the 3D viewport's flex-1 wrapper in
        // StudioShell — Inspector + Toolbar stay outside the brush region.
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
        // width:100%/height:100% are required: the HTML <canvas> default
        // width/height attributes are 300x150 and reflect to CSS as
        // `width: 300px`, which beats `right: 0` in the over-constrained box
        // model and leaves the canvas locked at 300x150 in the top-left.
        // (Symptom: brush previously only painted in a small top-left region.)
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          // Highlighter semantics: constant translucency. Strokes write
          // solid red into the bitmap; this CSS opacity on the element is
          // applied AFTER bitmap compositing, so overlapping strokes never
          // accumulate darker. The mask PNG sent to the agent stays fully
          // opaque red where painted, which is what we want for clear
          // region detection.
          opacity: 0.45,
          // Hide the system cursor — we render our own brush-size preview circle
          cursor: 'none',
          touchAction: 'none',
        }}
      />
      {/* Brush-size preview circle (Krita/Procreate style — outlines the actual
          radius the next stroke will deposit, so you can size a stroke before
          drawing it). Hidden when the cursor leaves the canvas. */}
      {cursorPos && (
        <div
          data-testid="marking-brush-preview"
          style={{
            position: 'absolute',
            left: cursorPos.x - brushSize / 2,
            top: cursorPos.y - brushSize / 2,
            width: brushSize,
            height: brushSize,
            border: '1.5px solid rgba(239, 68, 68, 0.9)',
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            mixBlendMode: 'difference',
          }}
        />
      )}
      <div
        data-testid="marking-overlay-controls"
        style={{
          position: 'absolute',
          left: panelPos.x,
          top: panelPos.y,
          background: 'rgba(17,17,17,0.92)',
          color: '#e5e7eb',
          borderRadius: 6,
          font: '12px system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          width: PANEL_W,
          border: '1px solid #2b313c',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle — Photoshop-style header bar. Click and drag anywhere on
            this row to reposition the panel. */}
        <div
          data-testid="marking-overlay-drag-handle"
          onPointerDown={onPanelHeaderPointerDown}
          onPointerMove={onPanelHeaderPointerMove}
          onPointerUp={onPanelHeaderPointerUp}
          onPointerCancel={onPanelHeaderPointerUp}
          style={{
            background: '#1a1a1a',
            padding: '8px 12px',
            borderBottom: '1px solid #2b313c',
            cursor: 'grab',
            touchAction: 'none',
            fontWeight: 600,
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            userSelect: 'none',
          }}
        >
          <span style={{ flex: 1 }}>Mark what's wrong</span>
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400, marginRight: 8 }}>drag to move · esc to close</span>
          {/* Windows-style close icon (square button, hover tint, X glyph). */}
          <button
            type="button"
            data-testid="marking-overlay-close-x"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => shellStore.setMarkingMode(false)}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fca5a5'; }}
            aria-label="Close marking overlay"
            title="Close (Esc)"
            style={{
              border: 'none',
              background: 'transparent',
              color: '#fca5a5',
              cursor: 'pointer',
              width: 28,
              height: 28,
              padding: 0,
              borderRadius: 3,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.12s ease-out, color 0.12s ease-out',
            }}
          >
            <XIcon size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 40 }}>Brush</span>
          <input
            type="range"
            min={4}
            max={80}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: 28, textAlign: 'right' }}>{brushSize}</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="One-line note (e.g. 'make these stretch')"
          maxLength={200}
          style={{
            background: '#0b0b0b',
            border: '1px solid #2b313c',
            color: '#e5e7eb',
            padding: '6px 8px',
            borderRadius: 4,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={undo}
            style={btnStyle()}
            data-testid="marking-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={btnStyle()}
            data-testid="marking-clear"
          >
            Clear
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.4 }}>
          Mark saves automatically when you close. Then ask your agent
          to <em>look at my mark</em> — the kernelCAD MCP tool
          <code style={{ background: '#0b0b0b', padding: '0 4px', borderRadius: 2 }}>review_paint_peek_latest</code>
          picks it up.
        </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle(primary = false): React.CSSProperties {
  return {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 4,
    border: '1px solid #2b313c',
    background: primary ? '#059669' : '#1a1a1a',
    color: primary ? 'white' : '#e5e7eb',
    cursor: 'pointer',
    fontSize: 12,
  };
}
