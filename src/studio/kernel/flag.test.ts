// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/flag.test.ts
//
// The browser-kernel flag matrix: env (off/auto/force) x `?kernel=` query
// override x hosted/localhost x WebAssembly present/absent x deviceMemory
// low/high x Safari-iOS UA. The globals are injected with `vi.stubGlobal` and
// undone in `afterEach` (plus the suite-level file scrub in vitest.setup.ts).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserKernelEnabled, browserKernelMode, isSafariIos } from './flag';

const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI_IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPADOS_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

function stubBrowser(opts: {
  hostname?: string;
  search?: string;
  userAgent?: string;
  deviceMemory?: number;
  maxTouchPoints?: number;
} = {}): void {
  vi.stubGlobal('window', {
    location: { hostname: opts.hostname ?? 'app.kernelcad.com', search: opts.search ?? '', pathname: '/' },
  });
  vi.stubGlobal('navigator', {
    userAgent: opts.userAgent ?? DESKTOP_CHROME_UA,
    ...(opts.deviceMemory !== undefined ? { deviceMemory: opts.deviceMemory } : {}),
    ...(opts.maxTouchPoints !== undefined ? { maxTouchPoints: opts.maxTouchPoints } : {}),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('browserKernelMode', () => {
  it('is off without a window (SSR), even when the env forces it', () => {
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    expect(browserKernelMode()).toBe('off');
  });

  it('defaults to off when the env var is missing or unrecognized', () => {
    stubBrowser();
    expect(browserKernelMode()).toBe('off');
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'bogus');
    expect(browserKernelMode()).toBe('off');
  });

  it('reads auto and force from the env', () => {
    stubBrowser();
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'auto');
    expect(browserKernelMode()).toBe('auto');
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    expect(browserKernelMode()).toBe('force');
  });

  it('lets ?kernel=off|force override the env', () => {
    stubBrowser({ search: '?kernel=force' });
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'off');
    expect(browserKernelMode()).toBe('force');

    stubBrowser({ search: '?kernel=off' });
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    expect(browserKernelMode()).toBe('off');
  });

  it('ignores a query value outside off|force', () => {
    stubBrowser({ search: '?kernel=auto' });
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'auto');
    expect(browserKernelMode()).toBe('auto');

    stubBrowser({ search: '?kernel=yes' });
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    expect(browserKernelMode()).toBe('force');
  });
});

describe('browserKernelEnabled: auto gate', () => {
  function stubAuto(opts: Parameters<typeof stubBrowser>[0] = {}): void {
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'auto');
    stubBrowser(opts);
  }

  it('is on for the hosted app with WebAssembly and an ordinary device', () => {
    stubAuto();
    expect(browserKernelEnabled()).toBe(true);
  });

  it('is off on localhost', () => {
    stubAuto({ hostname: 'localhost' });
    expect(browserKernelEnabled()).toBe(false);
  });

  it('is off without WebAssembly', () => {
    stubAuto();
    vi.stubGlobal('WebAssembly', undefined);
    expect(browserKernelEnabled()).toBe(false);
  });

  it('is off on a low-memory device and on for 4 GB and up', () => {
    stubAuto({ deviceMemory: 2 });
    expect(browserKernelEnabled()).toBe(false);
    stubAuto({ deviceMemory: 4 });
    expect(browserKernelEnabled()).toBe(true);
    stubAuto({ deviceMemory: 8 });
    expect(browserKernelEnabled()).toBe(true);
  });

  it('is off on Safari-iOS but on for Chrome-iOS and desktop Safari', () => {
    stubAuto({ userAgent: SAFARI_IOS_UA });
    expect(browserKernelEnabled()).toBe(false);
    stubAuto({ userAgent: SAFARI_IOS_UA.replace('Version/17.5 Mobile/15E148 Safari/604.1', 'CriOS/126.0.0.0 Mobile/15E148 Safari/604.1') });
    expect(browserKernelEnabled()).toBe(true);
    stubAuto({ userAgent: DESKTOP_CHROME_UA });
    expect(browserKernelEnabled()).toBe(true);
  });

  it('is off on an iPadOS desktop-mode UA (touch-capable Macintosh), on for a real Mac', () => {
    stubAuto({ userAgent: IPADOS_DESKTOP_UA, maxTouchPoints: 5 });
    expect(browserKernelEnabled()).toBe(false);
    stubAuto({ userAgent: IPADOS_DESKTOP_UA, maxTouchPoints: 0 });
    expect(browserKernelEnabled()).toBe(true);
  });
});

describe('browserKernelEnabled: off and force', () => {
  it('off is always false', () => {
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'off');
    stubBrowser();
    expect(browserKernelEnabled()).toBe(false);
  });

  it('force skips the capability gate but still needs WebAssembly', () => {
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    stubBrowser({ hostname: 'localhost', userAgent: SAFARI_IOS_UA, deviceMemory: 2 });
    expect(browserKernelEnabled()).toBe(true);

    vi.stubGlobal('WebAssembly', undefined);
    expect(browserKernelEnabled()).toBe(false);
  });

  it('a query override flips the env mode', () => {
    stubBrowser({ hostname: 'localhost', search: '?kernel=force' });
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'off');
    expect(browserKernelEnabled()).toBe(true);

    stubBrowser({ search: '?kernel=off' });
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    expect(browserKernelEnabled()).toBe(false);
  });

  it('is off without a window, for any mode', () => {
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    expect(browserKernelEnabled()).toBe(false);
  });
});

describe('isSafariIos', () => {
  it('matches iOS Safari UAs only', () => {
    vi.stubGlobal('navigator', { userAgent: SAFARI_IOS_UA });
    expect(isSafariIos()).toBe(true);

    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
    expect(isSafariIos()).toBe(true);

    vi.stubGlobal('navigator', { userAgent: SAFARI_IOS_UA.replace('Version/17.5 Mobile/15E148 Safari/604.1', 'CriOS/126.0.0.0 Mobile/15E148 Safari/604.1') });
    expect(isSafariIos()).toBe(false);

    vi.stubGlobal('navigator', { userAgent: SAFARI_IOS_UA.replace('Version/17.5 Mobile/15E148 Safari/604.1', 'FxiOS/126.0 Mobile/15E148 Safari/604.1') });
    expect(isSafariIos()).toBe(false);

    vi.stubGlobal('navigator', { userAgent: DESKTOP_CHROME_UA });
    expect(isSafariIos()).toBe(false);

    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0' });
    expect(isSafariIos()).toBe(false);
  });

  it('treats a touch-capable Macintosh UA as iPadOS desktop mode', () => {
    vi.stubGlobal('navigator', { userAgent: IPADOS_DESKTOP_UA, maxTouchPoints: 5 });
    expect(isSafariIos()).toBe(true);

    vi.stubGlobal('navigator', { userAgent: IPADOS_DESKTOP_UA, maxTouchPoints: 0 });
    expect(isSafariIos()).toBe(false);

    vi.stubGlobal('navigator', { userAgent: IPADOS_DESKTOP_UA.replace('Version/17.5 Safari/605.1.15', 'CriOS/126.0.0.0 Safari/605.1.15'), maxTouchPoints: 5 });
    expect(isSafariIos()).toBe(false);
  });

  it('is false without a navigator', () => {
    vi.stubGlobal('navigator', undefined);
    expect(isSafariIos()).toBe(false);
  });
});
