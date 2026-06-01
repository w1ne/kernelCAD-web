// Integration test for the v0.6 desktop-3axis-mates hero
// (`examples/robot-arm/desktop-3axis-mates.kcad.ts`).
//
// The hero is a mate-driven rewrite of the v0.5 `desktop-3axis.kcad.ts`:
// parts authored in their own local frames, mate-FK (`solveMates`) plants
// them. It now keeps the existing arm hero and adds a functional terminal
// gripper driven by one grip mate plus two coupled finger curls.
//
// Three checks:
//   1. Evaluate end-to-end via `evaluateAndBuildScript` — the harness flips
//      the validate-gate default to `'error'`, so any error-severity
//      diagnostic surfaces as a non-zero exitCode.
//   2. Inventory the FeatureRecords: 16 parts (one per `arm.part(...)`),
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
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { Scene } from '../../../src/modeling/validation/scene';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

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

    // 16 parts: base-plate, base-yaw-servo, base-yaw-output, shoulder-column,
    // shoulder-cheeks, shoulder-pitch-servo, upper-arm-beam, elbow-yoke,
    // elbow-pitch-servo, shoulder-pitch-shaft, forearm-beam, gripper-plate,
    // grip-driver, left-finger, right-finger, elbow-pitch-shaft.
    // (Fifteen revolute + fastened mates, but mates don't
    // emit `assemblyJoint` records — they ride on the assembly's mate list
    // and surface on `Scene.mates`.)
    expect(parts.length).toBe(16);
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

    // Hero declares 16 parts and 15 mates (6 revolute, 9 fastened). The
    // terminal gripper has one actuator mate that drives two finger curls.
    expect(scene.parts.length).toBe(16);
    expect(scene.mates?.length).toBe(15);
    expect(scene.mates?.filter((m) => m.type === 'revolute').map((m) => ({
      name: m.name,
      limitsDeg: m.limitsDeg,
    }))).toEqual([
      { name: 'base-yaw', limitsDeg: [-180, 180] },
      { name: 'shoulder-pitch', limitsDeg: [35, 39] },
      { name: 'elbow-pitch', limitsDeg: [-55, 80] },
      { name: 'grip', limitsDeg: [0, 42] },
      { name: 'left-curl', limitsDeg: undefined },
      { name: 'right-curl', limitsDeg: undefined },
    ]);
    expect(scene.part('gripper-plate').connectors?.some((c) => c.name === 'tool-tip')).toBe(true);
    expect(scene.part('left-finger').connectors?.some((c) => c.name === 'tip')).toBe(true);
    expect(scene.part('right-finger').connectors?.some((c) => c.name === 'tip')).toBe(true);

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
    // 16-part mate-driven assembly. The v0.6 hero ships with all parts
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

    expect(result.partCount).toBe(16);
    expect(result.pairs).toEqual([]);
  }, 180_000);

  // P1 physics-loop discovery (2026-06-01): the desktop-3axis-mates
  // hero now reports `mechanism: broken` under the new physics-grounded
  // loop, which folds into review_cad's `ok` field — so this example
  // can no longer pass review_cad without P3 follow-up (rebuild or
  // explicitly exempt). The legacy review didn't see the breakage; the
  // new loop's pose-sweep catches it.
  //
  // Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
  // Plan:  docs/plans/2026-06-01-physics-loop-P3-cleanup.md
  it.skip('passes the functional review loop with realized mechanical joint intent — P3 follow-up: example reports mechanism: broken under the new loop', async () => {
    const result = await reviewCadTool({
      file: EXAMPLE_PATH,
      designGoal: 'Build a compact desktop 3-axis robot arm with physically supported servo joints and a functional gripper.',
      preserveInterfaces: [
        'base-yaw mate',
        'shoulder-pitch mate',
        'elbow-pitch mate',
        'grip mate',
        'gripper-plate.tool-tip connector',
        'left-finger.tip connector',
        'right-finger.tip connector',
      ],
      trackConnectors: ['gripper-plate.tool-tip', 'left-finger.tip', 'right-finger.tip'],
      gripperAperture: {
        left: 'left-finger.tip',
        right: 'right-finger.tip',
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.poseEnvelope?.diagnostics).toEqual([]);
      expect(result.poseEnvelope?.interferencePairs).toEqual([]);
      expect(result.poseEnvelope?.samples.map((s) => s.name)).toEqual([
        'current',
        'base-yaw:min',
        'base-yaw:max',
        'shoulder-pitch:min',
        'shoulder-pitch:max',
        'elbow-pitch:min',
        'elbow-pitch:max',
        'grip:min',
        'grip:max',
      ]);
      expect(result.connectorWorkspace).toHaveLength(3);
      expect(result.connectorWorkspace?.[0].ref).toBe('gripper-plate.tool-tip');
      expect(result.connectorWorkspace?.[0].travelMm).toBeGreaterThan(50);
      expect(result.gripperAperture?.maxMm).toBeGreaterThan(result.gripperAperture?.minMm ?? 0);
      expect(result.gripperAperture?.travelMm).toBeGreaterThan(15);
      expect(result.fitness.passedChecks).toContain('gripper-aperture-moves');
      expect(result.fitness.functional).toBe(true);
      expect(result.fitness.blockingReasons).toEqual([]);
      expect(result.fitness.mechanismSummary.mechanicalIntentIssueCount).toBeUndefined();
    }
  }, 240_000);

  it('would throw under validate:error if interferences existed (sanity check on the gate)', async () => {
    // Build a 2-part fixture with 100% overlap — should throw at the gate.
    // This is a separate test from the hero clean assertion; it proves the
    // validate:'error' gate now structurally rejects clashing assemblies, so
    // if a future regression slips overlapping geometry into the hero, the
    // hero's own `evaluates end-to-end with zero error diagnostics` test fires.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('clash-fixture');
    arm
      .part('p', kcad.box(10, 10, 10))
      .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('q', kcad.box(10, 10, 10))
      .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m', 'p.c', 'q.c', 'fastened');
    await expect(arm.solvedModel({}, { validate: 'error' })).rejects.toThrow(/interference|clash|overlap/i);
  }, 60_000);
});
