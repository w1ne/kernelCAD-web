// Integration test for the v0.6 desktop-3axis-mates hero
// (`examples/robot-arm/desktop-3axis-mates.kcad.ts`).
//
// The hero is a mate-driven rewrite of the v0.5 `desktop-3axis.kcad.ts`:
// parts authored in their own local frames, mate-FK (`solveMates`) plants
// them. Same body-tree topology, same geometry parameters, swap
// `arm.fixed/.revolute` → `arm.mate(...)`.
//
// Three checks:
//   1. Evaluate end-to-end via `evaluateAndBuildScript` — the harness flips
//      the validate-gate default to `'error'`, so any error-severity
//      diagnostic surfaces as a non-zero exitCode.
//   2. Inventory the FeatureRecords: 12 parts (one per `arm.part(...)`),
//      no `assemblyJoint` records (the v0.6 vocabulary doesn't emit them),
//      trailing `solvedAssembly`.
//   3. Run via `runScript` and assert per-part `worldTransform`s reflect
//      mate-FK: the gripper-plate (terminal link) lands at a non-trivial
//      world position consistent with FK over the default poses
//      (baseYawDeg=20°, shoulderPitchDeg=35°, elbowPitchDeg=-55°).

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';
import { runScript } from '../../../src/script-runtime/runScript';
import { checkInterference } from '../../../src/script-runtime/checkInterference';
import { Scene } from '../../../src/intent/scene';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/robot-arm/desktop-3axis-mates.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('desktop-3axis-mates hero (v0.6)', () => {
  it('evaluates end-to-end with zero error diagnostics', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    const errors = result.evaluation.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([]);

    const records = result.model?.records ?? [];
    const parts = records.filter((r) => r.kind === 'assemblyPart');
    const joints = records.filter((r) => r.kind === 'assemblyJoint');

    // 12 parts: base-plate, base-yaw-servo, base-yaw-output, shoulder-column,
    // shoulder-cheeks, shoulder-pitch-servo, upper-arm-beam, elbow-yoke,
    // elbow-pitch-servo, shoulder-pitch-shaft, forearm-beam, gripper-plate,
    // elbow-pitch-shaft. (Twelve revolute + fastened mates, but mates don't
    // emit `assemblyJoint` records — they ride on the assembly's mate list
    // and surface on `Scene.mates`.)
    expect(parts.length).toBe(13);
    expect(joints.length).toBe(0);

    // The trailing capture-time record is the solvedAssembly, which the
    // lowerer turns into a SceneBackend with mate-FK transforms.
    expect(records.at(-1)?.kind).toBe('solvedAssembly');
  }, 120_000);

  it('mate-FK plants parts at non-identity world positions', async () => {
    const code = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    const { returnValue } = await runScript({
      code,
      fileName: EXAMPLE_ABSOLUTE,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
    });

    expect(returnValue).toBeInstanceOf(Scene);
    const scene = returnValue as Scene;

    // Hero declares 13 parts and 12 mates (3 revolute, 9 fastened).
    expect(scene.parts.length).toBe(13);
    expect(scene.mates?.length).toBe(12);

    // Base-plate is the root — its worldTransform should be identity
    // (origin at world origin).
    const basePlate = scene.part('base-plate');
    const baseOrigin = basePlate.worldTransform.point([0, 0, 0]);
    expect(baseOrigin[0]).toBeCloseTo(0);
    expect(baseOrigin[1]).toBeCloseTo(0);
    expect(baseOrigin[2]).toBeCloseTo(0);

    // Gripper-plate rides on the forearm (terminal link). Its local origin
    // [0,0,0] is at the elbow-pitch axis on the forearm; in world space
    // that point lands somewhere O(upperArmLen) from the world origin once
    // FK is applied. With default poses (baseYawDeg=20°, shoulderPitchDeg=35°,
    // elbowPitchDeg=-55°), the world position is non-trivial — checked
    // numerically below.
    const gripper = scene.part('gripper-plate');
    const gripperOrigin = gripper.worldTransform.point([0, 0, 0]);
    const r = Math.hypot(gripperOrigin[0], gripperOrigin[1], gripperOrigin[2]);
    // Lower bound: gripper-plate origin sits at the elbow axis, which is
    // upperArmLen=140mm along +X in the upper arm's frame plus the base
    // column height (~50mm). Even after rotation, the world distance from
    // the origin is at least ~50mm (the base column lifts the elbow off the
    // ground) and at most ~upperArmLen + shoulderColumnH + plateT+servoH+hornT
    // ≈ 140 + 50 + 48 = 238mm. Generous bracket — the exact value depends on
    // pose composition, but it must be well above zero.
    expect(r).toBeGreaterThan(50);
    expect(r).toBeLessThan(300);
  }, 120_000);

  it('reports zero interferences at default poses', async () => {
    // Industry-standard clash detection (BREP common-volume) over the
    // 13-part mate-driven assembly. The v0.6 hero ships with all parts
    // verified non-interfering at the default articulation
    // (baseYawDeg=20°, shoulderPitchDeg=35°, elbowPitchDeg=-55°).
    const code = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    const result = await checkInterference({
      code,
      fileName: EXAMPLE_PATH,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
      epsilonMm3: 0.01,
      ignorePairs: new Set<string>(),
    });

    expect(result.partCount).toBe(13);
    expect(result.pairs).toEqual([]);
  }, 180_000);
});
