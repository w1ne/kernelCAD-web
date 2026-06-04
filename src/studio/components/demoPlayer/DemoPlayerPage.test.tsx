// @vitest-environment jsdom
// src/components/demoPlayer/DemoPlayerPage.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock WebGLRenderer since jsdom has no WebGL support.
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  class FakeWebGLRenderer {
    domElement: HTMLCanvasElement;
    target: unknown = null;
    size = { width: 1280, height: 1080 };
    constructor() {
      this.domElement = document.createElement('canvas');
      this.domElement.toDataURL = () => 'data:image/png;base64,mask-test';
    }
    setSize(width?: number, height?: number) {
      if (typeof width === 'number' && typeof height === 'number') {
        this.size = { width, height };
      }
    }
    setPixelRatio() {}
    render() {}
    getRenderTarget() { return this.target; }
    setRenderTarget(target: unknown) { this.target = target; }
    readRenderTargetPixels(_target: unknown, _x: number, _y: number, width: number, height: number, pixels: Uint8Array) {
      for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        pixels[offset] = 10;
        pixels[offset + 1] = 20;
        pixels[offset + 2] = 30;
        pixels[offset + 3] = 255;
      }
    }
    getClearColor(color: { setRGB: (r: number, g: number, b: number) => unknown }) {
      color.setRGB(0, 0, 0);
      return color;
    }
    getClearAlpha() { return 1; }
    setClearColor() {}
    dispose() {}
  }
  return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

// S1: DemoPlayerPage's mesh fetches route through the apiBase helper now,
// which calls supabase.auth.getSession(). Stub it so the test stays
// behavior-equivalent to today (unsigned-in → relative URLs).
vi.mock('../../../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

import { cleanup, render, waitFor } from '@testing-library/react';
import { DemoPlayerPage } from './DemoPlayerPage';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';

describe('DemoPlayerPage.loadFeatureMeshes', () => {
  beforeEach(() => {
    delete (window as { __demoPlayer?: unknown }).__demoPlayer;
    window.history.pushState({}, '', '/demo-player');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    delete (window as { __demoPlayer?: unknown }).__demoPlayer;
  });

  it('builds one named THREE.Group per feature; group child count matches face count', async () => {
    render(<DemoPlayerPage />);
    // Wait for scene-ready callback to register window.__demoPlayer
    await new Promise((r) => setTimeout(r, 50));
    expect(window.__demoPlayer).toBeDefined();

    const fakeFace = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    const features: FeatureMeshSerialized[] = [
      { featureId: 'box_1', featureKind: 'box', predecessors: [], faces: [fakeFace, fakeFace] },
      { featureId: 'cylinder_1', featureKind: 'cylinder', predecessors: [], faces: [fakeFace] },
    ];
    const result = window.__demoPlayer!.loadFeatureMeshes(features, {
      min: [0, 0, 0], max: [1, 1, 1],
    });
    expect(result.groupCount).toBe(2);

    const dump = window.__demoPlayer!.dumpScene();
    // 3 face meshes total (box_1 has 2 faces, cylinder_1 has 1)
    expect(dump.meshCount).toBe(3);
  });

  it('fits loaded geometry tighter for mobile-readable demo videos', async () => {
    render(<DemoPlayerPage />);
    await new Promise((r) => setTimeout(r, 50));

    const fakeFace = {
      vertices: [0, 0, 0, 120, 0, 0, 0, 80, 10],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    window.__demoPlayer!.loadFeatureMeshes(
      [{ featureId: 'plate_1', featureKind: 'box', predecessors: [], faces: [fakeFace] }],
      { min: [0, 0, 0], max: [120, 80, 10] },
    );

    const dump = window.__demoPlayer!.dumpScene();
    const distance = Math.hypot(...dump.cameraPos);
    expect(distance).toBeLessThan(175);
  });

  it('builds meshes with polygonOffset enabled to prevent Z-fighting on coplanar assembly parts', async () => {
    // Assemblies fan into N FeatureMeshes (Task 7); adjacent parts whose
    // surfaces touch (column on plate, servo case flush against bracket)
    // produce coplanar geometry. Without polygonOffset, those surfaces
    // flicker as the camera rotates. Assert the renderer applies depth bias
    // (polygonOffset / Factor=1 / Units=1) on every mesh material it builds.
    render(<DemoPlayerPage />);
    await new Promise((r) => setTimeout(r, 50));

    const fakeFace = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    const features: FeatureMeshSerialized[] = [
      { featureId: 'plate_1', featureKind: 'box', predecessors: [], faces: [fakeFace] },
      { featureId: 'column_1', featureKind: 'box', predecessors: [], faces: [fakeFace, fakeFace] },
    ];
    window.__demoPlayer!.loadFeatureMeshes(features, {
      min: [0, 0, 0], max: [1, 1, 1],
    });

    const dump = window.__demoPlayer!.dumpScene();
    expect(dump.samplePolygonOffsets.length).toBeGreaterThanOrEqual(3);
    for (const probe of dump.samplePolygonOffsets) {
      expect(probe.enabled).toBe(true);
      expect(probe.factor).toBe(1);
      expect(probe.units).toBe(1);
    }
  });

  it('captures a deterministic object-id mask PNG for currently visible feature groups', async () => {
    render(<DemoPlayerPage />);
    await new Promise((r) => setTimeout(r, 50));

    const fakeFace = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    window.__demoPlayer!.loadFeatureMeshes(
      [
        {
          featureId: 'plate_1',
          featureKind: 'box',
          assemblyPartName: 'base plate',
          predecessors: [],
          faces: [fakeFace],
        },
        {
          featureId: 'shaft_1',
          featureKind: 'cylinder',
          assemblyPartName: 'drive shaft',
          predecessors: [],
          faces: [fakeFace],
        },
        {
          featureId: 'hidden_cut_1',
          featureKind: 'box',
          predecessors: [],
          faces: [fakeFace],
        },
      ],
      { min: [0, 0, 0], max: [1, 1, 1] },
    );
    window.__demoPlayer!.applyObjectVisibilityFilter({
      mode: 'hide',
      patterns: ['hidden_cut_1'],
    });

    const beforeCapture = window.__demoPlayer!.dumpScene();
    const mask = window.__demoPlayer!.captureMaskPng();
    const afterCapture = window.__demoPlayer!.dumpScene();

    expect(mask.pngDataUrl).toBe('data:image/png;base64,mask-test');
    expect(mask.objects).toEqual([
      {
        featureId: 'plate_1',
        names: ['plate_1', 'base plate', 'box'],
        color: '#000001',
        rgb: [0, 0, 1],
        visibleIndex: 0,
      },
      {
        featureId: 'shaft_1',
        names: ['shaft_1', 'drive shaft', 'cylinder'],
        color: '#000002',
        rgb: [0, 0, 2],
        visibleIndex: 1,
      },
    ]);
    expect(afterCapture.sampleOpacities).toEqual(beforeCapture.sampleOpacities);
    expect(afterCapture.samplePolygonOffsets).toEqual(beforeCapture.samplePolygonOffsets);
  });

  it('captures depth and normals channels through the offscreen inspection bridge and restores render state', async () => {
    render(<DemoPlayerPage />);
    await new Promise((r) => setTimeout(r, 50));

    const fakeFace = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    window.__demoPlayer!.loadFeatureMeshes(
      [{ featureId: 'plate_1', featureKind: 'box', predecessors: [], faces: [fakeFace] }],
      { min: [0, 0, 0], max: [1, 1, 1] },
    );
    window.__demoPlayer!.setRenderView('front');

    const beforeCapture = window.__demoPlayer!.dumpScene();
    const capture = window.__demoPlayer!.captureInspectionChannels({
      channels: ['depth', 'normals'],
      width: 4,
      height: 3,
    });
    const afterCapture = window.__demoPlayer!.dumpScene();

    expect(capture.channels.depth?.pngDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(capture.channels.normals?.pngDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(capture.metadata.depth).toMatchObject({
      encoding: 'linear-camera-depth-rgba8',
      units: 'mm',
      background: 'rgba(0,0,0,0)',
    });
    expect(capture.metadata.normals).toMatchObject({
      encoding: 'view-space-normal-rgb8',
      mapping: 'rgb = round((normal_view * 0.5 + 0.5) * 255)',
      background: 'rgba(0,0,0,0)',
    });
    expect(afterCapture.sampleOpacities).toEqual(beforeCapture.sampleOpacities);
    expect(afterCapture.samplePolygonOffsets).toEqual(beforeCapture.samplePolygonOffsets);
  });

  it('keeps loaded geometry mounted while the title card is shown', async () => {
    render(<DemoPlayerPage />);
    await new Promise((r) => setTimeout(r, 50));

    const fakeFace = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    window.__demoPlayer!.loadFeatureMeshes(
      [{ featureId: 'box_1', featureKind: 'box', predecessors: [], faces: [fakeFace] }],
      { min: [0, 0, 0], max: [1, 1, 1] },
    );

    window.__demoPlayer!.setTitleCard({ title: 'v0.3', tagline: 'demo', durationMs: 1000 });
    await new Promise((r) => setTimeout(r, 50));
    window.__demoPlayer!.setTitleCard(null);
    await new Promise((r) => setTimeout(r, 50));

    expect(window.__demoPlayer!.dumpScene().meshCount).toBe(1);
  });

  it('auto-loads an examples script from the dev mesh endpoint when script query is present', async () => {
    window.history.pushState(
      {},
      '',
      '/demo-player?script=examples/robot-arm/desktop-3axis-mates.kcad.ts',
    );

    const fakeFace = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { featureId: 'shoulder', featureKind: 'box', predecessors: [], faces: [fakeFace] },
        ],
        bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      }),
    } as Response);

    render(<DemoPlayerPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/__kernelcad/mesh?script=examples%2Frobot-arm%2Fdesktop-3axis-mates.kcad.ts',
        expect.objectContaining({ headers: {} }),
      );
      expect(window.__demoPlayer!.dumpScene().meshCount).toBe(1);
    });
  });

  it('auto-loads a build record and renders the first recorded iteration', async () => {
    window.history.pushState(
      {},
      '',
      '/demo-player?record=/records/robot-arm-skill-build.json',
    );

    const fakeFace = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 0,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/records/robot-arm-skill-build.json') {
        return {
          ok: true,
          json: async () => ({
            title: 'Robot arm loop',
            goal: 'Build a supported robot arm.',
            steps: [
              {
                id: '01',
                title: 'Floating boxes',
                status: 'failed',
                script: 'examples/robot-arm/skill-built-supported-arm-01-colliding.kcad.ts',
                review: {
                  ok: false,
                  summary: 'pose envelope found collisions',
                  blockingReasons: ['base-frame intersects upper-link'],
                },
              },
            ],
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          features: [
            { featureId: 'bad-arm', featureKind: 'box', predecessors: [], faces: [fakeFace] },
          ],
          bounds: { min: [0, 0, 0], max: [1, 1, 1] },
        }),
      } as Response;
    });

    render(<DemoPlayerPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/records/robot-arm-skill-build.json');
      expect(fetchMock).toHaveBeenCalledWith(
        '/__kernelcad/mesh?script=examples%2Frobot-arm%2Fskill-built-supported-arm-01-colliding.kcad.ts',
        expect.objectContaining({ headers: {} }),
      );
      expect(window.__demoPlayer!.dumpScene().meshCount).toBe(1);
    });
  });
});
