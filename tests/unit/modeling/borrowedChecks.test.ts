// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { localOpUnchanged } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { flattenPattern } from '../../../src/kernel/backends/occt/flattenPattern';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import { chooseConstruction } from '../../../src/modeling/validation/manufacturingScore';
import { dishonestImportReason } from '../../../src/agent/reconstruct/honestImport';
import { pickNearOverlap } from '../../../src/modeling/validation/manufacturingScore';
import { unconstrainedSketchError } from '../../../src/agent/mcp/tools/constraints';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';

describe('a local op that returns the same solid', () => {
  it('is unchanged only when the volume and the face count both stay', () => {
    expect(localOpUnchanged(1000, 1000, 6, 6)).toBe(true);
    expect(localOpUnchanged(1000, 800, 6, 10)).toBe(false);
    expect(localOpUnchanged(1000, 1000, 6, 8)).toBe(false);
  });
});

describe('flattenPattern refuses a bend with no developed length', () => {
  it('throws when the sheet has a bend and no K-factor', () => {
    const records = bentSheet(undefined);
    expect(() => flattenPattern(records)).toThrow(KernelError);
    expect(() => flattenPattern(records)).toThrow(/K-factor/);
  });

  it('flattens a bend whose K-factor is 0, and an unlowered bend still names bendRecord', () => {
    const records = bentSheet(0);
    expect(flattenPattern(records).bendLines).toHaveLength(1);
    const unlowered = records.map((record) => record.kind === 'sheetMetalBend'
      ? { ...record, metadata: {} }
      : record) as FeatureRecord[];
    expect(() => flattenPattern(unlowered)).toThrow(/bendRecord/);
  });
});

describe('chooseConstruction', () => {
  it('prefers the counterbored part over a lookalike with a higher overlap', () => {
    const expected = { plainHoles: 0, counterbores: 4, fillets: 1, booleanCuts: 0, depthMm: 12 };
    const lookalike = {
      iou: 0.99,
      counts: { plainHoles: 4, counterbores: 0, fillets: 0, booleanCuts: 2, depthMm: 24 },
      value: 'lookalike',
    };
    const made = {
      iou: 0.9,
      counts: { plainHoles: 0, counterbores: 4, fillets: 1, booleanCuts: 0, depthMm: 12 },
      value: 'made',
    };
    expect(chooseConstruction([lookalike, made], expected)?.value).toBe('made');
  });
});

describe('honest import', () => {
  it('keeps one extrude and a multi-step revolve, and names a boolean subtract', () => {
    const one = { body: 'extrude' as const, extrudeBlocks: 1, booleanRemainders: 0, unmatched: 0 };
    expect(dishonestImportReason(one)).toBeNull();
    expect(dishonestImportReason({ ...one, body: 'revolve', extrudeBlocks: 3 })).toBeNull();
    expect(dishonestImportReason({ ...one, extrudeBlocks: 2 })).toMatch(/more than one extruded/);
    expect(dishonestImportReason({ ...one, booleanRemainders: 1 })).toMatch(/boolean subtract/);
    expect(dishonestImportReason({ ...one, unmatched: 2 })).toMatch(/no feature/);
  });
});

describe('pickNearOverlap', () => {
  it('picks the same winner regardless of input order', () => {
    const counts = { plainHoles: 0, counterbores: 0, fillets: 0, booleanCuts: 0 };
    const a = { verdict: 'approximate' as const, iou: 1, deviationMm: 0.1, counts, value: 'plain' };
    const b = { verdict: 'approximate' as const, iou: 0.985, deviationMm: 0.1, counts: { ...counts, counterbores: 4 }, value: 'bored' };
    const c = { verdict: 'approximate' as const, iou: 0.97, deviationMm: 0.1, counts: { ...counts, counterbores: 8 }, value: 'far' };
    expect(pickNearOverlap([a, b, c])?.value).toBe('bored');
    expect(pickNearOverlap([c, a, b])?.value).toBe('bored');
    expect(pickNearOverlap([b, c, a])?.value).toBe('bored');
  });
});

describe('generated sketches', () => {
  it('are not done when the lines have no constraints', () => {
    const error = unconstrainedSketchError(
      [
        { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true },
        { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: false },
        { id: 'e', type: 'LINE', p1: 'p1', p2: 'p2' },
      ],
      [],
    );
    expect(error).toMatch(/no constraints/);
    expect(unconstrainedSketchError(
      [
        { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true },
        { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: true },
        { id: 'e', type: 'LINE', p1: 'p1', p2: 'p2' },
      ],
      [],
    )).toBeUndefined();
  });
});

describe('a joint proposal', () => {
  it('rejects a connector mated to itself', () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('rig');
    const base = arm.part('base', kcad.box(10, 10, 10));
    base.connector('ax', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    expect(() => arm.mate('spin', 'base.ax', 'base.ax', 'revolute')).toThrow(/same connector/);
  });
});

function bentSheet(kFactor: number | undefined): FeatureRecord[] {
  const sheetParams = kFactor === undefined
    ? { thickness: { evaluated: 1.5 } }
    : { thickness: { evaluated: 1.5 }, kFactor: { evaluated: kFactor } };
  return [
    sketchRecord(),
    {
      id: 'sm',
      kind: 'sheetMetal',
      params: sheetParams,
      inputs: { sketch: { kind: 'feature', id: 'sk' } },
      metadata: {},
    },
    {
      id: 'bd',
      kind: 'sheetMetalBend',
      params: {},
      inputs: { base: { kind: 'feature', id: 'sm' } },
      metadata: {
        bendRecord: {
          axisOrigin: [5, 0, 0],
          axisDirection: [0, 1, 0],
          edgeLength: 4,
          angleRad: Math.PI / 2,
          radius: 1,
        },
      },
    },
  ] as unknown as FeatureRecord[];
}

function sketchRecord(): FeatureRecord {
  return {
    id: 'sk',
    kind: 'sketch',
    params: {},
    inputs: {},
    metadata: {
      commands: [
        { kind: 'moveTo', x: { evaluated: 0 }, y: { evaluated: 0 } },
        { kind: 'lineTo', x: { evaluated: 10 }, y: { evaluated: 0 } },
        { kind: 'lineTo', x: { evaluated: 10 }, y: { evaluated: 4 } },
        { kind: 'close' },
      ],
    },
  } as unknown as FeatureRecord;
}
