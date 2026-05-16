// tests/integration/lowering/solvedAssemblyMateFk.test.ts
//
// v0.6 T17 — mate-FK at lower-time. Closes the gap left by T16 (capture-time
// `Scene.parts[].worldTransform` wiring): the `solvedAssembly` lowerer case
// now consumes the captured mate metadata, runs `mateFk` over it, and the
// emitted SceneBackend carries mate-derived world transforms on every part
// that participates in the mate graph. Without this step the rendered output
// (compound, STL, STEP) would place purely-mated parts at the LOCAL origin
// even though the capture-time Scene was already correct.
//
// These tests author parts in PURE LOCAL FRAMES — no `.translate(...)` chain
// on the part shape, no `at:` placement — and assert via the lowered
// compound's bbox that geometry actually moves to its mate-derived position.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

interface LowerResult {
  shape: OcctBackend | undefined;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records } = await runScript({ code, fileName: 'mate-fk.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id) as OcctBackend | undefined,
    diagnostics: r.diagnostics,
  };
}

describe('solvedAssembly lowerer — mate-FK integration (v0.6 T17)', () => {
  beforeAll(async () => { await initOcct(); });

  it('renders parts at mate-derived world positions when authored in pure local frames', async () => {
    // Two boxes, both centered at the origin in their LOCAL frame:
    //   parent: box(10, 10, 10), centered → spans [-5, +5] in each axis
    //   child:  box(5, 5, 5),    centered → spans [-2.5, +2.5] in each axis
    // Connectors:
    //   parent.out: at LOCAL [0,0,5]  (top face center, +Z axis)
    //   child.in:   at LOCAL [0,0,0]  (the child's own center)
    // Mate them revolute with pose=0:
    //   child's `in` connector lands on parent's `out` connector ⇒ child's
    //   center sits at world [0,0,5], so child spans Z in [2.5, 7.5].
    //   Combined Z bbox of the compound: [-5, 7.5].
    //
    // Pre-T17 BEHAVIOR (the bug): parent rendered at world identity, child
    // ALSO rendered at world identity (no .translate, no joint) — combined
    // bbox would be [-5, 5] on every axis. The Z-max assertion below failed.
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('mate-fk-min');
      const parent = arm.part('parent', box(10, 10, 10, true));
      parent.connector('out', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 0, 1] });
      const child = arm.part('child', box(5, 5, 5, true));
      child.connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('hinge', 'parent.out', 'child.in', 'revolute', { pose: 0 });
      return (await arm.solvedModel({}, { validate: 'off' })).toCompound();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    // Mate-FK placed child's center at [0,0,5] (parent's connector origin in
    // world space, since parent's worldTransform is identity). Child spans
    // Z in [2.5, 7.5]; parent spans Z in [-5, 5]; compound Z bbox is [-5, 7.5].
    expect(bb.max[2]).toBeGreaterThan(7);
    expect(bb.max[2]).toBeLessThan(8);
    expect(bb.min[2]).toBeGreaterThan(-5.1);
    expect(bb.min[2]).toBeLessThan(-4.9);
    // X and Y bboxes are dominated by parent's 10x10 extent.
    expect(bb.max[0]).toBeCloseTo(5, 3);
    expect(bb.min[0]).toBeCloseTo(-5, 3);
  });

  it('revolute pose rotates the child connector frame', async () => {
    // Same parent (10x10x10 centered) but child is an asymmetric block:
    //   child: box(20, 5, 5), centered=false → corner spans X in [0, 20]
    //   child.in connector at LOCAL [0, 0, 0] (the bottom-left corner)
    // With pose=0 revolute about +Z at parent.out=[0,0,5], child's corner
    // sits at world [0,0,5] and extends along +X (max X ≈ 20).
    // With pose=90 deg the child's +X-extending arm swings onto +Y instead,
    // so max X drops to ~child width (5) and max Y jumps to ~20.
    const { shape: shape0, diagnostics: diag0 } = await lowerScript(`
      const arm = assembly('mate-fk-pose');
      const parent = arm.part('parent', box(10, 10, 10, true));
      parent.connector('out', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 0, 1] });
      const child = arm.part('child', box(20, 5, 5, false));
      child.connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('hinge', 'parent.out', 'child.in', 'revolute', { pose: 0 });
      return (await arm.solvedModel({}, { validate: 'off' })).toCompound();
    `);
    expect(diag0.filter(d => d.severity === 'error')).toEqual([]);
    const bb0 = shape0!.boundingBox();
    // At pose=0: child's X extent reaches ~20.
    expect(bb0.max[0]).toBeGreaterThan(15);

    const { shape: shape90, diagnostics: diag90 } = await lowerScript(`
      const arm = assembly('mate-fk-pose');
      const parent = arm.part('parent', box(10, 10, 10, true));
      parent.connector('out', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 0, 1] });
      const child = arm.part('child', box(20, 5, 5, false));
      child.connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('hinge', 'parent.out', 'child.in', 'revolute', { pose: 90 });
      return (await arm.solvedModel({}, { validate: 'off' })).toCompound();
    `);
    expect(diag90.filter(d => d.severity === 'error')).toEqual([]);
    const bb90 = shape90!.boundingBox();
    // After 90 deg rotation about +Z, child's long axis points along +Y.
    expect(bb90.max[1]).toBeGreaterThan(15);
    // X bbox is now dominated by parent (10x10), not child.
    expect(bb90.max[0]).toBeLessThan(11);
  });

  it('expands coupled mate poses before rendering solvedAssembly', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('coupled-render');
      const parent = arm.part('parent', box(4, 4, 4, true));
      parent
        .connector('driver', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
        .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      const driver = arm.part('driver', cylinder(2, 2));
      driver.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      const finger = arm.part('finger', box(20, 4, 4, false));
      finger.connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('grip', 'parent.driver', 'driver.axis', 'revolute', { pose: 90 });
      arm.mate('curl', 'parent.hinge', 'finger.hinge', 'revolute');
      arm.coupleMates('curl', { source: 'grip', ratio: 1 });
      return (await arm.solvedModel({}, { validate: 'off' })).toCompound();
    `);

    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    expect(bb.max[1]).toBeGreaterThan(15);
    expect(bb.max[0]).toBeLessThan(6);
  });
});
