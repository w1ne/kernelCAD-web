// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { getTurnstileToken, type TurnstileApi } from './turnstile';

function fakeApi(behaviour: 'token' | 'error' | 'silent') {
  const api = {
    render: vi.fn((_el: HTMLElement, opts: { callback: (t: string) => void; 'error-callback': () => void }) => {
      if (behaviour === 'token') queueMicrotask(() => opts.callback('tok-123'));
      if (behaviour === 'error') queueMicrotask(() => opts['error-callback']());
      return 'w1';
    }),
    remove: vi.fn(),
  };
  return api as unknown as TurnstileApi & typeof api;
}

describe('getTurnstileToken', () => {
  it('returns undefined without loading anything when no site key is set', async () => {
    const loader = vi.fn();
    expect(await getTurnstileToken(undefined, { loader })).toBeUndefined();
    expect(await getTurnstileToken('', { loader })).toBeUndefined();
    expect(loader).not.toHaveBeenCalled();
  });

  it('renders with the site key and resolves with the token, then cleans up', async () => {
    const api = fakeApi('token');
    const token = await getTurnstileToken('site-key', { loader: async () => api });
    expect(token).toBe('tok-123');
    expect(api.render.mock.calls[0]![1]).toMatchObject({ sitekey: 'site-key', appearance: 'interaction-only' });
    expect(api.remove).toHaveBeenCalledWith('w1');
    expect(document.querySelectorAll('[data-kc-turnstile]')).toHaveLength(0);
  });

  it('rejects when the widget reports an error', async () => {
    const api = fakeApi('error');
    await expect(getTurnstileToken('k', { loader: async () => api })).rejects.toThrow(/turnstile/i);
    expect(api.remove).toHaveBeenCalled();
  });

  it('rejects when the widget never answers', async () => {
    vi.useFakeTimers();
    const api = fakeApi('silent');
    const p = getTurnstileToken('k', { loader: async () => api, timeoutMs: 1000 });
    const check = expect(p).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(1001);
    await check;
    vi.useRealTimers();
  });

  it('rejects when the script fails to load', async () => {
    await expect(getTurnstileToken('k', { loader: async () => { throw new Error('blocked'); } })).rejects.toThrow('blocked');
  });
});
