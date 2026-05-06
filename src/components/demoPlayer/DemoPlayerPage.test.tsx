// @vitest-environment jsdom
// src/components/demoPlayer/DemoPlayerPage.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock WebGLRenderer since jsdom has no WebGL support.
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  class FakeWebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor() {
      this.domElement = document.createElement('canvas');
    }
    setSize() {}
    setPixelRatio() {}
    render() {}
    dispose() {}
  }
  return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

import { cleanup, render } from '@testing-library/react';
import { DemoPlayerPage } from './DemoPlayerPage';
import type { FeatureMeshSerialized } from '../../capture/featureMeshSerialize';

describe('DemoPlayerPage.loadFeatureMeshes', () => {
  beforeEach(() => {
    delete (window as { __demoPlayer?: unknown }).__demoPlayer;
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
});
