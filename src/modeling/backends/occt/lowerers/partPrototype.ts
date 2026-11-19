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

import type { SceneBackendPart } from '../../../../kernel/backends/sceneBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { FeatureRef } from '../../../../shared/intent/types';
import { structuralHashRecord } from '../../../compute/prefixReuse';
import type { LowerContext } from './context';

export type PartPrototypeResolver = (
  partRec: FeatureRecord | undefined,
  at: readonly [number, number, number],
) => SceneBackendPart['prototype'];

/** Build a resolver that shares content keys across one scene's parts. */
export function createPartPrototypeResolver(
  ctx: LowerContext,
  records: readonly FeatureRecord[],
): PartPrototypeResolver {
  const byId = new Map(records.map((record) => [record.id as string, record]));
  const keyById = new Map<string, string>();
  const keyByContent = new Map<string, string>();

  const contentKey = (id: string): string => {
    const known = keyById.get(id);
    if (known !== undefined) return known;
    const record = byId.get(id);
    let key = `id:${id}`;
    if (record !== undefined) {
      // Guard a malformed cyclic graph: a revisit reads the id fallback.
      keyById.set(id, key);
      const inputs: Record<string, unknown> = {};
      let opaque = false;
      for (const [name, ref] of Object.entries(record.inputs) as [string, FeatureRef][]) {
        if (ref.kind === 'feature') inputs[name] = { kind: ref.kind, id: contentKey(ref.id) };
        else if (ref.kind === 'surface') opaque = true;
        else inputs[name] = { ...ref, featureId: contentKey(ref.featureId) };
      }
      if (!opaque) {
        const resolved = ctx.inputs.resolveRecord ? ctx.inputs.resolveRecord(record) : record;
        const table = ctx.inputs.resolveRecord === undefined ? ctx.inputs.paramTable : undefined;
        const content = structuralHashRecord({ ...resolved, inputs: inputs as FeatureRecord['inputs'] }, table);
        key = keyByContent.get(content) ?? `content:${keyByContent.size}`;
        keyByContent.set(content, key);
      }
    }
    keyById.set(id, key);
    return key;
  };

  return (partRec, at) => {
    const source = partRec?.inputs.shape;
    if (partRec === undefined || source?.kind !== 'feature' || partRec.transforms.length > 0) return undefined;
    try {
      return { sourceId: contentKey(source.id), offset: [at[0], at[1], at[2]] };
    } catch {
      // A non-serializable record field: no provenance, the part stays a one-off.
      return undefined;
    }
  };
}
