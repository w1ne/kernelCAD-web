// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { localOpUnchanged } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { flattenPattern } from '../../../src/kernel/backends/occt/flattenPattern';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import { chooseConstruction } from '../../../src/modeling/validation/manufacturingScore';
import { dishonestImportReason, importedSolidScript } from '../../../src/agent/reconstruct/honestImport';
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
    const records = [
      sketchRecord(),
      {
        id: 'sm',
        kind: 'sheetMetal',
        params: { thickness: { evaluated: 1.5 } },
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
    expect(() => flattenPattern(records)).toThrow(KernelError);
    expect(() => flattenPattern(records)).toThrow(/K-factor/);
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
  it('keeps one profile and labels everything else as an imported solid', () => {
    expect(dishonestImportReason({ unmatched: 0, bodyBlocks: 1, booleanRemainders: 0 })).toBeNull();
    const reason = dishonestImportReason({ unmatched: 2, bodyBlocks: 1, booleanRemainders: 0 });
    expect(reason).toMatch(/no feature/);
    expect(importedSolidScript(reason!)).toContain('lib.fromSTEP');
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
