// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  meshArtifactLatestUrl,
  shouldAcceptLatestMeshFallback,
} from './meshArtifactFallback';

describe('meshArtifactFallback', () => {
  it('derives latest.json from a revision-pinned CDN URL', () => {
    expect(meshArtifactLatestUrl('https://mesh.kernelcad.com/mesh-artifacts/PDxuTFiQ/v1.json')).toBe(
      'https://mesh.kernelcad.com/mesh-artifacts/PDxuTFiQ/latest.json',
    );
    expect(meshArtifactLatestUrl('https://mesh.kernelcad.com/mesh-artifacts/g/abc.json')).toBeNull();
    expect(meshArtifactLatestUrl('https://api.kernelcad.com/mesh/x')).toBeNull();
  });

  it('accepts latest only when it is not older than the requested pin', () => {
    expect(shouldAcceptLatestMeshFallback(1, 5)).toBe(true);
    expect(shouldAcceptLatestMeshFallback(5, 5)).toBe(true);
    expect(shouldAcceptLatestMeshFallback(6, 5)).toBe(false);
    expect(shouldAcceptLatestMeshFallback(null, 5)).toBe(true);
  });
});
