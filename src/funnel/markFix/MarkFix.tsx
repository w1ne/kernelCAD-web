// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Mark in the host-chat embed (ChatGPT apps, MCP Apps hosts such as Claude):
 * marking is only painting. Turn on the pencil, paint on the model, then
 * type what to change in the host chat's own composer. There is no note
 * box, Send button, panel, hint or dialog.
 *
 * Every change is posted as `kernelcad.marks` (strokes, touched faces with
 * coverage, bounds, camera, viewport, annotated screenshot); the widget puts
 * it into the host model's context so the next turn applies to the painted
 * area. Marks stay drawn after the pencil is turned off, until Clear or a
 * new revision.
 *
 * `useMarkFix` returns two nodes: `canvas` goes inside the viewer's <Canvas>
 * (brush + strokes), `overlay` is the toolbar icons. Both are null unless
 * the hosting widget said hello for this instance.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import { rendererSnapshot } from '../../studio/components/viewer/rendererSnapshot';
import { addStroke, buildMarksMessage, type MarksCamera } from './marks';
import { markScreenshot, type ScreenPoint } from './markScreenshot';
import { MarkToolbar } from './MarkToolbar';
import { PaintTool, type PaintStroke } from './PaintTool';
import { isCoarsePointer, postMarks, requestFullscreen, useHostedByWidget } from './widgetChannel';

export interface MarkFixTarget {
  slug: string;
  instanceId: string;
  revision: number | null;
}

/** Quiet time before a marks change is posted, so a burst of strokes is one update. */
export const MARKS_POST_DELAY_MS = 250;

/** The strokes' drawn paths on the live canvas, for the screenshot. */
function strokesOnScreen(strokes: readonly PaintStroke[]): { canvas: HTMLCanvasElement | null; screen: ScreenPoint[][] } {
  const { camera, gl } = rendererSnapshot;
  const canvas = gl?.domElement ?? null;
  if (!camera || !canvas) return { canvas, screen: [] };
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  const v = new THREE.Vector3();
  const screen = strokes.map((s) => s.path.map((p) => {
    v.set(p[0], p[1], p[2]).project(camera);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
  }));
  return { canvas, screen };
}

function cameraNow(): { camera?: MarksCamera; viewport?: { width: number; height: number } } {
  const { camera, gl } = rendererSnapshot;
  if (!camera) return {};
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const persp = camera as THREE.PerspectiveCamera;
  const out: MarksCamera = {
    projection: (camera as THREE.OrthographicCamera).isOrthographicCamera ? 'orthographic' : 'perspective',
    position: [camera.position.x, camera.position.y, camera.position.z],
    direction: [dir.x, dir.y, dir.z],
    up: [camera.up.x, camera.up.y, camera.up.z],
  };
  if (persp.isPerspectiveCamera) out.fovDeg = persp.fov;
  const el = gl?.domElement;
  return { camera: out, viewport: el ? { width: el.clientWidth, height: el.clientHeight } : undefined };
}

const areaCache = new WeakMap<FaceGeometry, number>();

/** Triangle-mesh area of one face, mm^2 (cached per face mesh). */
export function meshFaceArea(face: FaceGeometry): number {
  const cached = areaCache.get(face);
  if (cached !== undefined) return cached;
  const v = face.vertices;
  const idx = face.indices;
  let area = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i + 2 < idx.length; i += 3) {
    a.fromArray(v, idx[i]! * 3);
    b.fromArray(v, idx[i + 1]! * 3);
    c.fromArray(v, idx[i + 2]! * 3);
    area += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  areaCache.set(face, area);
  return area;
}

/**
 * Post the current marks to the widget after each change (an empty list
 * once they are cleared). Nothing is posted before the first mark, so
 * merely opening the viewer never touches the host's context.
 */
function useMarksPublisher(
  target: MarkFixTarget | undefined,
  strokes: readonly PaintStroke[],
  geometries: readonly GeometryResult[],
  enabled: boolean,
): void {
  const seq = useRef(0);
  const posted = useRef(false);
  const geoRef = useRef(geometries);
  useEffect(() => { geoRef.current = geometries; });
  const slug = target?.slug;
  const revision = target?.revision ?? null;
  const instanceId = target?.instanceId;
  useEffect(() => {
    if (!enabled || !slug || !instanceId) return undefined;
    if (strokes.length === 0 && !posted.current) return undefined;
    const timer = window.setTimeout(() => {
      const { canvas, screen } = strokes.length > 0 ? strokesOnScreen(strokes) : { canvas: null, screen: [] };
      seq.current += 1;
      postMarks(buildMarksMessage({
        seq: seq.current,
        slug,
        revision,
        instanceId,
        strokes: strokes.map((s) => s.hits),
        faceArea: (shapeIndex, faceId) => {
          const face = geoRef.current[shapeIndex]?.faces.find((f) => f.faceId === faceId);
          return face ? meshFaceArea(face) : null;
        },
        ...(strokes.length > 0 ? cameraNow() : {}),
        screenshot: strokes.length > 0 ? markScreenshot(canvas, screen) : null,
      }));
      posted.current = strokes.length > 0;
    }, MARKS_POST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, slug, revision, instanceId, strokes]);
}

export function useMarkFix(args: {
  target: MarkFixTarget | undefined;
  geometries: readonly GeometryResult[];
  displayed: boolean;
}): { canvas: ReactNode; overlay: ReactNode } {
  const { target, geometries, displayed } = args;
  const hosted = useHostedByWidget(target?.instanceId);
  const [active, setActive] = useState(false);
  const [strokes, setStrokes] = useState<PaintStroke[]>([]);

  // Marks belong to one revision: a new model (or revision) starts clean,
  // and the publisher tells the widget the old marks are gone.
  const modelKey = `${target?.slug ?? ''}@${String(target?.revision ?? '')}`;
  const [marksFor, setMarksFor] = useState(modelKey);
  if (marksFor !== modelKey) {
    setMarksFor(modelKey);
    setStrokes([]);
    setActive(false);
  }

  useMarksPublisher(target, strokes, geometries, hosted);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const undo = useCallback(() => setStrokes((prev) => prev.slice(0, -1)), []);
  const instanceId = target?.instanceId;
  const toggle = useCallback(() => {
    if (!active && instanceId && isCoarsePointer()) requestFullscreen(instanceId);
    setActive(!active);
  }, [active, instanceId]);

  if (!target || !hosted) return { canvas: null, overlay: null };

  const showStrokes = displayed && (active || strokes.length > 0);
  return {
    canvas: showStrokes ? (
      <PaintTool
        geometries={geometries}
        strokes={strokes}
        active={active}
        onStroke={(stroke) => setStrokes((prev) => addStroke(prev, stroke))}
        onUndo={undo}
      />
    ) : null,
    overlay: (
      <MarkToolbar
        active={active}
        count={strokes.length}
        disabled={!displayed}
        onToggle={toggle}
        onUndo={undo}
        onClear={() => setStrokes([])}
      />
    ),
  };
}
