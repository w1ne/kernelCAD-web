// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import {
  EMBED_THEME_VARS,
  embedCustomize,
  embedPosterUrl,
  embedPresentationMode,
  embedRevision,
  embedTheme,
  ensureUsableStorage,
  loadEmbedCode,
  resolveEmbedTheme,
  revisionPinnedMeshUrl,
} from './-embedConfig';

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

describe('embedCustomize', () => {
  it('is off unless the host opts in', () => {
    expect(embedCustomize(undefined)).toBe(false);
    expect(embedCustomize('0')).toBe(false);
    expect(embedCustomize('yes')).toBe(false);
    expect(embedCustomize('1')).toBe(true);
    expect(embedCustomize(1)).toBe(true);
    expect(embedCustomize('true')).toBe(true);
  });
});

describe('embedTheme', () => {
  it('pins light or dark and ignores anything else', () => {
    expect(embedTheme('light')).toBe('light');
    expect(embedTheme('dark')).toBe('dark');
    expect(embedTheme('auto')).toBeUndefined();
    expect(embedTheme('Light')).toBeUndefined();
    expect(embedTheme(undefined)).toBeUndefined();
  });

  it('follows the host preference unless pinned', () => {
    expect(resolveEmbedTheme(undefined, true)).toBe('dark');
    expect(resolveEmbedTheme(undefined, false)).toBe('light');
    expect(resolveEmbedTheme('light', true)).toBe('light');
    expect(resolveEmbedTheme('dark', false)).toBe('dark');
  });

  function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  it.each(['light', 'dark'] as const)('meets WCAG AA for every text pair (%s)', (theme) => {
    const v = EMBED_THEME_VARS[theme];
    const pairs: Array<[string, string]> = [
      ['--embed-fg', '--embed-bg'],
      ['--embed-fg', '--embed-surface'],
      ['--embed-fg-2', '--embed-surface'],
      ['--embed-fg-2', '--embed-bg'],
      ['--embed-on-accent', '--embed-accent'],
      ['--embed-on-accent', '--embed-accent-hover'],
      ['--embed-danger', '--embed-bg'],
    ];
    for (const [fg, bg] of pairs) {
      expect(contrast(v[fg as `--embed-${string}`], v[bg as `--embed-${string}`]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('embedPosterUrl', () => {
  const render = 'https://api.kernelcad.com/api/v1/projects/abc_1/og.png?v=2026-09-25T01%3A37%3A17.859Z';

  it("uses the page's og:image when it is this project's stored render", () => {
    expect(embedPosterUrl('abc_1', undefined, render)).toBe(render);
  });

  it('ignores the generic site image, another project and non-https images', () => {
    expect(embedPosterUrl('abc_1', undefined, 'https://kernelcad.com/og-image.png')).toBeUndefined();
    expect(embedPosterUrl('xyz', undefined, render)).toBeUndefined();
    expect(embedPosterUrl('abc_1', undefined, render.replace('https:', 'http:'))).toBeUndefined();
    expect(embedPosterUrl('abc_1', undefined, 'javascript:alert(1)')).toBeUndefined();
    expect(embedPosterUrl('abc_1', undefined, 'not a url')).toBeUndefined();
    expect(embedPosterUrl('abc_1', undefined, null)).toBeUndefined();
  });

  it('shows no poster for a pinned or invalid revision (the render is of the latest one)', () => {
    expect(embedPosterUrl('abc_1', 3, render)).toBeUndefined();
    expect(embedPosterUrl('abc_1', null, render)).toBeUndefined();
  });

  it('accepts a loopback render for the local browser test', () => {
    const local = 'http://127.0.0.1:5173/api/v1/projects/abc_1/og.png';
    expect(embedPosterUrl('abc_1', undefined, local)).toBe(local);
  });
});

describe('ensureUsableStorage', () => {
  function windowWith(blocked: boolean): Window {
    const win = {} as Window;
    const working = { getItem: () => null };
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(win, name, {
        configurable: true,
        get() {
          if (blocked) throw new DOMException('Access is denied for this document.', 'SecurityError');
          return working;
        },
      });
    }
    return win;
  }

  it('swaps blocked storage for page-lifetime storage', () => {
    const win = windowWith(true);
    expect(ensureUsableStorage(win)).toEqual(['localStorage', 'sessionStorage']);
    win.localStorage.setItem('kernelcad:viewMode3D', 'wireframe');
    expect(win.localStorage.getItem('kernelcad:viewMode3D')).toBe('wireframe');
    expect(win.localStorage.length).toBe(1);
    expect(win.localStorage.key(0)).toBe('kernelcad:viewMode3D');
    win.localStorage.removeItem('kernelcad:viewMode3D');
    expect(win.localStorage.getItem('kernelcad:viewMode3D')).toBeNull();
  });

  it('leaves working storage alone', () => {
    const win = windowWith(false);
    const before = win.localStorage;
    expect(ensureUsableStorage(win)).toEqual([]);
    expect(win.localStorage).toBe(before);
  });
});
