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
// The faces already know where they came from: every boolean writes face
// lineage (`FaceLineage.descendsFrom`, earliest record first) into the
// result's `historyMap`. This module reads it. For each face of a lowered
// shape it walks that chain from the newest record back to the oldest and
// takes the first record that
//   1. carries its own appearance (`metadata.material`, else `metadata.color`),
//   2. is MATERIAL-SIDE of the source record: reachable through union
//      operands and primary inputs, never through the cutter of a subtract /
//      intersect.
// Rules that follow:
//   - an appearance set on the result (or anything downstream of a member)
//     still covers every face, so `union(a, b).finish('x')` is unchanged;
//   - faces a cutter left behind (a bore, a pocket wall) and faces born in a
//     later feature (a fillet) take the body's appearance: the primary
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
  const history = shape.historyMap;
  if (history === undefined || history.size === 0) return undefined;
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
  const out: MaterialByFaceIndex = {};
  let any = false;
  faces.forEach((face, index) => {
    let hash: string;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hash = faceHashOf(face as any);
    } catch {
      return;
    }
    const lineage = history.get(hash);
    if (lineage === undefined) return;
    const chain = lineage.descendsFrom
      ?? [lineage.rootFeatureId, ...(lineage.featureId !== undefined ? [lineage.featureId] : [])];
    for (let i = chain.length - 1; i >= 0; i--) {
      const id = chain[i]!;
      if (!side.has(id)) continue;
      const pbr = ownAppearance(recordById.get(id));
      if (pbr === undefined) continue;
      // A member finished like the body adds nothing; list only faces that
      // render differently from the whole-shape default.
      if (id !== defaultId && JSON.stringify(pbr) !== defaultKey) {
        out[index] = pbr;
        any = true;
      }
      return;
    }
  });
  return any ? out : undefined;
}
