// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/kernelEventSink.ts
//
// The browser kernel's telemetry seam. The repo's `src/shared/telemetry/*` is
// Node-only (it imports `node:module`/`process`) and cannot load in the
// browser/worker page graph, so this module is the browser-safe equivalent:
// `browserKernelClient` reports the four event kinds through the sink installed
// here, and a future hosted browser endpoint wires itself with
// `setKernelEventSink` (TELEMETRY.md documents the CLI schema the events map
// onto). Until then the default sink is a DEV-only `console.debug` and a no-op
// in production builds. Events carry no sources or payloads — only the unions
// below.

export type KernelEvent =
  | { type: 'init'; ms: number }
  | { type: 'build'; ms: number; featureCount: number }
  | { type: 'params'; ms: number; bytes: number }
  | { type: 'fallback'; reason: 'host-fs' | 'script-error' | 'crash' | 'timeout' };

export type KernelEventSink = (event: KernelEvent) => void;

function devConsoleSink(event: KernelEvent): void {
  if (!import.meta.env.DEV) return;
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return;
  console.debug('[kernel]', event);
}

let currentSink: KernelEventSink = devConsoleSink;

/** Current sink. Default: `console.debug('[kernel]', event)` under
 *  `import.meta.env.DEV`, no-op in production builds. Wire the hosted browser
 *  telemetry endpoint here when one exists (see TELEMETRY.md for the CLI
 *  equivalent schema). */
export function kernelEventSink(): KernelEventSink {
  return currentSink;
}

/** Test/integration seam: replace the sink; `null` restores the default. */
export function setKernelEventSink(sink: KernelEventSink | null): void {
  currentSink = sink ?? devConsoleSink;
}
