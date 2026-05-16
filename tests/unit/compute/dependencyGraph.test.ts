import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../../src/modeling/compute/dependencyGraph';

describe('DependencyGraph', () => {
  it('topological sort respects dependencies', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    g.addEdge('a', 'b'); // b depends on a
    g.addEdge('b', 'c');
    expect(g.topologicalOrder()).toEqual(['a', 'b', 'c']);
  });

  it('canReorder rejects moving a node before its dependency', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addEdge('a', 'b');
    const result = g.canReorder('b', 0);
    expect(result.valid).toBe(false);
    expect(result.blockingFeatureId).toBe('a');
  });

  it('canReorder accepts safe moves', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    expect(g.canReorder('c', 0).valid).toBe(true);
  });

  it('detects cycles', () => {
    const g = new DependencyGraph();
    g.addNode('a');
    g.addNode('b');
    g.addEdge('a', 'b');
    expect(() => g.addEdge('b', 'a')).toThrow(/cycle/i);
  });
});
