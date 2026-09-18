// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { shellStore } from '../../../store/shellStore';
import { persistReviewMark } from './markingPersistence';

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

/** Max stored note length — mirrors the backend NOTE_MAX_LEN cap so the input
 *  can't paste in more than the server will keep. */
const NOTE_MAX_LEN = 280;

/** Preset intent tags. A blob says WHERE; these say WHAT is wrong. Kept short
 *  and ordered roughly by how often they come up reviewing CAD. */
const PRESET_TAGS = [
  'too thick',
  'too thin',
  'missing',
  'wrong angle/position',
  'wrong shape',
] as const;

export function MarkingOverlay({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // True once the user has painted anything; gates the auto-save on
  // close so blank-canvas opens don't write an empty packet.
  const dirtyRef = useRef(false);
  // Live cursor coords for brush-size preview (Krita/Procreate style).
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Intent: a one-line note + preset tags carried with the stroke so the agent
  // reads WHAT is wrong, not just where. State drives the UI; refs let the
  // unmount-time / debounced persistMark read the latest values without being
  // re-created on every keystroke.
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const noteRef = useRef('');
  const tagsRef = useRef<string[]>([]);
  useEffect(() => {
    noteRef.current = note;
    tagsRef.current = tags;
  });

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

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

  function persistMark() {
    persistReviewMark({ canvasRef, dirtyRef, noteRef, tagsRef });
  }

  useEffect(() => {
    return () => { persistMark(); };
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

      {/* Intent panel: a one-line note + preset tags so the stroke carries
          WHAT is wrong. Unobtrusive (bottom-left), optional, and captures its
          own pointer events so interacting with it never paints on the canvas
          underneath. */}
      <div
        data-testid="marking-intent-panel"
        // Stop pointer/wheel events from reaching the painting canvas below.
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(20, 20, 24, 0.82)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          cursor: 'default',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PRESET_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                data-testid={`marking-tag-${tag}`}
                aria-pressed={active}
                onClick={() => toggleTag(tag)}
                style={{
                  fontSize: 11,
                  lineHeight: 1.2,
                  padding: '3px 8px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  border: active
                    ? '1px solid rgba(239, 68, 68, 0.9)'
                    : '1px solid rgba(255,255,255,0.18)',
                  background: active ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.06)',
                  color: active ? '#fecaca' : 'rgba(255,255,255,0.82)',
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          data-testid="marking-note-input"
          value={note}
          maxLength={NOTE_MAX_LEN}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note: what's wrong? (optional)"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 12,
            padding: '5px 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
