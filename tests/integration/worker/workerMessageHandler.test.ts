// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation test for the OCCT worker's onmessage protocol. Nothing else
// imports `src/kernel/backends/occt/worker.ts` (it is a Web Worker entrypoint),
// so this pins the exact reply shapes — message names, ids, transfer lists and
// error strings — before the message-handler split.

import { beforeAll, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  message: unknown;
  transfer?: Transferable[];
}

const posted: PostedMessage[] = [];

const workerSelf: {
  onmessage: ((e: { data: unknown }) => void) | null;
  postMessage: (message: unknown, options?: { transfer?: Transferable[] }) => void;
} = {
  onmessage: null,
  postMessage: (message, options) => {
    posted.push({ message, transfer: options?.transfer });
  },
};

vi.mock('replicad-opencascadejs', () => ({
  default: async () => ({}),
}));

vi.stubGlobal('self', workerSelf);

async function dispatch(data: unknown): Promise<PostedMessage> {
  const start = posted.length;
  if (workerSelf.onmessage === null) throw new Error('worker did not install onmessage');
  workerSelf.onmessage({ data });
  await vi.waitFor(() => {
    if (posted.length <= start) throw new Error('no worker reply yet');
  }, { timeout: 5000 });
  return posted[start]!;
}

describe('occt worker message protocol', () => {
  beforeAll(async () => {
    await import('../../../src/kernel/backends/occt/worker');
  });

  it('protocol violation replies ERROR with the raw id and a Protocol Violation string', async () => {
    const { message, transfer } = await dispatch({ type: 'NOT_A_REQUEST', id: 'req-1' });
    expect(message).toMatchObject({ type: 'ERROR', id: 'req-1' });
    expect((message as { error: string }).error).toMatch(/^Protocol Violation: /);
    expect(transfer).toBeUndefined();
  });

  it('protocol violation without an id falls back to id "unknown"', async () => {
    const { message } = await dispatch({ type: 'NOT_A_REQUEST' });
    expect(message).toMatchObject({ type: 'ERROR', id: 'unknown' });
  });

  it('INIT replies SUCCESS with the request id', async () => {
    const { message, transfer } = await dispatch({ type: 'INIT', id: 'init-1' });
    expect(message).toEqual({ type: 'SUCCESS', id: 'init-1' });
    expect(transfer).toBeUndefined();
  });

  it('EXECUTE with no shapes replies SUCCESS with an empty execution payload and an empty transfer list', async () => {
    const { message, transfer } = await dispatch({
      type: 'EXECUTE',
      id: 'exec-1',
      code: 'return null;',
    });
    expect(message).toEqual({
      type: 'SUCCESS',
      id: 'exec-1',
      geometries: { geometries: [], sketches: [] },
    });
    expect(transfer).toEqual([]);
  });

  it('EXECUTE throwing replies ERROR with String(error)', async () => {
    const { message } = await dispatch({
      type: 'EXECUTE',
      id: 'exec-2',
      code: 'throw new Error("boom");',
    });
    expect(message).toEqual({ type: 'ERROR', id: 'exec-2', error: 'Error: boom' });
  });

  it('EXECUTE throwing a numeric code replies the OpenCascade advice message', async () => {
    const { message } = await dispatch({
      type: 'EXECUTE',
      id: 'exec-3',
      code: 'throw "7";',
    });
    expect(message).toEqual({
      type: 'ERROR',
      id: 'exec-3',
      error: 'OpenCascade Error (Code: 7). This often means an invalid geometric operation.',
    });
  });

  it('EXPORT_STEP with no returned shape replies ERROR "No shape returned"', async () => {
    const { message } = await dispatch({
      type: 'EXPORT_STEP',
      id: 'exp-1',
      code: 'return null;',
    });
    expect(message).toEqual({ type: 'ERROR', id: 'exp-1', error: 'Error: No shape returned' });
  });

  it('EXPORT_STL with no returned shape replies ERROR "No shape returned"', async () => {
    const { message } = await dispatch({
      type: 'EXPORT_STL',
      id: 'exp-2',
      code: 'return null;',
    });
    expect(message).toEqual({ type: 'ERROR', id: 'exp-2', error: 'Error: No shape returned' });
  });
});
