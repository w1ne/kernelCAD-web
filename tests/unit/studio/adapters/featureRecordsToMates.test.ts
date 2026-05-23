// Slice 2C — exercise the FeatureRecord[] → JointPoseSnapshot[] adapter.

import { describe, it, expect } from 'vitest';
import { extractJointSnapshots } from '../../../../src/studio/adapters/featureRecordsToMates';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { EncodedMateRecord } from '../../../../src/modeling/capture/captureSession';
import type { Param } from '../../../../src/shared/intent/types';
import { ParamTable } from '../../../../src/shared/runtime/paramTable';

function num(value: number, ref?: string): Param {
  return {
    expression: ref ?? String(value),
    unit: 'deg',
    evaluated: value,
    ...(ref !== undefined ? { paramRef: ref } : {}),
  };
}

function solvedAssembly(mates: EncodedMateRecord[]): FeatureRecord {
  return {
    id: 'asm_1',
    kind: 'solvedAssembly',
    params: {},
    inputs: {},
    metadata: { mates },
  } as unknown as FeatureRecord;
}

function assemblyModel(mates: EncodedMateRecord[]): FeatureRecord {
  return {
    id: 'asm_model_1',
    kind: 'assemblyModel',
    params: {},
    inputs: {},
    metadata: { mates },
  } as unknown as FeatureRecord;
}

function assemblyPart(id: string, partName: string): FeatureRecord {
  return {
    id,
    kind: 'assemblyPart',
    params: {},
    inputs: {},
    metadata: { partName },
  } as unknown as FeatureRecord;
}

describe('extractJointSnapshots', () => {
  it('returns empty array when no records', () => {
    expect(extractJointSnapshots([])).toEqual([]);
  });

  it('ignores non-solvedAssembly records', () => {
    const rec: FeatureRecord = {
      id: 'box_1',
      kind: 'box',
      params: {},
      inputs: {},
    } as unknown as FeatureRecord;
    expect(extractJointSnapshots([rec])).toEqual([]);
  });

  it('extracts scalar posed mate with ParamRef binding', () => {
    const rec = solvedAssembly([
      {
        name: 'shoulder',
        a: 'base.connA',
        b: 'arm.connB',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(35, 'shoulderPitchDeg') },
        limitsDeg: [-45, 135] as const,
      },
    ]);
    const out = extractJointSnapshots([rec]);
    expect(out).toHaveLength(1);
    expect(out[0].mate.name).toBe('shoulder');
    expect(out[0].pose).toBe(35);
    expect(out[0].poseParamNames).toEqual(['shoulderPitchDeg']);
    expect(out[0].mate.limitsDeg).toEqual([-45, 135]);
  });

  it('extracts scalar posed mates from assemblyModel records', () => {
    const rec = assemblyModel([
      {
        name: 'height-adjust',
        a: 'sleeve.rail',
        b: 'post.slide',
        type: 'prismatic',
        pose: { kind: 'scalar', value: num(12, 'heightAdjustMm') },
        limitsMm: [0, 34] as const,
      },
    ]);

    const out = extractJointSnapshots([rec]);

    expect(out).toHaveLength(1);
    expect(out[0].mate.name).toBe('height-adjust');
    expect(out[0].mate.type).toBe('prismatic');
    expect(out[0].pose).toBe(12);
    expect(out[0].poseParamNames).toEqual(['heightAdjustMm']);
    expect(out[0].mate.limitsMm).toEqual([0, 34]);
  });

  it('attaches viewport preview data from connector metadata', () => {
    const rec = {
      ...assemblyModel([
        {
          name: 'height-adjust',
          a: 'sleeve.rail',
          b: 'post.slide',
          type: 'prismatic',
          pose: { kind: 'scalar', value: num(12, 'heightAdjustMm') },
        },
      ]),
      metadata: {
        mates: [
          {
            name: 'height-adjust',
            a: 'sleeve.rail',
            b: 'post.slide',
            type: 'prismatic',
            pose: { kind: 'scalar', value: num(12, 'heightAdjustMm') },
          },
        ],
        partIds: ['part_sleeve', 'part_post'],
        connectorsByPartId: {
          part_sleeve: [
            { name: 'rail', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] },
          ],
          part_post: [
            { name: 'slide', type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] },
          ],
        },
      },
    } as unknown as FeatureRecord;

    const out = extractJointSnapshots([
      assemblyPart('part_sleeve', 'sleeve'),
      assemblyPart('part_post', 'post'),
      rec,
    ]);

    expect(out[0].preview).toEqual({
      assemblyFeatureId: 'asm_model_1',
      parentPartName: 'sleeve',
      childPartName: 'post',
      parentConnectorOrigin: [0, 0, 10],
      parentConnectorAxis: [0, 0, 1],
    });
  });

  it('skips mates without pose (fastened, etc.)', () => {
    const rec = solvedAssembly([
      { name: 'plate-fix', a: 'p1.x', b: 'p2.y', type: 'fastened' },
    ]);
    expect(extractJointSnapshots([rec])).toEqual([]);
  });

  it('records numeric-literal pose with null paramName', () => {
    const rec = solvedAssembly([
      {
        name: 'lit',
        a: 'a.x',
        b: 'b.y',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(20) }, // no paramRef
      },
    ]);
    const out = extractJointSnapshots([rec]);
    expect(out[0].poseParamNames).toEqual([null]);
  });

  it('extracts ball mate as three components', () => {
    const rec = solvedAssembly([
      {
        name: 'wrist',
        a: 'forearm.tip',
        b: 'hand.base',
        type: 'ball',
        pose: {
          kind: 'ball',
          value: [num(10, 'wristX'), num(20, 'wristY'), num(30, 'wristZ')],
        },
      },
    ]);
    const out = extractJointSnapshots([rec]);
    expect(out).toHaveLength(1);
    expect(out[0].pose).toEqual([10, 20, 30]);
    expect(out[0].poseParamNames).toEqual(['wristX', 'wristY', 'wristZ']);
  });

  it('dedupes mate names by last-recorded solvedAssembly winning', () => {
    const first = solvedAssembly([
      {
        name: 'shoulder',
        a: 'a.x',
        b: 'b.y',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(15, 'shoulder') },
      },
    ]);
    const second = solvedAssembly([
      {
        name: 'shoulder',
        a: 'a.x',
        b: 'b.y',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(99, 'shoulder') },
      },
    ]);
    const out = extractJointSnapshots([first, second]);
    expect(out).toHaveLength(1);
    expect(out[0].pose).toBe(99);
  });

  it('resolves pose from ParamTable when ParamRef is present', () => {
    // Capture-time encoding stamps `evaluated: 0` on ParamRef-typed Params
    // (only literals carry the real value). The adapter must look the
    // current value up in the session's ParamTable so the JointsTab slider
    // reflects what the kernel actually rendered with.
    const rec = solvedAssembly([
      {
        name: 'shoulder',
        a: 'a.x',
        b: 'b.y',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(0, 'shoulderPitchDeg') }, // 0 in encoded
      },
    ]);
    const table = new ParamTable();
    table.declare('shoulderPitchDeg', 'number', 35);
    const out = extractJointSnapshots([rec], table);
    expect(out[0].pose).toBe(35); // not 0
  });

  it('binds a simple scaled ParamRef expression back to its source param', () => {
    const rec = assemblyModel([
      {
        name: 'height-adjust',
        a: 'sleeve.rail',
        b: 'post.slide',
        type: 'prismatic',
        pose: {
          kind: 'scalar',
          value: {
            expression: '{$paramExpr:(heightAdjustMm * 0.18)}',
            unit: 'mm',
            evaluated: 0,
            paramRef: {
              kind: 'binop',
              op: '*',
              left: { kind: 'param', name: 'heightAdjustMm' },
              right: { kind: 'lit', value: 0.18 },
            },
          } as Param,
        },
        limitsMm: [0, 34] as const,
      },
    ]);
    const table = new ParamTable();
    table.declare('heightAdjustMm', 'number', 17);

    const out = extractJointSnapshots([rec], table);

    expect(out[0].pose).toBe(17);
    expect(out[0].poseParamNames).toEqual(['heightAdjustMm']);
    expect(out[0].mate.limitsMm).toEqual([0, 34]);
  });

  it('falls back to encoded evaluated when no ParamTable supplied', () => {
    const rec = solvedAssembly([
      {
        name: 'lit',
        a: 'a.x',
        b: 'b.y',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(42) },
      },
    ]);
    const out = extractJointSnapshots([rec], null);
    expect(out[0].pose).toBe(42);
  });

  it('preserves declaration order across multiple mates in one record', () => {
    const rec = solvedAssembly([
      {
        name: 'first',
        a: 'a.x',
        b: 'b.y',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(1, 'first') },
      },
      {
        name: 'second',
        a: 'a.x',
        b: 'b.y',
        type: 'revolute',
        pose: { kind: 'scalar', value: num(2, 'second') },
      },
    ]);
    const out = extractJointSnapshots([rec]);
    expect(out.map((j) => j.mate.name)).toEqual(['first', 'second']);
  });
});
