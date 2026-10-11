// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Inside the viewer canvas: the painted marks, and, while Mark is on, the
 * brush.
 *
 * Gestures while Mark is on (Nomad-style):
 *  - one finger / left button starting ON the model paints a stroke that
 *    sticks to the surface (a tap paints a dot);
 *  - one finger / left button starting on the background orbits;
 *  - right / middle button orbit and pan as usual;
 *  - two fingers pan / pinch-zoom. If the second finger lands within
 *    SECOND_FINGER_MS of a stroke starting, the partial stroke is dropped
 *    and the gesture becomes navigation (the first finger is handed to the
 *    orbit controls); later, the stroke is kept and navigation takes over;
 *  - a quick two-finger tap undoes the last stroke.
 *
 * Brush: one loud colour, ~50 % opacity, a thin light outline, a constant
 * BRUSH_PX screen width, no size control, additive only (Undo / Clear in
 * the toolbar are the only removal).
 */
import { Line } from '@react-three/drei/core/Line';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { filterClippedIntersections } from '../../studio/components/viewer/clipFilter';
import type { PaintHit, Vec3 } from './marks';
import { firstFaceHit, pickFromHit } from './pickFromHit';

/** One painted stroke: its brush samples, and the drawn path (lifted off the surface). */
export interface PaintStroke {
  hits: PaintHit[];
  path: Vec3[];
}

export const STROKE_COLOR = '#ff2fa8';
export const BRUSH_PX = 24;
/** A second finger this soon after a stroke starts means "navigate", not "paint". */
export const SECOND_FINGER_MS = 150;
/** Two fingers down and up within this, barely moving, is an undo tap. */
const TWO_FINGER_TAP_MS = 300;
const TAP_MOVE_PX = 12;
/** Screen px the pointer must travel before the next sample. */
const SAMPLE_PX = 4;
/** Drawn points per stroke; past this, sampling stops (the stroke still ends normally). */
const MAX_PATH_POINTS = 600;
/** Lift the drawn path off the surface by this fraction of the camera distance. */
const LIFT = 0.004;

interface Point2 { x: number; y: number }

/** World mm per screen px at `point`. */
function mmPerPx(camera: THREE.Camera, point: THREE.Vector3, heightPx: number): number {
  const h = Math.max(1, heightPx);
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const o = camera as THREE.OrthographicCamera;
    return (o.top - o.bottom) / (o.zoom || 1) / h;
  }
  const p = camera as THREE.PerspectiveCamera;
  const fov = THREE.MathUtils.degToRad(p.fov || 50);
  return (2 * camera.position.distanceTo(point) * Math.tan(fov / 2)) / h;
}

/** Undo on a quick two-finger tap. Watches touches without stopping them. */
function useTwoFingerTap(el: HTMLElement, onTap: () => void) {
  const ref = useRef(onTap);
  useEffect(() => { ref.current = onTap; });
  useEffect(() => {
    const touches = new Map<number, Point2 & { moved: boolean }>();
    let tap: { t: number; ids: Set<number> } | null = null;
    const host = el.parentElement ?? el;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });
      if (touches.size === 2) tap = { t: performance.now(), ids: new Set(touches.keys()) };
      else if (touches.size > 2) tap = null;
    };
    const onMove = (e: PointerEvent) => {
      const t = touches.get(e.pointerId);
      if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_MOVE_PX) t.moved = true;
    };
    const onUp = (e: PointerEvent) => {
      const t = touches.get(e.pointerId);
      touches.delete(e.pointerId);
      if (!tap || !tap.ids.has(e.pointerId)) return;
      if (!t || t.moved || performance.now() - tap.t > TWO_FINGER_TAP_MS) { tap = null; return; }
      tap.ids.delete(e.pointerId);
      if (tap.ids.size === 0) { tap = null; ref.current(); }
    };
    host.addEventListener('pointerdown', onDown, true);
    host.addEventListener('pointermove', onMove, true);
    host.addEventListener('pointerup', onUp, true);
    host.addEventListener('pointercancel', onUp, true);
    return () => {
      host.removeEventListener('pointerdown', onDown, true);
      host.removeEventListener('pointermove', onMove, true);
      host.removeEventListener('pointerup', onUp, true);
      host.removeEventListener('pointercancel', onUp, true);
    };
  }, [el]);
}

/** Raycast a pointer onto the model and turn hits into brush samples. */
function brushSampler(el: HTMLElement, camera: THREE.Camera, scene: THREE.Scene, geometries: () => readonly GeometryResult[]) {
  const ray = new THREE.Raycaster();
  const local = (e: PointerEvent): Point2 & { w: number; h: number } => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width || 1, h: r.height || 1 };
  };
  const hitAt = (e: PointerEvent) => {
    const p = local(e);
    camera.updateMatrixWorld();
    ray.setFromCamera(new THREE.Vector2((p.x / p.w) * 2 - 1, -(p.y / p.h) * 2 + 1), camera);
    return { p, hit: firstFaceHit(filterClippedIntersections(ray.intersectObjects(scene.children, true))) };
  };
  /** The stroke with one more sample at `hit`. */
  const extend = (stroke: PaintStroke, p: Point2 & { w: number; h: number }, hit: THREE.Intersection): PaintStroke => {
    const pick = pickFromHit(hit, geometries(), ray.ray.direction);
    const shapeIndex = (hit.object.userData as { shapeIndex?: unknown }).shapeIndex;
    const brushMm = mmPerPx(camera, hit.point, p.h) * BRUSH_PX;
    const lift = camera.position.distanceTo(hit.point) * LIFT;
    const n = pick.normal;
    const q = hit.point;
    return {
      hits: [...stroke.hits, { ...pick, screen: [p.x / p.w, p.y / p.h], brushMm, shapeIndex: typeof shapeIndex === 'number' ? shapeIndex : -1 }],
      path: [...stroke.path, [q.x + n[0] * lift, q.y + n[1] * lift, q.z + n[2] * lift]],
    };
  };
  return { local, hitAt, extend };
}

function useBrush(geometries: readonly GeometryResult[], onStroke: (stroke: PaintStroke) => void) {
  const el = useThree((s) => s.gl.domElement);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const [live, setLive] = useState<PaintStroke | null>(null);
  const ref = useRef({ geometries, onStroke });
  useEffect(() => { ref.current = { geometries, onStroke }; });

  useEffect(() => {
    type Drawing = { id: number; t0: number; first: PointerEvent; client: Point2; stroke: PaintStroke; last: Point2 };
    let drawing: Drawing | null = null;
    let replaying = false;
    const { local, hitAt, extend } = brushSampler(el, camera, scene, () => ref.current.geometries);
    const record = (d: Drawing, p: Point2 & { w: number; h: number }, hit: THREE.Intersection) => {
      d.stroke = extend(d.stroke, p, hit);
      d.last = p;
      setLive(d.stroke);
    };
    const finish = (keep: boolean) => {
      const d = drawing;
      drawing = null;
      setLive(null);
      if (keep && d && d.stroke.hits.length > 0) ref.current.onStroke(d.stroke);
    };
    /** Hand the stroke's finger to the orbit controls so a pinch works. */
    const replayFirst = (d: Drawing) => {
      const f = d.first;
      replaying = true;
      try {
        el.dispatchEvent(new PointerEvent('pointerdown', {
          pointerId: f.pointerId, pointerType: f.pointerType, isPrimary: true, button: 0, buttons: 1,
          clientX: d.client.x, clientY: d.client.y, bubbles: true, cancelable: true,
        }));
      } finally {
        replaying = false;
      }
    };
    // Capture phase on the canvas's parent: runs before the orbit controls'
    // listener on the canvas, so a stroke's pointerdown never reaches them.
    const onDownCapture = (e: PointerEvent) => {
      if (replaying || e.target !== el) return;
      if (drawing) {
        if (e.pointerId === drawing.id) return;
        const d = drawing;
        finish(performance.now() - d.t0 >= SECOND_FINGER_MS);
        if (d.first.pointerType === 'touch') replayFirst(d);
        return; // the second finger goes to the controls
      }
      if (!e.isPrimary || e.button !== 0) return; // right / middle: orbit, pan
      const { p, hit } = hitAt(e);
      if (!hit) return; // background: orbit
      e.stopPropagation();
      drawing = { id: e.pointerId, t0: performance.now(), first: e, client: { x: e.clientX, y: e.clientY }, stroke: { hits: [], path: [] }, last: p };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
      record(drawing, p, hit);
    };
    const onMove = (e: PointerEvent) => {
      const d = drawing;
      if (!d || e.pointerId !== d.id) return;
      d.client = { x: e.clientX, y: e.clientY };
      if (d.stroke.path.length >= MAX_PATH_POINTS) return;
      const p = local(e);
      if (Math.hypot(p.x - d.last.x, p.y - d.last.y) < SAMPLE_PX) return;
      const { hit } = hitAt(e);
      if (hit) record(d, p, hit);
      else d.last = p;
    };
    const onUp = (e: PointerEvent) => {
      if (drawing && e.pointerId === drawing.id) finish(true);
    };
    const onCancel = (e: PointerEvent) => {
      if (drawing && e.pointerId === drawing.id) finish(false);
    };
    const swallowCanvasClick = (e: Event) => { if (e.target === el) e.stopPropagation(); };
    const host = el.parentElement ?? el;
    const prevCursor = el.style.cursor;
    el.style.cursor = 'crosshair';
    host.addEventListener('pointerdown', onDownCapture, true);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    host.addEventListener('click', swallowCanvasClick, true);
    return () => {
      el.style.cursor = prevCursor;
      host.removeEventListener('pointerdown', onDownCapture, true);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      host.removeEventListener('click', swallowCanvasClick, true);
    };
  }, [el, camera, scene]);
  return { el, live };
}

function StrokeView({ stroke }: { stroke: PaintStroke }) {
  const first = stroke.path[0];
  if (!first) return null;
  // A lone sample (a tap) is a zero-length segment: draw it as a short one.
  const points = stroke.path.length > 1 ? stroke.path : [first, [first[0] + 1e-3, first[1] + 1e-3, first[2]] as Vec3];
  return (
    <group name="mark-stroke">
      <Line points={points} color="#ffffff" lineWidth={BRUSH_PX + 3} transparent opacity={0.35} depthWrite={false} />
      <Line points={points} color={STROKE_COLOR} lineWidth={BRUSH_PX} transparent opacity={0.5} depthWrite={false} />
    </group>
  );
}

function Brush(props: { geometries: readonly GeometryResult[]; onStroke: (stroke: PaintStroke) => void; onUndo: () => void }) {
  const { el, live } = useBrush(props.geometries, props.onStroke);
  useTwoFingerTap(el, props.onUndo);
  return live ? <StrokeView stroke={live} /> : null;
}

export function PaintTool(props: {
  geometries: readonly GeometryResult[];
  strokes: readonly PaintStroke[];
  active: boolean;
  onStroke: (stroke: PaintStroke) => void;
  onUndo: () => void;
}) {
  return (
    <group name="mark-strokes">
      {props.active ? <Brush geometries={props.geometries} onStroke={props.onStroke} onUndo={props.onUndo} /> : null}
      {props.strokes.map((stroke, i) => <StrokeView key={`${i}:${stroke.path.length}:${stroke.path[0]?.join(',')}`} stroke={stroke} />)}
    </group>
  );
}
