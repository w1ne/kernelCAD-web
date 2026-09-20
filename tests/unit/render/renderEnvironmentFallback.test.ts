// tests/unit/render/renderEnvironmentFallback.test.ts
//
// Gap #14: an HDRI environment that cannot be applied (404, decode failure,
// hung request, crashed page) must not abort the render. The CLI warns on
// stderr and continues with the default three-light rig (exit 0).

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Page } from 'playwright';
import {
  RENDER_ENVIRONMENT_TIMEOUT_MS,
  applyRenderEnvironmentWithFallback,
  pageApplyRenderEnvironment,
  renderEnvironmentSpecForCli,
} from '../../../src/agent/render/headlessRender';

type PageEvaluateStub = Pick<Page, 'evaluate'>;

function stubPage(
  impl: (fn: unknown, arg?: unknown) => Promise<unknown>,
): PageEvaluateStub {
  return { evaluate: vi.fn(impl) } as unknown as PageEvaluateStub;
}

function captureStderr(): string[] {
  const lines: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  });
  return lines;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe('renderEnvironmentSpecForCli', () => {
  it('maps preset keys to { preset }, other strings to { url }, and none to null', () => {
    expect(renderEnvironmentSpecForCli('studio')).toEqual({ preset: 'studio' });
    expect(renderEnvironmentSpecForCli('warehouse')).toEqual({ preset: 'warehouse' });
    expect(renderEnvironmentSpecForCli('/hdri/custom.hdr')).toEqual({ url: '/hdri/custom.hdr' });
    expect(renderEnvironmentSpecForCli('https://example.com/foo.hdr')).toEqual({
      url: 'https://example.com/foo.hdr',
    });
    expect(renderEnvironmentSpecForCli('none')).toBeNull();
  });
});

describe('pageApplyRenderEnvironment', () => {
  function installFakePlayer(setRenderEnvironment: (spec: unknown) => Promise<void>) {
    (globalThis as unknown as { window: unknown }).window = {
      __demoPlayer: { setRenderEnvironment },
    };
  }

  it('reports success when the player applies the spec', async () => {
    installFakePlayer(vi.fn(async () => undefined));
    const outcome = await pageApplyRenderEnvironment({ spec: { preset: 'studio' }, timeoutMs: 1000 });
    expect(outcome).toEqual({ applied: true });
  });

  it('reports the failure reason when the player rejects', async () => {
    installFakePlayer(vi.fn(async () => { throw new Error('RGBELoader: invalid header'); }));
    const outcome = await pageApplyRenderEnvironment({ spec: { url: '/broken.hdr' }, timeoutMs: 1000 });
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toContain('invalid header');
  });

  it('times out a hung apply and undoes it if it lands late', async () => {
    vi.useFakeTimers();
    const calls: unknown[] = [];
    let resolveLate: (() => void) | undefined;
    installFakePlayer(vi.fn((spec: unknown) => {
      calls.push(spec);
      if (spec === null) return Promise.resolve();
      return new Promise<void>((resolve) => {
        resolveLate = resolve;
      });
    }));

    const pending = pageApplyRenderEnvironment({ spec: { preset: 'studio' }, timeoutMs: 30 });
    await vi.advanceTimersByTimeAsync(31);
    const outcome = await pending;
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toMatch(/timed out after 30 ms/);
    expect(calls).toEqual([{ preset: 'studio' }]);

    // The late apply lands after the fallback: the page function must reset
    // the environment so the default rig stays authoritative.
    resolveLate?.();
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual([{ preset: 'studio' }, null]);
  });
});

describe('applyRenderEnvironmentWithFallback', () => {
  it('returns without a warning when the page applies the environment', async () => {
    const stderr = captureStderr();
    const page = stubPage(async () => ({ applied: true }));
    const outcome = await applyRenderEnvironmentWithFallback(page, 'studio', 50);
    expect(outcome).toEqual({ applied: true });
    expect(stderr).toHaveLength(0);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
  });

  it('warns naming the environment and reason, then resets to the default rig on failure', async () => {
    const stderr = captureStderr();
    let call = 0;
    const page = stubPage(async () => {
      call += 1;
      if (call === 1) {
        return { applied: false, reason: 'fetch for "http://x/nonexistent.hdr" responded with 404: Not Found' };
      }
      return undefined;
    });

    const outcome = await applyRenderEnvironmentWithFallback(page, '/nonexistent.hdr', 50);
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toContain('404');
    expect(stderr).toHaveLength(1);
    expect(stderr[0]).toContain('/nonexistent.hdr');
    expect(stderr[0]).toContain('404');
    expect(stderr[0]).toMatch(/default three-light rig/);
    // First evaluate applies, second resets to the default rig.
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  it('survives a rejected page.evaluate (crashed target) and still resets', async () => {
    const stderr = captureStderr();
    const page = stubPage(async () => {
      throw new Error('Target crashed');
    });
    const outcome = await applyRenderEnvironmentWithFallback(page, 'studio', 50);
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toContain('Target crashed');
    expect(stderr).toHaveLength(1);
    expect(stderr[0]).toContain('studio');
    expect(stderr[0]).toMatch(/default three-light rig/);
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  it('bounds a page that stops responding so the render can continue', async () => {
    const stderr = captureStderr();
    let call = 0;
    const page = stubPage(() => {
      call += 1;
      // The first (apply) call never settles; the fallback reset resolves.
      return call === 1 ? new Promise(() => {}) : Promise.resolve(undefined);
    });
    const startedAt = Date.now();
    const outcome = await applyRenderEnvironmentWithFallback(page, 'studio', 20, 30);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toMatch(/timed out after 20 ms/);
    expect(stderr[0]).toContain('studio');
    expect(stderr[0]).toMatch(/default three-light rig/);
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  it('uses a 30 s default budget', () => {
    expect(RENDER_ENVIRONMENT_TIMEOUT_MS).toBe(30_000);
  });
});
