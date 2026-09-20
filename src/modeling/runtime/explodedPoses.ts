// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/explodedPoses.ts
//
// Pure exploded-assembly poses. Render and svg-drawing compose the extra
// world translations onto existing part worldTransforms — no new renderer.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import { parseConnectorRef } from '../mates/mate';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { Transform, type Vec3 } from '../../shared/runtime/se3';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { detectInterferences } from './detectInterferences';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { createOcctLowerer } from '../backends/occt/occtLowerer';

export type ExplodeMode = 'radial' | 'mate-axis';

export interface ExplodedPosesOptions {
  factor: number;
  mode: ExplodeMode;
  /** Optional part-name order; omitted = assembly declaration order. */
  order?: readonly string[];
}

export interface ExplodedPartPose {
  name: string;
  /** Extra world-space translation from the assembled pose. */
  offset: Vec3;
  /** Unit explode direction (zero vector when the part does not move). */
  direction: Vec3;
  distance: number;
}

export interface ExplodedPosesResult {
  parts: ExplodedPartPose[];
  offsets: ReadonlyMap<string, Vec3>;
  diagnostics: CompilerDiagnostic[];
}

export interface ParsedExplode {
  factor: number;
  mode: ExplodeMode;
}

const ZERO: Vec3 = [0, 0, 0];
const MAX_ITERS = 8;
const MAX_SCALE = 8;
const SCALE_STEP = 1.5;

function hypot3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v: Vec3): Vec3 {
  const n = hypot3(v);
  return n > 1e-12 ? scaleVec(v, 1 / n) : ZERO;
}

function centroidOf(min: Vec3, max: Vec3): Vec3 {
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

function extentAlong(size: Vec3, axis: Vec3): number {
  return Math.abs(size[0] * axis[0]) + Math.abs(size[1] * axis[1]) + Math.abs(size[2] * axis[2]);
}

interface PartGeom {
  name: string;
  centroid: Vec3;
  size: Vec3;
}

function partGeometry(scene: SceneBackend): PartGeom[] {
  return scene.parts.map((p) => {
    const world = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform);
    const bb = world.boundingBox({ exact: true });
    return {
      name: p.name,
      centroid: centroidOf(bb.min, bb.max),
      size: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
    };
  });
}

function worldTByName(scene: SceneBackend): Map<string, Transform> {
  const m = new Map<string, Transform>();
  for (const p of scene.parts) m.set(p.name, p.worldTransform);
  return m;
}

function connectorAxis(part: AssemblyPartStored, connectorName: string): Vec3 {
  const mate = part.mateConnectors.find((c) => c.name === connectorName);
  if (mate) {
    const raw = mate.axis ?? mate.normal ?? [0, 0, 1];
    return normalize(raw as Vec3);
  }
  const v5 = part.connectors[connectorName];
  if (v5?.axis !== undefined) {
    return normalize([v5.axis.x.evaluated, v5.axis.y.evaluated, v5.axis.z.evaluated]);
  }
  return [0, 0, 1];
}

interface TreeEdge {
  parent: string;
  child: string;
  axisLocal: Vec3;
}

function mateTree(arm: Assembly, rootName: string): TreeEdge[] {
  const parts = arm.__parts();
  const mates = arm.__mates();
  const adjacency = new Map<string, { neighbor: string; connectorName: string }[]>();
  for (const p of parts) adjacency.set(p.name, []);
  for (const m of mates) {
    const a = parseConnectorRef(m.a);
    const b = parseConnectorRef(m.b);
    adjacency.get(a.partName)?.push({ neighbor: b.partName, connectorName: a.connectorName });
    adjacency.get(b.partName)?.push({ neighbor: a.partName, connectorName: b.connectorName });
  }
  const partByName = new Map(parts.map((p) => [p.name, p]));
  const edges: TreeEdge[] = [];
  const visited = new Set<string>([rootName]);
  const queue = [rootName];
  while (queue.length > 0) {
    const parent = queue.shift()!;
    for (const e of adjacency.get(parent) ?? []) {
      if (visited.has(e.neighbor)) continue;
      visited.add(e.neighbor);
      const parentPart = partByName.get(parent);
      const axisLocal = parentPart ? connectorAxis(parentPart, e.connectorName) : ([0, 0, 1] as Vec3);
      edges.push({ parent, child: e.neighbor, axisLocal });
      queue.push(e.neighbor);
    }
  }
  return edges;
}

function jointTree(arm: Assembly): TreeEdge[] {
  const parts = arm.__parts();
  const byId = new Map(parts.map((p) => [p.id, p]));
  const edges: TreeEdge[] = [];
  for (const j of arm.__joints()) {
    const parent = byId.get(j.parentPartId);
    const child = byId.get(j.childPartId);
    if (!parent || !child) continue;
    const axisLocal = normalize((j.axis ?? [0, 0, 1]) as Vec3);
    edges.push({ parent: parent.name, child: child.name, axisLocal });
  }
  return edges;
}

function connectTree(arm: Assembly): TreeEdge[] {
  const parts = arm.__parts();
  const byId = new Map(parts.map((p) => [p.id, p]));
  const edges: TreeEdge[] = [];
  for (const p of parts) {
    if (p.connectParentId === undefined) continue;
    const parent = byId.get(p.connectParentId);
    if (!parent) continue;
    edges.push({ parent: parent.name, child: p.name, axisLocal: [0, 0, 1] });
  }
  return edges;
}

function declarationChain(names: readonly string[], geom: ReadonlyMap<string, PartGeom>): TreeEdge[] {
  const edges: TreeEdge[] = [];
  for (let i = 1; i < names.length; i++) {
    const parent = geom.get(names[i - 1]);
    const child = geom.get(names[i]);
    const delta = parent && child ? sub(child.centroid, parent.centroid) : ([0, 0, 1] as Vec3);
    const axisLocal = hypot3(delta) > 1e-9 ? normalize(delta) : ([0, 0, 1] as Vec3);
    edges.push({ parent: names[i - 1]!, child: names[i]!, axisLocal });
  }
  return edges;
}

/** World-space step from a parent to its child along the resolved mate axis:
 *  child-size extent × factor × spacingScale, flipped so the child moves away
 *  from the parent centroid when a geometry pair is known. */
function mateAxisStep(
  e: TreeEdge,
  parentOff: Vec3,
  parentT: Transform,
  geomByName: ReadonlyMap<string, PartGeom>,
  factor: number,
  spacingScale: number,
): Vec3 {
  let axis = normalize(parentT.axisDir(e.axisLocal));
  if (hypot3(axis) < 1e-12) axis = [0, 0, 1];
  const parentG = geomByName.get(e.parent);
  const childG = geomByName.get(e.child);
  if (parentG && childG) {
    const away = sub(childG.centroid, parentG.centroid);
    if (away[0] * axis[0] + away[1] * axis[1] + away[2] * axis[2] < 0) {
      axis = scaleVec(axis, -1);
    }
  }
  const extent = childG ? Math.max(extentAlong(childG.size, axis), 1e-6) : 1;
  const step = scaleVec(axis, extent * factor * spacingScale);
  return add(parentOff, step);
}

function mateAxisOffsets(
  arm: Assembly,
  scene: SceneBackend,
  names: readonly string[],
  geomByName: ReadonlyMap<string, PartGeom>,
  factor: number,
  spacingScale: number,
): Map<string, Vec3> {
  const root = names[0] ?? scene.parts[0]?.name;
  let edges = root ? mateTree(arm, root) : [];
  if (edges.length === 0) edges = jointTree(arm);
  if (edges.length === 0) edges = connectTree(arm);
  if (edges.length === 0) edges = declarationChain(names, geomByName);

  const worldT = worldTByName(scene);
  const offsets = new Map<string, Vec3>();
  for (const n of names) offsets.set(n, ZERO);

  // Parents before children: edges are BFS-ordered from the tree builders.
  for (const e of edges) {
    const parentOff = offsets.get(e.parent) ?? ZERO;
    const parentT = worldT.get(e.parent) ?? Transform.identity();
    offsets.set(e.child, mateAxisStep(e, parentOff, parentT, geomByName, factor, spacingScale));
  }
  return offsets;
}

function radialOffsets(
  names: readonly string[],
  geomByName: ReadonlyMap<string, PartGeom>,
  factor: number,
  spacingScale: number,
): Map<string, Vec3> {
  const geoms = names.map((n) => geomByName.get(n)).filter((g): g is PartGeom => g !== undefined);
  const assemblyCentroid: Vec3 = geoms.length === 0
    ? ZERO
    : scaleVec(geoms.reduce((acc, g) => add(acc, g.centroid), ZERO), 1 / geoms.length);
  const offsets = new Map<string, Vec3>();
  for (const g of geoms) {
    let dir = normalize(sub(g.centroid, assemblyCentroid));
    if (hypot3(dir) < 1e-12) dir = [0, 0, 1];
    const size = Math.max(g.size[0], g.size[1], g.size[2], 1e-6);
    offsets.set(g.name, scaleVec(dir, size * factor * spacingScale));
  }
  return offsets;
}

function toParts(names: readonly string[], offsets: ReadonlyMap<string, Vec3>): ExplodedPartPose[] {
  return names.map((name) => {
    const offset = offsets.get(name) ?? ZERO;
    const distance = hypot3(offset);
    return {
      name,
      offset,
      direction: distance > 1e-12 ? normalize(offset) : ZERO,
      distance,
    };
  });
}

/**
 * Compose extra explode translations onto each part's assembled worldTransform.
 * Translation is applied in world space (left-compose).
 */
export function applyExplodedOffsets(
  scene: SceneBackend,
  offsets: ReadonlyMap<string, Vec3>,
): SceneBackend {
  return {
    ...scene,
    parts: scene.parts.map((p) => {
      const off = offsets.get(p.name);
      if (!off || (off[0] === 0 && off[1] === 0 && off[2] === 0)) return p;
      return {
        ...p,
        worldTransform: Transform.translation(off[0], off[1], off[2]).compose(p.worldTransform),
      };
    }),
  };
}

async function lowerAssemblyScene(arm: Assembly): Promise<SceneBackend | undefined> {
  const session = arm.__session();
  const engine = new RecomputeEngine(createOcctLowerer(session));
  const r = await engine.run(session.getRecords(), { paramTable: session.paramTable });
  let fallback: SceneBackend | undefined;
  for (const shape of r.shapes.values()) {
    if (!isSceneBackend(shape)) continue;
    if (shape.assemblyName === arm.name) return shape;
    fallback = shape;
  }
  return fallback;
}

export async function explodedPoses(
  arm: Assembly,
  opts: ExplodedPosesOptions,
  sceneIn?: SceneBackend,
): Promise<ExplodedPosesResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const scene = sceneIn ?? await lowerAssemblyScene(arm);
  const names = (opts.order && opts.order.length > 0
    ? [...opts.order]
    : arm.__parts().map((p) => p.name));
  if (!scene || names.length === 0) {
    return { parts: names.map((name) => ({ name, offset: ZERO, direction: ZERO, distance: 0 })), offsets: new Map(), diagnostics };
  }
  const geoms = partGeometry(scene);
  const geomByName = new Map(geoms.map((g) => [g.name, g]));
  const factor = Number.isFinite(opts.factor) ? Math.max(0, opts.factor) : 0;

  const compute = (spacingScale: number): Map<string, Vec3> =>
    opts.mode === 'radial'
      ? radialOffsets(names, geomByName, factor, spacingScale)
      : mateAxisOffsets(arm, scene, names, geomByName, factor, spacingScale);

  let scale = 1;
  let offsets = compute(scale);
  if (factor > 0 && names.length > 1) {
    for (let i = 0; i < MAX_ITERS; i++) {
      const exploded = applyExplodedOffsets(scene, offsets);
      const inter = detectInterferences(exploded, 0.01, new Set());
      if (inter.pairs.length === 0) break;
      if (scale * SCALE_STEP > MAX_SCALE) break;
      scale *= SCALE_STEP;
      offsets = compute(scale);
    }
  }

  return { parts: toParts(names, offsets), offsets, diagnostics };
}

export function parseExplodeMode(raw: string | undefined): ExplodeMode | undefined {
  if (raw === undefined || raw === '') return 'mate-axis';
  if (raw === 'radial' || raw === 'mate-axis') return raw;
  return undefined;
}

export function parseExplodeInput(input: {
  factor?: number;
  mode?: string;
} | undefined): { ok: true; value: ParsedExplode } | { ok: false; message: string } {
  if (input === undefined) {
    return { ok: false, message: 'explode is missing' };
  }
  const factor = input.factor;
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < 0) {
    return {
      ok: false,
      message: `explode.factor must be a finite number ≥ 0 (got ${String(factor)}).`,
    };
  }
  const mode = parseExplodeMode(input.mode);
  if (mode === undefined) {
    return {
      ok: false,
      message: `explode.mode must be 'radial' or 'mate-axis' (got '${String(input.mode)}').`,
    };
  }
  return { ok: true, value: { factor, mode } };
}
