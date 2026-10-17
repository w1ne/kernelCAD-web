// SPDX-License-Identifier: MIT
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { fitSheet, frameRect, MIN_SCALE, zoomAt, type SheetView } from './drawingSheetCamera';
import { signedEdgeGap } from '../../kernel/backends/occt/drawingLayout';
import { edgesFromMarkup } from './edgeDimensionSheet';
import { clientToSheet, edgeNearPoint, readTaggedViews, type HitEdge, type PlacedEdge, type TaggedView } from './drawingSheetHit';

interface Drag { id: number; x: number; y: number; ox: number; oy: number }
type Hover = HitEdge & { gap: number };
type Host = { current: HTMLDivElement | null };
type ViewRef = { current: SheetView };
type TaggedRef = { current: TaggedView[] };

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

export function frameAnnotation(host: HTMLDivElement | null, vp: HTMLDivElement | null, id: string): SheetView | null {
  const el = host?.querySelector(`[data-kc-annotation-id="${cssAttr(id)}"]`);
  if (!vp || !(el instanceof SVGGraphicsElement) || typeof el.getBBox !== 'function') return null;
  return frameRect(vp.clientWidth, vp.clientHeight, el.getBBox());
}

function hitAt(root: ParentNode | null, clientX: number, clientY: number, scale: number, views: readonly TaggedView[]): HitEdge | null {
  const svg = root?.querySelector('svg');
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return null;
  const point = clientToSheet(svg as SVGSVGElement, clientX, clientY);
  if (!point) return null;
  return edgeNearPoint(views, point.x, point.y, 8 / Math.max(scale, MIN_SCALE));
}

function gapAt(host: Host, clientX: number, clientY: number, edge: HitEdge): number {
  const svg = host.current?.querySelector('svg');
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return 8;
  const point = clientToSheet(svg as SVGSVGElement, clientX, clientY);
  if (!point) return 8;
  return signedEdgeGap(edge.sheet[0], edge.sheet[1], [point.x, point.y]);
}

export function useSheetCamera(
  viewportRef: Host, hostRef: Host, viewRef: ViewRef, taggedRef: TaggedRef,
  svg: string, selectedId: string | null, setView: (view: SheetView) => void,
) {
  const fit = () => {
    const svgEl = hostRef.current?.querySelector('svg');
    const vp = viewportRef.current;
    if (!svgEl || !vp) return;
    const size = applySheetSize(svgEl);
    setView(fitSheet(vp.clientWidth || 640, vp.clientHeight || 480, size.w, size.h));
  };
  const zoomBy = (factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    setView(zoomAt(viewRef.current, vp.clientWidth / 2, vp.clientHeight / 2, viewRef.current.scale * factor));
  };

  useEffect(() => {
    const el = viewportRef.current;
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
  }, [viewportRef, viewRef, setView]);

  useLayoutEffect(() => {
    const svgEl = hostRef.current?.querySelector('svg');
    const vp = viewportRef.current;
    const tagged = hostRef.current ? readTaggedViews(hostRef.current) : [];
    taggedRef.current = tagged.length > 0 ? tagged : edgesFromMarkup(svg);
    if (!svgEl || !vp) return;
    const size = applySheetSize(svgEl);
    setView(fitSheet(vp.clientWidth || 640, vp.clientHeight || 480, size.w, size.h));
  }, [svg, hostRef, viewportRef, taggedRef, setView]);

  useLayoutEffect(() => { paintSelection(hostRef.current, selectedId); }, [selectedId, svg, hostRef]);

  return { fit, zoomBy };
}

export function useSheetPlace(
  hostRef: Host, viewRef: ViewRef, taggedRef: TaggedRef, setView: (view: SheetView) => void,
  svg: string, onPlaceEdge?: (edge: PlacedEdge & { gap: number; sheet?: HitEdge['sheet'] }) => void,
) {
  const drag = useRef<Drag | null>(null);
  const panned = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [seenSvg, setSeenSvg] = useState(svg);
  if (seenSvg !== svg) {
    setSeenSvg(svg);
    setHover(null);
  }

  const previewEdge = (clientX: number, clientY: number) => {
    const hit = hitAt(hostRef.current, clientX, clientY, viewRef.current.scale, taggedRef.current);
    const gap = hit ? gapAt(hostRef, clientX, clientY, hit) : 0;
    setHover((current) => current && hit && current.gap === gap && current.label === hit.label && current.sheet[0][0] === hit.sheet[0][0] && current.sheet[1][0] === hit.sheet[1][0] ? current : hit ? { ...hit, gap } : null);
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: viewRef.current.x, oy: viewRef.current.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.id === event.pointerId && moved(event, current)) {
      panned.current = true;
      setDragging(true);
      setHover(null);
      setView({ ...viewRef.current, x: current.ox + event.clientX - current.x, y: current.oy + event.clientY - current.y });
      return;
    }
    if (placing && !panned.current) previewEdge(event.clientX, event.clientY);
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
      setDragging(false);
    }
  };
  const placeClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (panned.current) { panned.current = false; return 'panned' as const; }
    if (!placing) return 'select' as const;
    const edge = hitAt(hostRef.current, event.clientX, event.clientY, viewRef.current.scale, taggedRef.current);
    if (edge && onPlaceEdge) {
      const gap = gapAt(hostRef, event.clientX, event.clientY, edge);
      onPlaceEdge(edge.model
        ? { view: edge.view, from: edge.from, to: edge.to, gap }
        : { view: edge.view, from: [0, 0, 0], to: [0, 0, 0], gap, sheet: edge.sheet });
      setHover(null);
    }
    return 'placed' as const;
  };

  return { dragging, placing, setPlacing, hover, setHover, onPointerDown, onPointerMove, endDrag, placeClick };
}

function moved(event: ReactPointerEvent<HTMLDivElement>, drag: Drag): boolean {
  return Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 3;
}
