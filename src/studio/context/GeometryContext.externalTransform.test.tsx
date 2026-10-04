// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
/**
 * Regression: CDN mesh-artifact path (FunnelViewer / ChatGPT embed) must apply
 * animation transform overrides to `externalGeometries`. Without this, Play
 * advances the scrubber while part meshes stay at rest pose.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeometryProvider, useGeometry } from './GeometryContext';
import type { GeometryResult } from '../../shared/worker/geometryEngine';

vi.mock('../../shared/worker/geometryEngine', () => ({
  GeometryEngine: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      executeCode: vi.fn(),
    }),
  },
}));

vi.mock('../../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

const REST = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const POSED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 40, 0, 12, 1];

const externalGeometries: GeometryResult[] = [
  {
    faces: [],
    assemblyPartName: 'upper-arm',
    transform: [...REST],
  },
  {
    faces: [],
    assemblyPartName: 'base',
    transform: [...REST],
  },
];

function Probe() {
  const { geometries, setGeometryTransformOverride, clearGeometryTransformOverrides } = useGeometry();
  const arm = geometries.find((g) => g.assemblyPartName === 'upper-arm');
  return (
    <div>
      <span data-testid="arm-tx">{arm?.transform?.[12] ?? 'missing'}</span>
      <span data-testid="arm-matrix">{JSON.stringify(arm?.transform ?? null)}</span>
      <button
        type="button"
        data-testid="pose-arm"
        onClick={() => setGeometryTransformOverride('upper-arm', [...POSED])}
      >
        pose
      </button>
      <button
        type="button"
        data-testid="clear-pose"
        onClick={() => clearGeometryTransformOverrides()}
      >
        clear
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe('GeometryProvider externalGeometries transform overrides', () => {
  it('applies setGeometryTransformOverride onto CDN mesh parts (not only script geometries)', async () => {
    render(
      <GeometryProvider
        code=""
        suspendSourceExecution
        externalGeometries={externalGeometries}
      >
        <Probe />
      </GeometryProvider>,
    );

    expect(screen.getByTestId('arm-tx').textContent).toBe('0');

    await act(async () => {
      screen.getByTestId('pose-arm').click();
    });

    expect(screen.getByTestId('arm-tx').textContent).toBe('40');
    expect(JSON.parse(screen.getByTestId('arm-matrix').textContent ?? 'null')).toEqual(POSED);

    await act(async () => {
      screen.getByTestId('clear-pose').click();
    });

    // Cleared overrides fall back to the artifact rest pose, not null.
    expect(screen.getByTestId('arm-tx').textContent).toBe('0');
  });
});
