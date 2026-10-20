// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import '@testing-library/jest-dom/vitest';
import type { SnapHit } from './measureSnap';

interface PointerHandlers {
  onTap: (point: { x: number; y: number }) => void;
  onEscape: () => void;
}

const measureMocks = vi.hoisted(() => ({
  handlers: null as PointerHandlers | null,
  hits: [] as SnapHit[],
  hitIndex: 0,
}));

vi.mock('@react-three/fiber', () => ({
  useThree: (selector: (state: { gl: { domElement: HTMLElement } }) => HTMLElement) =>
    selector({ gl: { domElement: document.createElement('canvas') } }),
}));
vi.mock('./useMeasurePointer', () => ({
  useMeasurePointer: (_element: HTMLElement, handlers: PointerHandlers) => { measureMocks.handlers = handlers; },
}));
vi.mock('./useViewerSnapper', () => ({
  useViewerSnapper: () => () => measureMocks.hits[measureMocks.hitIndex++] ?? null,
}));
vi.mock('./edgePolylines', () => ({ buildVisibleEdgePolylines: () => [] }));
vi.mock('../overlays/ScreenScaled', () => ({
  ScreenScaled: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../overlays/DimensionGraphic', () => ({
  DimensionGraphic: ({ label }: { label: string }) => <output data-testid="dimension-preview">{label}</output>,
}));

import { MeasureTool } from './MeasureTool';
import { markupStore } from '../../../markup/markupStore';

describe('MeasureTool persisted preview', () => {
  beforeEach(() => {
    measureMocks.handlers = null;
    measureMocks.hitIndex = 0;
    measureMocks.hits = [
      { kind: 'face', point: [0, 0, 0], refs: [] },
      { kind: 'face', point: [3, 4, 0], refs: [] },
    ];
    markupStore.clear();
  });

  afterEach(() => {
    cleanup();
    markupStore.clear();
  });

  it('clears the local dimension preview as soon as it is persisted', () => {
    render(<MeasureTool geometries={[]} itemNames={[]} hiddenIds={[]} onMeasurementAdded={(measurement) => markupStore.addMeasurement(measurement)} />);
    const tap = (x: number) => act(() => measureMocks.handlers?.onTap({ x, y: 0 }));

    tap(0);
    tap(1);

    const saved = markupStore.getSnapshot().measurements[0];
    expect(saved).toMatchObject({ type: 'distance', endpoints: [[0, 0, 0], [3, 4, 0]], value: 5 });
    expect(screen.queryByTestId('dimension-preview')).toBeNull();

    act(() => markupStore.removeMeasurement(saved!.id));
    expect(markupStore.getSnapshot().measurements).toEqual([]);
    expect(screen.queryByTestId('dimension-preview')).toBeNull();
  });
});
