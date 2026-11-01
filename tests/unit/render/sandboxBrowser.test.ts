// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Headless Chromium lock-down used by render/inspect/animate in sandbox mode.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hardenSandboxBrowserContext,
  sandboxBrowserUrlAllowed,
  sandboxChromiumArgs,
} from '../../../src/agent/render/sandboxBrowser';
import { disableSandboxForTest, enableSandbox } from '../../../src/shared/sandbox/enable';

afterEach(() => disableSandboxForTest());

describe('sandbox browser hardening', () => {
  it('adds no launch args and no routing when the sandbox is off', async () => {
    expect(sandboxChromiumArgs()).toEqual([]);
    const routes: unknown[] = [];
    await hardenSandboxBrowserContext({ route: async (...a: unknown[]) => { routes.push(a); } } as never);
    expect(routes).toEqual([]);
  });

  it('locks Chromium to loopback when the sandbox is on', async () => {
    const ws = realpathSync(mkdtempSync(join(tmpdir(), 'kc-sbx-browser-')));
    enableSandbox({ workspace: ws, env: { ...process.env }, installGuards: false });
    const args = sandboxChromiumArgs();
    expect(args.some(a => a.startsWith('--host-resolver-rules=MAP * ~NOTFOUND'))).toBe(true);
    expect(args).toContain('--proxy-server=http://127.0.0.1:9');

    let handler: ((route: unknown) => Promise<void>) | undefined;
    await hardenSandboxBrowserContext({ route: async (_p: string, h: typeof handler) => { handler = h; } } as never);
    const outcome = async (url: string): Promise<string> => {
      let result = '';
      await handler!({ request: () => ({ url: () => url }), continue: async () => { result = 'continue'; }, abort: async () => { result = 'abort'; } });
      return result;
    };
    expect(await outcome('http://127.0.0.1:41234/demo-player?headless=1')).toBe('continue');
    expect(await outcome('data:image/png;base64,AAAA')).toBe('continue');
    expect(await outcome('https://example.com/studio.hdr')).toBe('abort');
    expect(await outcome('http://93.184.216.34/x')).toBe('abort');
  });

  it('classifies request URLs', () => {
    expect(sandboxBrowserUrlAllowed('http://localhost:5173/')).toBe(true);
    expect(sandboxBrowserUrlAllowed('blob:http://127.0.0.1/abc')).toBe(true);
    expect(sandboxBrowserUrlAllowed('https://fonts.example.com/a.woff2')).toBe(false);
    expect(sandboxBrowserUrlAllowed('not a url')).toBe(false);
  });
});
