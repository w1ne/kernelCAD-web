// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { GenerateRequest } from '../lib/generateClient';

const startGeneration = vi.fn();
const parseSseStream = vi.fn();

vi.mock('../lib/generateClient', () => ({
  startGeneration: (...a: unknown[]) => startGeneration(...a),
  parseSseStream: (...a: unknown[]) => parseSseStream(...a),
}));

import { useGeneration } from './useGeneration';

async function* yieldDone() {
  yield { kind: 'generation', generationId: 'g1', anonId: 'a1' };
  yield { kind: 'done', generationId: 'g1', anonId: 'a1', artifact: { title: 'T', code: 'return box(1,1,1);', parameters: [], suggestions: [] } };
}

describe('useGeneration edit mode', () => {
  beforeEach(() => {
    startGeneration.mockReset();
    parseSseStream.mockReset();
    startGeneration.mockResolvedValue({ ok: true, body: {} } as Response);
    parseSseStream.mockReturnValue(yieldDone());
  });

  it('forwards currentCode to startGeneration when editing', async () => {
    const { result } = renderHook(() => useGeneration());
    await act(async () => {
      await result.current.submit('add a hole', 'return box(20,20,20);');
    });
    expect(startGeneration).toHaveBeenCalledWith({ prompt: 'add a hole', currentCode: 'return box(20,20,20);' }, expect.any(AbortSignal));
    await waitFor(() => expect(result.current.phase.state).toBe('done'));
  });

  it('omits currentCode for a fresh generation', async () => {
    const { result } = renderHook(() => useGeneration());
    await act(async () => {
      await result.current.submit('a 20mm cube');
    });
    expect(startGeneration).toHaveBeenCalledWith({ prompt: 'a 20mm cube', currentCode: undefined }, expect.any(AbortSignal));
  });

  it('forwards mesh context to startGeneration', async () => {
    const { result } = renderHook(() => useGeneration());
    await act(async () => {
      await result.current.submit('a bracket', undefined, { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] });
    });
    expect(startGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'a bracket', mesh: { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] } }),
      expect.any(AbortSignal),
    );
  });

  it('forwards a structured photo reference to startGeneration', async () => {
    const { result } = renderHook(() => useGeneration());
    const referenceImage: NonNullable<GenerateRequest['referenceImage']> = {
      dataUrl: 'data:image/png;base64,cGhvdG8=',
      fileName: 'e-reader.png',
      mimeType: 'image/png',
      knownDimension: { label: 'overall height', valueMm: 203 },
    };

    await act(async () => {
      await result.current.submit(
        'model this simple e-reader',
        undefined,
        undefined,
        referenceImage,
      );
    });

    expect(startGeneration).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'model this simple e-reader',
      referenceImage,
    }), expect.any(AbortSignal));
  });
});

describe('useGeneration partial results', () => {
  it('keeps the partial flag on the done phase', async () => {
    const partial = { reason: 'timeout', stage: 'writing_code', unverified: ['interference'], note: 'n' };
    async function* yieldPartial() {
      yield { kind: 'generation', generationId: 'g1', anonId: 'a1' };
      yield {
        kind: 'done', generationId: 'g1', anonId: 'a1', durationMs: 1, partial,
        artifact: { title: 'T', code: 'return box(1,1,1);', parameters: [], suggestions: [] },
      };
    }
    startGeneration.mockReset();
    parseSseStream.mockReset();
    startGeneration.mockResolvedValue({ ok: true, body: {} } as Response);
    parseSseStream.mockReturnValue(yieldPartial());
    const { result } = renderHook(() => useGeneration());
    await act(async () => {
      await result.current.submit('a vase');
    });
    await waitFor(() => expect(result.current.phase.state).toBe('done'));
    expect(result.current.phase).toMatchObject({ state: 'done', partial });
  });
});

describe('useGeneration cancel', () => {
  /** Rejects like fetch does once the request's signal aborts. */
  function onAbort(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
    });
  }

  beforeEach(() => {
    startGeneration.mockReset();
    parseSseStream.mockReset();
  });

  it('stops a streaming run: the phase says cancelled and keeps the run id', async () => {
    let signal: AbortSignal | undefined;
    startGeneration.mockImplementation((_req: unknown, s: AbortSignal) => {
      signal = s;
      return Promise.resolve({ ok: true, body: {} } as Response);
    });
    parseSseStream.mockImplementation(async function* () {
      yield { kind: 'generation', generationId: 'g7', anonId: 'a1' };
      yield { kind: 'progress', stage: 'writing_code', message: 'Writing', elapsedMs: 5000 };
      await onAbort(signal!);
    });
    const { result } = renderHook(() => useGeneration());
    let run: Promise<void> | undefined;
    act(() => { run = result.current.submit('a bracket'); });
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(result.current.phase.state).toBe('running');

    act(() => result.current.cancel());
    await act(async () => { await run; });

    expect(signal?.aborted).toBe(true);
    expect(result.current.phase).toEqual({ state: 'error', code: 'cancelled', message: 'Stopped.', generationId: 'g7' });
    // The steps seen so far stay for the log.
    expect(result.current.events).toHaveLength(2);
  });

  it('stops a run whose request has not answered yet, without a network error', async () => {
    startGeneration.mockImplementation((_req: unknown, s: AbortSignal) => onAbort(s));
    const { result } = renderHook(() => useGeneration());
    let run: Promise<void> | undefined;
    act(() => { run = result.current.submit('a bracket'); });
    expect(result.current.phase.state).toBe('running');

    act(() => result.current.cancel());
    await act(async () => { await run; });

    expect(result.current.phase).toEqual({ state: 'error', code: 'cancelled', message: 'Stopped.' });
  });

  it('does nothing when no run is active', () => {
    const { result } = renderHook(() => useGeneration());
    act(() => result.current.cancel());
    expect(result.current.phase).toEqual({ state: 'idle' });
  });
});

describe('useGeneration quota 402', () => {
  beforeEach(() => {
    startGeneration.mockReset();
  });

  it('keeps the server message and upgrade_url on a 402', async () => {
    const body = JSON.stringify({ message: 'You used 5 of 5 builds this month.', upgrade_url: 'https://app.kernelcad.com/pricing?src=quota' });
    startGeneration.mockResolvedValue({ ok: false, status: 402, text: async () => body } as unknown as Response);
    const { result } = renderHook(() => useGeneration());
    await act(async () => { await result.current.submit('a box'); });
    expect(result.current.phase).toMatchObject({
      state: 'error', code: 'rate_limited', message: 'You used 5 of 5 builds this month.',
      upgradeUrl: 'https://app.kernelcad.com/pricing?src=quota',
    });
  });

  it('ignores a non-http upgrade_url and keeps raw text for non-JSON bodies', async () => {
    startGeneration.mockResolvedValue({ ok: false, status: 402, text: async () => JSON.stringify({ message: 'm', upgrade_url: 'javascript:alert(1)' }) } as unknown as Response);
    const { result } = renderHook(() => useGeneration());
    await act(async () => { await result.current.submit('a box'); });
    expect((result.current.phase as { upgradeUrl?: string }).upgradeUrl).toBeUndefined();
    startGeneration.mockResolvedValue({ ok: false, status: 429, text: async () => 'slow down' } as unknown as Response);
    await act(async () => { await result.current.submit('a box'); });
    expect(result.current.phase).toMatchObject({ code: 'rate_limited', message: 'slow down' });
  });
});
