// tests/unit/kernel/backends/occt/sceneToWorldFrame.test.ts
//
// Unit coverage for the shared world-frame walk that STEP/3MF/GLB exporters
// consume. The helper must:
//   1. Clone every part shape BEFORE applying its worldTransform — replicad's
//      translate/rotate mutate-and-destroy the source handle (commit 1d597dd).
//   2. Thread color and material through unchanged so per-format writers
//      decide whether to resolve role tokens to hex.
//   3. Reject an empty scene loudly — every existing exporter treated empty
//      input as an error and we preserve that contract.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../../src/kernel/backends/occt/occtBackend';
import { sceneToWorldFrameParts } from '../../../../../src/kernel/backends/occt/sceneToWorldFrame';
import { Transform } from '../../../../../src/shared/runtime/se3';
import type { SceneBackend } from '../../../../../src/kernel/backends/sceneBackend';

describe('sceneToWorldFrameParts', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits one entry per scene part with cloned, transformed shape', () => {
    const a = OcctBackend.box(10, 10, 10);
    const b = OcctBackend.box(5, 5, 5);
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        { name: 'left',  shape: a, worldTransform: Transform.identity(), color: 'plate' },
        { name: 'right', shape: b, worldTransform: Transform.translation(20, 0, 0) },
      ],
    };
    const parts = sceneToWorldFrameParts(scene);
    expect(parts).toHaveLength(2);
    expect(parts[0].name).toBe('left');
    expect(parts[1].name).toBe('right');
    // World-frame shape is a fresh OcctBackend (not the source) so the
    // mutate-on-transform footgun is gone.
    expect(parts[0].shape).not.toBe(a);
    expect(parts[1].shape).not.toBe(b);
    // bbox of the transformed right-part starts at x=20.
    const bb = parts[1].shape.boundingBox();
    expect(bb.min[0]).toBeCloseTo(20, 3);
  });

  it('threads color and material through unchanged', () => {
    const a = OcctBackend.box(10, 10, 10);
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [{
        name: 'glass',
        shape: a,
        worldTransform: Transform.identity(),
        color: 'glass',
        material: { baseColor: '#88ccff', transmission: 0.9, ior: 1.5 },
      }],
    };
    const parts = sceneToWorldFrameParts(scene);
    expect(parts[0].color).toBe('glass');
    expect(parts[0].material?.transmission).toBe(0.9);
    expect(parts[0].material?.baseColor).toBe('#88ccff');
    expect(parts[0].material?.ior).toBe(1.5);
  });

  it('omits color and material when the source part has neither', () => {
    const a = OcctBackend.box(4, 4, 4);
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [{ name: 'bare', shape: a, worldTransform: Transform.identity() }],
    };
    const parts = sceneToWorldFrameParts(scene);
    expect(parts[0].color).toBeUndefined();
    expect(parts[0].material).toBeUndefined();
  });

  it('throws on an empty scene', () => {
    const scene: SceneBackend = {
      target: 'export-occt', assemblyName: 'empty', _kind: 'scene', parts: [],
    };
    expect(() => sceneToWorldFrameParts(scene)).toThrow(/no parts/i);
  });
});
