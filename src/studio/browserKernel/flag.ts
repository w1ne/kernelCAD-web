// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/flag.ts
//
// Whether declared-parameter edits may rebuild in the browser kernel worker.
// Resolution: the `?kernel=browser|server` URL override, then the build-time
// `VITE_STUDIO_BROWSER_KERNEL` (browser|server), then the default `server`.
// The default keeps every existing path exactly as it was until the browser
// kernel has been reviewed on production; the URL override lets anyone try it.

export type KernelChoice = 'browser' | 'server';

function parseChoice(value: unknown): KernelChoice | null {
  return value === 'browser' || value === 'server' ? value : null;
}

export function browserKernelChoice(): KernelChoice {
  if (typeof window === 'undefined') return 'server';
  try {
    const fromUrl = parseChoice(new URLSearchParams(window.location?.search ?? '').get('kernel'));
    if (fromUrl) return fromUrl;
  } catch {
    // An unreadable location keeps the build default.
  }
  return parseChoice(import.meta.env.VITE_STUDIO_BROWSER_KERNEL) ?? 'server';
}

/** The platform pieces the browser kernel needs. No SharedArrayBuffer, no
 *  cross-origin isolation: the kernel is single-threaded on purpose. */
export function browserKernelSupported(): boolean {
  return typeof Worker !== 'undefined'
    && typeof WebAssembly !== 'undefined'
    && typeof MessageChannel !== 'undefined'
    && typeof FileReader !== 'undefined';
}

export function browserKernelEnabled(): boolean {
  return browserKernelChoice() === 'browser' && browserKernelSupported();
}
