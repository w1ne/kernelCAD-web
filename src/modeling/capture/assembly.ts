// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { assertTopoRefSafeName } from '../../kernel/naming/uniquenessValidator';
import { KernelError } from '../../shared/intent/kernelError';
import { Scene } from '../validation/scene';
import type { EditableVec3, FeatureId, Param, Unit, Vec3, Vec3Param } from '../../shared/intent/types';
import { formatScalarForError, isValidEditableVec3 } from '../../shared/intent/types';
import {
  makeConnector,
  normalizeConnectorOriginInput,
  type Connector,
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
import type { MateType } from '../mates/mateTypes';
import {
  type TendonOptions,
  type TendonRecord,
  type WrapGeomOptions,
  type WrapGeomRecord,
} from '../mates/tendon';
import type {
  WorkspaceTargetOpts,
  WorkspaceTargetRecord,
} from '../mates/workspaceTarget';
import type {
  PhysicalUseCaseOptions,
  PhysicalUseCaseRecord,
} from '../mates/physicalUseCase';
import { toVec3Param } from '../../shared/runtime/editableHelpers';
import { paramExprToDebugString, type ParamRefExpr } from '../../shared/runtime/paramRef';
import { Transform } from '../../shared/runtime/se3';
import type { PartLineage, PartLineageMap } from '../../kernel/naming/evolutionRecord';
import type { CaptureSession } from './captureSession';
import { Shape } from './proxy';
import { resolveMaterial, type ResolvedMaterial } from '../properties/materialLibrary';
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
import { copyMateCapacity } from './assemblyMateCapacity';
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

export * from './assemblyTypes';
export { SolvedKinematics } from './solvedKinematics';
import type {
  AssemblyConnectorFrame,
  AssemblyConnectorFrameStored,
  AssemblyConnectorOpts,
  AssemblyConnectorRef,
  AssemblyConnectRef,
  AssemblyCrossSection,
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
    return this.partInternal(name, shape, opts, true);
  }

  /** Internal part route used by subAssembly() to copy already-promoted
   * catalog interfaces without registering them a second time. */
  private partInternal(
    name: string,
    shape: Shape,
    opts: AssemblyPartOpts,
    promoteCatalogConnectors: boolean,
  ): AssemblyPartRef {
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
    const transformedCatalogConnectors = promoteCatalogConnectors
      ? transformCatalogConnectors(this.session, shape)
      : [];
    for (const connector of transformedCatalogConnectors) {
      if (Object.hasOwn(connectors, connector.name)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly connector '${connector.name}' is declared both by the catalog part and assembly.part options.`,
          shape.id,
          'Rename the user-declared connector or use the catalog connector as-is.',
        );
      }
      connectors[connector.name] = {
        origin: toVec3Param(connector.origin, 'mm'),
        axis: toVec3Param(
          connector.type === 'frame' ? connector.normal : connector.axis,
          'unitless',
        ),
      };
    }
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
    for (const connector of transformedCatalogConnectors) {
      part.connector(connector.name, {
        type: connector.type,
        origin: { kind: 'vec3', value: connector.origin },
        ...(connector.type === 'frame'
          ? { normal: connector.normal }
          : { axis: connector.axis }),
      });
    }
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
      const newRef = this.partInternal(newName, op.originalShape, {
        ...(op.connectors !== undefined ? { connectors: op.connectors } : {}),
      }, false);
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

type TransformedCatalogConnector =
  | {
      name: string;
      type: 'frame';
      origin: Vec3;
      normal: Vec3;
    }
  | {
      name: string;
      type: 'axis';
      origin: Vec3;
      axis: Vec3;
    };

function mutableVec3(vector: readonly [number, number, number]): Vec3 {
  return [vector[0], vector[1], vector[2]];
}

function literalCatalogTransformParam(
  value: Param,
  shapeId: FeatureId,
  transformLabel: string,
): number {
  if (value.paramRef !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part cannot promote catalog connectors for shape '${shapeId}' because its ${transformLabel} uses a ParamRef.`,
      shapeId,
      'Use only literal translate and rotate transforms on catalog-backed shapes before adding them to an assembly.',
    );
  }
  return value.evaluated;
}

function literalCatalogTransformVec3(
  value: Vec3Param,
  shapeId: FeatureId,
  transformLabel: string,
): Vec3 {
  return [
    literalCatalogTransformParam(value.x, shapeId, `${transformLabel}.x`),
    literalCatalogTransformParam(value.y, shapeId, `${transformLabel}.y`),
    literalCatalogTransformParam(value.z, shapeId, `${transformLabel}.z`),
  ];
}

/**
 * Catalog connector manifests describe a shape's untransformed local frame.
 * Preserve that exact authored meaning through rigid, literal Shape transforms
 * so the legacy connector-placement and mate connector APIs agree. Generic
 * autoConnectors deliberately never enter this path.
 */
function transformCatalogConnectors(
  session: CaptureSession,
  shape: Shape,
): TransformedCatalogConnector[] {
  const catalogConnectors = session.catalogConnectors.get(shape.id);
  if (catalogConnectors === undefined) return [];

  const transforms = session.getRecords().find((record) => record.id === shape.id)?.transforms ?? [];
  let total = Transform.identity();
  for (const transform of transforms) {
    let next: Transform;
    if (transform.op === 'translate') {
      const vector = literalCatalogTransformVec3(transform.vec, shape.id, 'translate');
      next = Transform.translation(vector[0], vector[1], vector[2]);
    } else if (transform.op === 'rotateAxis') {
      const axis = literalCatalogTransformVec3(transform.axis, shape.id, 'rotate.axis');
      const degrees = literalCatalogTransformParam(transform.degrees, shape.id, 'rotate.degrees');
      const pivot = transform.pivot === undefined
        ? [0, 0, 0] as Vec3
        : literalCatalogTransformVec3(transform.pivot, shape.id, 'rotate.pivot');
      next = Transform.rotationAroundPivot(axis, degrees, pivot);
    } else {
      const label = transform.op === 'scale' ? 'scale' : 'reflect';
      throw new KernelError(
        'feature.invalid-args',
        `assembly.part cannot promote catalog connectors for shape '${shape.id}' through ${label}: catalog interfaces require rigid transforms.`,
        shape.id,
        'Use only literal translate and rotate transforms on catalog-backed shapes before adding them to an assembly.',
      );
    }
    // Shape transforms execute in declaration order. Transform.compose reads
    // "apply other, then this", so each new transform pre-multiplies the
    // accumulated local-frame transform.
    total = next.compose(total);
  }

  return catalogConnectors.map((connector): TransformedCatalogConnector => {
    const origin = mutableVec3(total.point(connector.origin));
    if (connector.type === 'frame') {
      return {
        name: connector.name,
        type: 'frame',
        origin,
        normal: mutableVec3(total.axisDir(connector.normal)),
      };
    }
    return {
      name: connector.name,
      type: 'axis',
      origin,
      axis: mutableVec3(total.axisDir(connector.axis)),
    };
  });
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
