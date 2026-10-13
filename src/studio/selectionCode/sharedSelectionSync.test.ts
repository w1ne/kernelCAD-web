// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { SelectionCodeStore } from './selectionCodeStore';
import { attachSharedSelection } from './sharedSelectionSync';

describe('Studio selection bridge', () => {
  it('publishes viewer clicks and applies agent picks without echoing them', async () => {
    const store = new SelectionCodeStore();
    let remote: unknown = null;
    const request = vi.fn(async (method: 'GET' | 'POST', selection?: unknown) => {
      if (method === 'POST') remote = selection;
      return { ok: true, selection: remote, revision: 1, modelGeneration: 0 };
    });
    const applyFace = vi.fn();
    const bridge = attachSharedSelection(store, request, applyFace);
    const edge = { shapeIndex: 0, kind: 'edge' as const, id: 2 };
    await bridge.tick();
    store.linkFromGeometry(edge, 'box', null);
    await bridge.tick();
    expect(remote).toEqual({ ...edge, featureId: 'box' });
    remote = { shapeIndex: 1, kind: 'face', id: 3, featureId: 'cut' };
    await bridge.tick();
    expect(store.getSnapshot().link?.pick).toEqual({ shapeIndex: 1, kind: 'face', id: 3 });
    expect(applyFace).toHaveBeenLastCalledWith({ shapeIndex: 1, faceId: 3 });
    await bridge.tick();
    expect(request.mock.calls.filter(([method]) => method === 'POST')).toHaveLength(1);
    store.clearLink();
    await bridge.tick();
    expect(remote).toBeNull();
    bridge.dispose();
  });
  it('does not overwrite a click made while a read is in flight', async () => {
    const store = new SelectionCodeStore();
    let finish!: (value: { ok: boolean; selection: null; revision: number; modelGeneration: number }) => void;
    const request = vi.fn(() => new Promise<{ ok: boolean; selection: null; revision: number; modelGeneration: number }>(resolve => { finish = resolve; }));
    const bridge = attachSharedSelection(store, request, vi.fn());
    const read = bridge.tick();
    store.linkFromGeometry({ shapeIndex: 0, kind: 'edge', id: 1 }, 'box', null);
    finish({ ok: true, selection: null, revision: 0, modelGeneration: 0 });
    await read;
    expect(store.getSnapshot().link?.pick.id).toBe(1);
    bridge.dispose();
  });
});

describe('selection generation', () => {
  it('drops a pending old-mesh click when the server rejects its generation', async () => {
    const store = new SelectionCodeStore();
    const request = vi.fn(async (method: 'GET' | 'POST') => method === 'GET'
      ? { ok: true, selection: null, revision: 0, modelGeneration: 0 }
      : { ok: false, selection: null, revision: 1, modelGeneration: 1, error: 'rebuilt' });
    const bridge = attachSharedSelection(store, request, vi.fn());
    await bridge.tick();
    store.linkFromGeometry({ shapeIndex: 0, kind: 'edge', id: 1 }, 'box', null);
    await bridge.tick();
    expect(store.getSnapshot().link).toBeNull();
    await bridge.tick();
    expect(request.mock.calls.map(([method]) => method)).toEqual(['GET', 'POST', 'GET']);
    bridge.dispose();
  });
});
