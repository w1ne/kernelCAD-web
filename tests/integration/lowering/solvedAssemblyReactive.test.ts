// tests/integration/lowering/solvedAssemblyReactive.test.ts
//
// Lowering integration for the `solvedAssembly` FeatureKind. The lowerer
// reconstructs AssemblyPartStored / AssemblyJointStored from FeatureRecords,
// resolves the encoded poses to numeric values via Param.evaluated (the
// recompute pipeline updates these before lowering), runs forwardKinematics,
// and emits a SceneBackend with per-part world transforms. Studio-driven
// param edits re-pose the rendered scene reactively without re-running the
// script.
//
// These bbox-based reactivity assertions terminate each script with
// `.solvedModel(...).toUnion()` so the tail record is `assemblyExport`
// (op=union) and lowers to a single Shape with `.boundingBox()`. The Scene
// reactivity / per-part worldTransform path is exercised by
// sceneBackendEmission / sceneToCompoundUnion / sceneAssemblyModel; here
// we keep the legacy bbox semantics by routing through `.toUnion()`.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';
import { buildModel, updateModelParams } from '../../../src/kernel/buildModel';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

interface LowerResult {
  shape: OcctBackend | undefined;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id) as OcctBackend | undefined,
    diagnostics: r.diagnostics,
  };
}

describe('solvedAssembly lowering', () => {
  beforeAll(async () => { await initOcct(); });

  it('produces posed bbox for literal poses (regression)', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      const base  = arm.part('base',  box(10, 10, 10));
      const upper = arm.part('upper', box(10, 10, 30));
      arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 10] });
      return (await arm.solvedModel({ yaw: 0 })).toUnion();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    // base (10×10×10, centered) + upper (10×10×30, centered) translated by
    // joint origin [0,0,10]. Upper's center sits at z=10, so it spans
    // z in [10 - 15, 10 + 15] = [-5, 25]. Base spans z in [-5, 5].
    // Top reaches z ~= 25.
    expect(bb.max[2]).toBeGreaterThan(20);
  });

  it('rotates the upper arm 90 degrees about Z (yaw)', async () => {
    // yaw=90° around Z: an upper arm shifted along +X by its own connector
    // ends up shifted along +Y after the rotation. Use a non-symmetric upper
    // box (offset via .translate) so a yaw rotation is observable in the bbox.
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      const base  = arm.part('base',  box(10, 10, 10));
      // Upper arm extends 30mm along +X (so yaw=90° rotates it onto +Y).
      const upper = arm.part('upper', box(30, 10, 10).translate(15, 0, 0));
      arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });
      return (await arm.solvedModel({ yaw: 90 })).toUnion();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    // After yaw=90, upper extends onto +Y. Top of upper bbox in Y is ~30.
    expect(bb.max[1]).toBeGreaterThan(25);
    // Upper no longer extends far along X — only the base remains there.
    expect(bb.max[0]).toBeLessThan(15);
  });

  it('reactivity: param.update repos the assembly bbox', async () => {
    // Mirrors the canonical reactive pattern from
    // tests/unit/kernel/buildModel.test.ts ("updates params through the
    // headless boundary"): build once with a parametric pose, then re-run
    // updateModelParams to drive the recompute pipeline. The captured
    // FeatureRecord must carry the param dependency in metadata.paramRefs
    // (collectParamRefs walks nested metadata.poses[name].value Param
    // wrappers) so the engine flags the solvedAssembly record as "first
    // affected" and re-lowers it with the updated Param.evaluated.
    const model = await buildModel({
      fileName: 'reactive.kcad.ts',
      code: `
        const yawDeg = param('yawDeg', 0, { min: -180, max: 180 });
        const arm = assembly('test');
        const base  = arm.part('base',  box(10, 10, 10));
        // Long upper arm extending +X (so yaw=90° rotates it onto +Y).
        const upper = arm.part('upper', box(60, 10, 10).translate(30, 0, 0));
        arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });
        return (await arm.solvedModel({ yaw: yawDeg })).toUnion();
      `,
    });

    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const initial = model.tailShape as OcctBackend | undefined;
    expect(initial).toBeDefined();
    const bbBefore = initial!.boundingBox();
    // At yaw=0, upper extends along +X past x=30 (geometry up to ~60).
    expect(bbBefore.max[0]).toBeGreaterThan(30);
    // Y bbox stays small (only the 10mm base spans Y; upper's Y extent ≤ 5).
    expect(bbBefore.max[1]).toBeLessThan(15);

    // Verify the dependency index picked up the nested-poses ParamRef.
    // Without metadata.paramRefs containing 'yawDeg', the recompute engine
    // would skip re-lowering and the bbox would not move.
    const solvedRecord = model.records.find(r => r.kind === 'solvedAssembly');
    expect(solvedRecord).toBeDefined();
    const paramRefs = (solvedRecord!.metadata as { paramRefs?: string[] } | undefined)?.paramRefs;
    expect(paramRefs).toContain('yawDeg');

    // Drive a param edit and verify the bbox shifts from +X-extent to +Y-extent.
    const updated = await updateModelParams(model, [{ name: 'yawDeg', value: 90 }]);
    expect(updated.result.warnings).toEqual([]);
    const after = updated.result.shape as OcctBackend;
    expect(after).toBeDefined();
    const bbAfter = after.boundingBox();
    // After yaw=90° about Z, upper now extends along +Y (geometry up to ~60).
    expect(bbAfter.max[1]).toBeGreaterThan(30);
    // X is no longer dominated by the upper — only base contributes (≤ 5).
    expect(bbAfter.max[0]).toBeLessThan(15);

    // The solvedAssembly record should be in the relowered set (its pose
    // depends on 'yawDeg'); pre-existing parts/joints stay cached.
    expect(updated.result.relowered).toContain(solvedRecord!.id);
  });

  it('ball joint: per-component ParamRef + literal poses lower and repose correctly', async () => {
    // Ball joint pose is a 3-tuple [xDeg, yDeg, zDeg] of XYZ Euler angles.
    // The FeatureKind capture (Task 3) and OCCT lowerer (Task 4) must round-
    // trip a *mixed* triple: first axis is a ParamRef (Param wrapper), second
    // and third are numeric literals. Re-driving the param then re-lowers the
    // solvedAssembly record with the updated rotation, which should swing the
    // tip's worldTransform observably.
    //
    // Geometry:
    //   base = box(10,10,10) at corner [0,0,0]→[10,10,10]
    //   tip  = box(10,10,50) at corner [0,0,0]→[10,10,50]
    //   wrist (ball) parent=base, child=tip, origin=[0,0,10] in base local
    //
    // We assert reactivity through `.toUnion().boundingBox()` per the Task 14
    // spec-preferred path. The double-recompute lifecycle (params.update then
    // bbox-read) only round-trips cleanly because assemblyExport now clones
    // the cached part shape before applyTransform — without that fix, the
    // second recompute trips replicad's "This object has been deleted." on
    // the tip part's mutated OCCT handle.
    const model = await buildModel({
      fileName: 'ball-reactive.kcad.ts',
      code: `
        const xDeg = param('xDeg', 0, { min: -180, max: 180 });
        const arm = assembly('test');
        const base = arm.part('base', box(10, 10, 10));
        const tip  = arm.part('tip',  box(10, 10, 50));
        arm.ball('wrist', base, tip, { origin: [0, 0, 10] });
        return (await arm.solvedModel({ wrist: [xDeg, 0, 0] })).toUnion();
      `,
    });

    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const initial = model.tailShape as OcctBackend | undefined;
    expect(initial).toBeDefined();
    const bbBefore = initial!.boundingBox();
    // At xDeg=0, wrist contributes a pure translation by [0,0,10]:
    // base spans z in [0,10]; tip spans z in [10, 60]. Combined max z ~= 60.
    expect(bbBefore.max[2]).toBeGreaterThan(55);
    // No rotation has swung tip onto -Y yet, so y-min stays at 0.
    expect(bbBefore.min[1]).toBeGreaterThan(-1);

    // Verify the captured FeatureRecord picks up the per-axis ParamRef.
    // collectParamRefs must walk metadata.poses[name].value as a 3-tuple
    // for ball joints (vs scalar for revolute/prismatic).
    const solvedRecord = model.records.find(r => r.kind === 'solvedAssembly');
    expect(solvedRecord).toBeDefined();
    const paramRefs = (solvedRecord!.metadata as { paramRefs?: string[] } | undefined)?.paramRefs;
    expect(paramRefs).toContain('xDeg');

    // Drive xDeg to 90: rotation about +X swings tip's local +Z onto world -Y.
    const updated = await updateModelParams(model, [{ name: 'xDeg', value: 90 }]);
    expect(updated.result.warnings).toEqual([]);
    const after = updated.result.shape as OcctBackend;
    expect(after).toBeDefined();
    const bbAfter = after.boundingBox();
    // Tip's local +Z (length 50) now points along world -Y, so y-min reaches
    // about -50 from the wrist origin (0,0,10). Tip's z-extent collapses to
    // the joint origin's z (10) plus tip's own [0..10] in local Y mapped to
    // world Z = [10, 20]. Combined with base [0..10], max z ~ 20.
    expect(bbAfter.min[1]).toBeLessThan(-40);
    expect(bbAfter.max[2]).toBeLessThan(25);

    // The solvedAssembly record should re-lower (its pose depends on xDeg).
    expect(updated.result.relowered).toContain(solvedRecord!.id);
  });
});
