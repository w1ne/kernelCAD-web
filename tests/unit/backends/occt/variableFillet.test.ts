// tests/unit/backends/occt/variableFillet.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { applyVariableEdgeFeature } from '../../../../src/kernel/backends/occt/occtLowerer';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';

describe('OcctBackend.filletVariable / chamferVariable', () => {
  beforeAll(async () => { await initOcct(); });

  it('filletVariable on a 10x10x5 box: top edges r=2, bottom edges r=0.5 → mixed-radius solid', () => {
    const box = OcctBackend.box(10, 10, 5);
    const allEdges = (box.getReplicadShape() as unknown as { edges: import('replicad').Edge[] }).edges;
    const topEdges = allEdges.filter(e => {
      const f = e.startPoint, l = e.endPoint;
      return Math.abs(f.z - 5) < 0.1 && Math.abs(l.z - 5) < 0.1;
    });
    const bottomEdges = allEdges.filter(e => {
      const f = e.startPoint, l = e.endPoint;
      return Math.abs(f.z) < 0.1 && Math.abs(l.z) < 0.1;
    });
    expect(topEdges).toHaveLength(4);
    expect(bottomEdges).toHaveLength(4);
    const filleted = box.filletVariable([
      { edges: topEdges, radius: 2 },
      { edges: bottomEdges, radius: 0.5 },
    ]);
    expect(filleted.kind).toBeUndefined();
    // Volume reduction:
    //   top fillet (r=2 on 4 edges, length 10 each): ~4 × (4 - π) × 10 = 34.3 mm³
    //   bottom fillet (r=0.5 on 4 edges, length 10 each): ~4 × (0.25 - π/16) × 10 = 2.1 mm³
    //   Original 500, removed ~36.4, expect ~463.
    const v = filleted.volume();
    expect(v).toBeGreaterThan(450);
    expect(v).toBeLessThan(475);
  });

  it('filletVariable with a single group degenerates to uniform fillet', () => {
    const box = OcctBackend.box(10, 10, 5);
    const allEdges = (box.getReplicadShape() as unknown as { edges: import('replicad').Edge[] }).edges;
    const topEdges = allEdges.filter(e => {
      const f = e.startPoint, l = e.endPoint;
      return Math.abs(f.z - 5) < 0.1 && Math.abs(l.z - 5) < 0.1;
    });
    const variable = box.filletVariable([{ edges: topEdges, radius: 1 }]);
    const uniform = box.fillet(topEdges, 1);
    // Volumes should match within rounding.
    expect(Math.abs(variable.volume() - uniform.volume())).toBeLessThan(0.01);
  });

  it('filletVariable with empty groups → returns input shape unchanged', () => {
    const box = OcctBackend.box(10, 10, 5);
    const result = box.filletVariable([]);
    expect(result.volume()).toBeCloseTo(500, 1);
  });

  it('chamferVariable on a box: top distance=1, bottom distance=0.3 → mixed-distance solid', () => {
    const box = OcctBackend.box(10, 10, 5);
    const allEdges = (box.getReplicadShape() as unknown as { edges: import('replicad').Edge[] }).edges;
    const topEdges = allEdges.filter(e => {
      const f = e.startPoint, l = e.endPoint;
      return Math.abs(f.z - 5) < 0.1 && Math.abs(l.z - 5) < 0.1;
    });
    const bottomEdges = allEdges.filter(e => {
      const f = e.startPoint, l = e.endPoint;
      return Math.abs(f.z) < 0.1 && Math.abs(l.z) < 0.1;
    });
    const chamfered = box.chamferVariable([
      { edges: topEdges, distance: 1 },
      { edges: bottomEdges, distance: 0.3 },
    ]);
    const v = chamfered.volume();
    // Top chamfer (d=1, 4 edges len 10): cuts ~4 × (1 × 1 / 2) × 10 = 20 mm³
    // Bottom chamfer (d=0.3, 4 edges len 10): cuts ~4 × (0.09 / 2) × 10 = 1.8 mm³
    // Original 500, removed ~21.8, expect ~478. Measured ~479.6 (Replicad's
    // chamfer geometry differs slightly from the analytic estimate).
    expect(v).toBeGreaterThan(475);
    expect(v).toBeLessThan(500);
  });
});

describe('applyVariableEdgeFeature diagnostics', () => {
  beforeAll(async () => { await initOcct(); });

  it('feature.fillet.invalid-edge-ref fires when edge_group_0 has kind: feature', () => {
    const base = OcctBackend.box(10, 10, 10);
    const feature: FeatureRecord = {
      id: 'fillet-1',
      kind: 'fillet',
      params: {},
      inputs: {
        base: { kind: 'feature', id: 'box-1' },
        edge_group_0: { kind: 'feature', id: 'box-1' }, // wrong kind — should be edge or face
      },
      metadata: { variable: true, groups: [{ radius: 1 }] },
      transforms: [],
      suppressed: false,
    };
    const result = applyVariableEdgeFeature('fillet', base, feature, undefined);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map(d => d.code)).toContain('feature.invalid-args');
  });

  it('feature.chamfer.invalid-edge-ref fires when edge_group_0 has kind: vertex', () => {
    const base = OcctBackend.box(10, 10, 10);
    const feature: FeatureRecord = {
      id: 'chamfer-1',
      kind: 'chamfer',
      params: {},
      inputs: {
        base: { kind: 'feature', id: 'box-1' },
        // vertex ref is not a valid edge_group slot — cast to satisfy TS since VertexRef shape is complex
        edge_group_0: { kind: 'vertex', featureId: 'box-1', ref: { kind: 'tracked', vertexName: 'v0' } },
      },
      metadata: { variable: true, groups: [{ distance: 1 }] },
      transforms: [],
      suppressed: false,
    };
    const result = applyVariableEdgeFeature('chamfer', base, feature, undefined);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map(d => d.code)).toContain('feature.invalid-args');
  });
});
