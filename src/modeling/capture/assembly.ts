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
  AssemblyState,
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
  readonly name: string;
  private readonly session: CaptureSession;
  private readonly parts: AssemblyPartStored[] = [];
  /** Q1.5: per-part lineage map (PartLineageMap) populated on every
   *  `.part(name, shape, opts?)` capture-site. Mirrors `FaceLineage` /
   *  `EdgeLineage` for the part scope so part-level Queries resolve
   *  through the same lineage pathway. Read-only outside this class;
   *  surfaced via `__partLineage()`. */
  private readonly partLineage: PartLineageMap = new Map();
  private readonly joints: AssemblyJointStored[] = [];
  /** v0.6 Task 5: mate records declared via `arm.mate(name, aRef, bRef, type)`.
   *  Surfaced on `Scene.mates` returned by `model()` / `solvedModel()`. */
  private readonly mates: MateRecord[] = [];
  private readonly mateCouplings: MateCouplingRecord[] = [];
  /**
   * P7: closed-loop balance-spring records declared via
   * `arm.tendon(name, opts)`. Each tendon spans two connectors on
   * different parts; mapped to MJCF `<tendon><spatial>` at physics-gate
   * export time. The capture-side store is a flat array; uniqueness
   * (name) + endpoint-connector existence are validated at insert.
   */
  private readonly tendons: TendonRecord[] = [];
  private readonly mechanicalJointIntents: MechanicalJointIntentRecord[] = [];
  private readonly jointSupportIntents: JointSupportIntentRecord[] = [];
  private readonly transmissionIntents: TransmissionIntentRecord[] = [];
  private readonly physicalUseCases: PhysicalUseCaseRecord[] = [];
  /**
   * v0.7 Slice 1 — declarative workspace-reachability targets from
   * `arm.workspace(connectorRef, opts)`. Consumed by
   * `validateWorkspaceReachability` against the sampled pose-envelope's
   * `ConnectorWorkspace[]`. Empty for assemblies that never call workspace().
   */
  private readonly workspaceTargets: WorkspaceTargetRecord[] = [];

  /** SRDF planning groups declared via `arm.planningGroup(...)`. Empty when
   *  the script did not declare any; SRDF export rejects in that case. */
  private readonly planningGroups: PlanningGroupRecord[] = [];
  private readonly endEffectors: EndEffectorRecord[] = [];
  private readonly virtualJoints: VirtualJointRecord[] = [];
  private readonly groupStates: GroupStateRecord[] = [];
  private readonly disabledCollisions: DisabledCollisionRecord[] = [];
  /**
   * Latest known-acceptable interference pair list, as captured by the most
   * recent `solvedModel({ ignore: [...] })` call. Read by external review
   * surfaces (`reviewCadTool`) so the validator they run respects the same
   * silencing the script's `solvedModel` did. The raw detection output stays
   * unfiltered — only the validator's diagnostic emission honors this list.
   */
  private ignoreInterferenceList: ReadonlyArray<readonly [string, string]> = [];

  constructor(name: string, session: CaptureSession) {
    this.name = name;
    this.session = session;
  }

  part(name: string, shape: Shape, opts: AssemblyPartOpts = {}): AssemblyPartRef {
    return recordPart(this as unknown as AssemblyState, name, shape, opts);
  }

  subAssembly(name: string, other: Assembly): SubAssemblyHandle {
    return recordSubAssembly(this as unknown as AssemblyState, name, other);
  }

  revolute(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: RevoluteJointOpts): AssemblyJointRef {
    return revoluteJoint(this as unknown as AssemblyState, name, a, b, opts);
  }

  prismatic(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: PrismaticJointOpts): AssemblyJointRef {
    return prismaticJoint(this as unknown as AssemblyState, name, a, b, opts);
  }

  ball(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: BallJointOpts): AssemblyJointRef {
    return ballJoint(this as unknown as AssemblyState, name, a, b, opts);
  }

  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef {
    return connectFixed(this as unknown as AssemblyState, name, a, b);
  }

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
    recordMate(this as unknown as AssemblyState, name, aRef, bRef, type, opts);
    return this;
  }

  coupleMates(
    driven: string,
    opts: { source: string; ratio: number; offset?: number },
  ): this {
    coupleMateRecords(this as unknown as AssemblyState, driven, opts);
    return this;
  }

  tendon(name: string, opts: TendonOptions): this {
    recordTendon(this as unknown as AssemblyState, name, opts);
    return this;
  }

  workspace(connectorRef: string, opts: WorkspaceTargetOpts): this {
    recordWorkspaceTarget(this as unknown as AssemblyState, connectorRef, opts);
    return this;
  }
  physicalUseCase(name: string, opts: PhysicalUseCaseOptions): this {
    recordPhysicalUseCase(this as unknown as AssemblyState, name, opts);
    return this;
  }

  planningGroup(
    name: string,
    opts: { chain?: { baseLink: string; tipLink: string }; joints?: string[]; links?: string[] },
  ): this {
    recordPlanningGroup(this as unknown as AssemblyState, name, opts);
    return this;
  }

  /** Declare an SRDF end-effector. */
  endEffector(
    name: string,
    opts: { parentLink: string; group: string; parentGroup: string },
  ): this {
    recordEndEffector(this as unknown as AssemblyState, name, opts);
    return this;
  }

  /** Declare an SRDF virtual joint (world -> base linkage). */
  virtualJoint(
    name: string,
    opts: { type: 'fixed' | 'floating' | 'planar'; parentFrame: string; childLink: string },
  ): this {
    recordVirtualJoint(this as unknown as AssemblyState, name, opts);
    return this;
  }

  /** Declare an SRDF named group state (a pose snapshot keyed by joint name). */
  groupState(name: string, group: string, values: Record<string, number>): this {
    recordGroupState(this as unknown as AssemblyState, name, group, values);
    return this;
  }

  /** Declare an SRDF allowed-collision override. */
  disableCollision(
    link1: string,
    link2: string,
    opts: { reason: 'Adjacent' | 'Never' | 'Default' | 'User' },
  ): this {
    recordDisabledCollision(this as unknown as AssemblyState, link1, link2, opts);
    return this;
  }

  mechanicalJoint(name: string, opts: MechanicalJointIntentOpts): this {
    recordMechanicalJoint(this as unknown as AssemblyState, name, opts);
    return this;
  }

  jointSupport(name: string, opts: JointSupportIntentOpts): this {
    recordJointSupport(this as unknown as AssemblyState, name, opts);
    return this;
  }

  transmission(name: string, opts: TransmissionIntentOpts): this {
    recordTransmission(this as unknown as AssemblyState, name, opts);
    return this;
  }

  /**
   * Internal accessor — read-only view of the registered parts for the v0.6
   * mate solver (`src/lib/mates/solver.ts`). Underscore-prefixed: not part of
   * the agent-facing surface. Mirrors `Scene.__sourceFeatureId` convention.
   */
  __parts(): readonly AssemblyPartStored[] {
    return this.parts;
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
    return this.partLineage;
  }

  /**
   * Internal accessor — read-only view of declared mate records for the v0.6
   * mate solver. Surfaces the same `MateRecord[]` already exposed via
   * `Scene.mates`, but without forcing a `makeScene` round-trip. Not public.
   */
  __mates(): readonly MateRecord[] {
    return this.mates;
  }

  __mateCouplings(): readonly MateCouplingRecord[] {
    return this.mateCouplings;
  }

  /**
   * P7: read-only view of declared tendon records. Consumed by
   * `assemblyToMjcf` (physics-gate export) and the Studio
   * TendonRenderer. Mirrors the `__mates()` underscore convention; the
   * agent-facing surface is `arm.tendon(...)` declaration only.
   */
  __tendons(): readonly TendonRecord[] {
    return this.tendons;
  }

  /**
   * Internal accessor — read-only view of `arm.workspace(...)` records for
   * the v0.7 Slice 1 reachability gate. Mirrors `__mates()` / `__parts()`.
   * Not public; the agent-facing surface is the `arm.workspace(...)`
   * declaration itself plus the `assembly.workspace.unreachable`
   * diagnostic surfaced on `scene.warnings` / through the validator throw.
   */
  __workspaceTargets(): readonly WorkspaceTargetRecord[] {
    return this.workspaceTargets;
  }

  __physicalUseCases(): readonly PhysicalUseCaseRecord[] {
    return this.physicalUseCases;
  }

  /** SRDF planning groups declared via `arm.planningGroup(...)`. */
  __planningGroups(): readonly PlanningGroupRecord[] {
    return this.planningGroups;
  }

  /** SRDF end-effectors declared via `arm.endEffector(...)`. */
  __endEffectors(): readonly EndEffectorRecord[] {
    return this.endEffectors;
  }

  /** SRDF virtual joints declared via `arm.virtualJoint(...)`. */
  __virtualJoints(): readonly VirtualJointRecord[] {
    return this.virtualJoints;
  }

  /** SRDF named group states declared via `arm.groupState(...)`. */
  __groupStates(): readonly GroupStateRecord[] {
    return this.groupStates;
  }

  /** SRDF allowed-collision overrides declared via `arm.disableCollision(...)`. */
  __disabledCollisions(): readonly DisabledCollisionRecord[] {
    return this.disabledCollisions;
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
    return this.ignoreInterferenceList;
  }

  __mechanicalJointIntents(): readonly MechanicalJointIntentRecord[] {
    return this.mechanicalJointIntents;
  }

  __jointSupportIntents(): readonly JointSupportIntentRecord[] {
    return this.jointSupportIntents;
  }

  __transmissionIntents(): readonly TransmissionIntentRecord[] {
    return this.transmissionIntents;
  }

  /**
   * Internal accessor — read-only view of declared v0.5 joints for the v0.6
   * mate-aware validator (`./lib/mates/validator.ts:validateAssemblyWithMates`).
   * Mirrors `__parts()` / `__mates()`. Not public; agents that need joint
   * metadata should read it off `Scene` via `model()` / `solvedModel()`.
   */
  __joints(): readonly AssemblyJointStored[] {
    return this.joints;
  }

  /**
   * Internal accessor — returns the underlying `CaptureSession` so the v0.6
   * mate-aware validator can call the existing v0.5 `validateAssembly(input)`
   * with the session's `FeatureRecord[]` (filtered by this assembly's name).
   * Not public; the agent-facing surface is `Assembly.model()` /
   * `Assembly.solvedModel()`, both of which already close over the session.
   */
  __session(): CaptureSession {
    return this.session;
  }
  __buildMateMetadata(): import('./captureSession').SolvedAssemblyMateMetadata | undefined {
    if (this.mates.length === 0) return undefined;
    return buildMateMetadata(this as unknown as AssemblyState);
  }

  /** See `solveJoints` in `assemblySolve.ts` for the full body-tree FK
   *  walk and the pose validation it runs before applying transforms. */
  solve(poses: Poses): SolvedKinematics {
    return solveJoints(this as unknown as AssemblyState, poses);
  }

  /** See `recordSolvedModel` in `assemblySolve.ts` for the full mate-aware
   *  validate/lower pipeline this delegates to. */
  solvedModel(
    poses: Poses,
    opts?: SolvedModelOptions,
  ): Promise<Scene> {
    return recordSolvedModel(this as unknown as AssemblyState, poses, opts);
  }

  model(): Scene {
    return recordModel(this as unknown as AssemblyState);
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

