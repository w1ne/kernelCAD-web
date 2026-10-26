// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Registry contract for the STEP export B-rep validity gate: the diagnostic
// must name the offending part and carry the registered hint + next action,
// so an agent can rebuild the region instead of shipping invalid topology.
import { describe, expect, it } from 'vitest';
import { brepInvalidDiagnostic } from '../../../src/agent/script-runtime/exportDiagnostics';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../../src/shared/diagnostics/registry';

describe('brepInvalidDiagnostic', () => {
  it('names the part and carries the registry hint and next action', () => {
    const d = brepInvalidDiagnostic('feature-7', 'bracket');
    expect(d.code).toBe('export.brep.invalid');
    expect(d.severity).toBe('error');
    expect(d.featureId).toBe('feature-7');
    expect(d.message).toContain("Part 'bracket'");
    expect(d.message).toContain('BRepCheck');
    expect(d.hint).toBe(HINT_TEMPLATES['export.brep.invalid'].template);
    expect(d.nextAction).toEqual(NEXT_ACTIONS['export.brep.invalid']);
  });

  it('falls back to the exported solid for a single-part scene', () => {
    const d = brepInvalidDiagnostic(undefined);
    expect(d.message).toContain('The exported solid');
    expect(d.featureId).toBeUndefined();
  });
});
