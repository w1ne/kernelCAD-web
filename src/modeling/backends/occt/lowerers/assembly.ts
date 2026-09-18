// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { lookupSourceColor, lookupSourceMaterial } from '../../../../kernel/backends/occt/lookupSourceColor';
import { isSceneBackend, type SceneBackend, type SceneBackendPart } from '../../../../kernel/backends/sceneBackend';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { KernelError } from '../../../../shared/intent/kernelError';
import type { FeatureId, Param, Vec3, Vec3Param } from '../../../../shared/intent/types';
import { Transform } from '../../../../shared/runtime/se3';
import type { AssemblyJointStored, AssemblyPartStored } from '../../../capture/assembly';
import { forwardKinematics, type NumericPoses } from '../../../capture/forwardKinematics';
import { expandCoupledPoses, type MateCouplingRecord } from '../../../mates/coupledPoses';
import type { Connector } from '../../../mates/connector';
import type { MateRecord } from '../../../mates/mate';
import type { MateType } from '../../../mates/mateTypes';
import { mateFk, type ResolvedMatePart } from '../../../mates/solver';
import { resolveTopologyOriginOnBackend } from '../connectorTopology';
import { built, finished, noShape, type LowerContext, type LowerOutcome } from './context';
import { normalizeAxis, readVec3Param } from './helpers';

/** `assemblyPart` — clones the wrapped source shape and applies its `at:`. */
export function lowerAssemblyPart(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  const base = ctx.inputs.byKey.shape as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `assembly part shape input is missing or failed.`,
      hint: 'Assembly parts must wrap a successfully lowered source shape.',
    });
    return noShape();
  }
  shape = base.clone();
  const at = (r.metadata as { at?: Vec3Param } | undefined)?.at;
  if (at !== undefined) {
    const [tx, ty, tz] = readVec3Param(at);
    shape = shape.translate(tx, ty, tz);
  }
  return built(shape);
}

/** `assemblyJoint` — validates the joint axis; the shape is part A unchanged. */
export function lowerAssemblyJoint(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const partA = ctx.inputs.byKey.a as OcctBackend | undefined;
  if (!partA) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `assembly joint input 'a' is missing or failed.`,
      hint: 'Assembly joints must reference successfully lowered assembly parts.',
    });
    return noShape();
  }
  // Read joint metadata Vec3 values. Joint frames are now pure numeric
  // tuples (v1 spec deferred joint reactivity). `normalizeAxis`
  // validates that the axis is non-zero; the throw surfaces as a
  // structured diagnostic via the dispatcher's exception path.
  const jointMeta = r.metadata as { origin?: [number, number, number]; axis?: [number, number, number] } | undefined;
  if (jointMeta?.axis !== undefined) {
    normalizeAxis(jointMeta.axis);
  }
  const shape: ShapeBackend = partA.clone();
  return built(shape);
}

/** `assemblyConnect` — placement is resolved at capture time; hand back part A. */
export function lowerAssemblyConnect(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const partA = ctx.inputs.byKey.a as OcctBackend | undefined;
  if (!partA) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `assembly connect input 'a' is missing or failed.`,
      hint: 'Assembly connect records must reference successfully lowered assembly parts.',
    });
    return noShape();
  }
  const shape: ShapeBackend = partA.clone();
  return built(shape);
}

/** Pose value as captured: a single Param, or three for a ball joint. */
type EncodedPose =
  | { kind: 'scalar'; value: Param }
  | { kind: 'ball'; value: [Param, Param, Param] };

type EncodedMate = {
  name: string;
  a: string;
  b: string;
  type: MateType;
  pose?: EncodedPose;
};

/** `[inputKey, backend]` pairs for the `part_*` inputs, in numeric key order. */
type PartEntry = [string, ShapeBackend];

/** Numeric view of an encoded pose map. `Param.evaluated` is updated by the
 *  recompute pipeline (resolveParams walks metadata) before lower is called —
 *  so we just read it; never resolve ParamRefs here. */
function readNumericPoses(encodedPoses: Record<string, EncodedPose>): NumericPoses {
  const numericPoses: NumericPoses = {};
  for (const [name, p] of Object.entries(encodedPoses)) {
    if (p.kind === 'ball') {
      numericPoses[name] = [
        p.value[0].evaluated,
        p.value[1].evaluated,
        p.value[2].evaluated,
      ];
    } else {
      numericPoses[name] = p.value.evaluated;
    }
  }
  return numericPoses;
}

/** Sorted `part_*` inputs. Numeric collation keeps part_10 after part_9. */
function readPartEntries(ctx: LowerContext): PartEntry[] {
  return Object.entries(ctx.inputs.byKey)
    .filter(([key]) => key.startsWith('part_'))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Resolve topology connector origins via each part's already-lowered backend,
 * then build the pure-data `ResolvedMatePart[]` input for `mateFk`. Vec3
 * origins pass through unchanged. `opLabel` prefixes the diagnostics so the
 * two callers keep their own message text.
 */
function resolveMateParts(
  ctx: LowerContext,
  r: FeatureRecord,
  opLabel: 'assemblyModel' | 'solvedAssembly',
  args: {
    partIds: FeatureId[];
    partEntries: PartEntry[];
    connectorsByPartId: Record<FeatureId, readonly Connector[]>;
    records: readonly FeatureRecord[];
    requirePartRecord: boolean;
  },
): ResolvedMatePart[] | undefined {
  const { partIds, partEntries, connectorsByPartId, records, requirePartRecord } = args;
  const resolvedParts: ResolvedMatePart[] = [];
  let topologyResolutionFailed = false;
  for (let i = 0; i < partIds.length; i++) {
    const partId = partIds[i];
    const partRec = records.find((rec) => rec.id === partId);
    if (requirePartRecord && (!partRec || partRec.kind !== 'assemblyPart')) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `${opLabel}: missing or wrong-kind part record '${partId}'.`,
        hint: 'Each partId in metadata.partIds must reference an assemblyPart record.',
      });
      return undefined;
    }
    const partName =
      (partRec!.metadata as { partName?: string } | undefined)?.partName ?? partId;
    const rawConnectors = connectorsByPartId[partId] ?? [];
    if (rawConnectors.length === 0) {
      resolvedParts.push({ id: partId, name: partName, connectors: [] });
      continue;
    }
    const partBackend = partEntries[i][1] as OcctBackend;
    const resolvedConnectors: Connector[] = [];
    for (const c of rawConnectors) {
      if (c.origin.kind === 'vec3') {
        resolvedConnectors.push(c);
        continue;
      }
      try {
        const value = resolveTopologyOriginOnBackend(partBackend, c.origin.query, {
          records,
          consumerId: partId,
        });
        resolvedConnectors.push({
          ...c,
          origin: { kind: 'vec3', value },
        });
      } catch (err) {
        const msg = (err as Error).message;
        ctx.diagnostics.push({
          target: ctx.target,
          code: 'feature.invalid-args',
          featureId: r.id,
          severity: 'error',
          message: `${opLabel}: failed to resolve connector '${c.name}' on part '${partName}' (${msg}).`,
          hint: 'invalid-args.assembly.mate-connector-origin-unresolved — declare the connector with a numeric origin or a topology query that resolves on the lowered shape.',
        });
        topologyResolutionFailed = true;
      }
    }
    if (topologyResolutionFailed) break;
    resolvedParts.push({ id: partId, name: partName, connectors: resolvedConnectors });
  }
  if (topologyResolutionFailed) return undefined;
  return resolvedParts;
}

/** Pose finiteness gate. Capture allows ParamRef poses; if the live ParamTable
 *  resolves one to NaN / +/-Infinity, surface a structured diagnostic instead
 *  of letting `mateFk` produce a degenerate transform. */
function posesAreFinite(
  ctx: LowerContext,
  r: FeatureRecord,
  poses: NumericPoses,
  describe: (name: string, val: number | [number, number, number]) => { message: string; hint: string },
): boolean {
  let ok = true;
  for (const [name, val] of Object.entries(poses)) {
    const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
    if (!finite) {
      const { message, hint } = describe(name, val);
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message,
        hint,
      });
      ok = false;
    }
  }
  return ok;
}

/** `assemblyModel` — SceneBackend counterpart of `solvedAssembly`. */
export function lowerAssemblyModel(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // SceneBackend counterpart of `solvedAssembly`: mate-free model()
  // parts stay at identity, while mate-bearing model() records carry
  // enough metadata for default mate FK. The legacy boolean-union path
  // is gone; consumers that need a fused single-Shape now call
  // Scene.toUnion()/Scene.toCompound() explicitly.
  const partEntries = readPartEntries(ctx);
  if (partEntries.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `assembly model has no part inputs.`,
      hint: 'Call assembly.part(...) at least once before assembly.model().',
    });
    return noShape();
  }
  const meta = r.metadata as {
    assemblyName?: string;
    partIds?: FeatureId[];
    mates?: EncodedMate[];
    couplings?: readonly MateCouplingRecord[];
    connectorsByPartId?: Record<FeatureId, readonly Connector[]>;
  } | undefined;
  const partIds = meta?.partIds ?? [];
  const encodedMates = meta?.mates ?? [];
  const mateCouplings = meta?.couplings ?? [];
  const connectorsByPartId = meta?.connectorsByPartId ?? {};
  if (partEntries.length !== partIds.length) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `assemblyModel: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
      hint: 'Ensure inputs and partIds stay in sync.',
    });
    return noShape();
  }
  const records = ctx.allRecords ?? [];
  const worldT = new Map<FeatureId, Transform>();
  for (const partId of partIds) worldT.set(partId, Transform.identity());

  if (encodedMates.length > 0) {
    const applied = applyModelMateFk(ctx, r, {
      partIds, partEntries, encodedMates, mateCouplings, connectorsByPartId, records, worldT,
    });
    if (!applied) return noShape();
  }

  const sceneParts: SceneBackendPart[] = partEntries.map(([, partShape], i) => {
    const partId = partIds[i];
    const partRec = records.find((rec) => rec.id === partId);
    const partName =
      (partRec?.metadata as { partName?: string } | undefined)?.partName ?? partId;
    const color = partRec ? lookupSourceColor(partRec, records) : undefined;
    const material = partRec ? lookupSourceMaterial(partRec, records) : undefined;
    return {
      name: partName,
      shape: partShape as OcctBackend,
      worldTransform: worldT.get(partId) ?? Transform.identity(),
      ...(color !== undefined ? { color } : {}),
      ...(material !== undefined ? { material } : {}),
    };
  });
  const sceneBackend: SceneBackend = {
    target: ctx.target,
    assemblyName: meta?.assemblyName ?? 'unnamed',
    parts: sceneParts,
    _kind: 'scene',
  };
  // Early-return: SceneBackend is not a ShapeBackend, so the post-hoc
  // r.transforms loop cannot apply. Mirror the solvedAssembly boundary
  // cast (Task 4); Task 7 widens the dispatch signature.
  return finished(sceneBackend as unknown as ShapeBackend);
}

/** Default mate FK for a mate-bearing `model()` record; writes the resolved
 *  world transforms into `worldT`. False once a diagnostic has been pushed. */
function applyModelMateFk(
  ctx: LowerContext,
  r: FeatureRecord,
  args: {
    partIds: FeatureId[];
    partEntries: PartEntry[];
    encodedMates: EncodedMate[];
    mateCouplings: readonly MateCouplingRecord[];
    connectorsByPartId: Record<FeatureId, readonly Connector[]>;
    records: readonly FeatureRecord[];
    worldT: Map<FeatureId, Transform>;
  },
): boolean {
  const { partIds, partEntries, encodedMates, mateCouplings, connectorsByPartId, records, worldT } = args;
  const matePoses: NumericPoses = {};
  for (const m of encodedMates) {
    if (m.pose === undefined) continue;
    if (m.pose.kind === 'ball') {
      matePoses[m.name] = [
        m.pose.value[0].evaluated,
        m.pose.value[1].evaluated,
        m.pose.value[2].evaluated,
      ];
    } else {
      matePoses[m.name] = m.pose.value.evaluated;
    }
  }

  const finite = posesAreFinite(ctx, r, matePoses, (name, val) => ({
    message: `assemblyModel: mate pose '${name}' is not finite (${JSON.stringify(val)}).`,
    hint: `kernel-failed.assemblyModel.bad-pose — mate pose value for ${name} is not finite.`,
  }));
  if (!finite) return false;

  const resolvedParts = resolveMateParts(ctx, r, 'assemblyModel', {
    partIds, partEntries, connectorsByPartId, records, requirePartRecord: true,
  });
  if (!resolvedParts) return false;

  const mates: MateRecord[] = encodedMates.map((m) => ({
    name: m.name,
    a: m.a,
    b: m.b,
    type: m.type,
  }));
  const expandedMatePoses = expandCoupledPoses(mates, mateCouplings, matePoses);
  const mateWorldT = mateFk(resolvedParts, mates, expandedMatePoses);
  for (const [partId, mT] of mateWorldT) {
    if (partId in connectorsByPartId) worldT.set(partId, mT);
  }
  return true;
}

/** Defaulted view of a `solvedAssembly` record's metadata. */
function readSolvedAssemblyMeta(r: FeatureRecord): {
  partIds: FeatureId[];
  jointIds: FeatureId[];
  encodedPoses: Record<string, EncodedPose>;
  encodedMates: EncodedMate[];
  mateCouplings: readonly MateCouplingRecord[];
  connectorsByPartId: Record<FeatureId, readonly Connector[]>;
} {
  const meta = r.metadata as {
    assemblyName?: string;
    partIds?: FeatureId[];
    jointIds?: FeatureId[];
    poses?: Record<string, EncodedPose>;
    mates?: EncodedMate[];
    couplings?: readonly MateCouplingRecord[];
    connectorsByPartId?: Record<FeatureId, readonly Connector[]>;
  } | undefined;
  return {
    partIds: meta?.partIds ?? [],
    jointIds: meta?.jointIds ?? [],
    encodedPoses: meta?.poses ?? {},
    encodedMates: meta?.mates ?? [],
    mateCouplings: meta?.couplings ?? [],
    connectorsByPartId: meta?.connectorsByPartId ?? {},
  };
}

/**
 * `solvedAssembly` — joint-tree FK, then mate FK (which wins per part), then
 * a SceneBackend carrying each part in its local frame.
 */
export function lowerSolvedAssembly(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // 1. Read poses from metadata. Param.evaluated is updated by the
  //    recompute pipeline (resolveParams walks metadata) before lower
  //    is called — so we just read it; never resolve ParamRefs here.
  const {
    partIds, jointIds, encodedPoses, encodedMates, mateCouplings, connectorsByPartId,
  } = readSolvedAssemblyMeta(r);

  const partEntries = readPartEntries(ctx);
  if (partEntries.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `solvedAssembly has no part inputs.`,
      hint: 'Call assembly.part(...) at least once before assembly.solvedModel(poses).',
    });
    return noShape();
  }

  // 2. Resolve poses to numeric values via Param.evaluated.
  const numericPoses = readNumericPoses(encodedPoses);

  // 3. Reconstruct AssemblyPartStored / AssemblyJointStored stubs from
  //    FeatureRecords. forwardKinematics only reads .id on parts and
  //    {id, name, kind, parentPartId, childPartId, axis, origin} on
  //    joints — so we build the minimal viable shape.
  const records = ctx.allRecords ?? [];
  const parts = reconstructParts(ctx, r, partIds, records);
  if (!parts) return noShape();
  const joints = reconstructJoints(ctx, r, jointIds, records);
  if (!joints) return noShape();
  if (!jointPosesValid(ctx, r, joints, numericPoses)) return noShape();

  // 4. Run body-tree forward kinematics. Throws KernelError on graph
  //    issues (multi-parent, cycles); the dispatcher's exception path
  //    surfaces these as structured diagnostics.
  const worldT = forwardKinematics(parts, joints, numericPoses);

  // 4b. v0.6 T17: when the assembly declares mates, run `mateFk` over
  //     the captured mate metadata. The mate-derived transforms WIN
  //     over the v0.5 joint-derived transforms per part — parts that
  //     participate in a mate graph are placed in LOCAL frames at
  //     authoring time, and the mate solver is the source of truth for
  //     their world position. Without this step the lowerer would emit
  //     identity transforms for purely-mated parts and the rendered
  //     output (compound, STL, STEP) would sit at the local origin
  //     even though the capture-time Scene's `worldTransform` (T16) is
  //     correct.
  if (encodedMates.length > 0 && partEntries.length === partIds.length) {
    const applied = applySolvedMateFk(ctx, r, {
      partIds, partEntries, encodedMates, mateCouplings, connectorsByPartId, records,
      numericPoses, worldT,
    });
    if (!applied) return noShape();
  }

  // 5. Build a SceneBackend (no boolean union — each part stays in its
  //    LOCAL frame and the FK-derived worldTransform travels with it).
  //    This preserves per-part identity (color, name, topology) for
  //    downstream meshing / STEP-compound export. The legacy union
  //    path is gone; consumers that needed a fused single-Shape now
  //    call Scene.toUnion() / Scene.toCompound() explicitly.
  if (partEntries.length !== partIds.length) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `solvedAssembly: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
      hint: 'Ensure inputs and partIds stay in sync.',
    });
    return noShape();
  }
  const sceneParts: SceneBackendPart[] = partEntries.map(([, partShape], i) => {
    const partId = partIds[i];
    const T = worldT.get(partId);
    if (!T) {
      throw new KernelError(
        'feature.invalid-args',
        `solvedAssembly: forwardKinematics produced no transform for part '${partId}'.`,
        r.id,
        'invalid-args.solve.internal — please file a bug.',
      );
    }
    const partRec = records.find((rec) => rec.id === partId)!;
    const partMeta = partRec.metadata as { partName?: string } | undefined;
    const partName = partMeta?.partName ?? partId;
    const color = lookupSourceColor(partRec, records);
    const material = lookupSourceMaterial(partRec, records);
    return {
      name: partName,
      shape: partShape as OcctBackend,
      worldTransform: T,
      ...(color !== undefined ? { color } : {}),
      ...(material !== undefined ? { material } : {}),
    };
  });
  const assemblyName =
    (r.metadata as { assemblyName?: string } | undefined)?.assemblyName ?? 'unnamed';
  const sceneBackend: SceneBackend = {
    target: ctx.target,
    assemblyName,
    parts: sceneParts,
    _kind: 'scene',
  };
  // Early-return: SceneBackend is not a ShapeBackend, so the post-hoc
  // `r.transforms` loop cannot be applied to it. Task 7 widens the
  // dispatch signature to LoweringResult; today we cast cleanly at
  // the boundary so existing ShapeBackend-typed call sites (recompute
  // engine's shapes map, meshing) keep compiling. Consumers that need
  // the SceneBackend at runtime use isSceneBackend(...) to discriminate.
  return finished(sceneBackend as unknown as ShapeBackend);
}

/** Minimal `AssemblyPartStored` stubs for `forwardKinematics`. */
function reconstructParts(
  ctx: LowerContext,
  r: FeatureRecord,
  partIds: FeatureId[],
  records: readonly FeatureRecord[],
): AssemblyPartStored[] | undefined {
  const parts: AssemblyPartStored[] = [];
  for (const partId of partIds) {
    const partRec = records.find(rec => rec.id === partId);
    if (!partRec || partRec.kind !== 'assemblyPart') {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `solvedAssembly: missing or wrong-kind part record '${partId}'.`,
        hint: 'Each partId in metadata.partIds must reference an assemblyPart record.',
      });
      return undefined;
    }
    parts.push({ id: partRec.id } as AssemblyPartStored);
  }
  return parts;
}

/** Minimal `AssemblyJointStored` stubs for `forwardKinematics`. */
function reconstructJoints(
  ctx: LowerContext,
  r: FeatureRecord,
  jointIds: FeatureId[],
  records: readonly FeatureRecord[],
): AssemblyJointStored[] | undefined {
  const joints: AssemblyJointStored[] = [];
  for (const jointId of jointIds) {
    const jointRec = records.find(rec => rec.id === jointId);
    if (!jointRec || jointRec.kind !== 'assemblyJoint') {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `solvedAssembly: missing or wrong-kind joint record '${jointId}'.`,
        hint: 'Each jointId in metadata.jointIds must reference an assemblyJoint record.',
      });
      return undefined;
    }
    const jm = jointRec.metadata as {
      jointName: string;
      jointKind: 'revolute' | 'prismatic' | 'fixed' | 'ball';
      axis?: Vec3;
      origin: Vec3;
    };
    const aRef = jointRec.inputs.a as { id: FeatureId } | undefined;
    const bRef = jointRec.inputs.b as { id: FeatureId } | undefined;
    if (!aRef || !bRef) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `solvedAssembly: joint '${jointId}' is missing parent or child part input.`,
        hint: 'Joint records must have a/b inputs referencing parent and child parts.',
      });
      return undefined;
    }
    joints.push({
      id: jointRec.id,
      name: jm.jointName,
      kind: jm.jointKind,
      parentPartId: aRef.id,
      childPartId: bRef.id,
      ...(jm.axis !== undefined ? { axis: jm.axis } : {}),
      origin: jm.origin,
    });
  }
  return joints;
}

/**
 * Recompute-time pose validation. Capture allows ParamRef-bearing partial pose
 * maps; the lowerer must emit structured diagnostics when (a) a non-fixed
 * joint has no pose value or (b) a pose resolved to a non-finite number
 * (NaN / +/-Infinity).
 */
function jointPosesValid(
  ctx: LowerContext,
  r: FeatureRecord,
  joints: AssemblyJointStored[],
  numericPoses: NumericPoses,
): boolean {
  for (const j of joints) {
    if (j.kind !== 'fixed' && numericPoses[j.name] === undefined) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `solvedAssembly: joint '${j.name}' (${j.kind}) requires a pose value.`,
        hint: `invalid-args.solvedModel.missing-pose — joint ${j.name} requires a pose value.`,
      });
      return false;
    }
  }
  for (const [name, val] of Object.entries(numericPoses)) {
    const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
    if (!finite) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message: `solvedAssembly: pose '${name}' is not finite (${JSON.stringify(val)}).`,
        hint: `kernel-failed.solvedModel.bad-pose — pose value for ${name} is not finite.`,
      });
      return false;
    }
  }
  return true;
}

/** Mate FK for `solvedAssembly`; mate-derived transforms overwrite the
 *  joint-derived ones in `worldT`. False once a diagnostic has been pushed. */
function applySolvedMateFk(
  ctx: LowerContext,
  r: FeatureRecord,
  args: {
    partIds: FeatureId[];
    partEntries: PartEntry[];
    encodedMates: EncodedMate[];
    mateCouplings: readonly MateCouplingRecord[];
    connectorsByPartId: Record<FeatureId, readonly Connector[]>;
    records: readonly FeatureRecord[];
    numericPoses: NumericPoses;
    worldT: Map<FeatureId, Transform>;
  },
): boolean {
  const {
    partIds, partEntries, encodedMates, mateCouplings, connectorsByPartId, records,
    numericPoses, worldT,
  } = args;
  // Resolve mate poses the same way joint poses are: Param.evaluated
  // already reflects the live ParamTable value (resolveParams walked
  // metadata before lower was called).
  const matePoses: NumericPoses = {};
  for (const m of encodedMates) {
    const override = numericPoses[m.name];
    if (override !== undefined) {
      matePoses[m.name] = override;
    } else if (m.pose === undefined) {
      continue;
    } else if (m.pose.kind === 'ball') {
      matePoses[m.name] = [
        m.pose.value[0].evaluated,
        m.pose.value[1].evaluated,
        m.pose.value[2].evaluated,
      ];
    } else {
      matePoses[m.name] = m.pose.value.evaluated;
    }
  }
  // Mate-pose finiteness check (mirror of the joint-pose check above).
  const finite = posesAreFinite(ctx, r, matePoses, (name, val) => ({
    message: `solvedAssembly: mate pose '${name}' is not finite (${JSON.stringify(val)}).`,
    hint: `kernel-failed.solvedModel.bad-pose — mate pose value for ${name} is not finite.`,
  }));
  if (!finite) return false;

  const resolvedParts = resolveMateParts(ctx, r, 'solvedAssembly', {
    partIds, partEntries, connectorsByPartId, records, requirePartRecord: false,
  });
  if (!resolvedParts) return false;

  // mateFk is pure — KernelErrors propagate out and surface via the
  // dispatcher's exception path as structured diagnostics, same as
  // forwardKinematics' graph errors.
  const mates: MateRecord[] = encodedMates.map((m) => ({
    name: m.name,
    a: m.a,
    b: m.b,
    type: m.type,
  }));
  const expandedMatePoses = expandCoupledPoses(mates, mateCouplings, matePoses);
  const mateWorldT = mateFk(resolvedParts, mates, expandedMatePoses);
  // Merge: mate-derived transforms WIN over joint-derived transforms.
  // Disconnected-from-mates parts retain their joint-FK transform (or
  // identity if no joint either). This is the explicit precedence
  // documented in `Assembly.solvedModel`'s JSDoc.
  //
  // `mateFk` always populates a transform for every part it was given
  // (disconnected parts default to identity). To keep that identity
  // from clobbering a v0.5 joint-tree transform when the SAME part is
  // both on a joint tree AND in the mate-parts list but NOT actually
  // referenced by any mate, we only overwrite when the part has at
  // least one mate-connector entry (i.e. it's a real participant in
  // the mate graph). Mate participants are exactly the parts whose
  // FeatureId appears in `connectorsByPartId`.
  for (const [partId, mT] of mateWorldT) {
    if (partId in connectorsByPartId) {
      warnPlacementIgnoredByMateFk(ctx, partId, records);
      worldT.set(partId, mT);
    }
  }
  return true;
}

/**
 * Exp-B four-bolt-flange surfaced this: when a part has an authored `at:` AND
 * is positioned by mate FK, the `at:` is silently dropped — the agent only
 * learns about it 2 reasoning steps later via a Gate 2 axis-mismatch. Emit an
 * info-level diagnostic so the conflict surfaces at the override point.
 */
function warnPlacementIgnoredByMateFk(
  ctx: LowerContext,
  partId: FeatureId,
  records: readonly FeatureRecord[],
): void {
  const partRec = records.find((rec) => rec.id === partId);
  // `resolvePartPlacement` defaults `at` to [0,0,0] even when the
  // user passed nothing — so we can't just check for presence.
  // Only fire the diagnostic when `at` is a non-trivial vec3
  // (any coord magnitude > 1e-6 mm) AND was authored by the user
  // (the placedBy/connect path leaves `at` synthesized from the
  // connector pair — that's not a conflict, it's how connect
  // was designed; skip those).
  const partMeta = partRec?.metadata as
    | { at?: { x?: { evaluated?: number }; y?: { evaluated?: number }; z?: { evaluated?: number } };
        placedBy?: unknown;
        partName?: string }
    | undefined;
  const partAt = partMeta?.at;
  const ax = partAt?.x?.evaluated ?? 0;
  const ay = partAt?.y?.evaluated ?? 0;
  const az = partAt?.z?.evaluated ?? 0;
  const atIsNonTrivial = Math.abs(ax) + Math.abs(ay) + Math.abs(az) > 1e-6;
  const placedByConnect = partMeta?.placedBy !== undefined;
  if (partRec && atIsNonTrivial && !placedByConnect) {
    const partName = partMeta?.partName ?? partId;
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'assembly.placement-ignored-by-mate-fk',
      featureId: partRec.id,
      severity: 'info',
      message: `assembly.part '${partName}' has both an authored \`at:\` placement (${ax.toFixed(2)}, ${ay.toFixed(2)}, ${az.toFixed(2)}) AND a mate-FK-derived pose; the \`at:\` is being ignored.`,
      hint: "Remove the `at:` and let the mate decide the pose, or place the part's local frame so its mate connector sits at the origin (mate FK composes parent_world ∘ trans(parent_conn) ∘ joint ∘ trans(-child_conn)).",
    });
  }
}

/** `assemblyExport` — Scene.toCompound() / Scene.toUnion(). */
export function lowerAssemblyExport(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  // Backs `Scene.toCompound()` and `Scene.toUnion()`. Reads the upstream
  // SceneBackend (produced by `solvedAssembly` / `assemblyModel`),
  // applies each part's worldTransform to its local-frame shape, then
  // either:
  //   - 'compound': groups the transformed parts into a TopoDS_Compound
  //     via replicad.makeCompound (lossless on per-part identity).
  //   - 'union'   : boolean-fuses them into a single solid (lossy on
  //     color, name, metadata — documented antipattern).
  const sceneInput = ctx.inputs.byKey.scene as unknown;
  if (!isSceneBackend(sceneInput)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `assemblyExport: input 'scene' is not a SceneBackend (upstream solvedAssembly / assemblyModel must lower to a SceneBackend).`,
      hint: 'Construct via Scene.toCompound() / Scene.toUnion() on a Scene returned by Assembly.model() / Assembly.solvedModel().',
    });
    return noShape();
  }
  const meta = r.metadata as { op?: 'compound' | 'union' } | undefined;
  const op = meta?.op;
  if (op !== 'compound' && op !== 'union') {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `assemblyExport: metadata.op must be 'compound' or 'union'; got ${JSON.stringify(op)}.`,
      hint: 'Use Scene.toCompound() or Scene.toUnion() rather than constructing the feature directly.',
    });
    return noShape();
  }
  const sceneBackend = sceneInput as SceneBackend;
  if (sceneBackend.parts.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `assemblyExport: scene has no parts.`,
      hint: 'Call assembly.part(...) at least once before exporting the scene.',
    });
    return noShape();
  }
  // Apply each part's worldTransform to its local-frame shape. Parts are
  // visited in scene-declaration order so both compound and union are
  // deterministic.
  //
  // We clone before applyTransform because replicad's translate()/rotate()
  // mutate-and-destroy the source OCCT handle. The recompute engine caches
  // the SceneBackend across `params.update` runs, so without a fresh clone
  // the second recompute hits "This object has been deleted." on any part
  // with a non-identity worldTransform. Identity transforms early-return
  // `this` from applyTransform, which is why the yaw=0 path historically
  // worked but ball-joint poses broke.
  const transformed: OcctBackend[] = sceneBackend.parts.map((p: SceneBackendPart) =>
    (p.shape as OcctBackend).clone().applyTransform(p.worldTransform),
  );
  if (op === 'compound') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replicadShapes = transformed.map((b) => (b as OcctBackend).getReplicadShape() as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compound = replicad.makeCompound(replicadShapes) as any;
    shape = new OcctBackend(compound);
    return built(shape);
  }
  // op === 'union': fold-fuse from the first part. Mirrors the
  // pre-Task-4 union loop, just consumed from a SceneBackend instead.
  let fused: OcctBackend = transformed[0];
  for (let i = 1; i < transformed.length; i++) {
    fused = fused.union(transformed[i]) as OcctBackend;
  }
  shape = fused;
  return built(shape);
}
