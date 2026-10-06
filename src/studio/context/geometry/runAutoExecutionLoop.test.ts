// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import { runAutoExecutionLoop } from './runAutoExecutionLoop';
import { clearStoredMeshCache, setHostedRevisionHint } from '../../scriptSource';

vi.mock('../../../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

afterEach(() => {
  clearStoredMeshCache();
  setHostedRevisionHint(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function deps(): ExecutionApplyDeps & { geometries: unknown[]; executeCode: ReturnType<typeof vi.fn> } {
  const executeCode = vi.fn();
  const geometries: unknown[] = [];
  const mainRevisionRef = { current: 0 } as MutableRefObject<number>;
  return {
    geometries,
    executeCode,
    engine: { executeCode } as unknown as ExecutionApplyDeps['engine'],
    mainRevisionRef,
    setCurrentCodeRevision: vi.fn(),
    setIsComputing: vi.fn(),
    setStaleMainResponsesDropped: vi.fn(),
    setGeometries: (next) => { geometries.splice(0, geometries.length, ...next); },
    setGeometryTransformOverrides: vi.fn(),
    setFeatureRecords: vi.fn(),
    setScriptParams: vi.fn(),
    setScriptReview: vi.fn(),
    setMeshDimensions: vi.fn(),
    setSketchesGeometries: vi.fn(),
    setPreviewGeometries: vi.fn(),
    setError: vi.fn(),
    setLastSuccessfulRevision: vi.fn(),
    setExecutionCount: vi.fn(),
    pushExecutionRecord: vi.fn(),
  };
}

describe('runAutoExecutionLoop stored artifact', () => {
  it('paints the stored mesh and does not run the worker', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubEnv('VITE_HOSTED_MESH', '');
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', pathname: '/p/OGm0lP_B', search: '?version=1' },
    });
    const face = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 1,
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://mesh.kernelcad.com/mesh-artifacts/OGm0lP_B/v1.json') {
        return {
          ok: true,
          json: async () => ({
            revision: 1,
            features: [{ featureId: 'rail', featureKind: 'box', predecessors: [], faces: [face] }],
            bounds: { min: [0, 0, 0], max: [1, 1, 1] },
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => null } as Response;
    });

    const apply = deps();
    await runAutoExecutionLoop(apply, 'assembly("tslot")', 0);
    expect(apply.executeCode).not.toHaveBeenCalled();
    expect(apply.geometries).toHaveLength(1);
    expect(apply.setPreviewGeometries).toHaveBeenCalledWith([]);
    expect(apply.setError).toHaveBeenCalledWith(null);
  });
});
