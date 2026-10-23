// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/paramEditPerf.ts
//
// Opt-in timeline of a parameter edit for the click-to-frame benchmark
// (tests/perf/paramEditFrame.spec.ts): edit → rebuild request → response →
// meshes applied → installed in the viewer → next rendered frame. Off unless
// the page defines `globalThis.__kernelcadParamPerf` (the benchmark does, in
// an init script), so a normal session records nothing.

export type ParamEditStage = 'edit' | 'request' | 'response' | 'applied' | 'installed' | 'frame';

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
