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

function requirementSemantics(node: { inputs: FeatureId[]; predicate?: unknown } | undefined): unknown {
  if (node === undefined) return undefined;
  return { inputs: node.inputs, predicate: node.predicate };
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

function projectParamOps(
  base: FeatureGraph,
  edited: FeatureGraph,
  changed: ReadonlySet<string>,
  writeSet: Set<FeatureId>,
): ChangeOp[] {
  const ops: ChangeOp[] = [];
  for (const name of [...changed].sort()) {
    ops.push({ op: 'setParam', target: '$project', name, from: base.params[name], to: edited.params[name] });
    writeSet.add('$project');
  }
  return ops;
}

function deleteOps(base: FeatureGraph, edited: FeatureGraph, writeSet: Set<FeatureId>): ChangeOp[] {
  const ops: ChangeOp[] = [];
  for (const id of base.order) {
    if (edited.features.has(id)) continue;
    ops.push({ op: 'deleteFeature', id });
    writeSet.add(id);
  }
  return ops;
}

function insertOps(base: FeatureGraph, edited: FeatureGraph, writeSet: Set<FeatureId>): ChangeOp[] {
  const ops: ChangeOp[] = [];
  for (const id of edited.order) {
    if (base.features.has(id)) continue;
    const index = edited.order.indexOf(id);
    const after = index > 0 ? edited.order[index - 1]! : null;
    ops.push({ op: 'insertFeature', id, after, node: edited.features.get(id)! });
    writeSet.add(id);
    if (after !== null) writeSet.add(after);
  }
  return ops;
}

function paramOpsForNode(
  id: FeatureId,
  before: FeatureNode,
  after: FeatureNode,
  changedProjectParams: ReadonlySet<string>,
  writeSet: Set<FeatureId>,
): ChangeOp[] {
  const ops: ChangeOp[] = [];
  const keys = new Set([...Object.keys(before.params), ...Object.keys(after.params)]);
  for (const key of [...keys].sort()) {
    if (equal(before.params[key], after.params[key])) continue;
    const symbolic = [...nodeParamRefNames(before, key), ...nodeParamRefNames(after, key)];
    if (symbolic.some((name) => changedProjectParams.has(name))) continue;
    ops.push({ op: 'setParam', target: id, name: key, from: before.params[key], to: after.params[key] });
    writeSet.add(id);
  }
  return ops;
}

function refOpsForNode(id: FeatureId, before: FeatureNode, after: FeatureNode, writeSet: Set<FeatureId>): ChangeOp[] {
  const ops: ChangeOp[] = [];
  const slots = new Set([...Object.keys(before.refs), ...Object.keys(after.refs)]);
  for (const slot of [...slots].sort()) {
    if (sameIds(before.refs[slot], after.refs[slot])) continue;
    ops.push({ op: 'setRef', id, slot, from: before.refs[slot] ?? [], to: after.refs[slot] ?? [] });
    writeSet.add(id);
    for (const ref of [...(before.refs[slot] ?? []), ...(after.refs[slot] ?? [])]) writeSet.add(ref);
  }
  return ops;
}

function nodeOps(
  base: FeatureGraph,
  edited: FeatureGraph,
  changedProjectParams: ReadonlySet<string>,
  writeSet: Set<FeatureId>,
): ChangeOp[] {
  const ops: ChangeOp[] = [];
  for (const id of edited.order) {
    const before = base.features.get(id);
    const after = edited.features.get(id);
    if (before === undefined || after === undefined) continue;
    ops.push(...paramOpsForNode(id, before, after, changedProjectParams, writeSet));
    ops.push(...refOpsForNode(id, before, after, writeSet));
  }
  return ops;
}

function moveOps(base: FeatureGraph, edited: FeatureGraph, writeSet: Set<FeatureId>): ChangeOp[] {
  const ops: ChangeOp[] = [];
  const common = base.order.filter((id) => edited.features.has(id));
  const kept = lcsIds(common, edited.order.filter((id) => base.features.has(id)));
  for (const id of edited.order) {
    if (!base.features.has(id) || kept.has(id)) continue;
    const index = edited.order.indexOf(id);
    const after = index > 0 ? edited.order[index - 1]! : null;
    ops.push({ op: 'moveFeature', id, after });
    writeSet.add(id);
  }
  return ops;
}

function requirementOps(base: FeatureGraph, edited: FeatureGraph, writeSet: Set<FeatureId>): ChangeOp[] {
  const ops: ChangeOp[] = [];
  const names = new Set([...Object.keys(base.requirements), ...Object.keys(edited.requirements)]);
  for (const name of [...names].sort()) {
    const before = base.requirements[name];
    const after = edited.requirements[name];
    if (equal(requirementSemantics(before), requirementSemantics(after))) continue;
    ops.push({ op: 'editRequirement', name, from: before, to: after });
    writeSet.add(`requirement:${name}`);
  }
  return ops;
}

function unownedOps(base: FeatureGraph, edited: FeatureGraph, writeSet: Set<FeatureId>): ChangeOp[] {
  const ops: ChangeOp[] = [];
  for (const index of unownedChanged(base.unowned, edited.unowned)) {
    const span = edited.unowned[index] ?? base.unowned[index];
    if (span === undefined) continue;
    ops.push({ op: 'editUnowned', span: { start: span.start, end: span.end } });
    writeSet.add('$unowned');
  }
  return ops;
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
  const writeSet = new Set<FeatureId>();
  const changedProjectParams = projectParamNamesChanged(base, edited);
  const ops: ChangeOp[] = [
    ...projectParamOps(base, edited, changedProjectParams, writeSet),
    ...deleteOps(base, edited, writeSet),
    ...insertOps(base, edited, writeSet),
    ...nodeOps(base, edited, changedProjectParams, writeSet),
    ...moveOps(base, edited, writeSet),
    ...requirementOps(base, edited, writeSet),
    ...unownedOps(base, edited, writeSet),
  ];
  return {
    baseRevision: meta.baseRevision,
    agentId: meta.agentId,
    idempotencyKey: meta.idempotencyKey,
    ops,
    writeSet: [...writeSet].sort(),
  };
}
