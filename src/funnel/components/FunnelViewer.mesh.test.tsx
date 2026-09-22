// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const harness = vi.hoisted(() => ({
  props: null as null | {
    initialCode?: string;
    suspendSourceExecution?: boolean;
    externalGeometries?: unknown[] | null;
  },
}));

vi.mock('../../studio/context/WorkbenchContext', () => ({
  WorkbenchProvider: (props: {
    children: ReactNode;
    initialCode?: string;
    suspendSourceExecution?: boolean;
    externalGeometries?: unknown[] | null;
  }) => {
    harness.props = props;
    return <div data-testid="workbench">{props.children}</div>;
  },
  useWorkbench: () => ({
    geometries: [],
    previewGeometries: [],
    sketchesGeometries: [],
    showSketches: false,
    viewMode3D: 'solid',
    isReady: true,
    isComputing: false,
    error: null,
  }),
}));

vi.mock('../../studio/components/Viewer', () => ({
  default: () => <div data-testid="viewer-canvas" />,
}));

import { FunnelViewer } from './FunnelViewer';

const artifact = {
  revision: 7,
  bounds: { min: [-1, -1, -1], max: [1, 1, 1] },
  features: [{
    featureId: 'ball',
    featureKind: 'solid',
    predecessors: [],
    faces: [{
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 1,
    }],
    material: { baseColor: '#f4f1e8', roughness: 0.35 },
  }],
};

afterEach(() => {
  cleanup();
  harness.props = null;
  vi.unstubAllGlobals();
});

describe('FunnelViewer mesh artifact', () => {
  it('loads the revision-matched mesh and does not evaluate the CAD source', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => artifact,
    })));
    render(
      <FunnelViewer
        code={'return sphere(20);'}
        meshUrl="https://cdn.example/ball.json"
        revision={7}
        instanceId="widget-1"
      />,
    );
    await waitFor(() => expect(harness.props?.suspendSourceExecution).toBe(true));
    expect(harness.props?.initialCode).toBe('');
    expect(harness.props?.externalGeometries?.length).toBe(1);
    expect(document.querySelector('[data-source-suspended="true"]')).toBeTruthy();
    expect(document.querySelector('[data-camera-bounds]')?.getAttribute('data-camera-bounds')).toBe('-1,-1,-1,1,1,1');
  });

  it('waits out a not-yet-stored artifact, then still does not fall back to browser OCCT', async () => {
    vi.useFakeTimers();
    const onPhaseChange = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: 'mesh_artifact_missing' }),
    })));
    render(
      <FunnelViewer
        code={'return sphere(20);'}
        meshUrl="https://cdn.example/missing.json"
        revision={7}
        onPhaseChange={onPhaseChange}
      />,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onPhaseChange).toHaveBeenCalledWith('loading_mesh', 'Loading mesh…');
    await act(async () => { await vi.advanceTimersByTimeAsync(95_000); });
    expect(onPhaseChange).toHaveBeenCalledWith(
      'viewer_failed',
      expect.stringContaining('mesh_artifact_missing'),
    );
    expect(document.querySelector('[data-source-fallback="true"]')).toBeFalsy();
    expect(harness.props?.suspendSourceExecution).toBeFalsy();
    vi.useRealTimers();
  });

  it('loads the mesh once a pending artifact appears', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, status: 404, json: async () => ({ error: 'mesh_artifact_missing' }) };
      }
      return { ok: true, status: 200, json: async () => artifact };
    }));
    render(
      <FunnelViewer
        code={'return sphere(20);'}
        meshUrl="https://cdn.example/ball.json"
        revision={7}
      />,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(harness.props?.externalGeometries?.length).toBe(1);
    expect(harness.props?.suspendSourceExecution).toBe(true);
    vi.useRealTimers();
  });

  it('reports viewer_failed to onPhaseChange when mesh fails with no source fallback', async () => {
    const onPhaseChange = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'mesh explode' }),
    })));
    render(
      <FunnelViewer
        code={''}
        meshUrl="https://cdn.example/missing.json"
        revision={7}
        instanceId="widget-1"
        onPhaseChange={onPhaseChange}
      />,
    );
    await waitFor(() => expect(onPhaseChange).toHaveBeenCalledWith(
      'viewer_failed',
      expect.stringContaining('mesh explode'),
    ));
  });
});
