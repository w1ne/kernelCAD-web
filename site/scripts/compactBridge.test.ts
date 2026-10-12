import { describe, it, expect } from 'vitest';
import { compactBridgeFeature, encodeBridgePayload } from './compactBridge';
import { serializeForBridge, rehydrateFromBridge } from '../../src/modeling/capture/featureMeshSerialize';
import type { FeatureMesh } from '../../src/modeling/capture/featureMeshing';

const bits = (a: Float32Array) => Array.from(new Uint32Array(a.buffer, a.byteOffset, a.length));
describe('build-only bridge compaction', () => {
  it('preserves encoded and rehydrated Float32 bits and double metadata without mutation', () => {
    const values = new Float32Array([0, 1e-40, -1e-30, 1e30, -123.456789, Math.PI]);
    const mesh: FeatureMesh = { featureId: 'f', featureKind: 'box', predecessors: [], volume: Math.PI,
      transform: [Math.PI], material: { roughness: Math.PI }, edges: values,
      faces: [{ faceId: 0, vertices: values, normals: values, uv: values, indices: new Uint32Array([0, 1, 0]),
        plane: { origin: [Math.PI, 0, 0], normal: [0, 0, 1] } }] };
    const original = serializeForBridge(mesh);
    const snapshot = JSON.stringify(original);
    const compact = compactBridgeFeature(original);
    const restored = rehydrateFromBridge(JSON.parse(JSON.stringify(compact)));
    for (const a of [restored.faces[0].vertices, restored.faces[0].normals, restored.faces[0].uv!, restored.edges!]) expect(bits(a)).toEqual(bits(values));
    expect(compact.volume).toBe(Math.PI);
    expect(compact.transform).toEqual([Math.PI]);
    expect(compact.material).toEqual(mesh.material);
    expect(compact.faces[0].plane).toEqual(mesh.faces[0].plane);
    expect(compact.faces[0].indices).toEqual(original.faces[0].indices);
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(JSON.stringify(compact).length).toBeLessThan(snapshot.length);
  });
  it.each([NaN, Infinity, -Infinity])('rejects non-JSON-exact buffer value %s', value => {
    expect(() => compactBridgeFeature({featureId:'f',featureKind:'box',predecessors:[],faces:[],edges:[value]})).toThrow(/finite|zero/);
  });
  it('normalizes signed zero at the existing JSON boundary explicitly', () => {
    const original={featureId:'f',featureKind:'box',predecessors:[],faces:[],edges:[-0,0]};
    const compact=JSON.parse(JSON.stringify(compactBridgeFeature(original)));
    const baseline=JSON.parse(JSON.stringify(original));
    expect(bits(new Float32Array(compact.edges))).toEqual(bits(new Float32Array(baseline.edges)));
    expect(Object.is(compact.edges[0],-0)).toBe(false);
  });
  it('checks complete UTF-8 payload before any file write', () => {
    expect(() => encodeBridgePayload({ source: 'é'.repeat(20), features: [] }, 32)).toThrow(/bridge.*bytes/);
    expect(encodeBridgePayload({ source: 'x', review: {ok:false}, features:[] }, 100)).toContain('"ok":false');
  });
});
