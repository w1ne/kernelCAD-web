// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/inspectSection.ts
//
// Numeric section probes: "what is the cross-section area here?" without
// producing geometry. One slice answers area / perimeter / loop & hole counts /
// 2D bbox; `stack` scans a run of parallel slices and reports the minimum-area
// slice — the tool for finding the neck of a dumbbell, the thinnest wall, or
// the waist of a bottle.
//
// The geometry comes from the SAME `sectionLoops` used by
// `shape.sectionSketch`, so a probe and the sketch derived from it can never
// disagree.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { resolveRootId } from '../../../composition/buildModel';
import { runMcpScript } from '../runMcpScript';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import {
  cardinalFrame,
  makePlaneFrame,
  type PlaneFrame,
  type Vec3,
} from '../../../kernel/backends/occt/sketchFromShape';
import { sectionLoops } from '../../../kernel/backends/occt/sketchFromShapeOps';

export type SectionAxis = 'x' | 'y' | 'z';

export interface InspectSectionInput {
  file?: string;
  code?: string;
  feature_id?: string;
  /** Plane for a single section: cardinal name, { plane, offset }, or { origin, normal }. */
  plane?: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset?: number } | { origin: Vec3; normal: Vec3 };
  /** Shorthand single slice: `axis` picks the normal, `at` its offset. */
  at?: number;
  axis?: SectionAxis;
  /** Dense scan: `count` slices evenly spaced from `from` to `to` along `axis`. */
  stack?: { from: number; to: number; count: number; axis?: SectionAxis };
  curveTolerance?: number;
}

export interface SectionSlice {
  position: number;
  area: number;
  perimeter: number;
  loopCount: number;
  holeCount: number;
  bbox: { min: [number, number]; max: [number, number] };
}

export interface InspectSectionOutput {
  ok: boolean;
  axis?: SectionAxis;
  slices?: SectionSlice[];
  /** Index into `slices` of the smallest-area slice. */
  minAreaIndex?: number;
  minAreaPosition?: number;
  error?: string;
  errorCode?: string;
}

function axisNormal(axis: SectionAxis): Vec3 {
  if (axis === 'x') return [1, 0, 0];
  if (axis === 'y') return [0, 1, 0];
  return [0, 0, 1];
}

function axisVec(axis: SectionAxis, at: number): Vec3 {
  if (axis === 'x') return [at, 0, 0];
  if (axis === 'y') return [0, at, 0];
  return [0, 0, at];
}

/** Cardinal-plane name → the axis normal to it. */
function planeAxis(p: 'xy' | 'xz' | 'yz'): SectionAxis {
  return p === 'xy' ? 'z' : p === 'xz' ? 'y' : 'x';
}

function resolveFrame(
  input: InspectSectionInput,
): { frame: PlaneFrame; axis: SectionAxis | null } | { error: string; errorCode: string } {
  if (input.plane !== undefined) {
    const p = input.plane;
    if (typeof p === 'string') return { frame: cardinalFrame(p, 0), axis: planeAxis(p) };
    if ('plane' in p) return { frame: cardinalFrame(p.plane, p.offset ?? 0), axis: planeAxis(p.plane) };
    if (!Array.isArray(p.origin) || p.origin.length !== 3 || !Array.isArray(p.normal) || p.normal.length !== 3) {
      return { error: 'inspect section: { origin, normal } must be two Vec3 arrays.', errorCode: 'feature.invalid-args' };
    }
    return { frame: makePlaneFrame(p.origin, p.normal, [1, 0, 0]), axis: null };
  }
  const axis = input.stack?.axis ?? input.axis ?? 'z';
  const at = input.at ?? 0;
  return { frame: makePlaneFrame(axisVec(axis, at), axisNormal(axis), [1, 0, 0]), axis };
}

function probe(backend: OcctBackend, frame: PlaneFrame, position: number, tol?: number): SectionSlice {
  const extracted = sectionLoops(backend, frame, { curveTolerance: tol });
  const outerArea = extracted.areas[0] ?? 0;
  const outerPerimeter = extracted.perimeters[0] ?? 0;
  const outerBBox = extracted.bboxes[0] ?? { min: [0, 0] as [number, number], max: [0, 0] as [number, number] };
  const holes = extracted.areas.slice(1).reduce((acc, a) => acc + a, 0);
  const holePerimeter = extracted.perimeters.slice(1).reduce((acc, p) => acc + p, 0);
  return {
    position,
    area: outerArea - holes,
    perimeter: outerPerimeter + holePerimeter,
    loopCount: extracted.loops.length,
    holeCount: Math.max(0, extracted.loops.length - 1),
    bbox: outerBBox,
  };
}

/** Run the script and lower the target feature to its OCCT backend. */
async function lowerSectionTarget(
  input: InspectSectionInput,
): Promise<{ backend: OcctBackend } | { result: InspectSectionOutput }> {
  const script = await runMcpScript(input);
  if (!script.ok) return { result: { ok: false, error: script.error, errorCode: script.errorCode } };
  const { run } = script;
  if (run.records.length === 0) return { result: { ok: false, error: 'Script produced no features.' } };

  const tailId = run.records[run.records.length - 1].id;
  const targetId = input.feature_id ?? resolveRootId(run.returnValue, tailId)!;
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const backend = result.shapes.get(targetId) as OcctBackend | undefined;
  if (!backend) {
    const fatal = result.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      result: {
        ok: false,
        error: fatal ? `Feature '${targetId}' did not lower: ${fatal.message}` : `Feature '${targetId}' was not lowered.`,
        errorCode: fatal?.code,
      },
    };
  }
  return { backend };
}

/** Probe a run of evenly-spaced parallel slices along the stack axis. */
function runStackScan(
  backend: OcctBackend,
  stack: NonNullable<InspectSectionInput['stack']>,
  axis: SectionAxis | undefined,
  tol: number | undefined,
): InspectSectionOutput {
  const { from, to, count } = stack;
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isInteger(count) || count < 1) {
    return { ok: false, error: 'inspect stack requires finite from/to and integer count >= 1.', errorCode: 'feature.invalid-args' };
  }
  const stackAxis = stack.axis ?? axis ?? 'z';
  const slices: SectionSlice[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const pos = from + t * (to - from);
    const runFrame = makePlaneFrame(axisVec(stackAxis, pos), axisNormal(stackAxis), [1, 0, 0]);
    slices.push(probe(backend, runFrame, pos, tol));
  }
  let minAreaIndex = 0;
  let found = false;
  for (let i = 0; i < slices.length; i++) {
    // A slice that lands exactly on a face/edge boundary can return no
    // loops (area 0); it must not masquerade as the thinnest section.
    if (slices[i].loopCount === 0) continue;
    if (!found || slices[i].area < slices[minAreaIndex].area) {
      minAreaIndex = i;
      found = true;
    }
  }
  return {
    ok: true,
    axis: stackAxis,
    slices,
    minAreaIndex: found ? minAreaIndex : undefined,
    minAreaPosition: found ? slices[minAreaIndex].position : undefined,
  };
}

export async function inspectSectionTool(input: InspectSectionInput): Promise<InspectSectionOutput> {
  const lowered = await lowerSectionTarget(input);
  if ('result' in lowered) return lowered.result;
  const backend = lowered.backend;

  const resolved = resolveFrame(input);
  if ('error' in resolved) return { ok: false, error: resolved.error, errorCode: resolved.errorCode };
  const { frame, axis } = resolved;
  const tol = input.curveTolerance;

  if (input.stack) {
    return runStackScan(backend, input.stack, input.axis, tol);
  }

  const position = input.at ?? 0;
  const slice = probe(backend, frame, position, tol);
  return { ok: true, axis: axis ?? undefined, slices: [slice], minAreaIndex: 0, minAreaPosition: position };
}
