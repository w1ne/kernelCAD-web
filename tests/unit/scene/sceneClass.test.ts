import { describe, it, expect } from 'vitest';
import { Scene, type ScenePart } from '../../../src/authoring/validation/scene';
import { Transform } from '../../../src/shared/runtime/se3';
import type { Shape } from '../../../src/capture/proxy';
import { KernelError } from '../../../src/shared/intent/kernelError';

const stubShape = { id: 'stub' } as unknown as Shape;

describe('Scene', () => {
  it('exposes parts, assemblyName, bbox, and is iterable', () => {
    const parts: ScenePart[] = [
      { name: 'a', shape: stubShape, worldTransform: Transform.identity() },
      { name: 'b', shape: stubShape, worldTransform: Transform.translation(10, 0, 0), color: 'plate' },
    ];
    const scene = new Scene('arm', parts, () => ({ min: [0, 0, 0], max: [10, 0, 0] }));
    expect(scene.assemblyName).toBe('arm');
    expect(scene.parts).toHaveLength(2);
    expect(scene.parts[1].color).toBe('plate');
    expect([...scene]).toEqual(parts);
    expect(scene.bbox).toEqual({ min: [0, 0, 0], max: [10, 0, 0] });
  });

  it('part(name) returns the entry', () => {
    const parts: ScenePart[] = [
      { name: 'base', shape: stubShape, worldTransform: Transform.identity() },
    ];
    const scene = new Scene('arm', parts, () => ({ min: [0, 0, 0], max: [0, 0, 0] }));
    expect(scene.part('base').name).toBe('base');
  });

  it('part(name) throws KernelError on unknown name with structured hint', () => {
    const scene = new Scene('arm', [], () => ({ min: [0, 0, 0], max: [0, 0, 0] }));
    let captured: unknown;
    try {
      scene.part('missing');
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeInstanceOf(KernelError);
    const err = captured as KernelError;
    expect(err.code).toBe('feature.invalid-args');
    expect(err.hint).toContain('invalid-args.scene.unknown-part');
    expect(err.message).toContain("part 'missing' not declared on assembly 'arm'");
    expect(err.message).not.toContain('invalid-args.scene.unknown-part');
  });

  it('parts is frozen (immutable)', () => {
    const parts: ScenePart[] = [
      { name: 'a', shape: stubShape, worldTransform: Transform.identity() },
    ];
    const scene = new Scene('arm', parts, () => ({ min: [0, 0, 0], max: [0, 0, 0] }));
    expect(Object.isFrozen(scene.parts)).toBe(true);
  });

  it('bbox is lazy — bboxFn called once even on multiple .bbox accesses', () => {
    let calls = 0;
    const scene = new Scene('arm', [], () => {
      calls++;
      return { min: [0, 0, 0], max: [0, 0, 0] };
    });
    void scene.bbox;
    void scene.bbox;
    void scene.bbox;
    expect(calls).toBe(1);
  });

});
