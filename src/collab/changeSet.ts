// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 2: lift the difference between two captured feature graphs into typed,
// feature-id-keyed operations. Pure: no source rewriting and no evaluation.

import { stableStringify } from '../modeling/compute/prefixReuse';
import type { ChangeOp, ChangeSet, FeatureGraph, FeatureId, FeatureNode, UnownedSpan } from './types';

export type ChangeSetMeta = Pick<ChangeSet, 'baseRevision' | 'agentId' | 'idempotencyKey'>;

function equal(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function sameIds(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((id, i) => id === right[i]);
}

/** Ids retained by a longest common subsequence of the two orders. */
function lcsIds(base: readonly FeatureId[], edited: readonly FeatureId[]): Set<FeatureId> {
  const n = base.length;
  const m = edited.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i]![j] = base[i] === edited[j]
        ? table[i + 1]![j + 1]! + 1
        : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const keep = new Set<FeatureId>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (base[i] === edited[j]) {
      keep.add(base[i]!);
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return keep;
}

function projectParamNamesChanged(base: FeatureGraph, edited: FeatureGraph): Set<string> {
  const names = new Set([...Object.keys(base.params), ...Object.keys(edited.params)]);
  const changed = new Set<string>();
  for (const name of names) {
    if (!equal(base.params[name], edited.params[name])) changed.add(name);
  }
  return changed;
}

function nodeParamRefNames(node: FeatureNode | undefined, key: string): string[] {
  return node?.paramRefs?.[key] ?? [];
}

function unownedChanged(
  base: readonly UnownedSpan[],
  edited: readonly UnownedSpan[],
): number[] {
  const indexes: number[] = [];
  const length = Math.max(base.length, edited.length);
  for (let i = 0; i < length; i += 1) {
    const before = base[i];
    const after = edited[i];
    if (before?.text === after?.text) continue;
    indexes.push(i);
  }
  return indexes;
}

/**
 * Diff two captures of the same model. `base` is the revision the agent read;
 * `edited` is the source the agent produced. The result is keyed by feature id;
 * order is never treated as commutative.
 */
export function liftChangeSet(
  base: FeatureGraph,
  edited: FeatureGraph,
  meta: ChangeSetMeta,
): ChangeSet {
  const ops: ChangeOp[] = [];
  const writeSet = new Set<FeatureId>();

  const changedProjectParams = projectParamNamesChanged(base, edited);
  for (const name of [...changedProjectParams].sort()) {
    ops.push({
      op: 'setParam',
      target: '$project',
      name,
      from: base.params[name],
      to: edited.params[name],
    });
    writeSet.add('$project');
  }

  for (const id of base.order) {
    if (edited.features.has(id)) continue;
    ops.push({ op: 'deleteFeature', id });
    writeSet.add(id);
  }

  for (const id of edited.order) {
    if (base.features.has(id)) continue;
    const index = edited.order.indexOf(id);
    const after = index > 0 ? edited.order[index - 1]! : null;
    ops.push({ op: 'insertFeature', id, after, node: edited.features.get(id)! });
    writeSet.add(id);
    if (after !== null) writeSet.add(after);
  }

  for (const id of edited.order) {
    const before = base.features.get(id);
    const after = edited.features.get(id);
    if (before === undefined || after === undefined) continue;

    const paramKeys = new Set([...Object.keys(before.params), ...Object.keys(after.params)]);
    for (const key of [...paramKeys].sort()) {
      if (equal(before.params[key], after.params[key])) continue;
      const symbolic = [
        ...nodeParamRefNames(before, key),
        ...nodeParamRefNames(after, key),
      ];
      // A changed project param is already one `$project` op. Do not also
      // report the feature's symbolic cell as its own edit.
      if (symbolic.some((name) => changedProjectParams.has(name))) continue;
      ops.push({
        op: 'setParam',
        target: id,
        name: key,
        from: before.params[key],
        to: after.params[key],
      });
      writeSet.add(id);
    }

    const refSlots = new Set([...Object.keys(before.refs), ...Object.keys(after.refs)]);
    for (const slot of [...refSlots].sort()) {
      if (sameIds(before.refs[slot], after.refs[slot])) continue;
      ops.push({
        op: 'setRef',
        id,
        slot,
        from: before.refs[slot] ?? [],
        to: after.refs[slot] ?? [],
      });
      writeSet.add(id);
      for (const ref of [...(before.refs[slot] ?? []), ...(after.refs[slot] ?? [])]) writeSet.add(ref);
    }
  }

  const common = base.order.filter((id) => edited.features.has(id));
  const kept = lcsIds(common, edited.order.filter((id) => base.features.has(id)));
  for (const id of edited.order) {
    if (!base.features.has(id) || kept.has(id)) continue;
    const index = edited.order.indexOf(id);
    const after = index > 0 ? edited.order[index - 1]! : null;
    ops.push({ op: 'moveFeature', id, after });
    writeSet.add(id);
  }

  const requirementNames = new Set([
    ...Object.keys(base.requirements),
    ...Object.keys(edited.requirements),
  ]);
  for (const name of [...requirementNames].sort()) {
    if (equal(base.requirements[name], edited.requirements[name])) continue;
    ops.push({
      op: 'editRequirement',
      name,
      from: base.requirements[name],
      to: edited.requirements[name],
    });
    writeSet.add(`requirement:${name}`);
  }

  for (const index of unownedChanged(base.unowned, edited.unowned)) {
    const span = edited.unowned[index] ?? base.unowned[index];
    if (span === undefined) continue;
    ops.push({ op: 'editUnowned', span: { start: span.start, end: span.end } });
    writeSet.add('$unowned');
  }

  return {
    baseRevision: meta.baseRevision,
    agentId: meta.agentId,
    idempotencyKey: meta.idempotencyKey,
    ops,
    writeSet: [...writeSet].sort(),
  };
}
