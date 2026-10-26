// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 4: static read/write footprints. These never reject a change-set; they
// tell the queue which candidates may be evaluated in parallel and which must
// stack. A feature is downstream when it consumes a write through refs, or
// comes later in the same part body (feature order is not commutative).
// Assembly records are included as immediate placements but the closure stops
// at them, so two disjoint parts do not look dependent through the assembly.

import type { ChangeSet, FeatureGraph, FeatureId, FeatureNode, Footprint } from './types';

const ASSEMBLY_KINDS = new Set([
  'assemblyPart',
  'assemblyModel',
  'assemblyConnect',
  'assemblyJoint',
  'solvedAssembly',
  'assemblyExport',
]);

function isAssembly(kind: string | undefined): boolean {
  return kind !== undefined && ASSEMBLY_KINDS.has(kind);
}

/** First local (non-assembly) input slot, in the order the capture uses. */
function primaryRef(node: FeatureNode): FeatureId | undefined {
  for (const slot of ['base', 'shape', 'scene', 'a', 'b'] as const) {
    const ref = node.refs[slot]?.[0];
    if (ref !== undefined) return ref;
  }
  for (const refs of Object.values(node.refs)) {
    if (refs[0] !== undefined) return refs[0];
  }
  return undefined;
}

function localRoot(graph: FeatureGraph, id: FeatureId): FeatureId {
  const seen = new Set<FeatureId>();
  let current = id;
  for (;;) {
    if (seen.has(current)) return current;
    seen.add(current);
    const node = graph.features.get(current);
    if (node === undefined || isAssembly(node.kind)) return current;
    const parent = primaryRef(node);
    if (parent === undefined || !graph.features.has(parent)) return current;
    const parentNode = graph.features.get(parent);
    if (parentNode === undefined || isAssembly(parentNode.kind)) return current;
    current = parent;
  }
}

function reverseRefs(graph: FeatureGraph): Map<FeatureId, Set<FeatureId>> {
  const reverse = new Map<FeatureId, Set<FeatureId>>();
  for (const id of graph.order) {
    const node = graph.features.get(id);
    if (node === undefined) continue;
    for (const refs of Object.values(node.refs)) {
      for (const ref of refs) {
        if (!graph.features.has(ref)) continue;
        const list = reverse.get(ref) ?? new Set<FeatureId>();
        list.add(id);
        reverse.set(ref, list);
      }
    }
  }
  return reverse;
}

function projectParamNames(changeSet: ChangeSet): Set<string> {
  const names = new Set<string>();
  for (const op of changeSet.ops) {
    if (op.op === 'setParam' && op.target === '$project') names.add(op.name);
  }
  return names;
}

/** Features whose named params read one of the changed project params. */
function projectParamConsumers(graph: FeatureGraph, names: ReadonlySet<string>): FeatureId[] {
  const out: FeatureId[] = [];
  for (const id of graph.order) {
    const refs = graph.features.get(id)?.paramRefs;
    if (refs === undefined) continue;
    if (Object.values(refs).some((list) => list.some((name) => names.has(name)))) out.push(id);
  }
  return out;
}

function seedFeaturesFor(writes: ReadonlySet<FeatureId>, head: FeatureGraph): Set<FeatureId> {
  const seeds = new Set<FeatureId>();
  for (const id of writes) {
    if (id === '$project' || id === '$unowned' || id.startsWith('requirement:')) continue;
    if (head.features.has(id)) seeds.add(id);
  }
  return seeds;
}

function collectReads(seeds: ReadonlySet<FeatureId>, writes: ReadonlySet<FeatureId>, head: FeatureGraph): Set<FeatureId> {
  const reads = new Set<FeatureId>();
  for (const id of seeds) {
    const node = head.features.get(id);
    if (node === undefined) continue;
    for (const refs of Object.values(node.refs)) {
      for (const ref of refs) if (!writes.has(ref)) reads.add(ref);
    }
  }
  return reads;
}

function bodyHelpers(head: FeatureGraph): {
  sameBodyLater: (id: FeatureId) => FeatureId[];
} {
  const roots = new Map<FeatureId, FeatureId>();
  const rootOf = (id: FeatureId): FeatureId => {
    let root = roots.get(id);
    if (root === undefined) {
      root = localRoot(head, id);
      roots.set(id, root);
    }
    return root;
  };

  return {
    sameBodyLater: (id) => {
      const node = head.features.get(id);
      if (node === undefined || isAssembly(node.kind)) return [];
      const root = rootOf(id);
      return head.order.filter((candidate) => {
        const candidateNode = head.features.get(candidate);
        if (candidateNode === undefined || isAssembly(candidateNode.kind)) return false;
        return candidateNode.orderKey > node.orderKey && rootOf(candidate) === root;
      });
    },
  };
}

function expandDownstream(
  head: FeatureGraph,
  starts: readonly FeatureId[],
  writes: ReadonlySet<FeatureId>,
  reverse: ReadonlyMap<FeatureId, Set<FeatureId>>,
): Set<FeatureId> {
  const downstream = new Set<FeatureId>();
  const { sameBodyLater } = bodyHelpers(head);

  for (const id of starts) {
    const queue: FeatureId[] = [id];
    const visited = new Set<FeatureId>([id]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of reverse.get(current) ?? []) {
        if (writes.has(child) || downstream.has(child)) continue;
        downstream.add(child);
        const childNode = head.features.get(child);
        if (isAssembly(childNode?.kind)) continue;
        if (!visited.has(child)) {
          visited.add(child);
          queue.push(child);
        }
      }
      for (const later of sameBodyLater(current)) {
        if (writes.has(later) || downstream.has(later)) continue;
        downstream.add(later);
        if (!visited.has(later)) {
          visited.add(later);
          queue.push(later);
        }
      }
    }
  }
  return downstream;
}

function requirementsFor(
  head: FeatureGraph,
  writes: ReadonlySet<FeatureId>,
  downstream: ReadonlySet<FeatureId>,
): Set<string> {
  const closure = new Set<FeatureId>([...writes, ...downstream]);
  const requirements = new Set<string>();
  for (const [name, requirement] of Object.entries(head.requirements)) {
    if (requirement.inputs.some((id) => closure.has(id))) requirements.add(name);
  }
  return requirements;
}

/**
 * Write set, static reads, downstream closure and the requirements whose inputs
 * fall in that closure.
 */
export function footprint(changeSet: ChangeSet, head: FeatureGraph): Footprint {
  const writes = new Set<FeatureId>(changeSet.writeSet);
  const seeds = seedFeaturesFor(writes, head);
  const projectConsumers = projectParamConsumers(head, projectParamNames(changeSet));
  const reads = collectReads(seeds, writes, head);
  const downstream = expandDownstream(head, [...seeds, ...projectConsumers], writes, reverseRefs(head));
  for (const id of projectConsumers) if (!writes.has(id)) downstream.add(id);
  return { writes, reads, downstream, requirements: requirementsFor(head, writes, downstream) };
}

/** Two change-sets may be evaluated in parallel when neither writes or reaches
 *  the other's features and they share no requirement. */
export function independent(a: Footprint, b: Footprint): boolean {
  const aClosure = new Set<FeatureId>([...a.writes, ...a.downstream]);
  const bClosure = new Set<FeatureId>([...b.writes, ...b.downstream]);
  for (const id of aClosure) if (bClosure.has(id)) return false;
  for (const name of a.requirements) if (b.requirements.has(name)) return false;
  return true;
}
