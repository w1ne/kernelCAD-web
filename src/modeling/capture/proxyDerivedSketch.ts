// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { isValidVec3, formatScalarForError } from '../../shared/intent/types';
import { buildFaceInputRef } from './shapeOperationFeatureRecords';
import { normalizeFaceSelector } from './proxyFeatureChain';
import type { Shape, FaceSelector } from './proxy';
import type { CaptureSession } from './captureSession';
import type { Sketch } from './sketch';

/**
 * Public method names on `Sketch` (kept in sync with `SKETCH_METHODS` in
 * `src/agent/mcp/tools/listApi.ts`). Used only to decide which property
 * accesses on an un-awaited `sectionSketch` / `faceSketch` / `silhouette`
 * result should raise the actionable "missing await" diagnostic below.
 */
const SKETCH_METHOD_NAMES = new Set(['extrude', 'revolve', 'sweep', 'loft', 'reflect']);

/**
 * Wrap the Promise<Sketch> returned by an async Shape->Sketch producer
 * (`sectionSketch`, `faceSketch`, `silhouette`) so that the common agent
 * mistake of chaining a Sketch method directly on the un-awaited result —
 * `part.sectionSketch('xy', 5).extrude(3)` — fails with an actionable
 * `feature.async-result.missing-await` diagnostic instead of the cryptic
 * `TypeError: sec.extrude is not a function`.
 *
 * `await`/`.then`/`.catch`/`.finally`/`Promise.all` etc. are untouched —
 * the Proxy forwards every property that isn't a Sketch method name to the
 * real Promise, bound to it.
 */
function guardAsyncSketchResult(promise: Promise<Sketch>, methodName: string): Promise<Sketch> {
  return new Proxy(promise, {
    get(target, prop) {
      if (typeof prop === 'string' && SKETCH_METHOD_NAMES.has(prop)) {
        return () => {
          throw new KernelError(
            'feature.async-result.missing-await',
            `${methodName}() is async — write \`(await shape.${methodName}(...)).${prop}(...)\`.`,
          );
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Promise<Sketch>;
}

/** Resolve the `sectionSketch` plane argument into a 2D frame. */
function resolveSectionFrame(
  plane:
    | 'xy' | 'xz' | 'yz'
    | { plane: 'xy' | 'xz' | 'yz'; offset?: number }
    | { origin: [number, number, number]; normal: [number, number, number] },
  cardinalFrame: (p: 'xy' | 'xz' | 'yz', offset: number) => import('../../kernel/backends/occt/sketchFromShape').PlaneFrame,
  makePlaneFrame: (
    origin: [number, number, number],
    normal: [number, number, number],
    uHint?: [number, number, number],
  ) => import('../../kernel/backends/occt/sketchFromShape').PlaneFrame,
): import('../../kernel/backends/occt/sketchFromShape').PlaneFrame {
  if (typeof plane === 'string') return cardinalFrame(plane, 0);
  if ('plane' in plane) {
    const offset = plane.offset ?? 0;
    if (!Number.isFinite(offset)) {
      throw new KernelError(
        'feature.invalid-args',
        `sectionSketch: plane offset must be a finite number; got ${formatScalarForError(offset)}.`,
        undefined,
        'Pass { plane: "xy" | "xz" | "yz", offset: <mm> }.',
      );
    }
    return cardinalFrame(plane.plane, offset);
  }
  if (!isValidVec3(plane.origin) || !isValidVec3(plane.normal) || Math.hypot(...plane.normal) < 1e-9) {
    throw new KernelError(
      'feature.invalid-args',
      'sectionSketch: { origin, normal } must be finite Vec3s with a non-zero normal.',
      undefined,
      'Pass { origin: [x, y, z], normal: [nx, ny, nz] } in mm.',
    );
  }
  return makePlaneFrame(plane.origin, plane.normal, [1, 0, 0]);
}

/** Signed chord area of a projected loop, used only to rank outer vs holes. */
function chordArea(segs: Array<{ x0: number; y0: number; x1: number; y1: number }>): number {
  let a = 0;
  for (const s of segs) a += s.x0 * s.y1 - s.x1 * s.y0;
  return a / 2;
}

export function sectionSketchOf(
  shape: Shape,
  session: CaptureSession,
  plane:
    | 'xy' | 'xz' | 'yz'
    | { plane: 'xy' | 'xz' | 'yz'; offset?: number }
    | { origin: [number, number, number]; normal: [number, number, number] },
  opts: { curveTolerance?: number } = {},
): Promise<Sketch> {
  const run = async (): Promise<Sketch> => {
    const { sectionLoops } = await import('../../kernel/backends/occt/sketchFromShapeOps');
    const { cardinalFrame, makePlaneFrame } = await import('../../kernel/backends/occt/sketchFromShape');
    const backend = await shape.lower();
    const frame = resolveSectionFrame(plane, cardinalFrame, makePlaneFrame);
    const extracted = sectionLoops(backend, frame, { curveTolerance: opts.curveTolerance });
    if (extracted.loops.length === 0) {
      throw new KernelError(
        'feature.section.plane-misses-body',
        `sectionSketch: the section plane does not intersect this body (no closed loops; ${extracted.openChains.length} open chain(s)).`,
        shape.id,
        'Move the plane offset/origin so it passes through the solid, or check the normal direction.',
      );
    }
    const commands = extracted.loops.flat();
    return session.createSketch({
      kind: 'sketch',
      inputs: { source: { kind: 'feature', id: shape.id } },
      params: {},
      metadata: {
        commands,
        derivedFrom: 'section',
        loopCount: extracted.loops.length,
        holeCount: Math.max(0, extracted.loops.length - 1),
        sectionAreaMm2: extracted.areas[0] - extracted.areas.slice(1).reduce((acc, a) => acc + a, 0),
      },
    });
  };
  return guardAsyncSketchResult(run(), 'sectionSketch');
}

export function faceSketchOf(
  shape: Shape,
  session: CaptureSession,
  face: FaceSelector | string,
  opts: { curveTolerance?: number } = {},
): Promise<Sketch> {
  const run = async (): Promise<Sketch> => {
    const { faceLoops } = await import('../../kernel/backends/occt/sketchFromShapeOps');
    const { makePlaneFrame } = await import('../../kernel/backends/occt/sketchFromShape');
    const { pickFace } = await import('../../kernel/backends/occt/edgeSelection');
    const backend = await shape.lower();

    // Resolve the selector through the same path every face feature uses, by
    // synthesizing a minimal face-typed record. This keeps canonical/label/
    // query/Query-DSL resolution in exactly one place.
    const faceRef = buildFaceInputRef(shape.id, normalizeFaceSelector(face) as never);
    const synthetic = {
      id: shape.id,
      kind: 'sectionSketch' as const,
      inputs: { face: faceRef },
      params: {},
      transforms: [],
      suppressed: false,
    };
    const resolved = pickFace(synthetic as never, backend, session.getRecords());
    if ('error' in resolved) {
      throw new KernelError(
        resolved.error.code as never,
        resolved.error.message,
        shape.id,
        resolved.error.hint,
      );
    }
    const replicadFace = resolved as unknown as {
      geomType?: string;
      center: { x: number; y: number; z: number };
      normalAt?: () => { x: number; y: number; z: number };
    };
    const surfaceType = (replicadFace.geomType ?? '').toUpperCase();
    if (surfaceType !== 'PLANE') {
      throw new KernelError(
        'feature.face-sketch.non-planar',
        `faceSketch: the selected face is non-planar (${surfaceType || 'unknown'} surface); only planar faces can be unrolled to a 2D sketch.`,
        shape.id,
        'Select a planar face (add { ofSurfaceType: "PLANE" } to the query), or use sectionSketch for a curved body.',
      );
    }
    const center: [number, number, number] = [
      replicadFace.center.x, replicadFace.center.y, replicadFace.center.z,
    ];
    // Face normal points out of the solid; the sketch frame can use either
    // orientation — flip to face inward so an extrude goes into the body.
    const n = resolved.normalAt?.() ?? { x: 0, y: 0, z: 1 };
    const normal: [number, number, number] = [n.x, n.y, n.z];
    const frame = makePlaneFrame(center, normal, [1, 0, 0]);
    const boundary = faceLoops(resolved as never, frame, { curveTolerance: opts.curveTolerance });
    const loops = [boundary.outer, ...boundary.holes].filter((l) => l.length > 0);
    if (loops.length === 0) {
      throw new KernelError(
        'feature.face-sketch.non-planar',
        `faceSketch: the selected face produced no closed boundary loops.`,
        shape.id,
        'Select a planar face with a closed outer wire.',
      );
    }
    const toCommands = (await import('../../kernel/backends/occt/sketchFromShape')).loopToCommands;
    return session.createSketch({
      kind: 'sketch',
      inputs: { source: { kind: 'feature', id: shape.id } },
      params: {},
      metadata: {
        commands: loops.flatMap((l) => toCommands(l)),
        derivedFrom: 'face',
        loopCount: loops.length,
        holeCount: loops.length - 1,
      },
    });
  };
  return guardAsyncSketchResult(run(), 'faceSketch');
}

export function silhouetteOf(
  shape: Shape,
  session: CaptureSession,
  direction: [number, number, number] = [0, 0, 1],
  opts: { curveTolerance?: number } = {},
): Promise<Sketch> {
  const run = async (): Promise<Sketch> => {
    const { silhouetteLoops } = await import('../../kernel/backends/occt/sketchFromShapeOps');
    const { makePlaneFrame, loopToCommands } = await import('../../kernel/backends/occt/sketchFromShape');
    if (!isValidVec3(direction) || Math.hypot(...direction) < 1e-9) {
      throw new KernelError(
        'feature.invalid-args',
        `silhouette: direction must be a non-zero finite Vec3; got ${formatScalarForError(direction)}.`,
        shape.id,
        'Pass a view direction such as [0, 0, 1] (top) or [1, 0, 0] (right).',
      );
    }
    const backend = await shape.lower();
    const frame = makePlaneFrame([0, 0, 0], direction, [1, 0, 0]);
    const res = silhouetteLoops(backend, frame, { curveTolerance: opts.curveTolerance });
    if (res.loops.length === 0) {
      throw new KernelError(
        'feature.section.plane-misses-body',
        `silhouette: no closed outline found along [${direction.join(', ')}].`,
        shape.id,
        'Try a different direction, or check the direction is not zero-length.',
      );
    }
    // Largest loop first (outer boundary), holes after — same convention as
    // sectionSketch.
    res.loops.sort((a, b) => Math.abs(chordArea(b)) - Math.abs(chordArea(a)));
    return session.createSketch({
      kind: 'sketch',
      inputs: { source: { kind: 'feature', id: shape.id } },
      params: {},
      metadata: {
        commands: res.loops.flatMap((l) => loopToCommands(l)),
        derivedFrom: 'silhouette',
        loopCount: res.loops.length,
        direction,
      },
    });
  };
  return guardAsyncSketchResult(run(), 'silhouette');
}
