// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/flag.ts
//
// The switch that decides whether Studio may run param edits on the in-browser
// kernel worker. Resolution order: `?kernel=off|force` query override, then
// `VITE_STUDIO_BROWSER_KERNEL` (off|auto|force, default off), then the
// capability gate for `auto` (hosted hostname, WebAssembly, not Safari-iOS,
// not a `deviceMemory < 4` device). `force` skips everything except
// WebAssembly presence — it exists for support/debugging and for the routing
// tests. Without a window (SSR) the mode is off: the worker cannot exist.
import { shouldUseHostedMesh } from '../scriptSource';

export type BrowserKernelMode = 'off' | 'auto' | 'force';

/** Env: `import.meta.env.VITE_STUDIO_BROWSER_KERNEL ?? 'off'`; a
 *  `?kernel=off|force` query override wins over the env. `force` also implies
 *  the capability gate is skipped EXCEPT WebAssembly presence. */
export function browserKernelMode(): BrowserKernelMode {
  if (typeof window === 'undefined') return 'off';
  return queryMode() ?? envMode();
}

function queryMode(): BrowserKernelMode | null {
  try {
    const value = new URLSearchParams(window.location?.search ?? '').get('kernel');
    return value === 'off' || value === 'force' ? value : null;
  } catch {
    return null;
  }
}

function envMode(): BrowserKernelMode {
  const raw = import.meta.env.VITE_STUDIO_BROWSER_KERNEL;
  return raw === 'auto' || raw === 'force' || raw === 'off' ? raw : 'off';
}

/** auto: shouldUseHostedMesh() && typeof WebAssembly !== 'undefined'
 *        && !isSafariIos() && !(navigator.deviceMemory && navigator.deviceMemory < 4)
 *  force: typeof WebAssembly !== 'undefined'
 *  off: false */
export function browserKernelEnabled(): boolean {
  const mode = browserKernelMode();
  if (mode === 'off') return false;
  // Both remaining modes need the wasm runtime; a missing WebAssembly is the
  // one capability `force` does not override.
  if (typeof WebAssembly === 'undefined') return false;
  if (mode === 'force') return true;
  return shouldUseHostedMesh() && !isSafariIos() && !isLowMemoryDevice();
}

/** Safari on iPhone/iPad/iPod. Chrome/Firefox on iOS (CriOS/FxiOS UAs) are
 *  excluded — their engines are WebKit but they are wrappers we have not
 *  measured; only the app users actually browse with is gated here. */
export function isSafariIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  return /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

/** The auto gate's low-memory skip: a device that declared `deviceMemory`
 *  under 4 GB. Absent/0 values do not count as low (mirrors the unquoted
 *  `navigator.deviceMemory && navigator.deviceMemory < 4` gate). */
function isLowMemoryDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return Boolean(memory && memory < 4);
}
