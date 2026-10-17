// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { useExplodedView } from './useExplodedView';

function mesh(name: string, min: [number, number, number], max: [number, number, number]): GeometryResult {
  return {
    faces: [{ vertices: new Float32Array([...min, ...max]), indices: new Uint32Array([0, 1, 0]), normals: new Float32Array(6), faceId: 0 }],
    assemblyPartName: name,
  };
}

const a = mesh('a', [-10, 0, 0], [-8, 2, 2]);
const b = mesh('b', [8, 0, 0], [10, 2, 2]);

describe('useExplodedView', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }); });
  afterEach(() => { vi.useRealTimers(); });

  it('is not available for a single part', () => {
    const { result } = renderHook(() => useExplodedView([a], []));
    expect(result.current.available).toBe(false);
  });

  it('animates out on toggle and back in on the second toggle', () => {
    const geometries = [a, b];
    const { result } = renderHook(() => useExplodedView(geometries, []));
    expect(result.current.available).toBe(true);
    expect(result.current.geometries).toBe(geometries);

    act(() => result.current.toggle());
    expect(result.current.on).toBe(true);
    act(() => { vi.advanceTimersByTime(100); });
    const mid = result.current.geometries[1]!.transform![12]!;
    act(() => { vi.advanceTimersByTime(1000); });
    const end = result.current.geometries[1]!.transform![12]!;
    expect(mid).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(mid);
    expect(result.current.mode).toBe('radial');

    // The slider follows at once, no transition.
    act(() => result.current.setAmount(1));
    expect(result.current.geometries[1]!.transform![12]!).toBeGreaterThan(end);

    act(() => result.current.toggle());
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.on).toBe(false);
    expect(result.current.geometries).toBe(geometries);
  });

  it('turns off at once when the model moves underneath it (animation or edit)', () => {
    let geometries = [a, b];
    const { result, rerender } = renderHook(() => useExplodedView(geometries, []));
    act(() => result.current.toggle());
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.geometries).not.toBe(geometries);

    geometries = [a, { ...b, transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 5, 0, 1] }];
    rerender();
    expect(result.current.on).toBe(false);
    expect(result.current.geometries).toBe(geometries);
  });

  it('keeps the explode across a re-render with the same model', () => {
    const { result, rerender } = renderHook(({ g }) => useExplodedView(g, []), { initialProps: { g: [a, b] } });
    act(() => result.current.toggle());
    rerender({ g: [a, { ...b }] });
    expect(result.current.on).toBe(true);
  });
});
