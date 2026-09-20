// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { formatScalarForError, isValidVec3 } from '../../shared/intent/types';
import { parseConnectorRef, type MateCapacity, type MateLimitRange, type MateLoadLimit, type MatePose, type MateRecord } from '../mates/mate';
import type { Connector } from '../mates/connector';
import { isCompatiblePair, type MateType } from '../mates/mateTypes';
import {
  TENDON_DEFAULT_COIL_DIAMETER_MM,
  TENDON_DEFAULT_COIL_TURNS,
  TENDON_DEFAULT_VISUAL_DIAMETER_MM,
  TENDON_DEFAULT_VISUAL_STYLE,
  type TendonOptions,
  type TendonWrapRef,
} from '../mates/tendon';
import { validateWorkspaceTargetOpts, type WorkspaceTargetOpts } from '../mates/workspaceTarget';
import type {
  AssemblyConnectorRef,
  AssemblyConnectRef,
  AssemblyJointRef,
  AssemblyPartRef,
  AssemblyPartStored,
  BallJointOpts,
  PrismaticJointOpts,
  RevoluteJointOpts,
} from './assemblyTypes';
import type { AssemblyState } from './assemblyState';
import { copyMateCapacity, validateLimitRange, validateMateCapacityOptions } from './assemblyMateCapacity';

function isValidJointLimits(value: [number, number]): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    value[0] < value[1]
  );
}

function isScalarCouplingMate(type: MateType): boolean {
  return type === 'revolute'
    || type === 'prismatic'
    || type === 'cylindrical'
    || type === 'pin_slot';
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

// arm.revoluteJoint(...) is the body-tree-FK API for a single-DOF rotational
// joint (restored per issue #535). It declares a drivable revolute directly
// on the joint graph that solve()/solvedModel() walk — no need to reach into
// `session.assemblyJoint(...)` + `joints.push(...)` internals. For mate-graph
// gated mechanisms prefer `arm.connector(...)` + `arm.mate(name, a, b,
// 'revolute', { ... })`; both surfaces coexist.
export function revoluteJoint(state: AssemblyState, name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: RevoluteJointOpts): AssemblyJointRef {
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
  const record = state.session.assemblyJoint(state.name, name, 'revolute', a, b, {
    axis: opts.axis,
    origin: opts.origin,
    ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
  });
  state.joints.push({
    id: record.id,
    name,
    kind: 'revolute',
    parentPartId: a.id,
    childPartId: b.id,
    axis: opts.axis,
    origin: opts.origin,
    ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
    ...(opts.actuator !== undefined ? { actuator: opts.actuator } : {}),
  });
  return { id: record.id, name, kind: 'revolute' };
}

export function prismaticJoint(state: AssemblyState, name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: PrismaticJointOpts): AssemblyJointRef {
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
  const record = state.session.assemblyJoint(state.name, name, 'prismatic', a, b, {
    axis: opts.axis,
    origin: opts.origin,
    ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
  });
  state.joints.push({
    id: record.id,
    name,
    kind: 'prismatic',
    parentPartId: a.id,
    childPartId: b.id,
    axis: opts.axis,
    origin: opts.origin,
    ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
    ...(opts.actuator !== undefined ? { actuator: opts.actuator } : {}),
  });
  return { id: record.id, name, kind: 'prismatic' };
}

// arm.fixed(...) was the v0.5 body-tree-FK API for rigid (no-DOF) joints.
// Removed in G0 (2026-05-31, mechanism-delivery workstream) for the same
// reason as arm.revolute(...). Use `arm.connector(...)` +
// `arm.mate(name, a, b, 'fastened')` instead. See
// examples/robot-arm/desktop-3axis-mates.kcad.ts for the canonical pattern.

export function ballJoint(state: AssemblyState, name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: BallJointOpts): AssemblyJointRef {
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
  const record = state.session.assemblyJoint(state.name, name, 'ball', a, b, {
    origin: opts.origin,
    ...(opts.limitsDeg !== undefined ? { ballLimitsDeg: opts.limitsDeg } : {}),
  });
  state.joints.push({
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

export function connectFixed(state: AssemblyState, name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef {
  validateConnectorAssembly(state.name, a);
  validateConnectorAssembly(state.name, b);
  const record = state.session.assemblyConnect(state.name, name, a, b);
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
interface MateOptions {
  pose?: MatePose;
  limitsDeg?: MateLimitRange;
  limitsMm?: MateLimitRange;
  exposure?: 'exposed' | 'concealed';
  capacity?: MateCapacity;
  /** @deprecated legacy manual-load API */
  maxLoad?: MateLoadLimit;
}

export function recordMate(
  state: AssemblyState,
  name: string,
  aRef: string,
  bRef: string,
  type: MateType,
  opts?: MateOptions,
): void {
  const a = resolveMateConnector(state, aRef);
  const b = resolveMateConnector(state, bRef);
  assertMateConnectorPair(name, type, aRef, bRef, a, b);
  validateMatePoseAllowed(name, type, opts);
  validateMateLimits(name, type, opts);
  validateMateCapacityOptions(name, type, opts);
  state.mates.push(buildMateRecord(name, aRef, bRef, type, opts));
}

function assertMateConnectorPair(
  name: string,
  type: MateType,
  aRef: string,
  bRef: string,
  a: { connector: Connector },
  b: { connector: Connector },
): void {
  if (!isCompatiblePair(type, a.connector.type, b.connector.type)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mate.type-mismatch: mate '${name}' type '${type}' is not compatible with the connector pair (${aRef}:${a.connector.type}, ${bRef}:${b.connector.type}).`,
      undefined,
      `invalid-args.assembly.mate-type-mismatch — '${type}' mates require a specific connector-type pair; see the mate-type compatibility table in mateTypes.ts.`,
    );
  }
}

function validateMatePoseAllowed(name: string, type: MateType, opts: MateOptions | undefined): void {
  if (opts?.pose !== undefined && (type === 'fastened' || type === 'planar')) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mate.pose-on-zero-dof-mate: mate '${name}' is type '${type}' and accepts no pose; remove opts.pose.`,
      undefined,
      `invalid-args.assembly.mate-pose-on-zero-dof-mate — '${type}' mates have no articulation DOF; drop opts.pose or change the mate type.`,
    );
  }
}

function buildMateRecord(
  name: string,
  aRef: string,
  bRef: string,
  type: MateType,
  opts: MateOptions | undefined,
): MateRecord {
  return {
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
  };
}

export function coupleMateRecords(
  state: AssemblyState,
  driven: string,
  opts: { source: string; ratio: number; offset?: number },
): void {
  const source = state.mates.find((mate) => mate.name === opts.source);
  const drivenMate = state.mates.find((mate) => mate.name === driven);
  if (!source || !drivenMate) {
    const known = state.mates.map((mate) => mate.name).join(', ') || '(none)';
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
  state.mateCouplings.push({
    driven,
    source: opts.source,
    ratio: opts.ratio,
    ...(opts.offset !== undefined ? { offset: opts.offset } : {}),
  });
}

/** Validate + normalize a tendon's coil-visual-style fields. Split out of
 *  `normalizeTendonFields` to keep each function's branching complexity
 *  under the quality-ratchet budget; no behavior change from the inline
 *  version it replaces. */
function normalizeTendonCoilFields(
  name: string,
  opts: TendonOptions,
  visualDiameter: number,
): { visualStyle: 'line' | 'coil'; coilTurns: number; coilDiameter: number } {
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
  return { visualStyle, coilTurns, coilDiameter };
}

/** Validate + normalize a tendon's scalar/style fields (all of `opts` except
 *  the endpoint refs and wrap geoms). Split out of `recordTendon` to keep
 *  each function's branching complexity under the quality-ratchet budget;
 *  no behavior change from the inline version it replaces. */
function normalizeTendonFields(name: string, opts: TendonOptions): {
  damping: number;
  visualDiameter: number;
  visualStyle: 'line' | 'coil';
  coilTurns: number;
  coilDiameter: number;
} {
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
  const { visualStyle, coilTurns, coilDiameter } = normalizeTendonCoilFields(name, opts, visualDiameter);
  return { damping, visualDiameter, visualStyle, coilTurns, coilDiameter };
}

/** Resolve + validate wrap-geom routing rails for a tendon. Split out of
 *  `recordTendon` for the same complexity-budget reason as
 *  `normalizeTendonFields`; no behavior change. */
function resolveTendonWrapGeoms(state: AssemblyState, name: string, opts: TendonOptions): TendonWrapRef[] {
  // P11 Slice 2 — resolve + validate wrap-geom routing rails. Each entry
  // must name a part that exists and a `WrapGeomRecord` already declared
  // on that part via `part.wrapGeom(...)` (declare wrap geoms BEFORE the
  // tendon, same ordering rule as connectors before mates).
  const wrapGeoms: TendonWrapRef[] = [];
  if (opts.wrapGeoms !== undefined) {
    for (const w of opts.wrapGeoms) {
      const part = state.parts.find((p) => p.name === w.partName);
      if (part === undefined) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.tendon.unknown-wrap-part: tendon '${name}' references wrap geom on part '${w.partName}', which is not declared on assembly '${state.name}'.`,
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
  return wrapGeoms;
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
export function recordTendon(state: AssemblyState, name: string, opts: TendonOptions): void {
  if (state.tendons.some((t) => t.name === name)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.tendon.duplicate-name: tendon '${name}' is already declared on assembly '${state.name}'.`,
      undefined,
      `invalid-args.assembly.tendon-duplicate-name — pick a unique tendon name, or remove the earlier arm.tendon('${name}', ...) call.`,
    );
  }
  // Resolve both endpoints. Reuse the same "<part>.<connector>" grammar
  // as mates so the agent surface is consistent.
  const fromRes = resolveTendonEndpoint(state, name, 'from', opts.from);
  const toRes = resolveTendonEndpoint(state, name, 'to', opts.to);
  if (fromRes.partName === toRes.partName) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.tendon.same-body-endpoints: tendon '${name}' has both endpoints on part '${fromRes.partName}'. A tendon must span TWO different parts to produce a restoring moment around the joint between them.`,
      undefined,
      `invalid-args.assembly.tendon-same-body-endpoints — pick connectors on DIFFERENT parts. The canonical pattern is one connector on the parent arm and one on the child arm of the joint the spring spans.`,
    );
  }
  const { damping, visualDiameter, visualStyle, coilTurns, coilDiameter } = normalizeTendonFields(name, opts);
  const wrapGeoms = resolveTendonWrapGeoms(state, name, opts);
  state.tendons.push({
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
export function recordWorkspaceTarget(state: AssemblyState, connectorRef: string, opts: WorkspaceTargetOpts): void {
  state.workspaceTargets.push(validateWorkspaceTargetOpts(connectorRef, opts));
}

function validateMateLimits(
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
function resolveMateConnector(state: AssemblyState, ref: string): { part: AssemblyPartStored; connector: Connector } {
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
  const part = state.parts.find((p) => p.name === parsed.partName);
  if (!part) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mate.connector-not-found: part '${parsed.partName}' (from ref '${ref}') is not declared on assembly '${state.name}'.`,
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
function resolveTendonEndpoint(
  state: AssemblyState,
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
  const part = state.parts.find((p) => p.name === parsed.partName);
  if (!part) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.tendon.connector-not-found: tendon '${tendonName}' ${side}: part '${parsed.partName}' is not declared on assembly '${state.name}'.`,
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
