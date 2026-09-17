// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Scene } from '../validation/scene';
import type { MateCouplingRecord } from '../mates/coupledPoses';
import type {
  MateCapacity,
  MateLimitRange,
  MateLoadLimit,
  MatePose,
  MateRecord,
} from '../mates/mate';
import type { MateType } from '../mates/mateTypes';
import type {
  TendonOptions,
  TendonRecord,
} from '../mates/tendon';
import type {
  WorkspaceTargetOpts,
  WorkspaceTargetRecord,
} from '../mates/workspaceTarget';
import type {
  PhysicalUseCaseOptions,
  PhysicalUseCaseRecord,
} from '../mates/physicalUseCase';
import type { PartLineageMap } from '../../kernel/naming/evolutionRecord';
import type { CaptureSession } from './captureSession';
import type { Shape } from './proxy';
import {
  ballJoint,
  connectFixed,
  coupleMateRecords,
  prismaticJoint,
  recordMate,
  recordTendon,
  recordWorkspaceTarget,
  revoluteJoint,
} from './assemblyJoints';
import {
  recordDisabledCollision,
  recordEndEffector,
  recordGroupState,
  recordJointSupport,
  recordMechanicalJoint,
  recordPhysicalUseCase,
  recordPlanningGroup,
  recordTransmission,
  recordVirtualJoint,
} from './assemblyIntents';
import { buildMateMetadata, recordSolvedModel, solveJoints, type SolvedModelOptions } from './assemblySolve';
import { recordModel } from './assemblyModel';
import { SolvedKinematics } from './solvedKinematics';
import { recordPart, recordSubAssembly } from './assemblyParts';
import { createAssemblyState, type AssemblyState } from './assemblyState';

export * from './assemblyTypes';
export { SolvedKinematics } from './solvedKinematics';
import type {
  AssemblyConnectorRef,
  AssemblyConnectRef,
  AssemblyJointRef,
  AssemblyJointStored,
  AssemblyPartOpts,
  AssemblyPartRef,
  AssemblyPartStored,
  BallJointOpts,
  DisabledCollisionRecord,
  EndEffectorRecord,
  GroupStateRecord,
  JointSupportIntentOpts,
  JointSupportIntentRecord,
  MechanicalJointIntentOpts,
  MechanicalJointIntentRecord,
  PlanningGroupRecord,
  Poses,
  PrismaticJointOpts,
  RevoluteJointOpts,
  SubAssemblyHandle,
  TransmissionIntentOpts,
  TransmissionIntentRecord,
  VirtualJointRecord,
} from './assemblyTypes';

export class Assembly {
  /**
   * All mutable capture-side state lives in one `AssemblyState` value
   * (declared in `assemblyState.ts`, not re-exported from this module) so
   * the plain functions in `assemblyJoints.ts` / `assemblyIntents.ts` /
   * `assemblySolve.ts` / `assemblyModel.ts` / `assemblyParts.ts` that
   * implement this class's method bodies can take `this.state` directly —
   * no cast, and no field on this class becomes public.
   */
  private readonly state: AssemblyState;

  get name(): string {
    return this.state.name;
  }

  constructor(name: string, session: CaptureSession) {
    this.state = createAssemblyState(name, session);
  }

  part(name: string, shape: Shape, opts: AssemblyPartOpts = {}): AssemblyPartRef {
    return recordPart(this.state, this, name, shape, opts);
  }

  /** See `recordSubAssembly` in `assemblyParts.ts` for the full
   *  sub-assembly-import contract. */
  subAssembly(name: string, other: Assembly): SubAssemblyHandle {
    return recordSubAssembly(this.state, this, name, other);
  }

  /** See `revoluteJoint` in `assemblyJoints.ts`. */
  revolute(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: RevoluteJointOpts): AssemblyJointRef {
    return revoluteJoint(this.state, name, a, b, opts);
  }

  prismatic(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: PrismaticJointOpts): AssemblyJointRef {
    return prismaticJoint(this.state, name, a, b, opts);
  }

  /** See `ballJoint` in `assemblyJoints.ts`. */
  ball(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: BallJointOpts): AssemblyJointRef {
    return ballJoint(this.state, name, a, b, opts);
  }

  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef {
    return connectFixed(this.state, name, a, b);
  }

  /** See `recordMate` in `assemblyJoints.ts` for the full typed-mate
   *  contract (per-type pose shape, connector-compatibility errors, and
   *  how the record is surfaced on `Scene.mates`). */
  mate(
    name: string,
    aRef: string,
    bRef: string,
    type: MateType,
    opts?: {
      pose?: MatePose;
      limitsDeg?: MateLimitRange;
      limitsMm?: MateLimitRange;
      exposure?: 'exposed' | 'concealed';
      capacity?: MateCapacity;
      /** @deprecated legacy manual-load API */
      maxLoad?: MateLoadLimit;
    },
  ): this {
    recordMate(this.state, name, aRef, bRef, type, opts);
    return this;
  }

  coupleMates(
    driven: string,
    opts: { source: string; ratio: number; offset?: number },
  ): this {
    coupleMateRecords(this.state, driven, opts);
    return this;
  }

  /** See `recordTendon` in `assemblyJoints.ts` for the full passive
   *  balance-spring contract. */
  tendon(name: string, opts: TendonOptions): this {
    recordTendon(this.state, name, opts);
    return this;
  }

  /** See `recordWorkspaceTarget` in `assemblyJoints.ts` for the full
   *  declarative workspace-reachability contract. */
  workspace(connectorRef: string, opts: WorkspaceTargetOpts): this {
    recordWorkspaceTarget(this.state, connectorRef, opts);
    return this;
  }

  /** See `recordPhysicalUseCase` in `assemblyIntents.ts`. */
  physicalUseCase(name: string, opts: PhysicalUseCaseOptions): this {
    recordPhysicalUseCase(this.state, name, opts);
    return this;
  }

  /** See `recordPlanningGroup` in `assemblyIntents.ts` for the full SRDF
   *  planning-group contract. */
  planningGroup(
    name: string,
    opts: { chain?: { baseLink: string; tipLink: string }; joints?: string[]; links?: string[] },
  ): this {
    recordPlanningGroup(this.state, name, opts);
    return this;
  }

  /** Declare an SRDF end-effector. */
  endEffector(
    name: string,
    opts: { parentLink: string; group: string; parentGroup: string },
  ): this {
    recordEndEffector(this.state, name, opts);
    return this;
  }

  /** Declare an SRDF virtual joint (world -> base linkage). */
  virtualJoint(
    name: string,
    opts: { type: 'fixed' | 'floating' | 'planar'; parentFrame: string; childLink: string },
  ): this {
    recordVirtualJoint(this.state, name, opts);
    return this;
  }

  /** Declare an SRDF named group state (a pose snapshot keyed by joint name). */
  groupState(name: string, group: string, values: Record<string, number>): this {
    recordGroupState(this.state, name, group, values);
    return this;
  }

  /** Declare an SRDF allowed-collision override. */
  disableCollision(
    link1: string,
    link2: string,
    opts: { reason: 'Adjacent' | 'Never' | 'Default' | 'User' },
  ): this {
    recordDisabledCollision(this.state, link1, link2, opts);
    return this;
  }

  mechanicalJoint(name: string, opts: MechanicalJointIntentOpts): this {
    recordMechanicalJoint(this.state, name, opts);
    return this;
  }

  jointSupport(name: string, opts: JointSupportIntentOpts): this {
    recordJointSupport(this.state, name, opts);
    return this;
  }

  transmission(name: string, opts: TransmissionIntentOpts): this {
    recordTransmission(this.state, name, opts);
    return this;
  }

  /**
   * Internal accessor — read-only view of the registered parts for the v0.6
   * mate solver (`src/lib/mates/solver.ts`). Underscore-prefixed: not part of
   * the agent-facing surface. Mirrors `Scene.__sourceFeatureId` convention.
   */
  __parts(): readonly AssemblyPartStored[] {
    return this.state.parts;
  }

  /**
   * Q1.5 — Internal accessor: read-only view of the per-part lineage map.
   *
   * Mirrors `FaceLineage` / `EdgeLineage` for the part scope. Consumed by
   * the (future) Q3 query evaluator's `Query<Part>` branch and the future
   * Drake `tipLink: Query<unknown>` consumer; both resolve part-level
   * Queries by walking this map.
   *
   * The returned map is the live internal map by reference — callers must
   * treat it as read-only. Mirrors the `__parts()` / `__mates()`
   * underscore-prefixed convention; not part of the agent-facing surface.
   */
  __partLineage(): PartLineageMap {
    return this.state.partLineage;
  }

  /**
   * Internal accessor — read-only view of declared mate records for the v0.6
   * mate solver. Surfaces the same `MateRecord[]` already exposed via
   * `Scene.mates`, but without forcing a `makeScene` round-trip. Not public.
   */
  __mates(): readonly MateRecord[] {
    return this.state.mates;
  }

  __mateCouplings(): readonly MateCouplingRecord[] {
    return this.state.mateCouplings;
  }

  /**
   * P7: read-only view of declared tendon records. Consumed by
   * `assemblyToMjcf` (physics-gate export) and the Studio
   * TendonRenderer. Mirrors the `__mates()` underscore convention; the
   * agent-facing surface is `arm.tendon(...)` declaration only.
   */
  __tendons(): readonly TendonRecord[] {
    return this.state.tendons;
  }

  /**
   * Internal accessor — read-only view of `arm.workspace(...)` records for
   * the v0.7 Slice 1 reachability gate. Mirrors `__mates()` / `__parts()`.
   * Not public; the agent-facing surface is the `arm.workspace(...)`
   * declaration itself plus the `assembly.workspace.unreachable`
   * diagnostic surfaced on `scene.warnings` / through the validator throw.
   */
  __workspaceTargets(): readonly WorkspaceTargetRecord[] {
    return this.state.workspaceTargets;
  }

  __physicalUseCases(): readonly PhysicalUseCaseRecord[] {
    return this.state.physicalUseCases;
  }

  /** SRDF planning groups declared via `arm.planningGroup(...)`. */
  __planningGroups(): readonly PlanningGroupRecord[] {
    return this.state.planningGroups;
  }

  /** SRDF end-effectors declared via `arm.endEffector(...)`. */
  __endEffectors(): readonly EndEffectorRecord[] {
    return this.state.endEffectors;
  }

  /** SRDF virtual joints declared via `arm.virtualJoint(...)`. */
  __virtualJoints(): readonly VirtualJointRecord[] {
    return this.state.virtualJoints;
  }

  /** SRDF named group states declared via `arm.groupState(...)`. */
  __groupStates(): readonly GroupStateRecord[] {
    return this.state.groupStates;
  }

  /** SRDF allowed-collision overrides declared via `arm.disableCollision(...)`. */
  __disabledCollisions(): readonly DisabledCollisionRecord[] {
    return this.state.disabledCollisions;
  }

  /**
   * Last `ignore` list passed to `solvedModel`. External review surfaces
   * (`reviewCadTool`) read this so the validator they re-run honors the same
   * known-acceptable contacts the script silenced. Empty when no
   * `solvedModel({ ignore })` has been called yet. Mirrors the `__mates()` /
   * `__parts()` underscore-prefixed convention; not part of the agent-facing
   * surface.
   */
  __ignoreInterference(): ReadonlyArray<readonly [string, string]> {
    return this.state.ignoreInterferenceList;
  }

  __mechanicalJointIntents(): readonly MechanicalJointIntentRecord[] {
    return this.state.mechanicalJointIntents;
  }

  __jointSupportIntents(): readonly JointSupportIntentRecord[] {
    return this.state.jointSupportIntents;
  }

  __transmissionIntents(): readonly TransmissionIntentRecord[] {
    return this.state.transmissionIntents;
  }

  /**
   * Internal accessor — read-only view of declared v0.5 joints for the v0.6
   * mate-aware validator (`./lib/mates/validator.ts:validateAssemblyWithMates`).
   * Mirrors `__parts()` / `__mates()`. Not public; agents that need joint
   * metadata should read it off `Scene` via `model()` / `solvedModel()`.
   */
  __joints(): readonly AssemblyJointStored[] {
    return this.state.joints;
  }

  /**
   * Internal accessor — returns the underlying `CaptureSession` so the v0.6
   * mate-aware validator can call the existing v0.5 `validateAssembly(input)`
   * with the session's `FeatureRecord[]` (filtered by this assembly's name).
   * Not public; the agent-facing surface is `Assembly.model()` /
   * `Assembly.solvedModel()`, both of which already close over the session.
   */
  __session(): CaptureSession {
    return this.state.session;
  }
  __buildMateMetadata(): import('./captureSession').SolvedAssemblyMateMetadata | undefined {
    if (this.state.mates.length === 0) return undefined;
    return buildMateMetadata(this.state);
  }

  /** See `solveJoints` in `assemblySolve.ts` for the full body-tree FK
   *  walk and the pose validation it runs before applying transforms. */
  solve(poses: Poses): SolvedKinematics {
    return solveJoints(this.state, poses);
  }

  /** See `recordSolvedModel` in `assemblySolve.ts` for the full mate-aware
   *  validate/lower pipeline this delegates to. */
  solvedModel(
    poses: Poses,
    opts?: SolvedModelOptions,
  ): Promise<Scene> {
    return recordSolvedModel(this.state, this, poses, opts);
  }

  /** See `recordModel` in `assemblyModel.ts`. */
  model(): Scene {
    return recordModel(this.state);
  }

}

export function makeAssembly(name: string | undefined, session: CaptureSession): Assembly {
  const arm = new Assembly(name?.trim() || 'assembly', session);
  // v0.6: register on the session so MCP tools (`add_connector`, `add_mate`,
  // `list_mates`, `validate_assembly`, `solve_mates`) can look up the live
  // Assembly after `evaluate_script` settles. Multiple `kcad.assembly(name)`
  // calls with the same name in one script alias to the last instance — the
  // capture-side throws if duplicate part / connector names appear within an
  // Assembly anyway, so the alias is unambiguous in practice.
  session.assemblies.set(arm.name, arm);
  return arm;
}
