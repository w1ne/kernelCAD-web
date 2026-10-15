// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../../kernel/backends/sceneBackend';
import { Transform } from '../../../shared/runtime/se3';
import { captureStepState, createStepEvidence } from './stepEvidence';
import { summarizeScene } from '../../script-runtime/sceneSummary';
import type { ShapeBackend } from '../../../kernel/backends/backend';

beforeAll(async () => { await initOcct(); });
it('captures transformed separated bodies repeatedly without consuming the scene', async () => {
  const body = OcctBackend.box(10, 10, 10);
  const cover = OcctBackend.box(2, 4, 6);
  const scene: SceneBackend = { _kind: 'scene', target: 'export-occt', assemblyName: 'evidence', parts: [
    { name: 'body', shape: body, worldTransform: Transform.translation(10, 20, 30) },
    { name: 'cover', shape: cover, worldTransform: Transform.translation(50, 20, 30).compose(Transform.rotationAxisAngleDeg([0, 0, 1], 90)) },
  ] };
  try {
    const before = captureStepState(scene)!;
    const after = captureStepState(scene)!;
    expect(before.error).toBeUndefined();
    expect(after.brep?.length).toBeGreaterThan(100);
    expect(after.volume).toBeCloseTo(1048);
    for (const [i, expected] of [10, 20, 30].entries()) expect(after.bounds.min[i]).toBeCloseTo(expected, 5);
    for (const [i, expected] of [50, 30, 40].entries()) expect(after.bounds.max[i]).toBeCloseTo(expected, 5);
    const evidence = await createStepEvidence(before, after, true, [], async () => Buffer.from('png'));
    expect(evidence.validity.status).toBe('valid');
    expect(evidence.snapshots.status).toBe('captured');
    expect(summarizeScene(scene as unknown as ShapeBackend).volume).toBeCloseTo(1048);
    expect(body.exportBREP().length).toBeGreaterThan(100);
    expect(cover.volume()).toBeCloseTo(48);
  } finally { body.dispose(); cover.dispose(); }
});
