// tests/unit/backends/occt/edgeSelection.resolveEdgesRef.test.ts
// Characterisation tests for resolveEdgesRef, exercised through pickEdges.
// These pin current outputs (codes, messages, hints) before the phase split.
import { describe, it, expect, beforeAll } from 'vitest';
import { pickEdges } from '../../../../src/kernel/backends/occt/edgeSelection';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { EdgeQuery } from '../../../../src/shared/intent/queryTypes';
import type { EdgeRef } from '../../../../src/shared/intent/types';

const edgesRecord = (ref: EdgeRef): FeatureRecord => ({
  id: 'fillet_e1', kind: 'fillet',
  inputs: {
    base: { kind: 'feature', id: 'box_1' },
    edges: { kind: 'edge', featureId: 'box_1', ref },
  },
  params: { radius: { expression: '2', unit: 'mm', evaluated: 2 } },
  transforms: [], suppressed: false,
});

describe('resolveEdgesRef characterisation', () => {
  beforeAll(async () => { await initOcct(); });

  it('created ref without historyMap surfaces the not-resolvable diagnostic', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(
      edgesRecord({ kind: 'created', rewriteId: 'hole_1', slot: 'f0', selector: 'edge' }),
      box,
      undefined,
    );
    expect(result).toEqual({
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-resolvable',
        featureId: 'fillet_e1',
        severity: 'error',
        message: `historyMap not initialized; created-ref 'hole_1.f0' cannot resolve.`,
        hint: 'Apply this feature before any transform.',
      },
    });
  });

  it('query ref with an unknown key surfaces invalid-args with the key list', () => {
    const box = OcctBackend.box(20, 20, 20);
    const query = { atZ: 10, bogus: true } as EdgeQuery;
    const result = pickEdges(edgesRecord({ kind: 'query', query }), box, undefined);
    expect(result).toEqual({
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: 'fillet_e1',
        severity: 'error',
        message: `EdgeQuery has unknown keys: bogus. Valid keys: atZ, atX, atY, near, within, parallel, perpendicular, convex, concave, minAngle, maxAngle, ofCurveType, tolerance, angleTolerance.`,
        hint: 'Drop unknown keys from the EdgeQuery; check the EdgeQuery type for the valid key set.',
      },
    });
  });

  it('valid query ref resolves through resolveEdgeQuery', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(edgesRecord({ kind: 'query', query: { atZ: 0 } }), box, undefined);
    if ('error' in result) throw new Error(`expected edges, got error: ${result.error.message}`);
    expect(result.length).toBe(4);
  });

  it('segment ref resolves by index', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(edgesRecord({ kind: 'segment', segmentId: 'e0' }), box, undefined);
    if ('error' in result) throw new Error(`expected edges, got error: ${result.error.message}`);
    expect(result.length).toBe(1);
  });

  it('out-of-range segment id surfaces the stable-only-within-one-lowering message', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(edgesRecord({ kind: 'segment', segmentId: 'e99' }), box, undefined);
    expect(result).toEqual({
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: 'fillet_e1',
        severity: 'error',
        message: `Invalid segment id 'e99' — segment IDs are stable only within one shape lowering.`,
        hint: 'Re-derive segment IDs from the current shape; segment IDs from earlier lowerings are not stable.',
      },
    });
  });

  it('non-numeric segment id surfaces the same message', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(edgesRecord({ kind: 'segment', segmentId: 'ex' }), box, undefined);
    if (!('error' in result)) throw new Error('expected error, got edges');
    expect(result.error.message).toBe(
      `Invalid segment id 'ex' — segment IDs are stable only within one shape lowering.`,
    );
  });

  it('segments ref resolves each id in order', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(edgesRecord({ kind: 'segments', segmentIds: ['e1', 'e3'] }), box, undefined);
    if ('error' in result) throw new Error(`expected edges, got error: ${result.error.message}`);
    expect(result.length).toBe(2);
  });

  it('bad id in segments ref surfaces the bare invalid-segment message', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(edgesRecord({ kind: 'segments', segmentIds: ['e0', 'e99'] }), box, undefined);
    expect(result).toEqual({
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: 'fillet_e1',
        severity: 'error',
        message: `Invalid segment id 'e99'.`,
        hint: 'Re-derive segment IDs from the current shape.',
      },
    });
  });

  it('unsupported ref kind surfaces not-supported with the kind name', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(
      edgesRecord({ kind: 'tracked', edgeName: 'x', selector: 'edge' }),
      box,
      undefined,
    );
    expect(result).toEqual({
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-supported',
        featureId: 'fillet_e1',
        severity: 'error',
        message: `Edge ref kind 'tracked' not supported.`,
        hint: 'Use a query, segment, or segments edge ref.',
      },
    });
  });
});
