// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/backends/occt/projectionBindingAvailable.test.ts
//
// Capability test for `BRepProj_Projection`, bundled as of `kcad-v0.25.0`.
//
// WHY THIS EXISTS. For several releases the codebase asserted, in nine separate
// places including two agent-facing SKILL.md files, that "the bundled OCCT does
// not expose BRepProj_Projection". That claim was true when written and silently
// became false when the wasm was rebuilt — nothing tested it, so nothing caught
// it, and agents kept being told a capability was impossible while the binary
// supported it. This test is the thing that would have caught it.
//
// It is deliberately a CAPABILITY test, not a feature test: `projectCurve`'s
// `asEdge:true` path is still unimplemented (see `projectCurveLowerer.ts` — the
// blocker is the return type, since projection yields N wires and the signature
// says `=> Sketch`). This asserts only that the kernel primitive works, and
// doubles as the worked recipe for whoever implements the feature.
//
// It must FAIL, not skip, if the symbol goes missing. A skip here would restore
// exactly the silent-rot failure mode it was written to prevent.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initReplicad } from '../../../regressionTestHelpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('OCCT capability: BRepProj_Projection', () => {
  beforeAll(async () => {
    await initReplicad();
  });

  it('is bound (declared AND callable, not just present in the .d.ts)', () => {
    const oc = getOC() as any;
    // Bare `typeof === 'function'` is NOT sufficient evidence: a symbol whose
    // RETURN type is unregistered type-checks and then throws `BindingError:
    // unbound types` on first call. That is precisely how
    // `GProp_GProps::MatrixOfInertia` stayed broken for its entire life via an
    // unbound `gp_Mat`. The projection below is the real proof.
    expect(typeof oc.BRepProj_Projection_1).toBe('function');
  });

  it('projects an open wire onto a solid and yields wires', () => {
    const oc = getOC() as any;

    // Target solid, and an OPEN two-point wire floating above it.
    const box = replicad.makeBaseBox(20, 20, 10) as any;
    const edge = new oc.BRepBuilderAPI_MakeEdge_3(
      new oc.gp_Pnt_3(-5, 0, 50),
      new oc.gp_Pnt_3(5, 0, 50),
    ).Edge();
    const wire = new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();

    // Cylindrical projection straight down onto the box.
    const proj = new oc.BRepProj_Projection_1(wire, box.wrapped, new oc.gp_Dir_4(0, 0, -1));

    expect(proj.IsDone()).toBe(true);
    expect(proj.Shape()).toBeTruthy();

    const wires: unknown[] = [];
    for (proj.Init(); proj.More(); proj.Next()) wires.push(proj.Current());

    // Two, not one: a cylindrical projection is not a raycast — it does not
    // stop at the first hit, so the wire lands on the top face AND the bottom.
    // This is the exact ambiguity that blocks `asEdge:true`: an implementation
    // has to define which of these the caller meant.
    expect(wires.length).toBe(2);
    wires.forEach((w) => expect(w).toBeTruthy());
  });
});
