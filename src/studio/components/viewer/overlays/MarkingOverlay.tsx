// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect } from 'react';
import { shellStore } from '../../../store/shellStore';
import { persistReviewMark } from './markingPersistence';
import { FIXED_BRUSH_PX, useMarkingCanvas } from './useMarkingCanvas';
import { useMarkingIntent } from './useMarkingIntent';

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
  const {
    canvasRef,
    dirtyRef,
    cursorPos,
    canvasSize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
  } = useMarkingCanvas(visible, persistMark);

  const { note, setNote, tags, noteRef, tagsRef, toggleTag } = useMarkingIntent();

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

  function persistMark() {
    persistReviewMark({ canvasRef, dirtyRef, noteRef, tagsRef });
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
