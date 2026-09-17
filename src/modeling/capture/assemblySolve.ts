// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { formatScalarForError } from '../../shared/intent/types';
import type { FeatureId, Vec3 } from '../../shared/intent/types';
import type { Connector } from '../mates/connector';
import { parseConnectorRef } from '../mates/mate';
import { currentValue, toParam } from '../../shared/runtime/editableHelpers';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';
import { Transform } from '../../shared/runtime/se3';
import { reviewPoseEnvelope, type PoseEnvelopeDiagnostic } from '../mates/poseEnvelope';
import { solveMates } from '../mates/solver';
import { validateAssemblyWithMates, type ValidatorDiagnostic } from '../mates/validator';
import { Scene, type SceneDiagnostic, type ScenePart } from '../validation/scene';
import type { CaptureSession } from './captureSession';
import { forwardKinematics, type NumericPoses } from './forwardKinematics';
import type { Shape } from './proxy';
import type { Assembly } from './assembly';
import type {
  AssemblyJointStored,
  AssemblyPartStored,
  Poses,
} from './assemblyTypes';
import type { AssemblyState } from './assemblyState';
import { catalogPartSceneMetadataByShapeId, SolvedKinematics } from './solvedKinematics';

function resolveScalarPose(
  value: Editable<number>,
  jointName: string,
  jointKind: AssemblyJointStored['kind'],
  session: CaptureSession,
): number {
  if (!isParamRef(value) && typeof value !== 'number') {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.solve ${jointKind} joint '${jointName}' pose must be a finite number or ParamRef<number>; got ${formatScalarForError(value)}.`,
      undefined,
      'invalid-args.solve.bad-pose — pass a finite number or a ParamRef from kcad.param().',
    );
  }
  const resolved = currentValue(value as Editable<number>, session.paramTable);
  if (typeof resolved !== 'number' || !Number.isFinite(resolved)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.solve ${jointKind} joint '${jointName}' pose must be a finite number; got ${formatScalarForError(resolved)}.`,
      undefined,
      'invalid-args.solve.bad-pose — pass a finite number.',
    );
  }
  return resolved;
}

/**
 * Issue #537 — advisory out-of-limits check for the body-tree joint poses
 * passed to `Assembly.solve()` / `Assembly.solvedModel()`.
 *
 * For each revolute / prismatic joint that declares `limitsDeg` / `limitsMm`,
 * resolves the supplied pose to a numeric value (snapshot via the param table)
 * and emits one `kinematic.pose.out-of-limits` WARNING when the value falls
 * outside the closed `[min, max]` range. The pose is still applied by FK — the
 * diagnostic is advisory, closing the false-pass gap where a knee with
 * `limitsDeg:[-150,0]` posed to `+140` was accepted silently.
 *
 * Skips: joints with no declared limits, fixed joints, ball joints, joints with
 * no pose supplied, and any pose that cannot be resolved to a finite number
 * (shape errors are surfaced by the throwing validators upstream).
 *
 * Pure: joints + poses in, diagnostics out — shared by both solve() and
 * solvedModel() so the two surfaces report identically.
 */
function checkPoseLimits(
  joints: readonly AssemblyJointStored[],
  poses: Poses,
  session: CaptureSession,
): ValidatorDiagnostic[] {
  const out: ValidatorDiagnostic[] = [];
  for (const j of joints) {
    if (j.kind !== 'revolute' && j.kind !== 'prismatic') continue;
    const limits = j.kind === 'revolute' ? j.limitsDeg : j.limitsMm;
    if (limits === undefined) continue;
    const raw = poses[j.name];
    if (raw === undefined || Array.isArray(raw)) continue;
    if (!isParamRef(raw) && typeof raw !== 'number') continue;
    const value = currentValue(raw as Editable<number>, session.paramTable);
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const [min, max] = limits;
    if (value >= min && value <= max) continue;
    const unit = j.kind === 'revolute' ? '°' : 'mm';
    const field = j.kind === 'revolute' ? 'limitsDeg' : 'limitsMm';
    out.push({
      code: 'kinematic.pose.out-of-limits',
      severity: 'warning',
      message: `joint '${j.name}' pose ${value}${unit} exceeds declared ${field} [${min}, ${max}]`,
      hint: `invalid-args.kinematic.pose-out-of-limits — clamp '${j.name}' to [${min}, ${max}], or widen ${field} on the joint if the mechanism is intended to travel that far.`,
      mateName: j.name,
      pose: value,
      limits,
    });
  }
  return out;
}

/**
 * Build a SolvedKinematics for the supplied joint poses. Walks the
 * body-tree (parts as nodes, joints as edges) computing per-part world
 * transforms via SE(3) composition. Each part has at most one parent
 * joint; multi-joint chains compose correctly because outer-joint
 * rotations are baked into the parent's worldT before the inner joint
 * applies.
 *
 * Pose value type per joint kind:
 *   - revolute, prismatic: number (degrees / mm)
 *   - ball: [number, number, number] (XYZ Euler degrees, extrinsic)
 *   - fixed: NO pose accepted (throws if listed in poses)
 *
 * Joints not listed in poses default to 0 / [0,0,0]. Unknown joint names
 * raise feature.invalid-args. Validation runs before any FK math:
 *   - Pose values are finite + correct shape per joint kind.
 *   - Each part has at most one parent joint (no diamond / closed-chain).
 *   - Joint graph is acyclic (DFS detect).
 *
 * Side effect: applies the per-part SE(3) transform to each part's
 * `originalShape` via `Shape.transform(t)`. Calling solve() twice on the
 * same Assembly compounds transforms; build a fresh assembly per query.
 */
export function solveJoints(state: AssemblyState, poses: Poses): SolvedKinematics {
  // 1. Validate joint names supplied in poses. A pose key must resolve to a
  //    drivable joint declared via assembly.revolute/prismatic/fixed/ball
  //    (i.e. present in `this.joints` / `arm.__joints()`). Reject anything
  //    else BEFORE forwardKinematics reads `.kind` off the (undefined)
  //    lookup — that raw `TypeError: Cannot read properties of undefined
  //    (reading 'kind')` was issue #536. A *mate* (a constraint, not a
  //    posable DOF) gets a tailored hint pointing at the joint API.
  for (const name of Object.keys(poses)) {
    if (state.joints.find(j => j.name === name)) continue;
    const mate = state.mates.find(m => m.name === name);
    if (mate) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.solve: '${name}' is not a drivable joint. A ${mate.type} *mate* is a constraint, not a posable DOF — declare the joint with assembly.revolute(name, parent, child, { axis, origin }) (or .prismatic/.ball) to pose it.`,
        undefined,
        'invalid-args.solve.mate-not-joint — mates constrain DOFs; only joints declared via assembly.revolute/prismatic/fixed/ball are posable by solve(). To articulate the existing mate graph instead, call assembly.solvedModel(poses).',
      );
    }
    const known = state.joints.map(j => j.name);
    throw new KernelError(
      'feature.invalid-args',
      `assembly.solve: '${name}' is not a drivable joint. Defined joints: ${known.length === 0 ? '(none)' : known.join(', ')}.`,
      undefined,
      'invalid-args.solve.unknown-joint — pass only joint names declared via assembly.revolute/prismatic/fixed/ball.',
    );
  }

  // 2. Validate pose value shapes per joint kind, then resolve any ParamRef
  //    coords to concrete numbers using the session's current ParamTable
  //    (snapshot semantics — see header on `Poses`). Validation runs against
  //    the resolved numeric pose so non-finite ParamRef values surface the
  //    same hint as bad numeric poses.
  const numericPoses: NumericPoses = {};
  for (const j of state.joints) {
    const v = poses[j.name];
    if (v === undefined) continue;
    if (j.kind === 'fixed') {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.solve: joint '${j.name}' is fixed and accepts no pose; remove it from poses.`,
        undefined,
        'invalid-args.solve.fixed-pose — fixed joints have no DOF.',
      );
    }
    if (j.kind === 'ball') {
      if (!Array.isArray(v) || v.length !== 3) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve ball joint '${j.name}' pose must be [eulerXDeg, eulerYDeg, eulerZDeg]; got ${formatScalarForError(v)}.`,
          undefined,
          'invalid-args.solve.ball-pose — pass three finite numbers as the XYZ Euler triple.',
        );
      }
      const triple: [number, number, number] = [
        resolveScalarPose(v[0], j.name, j.kind, state.session),
        resolveScalarPose(v[1], j.name, j.kind, state.session),
        resolveScalarPose(v[2], j.name, j.kind, state.session),
      ];
      numericPoses[j.name] = triple;
    } else {
      // revolute or prismatic — single Editable<number>.
      if (Array.isArray(v)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve ${j.kind} joint '${j.name}' pose must be a finite number; got ${formatScalarForError(v)}.`,
          undefined,
          'invalid-args.solve.bad-pose — pass a finite number.',
        );
      }
      numericPoses[j.name] = resolveScalarPose(v, j.name, j.kind, state.session);
    }
  }

  // 3. Empty assembly is an authoring error.
  if (state.parts.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'assembly.solve requires at least one part.',
      undefined,
      'Call assembly.part(name, shape, opts?) before assembly.solve(poses).',
    );
  }

  // 4. Forward kinematics: pure body-tree FK (graph validation + SE(3) walk).
  //    Lives in forwardKinematics.ts so the lowerer can reach it without
  //    going through Assembly state.
  const worldT = forwardKinematics(state.parts, state.joints, numericPoses);

  // 5. Apply per-part transform to the original shape (mutates the Shape's
  //    transform stack via existing translate + rotate ShapeTransform pipes).
  for (const part of state.parts) {
    const T = worldT.get(part.id)!;
    part.originalShape.transform(T);
  }

  // 6. Issue #537 — advisory out-of-limits warnings for poses beyond a
  //    joint's declared limitsDeg/limitsMm. Computed (not thrown) so solve()
  //    still applies the pose; surfaced on the SolvedKinematics handle and
  //    its toScene() Scene.warnings.
  const limitWarnings = checkPoseLimits(state.joints, poses, state.session);

  // 7. Build SolvedKinematics handle. Hand it the already-resolved numeric
  //    pose record so the snapshot can never accidentally re-resolve.
  return new SolvedKinematics(
    state.name, state.parts, state.joints, worldT, numericPoses, state.session, limitWarnings,
  );
}

/**
 * Build the mate metadata payload threaded into `session.solvedAssembly`
 * so the OCCT lowerer's `solvedAssembly` case can run `mateFk` at
 * recompute time. Encodes connectors with their raw `ConnectorOrigin`
 * (topology queries resolved per-part on the already-lowered backend at
 * lower-time) and mates with `pose` lifted into `Param`-shape encoding so
 * `resolveParams` walks the metadata blob and updates `Param.evaluated`
 * on studio-driven param edits — keeping pose reactivity identical to
 * the v0.5 joint-pose path.
 *
 * Only collects connectors that are referenced by a mate; unreferenced
 * connectors don't influence FK and stay out of the FeatureRecord to
 * keep the recorded metadata minimal.
 */
export function buildMateMetadata(state: AssemblyState): import('./captureSession').SolvedAssemblyMateMetadata {
  // 1. Collect (partName, connectorName) pairs referenced by any mate.
  const refsByPartName = new Map<string, Set<string>>();
  for (const m of state.mates) {
    const aSide = parseConnectorRef(m.a);
    const bSide = parseConnectorRef(m.b);
    for (const side of [aSide, bSide]) {
      let set = refsByPartName.get(side.partName);
      if (!set) {
        set = new Set<string>();
        refsByPartName.set(side.partName, set);
      }
      set.add(side.connectorName);
    }
  }
  // 2. For each part referenced by mates, snapshot the relevant connectors.
  //    Connectors are kept structurally identical to the live Assembly view
  //    so the lowerer can plug them into `mateFk` after topology resolution.
  const connectorsByPartId: Record<FeatureId, Connector[]> = {};
  for (const part of state.parts) {
    const wanted = refsByPartName.get(part.name);
    if (!wanted || wanted.size === 0) continue;
    const list: Connector[] = [];
    for (const c of part.mateConnectors) {
      if (wanted.has(c.name)) list.push(c);
    }
    if (list.length > 0) connectorsByPartId[part.id] = list;
  }
  // 3. Encode mates with `pose` in Param shape so the recompute pipeline
  //    auto-resolves ParamRefs through `resolveParams` (same scheme as
  //    encoded joint poses on `metadata.poses`). Capture-time validation
  //    already rejects pose on fastened/planar mates (see `mate()` above).
  const encodedMates: import('./captureSession').EncodedMateRecord[] = state.mates.map((m) => {
    // Slice 2C: round-trip limit ranges through the encoded record so the
    // Studio's JointsTab can render limit marks on slider tracks.
    const limits = {
      ...(m.limitsDeg !== undefined ? { limitsDeg: m.limitsDeg } : {}),
      ...(m.limitsMm !== undefined ? { limitsMm: m.limitsMm } : {}),
    };
    if (m.pose === undefined) {
      return { name: m.name, a: m.a, b: m.b, type: m.type, ...limits };
    }
    if (Array.isArray(m.pose)) {
      return {
        name: m.name,
        a: m.a,
        b: m.b,
        type: m.type,
        pose: {
          kind: 'ball',
          value: [
            toParam(m.pose[0], 'deg'),
            toParam(m.pose[1], 'deg'),
            toParam(m.pose[2], 'deg'),
          ],
        },
        ...limits,
      };
    }
    // Scalar pose. Unit is cosmetic on the Param (lowerer reads .evaluated);
    // `'deg'` mirrors the joint-pose encoding choice above.
    return {
      name: m.name,
      a: m.a,
      b: m.b,
      type: m.type,
      pose: { kind: 'scalar', value: toParam(m.pose, 'deg') },
      ...limits,
    };
  });
  return {
    connectorsByPartId,
    mates: encodedMates,
    couplings: [...state.mateCouplings],
  };
}

/**
 * Build the capture-time `Scene` returned by `model()` / `solvedModel()`.
 *
 * Per-part data is the assembly's authoring-time view: `name` from
 * `assembly.part(name, ...)`, `shape` from each part's `originalShape`,
 * and `worldTransform` from the v0.6 mate solver when mates are declared
 * (Pattern A FK over `solveMates(arm, poses)`) or identity otherwise.
 * Identity is a no-op fall-back for v0.5 callers and for kinematic-zero
 * `model()` calls — the lowerer-side body-tree FK on `solvedAssembly`
 * still applies for v0.5 `arm.revolute/.fixed/.prismatic/.ball` joints.
 *
 * Precedence: when a part has BOTH an authoring `.translate(...)` chain
 * AND lives in a mate graph, the solver-assigned `worldTransform` wins on
 * the capture-time Scene. Authors mating parts should therefore declare
 * them in LOCAL frames (Fusion / OnShape / build123d convention).
 *
 * The Scene's `exportFn` closes over the upstream `solvedAssembly` /
 * `assemblyModel` feature id; calling `Scene.toCompound()` /
 * `Scene.toUnion()` records a downstream `assemblyExport` feature whose
 * lowerer reads the SceneBackend output.
 *
 * `bboxFn` is intentionally a "lower the model first" stub: AABBs over
 * transformed parts are recompute-time data; expose them via a future
 * `RecomputeResult.scene.bbox` (Task 9) rather than synchronously
 * lowering inside `Scene.bbox`.
 */
export function makeScene(
  state: AssemblyState,
  sceneShape: Shape,
  warnings: readonly SceneDiagnostic[] = [],
  matePartTransforms?: ReadonlyMap<string, Transform>,
): Scene {
  const sceneFeatureId = sceneShape.id;
  const session = state.session;
  const catalogMetadataByShapeId = catalogPartSceneMetadataByShapeId(session);
  const sceneParts: ScenePart[] = state.parts.map((p: AssemblyPartStored) => {
    const metadata = catalogMetadataByShapeId.get(p.originalShape.id);
    return {
      name: p.name,
      shape: p.originalShape,
      worldTransform: matePartTransforms?.get(p.name) ?? Transform.identity(),
      ...(metadata === undefined ? {} : { metadata }),
      ...(p.mateConnectors.length > 0 ? { connectors: [...p.mateConnectors] } : {}),
    };
  });
  return new Scene(
    state.name,
    sceneParts,
    () => {
      throw new KernelError(
        'feature.invalid-args',
        `Scene.bbox: capture-time AABB is not yet wired (Task 9). Lower the model and read the bounds from the recompute result, or call Scene.toCompound().boundingBox().`,
        sceneFeatureId,
        'invalid-args.scene.bbox-not-available — capture-time Scene bbox is computed during recompute; Task 9 surfaces it.',
      );
    },
    (op) => session.assemblyExport(sceneFeatureId, op),
    sceneFeatureId,
    state.mates.length > 0 ? [...state.mates] : undefined,
    warnings,
    state.tendons.length > 0 ? [...state.tendons] : undefined,
  );
}

/**
 * Lower the just-recorded `solvedAssembly` and run pairwise BREP
 * interference detection so the validate-gate can include
 * `assembly.interference.overlap` error-severity diagnostics in its
 * decision.
 *
 * This is the agent-safety closure for v0.6: `kernelcad evaluate`
 * (`KERNELCAD_VALIDATE_DEFAULT=error`) MUST refuse a clashing assembly,
 * not silently emit it. Reuses `detectInterferences` (BREP common-volume,
 * bbox pre-filter) on the lowered `SceneBackend` — same code path as the
 * standalone `kernelcad interference` CLI.
 *
 * Cost: full lower of the assembly's records + O(n²) bbox overlaps + a
 * boolean intersect per overlapping pair. Only called when
 * `opts.validate === 'error'`; cheap modes (`'warn'`, `'off'`) skip this.
 */
async function computeInterferencesForGate(
  state: AssemblyState,
  sceneShape: Shape,
): Promise<readonly import('../runtime/detectInterferences').InterferencePair[]> {
  const { RecomputeEngine } = await import('../compute/recomputeEngine');
  const { createOcctLowerer } = await import('../backends/occt/occtLowerer');
  const { initOcct } = await import('../../kernel/backends/occt/occtBackend');
  const { isSceneBackend } = await import('../../kernel/backends/sceneBackend');
  const { detectInterferences } = await import('../runtime/detectInterferences');

  await initOcct();
  const engine = new RecomputeEngine(createOcctLowerer(state.session));
  const records = state.session.getRecords();
  const r = await engine.run(records, {
    paramTable: state.session.paramTable,
    gatedFeatureNames: state.session.gatedFeatureNames,
  });

  // If the lower failed, defer to the validator's other diagnostics; an
  // un-lowerable assembly already has bigger problems. Return an empty
  // list so the gate doesn't double-flag the failure as interference.
  const lowered = r.shapes.get(sceneShape.id);
  if (!lowered || !isSceneBackend(lowered)) {
    return [];
  }

  const result = detectInterferences(lowered, 0.01, new Set<string>());
  return result.pairs;
}

export interface SolvedModelOptions {
  validate?: 'warn' | 'error' | 'off';
  /**
   * v0.7.4 — Which poses the validation gate covers. Orthogonal to
   * `validate` (which controls severity).
   *
   * - `'default'` (default) → the existing behavior: gate runs over the
   *   default/capture-time pose only. (When `validate === 'error'` AND
   *   at least one mate declares `limitsDeg`/`limitsMm`, the v0.6.2
   *   safety-net described below auto-runs the envelope review even
   *   without an explicit `posesGate` opt-in — see the implicit-path
   *   block further down.)
   * - `'envelope'` → after the existing default-pose gate, run
   *   `reviewPoseEnvelope(this, { samplesPerMate, combinatorial,
   *   includeInterference: true })` and fold the envelope diagnostics
   *   into the gate. Under `validate: 'error'` any envelope-error fails
   *   the call; under `validate: 'warn'` they surface on `scene.warnings`
   *   without throwing.
   *
   * Per-mate envelope sweep is configured by `samplesPerMate` /
   * `combinatorial` below — same semantics as `reviewPoseEnvelope`'s
   * `PoseEnvelopeSamplingOptions`.
   */
  posesGate?: 'default' | 'envelope';
  /** Forwarded to `reviewPoseEnvelope` when `posesGate === 'envelope'`. */
  samplesPerMate?: number;
  /** Forwarded to `reviewPoseEnvelope` when `posesGate === 'envelope'`. */
  combinatorial?: boolean;
  /**
   * v0.7.5 — optional per-part external loads for the Gate 3 stub
   * (`validateJointLoadCapacity`). Keys are part names already registered
   * on this Assembly via `arm.part(name, ...)`; values are world-frame
   * force (N) and/or torque (N·m) vectors. Unknown keys throw
   * `feature.invalid-args` at capture-entry below — silent ignore would
   * mask agent typos (per spec open-question 5 resolution). The Gate 3
   * check runs only under `validate: 'error'`; under `'warn'` / `'off'`
   * the loads are validated for key membership and otherwise ignored.
   *
   * Forwarded as the 4th arg to `validateAssemblyWithMates`, which
   * composes Gate 3 with the v0.7.5 grounding gates.
   */
  externalLoads?: Readonly<Record<string, { force?: Vec3; torque?: Vec3 }>>;
  /**
   * Known-acceptable interference pairs. Symmetric matching: `[a, b]`
   * silences both `(a, b)` and `(b, a)`. Pairs in `ignore` are still
   * DETECTED by the runtime BREP sweep (so a Studio HUD reading the raw
   * detection output still surfaces them on the status bar), but FILTERED
   * out of the validator's `assembly.interference.overlap` diagnostic
   * stream — they don't throw under `validate: 'error'` and don't appear
   * in `scene.warnings` under `validate: 'warn'`.
   *
   * This is the granular alternative to `validate: 'off'`. Use it when a
   * specific known-acceptable contact (e.g. a knuckle joint where two arm
   * parts must touch by design) should not block the validator while
   * still letting the rest of the validation gate run.
   */
  ignore?: ReadonlyArray<readonly [string, string]>;
}

/** Phase 1 of `solvedModel` — capture-entry validation + side effects that
 *  must run synchronously before any lowering: records the `ignore` list
 *  and rejects unknown `externalLoads` keys. Split out of `recordSolvedModel`
 *  to keep its branching complexity under the quality-ratchet budget; no
 *  behavior change from the inline version it replaces. */
function applySolvedModelEntryChecks(state: AssemblyState, opts?: SolvedModelOptions): void {
  if (state.parts.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'assembly.solvedModel requires at least one part.',
      undefined,
      'Call assembly.part(name, shape, opts?) before assembly.solvedModel(poses).',
    );
  }
  // Record the ignore list on the Assembly so external review surfaces
  // (reviewCadTool) re-run validation with the same known-acceptable
  // contacts the script silenced. The raw detection output stays
  // unfiltered so HUD-style consumers can show the user every contact.
  //
  // Only OVERWRITE when an explicit `ignore` was passed. Internal callers
  // like `detectInterferencesForPoses` re-invoke `solvedModel` without
  // opts.ignore to read a freshly-posed scene; nuking the list there would
  // wipe the agent-authored silencing every time the HUD re-detects on a
  // slider drag.
  if (opts?.ignore !== undefined) {
    state.ignoreInterferenceList = opts.ignore;
  }
  // v0.7.4 — validate externalLoads keys at capture entry so agent typos
  // surface immediately, not silently. Per spec open-question 5 resolution
  // (error on typo, not silent ignore).
  if (opts?.externalLoads !== undefined) {
    const knownParts = state.parts.map((p) => p.name);
    const knownSet = new Set(knownParts);
    for (const key of Object.keys(opts.externalLoads)) {
      if (!knownSet.has(key)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solvedModel: externalLoads['${key}'] does not match any part on assembly '${state.name}'.`,
          undefined,
          `invalid-args.assembly.external-load-unknown-part — externalLoads['${key}'] does not match any part; known parts: ${knownParts.join(', ')}.`,
        );
      }
    }
  }
}

/** Phase 2 of `solvedModel` — collect poses, run the v0.6 mate solver /
 *  optional pose-envelope review, and detect interference (only under
 *  `mode === 'error'`). Split out of `recordSolvedModel` for the same
 *  complexity-budget reason as `applySolvedModelEntryChecks`; no behavior
 *  change. */
function gatherSolvedModelGateInputs(
  state: AssemblyState,
  arm: Assembly,
  sceneShape: Shape,
  mode: 'warn' | 'error' | 'off',
  opts?: SolvedModelOptions,
): {
  interferencePromise: Promise<readonly import('../runtime/detectInterferences').InterferencePair[] | undefined>;
  envelopeResultPromise: Promise<import('../mates/poseEnvelope').PoseEnvelopeReviewResult | undefined>;
} {
  // Under `'error'` mode (the harness gate set by `kernelcad evaluate`), also
  // run pairwise BREP interference detection and fold the results into the
  // validator. Solid bodies sharing volume is mechanically invalid, so the
  // harness MUST refuse to ship a clashing assembly. The interference check
  // is BREP-level and expensive (lowers the assembly + boolean intersects
  // each bbox-overlapping pair), so we deliberately skip it under
  // `'warn'` / `'off'` to keep the everyday capture-time `arm.solvedModel()`
  // call cheap — interference is opt-in via the gate.
  const interferencePromise: Promise<readonly import('../runtime/detectInterferences').InterferencePair[] | undefined> =
    mode === 'error'
      ? computeInterferencesForGate(state, sceneShape)
      : Promise.resolve(undefined);

  // v0.7.4 — pose-envelope review is now EXPLICIT-only via the
  // `posesGate: 'envelope'` opt (workstream 5a / PR #157). The v0.6.2 plan
  // had proposed an IMPLICIT auto-wire (run envelope when `validate:'error'`
  // AND any mate has limits), but workstream 5a's settled API surface in
  // PR #157 chose the explicit opt instead and ships a regression test
  // (`src/modeling/capture/posesGate.test.ts`) asserting that `posesGate: 'default'`
  // does NOT throw on envelope-only errors — even under `validate:'error'`.
  //
  // The implicit-auto-wire codepath is therefore dropped on merge to develop;
  // its safety-net role is preserved via TWO complementary surfaces:
  //   - `assembly.mate.limit-missing` warning fires from
  //     `validateAssemblyWithMates` unconditionally for articulated mates
  //     without declared limits — the AUTHORING surface, not the envelope
  //     output. This nudges agents to declare limits in the first place.
  //   - The `posesGate: 'envelope'` opt remains the path to actually run
  //     envelope review; agents wanting the v0.6.2 auto-coverage simply
  //     pass `posesGate: 'envelope'` (or use `kernelcad evaluate --envelope`).
  //
  // See the v0.7.5 CHANGELOG entry and the merge commit message for the
  // full rationale.
  const posesGate: 'default' | 'envelope' = opts?.posesGate ?? 'default';
  const envelopeResultPromise: Promise<
    import('../mates/poseEnvelope').PoseEnvelopeReviewResult | undefined
  > =
    posesGate === 'envelope'
      ? reviewPoseEnvelope(arm, {
          ...(opts?.samplesPerMate !== undefined ? { samplesPerMate: opts.samplesPerMate } : {}),
          ...(opts?.combinatorial !== undefined ? { combinatorial: opts.combinatorial } : {}),
          includeInterference: true,
        })
      : Promise.resolve(undefined);

  return { interferencePromise, envelopeResultPromise };
}

/** Phase 3 of `solvedModel` — run the v0.6 mate-aware validator over the
 *  gathered interference pairs / envelope result. Split out of
 *  `recordSolvedModel` for the same complexity-budget reason as
 *  `applySolvedModelEntryChecks`; no behavior change. */
async function validateSolvedModelGate(
  arm: Assembly,
  interferencePairs: readonly import('../runtime/detectInterferences').InterferencePair[] | undefined,
  opts: SolvedModelOptions | undefined,
  envelopeResult: import('../mates/poseEnvelope').PoseEnvelopeReviewResult | undefined,
): Promise<{ result: import('../mates/validator').ValidatorResult; envelopeDiagnostics: readonly PoseEnvelopeDiagnostic[] }> {
  // v0.7.5 — `validateAssemblyWithMates` 3rd-arg (`poseEnvelopeResult`)
  // is left undefined: the explicit `posesGate: 'envelope'` path keeps
  // its diagnostics in a separate stream so the dedicated throw-by-code-
  // counts block below can fire on them under `'error'` and aggregate
  // them on scene.warnings under `'warn'`. The validator still emits
  // `assembly.mate.limit-missing` warnings, Gate 1/2/3 diagnostics, and
  // every v0.5/v0.6 base check.
  //
  // v0.7 Slice 1 — the 5th arg (`connectorWorkspace`) is the AABB-only
  // sampled view of `envelopeResult` consumed by the workspace gate.
  // We pass it separately from `poseEnvelopeResult` so the existing
  // envelope-throw aggregation logic below stays the sole consumer of
  // envelope diagnostics (avoids double-folding) while still letting
  // `validateWorkspaceReachability` read the connector AABBs.
  const result = await validateAssemblyWithMates(
    arm,
    interferencePairs,
    undefined,
    opts?.externalLoads,
    envelopeResult?.connectorWorkspace,
    opts?.ignore,
  );
  const envelopeDiagnostics: readonly PoseEnvelopeDiagnostic[] =
    envelopeResult ? envelopeResult.diagnostics : [];
  return { result, envelopeDiagnostics };
}

/** Phase 4 of `solvedModel` — turn the validator result into either a thrown
 *  `KernelError` (`mode === 'error'`) or an aggregated-warnings `Scene`
 *  (`mode === 'warn'`). Split out of `recordSolvedModel` for the same
 *  complexity-budget reason as `applySolvedModelEntryChecks`; no behavior
 *  change. */
function finalizeSolvedModelScene(
  state: AssemblyState,
  sceneShape: Shape,
  mode: 'warn' | 'error' | 'off',
  result: import('../mates/validator').ValidatorResult,
  envelopeDiagnostics: readonly PoseEnvelopeDiagnostic[],
  mateT: ReadonlyMap<string, Transform> | undefined,
  limitWarnings: readonly SceneDiagnostic[],
): Scene {
  if (mode === 'error') {
    const errDiag = result.diagnostics.find((d) => d.severity === 'error');
    // Status-driven fallback: `over-constrained` / `did-not-converge`
    // always carry an error-severity diagnostic per validator.ts, so the
    // `errDiag` lookup catches them; the explicit status check below is
    // a belt-and-suspenders guarantee for the spec wording.
    if (errDiag) {
      throw new KernelError(
        'feature.invalid-args',
        errDiag.message,
        undefined,
        errDiag.hint,
      );
    }
    if (result.status === 'over-constrained' || result.status === 'did-not-converge') {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.solvedModel: validator reported status '${result.status}' for assembly '${state.name}'.`,
        undefined,
        `invalid-args.assembly.${result.status} — inspect arm via validateAssemblyWithMates(arm) for the per-mate diagnostic chain.`,
      );
    }
    // T6: throw if the pose-envelope review (when enabled) surfaced any
    // error-severity diagnostic. The message lists code counts so a
    // caller can grep for the specific failure family.
    const envelopeErrors = envelopeDiagnostics.filter((d) => d.severity === 'error');
    if (envelopeErrors.length > 0) {
      const counts = new Map<string, number>();
      for (const d of envelopeErrors) {
        counts.set(d.code, (counts.get(d.code) ?? 0) + 1);
      }
      const codeSummary = Array.from(counts.entries())
        .map(([code, count]) => `${code} (x${count})`)
        .join(', ');
      const sampleHint = envelopeErrors[0].hint;
      throw new KernelError(
        'feature.invalid-args',
        `solvedModel: pose-envelope errors: ${codeSummary}`,
        undefined,
        sampleHint,
      );
    }
    // error mode: warnings/info silently dropped per T9 spec.
    return makeScene(state, sceneShape, [], mateT);
  }
  // warn mode: attach all diagnostics (error/warning/info) to
  // scene.warnings. When posesGate === 'envelope', the envelope review
  // diagnostics are appended after the default-pose validator's.
  const aggregated: readonly SceneDiagnostic[] = [
    ...result.diagnostics,
    ...envelopeDiagnostics,
    ...limitWarnings,
  ];
  return makeScene(state, sceneShape, aggregated, mateT);
}

/**
 * Records a `solvedAssembly` FeatureRecord that captures the parts,
 * joints, per-joint poses (with ParamRefs preserved), AND — when the
 * assembly declares any `arm.mate(...)` records — the v0.6 mate graph +
 * the connectors those mates reference. The lowerer resolves the poses
 * against the live ParamTable at recompute time, runs `forwardKinematics`
 * over v0.5 joints AND `mateFk` over the mate graph (when present), and
 * emits a `SceneBackend` that carries each part's local-frame shape,
 * world transform, and color attribution so studio-driven param edits
 * re-pose the rendered scene reactively without re-running the script.
 *
 * Precedence at lower-time: a part's world transform is sourced as
 * `mateFk > forwardKinematics > identity` — i.e. when a part is both in
 * a mate graph and on a v0.5 joint tree, the mate-derived placement wins.
 *
 * Returns a `Promise<Scene>` (multi-body view, frozen). The Promise
 * wraps the v0.6 mate-aware validator pass — the `opts.validate` gate
 * runs `validateAssemblyWithMates(this)` and either attaches
 * diagnostics to `scene.warnings` (`'warn'`, default), throws on the
 * first error-severity diagnostic (`'error'`), or skips validation
 * (`'off'`). The default flips to `'error'` when
 * `KERNELCAD_VALIDATE_DEFAULT=error` is set in the environment (T10
 * wires this from `kernelcad evaluate`).
 *
 * Capture-time pose validation (unknown joint, ball-vs-scalar pose
 * shape) throws SYNCHRONOUSLY from this method — the validator gate
 * runs only after the upstream `solvedAssembly` feature has been
 * recorded, so callers using `expect(() => arm.solvedModel(...)).toThrow`
 * for pose errors keep working without rewriting to `.rejects.toThrow`.
 *
 * Use `Scene.toCompound()` for a TopoDS_Compound (lossless) or
 * `Scene.toUnion()` for an explicit boolean fuse (lossy).
 *
 * Split into phases (`applySolvedModelEntryChecks` → gather gate inputs →
 * `validateSolvedModelGate` → `finalizeSolvedModelScene`) so no function in
 * this file exceeds the quality-ratchet line budget; no behavior change
 * from the single-method version it replaces.
 */
export function recordSolvedModel(
  state: AssemblyState,
  arm: Assembly,
  poses: Poses,
  opts?: SolvedModelOptions,
): Promise<Scene> {
  applySolvedModelEntryChecks(state, opts);

  // Synchronous phase — must throw (not reject) so existing
  // `expect(() => arm.solvedModel(badPoses)).toThrow(...)` capture-time
  // tests continue to pass without conversion. `session.solvedAssembly`
  // is the source of `invalid-args.solvedModel.{unknown-joint,pose-shape}`.
  //
  // v0.6 T17: also feed mate metadata into the FeatureRecord when the
  // assembly declares mates. The lowerer's `solvedAssembly` case runs
  // `mateFk` over this metadata so the rendered output (compound, STL,
  // STEP) actually reflects mate-driven placement — not just the
  // capture-time `Scene.parts[].worldTransform` (T16).
  const mateMetadata = state.mates.length > 0 ? buildMateMetadata(state) : undefined;
  const sceneShape = state.session.solvedAssembly(
    state.name,
    state.parts,
    state.joints,
    poses,
    mateMetadata,
  );

  // Issue #537 — advisory out-of-limits warnings for body-tree joint poses
  // beyond their declared limitsDeg/limitsMm. Computed here (after the
  // capture-time pose-shape validation in `solvedAssembly` has run) and
  // folded into the warn-mode `scene.warnings` aggregate below. The pose is
  // still applied; these never throw (they stay severity 'warning', so the
  // 'error'-mode error-find skips them and the 'off' branch drops them).
  const limitWarnings = checkPoseLimits(state.joints, poses, state.session);

  // Mode resolution: explicit opts win; otherwise read the env override
  // (T10 sets this from `kernelcad evaluate`). Default for everything else
  // is `'warn'` — never breaking, never silent.
  const envDefault = process.env.KERNELCAD_VALIDATE_DEFAULT === 'error' ? 'error' : 'warn';
  const mode: 'warn' | 'error' | 'off' = opts?.validate ?? envDefault;

  // Compute mate-driven per-part world transforms first. This is the v0.6
  // Pattern A FK output — when mates are declared the solver's transforms
  // win on the capture-time Scene (parts authored in LOCAL frames).
  // `solveMates` is a no-op when no mates are declared (empty map);
  // skipping the call avoids paying for a tree walk on v0.5 assemblies.
  const mateTransformsPromise: Promise<ReadonlyMap<string, Transform> | undefined> =
    state.mates.length > 0
      ? solveMates(arm, poses as NumericPoses).then((r) => r.poses)
      : Promise.resolve(undefined);

  if (mode === 'off') {
    // No validation, empty warnings — Scene still gets mate-driven
    // worldTransforms so the user-visible placement matches the mate
    // graph even with validation disabled.
    return mateTransformsPromise.then((mateT) =>
      makeScene(state, sceneShape, [], mateT),
    );
  }

  const { interferencePromise, envelopeResultPromise } = gatherSolvedModelGateInputs(state, arm, sceneShape, mode, opts);

  return Promise.all([
    interferencePromise,
    mateTransformsPromise,
    envelopeResultPromise,
  ]).then(([interferencePairs, mateT, envelopeResult]) =>
    validateSolvedModelGate(arm, interferencePairs, opts, envelopeResult).then(
      ({ result, envelopeDiagnostics }) =>
        finalizeSolvedModelScene(state, sceneShape, mode, result, envelopeDiagnostics, mateT, limitWarnings),
    ),
  );
}
