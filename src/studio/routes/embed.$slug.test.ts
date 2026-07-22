// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { embedPresentationMode, embedRevision, loadEmbedCode } from './-embedConfig';

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
