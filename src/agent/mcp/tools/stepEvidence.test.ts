// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { captureStepState, createStepEvidence } from './stepEvidence';
import type { ShapeBackend } from '../../../kernel/backends/backend';

const shape = (x: number, volume = 100) => ({
  boundingBox: () => ({ min: [x, 0, 0], max: [x + 10, 10, 10] }),
  volume: () => volume,
  exportBREP: () => new Uint8Array([1, 2]),
}) as unknown as ShapeBackend;

describe('MCP step evidence', () => {
  it('renders both states with the same union frame and returns their paths', async () => {
    const render = vi.fn(async () => Buffer.from('png'));
    const out = await createStepEvidence(captureStepState(shape(0)), captureStepState(shape(20)), true, [], render);
    expect(out.validity).toEqual({ status: 'valid', checks: ['build', 'feature-health', 'finite-geometry'], volume: 100 });
    expect(out.snapshots.status).toBe('captured');
    expect(out.snapshots.frame?.bounds).toEqual({ min: [0, 0, 0], max: [30, 10, 10] });
    expect(out.snapshots.before).toMatch(/before.png$/);
    expect(out.snapshots.after).toMatch(/after.png$/);
    expect(render).toHaveBeenCalledTimes(2);
    expect(render.mock.calls[0][1]).toEqual(render.mock.calls[1][1]);
  });
  it('reports an initial step without inventing a before image', async () => {
    const out = await createStepEvidence(undefined, captureStepState(shape(0)), true, [], async () => Buffer.from('png'));
    expect(out.snapshots.status).toBe('captured');
    expect(out.snapshots.before).toBeUndefined();
    expect(out.snapshots.after).toBeDefined();
  });
  it('keeps validity when rendering fails and reports the exact failure', async () => {
    const out = await createStepEvidence(undefined, captureStepState(shape(0)), true, [], async () => { throw new Error('browser unavailable'); });
    expect(out.validity.status).toBe('valid');
    expect(out.snapshots).toMatchObject({ status: 'unavailable', error: 'browser unavailable' });
  });
  it('does not certify failed builds, degraded features or nonfinite geometry', async () => {
    for (const [ok, health, state] of [
      [false, [], captureStepState(shape(0))],
      [true, [{ featureId: 'f1', status: 'warning' }], captureStepState(shape(0))],
      [true, [], captureStepState(shape(0, NaN))],
    ] as const) {
      const out = await createStepEvidence(undefined, state, ok, health, async () => Buffer.from('png'));
      expect(out.validity.status).toBe('invalid');
    }
  });
  it('reports missing geometry as unverified', async () => {
    const out = await createStepEvidence(undefined, undefined, true, [], async () => Buffer.from('png'));
    expect(out.validity.status).toBe('unverified');
    expect(out.snapshots.status).toBe('unavailable');
  });
});

it('preserves finite validity when BREP export fails', async () => {
  const s = shape(0);
  s.exportBREP = () => { throw new Error('export refused'); };
  const out = await createStepEvidence(undefined, captureStepState(s), true, [], async () => Buffer.from('png'));
  expect(out.validity.status).toBe('valid');
  expect(out.snapshots).toMatchObject({ status: 'unavailable', error: 'Error: export refused' });
});
