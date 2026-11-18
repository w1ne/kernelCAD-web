// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sketchNurbsSegment.test.ts

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { KernelError } from '../../shared/intent/kernelError';
import type { SketchCommand } from '../../shared/capture/sketchCommand';
import { createModelingApi } from '../api';
import { CaptureSession } from './captureSession';

beforeAll(async () => {
  await initOcct();
});

function makePath() {
  const api = createModelingApi({ session: new CaptureSession() });
  return api.path();
}

interface PathBuilderInternal {
  commands: SketchCommand[];
}

describe('path().nurbsSegment option validation', () => {
  it('rejects an unknown option before recording the segment', () => {
    const builder = makePath().moveTo(0, 0);
    const opts = { degre: 2 } as unknown as NonNullable<Parameters<typeof builder.nurbsSegment>[1]>;
    let caught: KernelError | undefined;

    try {
      builder.nurbsSegment([[0, 0], [3, 5], [7, 5], [10, 0]], opts);
    } catch (error) {
      caught = error as KernelError;
    }

    expect(caught).toBeInstanceOf(KernelError);
    expect(caught?.code).toBe('feature.invalid-args');
    expect(caught?.message).toMatch(/opts\.degre.*unknown option/i);
    expect((builder as unknown as PathBuilderInternal).commands.some((command) => command.kind === 'nurbsSegment')).toBe(false);
  });

  it('keeps the supported degree, weight, and knot options', () => {
    const knots = [0, 0, 0, 0.3, 1, 1, 1];
    const builder = makePath().moveTo(0, 0).nurbsSegment(
      [[0, 0], [3, 5], [7, 5], [10, 0]],
      { degree: 2, weights: [1, 2, 1, 1], knots },
    );
    const command = (builder as unknown as PathBuilderInternal).commands.find((item) => item.kind === 'nurbsSegment');

    expect(command?.kind).toBe('nurbsSegment');
    if (command?.kind !== 'nurbsSegment') throw new Error('NURBS segment command missing');
    expect(command.degree.evaluated).toBe(2);
    expect(command.weights?.map((weight) => weight.evaluated)).toEqual([1, 2, 1, 1]);
    expect(command.knots?.map((knot) => knot.evaluated)).toEqual(knots);
  });
});
