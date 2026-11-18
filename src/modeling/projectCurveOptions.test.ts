// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.projectCurve rejects unknown option keys instead of dropping them:
// `{ scale: 'bounds' }` used to project at the default 'original' scale and
// `{ curve: ... }` used to fail later on a missing source, both silently.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';
import type { ProjectCurveMetadata } from '../shared/intent/projectCurveRecord';
import type { SketchCommand } from '../shared/capture/sketchCommand';

type ProjectOpts = Parameters<ReturnType<typeof cylinder>['shape']['projectCurve']>[0];

const mm = (n: number) => ({ expression: String(n), unit: 'mm', evaluated: n });
const SQUARE: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(0) },
  { kind: 'lineTo', x: mm(2), y: mm(0) },
  { kind: 'lineTo', x: mm(2), y: mm(2) },
  { kind: 'close' },
];
const SOURCE = { kind: 'sketchCommands' as const, commands: SQUARE };
const OPEN_SOURCE = { kind: 'sketchCommands' as const, commands: SQUARE.slice(0, 2) };
const SOURCE_PLANE = { origin: [0, 0, 10], normal: [0, 0, 1], xAxis: [1, 0, 0] };

function cylinder() {
  const session = new CaptureSession();
  return { session, shape: createModelingApi({ session }).cylinder(8, 5) };
}

function caught(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected a KernelError');
}

describe('Shape.projectCurve option keys', () => {
  it.each([
    ['scale', 'bounds'],
    ['scalemode', 'native'],
    ['edge', true],
    ['plane', 'xy'],
  ])('rejects a misspelt %s key and names the accepted keys', (key, value) => {
    const { session, shape } = cylinder();
    const before = session.getRecords().length;
    const opts = { source: SOURCE, face: 'top', [key]: value };
    const err = caught(() => shape.projectCurve(opts as unknown as ProjectOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain('source, face, scaleMode, asEdge');
    expect(session.getRecords().length).toBe(before);
  });

  it('points a curve key at source', () => {
    const { shape } = cylinder();
    const err = caught(() => shape.projectCurve({ curve: SOURCE, face: 'top' } as unknown as ProjectOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('opts.curve');
    expect(err.message).toContain("source: { kind: 'sketchCommands'");
  });

  it.each([null, [], 'top'])('rejects a non-object opts %j', (opts) => {
    const { shape } = cylinder();
    const err = caught(() => shape.projectCurve(opts as unknown as ProjectOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('projectCurve(opts)');
  });

  it('still captures every accepted key', () => {
    const { session, shape } = cylinder();
    const sketch = shape.projectCurve({ source: SOURCE, face: 'top', scaleMode: 'bounds', asEdge: false });
    const rec = session.getRecords().find((r) => r.id === sketch.id)!;
    expect(rec.kind).toBe('projectCurve');
    const meta = rec.metadata as unknown as ProjectCurveMetadata;
    expect(meta.scaleMode).toBe('bounds');
    expect(meta.asEdge).toBe(false);
    expect(meta.faceRef).toEqual({ kind: 'canonical', face: 'top' });
  });

  it.each([
    ['sourcePlane', null],
    ['sourcePlane', { origin: null, normal: [0, 0, 1], xAxis: [1, 0, 0] }],
    ['direction', null],
    ['direction', [0, Number.NaN, -1]],
  ])('rejects malformed open projection %s values through capture diagnostics', (key, value) => {
    const { shape } = cylinder();
    const opts = {
      source: OPEN_SOURCE,
      face: 'top',
      asEdge: true,
      sourcePlane: SOURCE_PLANE,
      direction: [0, 0, -1],
      [key]: value,
    };
    const err = caught(() => shape.projectCurve(opts as unknown as ProjectOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(key === 'sourcePlane' ? 'opts.sourcePlane' : 'opts.direction');
  });
});
