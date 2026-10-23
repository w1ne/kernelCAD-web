// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/paramEditPerf.ts
//
// Opt-in timeline of a parameter edit for the click-to-frame benchmark
// (tests/perf/paramEditFrame.spec.ts): edit → rebuild request → response →
// meshes applied → installed in the viewer → next rendered frame. Off unless
// the page defines `globalThis.__kernelcadParamPerf` (the benchmark does, in
// an init script), so a normal session records nothing.

/** `kernel-ready` / `first-build`: the browser kernel's cold start. */
export type ParamEditStage = 'edit' | 'request' | 'response' | 'applied' | 'installed' | 'frame' | 'kernel-ready' | 'first-build';

export interface ParamEditPerfEvent {
  stage: ParamEditStage;
  t: number;
  generation?: number;
  kernel?: 'browser' | 'server';
  detail?: Record<string, unknown>;
}

interface PerfSink {
  events: ParamEditPerfEvent[];
}

function sink(): PerfSink | null {
  const candidate = (globalThis as { __kernelcadParamPerf?: unknown }).__kernelcadParamPerf;
  if (!candidate || typeof candidate !== 'object') return null;
  const events = (candidate as { events?: unknown }).events;
  return Array.isArray(events) ? (candidate as PerfSink) : null;
}

export function paramEditPerfEnabled(): boolean {
  return sink() !== null;
}

export function markParamEdit(
  stage: ParamEditStage,
  fields: Omit<ParamEditPerfEvent, 'stage' | 't'> = {},
): void {
  const target = sink();
  if (!target) return;
  target.events.push({ stage, t: performance.now(), ...fields });
}

/** What the benchmark checks a settled edit against: the param values the
 *  build echoed and the mesh bounds. Only computed when the probe is on. */
export function appliedDetail(payload: {
  params?: Record<string, { value: unknown }>;
  bounds?: unknown;
}): Record<string, unknown> | undefined {
  if (!paramEditPerfEnabled()) return undefined;
  const params: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(payload.params ?? {})) params[name] = entry.value;
  return { params, bounds: payload.bounds };
}
