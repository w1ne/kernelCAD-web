// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Inside the viewer canvas while "Mark & fix" is on: a tap (not a drag, not
 * a pinch) on the model drops a pin; each pin is a numbered button at its
 * world point that removes itself when pressed. Orbit, pan and zoom keep
 * working because nothing is cancelled except the tap's synthesized click on
 * the canvas (so a pin does not also select a face).
 */
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { filterClippedIntersections } from '../../studio/components/viewer/clipFilter';
import { TAP_SLOP_PX } from '../../studio/components/viewer/measure/useMeasurePointer';
import type { EditPick } from './editRequest';
import { firstFaceHit, pickFromHit } from './pickFromHit';

interface Point2 {
  x: number;
  y: number;
}

/** Set the canvas cursor; returns the previous value. */
function setCursor(el: HTMLElement, cursor: string): string {
  const prev = el.style.cursor;
  el.style.cursor = cursor;
  return prev;
}

/** Single-pointer taps on `el`, in element-local CSS px. */
function useCanvasTap(el: HTMLElement, onTap: (p: Point2) => void): void {
  const ref = useRef(onTap);
  useEffect(() => { ref.current = onTap; });
  useEffect(() => {
    const downs = new Map<number, Point2>();
    let gesture = false;
    const local = (e: PointerEvent): Point2 => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      downs.set(e.pointerId, local(e));
      if (downs.size > 1) gesture = true;
    };
    const onUp = (e: PointerEvent) => {
      const start = downs.get(e.pointerId);
      downs.delete(e.pointerId);
      const wasGesture = gesture;
      if (downs.size === 0) gesture = false;
      if (!start || wasGesture || e.button > 0) return;
      const p = local(e);
      if (Math.hypot(p.x - start.x, p.y - start.y) <= TAP_SLOP_PX) ref.current(p);
    };
    const onCancel = (e: PointerEvent) => {
      downs.delete(e.pointerId);
      if (downs.size === 0) gesture = false;
    };
    const swallowCanvasClick = (e: Event) => { if (e.target === el) e.stopPropagation(); };
    const host = el.parentElement ?? el;
    const prevCursor = setCursor(el, 'crosshair');
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    host.addEventListener('click', swallowCanvasClick, true);
    return () => {
      setCursor(el, prevCursor);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      host.removeEventListener('click', swallowCanvasClick, true);
    };
  }, [el]);
}

const PIN_CLASS =
  'flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full border-2 border-white bg-accent '
  + 'text-ui font-semibold text-on-accent shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

export function MarkTapTool(props: {
  geometries: readonly GeometryResult[];
  picks: readonly EditPick[];
  onPick: (pick: EditPick) => void;
  onRemove: (index: number) => void;
}) {
  const { geometries, picks, onPick, onRemove } = props;
  const el = useThree((s) => s.gl.domElement);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  useCanvasTap(el, (p) => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    camera.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((p.x / w) * 2 - 1, -(p.y / h) * 2 + 1), camera);
    const hit = firstFaceHit(filterClippedIntersections(ray.intersectObjects(scene.children, true)));
    if (hit) onPick(pickFromHit(hit, geometries, ray.ray.direction));
  });

  return (
    <group name="mark-fix-pins">
      {picks.map((pick, i) => (
        <Html key={`${i}:${pick.point.join(',')}`} position={pick.point} center zIndexRange={[26, 21]}>
          <button
            type="button"
            data-testid="mark-fix-pin"
            aria-label={`Remove pin ${i + 1}`}
            title={`Pin ${i + 1}: tap to remove`}
            className={PIN_CLASS}
            onClick={(e) => {
              // The Html root sits under the canvas container R3F listens on:
              // stop here so the click does not also select the face behind.
              e.stopPropagation();
              onRemove(i);
            }}
          >
            {i + 1}
          </button>
        </Html>
      ))}
    </group>
  );
}
