// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sweepRailValidation.test.ts
//
// Regression: `Sketch.sweep(rail)` used to blow the stack with an opaque
// "Maximum call stack size exceeded" when a `path()`/PathBuilder/Sketch was
// passed as the rail (the natural mistake — profiles are paths). The rail
// object carries a back-reference to the session, whose `records` array holds
// the freshly-registered sweep record, so `collectParamRefs` walked
// session → records → record → metadata.rail → session forever.
//
// The fix is a cycle guard in `collectParamRefs`/`walkCollect` (a WeakSet of
// visited objects). An invalid rail's *shape* (non-array / <2 points / NaN) is
// reported separately as a `feature.invalid-args` diagnostic at the lowering
// layer (occtLowerer) — see tests/unit/capture/sketch.test.ts. This file guards
// only the root cause: param collection must never overflow on a cyclic graph.

import { describe, it, expect } from 'vitest';
import { collectParamRefs } from '../../shared/runtime/resolveParams';

describe('collectParamRefs — cycle safety', () => {
  it('terminates on a self-referential object instead of overflowing the stack', () => {
    const a: Record<string, unknown> = { keep: 'x' };
    a.self = a; // direct cycle
    const b: Record<string, unknown> = { a };
    a.b = b; // mutual cycle
    expect(() => collectParamRefs(a)).not.toThrow();
    expect(collectParamRefs(a) instanceof Set).toBe(true);
  });

  it('reproduces the sweep cycle shape (record → metadata.rail → session → records → record) without overflowing', () => {
    // A faithful miniature of the live graph that triggered the crash: a record
    // whose metadata holds the rail object, which back-references the session,
    // whose records array contains the record. A Param ref buried inside the
    // cycle must still be collected exactly once.
    const turnsParam = { expression: 'turns', unit: 'mm', evaluated: 2, paramRef: 'turns' };
    const session: Record<string, unknown> = { records: [] };
    const rail: Record<string, unknown> = { id: 'path_1', session, length: turnsParam };
    const record: Record<string, unknown> = { id: 'sweep_0', metadata: { rail } };
    (session.records as unknown[]).push(record);
    let refs!: Set<string>;
    expect(() => { refs = collectParamRefs(record); }).not.toThrow();
    expect(refs.has('turns')).toBe(true);
  });
});
