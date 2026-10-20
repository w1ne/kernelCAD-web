// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef } from 'react';
import type { ScreenPoint } from '../measure/measureSnap';

const local = (el: HTMLElement, e: PointerEvent): ScreenPoint => {
  const rect = el.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

function setCursor(el: HTMLElement, cursor: string): void {
  el.style.cursor = cursor;
}

/** A model click that does not interfere with orbit drags or face selection. */
export function useMarkupPointer(el: HTMLElement, active: boolean, onTap: (point: ScreenPoint) => void): void {
  const onTapRef = useRef(onTap);
  useEffect(() => { onTapRef.current = onTap; });

  useEffect(() => {
    if (!active) return;
    const canvas = el;
    let down: (ScreenPoint & { id: number }) | null = null;
    const previousCursor = canvas.style.cursor;
    const onDown = (event: PointerEvent) => { down = { ...local(canvas, event), id: event.pointerId }; };
    const onUp = (event: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || start.id !== event.pointerId || event.button > 0) return;
      const point = local(canvas, event);
      if (Math.hypot(point.x - start.x, point.y - start.y) <= 6) onTapRef.current(point);
    };
    const swallowClick = (event: Event) => event.stopPropagation();
    const host = canvas.parentElement ?? canvas;
    setCursor(canvas, 'crosshair');
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    host.addEventListener('click', swallowClick, true);
    return () => {
      setCursor(canvas, previousCursor);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      host.removeEventListener('click', swallowClick, true);
    };
  }, [active, el]);
}
