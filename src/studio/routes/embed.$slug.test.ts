// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { embedPresentationMode, embedRevision, loadEmbedCode, revisionPinnedMeshUrl } from './-embedConfig';

describe('embedPresentationMode', () => {
  it('keeps the default embed model-only', () => {
    expect(embedPresentationMode(undefined)).toBe('viewer');
    expect(embedPresentationMode('anything-else')).toBe('viewer');
  });

  it('selects the read-only Studio shell only when requested', () => {
    expect(embedPresentationMode('studio')).toBe('studio');
  });

  it('distinguishes an absent revision from an invalid or pinned revision', () => {
    expect(embedRevision(undefined)).toBeUndefined();
    expect(embedRevision('7')).toBe(7);
    expect(embedRevision('07')).toBeNull();
    expect(embedRevision('0')).toBeNull();
    expect(embedRevision('7.5')).toBeNull();
    expect(embedRevision('latest')).toBeNull();
  });

  it('keeps an absent revision on the compatible live-project loader', async () => {
    const loadCurrent = vi.fn().mockResolvedValue('live-code');
    const loadRevision = vi.fn();

    await expect(loadEmbedCode(undefined, { loadCurrent, loadRevision })).resolves.toBe('live-code');
    expect(loadCurrent).toHaveBeenCalledOnce();
    expect(loadRevision).not.toHaveBeenCalled();
  });

  it('loads an explicit revision without consulting the live project', async () => {
    const loadCurrent = vi.fn();
    const loadRevision = vi.fn().mockResolvedValue('pinned-code');

    await expect(loadEmbedCode(7, { loadCurrent, loadRevision })).resolves.toBe('pinned-code');
    expect(loadRevision).toHaveBeenCalledWith(7);
    expect(loadCurrent).not.toHaveBeenCalled();
  });

  it('fails closed when an explicit revision is malformed or unavailable', async () => {
    const loadCurrent = vi.fn().mockResolvedValue('live-code');
    const loadRevision = vi.fn().mockRejectedValue(new Error('not_found'));

    await expect(loadEmbedCode(null, { loadCurrent, loadRevision })).resolves.toBeNull();
    expect(loadCurrent).not.toHaveBeenCalled();
    expect(loadRevision).not.toHaveBeenCalled();

    await expect(loadEmbedCode(7, { loadCurrent, loadRevision })).resolves.toBeNull();
    expect(loadCurrent).not.toHaveBeenCalled();
    expect(loadRevision).toHaveBeenCalledWith(7);
  });
});

describe('revisionPinnedMeshUrl', () => {
  const hashUrl =
    'https://mesh.kernelcad.com/mesh-artifacts/g/252958f1aa9b81cf90759df592f203a4904738ba1a827da9196fa94c7f321fea.json';

  it('rewrites geometry-hash CDN URLs to the revision-pinned object', () => {
    expect(revisionPinnedMeshUrl(hashUrl, 'kUtA7oVx', 2)).toBe(
      'https://mesh.kernelcad.com/mesh-artifacts/kUtA7oVx/v2.json',
    );
  });

  it('leaves revision-pinned and non-CDN URLs alone', () => {
    const pinned = 'https://mesh.kernelcad.com/mesh-artifacts/kUtA7oVx/v2.json';
    expect(revisionPinnedMeshUrl(pinned, 'kUtA7oVx', 2)).toBe(pinned);
    const api = 'https://api.kernelcad.com/api/v1/projects/kUtA7oVx/revisions/2/mesh-artifact';
    expect(revisionPinnedMeshUrl(api, 'kUtA7oVx', 2)).toBe(api);
  });

  it('needs a positive revision and slug before rewriting', () => {
    expect(revisionPinnedMeshUrl(hashUrl, 'kUtA7oVx', undefined)).toBe(hashUrl);
    expect(revisionPinnedMeshUrl(hashUrl, 'kUtA7oVx', null)).toBe(hashUrl);
    expect(revisionPinnedMeshUrl(hashUrl, '', 2)).toBe(hashUrl);
    expect(revisionPinnedMeshUrl(undefined, 'kUtA7oVx', 2)).toBeUndefined();
  });
});
