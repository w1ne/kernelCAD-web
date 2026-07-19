// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { lookupSourceColor } from '../../kernel/backends/occt/lookupSourceColor';
import { assertTopoRefSafeName } from '../../kernel/naming/uniquenessValidator';
import { KernelError } from '../../shared/intent/kernelError';
import { Scene, type SceneDiagnostic, type ScenePart } from '../validation/scene';
import type { EditableVec3, FeatureId, Param, Unit, Vec3, Vec3Param } from '../../shared/intent/types';
import { formatScalarForError, isValidEditableVec3, isValidVec3 } from '../../shared/intent/types';
import {
  makeConnector,
  normalizeConnectorOriginInput,
  type Connector,
  type ConnectorOriginInput,
  type ConnectorType,
} from '../mates/connector';
import type { MateCouplingRecord } from '../mates/coupledPoses';
import {
  parseConnectorRef,
  type MateCapacity,
  type MateLimitRange,
  type MateLoadLimit,
  type MatePose,
  type MateRecord,
} from '../mates/mate';
import { isCompatiblePair, type MateType } from '../mates/mateTypes';
import type { ClevisStructuralModel, StructuralMaterial } from '../joints/types';
import {
  TENDON_DEFAULT_COIL_DIAMETER_MM,
  TENDON_DEFAULT_COIL_TURNS,
  TENDON_DEFAULT_VISUAL_DIAMETER_MM,
  TENDON_DEFAULT_VISUAL_STYLE,
  type TendonOptions,
  type TendonRecord,
  type TendonWrapRef,
  type WrapGeomOptions,
  type WrapGeomRecord,
} from '../mates/tendon';
import {
  reviewPoseEnvelope,
  type PoseEnvelopeDiagnostic,
} from '../mates/poseEnvelope';
import { solveMates } from '../mates/solver';
import { validateAssemblyWithMates, type ValidatorDiagnostic } from '../mates/validator';
import {
  validateWorkspaceTargetOpts,
  type WorkspaceTargetOpts,
  type WorkspaceTargetRecord,
} from '../mates/workspaceTarget';
import {
  makePhysicalUseCaseRecord,
  type PhysicalUseCaseOptions,
  type PhysicalUseCaseRecord,
} from '../mates/physicalUseCase';
import { currentValue, toParam, toVec3Param } from '../../shared/runtime/editableHelpers';
import { isParamRef, paramExprToDebugString, type Editable, type ParamRefExpr } from '../../shared/runtime/paramRef';
import { Transform } from '../../shared/runtime/se3';
import type { PartLineage, PartLineageMap } from '../../kernel/naming/evolutionRecord';
import type { CaptureSession } from './captureSession';
import { forwardKinematics, type NumericPoses } from './forwardKinematics';
import { Shape } from './proxy';
import { resolveMaterial, type ResolvedMaterial } from '../properties/materialLibrary';

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

function validateLimitRange(
  mateName: string,
  field: 'limitsDeg' | 'limitsMm',
  range: MateLimitRange,
): void {
  const [min, max] = range;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mate.invalid-limits: mate '${mateName}' ${field} must be a finite [min, max] range with min <= max.`,
      undefined,
      `invalid-args.assembly.mate-invalid-limits — pass ${field}: [min, max] with finite numbers and min <= max.`,
    );
  }
}

const NMM_PER_NM = 1000;

function validateMateCapacityOptions(
  mateName: string,
  mateType: MateType,
  opts: { capacity?: MateCapacity; maxLoad?: MateLoadLimit } | undefined,
): void {
  const capacity: unknown = opts?.capacity;
  const maxLoad: unknown = opts?.maxLoad;
  if (capacity !== undefined && maxLoad !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mate.capacity-conflict: mate '${mateName}' cannot declare both capacity.envelope (N and Nmm) and deprecated maxLoad (N and Nm); use capacity.envelope only.`,
      undefined,
      `invalid-args.assembly.mate-capacity-conflict — replace maxLoad with capacity: { envelope: { maxResultantForceN, maxResultantMomentNmm } } using N and Nmm.`,
    );
  }

  if (capacity !== undefined) {
    if (!isMateOptionObject(capacity)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.invalid-capacity: mate '${mateName}' capacity must be an object with an optional envelope.`,
        undefined,
        `invalid-args.assembly.mate-invalid-capacity — pass capacity: {} or capacity: { envelope: { maxResultantForceN, maxResultantMomentNmm } } using N and Nmm.`,
      );
    }
    const envelope = capacity.envelope;
    if (envelope !== undefined) {
      if (!isMateOptionObject(envelope)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.invalid-capacity: mate '${mateName}' capacity.envelope must be an object containing force and moment ratings.`,
          undefined,
          `invalid-args.assembly.mate-invalid-capacity — pass capacity.envelope: { maxResultantForceN, maxResultantMomentNmm } using positive finite N and Nmm values.`,
        );
      }
      validatePositiveFiniteMateValue(
        mateName,
        'capacity.envelope.maxResultantForceN',
        envelope.maxResultantForceN,
        'N',
      );
      validatePositiveFiniteMateValue(
        mateName,
        'capacity.envelope.maxResultantMomentNmm',
        envelope.maxResultantMomentNmm,
        'Nmm',
      );
    }
    const structure = capacity.structure;
    if (structure !== undefined) {
      if (mateType !== 'revolute') {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.invalid-capacity: mate '${mateName}' capacity.structure is a clevis revolute model but mate type is '${mateType}'.`,
          undefined,
          `invalid-args.assembly.mate-invalid-capacity — attach joint.clevis(...).structural only to its revolute mate.`,
        );
      }
      validateClevisStructuralModel(mateName, structure);
    }
  }

  if (maxLoad !== undefined) {
    if (!isMateOptionObject(maxLoad)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.invalid-capacity: mate '${mateName}' maxLoad must be an object with optional force and torque ratings.`,
        undefined,
        `invalid-args.assembly.mate-invalid-capacity — pass maxLoad: {} or maxLoad: { force, torque } using positive finite N and Nm values.`,
      );
    }
    if (maxLoad.force !== undefined) {
      validatePositiveFiniteMateValue(mateName, 'maxLoad.force', maxLoad.force, 'N');
    }
    if (maxLoad.torque !== undefined) {
      const torqueNm = maxLoad.torque;
      validatePositiveFiniteMateValue(mateName, 'maxLoad.torque', torqueNm, 'Nm');
      if (typeof torqueNm === 'number' && !Number.isFinite(torqueNm * NMM_PER_NM)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.invalid-capacity: mate '${mateName}' maxLoad.torque=${torqueNm} Nm converts to Nmm as a non-finite value.`,
          undefined,
          `invalid-args.assembly.mate-invalid-capacity — reduce maxLoad.torque so its Nm-to-Nmm conversion remains finite, or use capacity.envelope.maxResultantMomentNmm directly.`,
        );
      }
    }
  }
}

function validateClevisStructuralModel(mateName: string, value: unknown): asserts value is ClevisStructuralModel {
  if (!isMateOptionObject(value)) {
    throwInvalidStructuralModel(mateName, 'capacity.structure must be an object emitted by joint.clevis().');
  }
  if (value.kind !== 'clevis-double-shear-v1' || value.source !== 'joint.clevis') {
    throwInvalidStructuralModel(mateName, "capacity.structure must have kind 'clevis-double-shear-v1' and source 'joint.clevis'.");
  }
  if (value.forkPlateCount !== 2) {
    throwInvalidStructuralModel(mateName, 'capacity.structure.forkPlateCount must equal 2.');
  }
  for (const field of [
    'pinDiameterMm',
    'boreDiameterMm',
    'forkPlateThicknessMm',
    'tongueThicknessMm',
    'forkGapMm',
    'supportSpanMm',
    'edgeDistanceMm',
  ] as const) {
    if (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || value[field] <= 0) {
      throwInvalidStructuralModel(mateName, `capacity.structure.${field} must be a positive finite mm value.`);
    }
  }
  if (value.materials !== undefined) {
    if (!isMateOptionObject(value.materials)) {
      throwInvalidStructuralModel(mateName, 'capacity.structure.materials must be an object when declared.');
    }
    for (const role of ['pin', 'fork', 'tongue'] as const) {
      validateStructuralMaterialDeclaration(mateName, role, value.materials[role]);
    }
  }
}

function validateStructuralMaterialDeclaration(
  mateName: string,
  role: 'pin' | 'fork' | 'tongue',
  value: unknown,
): asserts value is StructuralMaterial {
  if (!isMateOptionObject(value)) {
    throwInvalidStructuralModel(mateName, `capacity.structure.materials.${role} must be an object.`);
  }
  if (
    typeof value.name !== 'string' || value.name.trim() === '' ||
    value.model !== 'isotropic-ductile' ||
    typeof value.yieldStrengthMPa !== 'number' || !Number.isFinite(value.yieldStrengthMPa) || value.yieldStrengthMPa <= 0 ||
    typeof value.bearingStrengthMPa !== 'number' || !Number.isFinite(value.bearingStrengthMPa) || value.bearingStrengthMPa <= 0 ||
    (value.shearStrengthMPa !== undefined &&
      (typeof value.shearStrengthMPa !== 'number' || !Number.isFinite(value.shearStrengthMPa) || value.shearStrengthMPa <= 0))
  ) {
    throwInvalidStructuralModel(mateName, `capacity.structure.materials.${role} has invalid engineering strength evidence.`);
  }
}

function throwInvalidStructuralModel(mateName: string, detail: string): never {
  throw new KernelError(
    'feature.invalid-args',
    `assembly.mate.invalid-capacity: mate '${mateName}' ${detail}`,
    undefined,
    `invalid-args.assembly.mate-invalid-capacity — pass the structural descriptor returned by joint.clevis() without modifying its geometry or material fields.`,
  );
}

function copyStructuralMaterial(material: StructuralMaterial): StructuralMaterial {
  return {
    name: material.name,
    model: material.model,
    yieldStrengthMPa: material.yieldStrengthMPa,
    bearingStrengthMPa: material.bearingStrengthMPa,
    ...(material.shearStrengthMPa === undefined ? {} : { shearStrengthMPa: material.shearStrengthMPa }),
  };
}

function copyClevisStructuralModel(model: ClevisStructuralModel): ClevisStructuralModel {
  return {
    kind: model.kind,
    source: model.source,
    pinDiameterMm: model.pinDiameterMm,
    boreDiameterMm: model.boreDiameterMm,
    forkPlateThicknessMm: model.forkPlateThicknessMm,
    forkPlateCount: 2,
    tongueThicknessMm: model.tongueThicknessMm,
    forkGapMm: model.forkGapMm,
    supportSpanMm: model.supportSpanMm,
    edgeDistanceMm: model.edgeDistanceMm,
    ...(model.materials === undefined ? {} : {
      materials: {
        pin: copyStructuralMaterial(model.materials.pin),
        fork: copyStructuralMaterial(model.materials.fork),
        tongue: copyStructuralMaterial(model.materials.tongue),
      },
    }),
  };
}

function copyMateCapacity(capacity: MateCapacity): MateCapacity {
  return {
    ...(capacity.envelope === undefined ? {} : {
      envelope: {
        maxResultantForceN: capacity.envelope.maxResultantForceN,
        maxResultantMomentNmm: capacity.envelope.maxResultantMomentNmm,
      },
    }),
    ...(capacity.structure === undefined ? {} : {
      structure: copyClevisStructuralModel(capacity.structure),
    }),
  };
}

function isMateOptionObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePositiveFiniteMateValue(
  mateName: string,
  field: string,
  value: unknown,
  unit: 'N' | 'Nm' | 'Nmm',
): void {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return;
  throw new KernelError(
    'feature.invalid-args',
    `assembly.mate.invalid-capacity: mate '${mateName}' ${field} must be a positive finite ${unit} value.`,
    undefined,
    `invalid-args.assembly.mate-invalid-capacity — pass ${field} as a positive finite value in ${unit}.`,
  );
}

function validateMechanicalIntentName(field: string, value: string): void {
  if (typeof value === 'string' && value.trim().length > 0) return;
  throw new KernelError(
    'feature.invalid-args',
    `assembly.mechanicalJoint.invalid-ref: ${field} must be a non-empty string.`,
    undefined,
    `invalid-args.assembly.mechanical-joint-invalid-ref — pass non-empty part and mate names in mechanicalJoint(...).`,
  );
}

function isTransmissionKind(value: unknown): value is TransmissionKind {
  return (
    value === 'direct-horn' ||
    value === 'link-rod' ||
    value === 'four-bar' ||
    value === 'gear-pair' ||
    value === 'belt' ||
    value === 'tendon'
  );
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

export interface RevoluteJointOpts {
  axis: Vec3;
  origin: Vec3;
  limitsDeg?: [number, number];
}

export interface PrismaticJointOpts {
  axis: Vec3;
  origin: Vec3;
  limitsMm?: [number, number];
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
    assertTopoRefSafeName(name, 'part-name', shape.id);
    if (opts.at !== undefined && !isValidEditableVec3(opts.at)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly part placement must be a finite Vec3; got ${formatScalarForError(opts.at)}.`,
        shape.id,
        'Pass at: [x, y, z], or omit it; coords may be number or ParamRef.',
      );
    }
    if (opts.density !== undefined) {
      if (!Number.isFinite(opts.density) || opts.density <= 0) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly part '${name}': density must be a positive finite number; got ${formatScalarForError(opts.density)}.`,
          shape.id,
          'Pass density: <kg/m^3>, or omit it to use the 1000 kg/m^3 default. Typical: steel 7850, aluminum 2700, ABS 1050.',
        );
      }
    }
    // Named material: seeds a density default AND a default finish. Resolve it
    // FIRST — an unknown name throws here (naming the valid materials) before
    // any part record is minted, so a typo never silently produces a
    // water-density part with no appearance.
    let resolvedMaterial: ResolvedMaterial | undefined;
    if (opts.material !== undefined) {
      resolvedMaterial = resolveMaterial(opts.material, shape.id);
    }
    // Density precedence: an explicit `density` opt wins over the material's
    // catalog density; the material only seeds the DEFAULT.
    const effectiveDensity =
      opts.density !== undefined ? opts.density : resolvedMaterial?.density;
    // Finish precedence: apply the material's default finish ONLY when the
    // shape carries no explicit appearance yet (explicit `.finish()` /
    // `.color()` / `.material()` on the shape always wins). Go through the same
    // `shape.finish(...)` proxy the author would call — one source of truth for
    // the appearance write, its validation, and its per-face plumbing.
    if (resolvedMaterial?.finish !== undefined) {
      const record = this.session.getRecords().find((r) => r.id === shape.id);
      const md = record?.metadata;
      const hasExplicitAppearance =
        md?.material !== undefined ||
        md?.color !== undefined ||
        (md?.materialByLabel !== undefined && Object.keys(md.materialByLabel).length > 0);
      if (!hasExplicitAppearance) {
        shape.finish(resolvedMaterial.finish);
      }
    }
    if (opts.crossSection !== undefined) {
      validateCrossSection(name, shape.id, opts.crossSection);
    }
    if (opts.role !== undefined && opts.role !== 'structure' && opts.role !== 'contact-target') {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.part.invalid-role: part '${name}' role must be 'structure' or 'contact-target'; got ${formatScalarForError(opts.role)}.`,
        shape.id,
        `invalid-args.assembly.part-invalid-role — pass role: 'contact-target' only for external contact/load targets, or omit role for structural parts.`,
      );
    }
    const connectors = normalizeConnectors(name, shape.id, opts.connectors);
    const at = resolvePartPlacement(this.name, name, shape.id, opts.at, connectors, opts.connect);
    const record = this.session.assemblyPart(this.name, name, shape, { at, connectors, placedBy: opts.connect });
    // Q1.5: write the part-lineage entry now that the capture-session has
    // minted the `assemblyPart` FeatureRecord. The lineage's `featureId`
    // is the same id the FeatureRecord carries — anchors part-level Query
    // resolution (`kc.q.part(kc.q.createdBy('<featureId>'))`) to the
    // existing FeatureRecord graph rather than introducing a parallel
    // id stream.
    const lineage: PartLineage = {
      featureId: record.id,
      featureName: name,
      featureKind: 'assemblyPart',
    };
    this.partLineage.set(name, lineage);
    // Shared mutable array: the part-ref's `.connector(name, opts)` chain
    // method pushes into this array, and the `AssemblyPartStored` record
    // below references the same array via spread (arrays are by-reference),
    // so `makeScene` sees additions made after `part(...)` returns.
    const mateConnectors: Connector[] = [];
    const wrapGeoms: WrapGeomRecord[] = [];
    const part = makePartRef(
      this.name, record.id, name, at, connectors, mateConnectors, wrapGeoms,
      // Fluent chaining: `arm.part(a).part(b)` — the ref's `.part(...)` adds
      // another part to this same assembly (delegates straight to this method).
      (chainName, chainShape, chainOpts) => this.part(chainName, chainShape, chainOpts),
      this,
    );
    const stored: AssemblyPartStored = {
      ...part,
      originalShape: shape,
      ...(opts.connect !== undefined ? { connectParentId: opts.connect.to.partId } : {}),
      ...(effectiveDensity !== undefined ? { density: effectiveDensity } : {}),
      ...(resolvedMaterial !== undefined ? { material: resolvedMaterial.name } : {}),
      ...(opts.crossSection !== undefined ? { crossSection: opts.crossSection } : {}),
      ...(opts.role !== undefined ? { role: opts.role } : {}),
    };
    this.parts.push(stored);
    if (opts.connect) {
      this.session.assemblyConnect(
        this.name,
        opts.connect.name ?? `${opts.connect.to.partName}.${opts.connect.to.connector}-${name}.${opts.connect.connector}`,
        opts.connect.to,
        part.connector(opts.connect.connector),
      );
    }
    return part;
  }

  /**
   * Compose another assembly into this one as a sub-assembly (Slice 1:
   * flattening import). Surfaced by Exp-E nested-sub-assembly: every CAD
   * competitor (Fusion / Onshape / ForgeCAD) treats sub-assemblies as
   * first-class, but kernelCAD had no composition API at all — agents had
   * to flatten by hand, losing the namespace boundary.
   *
   * This Slice copies all of `other`'s parts and mates into `this`, with
   * every imported name prefixed by `${name}_`. The prefix uses underscore
   * (not dot) so connector-ref parsing still works: `'gripper_wrist.in'`
   * parses as part='gripper_wrist', connector='in' under the existing
   * single-dot split.
   *
   * Returned handle exposes `.ref(origPart, conn?)` and `.part(origPart)`
   * so the caller can mate INTO the imported parts without manually
   * spelling the prefix.
   *
   *   const gripper = kcad.assembly('gripper');
   *   gripper.part('wrist', box(10,10,10)).connector('in', {...});
   *   const robot = kcad.assembly('robot');
   *   robot.part('arm', box(80,20,20)).connector('out', {...});
   *   const sub = robot.subAssembly('grip', gripper);
   *   robot.mate('attach', 'arm.out', sub.ref('wrist', 'in'), 'fastened');
   *
   * Future slices (not in this MVP): true nested solver semantics
   * (per-sub-assembly root selection, sub-assembly instancing for N
   * identical bolts, cross-assembly mates with their own resolution).
   */
  subAssembly(name: string, other: Assembly): SubAssemblyHandle {
    if (other === this) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.subAssembly: cannot import an assembly into itself ('${this.name}').`,
        undefined,
        'Pass a DIFFERENT Assembly handle, captured via a separate kcad.assembly(otherName) call.',
      );
    }
    if (typeof name !== 'string' || name.length === 0 || name.includes('.') || name.includes('_')) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.subAssembly: name '${name}' must be a non-empty string without '.' or '_' (the underscore is reserved for the namespace separator, the dot for connector refs).`,
        undefined,
        "Use a simple identifier like 'grip' or 'leftArm'.",
      );
    }
    const prefix = `${name}_`;
    // 1. Copy parts. Use this.part(...) so the v0.5 record + connectors +
    //    placement validation all run as if the user authored each part
    //    directly — sub-assembly is observationally identical to a flat
    //    authoring (Slice 1 semantics).
    const importedByOriginalName = new Map<string, AssemblyPartRef>();
    for (const op of other.__parts()) {
      const newName = `${prefix}${op.name}`;
      const newRef = this.part(newName, op.originalShape, {
        ...(op.connectors !== undefined ? { connectors: op.connectors } : {}),
      });
      // Copy v0.6 mateConnectors (the .connector(name, opts) chain output)
      // by shallow-copying the array contents. The new part already owns an
      // empty mateConnectors array per `part()`; populate it now so post-
      // import mate authoring resolves the refs.
      for (const conn of op.mateConnectors) {
        newRef.mateConnectors.push(conn);
      }
      importedByOriginalName.set(op.name, newRef);
    }
    // 2. Copy mates. Remap the partName portion of each `a` / `b` ref by
    //    prepending the prefix, leaving the connectorName intact. Mate
    //    names are also prefixed so name-uniqueness within `this` holds.
    const remapRef = (ref: string): string => {
      const { partName, connectorName } = parseConnectorRef(ref);
      return `${prefix}${partName}.${connectorName}`;
    };
    for (const om of other.__mates()) {
      this.mates.push({
        name: `${prefix}${om.name}`,
        a: remapRef(om.a),
        b: remapRef(om.b),
        type: om.type,
        ...(om.pose !== undefined ? { pose: om.pose } : {}),
        ...(om.limitsDeg !== undefined ? { limitsDeg: om.limitsDeg } : {}),
        ...(om.limitsMm !== undefined ? { limitsMm: om.limitsMm } : {}),
        ...(om.capacity !== undefined ? { capacity: copyMateCapacity(om.capacity) } : {}),
        ...(om.maxLoad !== undefined
          ? {
              maxLoad: {
                ...(om.maxLoad.force !== undefined ? { force: om.maxLoad.force } : {}),
                ...(om.maxLoad.torque !== undefined ? { torque: om.maxLoad.torque } : {}),
              },
            }
          : {}),
      });
    }
    const requireImportedPart = (origPartName: string, method: 'ref' | 'part'): AssemblyPartRef => {
      const ref = importedByOriginalName.get(origPartName);
      if (ref) return ref;
      const known = [...importedByOriginalName.keys()].join(', ') || '(none)';
      const extraHint = method === 'ref'
        ? ' Use sub.part(name) to grab the imported AssemblyPartRef.'
        : '';
      throw new KernelError(
        'feature.invalid-args',
        `subAssembly('${name}').${method}: '${origPartName}' is not a part of the imported assembly '${other.name}'. Known parts: ${known}.`,
        undefined,
        `Pass the ORIGINAL part name (before prefixing).${extraHint}`,
      );
    };
    return {
      prefix,
      ref: (origPartName: string, connectorName?: string): string => {
        requireImportedPart(origPartName, 'ref');
        return connectorName !== undefined
          ? `${prefix}${origPartName}.${connectorName}`
          : `${prefix}${origPartName}`;
      },
      part: (origPartName: string): AssemblyPartRef => requireImportedPart(origPartName, 'part'),
    };
  }

  // arm.revolute(...) is the body-tree-FK API for a single-DOF rotational
  // joint (restored per issue #535). It declares a drivable revolute directly
  // on the joint graph that solve()/solvedModel() walk — no need to reach into
  // `session.assemblyJoint(...)` + `joints.push(...)` internals. For mate-graph
  // gated mechanisms prefer `arm.connector(...)` + `arm.mate(name, a, b,
  // 'revolute', { ... })`; both surfaces coexist.
  revolute(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: RevoluteJointOpts): AssemblyJointRef {
    if (!isValidVec3(opts.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint axis must be a finite Vec3; got ${formatScalarForError(opts.axis)}.`,
        undefined,
        'Pass axis: [x, y, z].',
      );
    }
    if (!isValidVec3(opts.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint origin must be a finite Vec3; got ${formatScalarForError(opts.origin)}.`,
        undefined,
        'Pass origin: [x, y, z] in the parent part local frame.',
      );
    }
    if (opts.limitsDeg !== undefined && !isValidJointLimits(opts.limitsDeg)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint limitsDeg must be [minDeg, maxDeg] finite numbers with min < max; got ${formatScalarForError(opts.limitsDeg)}.`,
        undefined,
        'Pass limitsDeg: [minDeg, maxDeg], or omit it.',
      );
    }
    const record = this.session.assemblyJoint(this.name, name, 'revolute', a, b, {
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
    });
    this.joints.push({
      id: record.id,
      name,
      kind: 'revolute',
      parentPartId: a.id,
      childPartId: b.id,
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
    });
    return { id: record.id, name, kind: 'revolute' };
  }

  prismatic(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: PrismaticJointOpts): AssemblyJointRef {
    if (!isValidVec3(opts.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `prismatic joint axis must be a finite Vec3; got ${formatScalarForError(opts.axis)}.`,
        undefined,
        'Pass axis: [x, y, z].',
      );
    }
    if (!isValidVec3(opts.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `prismatic joint origin must be a finite Vec3; got ${formatScalarForError(opts.origin)}.`,
        undefined,
        'Pass origin: [x, y, z] in the parent part local frame.',
      );
    }
    if (opts.limitsMm !== undefined && !isValidJointLimits(opts.limitsMm)) {
      throw new KernelError(
        'feature.invalid-args',
        `prismatic joint limitsMm must be [minMm, maxMm] finite numbers with min < max; got ${formatScalarForError(opts.limitsMm)}.`,
        undefined,
        'Pass limitsMm: [minMm, maxMm], or omit it.',
      );
    }
    const record = this.session.assemblyJoint(this.name, name, 'prismatic', a, b, {
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
    });
    this.joints.push({
      id: record.id,
      name,
      kind: 'prismatic',
      parentPartId: a.id,
      childPartId: b.id,
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
    });
    return { id: record.id, name, kind: 'prismatic' };
  }

  // arm.fixed(...) was the v0.5 body-tree-FK API for rigid (no-DOF) joints.
  // Removed in G0 (2026-05-31, mechanism-delivery workstream) for the same
  // reason as arm.revolute(...). Use `arm.connector(...)` +
  // `arm.mate(name, a, b, 'fastened')` instead. See
  // examples/robot-arm/desktop-3axis-mates.kcad.ts for the canonical pattern.

  ball(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: BallJointOpts): AssemblyJointRef {
    if (!isValidVec3(opts.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `ball joint origin must be a finite Vec3; got ${formatScalarForError(opts.origin)}.`,
        undefined,
        'Pass origin: [x, y, z] in the parent part local frame.',
      );
    }
    if (opts.limitsDeg !== undefined) {
      for (let i = 0; i < 3; i++) {
        const pair = opts.limitsDeg[i];
        if (!isValidJointLimits(pair)) {
          throw new KernelError(
            'feature.invalid-args',
            `ball joint limitsDeg[${i}] must be [minDeg, maxDeg] finite numbers with min < max; got ${formatScalarForError(pair)}.`,
            undefined,
            'Pass limitsDeg: [[xMin,xMax], [yMin,yMax], [zMin,zMax]] in XYZ Euler order, or omit it.',
          );
        }
      }
    }
    const record = this.session.assemblyJoint(this.name, name, 'ball', a, b, {
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { ballLimitsDeg: opts.limitsDeg } : {}),
    });
    this.joints.push({
      id: record.id,
      name,
      kind: 'ball',
      parentPartId: a.id,
      childPartId: b.id,
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { ballLimitsDeg: opts.limitsDeg } : {}),
    });
    return { id: record.id, name, kind: 'ball' };
  }

  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef {
    validateConnectorAssembly(this.name, a);
    validateConnectorAssembly(this.name, b);
    const record = this.session.assemblyConnect(this.name, name, a, b);
    return { id: record.id, name, kind: 'fixed' };
  }

  /**
   * Record a typed mate between two named connectors. Refs are
   * `"<partName>.<connectorName>"` strings naming v0.6 mate-style connectors
   * declared via `partRef.connector(name, opts)`. Compatibility between the
   * mate type and the two connector types is validated at capture time
   * (build123d-style early error), so authoring scripts surface bad pairs
   * immediately instead of at solve / lower time.
   *
   * Optional `opts.pose` articulates the mate's joint frame at solve time.
   * Per-type shape:
   *   - revolute / prismatic / cylindrical / pin_slot: `Editable<number>`
   *     (degrees / mm; cylindrical & pin_slot treat the scalar as rotation
   *     degrees and zero the secondary translation — v0.6 single-DOF surface).
   *   - ball: `[Editable<number>, Editable<number>, Editable<number>]` (XYZ
   *     Euler degrees, extrinsic — same shape as the v0.5 ball-joint pose).
   *   - fastened / planar: pose is rejected at capture time (zero
   *     articulation DOF on the v0.6 surface).
   *
   * Errors:
   *   - ref malformed (no dot, empty side)   → assembly.mate.connector-not-found
   *   - unknown part name                    → assembly.mate.connector-not-found
   *   - unknown connector on the part        → assembly.mate.connector-not-found
   *   - mate / connector-pair mismatch       → assembly.mate.type-mismatch
   *   - pose on fastened / planar            → assembly.mate-pose-on-zero-dof-mate
   *
   * The mate record itself is surfaced on `Scene.mates` returned by
   * `Assembly.model()` / `Assembly.solvedModel()`. Pose-driven articulation
   * is honored by the v0.6 Pattern A FK in `solveMates(arm, poses?)` and
   * piped into `Scene.parts[].worldTransform` by `Assembly.solvedModel`.
   */
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
    const a = this.resolveMateConnector(aRef);
    const b = this.resolveMateConnector(bRef);
    if (!isCompatiblePair(type, a.connector.type, b.connector.type)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.type-mismatch: mate '${name}' type '${type}' is not compatible with the connector pair (${aRef}:${a.connector.type}, ${bRef}:${b.connector.type}).`,
        undefined,
        `invalid-args.assembly.mate-type-mismatch — '${type}' mates require a specific connector-type pair; see the mate-type compatibility table in mateTypes.ts.`,
      );
    }
    if (opts?.pose !== undefined && (type === 'fastened' || type === 'planar')) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.pose-on-zero-dof-mate: mate '${name}' is type '${type}' and accepts no pose; remove opts.pose.`,
        undefined,
        `invalid-args.assembly.mate-pose-on-zero-dof-mate — '${type}' mates have no articulation DOF; drop opts.pose or change the mate type.`,
      );
    }
    this.validateMateLimits(name, type, opts);
    validateMateCapacityOptions(name, type, opts);
    this.mates.push({
      name,
      a: aRef,
      b: bRef,
      type,
      ...(opts?.pose !== undefined ? { pose: opts.pose } : {}),
      ...(opts?.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
      ...(opts?.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
      ...(opts?.exposure !== undefined ? { exposure: opts.exposure } : {}),
      ...(opts?.capacity !== undefined ? { capacity: copyMateCapacity(opts.capacity) } : {}),
      ...(opts?.maxLoad !== undefined
        ? {
            maxLoad: {
              ...(opts.maxLoad.force !== undefined ? { force: opts.maxLoad.force } : {}),
              ...(opts.maxLoad.torque !== undefined ? { torque: opts.maxLoad.torque } : {}),
            },
          }
        : {}),
    });
    return this;
  }

  coupleMates(
    driven: string,
    opts: { source: string; ratio: number; offset?: number },
  ): this {
    const source = this.mates.find((mate) => mate.name === opts.source);
    const drivenMate = this.mates.find((mate) => mate.name === driven);
    if (!source || !drivenMate) {
      const known = this.mates.map((mate) => mate.name).join(', ') || '(none)';
      throw new KernelError(
        'feature.invalid-args',
        `assembly.coupleMates: source '${opts.source}' or driven mate '${driven}' is not declared. Defined mates: ${known}.`,
        undefined,
        `invalid-args.assembly.coupled-mate-not-found — call arm.mate(...) for both source and driven mates before arm.coupleMates(...).`,
      );
    }
    if (!isScalarCouplingMate(source.type) || !isScalarCouplingMate(drivenMate.type)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.coupleMates: source '${source.name}' (${source.type}) and driven '${drivenMate.name}' (${drivenMate.type}) must both be scalar articulated mates.`,
        undefined,
        `invalid-args.assembly.coupled-mate-type — couple only revolute, prismatic, cylindrical, or pin_slot mates.`,
      );
    }
    if (!Number.isFinite(opts.ratio) || (opts.offset !== undefined && !Number.isFinite(opts.offset))) {
      throw new KernelError(
        'feature.invalid-args',
        'assembly.coupleMates: ratio and offset must be finite numbers.',
        undefined,
        `invalid-args.assembly.coupled-mate-invalid-scale — pass finite numeric ratio and offset values.`,
      );
    }
    this.mateCouplings.push({
      driven,
      source: opts.source,
      ratio: opts.ratio,
      ...(opts.offset !== undefined ? { offset: opts.offset } : {}),
    });
    return this;
  }

  /**
   * P7 — declare a passive balance spring (tendon) spanning two connectors
   * on different parts. The tendon applies a restoring force
   * `F = stiffness·(L − restLength) + damping·dL/dt` whenever the
   * endpoint-to-endpoint distance L differs from the rest length, where
   * L is recomputed each MuJoCo step from the live world positions of
   * the two referenced connectors.
   *
   * Unlike `mate(...)`, a tendon is NOT a kinematic constraint — it
   * doesn't add or remove DOFs. kernelCAD's spanning-tree FK ignores
   * tendons entirely; they only fire under `validate --include-physics`,
   * which feeds the assembly to MuJoCo via `mjcfExport`.
   *
   * Both endpoints must reference connectors already declared on parts
   * already added to this assembly. The two connectors must be on
   * DIFFERENT parts — mounting both ends to the same body produces zero
   * net moment, which is the bug pattern that motivated P7 in the first
   * place.
   *
   * Errors:
   *   - duplicate tendon name                → feature.invalid-args
   *   - malformed ref / unknown part / unknown connector
   *                                          → assembly.tendon.connector-not-found
   *   - both endpoints on same part          → assembly.tendon.same-body-endpoints
   *   - restLengthMm <= 0 or non-finite      → assembly.tendon.invalid-rest-length
   *   - stiffnessNmm <= 0 or non-finite      → assembly.tendon.invalid-stiffness
   *   - dampingNsmm < 0 or non-finite        → assembly.tendon.invalid-damping
   *   - visualDiameterMm <= 0 or non-finite  → assembly.tendon.invalid-visual-diameter
   *
   * Surfaced via `__tendons()` for the MJCF exporter and Studio renderer.
   */
  tendon(name: string, opts: TendonOptions): this {
    if (this.tendons.some((t) => t.name === name)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.duplicate-name: tendon '${name}' is already declared on assembly '${this.name}'.`,
        undefined,
        `invalid-args.assembly.tendon-duplicate-name — pick a unique tendon name, or remove the earlier arm.tendon('${name}', ...) call.`,
      );
    }
    // Resolve both endpoints. Reuse the same "<part>.<connector>" grammar
    // as mates so the agent surface is consistent.
    const fromRes = this.resolveTendonEndpoint(name, 'from', opts.from);
    const toRes = this.resolveTendonEndpoint(name, 'to', opts.to);
    if (fromRes.partName === toRes.partName) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.same-body-endpoints: tendon '${name}' has both endpoints on part '${fromRes.partName}'. A tendon must span TWO different parts to produce a restoring moment around the joint between them.`,
        undefined,
        `invalid-args.assembly.tendon-same-body-endpoints — pick connectors on DIFFERENT parts. The canonical pattern is one connector on the parent arm and one on the child arm of the joint the spring spans.`,
      );
    }
    if (!Number.isFinite(opts.restLengthMm) || opts.restLengthMm <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-rest-length: tendon '${name}' restLengthMm must be a positive finite number; got ${formatScalarForError(opts.restLengthMm)}.`,
        undefined,
        `invalid-args.assembly.tendon-invalid-rest-length — pass restLengthMm: <positive mm>. Typical Anglepoise rest length is 25-50 mm depending on the joint.`,
      );
    }
    if (!Number.isFinite(opts.stiffnessNmm) || opts.stiffnessNmm <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-stiffness: tendon '${name}' stiffnessNmm must be a positive finite number; got ${formatScalarForError(opts.stiffnessNmm)}.`,
        undefined,
        `invalid-args.assembly.tendon-invalid-stiffness — pass stiffnessNmm: <positive N/mm>. Typical Anglepoise spring stiffness is 0.3-1.0 N/mm.`,
      );
    }
    const damping = opts.dampingNsmm ?? 0;
    if (!Number.isFinite(damping) || damping < 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-damping: tendon '${name}' dampingNsmm must be a non-negative finite number; got ${formatScalarForError(damping)}.`,
        undefined,
        `invalid-args.assembly.tendon-invalid-damping — pass dampingNsmm: <non-negative N·s/mm>, or omit it to default to 0.`,
      );
    }
    const visualDiameter = opts.visualDiameterMm ?? TENDON_DEFAULT_VISUAL_DIAMETER_MM;
    if (!Number.isFinite(visualDiameter) || visualDiameter <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-visual-diameter: tendon '${name}' visualDiameterMm must be a positive finite number; got ${formatScalarForError(visualDiameter)}.`,
        undefined,
        `invalid-args.assembly.tendon-invalid-visual-diameter — pass visualDiameterMm: <positive mm>, or omit it to default to ${TENDON_DEFAULT_VISUAL_DIAMETER_MM} mm.`,
      );
    }
    // P10: coil-visual-style fields. `visualStyle: 'line'` (default)
    // ignores `coilTurns` / `coilDiameterMm`; `'coil'` validates both.
    const visualStyle = opts.visualStyle ?? TENDON_DEFAULT_VISUAL_STYLE;
    if (visualStyle !== 'line' && visualStyle !== 'coil') {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-visual-style: tendon '${name}' visualStyle must be 'line' or 'coil'; got ${formatScalarForError(visualStyle as unknown as number)}.`,
        undefined,
        `invalid-args.assembly.tendon-invalid-visual-style — pass visualStyle: 'line' for a straight cylinder (default) or 'coil' for an Anglepoise-style helical spring.`,
      );
    }
    const coilTurns = opts.coilTurns ?? TENDON_DEFAULT_COIL_TURNS;
    if (!Number.isFinite(coilTurns) || coilTurns < 1) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-coil-turns: tendon '${name}' coilTurns must be a finite number >= 1; got ${formatScalarForError(coilTurns)}.`,
        undefined,
        `invalid-args.assembly.tendon-invalid-coil-turns — pass coilTurns: <integer >= 1>, or omit it to default to ${TENDON_DEFAULT_COIL_TURNS}. Typical Anglepoise coil is 8-14 turns.`,
      );
    }
    const coilDiameter = opts.coilDiameterMm ?? TENDON_DEFAULT_COIL_DIAMETER_MM;
    if (!Number.isFinite(coilDiameter) || coilDiameter <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-coil-diameter: tendon '${name}' coilDiameterMm must be a positive finite number; got ${formatScalarForError(coilDiameter)}.`,
        undefined,
        `invalid-args.assembly.tendon-invalid-coil-diameter — pass coilDiameterMm: <positive mm>, or omit it to default to ${TENDON_DEFAULT_COIL_DIAMETER_MM} mm.`,
      );
    }
    if (visualStyle === 'coil' && coilDiameter <= 2 * visualDiameter) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.invalid-coil-diameter: tendon '${name}' coilDiameterMm (${formatScalarForError(coilDiameter)}) must be > 2 * visualDiameterMm (${formatScalarForError(2 * visualDiameter)}) so the helix WIRE (radius visualDiameterMm/2) fits inside the COIL (radius coilDiameterMm/2).`,
        undefined,
        `invalid-args.assembly.tendon-invalid-coil-diameter — either increase coilDiameterMm (typical Anglepoise: 5-10 mm) or decrease visualDiameterMm (typical wire: 1.0-1.4 mm).`,
      );
    }
    // P11 Slice 2 — resolve + validate wrap-geom routing rails. Each entry
    // must name a part that exists and a `WrapGeomRecord` already declared
    // on that part via `part.wrapGeom(...)` (declare wrap geoms BEFORE the
    // tendon, same ordering rule as connectors before mates).
    const wrapGeoms: TendonWrapRef[] = [];
    if (opts.wrapGeoms !== undefined) {
      for (const w of opts.wrapGeoms) {
        const part = this.parts.find((p) => p.name === w.partName);
        if (part === undefined) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.tendon.unknown-wrap-part: tendon '${name}' references wrap geom on part '${w.partName}', which is not declared on assembly '${this.name}'.`,
            undefined,
            `invalid-args.assembly.tendon-unknown-wrap-part — the wrap geom's partName must be a part added via arm.part(...). Check for a typo against the declared part names.`,
          );
        }
        const wg = part.wrapGeoms.find((g) => g.name === w.wrapName);
        if (wg === undefined) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.tendon.unknown-wrap-geom: tendon '${name}' references wrap geom '${w.wrapName}' on part '${w.partName}', but that part has no such wrap geom. Declared: [${part.wrapGeoms.map((g) => g.name).join(', ') || '(none)'}].`,
            undefined,
            `invalid-args.assembly.tendon-unknown-wrap-geom — declare it first with arm.part('${w.partName}', ...).wrapGeom('${w.wrapName}', { axis, radius }), then reference it here.`,
          );
        }
        wrapGeoms.push({
          partName: w.partName,
          wrapName: w.wrapName,
          ...(w.sidesite !== undefined
            ? { sidesite: [w.sidesite[0], w.sidesite[1], w.sidesite[2]] as const }
            : {}),
        });
      }
    }
    this.tendons.push({
      name,
      from: opts.from,
      to: opts.to,
      restLengthMm: opts.restLengthMm,
      stiffnessNmm: opts.stiffnessNmm,
      dampingNsmm: damping,
      visualDiameterMm: visualDiameter,
      visualStyle,
      coilTurns,
      coilDiameterMm: coilDiameter,
      wrapGeoms,
    });
    return this;
  }

  /**
   * v0.7 Slice 1 — declarative workspace-reachability targets.
   *
   * Persists "this connector MUST be able to reach these world-frame points
   * across the mechanism's declared mate-limit range". The check itself runs
   * at validate-time when `solvedModel({}, { validate: 'error', posesGate:
   * 'envelope' })` produces a sampled `ConnectorWorkspace`; if a declared
   * target falls outside the sampled AABB (minus `toleranceMm`), the
   * validator emits a single `assembly.workspace.unreachable` diagnostic.
   *
   * No kernel call at capture time — `arm.workspace(...)` only records the
   * intent. The connector ref's existence is verified by the validator pass
   * (lets sub-assembly imports defer connector materialisation past the
   * workspace declaration).
   *
   *   arm.workspace('elbow_tip', {
   *     reachable: [[200, 0, 100], [0, 200, 100], [-200, 0, 100]],
   *     toleranceMm: 5,   // optional, default 5
   *   });
   *
   * AABB-only containment (no convex-hull) in v0.7 Slice 1; the precision
   * floor is documented in the emitted diagnostic. Slice 2 will switch to a
   * convex-hull check.
   */
  workspace(connectorRef: string, opts: WorkspaceTargetOpts): this {
    this.workspaceTargets.push(validateWorkspaceTargetOpts(connectorRef, opts));
    return this;
  }

  /**
   * Declare the physical task this assembly must be able to survive or perform.
   * This is intentionally generic: loads, contacts, stable parts, and actuator
   * limits are evidence consumed by review gates before task-specific statics
   * or MuJoCo simulations are added.
   */
  physicalUseCase(name: string, opts: PhysicalUseCaseOptions): this {
    if (this.physicalUseCases.some((useCase) => useCase.name === name)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.physicalUseCase.duplicate-name: physical use case '${name}' is already declared.`,
        undefined,
        `invalid-args.assembly.physical-use-case-duplicate-name — use a unique physicalUseCase name.`,
      );
    }
    this.physicalUseCases.push(makePhysicalUseCaseRecord(name, opts));
    return this;
  }

  /**
   * Declare an SRDF planning group. Either a chain form (base->tip) or an
   * enumeration of joint / link names. Consumed by `export_model({
   * format: 'srdf' })`.
   */
  planningGroup(
    name: string,
    opts: { chain?: { baseLink: string; tipLink: string }; joints?: string[]; links?: string[] },
  ): this {
    if (this.planningGroups.some(g => g.name === name)) {
      throw new KernelError(
        'feature.invalid-args',
        `arm.planningGroup: duplicate group name '${name}'.`,
        undefined,
        'Each planning group must have a unique name. Pick a different name or remove the earlier declaration.',
      );
    }
    if (!opts.chain
      && (!opts.joints || opts.joints.length === 0)
      && (!opts.links || opts.links.length === 0)) {
      throw new KernelError(
        'feature.invalid-args',
        `arm.planningGroup '${name}' must declare chain, joints, or links.`,
        undefined,
        'Pass { chain: { baseLink, tipLink } } for a serial chain, or { joints: [...] } / { links: [...] } for an enumeration.',
      );
    }
    this.planningGroups.push({
      name,
      ...(opts.chain !== undefined
        ? { chain: { baseLink: opts.chain.baseLink, tipLink: opts.chain.tipLink } }
        : {}),
      ...(opts.joints !== undefined ? { joints: [...opts.joints] } : {}),
      ...(opts.links !== undefined ? { links: [...opts.links] } : {}),
    });
    return this;
  }

  /** Declare an SRDF end-effector. */
  endEffector(
    name: string,
    opts: { parentLink: string; group: string; parentGroup: string },
  ): this {
    if (!this.parts.some(p => p.name === opts.parentLink)) {
      throw new KernelError(
        'feature.invalid-args',
        `arm.endEffector '${name}': parentLink '${opts.parentLink}' is not a known part.`,
        undefined,
        `Declare the parent link via arm.part('${opts.parentLink}', ...) before calling arm.endEffector(...).`,
      );
    }
    this.endEffectors.push({
      name,
      parentLink: opts.parentLink,
      group: opts.group,
      parentGroup: opts.parentGroup,
    });
    return this;
  }

  /** Declare an SRDF virtual joint (world -> base linkage). */
  virtualJoint(
    name: string,
    opts: { type: 'fixed' | 'floating' | 'planar'; parentFrame: string; childLink: string },
  ): this {
    this.virtualJoints.push({
      name,
      type: opts.type,
      parentFrame: opts.parentFrame,
      childLink: opts.childLink,
    });
    return this;
  }

  /** Declare an SRDF named group state (a pose snapshot keyed by joint name). */
  groupState(name: string, group: string, values: Record<string, number>): this {
    if (!this.planningGroups.some(g => g.name === group)) {
      throw new KernelError(
        'feature.invalid-args',
        `arm.groupState '${name}' references unknown group '${group}'.`,
        undefined,
        `Declare arm.planningGroup('${group}', ...) before referencing it in arm.groupState(...).`,
      );
    }
    this.groupStates.push({ name, group, values: { ...values } });
    return this;
  }

  /** Declare an SRDF allowed-collision override. */
  disableCollision(
    link1: string,
    link2: string,
    opts: { reason: 'Adjacent' | 'Never' | 'Default' | 'User' },
  ): this {
    this.disabledCollisions.push({ link1, link2, reason: opts.reason });
    return this;
  }

  mechanicalJoint(name: string, opts: MechanicalJointIntentOpts): this {
    validateMechanicalIntentName('name', name);
    if (this.mechanicalJointIntents.some((intent) => intent.name === name)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mechanicalJoint.duplicate-name: mechanical joint intent '${name}' is already declared.`,
        undefined,
        `invalid-args.assembly.mechanical-joint-duplicate-name — use a unique mechanicalJoint name.`,
      );
    }
    validateMechanicalIntentName('mate', opts.mate);
    validateMechanicalIntentName('actuator', opts.actuator);
    validateMechanicalIntentName('shaft', opts.shaft);
    validateMechanicalIntentName('output', opts.output);
    if (!Array.isArray(opts.supports) || opts.supports.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mechanicalJoint.invalid-ref: mechanical joint intent '${name}' requires at least one support part.`,
        undefined,
        `invalid-args.assembly.mechanical-joint-invalid-ref — pass supports: ['support-part-name', ...].`,
      );
    }
    for (const support of opts.supports) {
      validateMechanicalIntentName('supports[]', support);
    }
    if (opts.requiredSupport !== undefined) {
      validateMechanicalIntentName('requiredSupport.kind', opts.requiredSupport.kind);
      validateMechanicalIntentName('requiredSupport.around', opts.requiredSupport.around);
      for (const support of opts.requiredSupport.supports ?? []) {
        validateMechanicalIntentName('requiredSupport.supports[]', support);
      }
      if (
        opts.requiredSupport.minBearingLengthMm !== undefined &&
        (!Number.isFinite(opts.requiredSupport.minBearingLengthMm) || opts.requiredSupport.minBearingLengthMm <= 0)
      ) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mechanicalJoint.invalid-required-support: minBearingLengthMm must be a positive finite number.`,
          undefined,
          `invalid-args.assembly.mechanical-joint-invalid-required-support — pass minBearingLengthMm > 0, or omit it.`,
        );
      }
      if (
        opts.requiredSupport.clearanceMm !== undefined &&
        (!Number.isFinite(opts.requiredSupport.clearanceMm) || opts.requiredSupport.clearanceMm < 0)
      ) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mechanicalJoint.invalid-required-support: clearanceMm must be a non-negative finite number.`,
          undefined,
          `invalid-args.assembly.mechanical-joint-invalid-required-support — pass clearanceMm >= 0, or omit it.`,
        );
      }
    }

    this.mechanicalJointIntents.push({
      name,
      mate: opts.mate,
      actuator: opts.actuator,
      shaft: opts.shaft,
      supports: [...opts.supports],
      output: opts.output,
      ...(opts.requiredSupport !== undefined ? {
        requiredSupport: {
          ...opts.requiredSupport,
          ...(opts.requiredSupport.supports !== undefined ? { supports: [...opts.requiredSupport.supports] } : {}),
        },
      } : {}),
    });
    return this;
  }

  jointSupport(name: string, opts: JointSupportIntentOpts): this {
    validateMechanicalIntentName('name', name);
    if (this.jointSupportIntents.some((intent) => intent.name === name)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.jointSupport.duplicate-name: joint support intent '${name}' is already declared.`,
        undefined,
        `invalid-args.assembly.joint-support-duplicate-name — use a unique jointSupport name.`,
      );
    }
    validateMechanicalIntentName('mate', opts.mate);
    validateMechanicalIntentName('shaft', opts.shaft);
    validateMechanicalIntentName('output', opts.output);
    if (!Array.isArray(opts.supports) || opts.supports.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.jointSupport.invalid-ref: joint support intent '${name}' requires at least one support part.`,
        undefined,
        `invalid-args.assembly.joint-support-invalid-ref — pass supports: ['support-part-name', ...].`,
      );
    }
    for (const support of opts.supports) {
      validateMechanicalIntentName('supports[]', support);
    }
    if (opts.requiredSupport !== undefined) {
      validateMechanicalIntentName('requiredSupport.kind', opts.requiredSupport.kind);
      validateMechanicalIntentName('requiredSupport.around', opts.requiredSupport.around);
      for (const support of opts.requiredSupport.supports ?? []) {
        validateMechanicalIntentName('requiredSupport.supports[]', support);
      }
      if (
        opts.requiredSupport.minBearingLengthMm !== undefined &&
        (!Number.isFinite(opts.requiredSupport.minBearingLengthMm) || opts.requiredSupport.minBearingLengthMm <= 0)
      ) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.jointSupport.invalid-required-support: minBearingLengthMm must be a positive finite number.`,
          undefined,
          `invalid-args.assembly.joint-support-invalid-required-support — pass minBearingLengthMm > 0, or omit it.`,
        );
      }
      if (
        opts.requiredSupport.clearanceMm !== undefined &&
        (!Number.isFinite(opts.requiredSupport.clearanceMm) || opts.requiredSupport.clearanceMm < 0)
      ) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.jointSupport.invalid-required-support: clearanceMm must be a non-negative finite number.`,
          undefined,
          `invalid-args.assembly.joint-support-invalid-required-support — pass clearanceMm >= 0, or omit it.`,
        );
      }
    }

    this.jointSupportIntents.push({
      name,
      mate: opts.mate,
      shaft: opts.shaft,
      supports: [...opts.supports],
      output: opts.output,
      ...(opts.requiredSupport !== undefined ? {
        requiredSupport: {
          ...opts.requiredSupport,
          ...(opts.requiredSupport.supports !== undefined ? { supports: [...opts.requiredSupport.supports] } : {}),
        },
      } : {}),
    });
    return this;
  }

  transmission(name: string, opts: TransmissionIntentOpts): this {
    validateMechanicalIntentName('name', name);
    if (this.transmissionIntents.some((intent) => intent.name === name)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.transmission.duplicate-name: transmission intent '${name}' is already declared.`,
        undefined,
        `invalid-args.assembly.transmission-duplicate-name — use a unique arm.transmission(...) name.`,
      );
    }
    if (!isTransmissionKind(opts.kind)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.transmission.invalid-kind: '${String(opts.kind)}' is not a supported transmission kind.`,
        undefined,
        `invalid-args.assembly.transmission-invalid-kind — use direct-horn, link-rod, four-bar, gear-pair, belt, or tendon.`,
      );
    }
    validateMechanicalIntentName('sourceMate', opts.sourceMate);
    if (!Array.isArray(opts.drivenMates) || opts.drivenMates.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.transmission.invalid-driven-mates: transmission '${name}' requires at least one driven mate.`,
        undefined,
        `invalid-args.assembly.transmission-invalid-driven-mates — pass drivenMates: ['mate-name', ...].`,
      );
    }
    for (const driven of opts.drivenMates) {
      validateMechanicalIntentName('drivenMates[]', driven);
    }
    if (!Array.isArray(opts.path) || opts.path.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.transmission.invalid-path: transmission '${name}' requires at least one physical path part.`,
        undefined,
        `invalid-args.assembly.transmission-invalid-path — pass path: ['input-part', 'linkage-part', 'output-part'].`,
      );
    }
    for (const partName of opts.path) {
      validateMechanicalIntentName('path[]', partName);
    }
    for (const optional of [opts.actuator, opts.input, opts.output]) {
      if (optional !== undefined) validateMechanicalIntentName('part ref', optional);
    }
    if (opts.ratio !== undefined && !Number.isFinite(opts.ratio)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.transmission.invalid-ratio: transmission '${name}' ratio must be finite.`,
        undefined,
        `invalid-args.assembly.transmission-invalid-ratio — pass a finite ratio or omit it.`,
      );
    }

    this.transmissionIntents.push({
      name,
      kind: opts.kind,
      sourceMate: opts.sourceMate,
      drivenMates: [...opts.drivenMates],
      ...(opts.actuator !== undefined ? { actuator: opts.actuator } : {}),
      ...(opts.input !== undefined ? { input: opts.input } : {}),
      ...(opts.output !== undefined ? { output: opts.output } : {}),
      path: [...opts.path],
      ...(opts.ratio !== undefined ? { ratio: opts.ratio } : {}),
      ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
    });
    return this;
  }

  private validateMateLimits(
    name: string,
    type: MateType,
    opts?: { limitsDeg?: MateLimitRange; limitsMm?: MateLimitRange },
  ): void {
    if (opts?.limitsDeg !== undefined) {
      validateLimitRange(name, 'limitsDeg', opts.limitsDeg);
      if (type !== 'revolute' && type !== 'cylindrical' && type !== 'pin_slot') {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.limit-type-mismatch: mate '${name}' type '${type}' does not accept limitsDeg.`,
          undefined,
          `invalid-args.assembly.mate-limit-type-mismatch — limitsDeg applies to revolute, cylindrical, and pin_slot mates.`,
        );
      }
    }
    if (opts?.limitsMm !== undefined) {
      validateLimitRange(name, 'limitsMm', opts.limitsMm);
      if (type !== 'prismatic') {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.limit-type-mismatch: mate '${name}' type '${type}' does not accept limitsMm.`,
          undefined,
          `invalid-args.assembly.mate-limit-type-mismatch — limitsMm applies to prismatic mates.`,
        );
      }
    }
  }

  /** Resolve `"<partName>.<connectorName>"` to its part + connector. Throws
   *  `assembly.mate.connector-not-found` on malformed ref, unknown part, or
   *  unknown connector. Internal — keeps the diagnostic hint colocated with
   *  `mate()` so callers don't need to interpret the `parseConnectorRef`
   *  Error subclass. */
  private resolveMateConnector(ref: string): { part: AssemblyPartStored; connector: Connector } {
    let parsed: { partName: string; connectorName: string };
    try {
      parsed = parseConnectorRef(ref);
    } catch {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.connector-not-found: '${ref}' is not a 'partName.connectorName' reference.`,
        undefined,
        `invalid-args.assembly.mate-connector-not-found — pass refs of the form '<partName>.<connectorName>' where both names are declared on this assembly.`,
      );
    }
    const part = this.parts.find((p) => p.name === parsed.partName);
    if (!part) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.connector-not-found: part '${parsed.partName}' (from ref '${ref}') is not declared on assembly '${this.name}'.`,
        undefined,
        `invalid-args.assembly.mate-connector-not-found — declare the part via arm.part('${parsed.partName}', ...) before referencing it in a mate.`,
      );
    }
    const connector = part.mateConnectors.find((c) => c.name === parsed.connectorName);
    if (!connector) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.connector-not-found: connector '${parsed.connectorName}' is not declared on part '${parsed.partName}' (ref '${ref}').`,
        part.id,
        `invalid-args.assembly.mate-connector-not-found — register the connector via partRef.connector('${parsed.connectorName}', { type, origin, ... }) before referencing it in a mate.`,
      );
    }
    return { part, connector };
  }

  /**
   * Resolve a tendon endpoint ref. Mirrors `resolveMateConnector` but
   * emits tendon-flavored diagnostics so authoring scripts get advice
   * about `arm.tendon(...)` specifically rather than mate connectors.
   * The connector type is intentionally NOT constrained — any connector
   * (frame/axis/planar/ball) is a valid tendon anchor.
   */
  private resolveTendonEndpoint(
    tendonName: string,
    side: 'from' | 'to',
    ref: string,
  ): { partName: string; connectorName: string } {
    let parsed: { partName: string; connectorName: string };
    try {
      parsed = parseConnectorRef(ref);
    } catch {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.connector-not-found: tendon '${tendonName}' ${side}: '${ref}' is not a 'partName.connectorName' reference.`,
        undefined,
        `invalid-args.assembly.tendon-connector-not-found — pass ${side}: '<partName>.<connectorName>' where both names are declared on this assembly.`,
      );
    }
    const part = this.parts.find((p) => p.name === parsed.partName);
    if (!part) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.connector-not-found: tendon '${tendonName}' ${side}: part '${parsed.partName}' is not declared on assembly '${this.name}'.`,
        undefined,
        `invalid-args.assembly.tendon-connector-not-found — declare the part via arm.part('${parsed.partName}', ...) before referencing it in a tendon.`,
      );
    }
    const connector = part.mateConnectors.find((c) => c.name === parsed.connectorName);
    if (!connector) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.tendon.connector-not-found: tendon '${tendonName}' ${side}: connector '${parsed.connectorName}' is not declared on part '${parsed.partName}'.`,
        part.id,
        `invalid-args.assembly.tendon-connector-not-found — register the connector via partRef.connector('${parsed.connectorName}', { type, origin, ... }) before referencing it in a tendon.`,
      );
    }
    return parsed;
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

  /**
   * Internal accessor — exposes `buildMateMetadata` to validator gates that
   * need to register a `solvedAssembly` FeatureRecord directly (skipping the
   * `solvedModel(...)` round-trip + its capture-time `solveMates` pass).
   * Mirrors the `__parts()` / `__mates()` underscore convention; not public.
   * Used by `validateJointAxisBinding` (and any future gate that lowers the
   * assembly itself) to avoid duplicating the ~85-line metadata builder.
   */
  __buildMateMetadata(): import('./captureSession').SolvedAssemblyMateMetadata | undefined {
    if (this.mates.length === 0) return undefined;
    return this.buildMateMetadata();
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
  solve(poses: Poses): SolvedKinematics {
    // 1. Validate joint names supplied in poses. A pose key must resolve to a
    //    drivable joint declared via assembly.revolute/prismatic/fixed/ball
    //    (i.e. present in `this.joints` / `arm.__joints()`). Reject anything
    //    else BEFORE forwardKinematics reads `.kind` off the (undefined)
    //    lookup — that raw `TypeError: Cannot read properties of undefined
    //    (reading 'kind')` was issue #536. A *mate* (a constraint, not a
    //    posable DOF) gets a tailored hint pointing at the joint API.
    for (const name of Object.keys(poses)) {
      if (this.joints.find(j => j.name === name)) continue;
      const mate = this.mates.find(m => m.name === name);
      if (mate) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve: '${name}' is not a drivable joint. A ${mate.type} *mate* is a constraint, not a posable DOF — declare the joint with assembly.revolute(name, parent, child, { axis, origin }) (or .prismatic/.ball) to pose it.`,
          undefined,
          'invalid-args.solve.mate-not-joint — mates constrain DOFs; only joints declared via assembly.revolute/prismatic/fixed/ball are posable by solve(). To articulate the existing mate graph instead, call assembly.solvedModel(poses).',
        );
      }
      const known = this.joints.map(j => j.name);
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
    for (const j of this.joints) {
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
          resolveScalarPose(v[0], j.name, j.kind, this.session),
          resolveScalarPose(v[1], j.name, j.kind, this.session),
          resolveScalarPose(v[2], j.name, j.kind, this.session),
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
        numericPoses[j.name] = resolveScalarPose(v, j.name, j.kind, this.session);
      }
    }

    // 3. Empty assembly is an authoring error.
    if (this.parts.length === 0) {
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
    const worldT = forwardKinematics(this.parts, this.joints, numericPoses);

    // 5. Apply per-part transform to the original shape (mutates the Shape's
    //    transform stack via existing translate + rotate ShapeTransform pipes).
    for (const part of this.parts) {
      const T = worldT.get(part.id)!;
      part.originalShape.transform(T);
    }

    // 6. Issue #537 — advisory out-of-limits warnings for poses beyond a
    //    joint's declared limitsDeg/limitsMm. Computed (not thrown) so solve()
    //    still applies the pose; surfaced on the SolvedKinematics handle and
    //    its toScene() Scene.warnings.
    const limitWarnings = checkPoseLimits(this.joints, poses, this.session);

    // 7. Build SolvedKinematics handle. Hand it the already-resolved numeric
    //    pose record so the snapshot can never accidentally re-resolve.
    return new SolvedKinematics(
      this.name, this.parts, this.joints, worldT, numericPoses, this.session, limitWarnings,
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
  private buildMateMetadata(): import('./captureSession').SolvedAssemblyMateMetadata {
    // 1. Collect (partName, connectorName) pairs referenced by any mate.
    const refsByPartName = new Map<string, Set<string>>();
    for (const m of this.mates) {
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
    for (const part of this.parts) {
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
    const encodedMates: import('./captureSession').EncodedMateRecord[] = this.mates.map((m) => {
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
      couplings: [...this.mateCouplings],
    };
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
   */
  solvedModel(
    poses: Poses,
    opts?: {
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
    },
  ): Promise<Scene> {
    if (this.parts.length === 0) {
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
      this.ignoreInterferenceList = opts.ignore;
    }
    // v0.7.4 — validate externalLoads keys at capture entry so agent typos
    // surface immediately, not silently. Per spec open-question 5 resolution
    // (error on typo, not silent ignore).
    if (opts?.externalLoads !== undefined) {
      const knownParts = this.parts.map((p) => p.name);
      const knownSet = new Set(knownParts);
      for (const key of Object.keys(opts.externalLoads)) {
        if (!knownSet.has(key)) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solvedModel: externalLoads['${key}'] does not match any part on assembly '${this.name}'.`,
            undefined,
            `invalid-args.assembly.external-load-unknown-part — externalLoads['${key}'] does not match any part; known parts: ${knownParts.join(', ')}.`,
          );
        }
      }
    }
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
    const mateMetadata = this.mates.length > 0 ? this.buildMateMetadata() : undefined;
    const sceneShape = this.session.solvedAssembly(
      this.name,
      this.parts,
      this.joints,
      poses,
      mateMetadata,
    );

    // Issue #537 — advisory out-of-limits warnings for body-tree joint poses
    // beyond their declared limitsDeg/limitsMm. Computed here (after the
    // capture-time pose-shape validation in `solvedAssembly` has run) and
    // folded into the warn-mode `scene.warnings` aggregate below. The pose is
    // still applied; these never throw (they stay severity 'warning', so the
    // 'error'-mode error-find skips them and the 'off' branch drops them).
    const limitWarnings = checkPoseLimits(this.joints, poses, this.session);

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
      this.mates.length > 0
        ? solveMates(this, poses as NumericPoses).then((r) => r.poses)
        : Promise.resolve(undefined);

    if (mode === 'off') {
      // No validation, empty warnings — Scene still gets mate-driven
      // worldTransforms so the user-visible placement matches the mate
      // graph even with validation disabled.
      return mateTransformsPromise.then((mateT) =>
        this.makeScene(sceneShape, [], mateT),
      );
    }

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
        ? this.computeInterferencesForGate(sceneShape)
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
        ? reviewPoseEnvelope(this, {
            ...(opts?.samplesPerMate !== undefined ? { samplesPerMate: opts.samplesPerMate } : {}),
            ...(opts?.combinatorial !== undefined ? { combinatorial: opts.combinatorial } : {}),
            includeInterference: true,
          })
        : Promise.resolve(undefined);

    return Promise.all([
      interferencePromise,
      mateTransformsPromise,
      envelopeResultPromise,
    ]).then(async ([interferencePairs, mateT, envelopeResult]) => {
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
        this,
        interferencePairs,
        undefined,
        opts?.externalLoads,
        envelopeResult?.connectorWorkspace,
        opts?.ignore,
      );
      const envelopeDiagnostics: readonly PoseEnvelopeDiagnostic[] =
        envelopeResult ? envelopeResult.diagnostics : [];
      return { result, mateT, envelopeDiagnostics };
    }).then(
      ({ result, mateT, envelopeDiagnostics }) => {
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
              `assembly.solvedModel: validator reported status '${result.status}' for assembly '${this.name}'.`,
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
          return this.makeScene(sceneShape, [], mateT);
        }
        // warn mode: attach all diagnostics (error/warning/info) to
        // scene.warnings. When posesGate === 'envelope', the envelope review
        // diagnostics are appended after the default-pose validator's.
        const aggregated: readonly SceneDiagnostic[] = [
          ...result.diagnostics,
          ...envelopeDiagnostics,
          ...limitWarnings,
        ];
        return this.makeScene(sceneShape, aggregated, mateT);
      },
    );
  }

  /**
   * Records an `assemblyModel` FeatureRecord and returns a `Scene`. Mate-free
   * assemblies lower with identity per-part transforms; mate-bearing
   * assemblies capture mate metadata so Studio can expose controls and the
   * lowerer can apply default mate FK.
   */
  model(): Scene {
    if (this.parts.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'assembly.model requires at least one part.',
        undefined,
        'Call assembly.part(name, shape, opts?) before assembly.model().',
      );
    }
    const mateMetadata = this.mates.length > 0 ? this.buildMateMetadata() : undefined;
    const sceneShape = this.session.assemblyModel(this.name, this.parts, mateMetadata);
    return this.makeScene(sceneShape);
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
  private async computeInterferencesForGate(
    sceneShape: Shape,
  ): Promise<readonly import('../runtime/detectInterferences').InterferencePair[]> {
    const { RecomputeEngine } = await import('../compute/recomputeEngine');
    const { createOcctLowerer } = await import('../backends/occt/occtLowerer');
    const { initOcct } = await import('../../kernel/backends/occt/occtBackend');
    const { isSceneBackend } = await import('../../kernel/backends/sceneBackend');
    const { detectInterferences } = await import('../runtime/detectInterferences');

    await initOcct();
    const engine = new RecomputeEngine(createOcctLowerer(this.session));
    const records = this.session.getRecords();
    const r = await engine.run(records, {
      paramTable: this.session.paramTable,
      gatedFeatureNames: this.session.gatedFeatureNames,
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
  private makeScene(
    sceneShape: Shape,
    warnings: readonly SceneDiagnostic[] = [],
    matePartTransforms?: ReadonlyMap<string, Transform>,
  ): Scene {
    const sceneFeatureId = sceneShape.id;
    const session = this.session;
    const sceneParts: ScenePart[] = this.parts.map((p) => ({
      name: p.name,
      shape: p.originalShape,
      worldTransform: matePartTransforms?.get(p.name) ?? Transform.identity(),
      ...(p.mateConnectors.length > 0 ? { connectors: [...p.mateConnectors] } : {}),
    }));
    return new Scene(
      this.name,
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
      this.mates.length > 0 ? [...this.mates] : undefined,
      warnings,
      this.tendons.length > 0 ? [...this.tendons] : undefined,
    );
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

/**
 * Read-only handle returned by Assembly.solve(poses). Exposes per-part
 * world transforms, per-joint pose values, body iteration, the canonical
 * Scene snapshot via `.toScene()`, and a deprecated `.toShape()` alias for
 * legacy single-Shape consumers.
 */
export class SolvedKinematics {
  private readonly assemblyName: string;
  private readonly partsByName: Map<string, AssemblyPartStored>;
  private readonly worldT: Map<FeatureId, Transform>;
  private readonly poses: Record<string, number | [number, number, number]>;
  private readonly joints: readonly AssemblyJointStored[];
  private readonly session: CaptureSession;
  /**
   * Issue #537 — advisory out-of-limits diagnostics for poses that exceed a
   * joint's declared `limitsDeg`/`limitsMm`. Always present (possibly empty).
   * Propagated onto `toScene().warnings` so the snapshot Scene reports them
   * identically to `solvedModel(...)`.
   */
  readonly warnings: readonly SceneDiagnostic[];

  /**
   * Process-scoped warn-once flag for the deprecated `.toShape()` alias.
   * The warning channel for this slice is `console.warn` (the milestone-C
   * `DiagnosticCode` catalogue is closed at 24 entries, so a dedicated
   * `feature.deprecated` code is out of scope; the hint string format is
   * preserved verbatim so a future migration to a structured session
   * diagnostic is a one-line change). See
   * `tests/unit/assemblies/solvedKinematicsToScene.test.ts`.
   */
  private static toShapeWarned = false;

  /** Test hook: reset the process-scoped warn-once flag. NOT public API. */
  static __resetDeprecationWarnedForTest(): void {
    SolvedKinematics.toShapeWarned = false;
  }

  constructor(
    assemblyName: string,
    parts: readonly AssemblyPartStored[],
    joints: readonly AssemblyJointStored[],
    worldT: Map<FeatureId, Transform>,
    poses: Record<string, number | [number, number, number]>,
    session: CaptureSession,
    warnings: readonly SceneDiagnostic[] = [],
  ) {
    this.assemblyName = assemblyName;
    this.partsByName = new Map(parts.map(p => [p.name, p]));
    this.worldT = worldT;
    this.poses = poses;
    this.joints = joints;
    this.session = session;
    this.warnings = Object.freeze([...warnings]);
    Object.freeze(this);
  }

  /**
   * World-space SE(3) transform of the named part. Read-only handle;
   * use with Shape.transform(t) to attach geometry to this part's frame.
   */
  transform(partName: string): Transform {
    const part = this.partsByName.get(partName);
    if (!part) {
      throw new KernelError(
        'feature.invalid-args',
        `SolvedKinematics.transform: unknown part '${partName}'.`,
        undefined,
        'invalid-args.solved.unknown-part — pass a part name registered via assembly.part(...).',
      );
    }
    return this.worldT.get(part.id)!;
  }

  /**
   * Pose value supplied for the named joint (defaults: 0 for revolute /
   * prismatic, [0,0,0] for ball, 0 for fixed since fixed has no pose).
   */
  value(jointName: string): number | [number, number, number] {
    const joint = this.joints.find(j => j.name === jointName);
    if (!joint) {
      throw new KernelError(
        'feature.invalid-args',
        `SolvedKinematics.value: unknown joint '${jointName}'.`,
        undefined,
        'invalid-args.solved.unknown-joint — pass a joint name registered via revolute/prismatic/fixed/ball.',
      );
    }
    if (joint.kind === 'ball') {
      return (this.poses[jointName] as [number, number, number] | undefined) ?? [0, 0, 0];
    }
    if (joint.kind === 'fixed') return 0;
    return (this.poses[jointName] as number | undefined) ?? 0;
  }

  /**
   * Iterate (partName, worldTransform) for every part in the assembly.
   * Useful for batch attach or analysis loops.
   */
  *bodies(): IterableIterator<{ name: string; transform: Transform }> {
    for (const [name, part] of this.partsByName) {
      yield { name, transform: this.worldT.get(part.id)! };
    }
  }

  /**
   * Multi-body view of the FK snapshot. Mirrors `Assembly.solvedModel(poses)`'s
   * return shape — a frozen `Scene` whose ordered `parts` match
   * `assembly.part(name, ...)` declaration order, with each part's
   * `worldTransform` set to the FK-resolved SE(3) and `color` walked from
   * the source-shape upstream chain.
   *
   * Unlike the reactive `solvedModel(poses)` Scene, this Scene is a snapshot:
   * the FK is already baked into each part's source `Shape` (see
   * `Assembly.solve`), so `Scene.toUnion()` chains `Shape.union()` on the
   * mutated source shapes directly and does NOT record a fresh
   * `solvedAssembly` / `assemblyExport` feature pair. `Scene.toCompound()`
   * is intentionally unsupported on snapshot Scenes — call
   * `Assembly.solvedModel(poses).toCompound()` for a TopoDS_Compound that
   * preserves per-part identity through the lowerer.
   *
   * Rendering note (issue #538): this snapshot Scene carries NO upstream
   * feature id (`__sourceFeatureId()` is undefined), so RETURNING it from a
   * script does not route to the SceneBackend mesh fan-out — `resolveRootId`
   * falls back to the chain tail (the last `assemblyJoint`/part record) and
   * the viewport renders that single record, not a posed multi-part scene.
   * For a posed AND per-part-colored scene that renders, return
   * `Assembly.solvedModel(poses)` directly (the reactive Scene whose lowerer
   * emits a colored, FK-posed SceneBackend); use this snapshot handle for
   * in-script analysis (`transform(part)`, `bodies()`) or `.toUnion()` for a
   * fused single Shape.
   */
  toScene(): Scene {
    if (this.partsByName.size === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'SolvedKinematics.toScene: assembly has no parts.',
        undefined,
        'Call assembly.part(...) before assembly.solve(...).',
      );
    }
    const records = this.session.getRecords();
    const sceneParts: ScenePart[] = [];
    for (const part of this.partsByName.values()) {
      const partRecord = records.find(r => r.id === part.id);
      const color = partRecord ? lookupSourceColor(partRecord, records) : undefined;
      sceneParts.push({
        name: part.name,
        shape: part.originalShape,
        worldTransform: this.worldT.get(part.id) ?? Transform.identity(),
        ...(color !== undefined ? { color } : {}),
        ...(part.mateConnectors.length > 0 ? { connectors: [...part.mateConnectors] } : {}),
      });
    }
    const assemblyName = this.assemblyName;
    return new Scene(
      assemblyName,
      sceneParts,
      () => {
        throw new KernelError(
          'feature.invalid-args',
          `Scene.bbox: snapshot Scene from SolvedKinematics has no capture-time AABB. Compute the bbox from each part's shape.boundingBox() with worldTransform applied, or call Scene.toUnion().boundingBox().`,
          undefined,
          'invalid-args.scene.bbox-not-available — capture-time Scene bbox is computed during recompute; for the snapshot Scene, use per-part bboxes or .toUnion().boundingBox().',
        );
      },
      (op) => {
        if (op === 'union') {
          const partsArr = Array.from(this.partsByName.values());
          let model: Shape = partsArr[0].originalShape;
          for (let i = 1; i < partsArr.length; i++) {
            model = model.union(partsArr[i].originalShape);
          }
          return model;
        }
        // op === 'compound'.
        throw new KernelError(
          'feature.invalid-args',
          `Scene.toCompound: snapshot Scene from SolvedKinematics does not support compound export (per-part identity is not preserved through the snapshot). Call Assembly.solvedModel(poses).toCompound() instead.`,
          undefined,
          'invalid-args.scene.compound-not-supported-on-snapshot — call Assembly.solvedModel(poses).toCompound() for a Scene whose lowerer preserves per-part identity.',
        );
      },
      undefined, // sourceFeatureId — snapshot Scene has no upstream feature.
      undefined, // mates — snapshot Scene does not carry the mate graph.
      // Issue #537 — propagate out-of-limits warnings onto the snapshot Scene.
      this.warnings,
    );
  }

  /**
   * @deprecated v0.5.0 — call `.toScene().toUnion()` instead. Emits a
   * warn-once `deprecated.solvedKinematics.toShape` advisory on the first
   * call per process and delegates to `.toScene().toUnion()`. Removal in
   * v0.6.0 (CHANGELOG entry under v0.5.0).
   */
  toShape(): Shape {
    if (!SolvedKinematics.toShapeWarned) {
      SolvedKinematics.toShapeWarned = true;
      console.warn(
        'SolvedKinematics.toShape() is deprecated; call .toScene().toUnion() instead. ' +
          'hint: deprecated.solvedKinematics.toShape — call .toScene().toUnion() instead.',
      );
    }
    return this.toScene().toUnion();
  }
}

/**
 * Resolve an `Editable<number>` pose coord against the session's ParamTable
 * to a concrete finite number. Used by `Assembly.solve` for snapshot
 * resolution. Wraps `currentValue` (the existing capture-time resolver) so
 * the diagnostic surface uses solve-specific hints.
 *
 * Errors:
 *   - non-number / non-ParamRef     → invalid-args.solve.bad-pose
 *   - non-finite numeric            → invalid-args.solve.bad-pose
 *   - unknown ParamRef name         → propagated from ParamTable.get
 *     (existing `invalid-args.param.unknown-name`).
 */
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

function isValidJointLimits(value: [number, number]): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    value[0] < value[1]
  );
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

function isScalarCouplingMate(type: MateType): boolean {
  return type === 'revolute'
    || type === 'prismatic'
    || type === 'cylindrical'
    || type === 'pin_slot';
}

function normalizeConnectors(
  partName: string,
  featureId: FeatureId,
  connectors: Record<string, AssemblyConnectorFrame> | undefined,
): Record<string, AssemblyConnectorFrameStored> {
  const normalized: Record<string, AssemblyConnectorFrameStored> = {};
  for (const [name, frame] of Object.entries(connectors ?? {})) {
    assertTopoRefSafeName(name, 'connector-name', featureId);
    if (!isValidEditableVec3(frame.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' origin must be a finite Vec3 (numbers or ParamRef<number>); got ${formatScalarForError(frame.origin)}.`,
        featureId,
        'Pass connector frames as { origin: [x, y, z], axis?: [x, y, z] }; coords may be number or ParamRef.',
      );
    }
    if (frame.axis !== undefined && !isValidEditableVec3(frame.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' axis must be a finite Vec3; got ${formatScalarForError(frame.axis)}.`,
        featureId,
        'Pass connector axis as [x, y, z], or omit it; coords may be number or ParamRef.',
      );
    }
    normalized[name] = frame.axis === undefined
      ? { origin: toVec3Param(frame.origin, 'mm') }
      : { origin: toVec3Param(frame.origin, 'mm'), axis: toVec3Param(frame.axis, 'unitless') };
  }
  return normalized;
}

/** Sanity-check every numeric field on an authored cross-section. Lengths
 *  must be finite + positive; an invalid field raises a `feature.invalid-args`
 *  at capture time so beam-mode load checks never see NaN-laced sections. */
function validateCrossSection(
  partName: string,
  featureId: FeatureId,
  cs: AssemblyCrossSection,
): void {
  const ensurePositive = (label: string, value: number): void => {
    if (!Number.isFinite(value) || value <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly part '${partName}': crossSection ${label} must be a positive finite number; got ${formatScalarForError(value)}.`,
        featureId,
        'Pass every cross-section length in millimetres as a finite number > 0.',
      );
    }
  };
  ensurePositive('lengthMm', cs.lengthMm);
  if (cs.kind === 'rectangle') {
    ensurePositive('widthMm', cs.widthMm);
    ensurePositive('heightMm', cs.heightMm);
  } else if (cs.kind === 'circle') {
    ensurePositive('radiusMm', cs.radiusMm);
  } else {
    ensurePositive('flangeWidthMm', cs.flangeWidthMm);
    ensurePositive('flangeThicknessMm', cs.flangeThicknessMm);
    ensurePositive('webHeightMm', cs.webHeightMm);
    ensurePositive('webThicknessMm', cs.webThicknessMm);
  }
}

function paramToExpr(p: Param): ParamRefExpr {
  if (p.paramRef === undefined) {
    return { kind: 'lit', value: p.evaluated };
  }
  if (typeof p.paramRef === 'string') {
    return { kind: 'param', name: p.paramRef };
  }
  return p.paramRef;
}

function paramFromExpr(expr: ParamRefExpr, unit: Unit, evaluatedSnapshot: number): Param {
  return {
    expression: `{$paramExpr:${paramExprToDebugString(expr)}}`,
    unit,
    evaluated: evaluatedSnapshot,
    paramRef: expr,
  };
}

function addParams(a: Param, b: Param): Param {
  if (a.paramRef === undefined && b.paramRef === undefined) {
    return {
      expression: `(${a.expression} + ${b.expression})`,
      unit: a.unit,
      evaluated: a.evaluated + b.evaluated,
    };
  }
  return paramFromExpr(
    { kind: 'binop', op: '+', left: paramToExpr(a), right: paramToExpr(b) },
    a.unit,
    a.evaluated + b.evaluated,
  );
}

function subtractParams(a: Param, b: Param): Param {
  if (a.paramRef === undefined && b.paramRef === undefined) {
    return {
      expression: `(${a.expression} - ${b.expression})`,
      unit: a.unit,
      evaluated: a.evaluated - b.evaluated,
    };
  }
  return paramFromExpr(
    { kind: 'binop', op: '-', left: paramToExpr(a), right: paramToExpr(b) },
    a.unit,
    a.evaluated - b.evaluated,
  );
}

function resolvePartPlacement(
  assemblyName: string,
  partName: string,
  featureId: FeatureId,
  explicitAt: EditableVec3 | undefined,
  connectors: Record<string, AssemblyConnectorFrameStored>,
  connect: AssemblyPartOpts['connect'],
): Vec3Param {
  if (!connect) {
    return toVec3Param(explicitAt ?? [0, 0, 0], 'mm');
  }
  const local = connectors[connect.connector];
  if (!local) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connector '${connect.connector}' is not defined on part '${partName}'.`,
      featureId,
      'Declare the connector in opts.connectors before using opts.connect.connector.',
    );
  }
  if (connect.to.assemblyName === undefined || connect.to.partId === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connect target is not a valid connector reference.`,
      featureId,
      'Pass a connector returned by part.connector(name).',
    );
  }
  if (connect.to.assemblyName !== assemblyName) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connect target '${connect.to.partName}.${connect.to.connector}' belongs to assembly '${connect.to.assemblyName}', not '${assemblyName}'.`,
      featureId,
      'Only connect parts within the same assembly.',
    );
  }
  if (explicitAt !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part cannot combine explicit at with connector placement.`,
      featureId,
      'Use either at: [x, y, z] or connect: { connector, to }, not both.',
    );
  }
  return {
    x: subtractParams(connect.to.worldOrigin.x, local.origin.x),
    y: subtractParams(connect.to.worldOrigin.y, local.origin.y),
    z: subtractParams(connect.to.worldOrigin.z, local.origin.z),
  };
}

function makePartRef(
  assemblyName: string,
  id: FeatureId,
  name: string,
  at: Vec3Param,
  connectors: Record<string, AssemblyConnectorFrameStored>,
  mateConnectors: Connector[],
  wrapGeoms: WrapGeomRecord[],
  addPart: (name: string, shape: Shape, opts?: AssemblyPartOpts) => AssemblyPartRef,
  // Owning assembly — the ref's chain terminators (`model` / `solve` /
  // `solvedModel`) delegate straight to it so there is exactly one
  // implementation of each.
  owner: Assembly,
): AssemblyPartRef {
  // Overload: `connector(name)` returns the v0.5 kinematic AssemblyConnectorRef;
  // `connector(name, opts)` registers a v0.6 mate-style Connector and returns
  // the part-ref for chaining. Defined as a standalone function so the
  // overloaded union return type can be narrowed by `opts !== undefined`.
  const connector = (
    connectorName: string,
    opts?: AssemblyConnectorOpts,
  ): AssemblyConnectorRef | AssemblyPartRef => {
    if (opts !== undefined) {
      assertTopoRefSafeName(connectorName, 'connector-name', id);
      if (mateConnectors.some((c) => c.name === connectorName)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.connector.duplicate-name: part '${name}' already has a connector named '${connectorName}'.`,
          id,
          `invalid-args.assembly.connector-duplicate-name — rename one of the connectors on '${name}'.`,
        );
      }
      // F-surface F4: opts.origin accepts a `@kc[<part>/<kind>/<name>]` string
      // alongside the structured ConnectorOrigin union. Normalise here BEFORE
      // constructing the Connector record so downstream solvers see only the
      // structured form.
      const normalizedOrigin = normalizeConnectorOriginInput(opts.origin, name);
      mateConnectors.push(
        makeConnector({
          name: connectorName,
          type: opts.type,
          origin: normalizedOrigin,
          axis: opts.axis,
          normal: opts.normal,
          ...(opts.jointClearanceRadius !== undefined
            ? { jointClearanceRadius: opts.jointClearanceRadius }
            : {}),
        }),
      );
      return ref;
    }
    const frame = connectors[connectorName];
    if (!frame) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${connectorName}' is not defined on part '${name}'.`,
        id,
        'Use one of the connector names declared in assembly.part(..., { connectors }).',
      );
    }
    const worldOrigin: Vec3Param = {
      x: addParams(at.x, frame.origin.x),
      y: addParams(at.y, frame.origin.y),
      z: addParams(at.z, frame.origin.z),
    };
    return {
      assemblyName,
      partId: id,
      partName: name,
      connector: connectorName,
      origin: frame.origin,
      worldOrigin,
      ...(frame.axis !== undefined ? { axis: frame.axis } : {}),
    };
  };
  // P11 Slice 2 — declare a collision-OFF wrap cylinder for tendon
  // routing. Mirrors the mate-style `connector(name, opts)` chain: validate,
  // push into the shared `wrapGeoms` array, return `ref`.
  const wrapGeom = (
    wrapName: string,
    opts: WrapGeomOptions,
  ): AssemblyPartRef => {
    assertTopoRefSafeName(wrapName, 'wrap-geom-name', id);
    if (wrapGeoms.some((w) => w.name === wrapName)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.duplicate-name: part '${name}' already has a wrap geom named '${wrapName}'.`,
        id,
        `invalid-args.assembly.wrap-geom-duplicate-name — rename one of the wrap geoms on '${name}'.`,
      );
    }
    const axis = opts.axis;
    const axisLenSq = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];
    if (
      !Number.isFinite(axis[0]) || !Number.isFinite(axis[1]) || !Number.isFinite(axis[2]) ||
      axisLenSq <= 0
    ) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.invalid-axis: wrap geom '${wrapName}' on part '${name}' needs a finite non-zero axis; got [${formatScalarForError(axis[0])}, ${formatScalarForError(axis[1])}, ${formatScalarForError(axis[2])}].`,
        id,
        `invalid-args.assembly.wrap-geom-invalid-axis — pass axis: [x, y, z] pointing along the cylinder centerline (the arm's long axis for a balance spring).`,
      );
    }
    if (!Number.isFinite(opts.radius) || opts.radius <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.invalid-radius: wrap geom '${wrapName}' on part '${name}' radius must be a positive finite number; got ${formatScalarForError(opts.radius)}.`,
        id,
        `invalid-args.assembly.wrap-geom-invalid-radius — pass radius: <positive mm>. Size it to the arm half-thickness plus the cable standoff so the spring rides clear of the body.`,
      );
    }
    if (opts.halfLengthMm !== undefined && (!Number.isFinite(opts.halfLengthMm) || opts.halfLengthMm <= 0)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.invalid-half-length: wrap geom '${wrapName}' on part '${name}' halfLengthMm must be a positive finite number when provided; got ${formatScalarForError(opts.halfLengthMm)}.`,
        id,
        `invalid-args.assembly.wrap-geom-invalid-half-length — pass halfLengthMm: <positive mm>, or omit it for an effectively-infinite routing cylinder.`,
      );
    }
    const origin = opts.origin ?? [0, 0, 0];
    const rec: WrapGeomRecord = {
      name: wrapName,
      axis: [axis[0], axis[1], axis[2]],
      origin: [origin[0], origin[1], origin[2]],
      radiusMm: opts.radius,
      ...(opts.halfLengthMm !== undefined ? { halfLengthMm: opts.halfLengthMm } : {}),
    };
    wrapGeoms.push(rec);
    return ref;
  };
  const ref: AssemblyPartRef = {
    id,
    name,
    assemblyName,
    at,
    connectors,
    mateConnectors,
    wrapGeoms,
    connector: connector as AssemblyPartRef['connector'],
    wrapGeom,
    part: addPart,
    model: () => owner.model(),
    solve: (poses) => owner.solve(poses),
    solvedModel: (...args) => owner.solvedModel(...args),
  };
  return ref;
}

function validateConnectorAssembly(assemblyName: string, connector: AssemblyConnectorRef): void {
  if (connector.assemblyName !== assemblyName) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly connector '${connector.partName}.${connector.connector}' belongs to assembly '${connector.assemblyName}', not '${assemblyName}'.`,
      connector.partId,
      'Only connect parts within the same assembly.',
    );
  }
}
