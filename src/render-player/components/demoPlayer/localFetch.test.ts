// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fetchLocalPlayerAsset } from './localFetch';

afterEach(() => vi.restoreAllMocks());

it('fetches local player assets without cookies, redirects or hosted authentication', async () => {
  const response = { ok: true } as Response;
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
  expect(await fetchLocalPlayerAsset('/records/build.json')).toBe(response);
  expect(fetch).toHaveBeenCalledWith('/records/build.json', {
    credentials: 'omit', mode: 'same-origin', redirect: 'error',
  });
});

it('refuses external, credential-bearing and non-HTTP asset URLs before fetching', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  for (const path of ['https://external.example/record.json', '//external.example/record.json',
    'data:application/json,{}', 'file:///tmp/record.json',
    new URL('/record.json', window.location.origin).href.replace('://', '://user:password@')]) {
    expect(() => fetchLocalPlayerAsset(path)).toThrow(/same-origin HTTP/);
  }
  expect(fetch).not.toHaveBeenCalled();
});
