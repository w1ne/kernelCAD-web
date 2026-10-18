// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/kernelSingleton.test.ts
//
// Warm-swap settling: a warm for a different source than the one currently
// warm/warming must not dispose the running worker immediately — hosted code
// edits apply on a debounce, and an immediate swap would dispose the worker
// (possibly mid-download) and re-warm for every debounced edit. The swap is
// scheduled `WARM_SETTLE_MS` out, latest wins, and a change back to the
// current source cancels it. A dispose during the pending window drops the
// swap, and the hidden-tab deferral composes (hidden → wait for visible →
// settle).
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WARM_SETTLE_MS,
  __resetBrowserKernelForTests,
  __setBrowserKernelForTests,
  browserKernelForSource,
  disposeBrowserKernel,
  warmBrowserKernel,
  warmKernelOnOpen,
} from './kernelSingleton';
import type { BrowserKernel, KernelStatus } from './browserKernelClient';

interface FakeKernel {
  kernel: BrowserKernel;
  warmMock: ReturnType<typeof vi.fn>;
  disposeMock: ReturnType<typeof vi.fn>;
}

function fakeKernel(status: KernelStatus = 'warm'): FakeKernel {
  const warmMock = vi.fn(async () => {});
  const disposeMock = vi.fn();
  const kernel: BrowserKernel = {
    status: () => status,
    warm: warmMock,
    params: vi.fn(async () => { throw new Error('params not expected'); }),
    fallbackReason: () => null,
    dispose: disposeMock,
  };
  return { kernel, warmMock, disposeMock };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  __resetBrowserKernelForTests();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('warm swap settling', () => {
  it('swaps once, to the latest source, only after the settle delay', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    warmBrowserKernel('source-b', 'b.kcad.ts');
    warmBrowserKernel('source-c', 'c.kcad.ts');

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();
    // The old worker keeps serving routing until the swap actually fires.
    expect(browserKernelForSource('source-a')).toBe(h.kernel);

    vi.advanceTimersByTime(WARM_SETTLE_MS - 1);
    expect(h.disposeMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-c', 'c.kcad.ts');
    expect(browserKernelForSource('source-c')).toBe(h.kernel);
  });

  it('cancels the swap when the source changes back to the current one', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    warmBrowserKernel('source-b', 'b.kcad.ts');
    warmBrowserKernel('source-a', 'a.kcad.ts');

    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-a', 'a.kcad.ts');
  });

  it('drops the swap when the kernel is disposed during the pending window', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    warmBrowserKernel('source-b', 'b.kcad.ts');
    disposeBrowserKernel();

    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).not.toHaveBeenCalled();
  });

  it('__resetBrowserKernelForTests clears a pending swap timer', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    warmBrowserKernel('source-b', 'b.kcad.ts');
    __resetBrowserKernelForTests();

    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.warmMock).not.toHaveBeenCalled();
  });

  it('warms immediately when nothing is warm yet', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, null);

    warmBrowserKernel('source-a', 'a.kcad.ts');

    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-a', 'a.kcad.ts');
    vi.advanceTimersByTime(WARM_SETTLE_MS);
    expect(h.disposeMock).not.toHaveBeenCalled();
  });
});

describe('warm swap settling with the hidden-tab deferral', () => {
  let visibility: 'visible' | 'hidden';
  let visibilitySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('VITE_STUDIO_BROWSER_KERNEL', 'force');
    visibility = 'hidden';
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  });

  afterEach(() => {
    visibilitySpy.mockRestore();
  });

  it('waits for visibility, then settles before swapping', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    warmKernelOnOpen('source-b', 'b.kcad.ts');
    warmKernelOnOpen('source-c', 'c.kcad.ts');
    vi.advanceTimersByTime(WARM_SETTLE_MS);
    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(h.warmMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(WARM_SETTLE_MS);
    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-c', 'c.kcad.ts');
  });

  it('defers instead of swapping when the tab hides during the settle window, then warms the latest source once visible', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');
    visibility = 'visible';

    warmKernelOnOpen('source-b', 'b.kcad.ts');
    warmKernelOnOpen('source-c', 'c.kcad.ts');
    visibility = 'hidden';

    vi.advanceTimersByTime(WARM_SETTLE_MS);

    // Hidden at settle: no dispose, no worker download, old worker still serves.
    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();
    expect(browserKernelForSource('source-a')).toBe(h.kernel);

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    // Visible again: the deferred warm still settles before swapping.
    expect(h.warmMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(WARM_SETTLE_MS);
    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-c', 'c.kcad.ts');
  });

  it('keeps only the latest source when another arrives while the deferred warm is pending', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');
    visibility = 'visible';

    warmKernelOnOpen('source-b', 'b.kcad.ts');
    visibility = 'hidden';
    vi.advanceTimersByTime(WARM_SETTLE_MS);
    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();

    warmKernelOnOpen('source-c', 'c.kcad.ts');
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-c', 'c.kcad.ts');
  });

  it('warms the newest source when a newer hidden apply supersedes an older armed swap', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');
    visibility = 'visible';

    warmKernelOnOpen('source-b', 'b.kcad.ts');
    visibility = 'hidden';
    warmKernelOnOpen('source-c', 'c.kcad.ts');

    // b's settle timer was superseded by the newer hidden apply: advancing
    // past it must not fire it and re-bank b over c.
    vi.advanceTimersByTime(WARM_SETTLE_MS);
    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-c', 'c.kcad.ts');
    expect(browserKernelForSource('source-c')).toBe(h.kernel);
  });

  it('cancels the older armed swap and warms nothing when the newest hidden apply is server-only', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');
    visibility = 'visible';

    warmKernelOnOpen('source-b', 'b.kcad.ts');
    visibility = 'hidden';
    warmKernelOnOpen('const p = await lib.fromSTEP("part.step");', 'step.kcad.ts');

    vi.advanceTimersByTime(WARM_SETTLE_MS);

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();
    expect(browserKernelForSource('source-a')).toBe(h.kernel);
  });

  it('evicts a banked hidden warm when a newer hidden apply is server-only', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    warmKernelOnOpen('source-c', 'c.kcad.ts');
    warmKernelOnOpen('const p = await lib.fromSTEP("part.step");', 'step.kcad.ts');

    // The server-only latest apply must drop c's bank along with its listener:
    // no warm may fire later for a source routing has left behind.
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();
    expect(browserKernelForSource('source-a')).toBe(h.kernel);
  });

  it('evicts a banked hidden warm when a newer eligible apply lands before the visibilitychange flush', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    // Hidden apply banks c; the tab flips visible, but the queued
    // `visibilitychange` task has not run yet when d is applied.
    warmKernelOnOpen('source-c', 'c.kcad.ts');
    visibility = 'visible';
    warmKernelOnOpen('source-d', 'd.kcad.ts');

    // d's swap is armed; the late flush of c must not cancel it.
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).toHaveBeenCalledTimes(1);
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-d', 'd.kcad.ts');
    expect(browserKernelForSource('source-d')).toBe(h.kernel);
  });

  it('evicts a banked hidden warm when the eligible apply changes back to the current source', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    warmKernelOnOpen('source-c', 'c.kcad.ts');
    visibility = 'visible';
    warmKernelOnOpen('source-a', 'a.kcad.ts');

    // The current source is re-warmed; the late flush of c must warm nothing.
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).toHaveBeenCalledExactlyOnceWith('source-a', 'a.kcad.ts');
    expect(browserKernelForSource('source-a')).toBe(h.kernel);
  });

  it('disposeBrowserKernel clears a banked hidden warm and its listener', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    warmKernelOnOpen('source-c', 'c.kcad.ts');
    disposeBrowserKernel();

    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.warmMock).not.toHaveBeenCalled();
  });

  it('cancels a pending swap when the latest source is server-only', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');
    visibility = 'visible';

    warmKernelOnOpen('source-b', 'b.kcad.ts');
    warmKernelOnOpen('const p = await lib.fromSTEP("part.step");', 'step.kcad.ts');

    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();
    expect(browserKernelForSource('source-a')).toBe(h.kernel);
  });

  it('drops the armed swap and a banked hidden warm when a visible server-only apply is latest', () => {
    const h = fakeKernel();
    __setBrowserKernelForTests(h.kernel, 'source-a');

    warmKernelOnOpen('source-c', 'c.kcad.ts');
    visibility = 'visible';

    warmKernelOnOpen('source-b', 'b.kcad.ts');
    warmKernelOnOpen('const p = await lib.fromSTEP("part.step");', 'step.kcad.ts');

    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.disposeMock).not.toHaveBeenCalled();
    expect(h.warmMock).not.toHaveBeenCalled();

    // The bank's listener is gone too: a late visibilitychange warms nothing.
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(WARM_SETTLE_MS);

    expect(h.warmMock).not.toHaveBeenCalled();
    expect(browserKernelForSource('source-a')).toBe(h.kernel);
  });
});
