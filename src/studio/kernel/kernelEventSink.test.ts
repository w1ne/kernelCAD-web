// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/kernelEventSink.test.ts
//
// The sink seam: the DEV default logs once per event, production builds are a
// no-op, a custom sink receives events, and `null` restores the default. The
// per-event flow through the singleton lives in kernelSingleton.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { kernelEventSink, setKernelEventSink, type KernelEvent } from './kernelEventSink';

afterEach(() => {
  setKernelEventSink(null);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('kernelEventSink default', () => {
  it('console.debugs the event once under DEV', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const event: KernelEvent = { type: 'init', ms: 12 };

    kernelEventSink()(event);

    expect(debugSpy).toHaveBeenCalledExactlyOnceWith('[kernel]', event);
  });

  it('is a no-op when DEV is false', () => {
    vi.stubEnv('DEV', false);
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    kernelEventSink()({ type: 'build', ms: 3, featureCount: 1 });

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('routes to a custom sink and restores the default on null', () => {
    const seen: KernelEvent[] = [];
    setKernelEventSink((event) => seen.push(event));
    const event: KernelEvent = { type: 'params', ms: 1, bytes: 4 };

    kernelEventSink()(event);
    expect(seen).toEqual([event]);

    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    setKernelEventSink(null);
    kernelEventSink()(event);

    expect(seen).toEqual([event]);
    expect(debugSpy).toHaveBeenCalledExactlyOnceWith('[kernel]', event);
  });
});
