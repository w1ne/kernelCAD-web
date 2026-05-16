// tests/unit/runtime/assembly.reactive.test.ts
//
// End-to-end reactivity for assembly Vec3 surfaces. Covers two flows:
//
//   1. Editing a numeric param flows through the assembly capture's symbolic
//      worldOrigin AND through to the joint's origin Vec3Param at lower time.
//      We verify by re-resolving the captured records against the live
//      ParamTable (the same `walkResolve` path the engine takes via
//      `resolveParams` on the recordForLower), then re-running the recompute
//      engine to confirm the part shape's bbox reflects the new value.
//
//   2. An axis ParamRef being edited to zero produces a structured diagnostic
//      with `code === 'feature.invalid-args'` and a hint matching `axis.zero`.
//      This exercises the recompute-engine catch fix that preserves
//      `KernelError.code` and `.hint` instead of flattening to
//      `recompute.lowering.exception`.

import { beforeAll, describe, expect, it } from 'vitest';
import type { Vec3Param } from '../../../src/intent/types';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { resolveParams } from '../../../src/runtime/resolveParams';

beforeAll(async () => { await initOcct(); });

describe('assembly reactive lowering', () => {
  it.skip('setParamValue updates dependent worldOrigin AND joint origin (deferred — v1 dropped Editable joint frames)', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const baseX = kcad.param('baseX', 70);

    const arm = kcad.assembly('reactive-arm');
    const a = arm.part('a', kcad.box(baseX, 46, 4), {
      at: [0, 0, 0],
      connectors: {
        pivot: { origin: [baseX.divide(2), 23, 4], axis: [0, 0, 1] },
      },
    });
    const b = arm.part('b', kcad.box(20, 20, 4), {
      at: [0, 0, 20],
    });
    const pivot = a.connector('pivot');
    // Use the worldOrigin (a symbolic ParamRef expression) as the joint origin.
    // worldOrigin.x is a binop add of `a.at.x` (literal 0) and `pivot.origin.x`
    // (`baseX/2`) — captured as a `Param` carrying a `paramRef` AST.
    const joint = arm.revolute('hinge', a, b, {
      axis: [0, 0, 1],
      // Cast back to a literal-or-ParamRef tuple via `as` so the joint can
      // accept the symbolic Vec3Param worldOrigin. Each component is already a
      // Param with a paramRef AST; we decompose into the per-component AST so
      // EditableVec3 sees an EditableVec3 again.
      origin: [
        // x carries `(baseX / 2)` AST → reconstruct as a ParamRef expression.
        // EditableVec3 doesn't accept Param directly — the realistic agent flow
        // is to use the ParamRef arithmetic API here.
        baseX.divide(2),
        23,
        4,
      ],
      limitsDeg: [-90, 90],
    });

    // ----- Initial lower at baseX=70 -----
    const engine = new RecomputeEngine(new OcctLowerer());
    const records = session.getRecords();
    const initialResult = await engine.run(records, { paramTable: session.paramTable });
    expect(initialResult.diagnostics).toEqual([]);

    // Confirm worldOrigin resolves to 35 against the live ParamTable.
    const worldOriginInitial = resolveParams(pivot.worldOrigin, session.paramTable) as Vec3Param;
    expect(worldOriginInitial.x.evaluated).toBeCloseTo(35, 5);
    expect(worldOriginInitial.y.evaluated).toBeCloseTo(23, 5);
    expect(worldOriginInitial.z.evaluated).toBeCloseTo(4, 5);

    // Confirm the joint origin record stores the resolved value at lower time.
    const jointRecord = records.find(r => r.id === joint.id)!;
    const jointMetaResolved = resolveParams(jointRecord.metadata, session.paramTable) as {
      origin: Vec3Param;
    };
    expect(jointMetaResolved.origin.x.evaluated).toBeCloseTo(35, 5);

    // ----- Edit baseX 70 → 100 directly on the ParamTable -----
    session.paramTable.set('baseX', 100);

    // Re-lower against the live (mutated) table.
    const updatedResult = await engine.run(records, { paramTable: session.paramTable });
    expect(updatedResult.diagnostics).toEqual([]);

    // Re-resolved worldOrigin reflects the new value.
    const worldOriginUpdated = resolveParams(pivot.worldOrigin, session.paramTable) as Vec3Param;
    expect(worldOriginUpdated.x.evaluated).toBeCloseTo(50, 5);
    // Joint origin reflects the new value via the same paramRef AST.
    const jointMetaUpdated = resolveParams(jointRecord.metadata, session.paramTable) as {
      origin: Vec3Param;
    };
    expect(jointMetaUpdated.origin.x.evaluated).toBeCloseTo(50, 5);

    // Physical reactivity: part `a` is a box(baseX, 46, 4) so its x extent
    // grows from 70 to 100 when the param edits. (The joint shape is a
    // passthrough clone of part `a`, so this also confirms the joint sees
    // the updated upstream geometry.)
    const aShapeInitial = initialResult.shapes.get(a.id);
    const aShapeUpdated = updatedResult.shapes.get(a.id);
    expect(aShapeInitial).toBeDefined();
    expect(aShapeUpdated).toBeDefined();
    const initialBbox = aShapeInitial!.boundingBox();
    const updatedBbox = aShapeUpdated!.boundingBox();
    expect(initialBbox.max[0] - initialBbox.min[0]).toBeCloseTo(70, 3);
    expect(updatedBbox.max[0] - updatedBbox.min[0]).toBeCloseTo(100, 3);
  });

  it.skip('axis resolves to zero on re-lower → feature.invalid-args with hint axis.zero (deferred — v1 dropped Editable joint frames)', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const ax = kcad.param('ax', 0);
    const ay = kcad.param('ay', 0);
    const az = kcad.param('az', 1);

    const arm = kcad.assembly('axis-zero');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('joint', a, b, {
      axis: [ax, ay, az],
      origin: [0, 0, 0],
    });

    const engine = new RecomputeEngine(new OcctLowerer());
    const records = session.getRecords();

    // Initial lower: axis = [0, 0, 1] — clean.
    const initial = await engine.run(records, { paramTable: session.paramTable });
    expect(initial.diagnostics).toEqual([]);

    // Edit `az` to zero → axis becomes [0, 0, 0] which `normalizeAxis`
    // rejects with KernelError(code='feature.invalid-args', hint='axis.zero').
    session.paramTable.set('az', 0);

    const updated = await engine.run(records, { paramTable: session.paramTable });
    const axisDiag = updated.diagnostics.find(d => d.code === 'feature.invalid-args');
    expect(axisDiag, 'expected a feature.invalid-args diagnostic from normalizeAxis').toBeDefined();
    expect(axisDiag!.code).toBe('feature.invalid-args');
    expect(axisDiag!.hint).toMatch(/axis\.zero/);
    expect(axisDiag!.message).toMatch(/axis must be non-zero/);

    // Belt + suspenders: confirm the engine did NOT fall back to the generic
    // recompute.lowering.exception path for the joint record.
    const genericDiag = updated.diagnostics.find(
      d => d.code === 'recompute.lowering.exception',
    );
    expect(genericDiag).toBeUndefined();
  });
});
