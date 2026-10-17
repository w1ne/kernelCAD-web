// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The two-tier (coarse preview → display refine) paint of the debounced edit
// loop, for both the node dev-kernel POST path and the in-browser worker path.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import { runAutoExecutionLoop } from './runAutoExecutionLoop';
import type { BackendMeshPayload } from '../../scriptSource';

const mocks = vi.hoisted(() => ({
  meshSourceDev: vi.fn(),
  devMeshAvailable: vi.fn(() => true),
  needsFullKernel: vi.fn(() => true),
}));

vi.mock('../../scriptSource', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../scriptSource')>();
  return {
    ...actual,
    shouldUseHostedMesh: () => false,
    devMeshAvailable: (...args: unknown[]) => mocks.devMeshAvailable(...args),
    needsFullKernel: (...args: unknown[]) => mocks.needsFullKernel(...args),
    meshSourceDev: (...args: unknown[]) => mocks.meshSourceDev(...args),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  mocks.meshSourceDev.mockReset();
  mocks.devMeshAvailable.mockReturnValue(true);
  mocks.needsFullKernel.mockReturnValue(true);
});

function deps(): ExecutionApplyDeps & { geometries: unknown[] } {
  const geometries: unknown[] = [];
  const setGeometries = vi.fn((next: Parameters<ExecutionApplyDeps['setGeometries']>[0]) => {
    geometries.splice(0, geometries.length, ...next);
  });
  return {
    geometries,
    engine: { executeCode: vi.fn() } as unknown as ExecutionApplyDeps['engine'],
    mainRevisionRef: { current: 0 } as MutableRefObject<number>,
    setCurrentCodeRevision: vi.fn(),
    setIsComputing: vi.fn(),
    setStaleMainResponsesDropped: vi.fn(),
    setGeometries,
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

/** Empty-feature bridge payload — enough for the two paints to be observed by
 *  call count/order; geometry conversion is not what these tests pin. */
function payload(): BackendMeshPayload {
  return {
    features: [],
    featureRecords: [],
    bounds: { min: [0, 0, 0], max: [0, 0, 0] },
    params: {},
  } as unknown as BackendMeshPayload;
}

describe('runAutoExecutionLoop two-tier dev-kernel paint', () => {
  const CODE = 'return box(1, 1, 1);';

  it('paints the coarse preview, then replaces it with the display pass', async () => {
    const d = deps();
    mocks.meshSourceDev.mockResolvedValueOnce(payload()).mockResolvedValueOnce(payload());

    await runAutoExecutionLoop(d, CODE, 0);

    expect(mocks.meshSourceDev).toHaveBeenNthCalledWith(1, CODE, undefined, { quality: 'coarse' });
    expect(mocks.meshSourceDev).toHaveBeenNthCalledWith(2, CODE);
    expect(d.setGeometries).toHaveBeenCalledTimes(2);
    // One execution record per edit: the coarse paint is provisional.
    expect(d.pushExecutionRecord).toHaveBeenCalledTimes(1);
  });

  it('drops the display paint when a newer revision lands mid-refine', async () => {
    const d = deps();
    mocks.meshSourceDev
      .mockResolvedValueOnce(payload())
      .mockImplementationOnce(async () => {
        // A newer edit claimed the revision while the display pass was running.
        d.mainRevisionRef.current += 1;
        return payload();
      });

    await runAutoExecutionLoop(d, CODE, 0);

    expect(d.setGeometries).toHaveBeenCalledTimes(1); // coarse paint only
    expect(d.setStaleMainResponsesDropped).toHaveBeenCalledTimes(1);
    expect(d.pushExecutionRecord).not.toHaveBeenCalled();
  });

  it('paints the worker preview frame, then the display result, in one EXECUTE', async () => {
    const d = deps();
    mocks.needsFullKernel.mockReturnValue(false);
    const executeCode = vi.mocked(d.engine.executeCode);
    executeCode.mockImplementationOnce(async (_code, opts) => {
      // The real worker posts EXECUTE_PREVIEW before resolving the request.
      opts?.onPreview?.({ geometries: [], sketches: [] });
      return { geometries: [], sketches: [] };
    });

    await runAutoExecutionLoop(d, CODE, 0);

    expect(executeCode).toHaveBeenCalledTimes(1);
    expect(executeCode.mock.calls[0][1]).toMatchObject({ quality: 'coarse' });
    expect(typeof executeCode.mock.calls[0][1]?.onPreview).toBe('function');
    expect(d.setGeometries).toHaveBeenCalledTimes(2); // preview + final
    expect(d.pushExecutionRecord).toHaveBeenCalledTimes(1);
  });
});
