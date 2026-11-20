// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Per-member appearance through booleans.
//
// `.finish()` / `.material()` / `.color()` write the record they are called
// on. A `union()` result is a new record, so before this module every
// consumer coloured the fused body from one record: Studio meshing read the
// union record only (no appearance -> default grey) and the GLB / mesh
// exporters walked the primary lineage (the base operand's finish painted the
// whole body). A dark servo case unioned with a metal horn lost the horn.
//
// Where each face came from: every boolean records, from the OCCT boolean
// history, which operand each result face came from (`memberOrigin`, oldest
// record first). That works for any operand, including a sketch extrude or
// extruded text that carries no naming lineage. Faces without an origin
// (after a later fillet, say) fall back to the naming lineage
// (`FaceLineage.descendsFrom`) in `historyMap`. For each face this module
// walks that chain from the newest record back to the oldest and takes the
// first record that
//   1. carries its own appearance (`metadata.material`, else `metadata.color`),
//   2. is MATERIAL-SIDE of the source record: reachable through union
//      operands and primary inputs, never through the cutter of a subtract /
//      intersect.
// Rules that follow:
//   - an appearance set on the result (or anything downstream of a member)
//     still covers every face, so `union(a, b).finish('x')` is unchanged;
//   - a face with no member in its lineage (the wall a cutter left behind,
//     a blend face born in a later fillet) takes the finish of the faces
//     around it when they agree: a bore drilled only through the horn has
//     aluminium walls, a rounded horn rim stays aluminium. Where the
//     neighbours differ (a blend across the case/horn seam) or nothing
//     around it resolves, it takes the body's appearance: the primary
//     lineage default, exactly what the whole-body path already used;
//   - only faces whose source differs from that default are listed, so a
//     model whose operands share one finish produces no per-face entries.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeatureId, FeatureRef } from '../../../shared/intent/types';
import type { PBRMaterial } from '../../../shared/intent/material';
import type { ShapeBackend } from '../backend';
import { pbrFromColor } from '../../../shared/render/materialRoles';
import { resolveColor } from '../../../shared/render/palette';
import { OcctBackend } from './occtBackend';
import { faceHashOf } from './createdRefs';
import type { FaceLineage } from '../../naming/evolutionRecord';

/** Face index (replicad `shape.faces` order, the order `meshShape` assigns
 *  `faceId` in) -> the appearance of the member that face came from. */
export type MaterialByFaceIndex = Record<number, PBRMaterial>;

function refId(ref: FeatureRef | undefined): FeatureId | undefined {
  return ref !== undefined && ref.kind === 'feature' ? ref.id : undefined;
}

function isUnion(r: FeatureRecord): boolean {
  return r.kind === 'boolean' && String(r.params.op?.expression ?? '').replace(/'/g, '') === 'union';
}

/** Records whose material can end up on the surface of `source`'s result:
 *  every operand of a union, and the primary input (shape > base > target)
 *  of everything else. A subtract / intersect cutter is never followed. */
export function materialSideRecords(
  source: FeatureRecord,
  recordById: ReadonlyMap<FeatureId, FeatureRecord>,
): Set<FeatureId> {
  const out = new Set<FeatureId>();
  const stack: FeatureRecord[] = [source];
  while (stack.length > 0) {
    const r = stack.pop()!;
    if (out.has(r.id)) continue;
    out.add(r.id);
    const next: FeatureId[] = [];
    if (isUnion(r)) {
      for (const [key, ref] of Object.entries(r.inputs)) {
        if (key === 'base' || key.startsWith('cutter_')) {
          const id = refId(ref);
          if (id !== undefined) next.push(id);
        }
      }
    } else {
      const id = refId(r.inputs.shape) ?? refId(r.inputs.base) ?? refId(r.inputs.target);
      if (id !== undefined) next.push(id);
    }
    for (const id of next) {
      const rec = recordById.get(id);
      if (rec !== undefined) stack.push(rec);
    }
  }
  return out;
}

/** A record's own appearance as a PBR material: `.material()` / `.finish()`
 *  as written, else a `.color()` value promoted the way the renderer promotes
 *  a feature colour (role token -> its metalness/roughness profile). */
function ownAppearance(r: FeatureRecord | undefined): PBRMaterial | undefined {
  const meta = r?.metadata as { material?: unknown; color?: unknown } | undefined;
  if (meta === undefined) return undefined;
  if (typeof meta.material === 'object' && meta.material !== null) return meta.material as PBRMaterial;
  if (typeof meta.color !== 'string') return undefined;
  const profile = pbrFromColor(meta.color);
  return {
    baseColor: resolveColor(meta.color) ?? meta.color,
    metalness: profile.metalness,
    roughness: profile.roughness,
  };
}

/** First record with its own appearance on the primary lineage of `source`
 *  (inclusive): the body's default, the one the whole-shape path uses. */
function primaryAppearanceSource(
  source: FeatureRecord,
  recordById: ReadonlyMap<FeatureId, FeatureRecord>,
): FeatureId | undefined {
  const seen = new Set<FeatureId>();
  let r: FeatureRecord | undefined = source;
  while (r !== undefined && !seen.has(r.id)) {
    seen.add(r.id);
    if (ownAppearance(r) !== undefined) return r.id;
    const id: FeatureId | undefined = refId(r.inputs.shape) ?? refId(r.inputs.base) ?? refId(r.inputs.target);
    r = id === undefined ? undefined : recordById.get(id);
  }
  return undefined;
}

/**
 * Per-face member appearance of `shape`, the lowered result of `source`.
 * Returns `undefined` when every face takes the body's default (no
 * differently finished member reaches the surface), so callers keep their
 * whole-shape path untouched.
 */
export function memberMaterialsByFace(
  shape: ShapeBackend | undefined,
  source: FeatureRecord | undefined,
  records: readonly FeatureRecord[],
  recordByIdIn?: ReadonlyMap<FeatureId, FeatureRecord>,
): MaterialByFaceIndex | undefined {
  if (source === undefined || !(shape instanceof OcctBackend)) return undefined;
  const history = shape.historyMap ?? new Map();
  const origin = shape.memberOrigin;
  if (history.size === 0 && origin === undefined) return undefined;
  const recordById = recordByIdIn ?? new Map<FeatureId, FeatureRecord>(records.map((r) => [r.id, r]));
  const side = materialSideRecords(source, recordById);
  const defaultId = primaryAppearanceSource(source, recordById);
  // Fast path: nothing material-side carries an appearance other than the
  // default, so every face would resolve to the default.
  let candidates = 0;
  for (const id of side) {
    if (id !== defaultId && ownAppearance(recordById.get(id)) !== undefined) candidates++;
  }
  if (candidates === 0) return undefined;

  let faces: unknown[];
  try {
    faces = (shape.getReplicadShape() as unknown as { faces: unknown[] }).faces;
  } catch {
    return undefined;
  }
  const defaultPbr = defaultId === undefined ? undefined : ownAppearance(recordById.get(defaultId));
  const defaultKey = defaultPbr === undefined ? undefined : JSON.stringify(defaultPbr);
  // Per face: a member finish, DEFAULT (the body's own), or undefined when no
  // material-side record with an appearance is in the face's lineage (a
  // blend face born in a fillet, the wall a cutter left behind).
  const resolved: Array<PBRMaterial | typeof DEFAULT | undefined> = faces.map((face) => {
    const hash = hashOf(face);
    const chain = origin?.get(hash) ?? lineageChain(history.get(hash));
    if (chain === undefined) return undefined;
    for (let i = chain.length - 1; i >= 0; i--) {
      const id = chain[i]!;
      if (!side.has(id)) continue;
      const pbr = ownAppearance(recordById.get(id));
      if (pbr === undefined) continue;
      return id === defaultId || JSON.stringify(pbr) === defaultKey ? DEFAULT : pbr;
    }
    return undefined;
  });
  inheritFromNeighbours(faces, resolved);

  const out: MaterialByFaceIndex = {};
  let any = false;
  resolved.forEach((r, index) => {
    if (r === undefined || r === DEFAULT) return;
    out[index] = r;
    any = true;
  });
  return any ? out : undefined;
}

const DEFAULT = Symbol('body-default');

/** Records a face descends from, oldest first, from its naming lineage. */
function lineageChain(lineage: FaceLineage | undefined): readonly string[] | undefined {
  if (lineage === undefined) return undefined;
  return lineage.descendsFrom
    ?? [lineage.rootFeatureId, ...(lineage.featureId !== undefined ? [lineage.featureId] : [])];
}

function hashOf(shape: unknown): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return faceHashOf(shape as any);
  } catch {
    return '';
  }
}

/**
 * A face with no member in its lineage takes the finish of the faces around
 * it when they all agree: a fillet rounding the horn's rim stays aluminium, a
 * bore drilled only through the horn has aluminium walls. A face between two
 * different finishes (a blend across the case/horn seam) keeps the body
 * default. Blend chains (vertex blends touching only other blends) settle
 * over a few passes.
 */
function inheritFromNeighbours(
  faces: readonly unknown[],
  resolved: Array<PBRMaterial | typeof DEFAULT | undefined>,
): void {
  if (!resolved.some((r) => r === undefined)) return;
  const facesByEdge = new Map<string, number[]>();
  const edgesOfFace: string[][] = faces.map((face, index) => {
    let edges: unknown[] = [];
    try {
      edges = (face as { edges: unknown[] }).edges;
    } catch {
      edges = [];
    }
    const hashes = edges.map((edge) => hashOf(edge)).filter((h) => h !== '');
    for (const h of hashes) {
      const list = facesByEdge.get(h);
      if (list === undefined) facesByEdge.set(h, [index]);
      else if (!list.includes(index)) list.push(index);
    }
    return hashes;
  });
  const keyOf = (r: PBRMaterial | typeof DEFAULT): string => (r === DEFAULT ? '' : JSON.stringify(r));
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    const prev = resolved.slice();
    prev.forEach((r, index) => {
      if (r !== undefined) return;
      const seen = new Map<string, PBRMaterial | typeof DEFAULT>();
      for (const edge of edgesOfFace[index]!) {
        for (const other of facesByEdge.get(edge) ?? []) {
          const n = other === index ? undefined : prev[other];
          if (n !== undefined) seen.set(keyOf(n), n);
        }
      }
      if (seen.size === 0) return;
      resolved[index] = seen.size === 1 ? [...seen.values()][0]! : DEFAULT;
      changed = true;
    });
    if (!changed) return;
  }
}
