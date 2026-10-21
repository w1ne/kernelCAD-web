// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import { useParamUpdate } from './useParamUpdate';

const meshParamEdits = vi.hoisted(() => vi.fn());
const needsFullKernel = vi.hoisted(() => vi.fn(() => true));

vi.mock('../../scriptSource', () => ({
    shouldUseHostedMesh: () => true,
    devMeshAvailable: () => false,
    needsFullKernel: (code: string) => needsFullKernel(code),
}));

vi.mock('./paramEditsForMesh', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./paramEditsForMesh')>();
    return { ...actual, meshParamEdits };
});

function meshPayload(bodyLength: number) {
    return {
        features: [],
        featureRecords: [],
        params: { bodyLength: { name: 'bodyLength', value: bodyLength } },
        bounds: { min: [0, 0, 0], max: [1, 1, 1] },
        review: { ok: true, diagnostics: [] },
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => { resolve = done; });
    return { promise, resolve };
}

function makeDeps(): ExecutionApplyDeps {
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

describe('useParamUpdate hosted mesh', () => {
    it('edits a plain script in the browser worker and paints the coarse frame first', async () => {
        needsFullKernel.mockReturnValue(false);
        meshParamEdits.mockReset();
        const deps = makeDeps();
        const executeCode = vi.fn(async (_code: string, opts?: { onPreview?: (result: { geometries: unknown[]; sketches: unknown[] }) => void }) => {
            opts?.onPreview?.({ geometries: [{ id: 'preview' }], sketches: [] });
            return { geometries: [{ id: 'final' }], sketches: [] };
        });
        deps.engine = { executeCode } as unknown as ExecutionApplyDeps['engine'];
        const { result } = renderHook(() => useParamUpdate('const w = param("Width", 10); return box(w, 1, 1);', null, 0, deps));
        await act(async () => {
            await result.current.updateParam([{ name: 'Width', value: 20 }]);
        });
        expect(meshParamEdits).not.toHaveBeenCalled();
        expect(executeCode).toHaveBeenCalledTimes(1);
        expect(deps.setGeometries).toHaveBeenCalledWith([{ id: 'preview' }]);
        expect(deps.setGeometries).toHaveBeenLastCalledWith([{ id: 'final' }]);
        needsFullKernel.mockReturnValue(true);
    });

    it('applies the mesh already running before it starts the next param value', async () => {
        needsFullKernel.mockReturnValue(true);
        const first = deferred<ReturnType<typeof meshPayload>>();
        const second = deferred<ReturnType<typeof meshPayload>>();
        meshParamEdits.mockReset();
        meshParamEdits.mockImplementationOnce(() => first.promise);
        meshParamEdits.mockImplementationOnce(() => second.promise);
        const deps = makeDeps();
        const { result } = renderHook(() => useParamUpdate('const body = box(1, 1, 1);', null, 0, deps));

        let settled!: Promise<void>;
        act(() => {
            settled = result.current.updateParam([{ name: 'bodyLength', value: 180 }]);
        });
        await act(async () => { await Promise.resolve(); });
        expect(meshParamEdits).toHaveBeenCalledTimes(1);
        expect(meshParamEdits.mock.calls[0][1]).toEqual({ bodyLength: 180 });

        act(() => {
            void result.current.updateParam([{ name: 'bodyLength', value: 200 }]);
        });
        expect(meshParamEdits).toHaveBeenCalledTimes(1);

        await act(async () => {
            first.resolve(meshPayload(180));
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(deps.setScriptParams).toHaveBeenCalledWith([expect.objectContaining({ value: 180 })]);
        expect(meshParamEdits).toHaveBeenCalledTimes(2);
        expect(meshParamEdits.mock.calls[1][1]).toEqual({ bodyLength: 200 });

        await act(async () => {
            second.resolve(meshPayload(200));
            await settled;
        });
        expect(deps.setScriptParams).toHaveBeenLastCalledWith([expect.objectContaining({ value: 200 })]);
        expect(deps.setIsComputing).toHaveBeenLastCalledWith(false);
        expect(deps.mainRevisionRef.current).toBe(2);
    });
});
