// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/context/geometry/useParamUpdate.test.ts
//
// The param-edit apply path's review retention, pinned at the payload seam: a
// payload WITHOUT `review` (a browser-kernel patch, which runs no review
// pipeline) keeps the last painted review, and a payload WITH `review`
// replaces it. Regression guard against blanking the Validity tab mid-drag.
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { meshParamEdits } from './paramEditsForMesh';
import { useParamUpdate } from './useParamUpdate';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import type { ScriptReviewSummary } from './types';

vi.mock('./paramEditsForMesh', () => ({ meshParamEdits: vi.fn() }));

const CODE = "const w = param('Width', 40); return box(w, 1, 1);";

const PREVIOUS: ScriptReviewSummary = { ok: true, diagnostics: [{ code: 'kept' }] };
const NEXT: ScriptReviewSummary = { ok: false, diagnostics: [{ code: 'fresh' }] };

type ReviewUpdater = (prev: ScriptReviewSummary | null) => ScriptReviewSummary | null;

function fakeDeps(): ExecutionApplyDeps {
  return {
    engine: {} as ExecutionApplyDeps['engine'],
    mainRevisionRef: { current: 0 },
    setCurrentCodeRevision: vi.fn(),
    setIsComputing: vi.fn(),
    setStaleMainResponsesDropped: vi.fn(),
    setGeometries: vi.fn(),
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

/** Run one edit through the hook's apply and return the updater it handed
 *  `setScriptReview`. */
async function applyEdit(review: ScriptReviewSummary | undefined): Promise<ReviewUpdater> {
  vi.mocked(meshParamEdits).mockResolvedValue({
    features: [],
    params: {},
    ...(review !== undefined ? { review } : {}),
  });
  const deps = fakeDeps();
  const { result } = renderHook(() => useParamUpdate(CODE, null, 0, deps));
  await result.current.updateParam([{ name: 'Width', value: 60 }]);
  const call = vi.mocked(deps.setScriptReview).mock.calls[0];
  expect(call).toBeDefined();
  return call![0] as ReviewUpdater;
}

afterEach(() => {
  vi.mocked(meshParamEdits).mockReset();
  vi.unstubAllEnvs();
});

describe('useParamUpdate apply review retention', () => {
  it('a payload without review keeps the previously painted review', async () => {
    vi.stubEnv('VITE_HOSTED_MESH', '1');
    const updater = await applyEdit(undefined);
    expect(updater(PREVIOUS)).toBe(PREVIOUS);
    expect(updater(null)).toBeNull();
  });

  it('a payload with review replaces the previously painted review', async () => {
    vi.stubEnv('VITE_HOSTED_MESH', '1');
    const updater = await applyEdit(NEXT);
    expect(updater(PREVIOUS)).toBe(NEXT);
  });
});
