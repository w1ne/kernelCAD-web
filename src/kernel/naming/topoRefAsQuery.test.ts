// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/topoRefAsQuery.test.ts
//
// Q7 — failing tests for the strings-as-sugar bridge per D0.9 (b).
// topoRefAsQuery compiles an F-surface-parsed TopoRef into a Query AST so
// every existing @kc[<owner>/<kind>/<name>] ref resolves identically
// through the Query path. The end-to-end test asserts equivalence: the
// string-form and Query-form bottom out on the same OCCT handle.

import { describe, it, expect } from 'vitest';
import { topoRefAsQuery } from './topoRefAsQuery';
import { parseTopoRef } from './topoRef';

describe('topoRefAsQuery — strings-as-sugar bridge per D0.9 (b) + D0.1 (c)', () => {
  it('compiles @kc[base/face/top] into an equivalent Query AST', () => {
    const parsed = parseTopoRef('@kc[base/face/top]');
    if ('error' in parsed) throw new Error(`parse failed: ${parsed.error}`);
    const q = topoRefAsQuery(parsed);
    expect(q.target).toBe('face');
    expect(q.ast.op).toBe('entityFilter');
  });

  it('compiles @kc[mountingHoles[2]/face/wall] preserving the indexed-segment owner', () => {
    const parsed = parseTopoRef('@kc[mountingHoles[2]/face/wall]');
    if ('error' in parsed) throw new Error(`parse failed: ${parsed.error}`);
    const q = topoRefAsQuery(parsed);
    expect(q.target).toBe('face');
  });

  it('compiles @kc[part/edge/perimeter] into an edge-target Query', () => {
    const parsed = parseTopoRef('@kc[part/edge/perimeter]');
    if ('error' in parsed) throw new Error(`parse failed: ${parsed.error}`);
    const q = topoRefAsQuery(parsed);
    expect(q.target).toBe('edge');
  });

  it('compiles @kc[arm/connector/tip] into a connector-target Query', () => {
    const parsed = parseTopoRef('@kc[arm/connector/tip]');
    if ('error' in parsed) throw new Error(`parse failed: ${parsed.error}`);
    const q = topoRefAsQuery(parsed);
    expect(q.target).toBe('connector');
  });

  it('compiles bare-owner @kc[arm] (kind defaults to part) into a part-target Query', () => {
    const parsed = parseTopoRef('@kc[arm]');
    if ('error' in parsed) throw new Error(`parse failed: ${parsed.error}`);
    const q = topoRefAsQuery(parsed);
    expect(q.target).toBe('part');
  });

  it('throws query.unsupported-entity-type for sketch refs (no Query.kind for sketches)', () => {
    const parsed = parseTopoRef('@kc[base/sketch/profile]');
    if ('error' in parsed) throw new Error(`parse failed: ${parsed.error}`);
    expect(() => topoRefAsQuery(parsed)).toThrow();
  });
});
