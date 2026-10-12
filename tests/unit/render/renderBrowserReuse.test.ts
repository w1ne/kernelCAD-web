// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browser = vi.hoisted(() => {
  const page = {
    setViewportSize: vi.fn(), setDefaultTimeout: vi.fn(),
    goto: vi.fn(), waitForFunction: vi.fn(), evaluate: vi.fn(), close: vi.fn(async () => undefined),
  };
  const context = { newPage: vi.fn(async () => page) };
  const handle = {
    contexts: vi.fn(() => [context]), newContext: vi.fn(async () => context), close: vi.fn(async () => undefined),
  };
  return { page, context, handle, connect: vi.fn(async () => handle), launch: vi.fn(async () => handle) };
});
vi.mock('playwright', () => ({ chromium: { connectOverCDP: browser.connect, launch: browser.launch } }));
import { openRenderPage } from '../../../src/agent/render/headlessRender';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('PW_CDP_URL', 'http://127.0.0.1:9444');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const options = { scriptPath: 'example.kcad.ts', viewportWidth: 1280, viewportHeight: 720 };
const mesh = { bounds: {} } as Parameters<typeof openRenderPage>[3];

describe('static render browser reuse', () => {
  it('attaches to the selected Chrome context and closes its capture tab', async () => {
    const result = await openRenderPage(options, 'http://127.0.0.1:7777', [], mesh);
    expect(browser.connect).toHaveBeenCalledWith('http://127.0.0.1:9444');
    expect(browser.launch).not.toHaveBeenCalled();
    expect(browser.handle.newContext).not.toHaveBeenCalled();
    expect(browser.context.newPage).toHaveBeenCalledOnce();
    expect(result.pageHandle.attachedOverCdp).toBe(true);
    await result.pageHandle.close();
    expect(browser.page.close).toHaveBeenCalledOnce();
  });

  it('reports a failed explicit attachment without launching a duplicate browser', async () => {
    browser.connect.mockRejectedValueOnce(new Error('selected browser unavailable'));
    await expect(openRenderPage(options, 'http://127.0.0.1:7777', [], mesh))
      .rejects.toThrow('selected browser unavailable');
    expect(browser.launch).not.toHaveBeenCalled();
    expect(browser.context.newPage).not.toHaveBeenCalled();
  });

  it('retains fresh-browser rendering when no existing browser was selected', async () => {
    vi.stubEnv('PW_CDP_URL', '');
    const result = await openRenderPage(options, 'http://127.0.0.1:7777', [], mesh);
    expect(browser.connect).not.toHaveBeenCalled();
    expect(browser.launch).toHaveBeenCalledOnce();
    expect(result.pageHandle.attachedOverCdp).toBe(false);
    await result.pageHandle.close();
  });

  it('disconnects an established attachment when context setup fails', async () => {
    browser.handle.contexts.mockReturnValueOnce([]);
    browser.handle.newContext.mockRejectedValueOnce(new Error('context setup failed'));
    await expect(openRenderPage(options, 'http://127.0.0.1:7777', [], mesh))
      .rejects.toThrow('context setup failed');
    expect(browser.handle.close).toHaveBeenCalledOnce();
    expect(browser.launch).not.toHaveBeenCalled();
  });

  it('bounds a stalled capture-tab close and still disconnects', async () => {
    vi.useFakeTimers();
    browser.page.close.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const result = await openRenderPage(options, 'http://127.0.0.1:7777', [], mesh);
    const cleanup = result.pageHandle.close();
    await vi.advanceTimersByTimeAsync(3000);
    expect(browser.handle.close).toHaveBeenCalledOnce();
    await cleanup;
  });
});
