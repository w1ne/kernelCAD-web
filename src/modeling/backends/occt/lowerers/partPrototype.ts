// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Source-shape provenance for assembly parts. `lowerAssemblyPart` clones the
// part's source shape and translates it by `at`, nothing else, so two parts
// whose sources have the same content are the same geometry in the same
// local frame. Exporters with a product structure (STEP) use this to write
// one product with one placed instance per part.
//
// "Same content" is decided on the feature records, never on measured
// geometry: a source's key is its resolved lowering fields with every input
// id replaced by that input's own key. One shape placed twice shares a key,
// and so do two separately authored but identical chains (a loop that calls
// `cylinder(4, 15)` or `lib.fetchPart(id)` once per part). Anything the key
// cannot see through (a missing record, a surface input) falls back to the
// record id, which only ever keeps parts apart.
//
// The translates and rotates that end the source's own transform list are
// placement, not content: they are left out of the key and returned with
// `at` as the part's rigid placement. `pin.rotateY(90).translate(0, 20, 0)`
// is the same product as `pin`, placed differently. A scale or a reflect
// changes the geometry, so it and everything before it stay in the key.

import type { SceneBackendPart } from '../../../../kernel/backends/sceneBackend';
import type { FeatureRecord, ShapeTransform } from '../../../../shared/intent/featureRecord';
import type { FeatureRef } from '../../../../shared/intent/types';
import { resolveParams } from '../../../../shared/runtime/resolveParams';
import { Transform } from '../../../../shared/runtime/se3';
import { structuralHashRecord } from '../../../compute/prefixReuse';
import type { LowerContext } from './context';

export type PartPrototypeResolver = (
  partRec: FeatureRecord | undefined,
  at: readonly [number, number, number],
) => SceneBackendPart['prototype'];

/** Number of leading transforms that are content; the rest are rigid placement. */
function contentTransformCount(transforms: readonly ShapeTransform[]): number {
  let count = transforms.length;
  while (count > 0 && (transforms[count - 1].op === 'translate' || transforms[count - 1].op === 'rotateAxis')) count--;
  return count;
}

/** The rigid motion of `transforms`, composed in the order the lowerer applies them. */
function rigidPlacement(transforms: readonly ShapeTransform[]): Transform {
  let placement = Transform.identity();
  for (const t of transforms) {
    if (t.op === 'translate') {
      placement = Transform.translation(t.vec.x.evaluated, t.vec.y.evaluated, t.vec.z.evaluated).compose(placement);
    } else if (t.op === 'rotateAxis') {
      const pivot = t.pivot ? [t.pivot.x.evaluated, t.pivot.y.evaluated, t.pivot.z.evaluated] as const : [0, 0, 0] as const;
      placement = Transform.rotationAroundPivot(
        [t.axis.x.evaluated, t.axis.y.evaluated, t.axis.z.evaluated], t.degrees.evaluated, [pivot[0], pivot[1], pivot[2]],
      ).compose(placement);
    }
  }
  return placement;
}

/** Build a resolver that shares content keys across one scene's parts. */
export function createPartPrototypeResolver(
  ctx: LowerContext,
  records: readonly FeatureRecord[],
): PartPrototypeResolver {
  const byId = new Map(records.map((record) => [record.id as string, record]));
  const keyById = new Map<string, string>();
  const keyByContent = new Map<string, string>();
  const resolveRecord = (record: FeatureRecord): FeatureRecord => {
    if (ctx.inputs.resolveRecord) return ctx.inputs.resolveRecord(record);
    return ctx.inputs.paramTable ? resolveParams(record, ctx.inputs.paramTable) as FeatureRecord : record;
  };

  /** Key of `resolved` with only its first `transformCount` transforms; undefined when opaque. */
  const keyOfContent = (resolved: FeatureRecord, transformCount: number): string | undefined => {
    const inputs: Record<string, unknown> = {};
    for (const [name, ref] of Object.entries(resolved.inputs) as [string, FeatureRef][]) {
      if (ref.kind === 'feature') inputs[name] = { kind: ref.kind, id: contentKey(ref.id) };
      else if (ref.kind === 'surface') return undefined;
      else inputs[name] = { ...ref, featureId: contentKey(ref.featureId) };
    }
    const content = structuralHashRecord({
      ...resolved,
      inputs: inputs as FeatureRecord['inputs'],
      transforms: resolved.transforms.slice(0, transformCount),
    }, undefined);
    const key = keyByContent.get(content) ?? `content:${keyByContent.size}`;
    keyByContent.set(content, key);
    return key;
  };

  const contentKey = (id: string): string => {
    const known = keyById.get(id);
    if (known !== undefined) return known;
    const record = byId.get(id);
    let key = `id:${id}`;
    if (record !== undefined) {
      // Guard a malformed cyclic graph: a revisit reads the id fallback.
      keyById.set(id, key);
      const resolved = resolveRecord(record);
      key = keyOfContent(resolved, resolved.transforms.length) ?? key;
    }
    keyById.set(id, key);
    return key;
  };

  return (partRec, at) => {
    const source = partRec?.inputs.shape;
    if (partRec === undefined || source?.kind !== 'feature' || partRec.transforms.length > 0) return undefined;
    const atPlacement = Transform.translation(at[0], at[1], at[2]);
    try {
      const record = byId.get(source.id);
      const resolved = record === undefined ? undefined : resolveRecord(record);
      const contentCount = resolved === undefined ? 0 : contentTransformCount(resolved.transforms);
      if (resolved !== undefined && contentCount < resolved.transforms.length) {
        const sourceId = keyOfContent(resolved, contentCount);
        const placement = atPlacement.compose(rigidPlacement(resolved.transforms.slice(contentCount)));
        if (sourceId !== undefined && placement.toMat4().every(Number.isFinite)) return { sourceId, placement };
      }
      return { sourceId: contentKey(source.id), placement: atPlacement };
    } catch {
      // A non-serializable record field: no provenance, the part stays a one-off.
      return undefined;
    }
  };
}
