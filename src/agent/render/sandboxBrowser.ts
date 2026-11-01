// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox hardening for the headless Chromium used by render / inspect /
// animation capture. Chromium is a child process, so the in-process network
// chokepoint (src/shared/sandbox/networkGuard.ts) does not cover it. In
// sandbox mode the one shared browser bootstrap (headlessRender.ts
// `openDemoPlayerPage`) therefore:
//   - never attaches to a user's running Chrome over CDP (that browser has
//     full network access and the user's profile);
//   - launches Chromium with host-resolver rules that resolve every hostname
//     except loopback to nothing, and with proxy settings pointing at a
//     closed port so nothing can tunnel out;
//   - routes every request of the context and aborts any that is not to the
//     loopback player server (IP literals bypass resolver rules; this does not).
import type { BrowserContext } from 'playwright';
import { isSandboxEnabled } from '../../shared/sandbox/config';
import { isLoopbackHost } from '../../shared/sandbox/networkGuard';

export const SANDBOX_CHROMIUM_ARGS = [
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
  '--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-sync',
  '--no-pings',
  '--metrics-recording-only',
];

/** Extra Chromium launch args (empty when the sandbox is off). */
export function sandboxChromiumArgs(): string[] {
  return isSandboxEnabled() ? SANDBOX_CHROMIUM_ARGS : [];
}

/** True when a request URL may leave the sandboxed browser (loopback / inline only). */
export function sandboxBrowserUrlAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return true;
    return isLoopbackHost(u.hostname);
  } catch {
    return false;
  }
}

/** Abort every non-loopback request of `context` (no-op when the sandbox is off). */
export async function hardenSandboxBrowserContext(context: BrowserContext): Promise<void> {
  if (!isSandboxEnabled()) return;
  await context.route('**/*', async route => {
    if (sandboxBrowserUrlAllowed(route.request().url())) await route.continue();
    else await route.abort('blockedbyclient');
  });
}
