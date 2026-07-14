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
    expect(startGeneration).toHaveBeenCalledWith({ prompt: 'add a hole', currentCode: 'return box(20,20,20);' });
    await waitFor(() => expect(result.current.phase.state).toBe('done'));
  });

  it('omits currentCode for a fresh generation', async () => {
    const { result } = renderHook(() => useGeneration());
    await act(async () => {
      await result.current.submit('a 20mm cube');
    });
    expect(startGeneration).toHaveBeenCalledWith({ prompt: 'a 20mm cube', currentCode: undefined });
  });

  it('forwards mesh context to startGeneration', async () => {
    const { result } = renderHook(() => useGeneration());
    await act(async () => {
      await result.current.submit('a bracket', undefined, { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] });
    });
    expect(startGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'a bracket', mesh: { renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] } }),
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
    }));
  });
});
