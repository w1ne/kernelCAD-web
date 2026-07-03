// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { proxiedAssetUrl } from './previewClient';

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com'));
afterEach(() => vi.unstubAllEnvs());

describe('proxiedAssetUrl', () => {
  it('rewrites Tripo CDN URLs through the API asset relay (their CDN blocks real origins)', () => {
    const glb = 'https://tripo-data.rg1.data.tripo3d.com/a/b/model.glb?Policy=x&Signature=y';
    expect(proxiedAssetUrl(glb)).toBe(
      `https://api.example.com/api/v1/preview/asset?src=${encodeURIComponent(glb)}`,
    );
  });

  it('leaves non-Tripo URLs untouched', () => {
    expect(proxiedAssetUrl('https://cdn.example.com/x.glb')).toBe('https://cdn.example.com/x.glb');
  });

  it('leaves unparseable strings untouched', () => {
    expect(proxiedAssetUrl('not a url')).toBe('not a url');
  });
});
