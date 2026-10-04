// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const applyPartTransform = vi.fn();
const clearPartTransforms = vi.fn();

vi.mock('../../studio/hooks/useRecomputeResult', () => ({
  useRecomputeResult: () => ({
    setGeometryTransformOverride: applyPartTransform,
    clearGeometryTransformOverrides: clearPartTransforms,
  }),
}));

vi.mock('../../studio/components/animation/fetchCdnAnimBake', () => ({
  fetchCdnAnimArtifact: vi.fn(async () => ({
    revision: 2,
    frames: 2,
    metadata: {
      name: 'reach-cycle',
      virtual: true as const,
      tracks: [{
        param: 'yaw',
        keys: [
          { atMs: 0, value: 0, ease: 'linear' as const },
          { atMs: 4000, value: 1, ease: 'linear' as const },
        ],
      }],
      fps: 30,
      durationMs: 4000,
    },
    fps: 30,
    durationMs: 4000,
    times: [0, 4000],
    parts: [{ name: 'upper-arm', matrices: [
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1],
    ] }],
  })),
  fetchCdnAnimBake: vi.fn(async () => ({
    frames: 2,
    times: [0, 4000],
    durationMs: 4000,
    fps: 30,
    parts: [{ name: 'upper-arm', matrices: [
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1],
    ] }],
    collisions: [],
  })),
}));

import { EmbedAnimationOverlay } from './EmbedAnimationOverlay';

afterEach(() => {
  cleanup();
  applyPartTransform.mockClear();
  clearPartTransforms.mockClear();
});

describe('EmbedAnimationOverlay', () => {
  it('renders a compact Play + scrubber bar without Studio mode/speed chrome', async () => {
    render(<EmbedAnimationOverlay animUrl="https://mesh.example/anim-artifacts/x/v2.json" />);

    await waitFor(() => expect(screen.getByTestId('embed-animation-overlay')).toBeTruthy());
    expect(screen.getByTestId('animation-play-pause')).toBeTruthy();
    expect(screen.getByTestId('animation-scrubber')).toBeTruthy();
    expect(screen.getByText('reach-cycle')).toBeTruthy();
    expect(screen.queryByTestId('animation-mode')).toBeNull();
    expect(screen.queryByTestId('animation-speed')).toBeNull();
    expect(screen.queryByTestId('animation-editor-mode-note')).toBeNull();
  });
});
