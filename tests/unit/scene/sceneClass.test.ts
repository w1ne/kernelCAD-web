import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene, type ScenePart } from '../../../src/intent/scene';
import { Transform } from '../../../src/runtime/se3';
import type { Shape } from '../../../src/capture/proxy';
import { KernelError } from '../../../src/intent/kernelError';

const stubShape = { id: 'stub' } as unknown as Shape;

beforeEach(() => {
  // Reset the warn-once flag so each deprecation test observes a fresh
  // emission (mirrors SolvedKinematics deprecation tests, commit ad50090).
  Scene.__resetDeprecationWarnedForTest();
});

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

  it('toShape() delegates to toUnion() and emits warn-once deprecation advisory', () => {
    const unionShape = { id: 'union-result' } as unknown as Shape;
    const exportFn = vi.fn(() => unionShape);
    const scene = new Scene(
      'arm',
      [{ name: 'a', shape: stubShape, worldTransform: Transform.identity() }],
      () => ({ min: [0, 0, 0], max: [0, 0, 0] }),
      exportFn,
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const s1 = scene.toShape();
    const s2 = scene.toShape();
    const s3 = scene.toShape();

    // Delegates to .toUnion() — same result on every call.
    expect(s1).toBe(unionShape);
    expect(s2).toBe(unionShape);
    expect(s3).toBe(unionShape);
    // exportFn invoked once per .toShape() call (each delegates to toUnion).
    expect(exportFn).toHaveBeenCalledTimes(3);
    expect(exportFn).toHaveBeenCalledWith('union');

    // Warn-once: the deprecation advisory must fire exactly once across
    // multiple .toShape() calls (process-scoped flag).
    const deprecationCalls = warnSpy.mock.calls.filter((args) =>
      args.some(
        (a) => typeof a === 'string' && a.includes('deprecated.scene.toShape'),
      ),
    );
    expect(deprecationCalls).toHaveLength(1);
    // The warn message must be user-readable (carries the
    // `Scene.toShape() is deprecated; ` prefix) and direct callers to
    // the supported replacement.
    expect(
      deprecationCalls[0].some(
        (a) => typeof a === 'string' && a.includes('Scene.toShape() is deprecated;'),
      ),
    ).toBe(true);
    expect(
      deprecationCalls[0].some(
        (a) => typeof a === 'string' && a.includes('.toUnion()'),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });

  it('toShape() warn-once survives across Scene instances', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unionShape = { id: 'union-result' } as unknown as Shape;
    const exportFn = () => unionShape;

    for (let i = 0; i < 3; i++) {
      const scene = new Scene(
        `arm${i}`,
        [{ name: 'a', shape: stubShape, worldTransform: Transform.identity() }],
        () => ({ min: [0, 0, 0], max: [0, 0, 0] }),
        exportFn,
      );
      scene.toShape();
    }

    const deprecationCalls = warnSpy.mock.calls.filter((args) =>
      args.some(
        (a) => typeof a === 'string' && a.includes('deprecated.scene.toShape'),
      ),
    );
    expect(deprecationCalls).toHaveLength(1);

    warnSpy.mockRestore();
  });
});
