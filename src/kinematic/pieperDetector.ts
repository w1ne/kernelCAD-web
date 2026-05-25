// src/kinematic/pieperDetector.ts
//
// Classifier for the closed-form-analytical-IK condition: a serial open
// chain ending at the tip has exactly six revolute DOF with the last three
// joint axes intersecting at a common point (the wrist center). The
// dispatcher uses this signal to route between the fast closed-form path
// and the general DLS-Jacobian numeric fallback.
//
// Cache: keyed by stable topology hash so repeated calls on the same chain
// short-circuit. Hash includes joint name / kind / parent / child / axis.

import type { Assembly, AssemblyJointStored } from '../modeling/capture/assembly';
import { forwardKinematics } from '../modeling/capture/forwardKinematics';
import type { FeatureId } from '../shared/intent/types';
import type { Vec3 } from '../shared/runtime/se3';

const TOLERANCE_INTERSECT_MM = 1e-3;

export type PieperDetectorResult =
  | {
      readonly matches: true;
      readonly wristCenterWorld: Vec3;
      /** Part name whose origin coincides with the wrist center under the
       *  identity pose (last shared joint origin in world coords). */
      readonly wristCenterPart: string;
      readonly chainHash: string;
    }
  | {
      readonly matches: false;
      readonly reason:
        | 'wrong-dof-count'
        | 'last-three-axes-do-not-intersect'
        | 'mixed-joint-types'
        | 'tip-not-found';
      readonly chainHash: string;
    };

const cache = new Map<string, PieperDetectorResult>();

/**
 * Walk from the tip back to the root collecting revolute joints; classify the
 * chain by length and by whether the last three axes intersect at a common
 * point under the identity pose.
 */
export function pieperDetector(arm: Assembly, tipLink: string): PieperDetectorResult {
  const hash = `${arm.name ?? ''}|${topologyHash(arm)}|${tipLink}`;
  const cached = cache.get(hash);
  if (cached) return cached;

  const parts = arm.__parts();
  const joints = arm.__joints();
  const tipPart = parts.find((p) => p.name === tipLink);
  if (!tipPart) {
    const r = { matches: false as const, reason: 'tip-not-found' as const, chainHash: hash };
    cache.set(hash, r);
    return r;
  }

  // Walk parent links from tip to root; collect revolute joints in tip-to-root
  // order, then reverse so chain[0] is the proximal joint.
  const chain = collectChain(parts, joints, tipPart.id);
  if (chain === null) {
    const r = { matches: false as const, reason: 'mixed-joint-types' as const, chainHash: hash };
    cache.set(hash, r);
    return r;
  }
  chain.reverse();

  if (chain.length !== 6) {
    const r = { matches: false as const, reason: 'wrong-dof-count' as const, chainHash: hash };
    cache.set(hash, r);
    return r;
  }

  // Compute the last three axes in WORLD coordinates under the identity pose.
  // For each joint, the axis lives in its parent part's local frame, so
  // axisWorld = R(world_parent) · axisLocal and originWorld = T(world_parent) · originLocal.
  const zeroPose: Record<string, number> = {};
  for (const j of joints) if (j.kind !== 'fixed' && j.kind !== 'ball') zeroPose[j.name] = 0;
  const transforms = forwardKinematics(parts, joints, zeroPose);

  const last3 = chain.slice(3);
  const lines: { origin: Vec3; dir: Vec3 }[] = last3.map((j) => {
    const parentT = transforms.get(j.parentPartId)!;
    const a = j.axis as Vec3;
    const dirRaw = parentT.axisDir(a);
    const len = Math.hypot(dirRaw[0], dirRaw[1], dirRaw[2]) || 1;
    const dir: Vec3 = [dirRaw[0] / len, dirRaw[1] / len, dirRaw[2] / len];
    const origin = parentT.point(j.origin as Vec3);
    return { origin, dir };
  });

  const intersect = threeLineIntersection(lines[0], lines[1], lines[2]);
  if (!intersect.ok || intersect.maxDistMm > TOLERANCE_INTERSECT_MM) {
    const r = {
      matches: false as const,
      reason: 'last-three-axes-do-not-intersect' as const,
      chainHash: hash,
    };
    cache.set(hash, r);
    return r;
  }

  // The wrist-center part is the parent part of the last revolute joint
  // (the link onto which the final wrist roll is anchored).
  const wristCenterJoint = last3[2];
  const wristCenterPart = parts.find((p) => p.id === wristCenterJoint.parentPartId)!.name;

  const r: PieperDetectorResult = {
    matches: true,
    wristCenterWorld: intersect.point,
    wristCenterPart,
    chainHash: hash,
  };
  cache.set(hash, r);
  return r;
}

function collectChain(
  _parts: ReadonlyArray<{ id: FeatureId; name: string }>,
  joints: ReadonlyArray<AssemblyJointStored>,
  tipId: FeatureId,
): AssemblyJointStored[] | null {
  const parentJointByPart = new Map<FeatureId, AssemblyJointStored>();
  for (const j of joints) parentJointByPart.set(j.childPartId, j);
  const chain: AssemblyJointStored[] = [];
  let cur: FeatureId | undefined = tipId;
  const seen = new Set<FeatureId>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const parentJ = parentJointByPart.get(cur);
    if (!parentJ) break;
    if (parentJ.kind === 'fixed') {
      // skip fixed joints transparently — they don't contribute DOF.
      cur = parentJ.parentPartId;
      continue;
    }
    if (parentJ.kind !== 'revolute') {
      // Mixed types (prismatic, ball) — classic Pieper applies to all-revolute
      // chains only.
      return null;
    }
    chain.push(parentJ);
    cur = parentJ.parentPartId;
  }
  return chain;
}

function topologyHash(arm: Assembly): string {
  return arm
    .__joints()
    .map((j) => {
      const ax = (j.axis ?? [0, 0, 0]) as Vec3;
      const o = j.origin;
      return `${j.name}|${j.kind}|${j.parentPartId}|${j.childPartId}|${ax.join(',')}|${o.join(',')}`;
    })
    .join(';');
}

function threeLineIntersection(
  a: { origin: Vec3; dir: Vec3 },
  b: { origin: Vec3; dir: Vec3 },
  c: { origin: Vec3; dir: Vec3 },
): { ok: true; point: Vec3; maxDistMm: number } | { ok: false; maxDistMm: number } {
  // Each line L_i = o_i + t_i d_i. Minimize Σ ||(I - d_i d_iᵀ)(P - o_i)||² over P.
  // ∇ = 0 ⇒  Σ (I - d_i d_iᵀ) P = Σ (I - d_i d_iᵀ) o_i.
  // Closed-form: solve a 3×3 linear system.
  const lines = [a, b, c];
  const M: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const rhs: number[] = [0, 0, 0];
  for (const L of lines) {
    const d = L.dir;
    // (I - d d^T)
    const P: number[][] = [
      [1 - d[0] * d[0], -d[0] * d[1], -d[0] * d[2]],
      [-d[1] * d[0], 1 - d[1] * d[1], -d[1] * d[2]],
      [-d[2] * d[0], -d[2] * d[1], 1 - d[2] * d[2]],
    ];
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 3; k++) M[i][k] += P[i][k];
      const o = L.origin;
      rhs[i] += P[i][0] * o[0] + P[i][1] * o[1] + P[i][2] * o[2];
    }
  }
  const Minv = invert3x3(M);
  if (!Minv) return { ok: false, maxDistMm: Infinity };
  const point: Vec3 = [
    Minv[0][0] * rhs[0] + Minv[0][1] * rhs[1] + Minv[0][2] * rhs[2],
    Minv[1][0] * rhs[0] + Minv[1][1] * rhs[1] + Minv[1][2] * rhs[2],
    Minv[2][0] * rhs[0] + Minv[2][1] * rhs[1] + Minv[2][2] * rhs[2],
  ];
  // Residual = max distance from point to each line.
  let maxDist = 0;
  for (const L of lines) {
    const v: Vec3 = [point[0] - L.origin[0], point[1] - L.origin[1], point[2] - L.origin[2]];
    const along = v[0] * L.dir[0] + v[1] * L.dir[1] + v[2] * L.dir[2];
    const perp: Vec3 = [v[0] - along * L.dir[0], v[1] - along * L.dir[1], v[2] - along * L.dir[2]];
    const d = Math.hypot(perp[0], perp[1], perp[2]);
    if (d > maxDist) maxDist = d;
  }
  return { ok: true, point, maxDistMm: maxDist };
}

function invert3x3(m: number[][]): number[][] | null {
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
  ];
}
