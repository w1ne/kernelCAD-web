import { useEffect, useRef, useState } from 'react';
import { shellStore } from '../../../store/shellStore';

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
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  /** One-step undo: snapshot of the canvas before the current stroke. */
  const preStrokeSnapshotRef = useRef<ImageData | null>(null);
  /** Two-step undo: snapshot one stroke back. */
  const previousSnapshotRef = useRef<ImageData | null>(null);

  // Size the canvas to its container and to the device pixel ratio.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      // Preserve existing pixels across resize by reading + redrawing.
      const ctx = canvas.getContext('2d');
      const prev = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (prev) ctx.putImageData(prev, 0, 0);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
    canvas.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    lastPointRef.current = p;
    paintDot(ctx, p.x, p.y, brushSize);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = pointerPos(e);
    const last = lastPointRef.current;
    if (last) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
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
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
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
    setStatus(null);
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

  async function send() {
    setSending(true);
    setStatus(null);
    try {
      const screenshot = screenshotAsPng();
      if (!screenshot) {
        setStatus('Could not find viewport canvas to screenshot.');
        return;
      }
      const mask = maskAsPng();
      const scriptParam = new URLSearchParams(window.location.search).get('script');
      const meta = {
        note,
        scriptPath: scriptParam,
        ts: new Date().toISOString(),
        ua: navigator.userAgent,
      };
      const res = await fetch('/__kernelcad/review-paint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ screenshot, mask, meta }),
      });
      if (!res.ok) {
        const body = await res.text();
        setStatus(`Send failed (${res.status}): ${body}`);
        return;
      }
      const ok = (await res.json()) as { ok: boolean; path: string };
      setStatus(`Sent → ${ok.path}`);
      // Close marking mode on successful send so the user can continue.
      shellStore.setMarkingMode(false);
      clearAll();
      setNote('');
    } catch (err) {
      setStatus(`Send error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      data-testid="marking-overlay-root"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="marking-overlay-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      />
      <div
        data-testid="marking-overlay-controls"
        style={{
          position: 'absolute',
          right: 12,
          top: 12,
          background: 'rgba(17,17,17,0.92)',
          color: '#e5e7eb',
          padding: '10px 12px',
          borderRadius: 6,
          font: '12px system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minWidth: 220,
          border: '1px solid #2b313c',
        }}
      >
        <div style={{ fontWeight: 600, color: '#fca5a5' }}>Mark what's wrong</div>
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
          <button
            type="button"
            onClick={() => shellStore.setMarkingMode(false)}
            style={btnStyle()}
            data-testid="marking-close"
          >
            Close
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            style={btnStyle(true)}
            data-testid="marking-send"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {status && (
          <div
            data-testid="marking-status"
            style={{ fontSize: 11, color: status.startsWith('Sent') ? '#86efac' : '#fca5a5' }}
          >
            {status}
          </div>
        )}
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
