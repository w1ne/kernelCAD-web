// SPDX-License-Identifier: MIT
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type Ref } from 'react';
import { BUTTON } from './draftingReviewStyles';
import { sheetMarkup, sheetViewBox, zoomAt, type SheetView } from './drawingSheetCamera';
import { GhostOverlay } from './drawingSheetGhost';
import type { PlacedEdge, TaggedView } from './drawingSheetHit';
import { frameAnnotation, useSheetCamera, useSheetPlace } from './useDrawingSheet';

export interface DrawingSheetHandle { show(id: string): void }

const SELECTED = '[data-kc-annotation-id].kc-selected,[data-kc-annotation-id].kc-selected *{stroke:var(--color-blueprint) !important}[data-kc-annotation-id].kc-selected text{fill:var(--color-blueprint) !important}';

function onSheetKey(event: ReactKeyboardEvent<HTMLDivElement>, zoomBy: (factor: number) => void, fit: () => void, actualSize: () => void) {
  const tag = (event.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (event.key === '+' || event.key === '=') zoomBy(1.12);
  else if (event.key === '-' || event.key === '_') zoomBy(1 / 1.12);
  else if (event.key === 'f' || event.key === '0') fit();
  else if (event.key === '1') actualSize();
  else return;
  event.preventDefault();
}

/**
 * The drawing sheet as a workspace: scroll zooms toward the pointer, drag
 * pans, and a click on a dimension selects it. Dimension mode hit-tests the
 * straight edges the exporter stored on `data-kc-edges`.
 */
export const DrawingSheetViewport = forwardRef(function DrawingSheetViewport({
  svg, selectedId, onSelect, onPlaceEdge,
}: {
  svg: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlaceEdge?: (edge: PlacedEdge) => void;
}, ref: Ref<DrawingSheetHandle>) {
  const viewport = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SheetView>({ x: 0, y: 0, scale: 1 });
  const taggedRef = useRef<TaggedView[]>([]);
  const [view, setView] = useState<SheetView>({ x: 0, y: 0, scale: 1 });
  useLayoutEffect(() => { viewRef.current = view; }, [view]);
  const camera = useSheetCamera(viewport, host, viewRef, taggedRef, svg, selectedId, setView);
  const place = useSheetPlace(host, viewRef, taggedRef, setView, svg, onPlaceEdge);
  useImperativeHandle(ref, () => ({
    show(id: string) {
      const next = frameAnnotation(host.current, viewport.current, id);
      if (next) setView(next);
    },
  }), []);
  const box = sheetViewBox(svg);
  const marks = place.hover ? [...place.ghosts, place.hover] : place.ghosts;
  const onClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (place.placeClick(event) !== 'select') return;
    const id = (event.target as Element).closest?.('[data-kc-annotation-id]')?.getAttribute('data-kc-annotation-id');
    if (id) onSelect(id);
  };
  const actualSize = () => {
    const vp = viewport.current;
    if (vp) setView(zoomAt(viewRef.current, vp.clientWidth / 2, vp.clientHeight / 2, 1));
  };

  return <div className="relative min-h-0 flex-1">
    <div
      ref={viewport}
      role="region"
      aria-label="Engineering drawing preview"
      tabIndex={0}
      className={`h-full min-h-[280px] overflow-hidden outline-none ${place.dragging ? 'cursor-grabbing' : place.placing ? 'cursor-crosshair' : 'cursor-grab'}`}
      onPointerDown={place.onPointerDown}
      onPointerMove={place.onPointerMove}
      onPointerUp={place.endDrag}
      onPointerCancel={place.endDrag}
      onPointerLeave={() => place.setHover(null)}
      onClick={onClick}
      onKeyDown={(event) => onSheetKey(event, camera.zoomBy, camera.fit, actualSize)}
    >
      <style>{SELECTED}</style>
      <div className="relative" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0' }}>
        <div ref={host} dangerouslySetInnerHTML={{ __html: sheetMarkup(svg) }} />
        {marks.length > 0 && box && <GhostOverlay box={box} ghosts={marks} />}
      </div>
    </div>
    <div className="absolute bottom-3 left-3 flex gap-1">
      <button type="button" className={BUTTON} aria-pressed={place.placing} onClick={() => { place.setPlacing((on) => !on); place.setHover(null); }}>{place.placing ? 'Click an edge' : 'Dimension'}</button>
      <button type="button" className={BUTTON} aria-label="Zoom out" onClick={() => camera.zoomBy(1 / 1.12)}>−</button>
      <button type="button" className={BUTTON} aria-label="Fit sheet" onClick={camera.fit}>Fit</button>
      <button type="button" className={BUTTON} aria-label="Actual size" onClick={actualSize}>1:1</button>
      <button type="button" className={BUTTON} aria-label="Zoom in" onClick={() => camera.zoomBy(1.12)}>+</button>
    </div>
  </div>;
});
