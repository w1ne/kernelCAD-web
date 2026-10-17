// SPDX-License-Identifier: MIT
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type Ref } from 'react';
import { BUTTON } from './draftingReviewStyles';

/** Camera over the drawing sheet, in viewport pixels. */
export interface SheetView { x: number; y: number; scale: number }

export interface DrawingSheetHandle { show(id: string): void }

const MIN_SCALE = 0.08;
const MAX_SCALE = 16;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Zoom toward a viewport point, keeping that point fixed on the sheet. */
export function zoomAt(view: SheetView, px: number, py: number, nextScale: number): SheetView {
  const scale = clampScale(nextScale);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** Fit a sheet of `sheetW`×`sheetH` user units into the viewport. */
export function fitSheet(vpW: number, vpH: number, sheetW: number, sheetH: number, pad = 32): SheetView {
  const scale = clampScale(Math.min((vpW - pad) / Math.max(sheetW, 1), (vpH - pad) / Math.max(sheetH, 1)));
  return { scale, x: (vpW - sheetW * scale) / 2, y: (vpH - sheetH * scale) / 2 };
}

/** Frame one annotation box (sheet user units) in the viewport. */
export function frameRect(vpW: number, vpH: number, rect: { x: number; y: number; width: number; height: number }, pad = 72): SheetView {
  const w = Math.max(rect.width, 8);
  const h = Math.max(rect.height, 8);
  const scale = clampScale(Math.min((vpW - pad) / w, (vpH - pad) / h, 8));
  return { scale, x: vpW / 2 - (rect.x + rect.width / 2) * scale, y: vpH / 2 - (rect.y + rect.height / 2) * scale };
}

/** Drop script and event-handler attributes from a server sheet before injecting it. */
export function sheetMarkup(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function cssAttr(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}

function paintSelection(root: HTMLElement | null, selectedId: string | null): void {
  if (!root) return;
  root.querySelectorAll('.kc-selected').forEach((node) => node.classList.remove('kc-selected'));
  if (!selectedId) return;
  root.querySelector(`[data-kc-annotation-id="${cssAttr(selectedId)}"]`)?.classList.add('kc-selected');
}

function applySheetSize(svg: SVGSVGElement): { w: number; h: number } {
  const box = svg.viewBox.baseVal;
  if (box.width > 0 && box.height > 0) {
    svg.setAttribute('width', String(box.width));
    svg.setAttribute('height', String(box.height));
    return { w: box.width, h: box.height };
  }
  const bounds = svg.getBoundingClientRect();
  return { w: bounds.width || 400, h: bounds.height || 280 };
}

interface Drag {
  id: number;
  x: number;
  y: number;
  ox: number;
  oy: number;
}

/**
 * The drawing sheet as a workspace: scroll zooms toward the pointer, drag
 * pans, and a click on a dimension selects it. Same navigation as a Fusion
 * drawing, on the SVG the exporter already tags with `data-kc-annotation-id`.
 */
export const DrawingSheetViewport = forwardRef(function DrawingSheetViewport({
  svg, selectedId, onSelect,
}: {
  svg: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}, ref: Ref<DrawingSheetHandle>) {
  const viewport = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SheetView>({ x: 0, y: 0, scale: 1 });
  const drag = useRef<Drag | null>(null);
  const panned = useRef(false);
  const [view, setView] = useState<SheetView>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  viewRef.current = view;

  const fit = () => {
    const svgEl = host.current?.querySelector('svg');
    const vp = viewport.current;
    if (!svgEl || !vp) return;
    const size = applySheetSize(svgEl);
    setView(fitSheet(vp.clientWidth || 640, vp.clientHeight || 480, size.w, size.h));
  };

  const zoomBy = (factor: number) => {
    const vp = viewport.current;
    if (!vp) return;
    setView(zoomAt(viewRef.current, vp.clientWidth / 2, vp.clientHeight / 2, viewRef.current.scale * factor));
  };

  useImperativeHandle(ref, () => ({
    show(id: string) {
      const vp = viewport.current;
      const el = host.current?.querySelector(`[data-kc-annotation-id="${cssAttr(id)}"]`);
      if (!vp || !(el instanceof SVGGraphicsElement) || typeof el.getBBox !== 'function') return;
      setView(frameRect(vp.clientWidth, vp.clientHeight, el.getBBox()));
    },
  }), []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      const current = viewRef.current;
      setView(zoomAt(current, event.clientX - rect.left, event.clientY - rect.top, current.scale * factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useLayoutEffect(() => {
    const svgEl = host.current?.querySelector('svg');
    const vp = viewport.current;
    if (!svgEl || !vp) return;
    const size = applySheetSize(svgEl);
    setView(fitSheet(vp.clientWidth || 640, vp.clientHeight || 480, size.w, size.h));
  }, [svg]);

  useLayoutEffect(() => { paintSelection(host.current, selectedId); }, [selectedId, svg]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: view.x, oy: view.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > 3) {
      panned.current = true;
      setDragging(true);
      setView({ ...viewRef.current, x: current.ox + dx, y: current.oy + dy });
    }
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
      setDragging(false);
    }
  };
  const onClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (panned.current) { panned.current = false; return; }
    const id = (event.target as Element).closest?.('[data-kc-annotation-id]')?.getAttribute('data-kc-annotation-id');
    if (id) onSelect(id);
  };

  return <div className="relative min-h-0 flex-1">
    <div
      ref={viewport}
      role="region"
      aria-label="Engineering drawing preview"
      tabIndex={0}
      className={`h-full min-h-[280px] overflow-hidden outline-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={onClick}
      onKeyDown={(event) => {
        const tag = (event.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (event.key === '+' || event.key === '=') zoomBy(1.12);
        else if (event.key === '-' || event.key === '_') zoomBy(1 / 1.12);
        else if (event.key === 'f' || event.key === '0') fit();
        else if (event.key === '1') {
          const vp = viewport.current;
          if (vp) setView(zoomAt(viewRef.current, vp.clientWidth / 2, vp.clientHeight / 2, 1));
        } else return;
        event.preventDefault();
      }}
    >
      <style>{`[data-kc-annotation-id].kc-selected,[data-kc-annotation-id].kc-selected *{stroke:#1565c0 !important}[data-kc-annotation-id].kc-selected text{fill:#1565c0 !important}`}</style>
      <div ref={host} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0' }} dangerouslySetInnerHTML={{ __html: sheetMarkup(svg) }} />
    </div>
    <div className="absolute bottom-3 left-3 flex gap-1">
      <button type="button" className={BUTTON} aria-label="Zoom out" onClick={() => zoomBy(1 / 1.12)}>−</button>
      <button type="button" className={BUTTON} aria-label="Fit sheet" onClick={fit}>Fit</button>
      <button type="button" className={BUTTON} aria-label="Actual size" onClick={() => { const vp = viewport.current; if (vp) setView(zoomAt(view, vp.clientWidth / 2, vp.clientHeight / 2, 1)); }}>1:1</button>
      <button type="button" className={BUTTON} aria-label="Zoom in" onClick={() => zoomBy(1.12)}>+</button>
    </div>
  </div>;
});
