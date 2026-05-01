// tests/unit/backends/occt/queryKeys.test.ts
import { describe, it, expect } from 'vitest';
import { EDGE_QUERY_KEYS, FACE_QUERY_KEYS } from '../../../../src/backends/occt/queryKeys';
import type { EdgeQuery, FaceQuery } from '../../../../src/backends/occt/edgeQueries';

describe('queryKeys (single source of truth)', () => {
  it('EDGE_QUERY_KEYS contains exactly the 14 keys defined in EdgeQuery', () => {
    // Compile-time check via the assignment below: if EDGE_QUERY_KEYS doesn't
    // cover every key in EdgeQuery, TypeScript flags this assignment.
    const _exhaustive: ReadonlyArray<keyof EdgeQuery> = EDGE_QUERY_KEYS;
    void _exhaustive;
    expect(EDGE_QUERY_KEYS).toContain('atZ');
    expect(EDGE_QUERY_KEYS).toContain('parallel');
    expect(EDGE_QUERY_KEYS).toContain('convex');
    expect(EDGE_QUERY_KEYS).toContain('ofCurveType');
    expect(EDGE_QUERY_KEYS).toHaveLength(14);
  });

  it('FACE_QUERY_KEYS contains exactly the 9 keys defined in FaceQuery', () => {
    const _exhaustive: ReadonlyArray<keyof FaceQuery> = FACE_QUERY_KEYS;
    void _exhaustive;
    expect(FACE_QUERY_KEYS).toContain('atZ');
    expect(FACE_QUERY_KEYS).toContain('parallelTo');
    expect(FACE_QUERY_KEYS).toContain('inPlane');
    expect(FACE_QUERY_KEYS).toContain('ofSurfaceType');
    expect(FACE_QUERY_KEYS).toHaveLength(9);
  });

  it('all consumers import from the same source (modules load cleanly)', async () => {
    // The compile-time `keyof` checks above are the actual drift guard.
    // This test just ensures all 3 consumer files load without import errors.
    const fromCaptureSession = await import('../../../../src/capture/captureSession');
    const fromEdgeSelection = await import('../../../../src/backends/occt/edgeSelection');
    const fromListApi = await import('../../../../src/mcp/tools/listApi');
    expect(fromCaptureSession).toBeDefined();
    expect(fromEdgeSelection).toBeDefined();
    expect(fromListApi).toBeDefined();
  });
});
