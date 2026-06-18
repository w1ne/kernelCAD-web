// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sketchSplineTangent.test.ts
//
// V slice — Task V4: path().spline(points, { startTangent, endTangent })
// capture-time validation + SketchCommand storage.
//
// The full lower-and-sample loop is exercised by the pathNurbsLowerer tests;
// this file owns the authoring-surface contract (capture validation,
// SketchCommand field shape, backward compatibility).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

beforeAll(async () => {
  await initOcct();
});

function makePath() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return kcad.path();
}

interface PathBuilderInternal {
  commands: SketchCommand[];
}

describe('path().spline — tangent extension (V slice)', () => {
  it('accepts startTangent + endTangent and stores them on the SketchCommand', () => {
    const builder = makePath()
      .moveTo(0, 0)
      .spline([[0, 0], [5, 10], [10, 0]], { startTangent: [1, 0], endTangent: [1, 0] });
    const commands = (builder as unknown as PathBuilderInternal).commands;
    const splineCmd = commands.find((c) => c.kind === 'spline');
    expect(splineCmd).toBeDefined();
    if (splineCmd?.kind !== 'spline') throw new Error('spline command missing');
    expect(splineCmd.startTangent).toBeDefined();
    expect(splineCmd.endTangent).toBeDefined();
    expect(splineCmd.startTangent?.x.evaluated).toBe(1);
    expect(splineCmd.startTangent?.y.evaluated).toBe(0);
    expect(splineCmd.endTangent?.x.evaluated).toBe(1);
    expect(splineCmd.endTangent?.y.evaluated).toBe(0);
  });

  it('throws tangent-zero-magnitude on a [0, 0] startTangent', () => {
    let caught: KernelError | undefined;
    try {
      makePath()
        .moveTo(0, 0)
        .spline([[0, 0], [5, 10], [10, 0]], { startTangent: [0, 0] });
    } catch (e) {
      caught = e as KernelError;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect(caught!.code).toBe('feature.path.spline.tangent-zero-magnitude');
  });

  it('throws tangent-zero-magnitude on a near-zero (< 1e-9) endTangent', () => {
    let caught: KernelError | undefined;
    try {
      makePath()
        .moveTo(0, 0)
        .spline([[0, 0], [5, 10], [10, 0]], { endTangent: [1e-12, 1e-12] });
    } catch (e) {
      caught = e as KernelError;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect(caught!.code).toBe('feature.path.spline.tangent-zero-magnitude');
  });

  it('backward compatible: .spline(points) leaves no tangent fields', () => {
    const builder = makePath().moveTo(0, 0).spline([[0, 0], [1, 1]]);
    const commands = (builder as unknown as PathBuilderInternal).commands;
    const splineCmd = commands.find((c) => c.kind === 'spline');
    if (splineCmd?.kind !== 'spline') throw new Error('spline command missing');
    expect(splineCmd.startTangent).toBeUndefined();
    expect(splineCmd.endTangent).toBeUndefined();
  });

  it('backward compatible: .spline(points, { tension }) still records tension', () => {
    const builder = makePath().moveTo(0, 0).spline([[0, 0], [1, 1]], { tension: 0.5 });
    const commands = (builder as unknown as PathBuilderInternal).commands;
    const splineCmd = commands.find((c) => c.kind === 'spline');
    if (splineCmd?.kind !== 'spline') throw new Error('spline command missing');
    expect(splineCmd.tension?.evaluated).toBe(0.5);
    expect(splineCmd.startTangent).toBeUndefined();
    expect(splineCmd.endTangent).toBeUndefined();
  });
});
