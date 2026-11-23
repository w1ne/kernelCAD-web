// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Content keys for feature records: two records share a key when they lower
// to the same geometry in the same frame, whatever their ids. A key is the
// record's resolved lowering fields with every input id replaced by that
// input's own key, so two separately captured but identical chains (a helper
// function called twice) share keys record by record.
//
// A record the key cannot see through falls back to `id:<record id>`, which
// only ever keeps records apart: a missing record, a surface input, a
// non-serializable field, or anything the caller marks `opaque` (geometry
// parked outside the record, such as an imported STEP body).

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureRef } from '../../shared/intent/types';
import { structuralHashRecord } from './prefixReuse';

export interface ContentKeyResolver {
  /** Key of the record `id` (all of its transforms included). */
  keyOf(id: string): string;
  /** Key of `resolved` with only its first `transformCount` transforms;
   *  undefined when the record cannot be keyed. */
  keyOfContent(resolved: FeatureRecord, transformCount: number): string | undefined;
  /** `record` with its params read through the run's param table. */
  resolve(record: FeatureRecord): FeatureRecord;
}

export function createContentKeyResolver(
  records: readonly FeatureRecord[],
  resolve: (record: FeatureRecord) => FeatureRecord,
  opaque: (record: FeatureRecord) => boolean = () => false,
): ContentKeyResolver {
  const byId = new Map(records.map((record) => [record.id as string, record]));
  const keyById = new Map<string, string>();
  const keyByContent = new Map<string, string>();

  const keyOfContent = (resolved: FeatureRecord, transformCount: number): string | undefined => {
    const inputs: Record<string, unknown> = {};
    for (const [name, ref] of Object.entries(resolved.inputs) as [string, FeatureRef][]) {
      if (ref.kind === 'feature') inputs[name] = { kind: ref.kind, id: keyOf(ref.id) };
      else if (ref.kind === 'surface') return undefined;
      else inputs[name] = { ...ref, featureId: keyOf(ref.featureId) };
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

  const keyOf = (id: string): string => {
    const known = keyById.get(id);
    if (known !== undefined) return known;
    const record = byId.get(id);
    let key = `id:${id}`;
    if (record !== undefined && !opaque(record)) {
      // Guard a malformed cyclic graph: a revisit reads the id fallback.
      keyById.set(id, key);
      try {
        const resolved = resolve(record);
        key = keyOfContent(resolved, resolved.transforms.length) ?? key;
      } catch {
        // A non-serializable record field: the record stays a one-off.
      }
    }
    keyById.set(id, key);
    return key;
  };

  return { keyOf, keyOfContent, resolve };
}
