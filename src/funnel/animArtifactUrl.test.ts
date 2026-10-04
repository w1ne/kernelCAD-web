// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { animArtifactUrlFromMeshUrl } from './animArtifactUrl';

describe('animArtifactUrlFromMeshUrl', () => {
  it('rewrites mesh-artifacts paths to anim-artifacts', () => {
    expect(
      animArtifactUrlFromMeshUrl(
        'https://mesh.kernelcad.com/mesh-artifacts/iRzbKK1V/v2.json',
      ),
    ).toBe('https://mesh.kernelcad.com/anim-artifacts/iRzbKK1V/v2.json');
  });

  it('rewrites latest.json', () => {
    expect(
      animArtifactUrlFromMeshUrl(
        'https://mesh.kernelcad.com/mesh-artifacts/iRzbKK1V/latest.json',
      ),
    ).toBe('https://mesh.kernelcad.com/anim-artifacts/iRzbKK1V/latest.json');
  });

  it('returns null for non-mesh-artifact URLs', () => {
    expect(animArtifactUrlFromMeshUrl('https://example.com/foo.json')).toBeNull();
  });
});
