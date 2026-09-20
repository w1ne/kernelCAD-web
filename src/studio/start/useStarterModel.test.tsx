// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStarterModel } from './useStarterModel';

const engine = vi.hoisted(() => ({ executeCode: vi.fn(), exportSTL: vi.fn(), exportSTEP: vi.fn() }));
vi.mock('../../shared/worker/geometryEngine', () => ({ geometryEngine: engine }));
const good = { geometries: [{ faces: [], volume: 100 }], sketches: [] };
beforeEach(() => { vi.clearAllMocks(); engine.executeCode.mockResolvedValue(good); });

describe('free starter editing', () => {
  it('can retry the same example after a failed first build', async () => {
    engine.executeCode.mockRejectedValueOnce(new Error('worker init failed'));
    const { result } = renderHook(() => useStarterModel());
    act(() => result.current.select('box'));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    act(() => result.current.select('box'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(engine.executeCode).toHaveBeenCalledTimes(2);
  });

  it('changes the model source and restores it with Undo', async () => {
    const { result } = renderHook(() => useStarterModel());
    act(() => result.current.select('bracket'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const original = result.current.code;
    act(() => result.current.resize('width', 90));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.code).not.toBe(original);
    expect(engine.executeCode).toHaveBeenLastCalledWith(result.current.code);
    act(() => result.current.undo());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.code).toBe(original);
  });

  it('keeps the last good preview and blocks download when an edit fails', async () => {
    const { result } = renderHook(() => useStarterModel());
    act(() => result.current.select('box'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    engine.executeCode.mockRejectedValueOnce(new Error('kernel failure'));
    act(() => result.current.resize('width', 90));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.geometries).toEqual(good.geometries);
    expect(result.current.ready).toBe(false);
    await expect(result.current.exportModel('stl')).rejects.toThrow();
    expect(engine.exportSTL).not.toHaveBeenCalled();
  });

  it('ignores a late build after selecting another example', async () => {
    let resolveOld!: (value: typeof good) => void;
    engine.executeCode.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const { result } = renderHook(() => useStarterModel());
    act(() => result.current.select('bracket'));
    await waitFor(() => expect(engine.executeCode).toHaveBeenCalledTimes(1));
    act(() => result.current.select('stand'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => resolveOld({ geometries: [], sketches: [] }));
    expect(result.current.geometries).toEqual(good.geometries);
    expect(result.current.model?.id).toBe('stand');
  });

  it('exports the edited source without an account or server', async () => {
    const blob = new Blob(['solid test']);
    engine.exportSTL.mockResolvedValue(blob);
    const { result } = renderHook(() => useStarterModel());
    act(() => result.current.select('stand'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.resize('width', 95));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await expect(result.current.exportModel('stl')).resolves.toBe(blob);
    expect(engine.exportSTL).toHaveBeenCalledWith(result.current.code);
  });
});
