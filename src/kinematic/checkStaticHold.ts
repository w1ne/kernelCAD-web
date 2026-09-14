// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/checkStaticHold.ts
//
// Static-hold gravitational torque/force check. For each evaluated
// actuated joint (revolute/prismatic, `actuator` declared), computes the
// gravitational torque (revolute) or force (prismatic) that the actuator
// must supply to hold the assembly still against gravity at a sampled pose,
// and compares it against the joint's declared actuator capacity.
//
// Real mass properties: each part's local mass/CoM is computed once from
// its lowered BREP geometry (OCCT `BRepGProp::VolumeProperties` via
// `ShapeBackend.massProperties(density)`), density from the part's declared
// `density` / named `material` (URDF/SDF convention — defaults to 1000
// water when neither is declared). The per-pose world CoM is then
// `worldTransform.point(localCoM)` — cheap pure-FK re-evaluation per
// sample, no re-lowering.
//
// Downstream mass at a joint = every part reachable from the joint's child
// part through the joint graph (`arm.__joints()`) or a rigid `connect`
// chain (`AssemblyPartStored.connectParentId`) — the load the actuator
// must actually carry.
//
// v1 assumptions:
//   - rigid links (no deflection contribution to the moment arm);
//   - a prismatic actuator's holding force is the downstream weight's
//     component along the joint axis only (no off-axis moment reaction);
//   - gravity is a single uniform world-frame vector (no distributed load
//     cases — pair with `checkLoadCapacity` for applied external loads).

import type { Assembly, AssemblyJointStored, AssemblyPartStored } from '../modeling/capture/assembly';
import { forwardKinematics, type NumericPoses as FkNumericPoses } from '../modeling/capture/forwardKinematics';
import type { FeatureId } from '../shared/intent/types';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { createOcctLowerer } from '../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { isSceneBackend } from '../kernel/backends/sceneBackend';
import { tryResolveMaterial } from '../modeling/properties/materialLibrary';
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '../shared/diagnostics/registry';
import { Transform } from '../shared/runtime/se3';
import type {
  KinematicDiagnostic,
  NumericPoses,
  StaticHoldJointResult,
  StaticHoldOpts,
  StaticHoldResult,
} from './types';

/** Local readonly-triple used for all internal vector math — matches
 *  `Transform.point`/`axisDir`'s return shape, which is stricter (readonly)
 *  than the capture-side mutable `Vec3` tuple used on opts/joint fields. */
type V3 = readonly [number, number, number];

const DEFAULT_GRAVITY: V3 = [0, 0, -9.81];
const DEFAULT_MARGIN_PCT = 20;
const DEFAULT_RANGE_SAMPLES = 9;
const DEFAULT_REVOLUTE_LIMITS: readonly [number, number] = [-180, 180];
const DEFAULT_PRISMATIC_LIMITS: readonly [number, number] = [0, 100];
const DEFAULT_DENSITY = 1000;
const MM_TO_M = 1e-3;

interface PartMassLocal {
  readonly mass: number;
  readonly comLocalMm: V3;
}

/**
 * Static-hold check. Evaluates every actuated joint with a declared
 * `actuator` (or the single `opts.joint` named) across a pose grid (or
 * explicit `opts.pose`), computing the worst-case gravitational holding
 * torque/force and comparing against the declared actuator capacity.
 *
 * Emits:
 *   - `kinematic.static-hold.no-actuator-declared` (error) for a
 *     joint named/selected that has no `actuator` declaration.
 *   - `assembly.joint.static-hold.margin-low` (warn) when the worst-pose
 *     margin falls below `opts.minTorqueMarginPct` (default 20%) but the
 *     actuator is not exceeded.
 *   - `assembly.joint.static-hold.exceeded` (error) when the worst-pose
 *     required torque/force exceeds the declared actuator capacity.
 *
 * Every diagnostic carries `source: 'local'`. Local in-process compute —
 * one OCCT lowering pass total (mass properties are geometry-only, so they
 * don't vary per sampled pose; only the FK transform does).
 *
 * @see DIAGNOSTIC_REGISTRY['assembly.joint.static-hold.margin-low']
 * @see DIAGNOSTIC_REGISTRY['assembly.joint.static-hold.exceeded']
 * @see DIAGNOSTIC_REGISTRY['kinematic.static-hold.no-actuator-declared']
 */
export async function checkStaticHold(
  arm: Assembly,
  opts?: StaticHoldOpts,
): Promise<StaticHoldResult> {
  const diagnostics: KinematicDiagnostic[] = [];
  const allJoints = arm.__joints();
  const parts = arm.__parts();

  if (parts.length === 0 || allJoints.length === 0) {
    return { ok: true, joints: [], posesSampled: 0, diagnostics, source: 'local' };
  }

  const targetJoints = (opts?.joint ? allJoints.filter((j) => j.name === opts.joint) : allJoints)
    .filter((j) => j.kind === 'revolute' || j.kind === 'prismatic');

  const evaluable: AssemblyJointStored[] = [];
  for (const j of targetJoints) {
    if (j.actuator === undefined) {
      // Only fire the no-actuator diagnostic when the joint was explicitly
      // named, or when NO joint qualifies at all (an assembly with zero
      // actuated joints is a vacuous-pass otherwise, mirroring K9's
      // no-coverage convention).
      if (opts?.joint !== undefined) {
        diagnostics.push(
          buildDiag(
            'kinematic.static-hold.no-actuator-declared',
            'error',
            `Joint '${j.name}' has no declared actuator. Add actuator: { torqueNm } (revolute) or { forceN } (prismatic) to arm.revolute(...)/arm.prismatic(...).`,
            j.name,
          ),
        );
      }
      continue;
    }
    evaluable.push(j);
  }

  if (evaluable.length === 0) {
    if (targetJoints.length > 0 && opts?.joint === undefined) {
      diagnostics.push(
        buildDiag(
          'kinematic.static-hold.no-actuator-declared',
          'error',
          `checkStaticHold found ${targetJoints.length} revolute/prismatic joint(s) but none declares an actuator. Add actuator: { torqueNm } / { forceN } to at least one joint.`,
        ),
      );
    }
    return { ok: diagnostics.length === 0, joints: [], posesSampled: 0, diagnostics, source: 'local' };
  }

  // Lower once — geometry (local BREP + local mass) is pose-independent;
  // only the per-part world transform varies across sampled poses.
  await initOcct();
  const zeroPoses: FkNumericPoses = {};
  for (const j of allJoints) {
    if (j.kind === 'fixed') continue;
    zeroPoses[j.name] = j.kind === 'ball' ? [0, 0, 0] : 0;
  }
  const scene = await arm.solvedModel(zeroPoses, { validate: 'off' });
  const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
  const result = await engine.run(arm.__session().getRecords(), {
    paramTable: arm.__session().paramTable,
    gatedFeatureNames: arm.__session().gatedFeatureNames,
  });
  const sourceId = scene.__sourceFeatureId();
  const lowered = sourceId !== undefined ? result.shapes.get(sourceId) : undefined;
  if (!lowered || !isSceneBackend(lowered)) {
    return { ok: true, joints: [], posesSampled: 0, diagnostics, source: 'local' };
  }

  const partByName = new Map(parts.map((p) => [p.name, p]));
  const massByPartId = new Map<FeatureId, PartMassLocal>();
  for (const scenePart of lowered.parts) {
    const part = partByName.get(scenePart.name);
    if (part === undefined) continue;
    const density = resolvePartDensity(part);
    const mp = scenePart.shape.massProperties(density);
    massByPartId.set(part.id, { mass: mp.mass, comLocalMm: mp.com });
  }

  const gravity = opts?.gravity ?? DEFAULT_GRAVITY;
  const marginThreshold = opts?.minTorqueMarginPct ?? DEFAULT_MARGIN_PCT;
  const rangeSamples = Math.max(2, opts?.rangeSamples ?? DEFAULT_RANGE_SAMPLES);

  const jointResults: StaticHoldJointResult[] = [];
  let totalPosesSampled = 0;

  for (const joint of evaluable) {
    const poses = enumerateHoldPoses(joint, allJoints, opts?.pose, rangeSamples);
    totalPosesSampled += poses.length;
    const downstream = downstreamPartIds(parts, allJoints, joint.childPartId);

    let worstRequired = -Infinity;
    let worstPose: NumericPoses = poses[0] ?? {};
    for (const pose of poses) {
      const fullPose: FkNumericPoses = { ...zeroPoses, ...pose };
      const worldT = forwardKinematics(parts, allJoints, fullPose);
      const parentT = worldT.get(joint.parentPartId) ?? Transform.identity();
      const axisWorld = normalize(parentT.axisDir(joint.axis!));
      const originWorldM = scaleVec(parentT.point(joint.origin), MM_TO_M);

      if (joint.kind === 'revolute') {
        let momentSum: V3 = [0, 0, 0];
        for (const partId of downstream) {
          const massLocal = massByPartId.get(partId);
          if (!massLocal) continue;
          const partWorldT = worldT.get(partId) ?? Transform.identity();
          const comWorldM = scaleVec(partWorldT.point(massLocal.comLocalMm), MM_TO_M);
          const rM = subVec(comWorldM, originWorldM);
          const forceN = scaleVec(gravity, massLocal.mass);
          momentSum = addVec(momentSum, cross(rM, forceN));
        }
        const required = Math.abs(dot(momentSum, axisWorld));
        if (required > worstRequired) {
          worstRequired = required;
          worstPose = pose;
        }
      } else {
        let totalForce: V3 = [0, 0, 0];
        for (const partId of downstream) {
          const massLocal = massByPartId.get(partId);
          if (!massLocal) continue;
          totalForce = addVec(totalForce, scaleVec(gravity, massLocal.mass));
        }
        const required = Math.abs(dot(totalForce, axisWorld));
        if (required > worstRequired) {
          worstRequired = required;
          worstPose = pose;
        }
      }
    }
    if (worstRequired === -Infinity) worstRequired = 0;

    const capacity = joint.kind === 'revolute'
      ? joint.actuator!.torqueNm ?? 0
      : joint.actuator!.forceN ?? 0;
    const marginPct = capacity > 0
      ? ((capacity - worstRequired) / capacity) * 100
      : (worstRequired > 0 ? -Infinity : 100);

    jointResults.push({
      jointName: joint.name,
      kind: joint.kind as 'revolute' | 'prismatic',
      actuatorCapacity: capacity,
      worstRequired,
      marginPct,
      worstPose,
    });

    const unit = joint.kind === 'revolute' ? 'N·m' : 'N';
    if (worstRequired > capacity) {
      diagnostics.push(
        buildDiag(
          'assembly.joint.static-hold.exceeded',
          'error',
          `Joint '${joint.name}' requires ${worstRequired.toFixed(3)} ${unit} to hold the assembly at its worst sampled pose, exceeding the declared actuator capacity of ${capacity.toFixed(3)} ${unit}. Increase the actuator ${joint.kind === 'revolute' ? 'torque' : 'force'} to at least ${worstRequired.toFixed(3)} ${unit}, or shorten the downstream link length / reduce its mass.`,
          joint.name,
        ),
      );
    } else if (marginPct < marginThreshold) {
      diagnostics.push(
        buildDiag(
          'assembly.joint.static-hold.margin-low',
          'warn',
          `Joint '${joint.name}' holds at its worst sampled pose with only ${marginPct.toFixed(1)}% margin (required ${worstRequired.toFixed(3)} ${unit} vs actuator capacity ${capacity.toFixed(3)} ${unit}), below the ${marginThreshold}% floor. Increase the actuator ${joint.kind === 'revolute' ? 'torque' : 'force'} to X = ${(worstRequired / (1 - marginThreshold / 100)).toFixed(3)} ${unit} for the desired margin, or shorten the downstream link.`,
          joint.name,
        ),
      );
    }
  }

  const ok = jointResults.every((j) => j.worstRequired <= j.actuatorCapacity);
  return { ok, joints: jointResults, posesSampled: totalPosesSampled, diagnostics, source: 'local' };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers.
// ─────────────────────────────────────────────────────────────────────────

function resolvePartDensity(part: AssemblyPartStored): number {
  if (part.density !== undefined) return part.density;
  if (part.material !== undefined) {
    const resolved = tryResolveMaterial(part.material);
    if (resolved.ok) return resolved.material.density;
  }
  return DEFAULT_DENSITY;
}

function downstreamPartIds(
  parts: readonly AssemblyPartStored[],
  joints: readonly AssemblyJointStored[],
  rootPartId: FeatureId,
): Set<FeatureId> {
  const childrenByParent = new Map<FeatureId, FeatureId[]>();
  const addEdge = (parent: FeatureId, child: FeatureId): void => {
    const list = childrenByParent.get(parent);
    if (list) list.push(child);
    else childrenByParent.set(parent, [child]);
  };
  for (const j of joints) addEdge(j.parentPartId, j.childPartId);
  for (const p of parts) {
    if (p.connectParentId !== undefined) addEdge(p.connectParentId, p.id);
  }

  const visited = new Set<FeatureId>([rootPartId]);
  const stack: FeatureId[] = [rootPartId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const child of childrenByParent.get(cur) ?? []) {
      if (!visited.has(child)) {
        visited.add(child);
        stack.push(child);
      }
    }
  }
  return visited;
}

function enumerateHoldPoses(
  joint: AssemblyJointStored,
  allJoints: readonly AssemblyJointStored[],
  explicitPose: NumericPoses | ReadonlyArray<NumericPoses> | undefined,
  rangeSamples: number,
): NumericPoses[] {
  if (explicitPose !== undefined) {
    if (Array.isArray(explicitPose)) {
      return (explicitPose as ReadonlyArray<NumericPoses>).map((p) => ({ ...p }));
    }
    return [{ ...(explicitPose as NumericPoses) }];
  }
  void allJoints;
  const [lo, hi] = joint.kind === 'revolute'
    ? joint.limitsDeg ?? DEFAULT_REVOLUTE_LIMITS
    : joint.limitsMm ?? DEFAULT_PRISMATIC_LIMITS;
  const poses: NumericPoses[] = [];
  for (let i = 0; i < rangeSamples; i++) {
    const t = rangeSamples === 1 ? 0 : i / (rangeSamples - 1);
    poses.push({ [joint.name]: lo + t * (hi - lo) });
  }
  return poses;
}

function buildDiag(
  code: DiagnosticCode,
  severity: 'info' | 'warn' | 'error',
  message: string,
  element?: string,
): KinematicDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity,
    message,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
    ...(element !== undefined ? { element } : {}),
  };
}

function normalize(v: V3): V3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}
function scaleVec(v: V3, s: number): V3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}
function subVec(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function addVec(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
