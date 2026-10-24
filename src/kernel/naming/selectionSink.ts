// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/selectionSink.ts
//
// Collects the SelectionRecords a feature's selectors produce while it lowers.
// The sink hangs off the FeatureRecord being lowered (by identity), so
// concurrent evaluations never share one, and a selector resolved outside a
// lowering (inspect tools, tests) finds no sink and costs nothing.

import type { SelectionRecord } from '../../shared/intent/selectionRecord';

const sinks = new WeakMap<object, SelectionRecord[]>();

/** Start collecting for `owner` (the record being lowered). */
export function openSelectionSink(owner: object): SelectionRecord[] {
  const sink: SelectionRecord[] = [];
  sinks.set(owner, sink);
  return sink;
}

/** Let a record synthesized from `owner` (grouped edge features) report into
 *  the same sink. */
export function aliasSelectionSink(alias: object, owner: object): void {
  const sink = sinks.get(owner);
  if (sink) sinks.set(alias, sink);
}

export function hasSelectionSink(owner: object): boolean {
  return sinks.has(owner);
}

export function recordSelection(owner: object, selection: SelectionRecord): void {
  sinks.get(owner)?.push(selection);
}

export function closeSelectionSink(owner: object): void {
  sinks.delete(owner);
}
