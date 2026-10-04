// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef } from 'react';
import type { ScreenPoint } from './measureSnap';

/** A press that moves farther than this is an orbit/pan drag, not a click. */
export const TAP_SLOP_PX = 6;

interface Handlers {
  onHover: (p: ScreenPoint) => void;
  onTap: (p: ScreenPoint) => void;
  onEscape: () => void;
}

const local = (el: HTMLElement, e: PointerEvent): ScreenPoint => {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

/** Set the canvas cursor; returns the previous value. */
function setCursor(el: HTMLElement, cursor: string): string {
  const prev = el.style.cursor;
  el.style.cursor = cursor;
  return prev;
}

/** Pointer wiring for the Measure tool on the viewer canvas. Orbit controls
 *  keep working: nothing is cancelled, and a press that travelled (a drag)
 *  never counts as a tap. Mouse, pen and touch all arrive as pointer events.
 *  The synthesized `click` is swallowed in the capture phase so measuring does
 *  not also select a face or open a context menu. */
export function useMeasurePointer(el: HTMLElement, handlers: Handlers): void {
  const ref = useRef(handlers);
  useEffect(() => { ref.current = handlers; });
  useEffect(() => {
    let down: (ScreenPoint & { id: number }) | null = null;
    const onDown = (e: PointerEvent) => {
      down = { ...local(el, e), id: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.buttons === 0) ref.current.onHover(local(el, e));
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || start.id !== e.pointerId || e.button > 0) return;
      const p = local(el, e);
      if (Math.hypot(p.x - start.x, p.y - start.y) <= TAP_SLOP_PX) ref.current.onTap(p);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ref.current.onEscape(); };
    const swallowClick = (e: Event) => e.stopPropagation();
    const host = el.parentElement ?? el;
    const prevCursor = setCursor(el, 'crosshair');
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    host.addEventListener('click', swallowClick, true);
    window.addEventListener('keydown', onKey);
    return () => {
      setCursor(el, prevCursor);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      host.removeEventListener('click', swallowClick, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [el]);
}
