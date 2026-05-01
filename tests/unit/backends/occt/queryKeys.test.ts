// tests/unit/backends/occt/queryKeys.test.ts
import { describe, it, expect } from 'vitest';
import { EDGE_QUERY_KEYS, FACE_QUERY_KEYS } from '../../../../src/backends/occt/queryKeys';

describe('queryKeys (single source of truth)', () => {
  it('EDGE_QUERY_KEYS is the canonical key list (compile-time exhaustiveness in queryKeys.ts)', () => {
    // Compile-time exhaustiveness check lives in queryKeys.ts itself; this
    // test documents the intent and provides a runtime spot-check that the
    // most commonly-used keys are present.
    expect(EDGE_QUERY_KEYS).toContain('atZ');
    expect(EDGE_QUERY_KEYS).toContain('parallel');
    expect(EDGE_QUERY_KEYS).toContain('convex');
    expect(EDGE_QUERY_KEYS).toContain('ofCurveType');
  });

  it('FACE_QUERY_KEYS is the canonical key list (compile-time exhaustiveness in queryKeys.ts)', () => {
    // Compile-time exhaustiveness check lives in queryKeys.ts itself; this
    // test documents the intent and provides a runtime spot-check that the
    // most commonly-used keys are present.
    expect(FACE_QUERY_KEYS).toContain('atZ');
    expect(FACE_QUERY_KEYS).toContain('parallelTo');
    expect(FACE_QUERY_KEYS).toContain('inPlane');
    expect(FACE_QUERY_KEYS).toContain('ofSurfaceType');
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
