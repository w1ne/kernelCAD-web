import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildBendFeatureSpec,
  buildDraftFeatureSpec,
  buildEdgeFeatureRef,
  buildFaceInputRef,
  buildScalarEdgeFeatureSpec,
  buildVariableEdgeFeatureSpec,
} from '../../../src/modeling/capture/shapeOperationFeatureRecords';
import {
  createBendFeatureCaptureSpec,
  createDraftFeatureCaptureSpec,
  createScalarEdgeFeatureCaptureSpec,
  createVariableEdgeFeatureCaptureSpec,
} from '../../../src/modeling/capture/shapeOperationCaptureValidation';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';

describe('shape operation feature records', () => {
  it('serializes face and edge selectors into stable FeatureRefs', () => {
    expect(buildFaceInputRef('box_1', 'top')).toEqual({
      kind: 'face',
      featureId: 'box_1',
      ref: { kind: 'canonical', face: 'top' },
    });

    expect(buildFaceInputRef('box_1', 'rim')).toEqual({
      kind: 'face',
      featureId: 'box_1',
      ref: { kind: 'label', name: 'rim' },
    });

    expect(buildEdgeFeatureRef('box_1', { face: 'side-wall' })).toEqual({
      key: 'face',
      value: {
        kind: 'face',
        featureId: 'box_1',
        ref: { kind: 'label', name: 'side-wall' },
      },
    });

    expect(buildEdgeFeatureRef('box_1', { atZ: 5 })).toEqual({
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: 'box_1',
        ref: { kind: 'query', query: { atZ: 5 } },
      },
    });

    const edgeQuery = {
      _kind: 'kc.query',
      target: 'edge',
      ast: { op: 'withLabel', label: 'rim' },
      lenient: true,
    } as const;
    expect(buildEdgeFeatureRef('box_1', edgeQuery)).toEqual({
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: 'box_1',
        ref: {
          kind: 'queryDsl',
          queryAst: edgeQuery.ast,
          queryTarget: 'edge',
          lenient: true,
        },
      },
    });

    const faceQuery = {
      _kind: 'kc.query',
      target: 'face',
      ast: { op: 'withLabel', label: 'boss' },
    } as const;
    expect(buildFaceInputRef('box_1', faceQuery)).toEqual({
      kind: 'face',
      featureId: 'box_1',
      ref: {
        kind: 'queryDsl',
        queryAst: faceQuery.ast,
        queryTarget: 'face',
      },
    });
  });

  it('builds stable scalar edge, bend, draft, and variable edge specs', () => {
    expect(buildScalarEdgeFeatureSpec(
      'fillet',
      'box_1',
      'radius',
      2,
      { face: 'top' },
      { continuity: 'G2' },
    )).toEqual({
      kind: 'fillet',
      params: {
        radius: { expression: '2', unit: 'mm', evaluated: 2 },
      },
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: {
          kind: 'face',
          featureId: 'box_1',
          ref: { kind: 'canonical', face: 'top' },
        },
      },
      metadata: { continuity: 'G2' },
    });

    expect(buildBendFeatureSpec(
      'sheet_1',
      { expression: '90', unit: 'deg', evaluated: 90 },
      { expression: '3', unit: 'mm', evaluated: 3 },
      { atY: 60 },
    )).toEqual({
      kind: 'sheetMetalBend',
      params: {
        angle: { expression: '90', unit: 'deg', evaluated: 90 },
        radius: { expression: '3', unit: 'mm', evaluated: 3 },
      },
      inputs: {
        base: { kind: 'feature', id: 'sheet_1' },
        edges: {
          kind: 'edge',
          featureId: 'sheet_1',
          ref: { kind: 'query', query: { atY: 60 } },
        },
      },
    });

    expect(buildDraftFeatureSpec('box_1', 5, {
      face: 'front',
      pullDir: [0, 0, 1],
    })).toEqual({
      kind: 'draft',
      params: {
        angle: { expression: '5', unit: 'deg', evaluated: 5 },
      },
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        face: {
          kind: 'face',
          featureId: 'box_1',
          ref: { kind: 'canonical', face: 'front' },
        },
      },
      metadata: {
        neutralPlane: 'front',
        pullDir: [0, 0, 1],
      },
    });

    expect(buildVariableEdgeFeatureSpec('chamfer', 'box_1', 'distance', [
      { edges: { atZ: 5 }, distance: 1 },
    ])).toEqual({
      kind: 'chamfer',
      params: {},
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        edge_group_0: {
          kind: 'edge',
          featureId: 'box_1',
          ref: { kind: 'query', query: { atZ: 5 } },
        },
      },
      metadata: {
        variable: true,
        groups: [{ distance: 1 }],
      },
    });

    const radiusRef = { paramRef: 'r', evaluated: 2 };
    expect(buildVariableEdgeFeatureSpec('fillet', 'box_1', 'radius', [
      { edges: { face: 'front' }, radius: radiusRef },
    ])).toEqual({
      kind: 'fillet',
      params: {},
      inputs: {
        base: { kind: 'feature', id: 'box_1' },
        edge_group_0: {
          kind: 'face',
          featureId: 'box_1',
          ref: { kind: 'canonical', face: 'front' },
        },
      },
      metadata: {
        variable: true,
        groups: [{ radius: radiusRef }],
      },
    });
  });

  it('validates session membership before returning operation specs', () => {
    const records = [record('box_1', 'box')];

    expect(createScalarEdgeFeatureCaptureSpec(records, 'fillet', 'box_1', 'radius', 2))
      .toMatchObject({
        kind: 'fillet',
        inputs: { base: { kind: 'feature', id: 'box_1' } },
      });
    expect(createBendFeatureCaptureSpec(
      records,
      'box_1',
      { expression: '90', unit: 'deg', evaluated: 90 },
      { expression: '3', unit: 'mm', evaluated: 3 },
      { face: 'top' },
    )).toMatchObject({ kind: 'sheetMetalBend' });
    expect(createDraftFeatureCaptureSpec(records, 'box_1', 5, { face: 'front' }))
      .toMatchObject({ kind: 'draft' });
    expect(createVariableEdgeFeatureCaptureSpec(records, 'fillet', 'box_1', 'radius', [
      { edges: { atZ: 5 }, radius: 2 },
    ])).toMatchObject({ kind: 'fillet' });

    expect(() => createScalarEdgeFeatureCaptureSpec([], 'fillet', 'box_1', 'radius', 2))
      .toThrow("fillet: base shape 'box_1' is not from this CaptureSession");
    expect(() => createBendFeatureCaptureSpec(
      [],
      'box_1',
      { expression: '90', unit: 'deg', evaluated: 90 },
      { expression: '3', unit: 'mm', evaluated: 3 },
      { face: 'top' },
    )).toThrow("bend: base shape 'box_1' is not from this CaptureSession");
    expect(() => createDraftFeatureCaptureSpec([], 'box_1', 5, { face: 'front' }))
      .toThrow("draft: base shape 'box_1' is not from this CaptureSession");
    expect(() => createVariableEdgeFeatureCaptureSpec([], 'fillet', 'box_1', 'radius', [
      { edges: { atZ: 5 }, radius: 2 },
    ])).toThrow("fillet: base shape 'box_1' is not from this CaptureSession");
  });

  it('keeps shape operation record construction outside CaptureSession', () => {
    const sessionSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/captureSession.ts'),
      'utf8',
    );
    const featureRecordSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/shapeOperationFeatureRecords.ts'),
      'utf8',
    );

    expect(sessionSource).toContain('./shapeOperationCaptureValidation');
    expect(sessionSource).not.toContain('function buildEdgeFeatureRef');
    expect(sessionSource).not.toContain("kind: 'sheetMetalBend'");
    expect(sessionSource).not.toContain("variable: true");
    expect(featureRecordSource).toContain('export function buildEdgeFeatureRef');
  });
});

function record(id: string, kind: FeatureRecord['kind']): FeatureRecord {
  return {
    id,
    kind,
    params: {},
    inputs: {},
    transforms: [],
    suppressed: false,
  };
}
