import type { FeatureId } from '../../intent/types';

export interface ReorderResult {
  valid: boolean;
  reason?: string;
  blockingFeatureId?: FeatureId;
}

export class DependencyGraph {
  private nodes: FeatureId[] = [];
  private edges: Map<FeatureId, Set<FeatureId>> = new Map();

  addNode(id: FeatureId): void {
    if (this.edges.has(id)) return;
    this.nodes.push(id);
    this.edges.set(id, new Set());
  }

  addEdge(from: FeatureId, to: FeatureId): void {
    if (!this.edges.has(from)) throw new Error(`Unknown source node: ${from}`);
    if (!this.edges.has(to)) throw new Error(`Unknown target node: ${to}`);
    if (from === to) throw new Error(`Self-edge: ${from}`);
    if (this.wouldCycle(from, to)) {
      throw new Error(`Adding edge ${from}->${to} would create a cycle`);
    }
    this.edges.get(from)!.add(to);
  }

  removeNode(id: FeatureId): void {
    this.edges.delete(id);
    for (const set of this.edges.values()) set.delete(id);
    this.nodes = this.nodes.filter(n => n !== id);
  }

  topologicalOrder(): FeatureId[] {
    const indegree = new Map<FeatureId, number>();
    for (const n of this.nodes) indegree.set(n, 0);
    for (const [, targets] of this.edges) {
      for (const t of targets) indegree.set(t, (indegree.get(t) ?? 0) + 1);
    }
    const queue: FeatureId[] = this.nodes.filter(n => (indegree.get(n) ?? 0) === 0);
    const result: FeatureId[] = [];
    while (queue.length) {
      const n = queue.shift()!;
      result.push(n);
      for (const t of this.edges.get(n) ?? []) {
        const d = (indegree.get(t) ?? 0) - 1;
        indegree.set(t, d);
        if (d === 0) queue.push(t);
      }
    }
    if (result.length !== this.nodes.length) {
      throw new Error('Cycle detected during topo sort (graph corrupt)');
    }
    return result;
  }

  canReorder(id: FeatureId, newIndex: number): ReorderResult {
    const currentIndex = this.nodes.indexOf(id);
    if (currentIndex < 0) return { valid: false, reason: `Unknown node: ${id}` };
    if (newIndex < 0 || newIndex >= this.nodes.length) {
      return { valid: false, reason: `Index out of range: ${newIndex}` };
    }
    for (const [from, targets] of this.edges) {
      if (targets.has(id)) {
        const fromIdx = this.nodes.indexOf(from);
        if (fromIdx >= newIndex) {
          return {
            valid: false,
            reason: `Dependency '${from}' would be after this node`,
            blockingFeatureId: from,
          };
        }
      }
    }
    for (const t of this.edges.get(id) ?? []) {
      const tIdx = this.nodes.indexOf(t);
      if (tIdx <= newIndex) {
        return {
          valid: false,
          reason: `Dependent '${t}' would be before this node`,
          blockingFeatureId: t,
        };
      }
    }
    return { valid: true };
  }

  private wouldCycle(from: FeatureId, to: FeatureId): boolean {
    const visited = new Set<FeatureId>();
    const stack: FeatureId[] = [to];
    while (stack.length) {
      const n = stack.pop()!;
      if (n === from) return true;
      if (visited.has(n)) continue;
      visited.add(n);
      for (const t of this.edges.get(n) ?? []) stack.push(t);
    }
    return false;
  }
}
