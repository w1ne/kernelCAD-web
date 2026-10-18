// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
// src/player/useDemoAutoLoad.mcpRefresh.test.tsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoAutoLoad } from './useDemoAutoLoad';

type Listener = (event: { data: string }) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  closed = false;
  onmessage: Listener | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string): void {
    const event = { data: '{}' };
    this.listeners.get(type)?.forEach(listener => listener(event));
    if (type === 'message') this.onmessage?.(event);
  }
}

const MESH_PAYLOAD = { features: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] } };

describe('useDemoAutoLoad MCP live refresh', () => {
  let loadFeatureMeshes: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.stubEnv('VITE_KERNELCAD_API_BASE', '');
    vi.stubEnv('VITE_API_BASE_URL', '');
    loadFeatureMeshes = vi.fn();
    (window as unknown as { __demoPlayer: unknown }).__demoPlayer = {
      loadFeatureMeshes,
      forceFullOpacity: vi.fn(),
      setVersion: vi.fn(),
    };
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => MESH_PAYLOAD,
    } as Response);
  });

  afterEach(() => {
    cleanup();
    delete (window as { __demoPlayer?: unknown }).__demoPlayer;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('re-fetches the mesh when the MCP viewer pushes a model update', async () => {
    window.history.pushState({}, '', '/demo-player?script=tok-123&mcp=1');
    renderHook(() => useDemoAutoLoad(true, { current: 0 }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/__kernelcad/mesh?script=tok-123',
      expect.objectContaining({ headers: {} }),
    );
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe('/__kernelcad/events?script=tok-123');

    act(() => FakeEventSource.instances[0].emit('relower'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/__kernelcad/mesh?script=tok-123',
      expect.objectContaining({ headers: {} }),
    );
    await waitFor(() => expect(loadFeatureMeshes).toHaveBeenCalledTimes(2));
  });

  it('closes the event stream on unmount', async () => {
    window.history.pushState({}, '', '/demo-player?script=tok-789&mcp=1');
    const { unmount } = renderHook(() => useDemoAutoLoad(true, { current: 0 }));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    unmount();

    expect(FakeEventSource.instances[0].closed).toBe(true);
  });

  it('does not subscribe outside MCP mode', async () => {
    window.history.pushState({}, '', '/demo-player?script=demo.ts');
    renderHook(() => useDemoAutoLoad(true, { current: 0 }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
