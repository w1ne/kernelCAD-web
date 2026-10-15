// @vitest-environment happy-dom
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, expect, it, vi } from 'vitest';
import { subscribeMcpSource } from './mcpSourceBridge';
vi.mock('./scriptSource', () => ({ loadStudioScriptSource: vi.fn(async () => 'updated code') }));
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });
it('updates the existing Code tab from MCP source events and closes its subscription', async () => {
  window.history.replaceState({}, '', '/?mcp=1');
  let listener: (() => void) | undefined;
  const close = vi.fn();
  const constructor = vi.fn(function () { return { addEventListener: (_name: string, cb: () => void) => { listener = cb; }, close }; });
  vi.stubGlobal('EventSource', constructor);
  const setCode = vi.fn();
  const stop = subscribeMcpSource('opaque-token', setCode);
  expect(constructor).toHaveBeenCalledWith('/__kernelcad/events?session=opaque-token');
  listener!();
  await vi.waitFor(() => expect(setCode).toHaveBeenCalledWith('updated code'));
  stop();
  expect(close).toHaveBeenCalledOnce();
});
it('does not subscribe for ordinary Studio links', () => {
  const constructor = vi.fn();
  vi.stubGlobal('EventSource', constructor);
  subscribeMcpSource('examples/part.kcad.ts', vi.fn())();
  expect(constructor).not.toHaveBeenCalled();
});
