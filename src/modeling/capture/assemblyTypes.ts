// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId, Vec3, Vec3Param, EditableVec3 } from '../../shared/intent/types';
import type { Connector, ConnectorOriginInput, ConnectorType } from '../mates/connector';
import type { WrapGeomOptions, WrapGeomRecord } from '../mates/tendon';
import type { Editable } from '../../shared/runtime/paramRef';
import type { Shape } from './proxy';
import type { Scene } from '../validation/scene';
import type { Assembly, SolvedKinematics } from './assembly';
import type { CaptureSession } from './captureSession';
import type { MateCouplingRecord } from '../mates/coupledPoses';
import type { MateRecord } from '../mates/mate';
import type { TendonRecord } from '../mates/tendon';
import type { WorkspaceTargetRecord } from '../mates/workspaceTarget';
import type { PhysicalUseCaseRecord } from '../mates/physicalUseCase';
import type { PartLineageMap } from '../../kernel/naming/evolutionRecord';

/**
 * Internal state surface shared between `Assembly` (the facade class) and
 * the plain functions in `assemblyJoints.ts` / `assemblyIntents.ts` /
 * `assemblySolve.ts` / `assemblyModel.ts` that implement its method bodies.
 * `Assembly` implements this; it is never constructed independently.
 */
export interface AssemblyState {
  readonly name: string;
  readonly session: CaptureSession;
  readonly parts: AssemblyPartStored[];
  readonly partLineage: PartLineageMap;
  readonly joints: AssemblyJointStored[];
  readonly mates: MateRecord[];
  readonly mateCouplings: MateCouplingRecord[];
  readonly tendons: TendonRecord[];
  readonly mechanicalJointIntents: MechanicalJointIntentRecord[];
  readonly jointSupportIntents: JointSupportIntentRecord[];
  readonly transmissionIntents: TransmissionIntentRecord[];
  readonly physicalUseCases: PhysicalUseCaseRecord[];
  readonly workspaceTargets: WorkspaceTargetRecord[];
  readonly planningGroups: PlanningGroupRecord[];
  readonly endEffectors: EndEffectorRecord[];
  readonly virtualJoints: VirtualJointRecord[];
  readonly groupStates: GroupStateRecord[];
  readonly disabledCollisions: DisabledCollisionRecord[];
  ignoreInterferenceList: ReadonlyArray<readonly [string, string]>;
}

/**
 * Public pose surface for `Assembly.solve(poses)` and (Tasks 3-5)
 * `Assembly.solvedModel(poses)`. Per-joint values may be number literals
 * or ParamRefs (or, for ball joints, a per-axis tuple mixing both).
 *
 * - revolute, prismatic: `Editable<number>` (degrees / mm)
 * - ball: `[Editable<number>, Editable<number>, Editable<number>]`
 *   (XYZ Euler degrees, extrinsic — same as the numeric path)
 * - fixed: NO pose accepted (validated; throws if listed)
 *
 * For `solve` the ParamRefs are resolved at call time (snapshot
 * semantics — same role as `.boundingBox()` / `.measureArea()`).
 * `solvedModel` captures the symbolic refs so studio-driven param edits
 * re-pose the rendered scene reactively (Tasks 3-5).
 */
export type EditableScalarPose = Editable<number>;

export type EditableBallPose = [Editable<number>, Editable<number>, Editable<number>];

export type PoseValue = EditableScalarPose | EditableBallPose;

export type Poses = Record<string, PoseValue>;

/**
 * Options for the v0.6 mate-style `partRef.connector(name, opts)` chain
 * method. Distinct from `AssemblyConnectorFrame` (the legacy v0.5 kinematic
 * connector shape used by `assembly.part({ connectors })` + `opts.connect`):
 * carries a `type` tag (frame/axis/planar/ball) and a structured
 * `ConnectorOrigin` that may be either a numeric Vec3 or a topology query.
 * Resolved into the `ScenePart.connectors[]` returned by `Assembly.model()` /
 * `Assembly.solvedModel()`.
 */
export interface AssemblyConnectorOpts {
  type: ConnectorType;
  /** Origin coordinate frame. Accepts either the structured `ConnectorOrigin`
   *  union (`{ kind: 'vec3', value }` / `{ kind: 'topology', query }`) OR a
   *  `@kc[<partName>/face/<name>]` / `@kc[<partName>/edge/<name>]` /
   *  `@kc[<partName>/vertex/<name>]` topology ref string. The string is
   *  normalised to the structured form at capture time. The ref's owner
   *  segment must match the part name on which this connector is being
   *  registered. */
  origin: ConnectorOriginInput;
  axis?: Vec3;
  normal?: Vec3;
  /** Radius (mm) of the joint's pin clearance bore at this connector when it
   *  sits at a drilled knuckle (a `joint.clevis(...)` pivot supplies
   *  `pinR + holeClearance`). Lets the criterion-7 joint-mesh-gap gate accept
   *  a clearance bore — solid present around the pivot — instead of requiring
   *  the pivot POINT to be inside solid material. Omit for non-drilled
   *  connectors (the gate then uses its 1 mm point-in-solid tolerance). */
  jointClearanceRadius?: number;
}

export interface AssemblyPartRef {
  id: FeatureId;
  name: string;
  assemblyName: string;
  at: Vec3Param;
  connectors: Record<string, AssemblyConnectorFrameStored>;
  /** Mate-style connectors registered via the 2-arg `connector(name, opts)`
   *  chain (v0.6 Task 4). Mutated in place by the chain method so the array
   *  is shared with the assembly's stored record and visible to
   *  `Assembly.model()` / `Assembly.solvedModel()`. */
  mateConnectors: Connector[];
  /** P11 Slice 2 — wrap-geom cylinders registered via `wrapGeom(name, opts)`.
   *  Mutated in place by the chain method, shared by reference with the
   *  stored record so the MJCF emitter and criterion 8 see additions made
   *  after `part(...)` returns. */
  wrapGeoms: WrapGeomRecord[];
  /** Look up a v0.5 kinematic connector by name (declared via
   *  `assembly.part(..., { connectors })`) — returns an `AssemblyConnectorRef`
   *  for use in `opts.connect`. */
  connector(name: string): AssemblyConnectorRef;
  /** Register a v0.6 mate-style connector on this part and return the
   *  part-ref for chaining. Throws `assembly.connector.duplicate-name` if a
   *  connector with the same name is already registered on this part. */
  connector(name: string, opts: AssemblyConnectorOpts): AssemblyPartRef;
  /** P11 Slice 2 — declare a named collision-OFF wrap cylinder for tendon
   *  routing and return the part-ref for chaining. Throws
   *  `assembly.wrap-geom.duplicate-name` if the name is already used on
   *  this part, or `feature.invalid-args` on a bad axis / radius. */
  wrapGeom(name: string, opts: WrapGeomOptions): AssemblyPartRef;
  /** Add another part to the SAME assembly and return its ref — enables fluent
   *  chaining: `assembly.part(a, ...).part(b, ...).part(c, ...)`. Identical to
   *  calling `assembly.part(...)` again on the assembly. */
  part(name: string, shape: Shape, opts?: AssemblyPartOpts): AssemblyPartRef;
  /** Terminate the fluent chain: identical to calling `model()` on the owning
   *  assembly. Lets `assembly.part(a, ...).part(b, ...).model()` work without
   *  hoisting the assembly into a variable. */
  model(): Scene;
  /** Terminate the fluent chain with forward kinematics: identical to calling
   *  `solve(poses)` on the owning assembly. */
  solve(poses: Poses): SolvedKinematics;
  /** Terminate the fluent chain with a solved scene: identical to calling
   *  `solvedModel(...)` on the owning assembly. */
  solvedModel(...args: Parameters<Assembly['solvedModel']>): Promise<Scene>;
}

export interface AssemblyJointRef {
  id: FeatureId;
  name: string;
  kind: 'revolute' | 'prismatic' | 'fixed' | 'ball';
}

/**
 * Returned by `Assembly.subAssembly(name, other)`. Lets the caller mate
 * INTO the imported parts without manually re-spelling the namespace
 * prefix. See the JSDoc on `Assembly.subAssembly` for the full pattern.
 */
export interface SubAssemblyHandle {
  /** The `${name}_` prefix prepended to every imported part/mate name. */
  readonly prefix: string;
  /** Build a mate connector ref (`prefix_origPart.conn`) for use with
   *  `arm.mate(...)`. Throws if `origPartName` is not in the imported
   *  assembly. With no `connectorName`, returns just the namespaced part
   *  name (useful when caller assembles the ref themselves). */
  ref(origPartName: string, connectorName?: string): string;
  /** Look up the imported part's `AssemblyPartRef` by its ORIGINAL name
   *  (pre-prefix). Throws on unknown names. */
  part(origPartName: string): AssemblyPartRef;
}

/** Beam cross-section declaration consumed by the closed-form Euler-Bernoulli
 *  path in `kc.kinematic.checkLoadCapacity({ mode: 'beam' })`. Optional —
 *  parts without a declared cross-section fire `kinematic.load.beam-not-applicable`
 *  when a load is applied to them. Lengths are in millimetres (the assembly's
 *  canonical length unit). */
export type AssemblyCrossSection =
  | {
      readonly kind: 'rectangle';
      readonly widthMm: number;
      readonly heightMm: number;
      readonly lengthMm: number;
    }
  | {
      readonly kind: 'circle';
      readonly radiusMm: number;
      readonly lengthMm: number;
    }
  | {
      readonly kind: 'i-beam';
      readonly flangeWidthMm: number;
      readonly flangeThicknessMm: number;
      readonly webHeightMm: number;
      readonly webThicknessMm: number;
      readonly lengthMm: number;
    };

export type AssemblyPartRole = 'structure' | 'contact-target';

export interface AssemblyPartOpts {
  at?: EditableVec3;
  connectors?: Record<string, AssemblyConnectorFrame>;
  connect?: {
    connector: string;
    to: AssemblyConnectorRef;
    name?: string;
  };
  /** Per-part material density in `kg/m^3`. Consumed by URDF / SDF export
   *  inertial blocks. When omitted, the export defaults to 1000 (water)
   *  and emits `export.urdf.inertia-density-declared` so the agent knows
   *  the dynamics will be off for any non-water material. Typical values:
   *  steel 7850, aluminum 2700, ABS 1050, brass 8500, titanium 4500. */
  density?: number;
  /** Named engineering material. Assigning one seeds BOTH the part's density
   *  default (from the material's catalog density) AND a default surface finish
   *  on the shape (appearance) — the Fusion/Onshape model where a material name
   *  carries mass AND looks. Both are DEFAULTS: an explicit `density` here wins
   *  for mass, and an explicit `.finish()` / `.color()` / `.material()` already
   *  on the shape wins for appearance. Valid: `steel`, `aluminum` (alias
   *  `aluminium`), `pla`, `abs`, `pet`. An unknown name throws
   *  `feature.invalid-args` naming the valid materials — never a silent
   *  fallback to water density or a default finish. */
  material?: string;
  /** Beam cross-section for closed-form Euler-Bernoulli load checking via
   *  `kc.kinematic.checkLoadCapacity({ mode: 'beam' })`. Without this
   *  declaration the beam path fires K7 `kinematic.load.beam-not-applicable`
   *  on any load applied to the part. */
  crossSection?: AssemblyCrossSection;
  /** Topology role. Defaults to `structure`; `contact-target` marks external
   *  objects used for contact/load scenarios that are not structural members
   *  of the mechanism graph. */
  role?: AssemblyPartRole;
}

export interface MechanicalJointIntentOpts {
  readonly mate: string;
  readonly actuator: string;
  readonly shaft: string;
  readonly supports: readonly string[];
  readonly output: string;
  readonly requiredSupport?: MechanicalJointSupportRequirement;
}

export interface MechanicalJointIntentRecord extends MechanicalJointIntentOpts {
  readonly name: string;
}

export interface JointSupportIntentOpts {
  readonly mate: string;
  readonly shaft: string;
  readonly supports: readonly string[];
  readonly output: string;
  readonly requiredSupport?: MechanicalJointSupportRequirement;
}

export interface JointSupportIntentRecord extends JointSupportIntentOpts {
  readonly name: string;
}

export type TransmissionKind =
  | 'direct-horn'
  | 'link-rod'
  | 'four-bar'
  | 'gear-pair'
  | 'belt'
  | 'tendon';

export interface TransmissionIntentOpts {
  readonly kind: TransmissionKind;
  readonly sourceMate: string;
  readonly drivenMates: readonly string[];
  readonly actuator?: string;
  readonly input?: string;
  readonly output?: string;
  readonly path: readonly string[];
  readonly ratio?: number;
  readonly notes?: string;
}

export interface TransmissionIntentRecord extends TransmissionIntentOpts {
  readonly name: string;
}

export interface MechanicalJointSupportRequirement {
  readonly kind: 'hinge-bracket' | 'bearing' | 'bracket';
  readonly around: string;
  readonly supports?: readonly string[];
  readonly minBearingLengthMm?: number;
  readonly clearanceMm?: number;
}

/** Script-facing input: each coord may be a number or ParamRef<number>. */
export interface AssemblyConnectorFrame {
  origin: EditableVec3;
  axis?: EditableVec3;
}

/** Intent-side normalized shape after toVec3Param. */
export interface AssemblyConnectorFrameStored {
  origin: Vec3Param;
  axis?: Vec3Param;
}

export interface AssemblyConnectorRef {
  assemblyName: string;
  partId: FeatureId;
  partName: string;
  connector: string;
  origin: Vec3Param;
  worldOrigin: Vec3Param;
  axis?: Vec3Param;
}

export interface AssemblyConnectRef {
  id: FeatureId;
  name: string;
  kind: 'fixed';
}

// FixedJointOpts removed in G0 (2026-05-31): the v0.5 `arm.fixed(...)` method
// no longer exists. Use `arm.mate(name, a, b, 'fastened')` instead — pose is
// carried on the MateRecord directly. `arm.revolute(...)` was restored (see
// issue #535) so the body-tree-FK surface has a public drivable revolute again.

/** Declared actuator capacity for `kc.kinematic.checkStaticHold`. Exactly one
 *  of `torqueNm` (revolute) / `forceN` (prismatic) applies per joint kind —
 *  the joint-kind-matching field is read; the other is ignored if present. */
export interface JointActuatorOpts {
  /** N·m — revolute joints. */
  torqueNm?: number;
  /** N — prismatic joints. */
  forceN?: number;
}

export interface RevoluteJointOpts {
  axis: Vec3;
  origin: Vec3;
  limitsDeg?: [number, number];
  /** Declared actuator torque capacity (N·m). Required for
   *  `kc.kinematic.checkStaticHold` to evaluate this joint; without it the
   *  joint is skipped with `kinematic.static-hold.no-actuator-declared`. */
  actuator?: JointActuatorOpts;
}

export interface PrismaticJointOpts {
  axis: Vec3;
  origin: Vec3;
  limitsMm?: [number, number];
  /** Declared actuator force capacity (N). Required for
   *  `kc.kinematic.checkStaticHold` to evaluate this joint; without it the
   *  joint is skipped with `kinematic.static-hold.no-actuator-declared`. */
  actuator?: JointActuatorOpts;
}

export interface BallJointOpts {
  origin: Vec3;
  limitsDeg?: [[number, number], [number, number], [number, number]];
}

/**
 * Internal joint storage. Discriminated by `kind`. solve() walks these
 * by childPartId to find the parent joint of a part, and by parentPartId
 * to find children.
 */
export interface AssemblyJointStored {
  readonly id: FeatureId;
  readonly name: string;
  readonly kind: 'revolute' | 'prismatic' | 'fixed' | 'ball';
  readonly parentPartId: FeatureId;
  readonly childPartId: FeatureId;
  readonly axis?: Vec3;                             // revolute, prismatic
  readonly origin: Vec3;                            // all (default [0,0,0] for fixed)
  readonly limitsDeg?: [number, number];            // revolute
  readonly limitsMm?: [number, number];             // prismatic
  readonly ballLimitsDeg?: [[number, number], [number, number], [number, number]]; // ball
  /** Declared actuator capacity, copied from `RevoluteJointOpts.actuator` /
   *  `PrismaticJointOpts.actuator`. Read by
   *  `kc.kinematic.checkStaticHold`. */
  readonly actuator?: JointActuatorOpts;
}

/**
 * Internal part storage. Extends the public AssemblyPartRef with refs
 * solve() needs:
 * - originalShape: the Shape captured by box() etc., for solve() to
 *   transform via Shape.transform(t).
 * - connectParentId: when a part was placed via `connect: { to }`, the
 *   parent part's id. Used by solve() to walk through fixed connect
 *   chains for joint inheritance.
 *
 * `at` (zero-pose translation) already lives on AssemblyPartRef.
 */
export interface AssemblyPartStored extends AssemblyPartRef {
  readonly originalShape: Shape;
  readonly connectParentId?: FeatureId;
  readonly role?: AssemblyPartRole;
  /** Per-part material density in kg/m^3, copied from `AssemblyPartOpts.density`.
   *  Read by the URDF / SDF export inertial-block emitters. Undefined when
   *  the script did not declare a density on `arm.part(...)`. */
  readonly density?: number;
  /** Canonical name of the engineering material assigned via
   *  `arm.part(..., { material })`, when one was. The `density` above is the
   *  EFFECTIVE density (an explicit `density` opt overrides the material's);
   *  this field records which named material was assigned, for BOM / export
   *  provenance. Undefined when no material name was given. */
  readonly material?: string;
  /** Beam cross-section, copied from `AssemblyPartOpts.crossSection`. Read
   *  by `kc.kinematic.checkLoadCapacity({ mode: 'beam' })`. Undefined when
   *  the script did not declare a cross-section on `arm.part(...)`. */
  readonly crossSection?: AssemblyCrossSection;
}

/** SRDF planning group. Either chain-form (base/tip) or enumeration. */
export interface PlanningGroupRecord {
  readonly name: string;
  readonly chain?: { readonly baseLink: string; readonly tipLink: string };
  readonly joints?: readonly string[];
  readonly links?: readonly string[];
}

/** SRDF end-effector reference. */
export interface EndEffectorRecord {
  readonly name: string;
  readonly parentLink: string;
  readonly group: string;
  readonly parentGroup: string;
}

/** SRDF virtual joint (e.g. world -> base fixed). */
export interface VirtualJointRecord {
  readonly name: string;
  readonly type: 'fixed' | 'floating' | 'planar';
  readonly parentFrame: string;
  readonly childLink: string;
}

/** SRDF named group state — a pose snapshot tied to a planning group. */
export interface GroupStateRecord {
  readonly name: string;
  readonly group: string;
  readonly values: Readonly<Record<string, number>>;
}

/** SRDF allowed-collision override declared via arm.disableCollision(...). */
export interface DisabledCollisionRecord {
  readonly link1: string;
  readonly link2: string;
  readonly reason: 'Adjacent' | 'Never' | 'Default' | 'User';
}
