// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Authored rest coordinates for the MJCF joint `ref` (MuJoCo qpos0).
// MuJoCo shows the child body frame at qpos = qpos0 and then applies
// (qpos - qpos0). The body frame is therefore the authored pose, and
// coordinate 0 stays the connector-aligned pose, which is what physics
// `setPose` already commands. `ref` uses the same units as
// `jointOrderToQpos`: degrees become radians, millimetres become metres.
// A coupled driven joint takes ratio × source + offset from that authored
// source, which is the rest `solveMates(arm, {})` uses.
//
// A ball joint is not a scalar. MuJoCo keeps its qpos0 at the identity
// quaternion and ignores `ref`, so the authored extrinsic XYZ Euler triple
// is the child body's quaternion. The zero triple omits that quaternion.

import type { Assembly } from '../capture/assembly';
import type { NumericPoses } from '../capture/forwardKinematics';
import { expandCoupledPoses, type MateCouplingRecord } from '../mates/coupledPoses';
import type { MateRecord } from '../mates/mate';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { Transform } from '../../shared/runtime/se3';
import { fmtNum } from './mjcfXmlFormat';

const MM_TO_M = 1e-3;
const DEG_TO_RAD = Math.PI / 180;
/** Same cutoff `fmtNum` uses before it prints 0. A reference of 0 is omitted. */
const REF_EPS = 1e-9;

function scalarSi(mate: MateRecord, value: number): number | undefined {
    switch (mate.type) {
        case 'revolute':
        case 'cylindrical':
        case 'pin_slot':
            return value * DEG_TO_RAD;
        case 'prismatic':
            return value * MM_TO_M;
        default:
            return undefined;
    }
}

function authoredScalar(mate: MateRecord, table: ParamTable): number | undefined {
    if (scalarSi(mate, 0) === undefined) return undefined;
    if (mate.pose === undefined || Array.isArray(mate.pose)) return undefined;
    const value = currentValue(mate.pose as Editable<number>, table);
    return Number.isFinite(value) ? value : undefined;
}

function authoredEuler(mate: MateRecord, table: ParamTable): [number, number, number] | undefined {
    if (mate.type !== 'ball' || !Array.isArray(mate.pose)) return undefined;
    const values = mate.pose.map((item) => currentValue(item, table));
    if (values.some((value) => !Number.isFinite(value))) return undefined;
    return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0];
}

/**
 * CAD rest in kernelCAD units (degrees or millimetres, or an XYZ Euler
 * triple for a ball). Driven mates follow their coupling. A scalar mate
 * with no pose is absent and exports as 0.
 */
export function authoredRestPoses(arm: Assembly): NumericPoses {
    const mates = arm.__mates();
    const couplings = arm.__mateCouplings();
    const table = arm.__session().paramTable;
    const poses = restPosesFrom(mates, couplings, (mate) => authoredScalar(mate, table));
    for (const mate of mates) {
        const euler = authoredEuler(mate, table);
        if (euler !== undefined) poses[mate.name] = euler;
    }
    return poses;
}

function restPosesFrom(
    mates: readonly MateRecord[],
    couplings: readonly MateCouplingRecord[],
    authored: (mate: MateRecord) => number | undefined,
): NumericPoses {
    const expanded = expandCoupledPoses(mates, couplings, {}, {
        resolveSourcePose: (mate) => {
            if (scalarSi(mate, 0) === undefined) return undefined;
            return authored(mate) ?? 0;
        },
    });
    const out: NumericPoses = { ...expanded };
    for (const mate of mates) {
        if (out[mate.name] !== undefined) continue;
        const value = authored(mate);
        if (value !== undefined) out[mate.name] = value;
    }
    return out;
}

/** Joint reference in SI, or 0 when the mate has no scalar rest to emit. */
export function scalarRestSi(mate: MateRecord, poses: NumericPoses): number {
    const raw = poses[mate.name];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
    const si = scalarSi(mate, raw);
    if (si === undefined || Math.abs(si) < REF_EPS) return 0;
    return si;
}

/** ` ref="..."` or empty. Omitted at 0 so pose-0 exports stay unchanged. */
export function mjcfJointRefAttribute(mate: MateRecord, poses: NumericPoses): string {
    const si = scalarRestSi(mate, poses);
    return si === 0 ? '' : ` ref="${fmtNum(si)}"`;
}

export interface RestBodyPlacement {
    readonly posMm: readonly [number, number, number];
    /** Body quaternion (w, x, y, z) at the authored pose. Omitted at rest 0. */
    readonly quat?: readonly [number, number, number, number];
}

interface MateFrameMm {
    readonly origin: readonly number[];
    readonly axis: readonly number[];
    readonly childOrigin: readonly number[];
}

function vec3(v: readonly number[] | undefined): [number, number, number] {
    return [v?.[0] ?? 0, v?.[1] ?? 0, v?.[2] ?? 0];
}

function unit3(axis: readonly number[]): [number, number, number] {
    const [x, y, z] = vec3(axis);
    const len = Math.hypot(x, y, z);
    if (len < 1e-12) return [0, 0, 1];
    return [x / len, y / len, z / len];
}

function rotateAbout(v: readonly [number, number, number], axis: readonly [number, number, number], angle: number): [number, number, number] {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const dot = axis[0] * v[0] + axis[1] * v[1] + axis[2] * v[2];
    const cross: [number, number, number] = [
        axis[1] * v[2] - axis[2] * v[1],
        axis[2] * v[0] - axis[0] * v[2],
        axis[0] * v[1] - axis[1] * v[0],
    ];
    return [
        v[0] * c + cross[0] * s + axis[0] * dot * (1 - c),
        v[1] * c + cross[1] * s + axis[1] * dot * (1 - c),
        v[2] * c + cross[2] * s + axis[2] * dot * (1 - c),
    ];
}

function eulerTriple(raw: NumericPoses[string] | undefined): [number, number, number] | undefined {
    if (!Array.isArray(raw) || raw.length !== 3) return undefined;
    if (!raw.every((value) => typeof value === 'number' && Number.isFinite(value))) return undefined;
    return [raw[0], raw[1], raw[2]];
}

/** Unit quaternion (w, x, y, z) of a pure rotation. Positive scalar part. */
function quatFromRotation(rotation: Transform): [number, number, number, number] {
    const x = rotation.axisDir([1, 0, 0]);
    const y = rotation.axisDir([0, 1, 0]);
    const z = rotation.axisDir([0, 0, 1]);
    const m00 = x[0];
    const m10 = x[1];
    const m20 = x[2];
    const m01 = y[0];
    const m11 = y[1];
    const m21 = y[2];
    const m02 = z[0];
    const m12 = z[1];
    const m22 = z[2];
    const trace = m00 + m11 + m22;
    let w: number;
    let qx: number;
    let qy: number;
    let qz: number;
    if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        w = 0.25 / s;
        qx = (m21 - m12) * s;
        qy = (m02 - m20) * s;
        qz = (m10 - m01) * s;
    } else if (m00 > m11 && m00 > m22) {
        const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
        w = (m21 - m12) / s;
        qx = 0.25 * s;
        qy = (m01 + m10) / s;
        qz = (m02 + m20) / s;
    } else if (m11 > m22) {
        const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
        w = (m02 - m20) / s;
        qx = (m01 + m10) / s;
        qy = 0.25 * s;
        qz = (m12 + m21) / s;
    } else {
        const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
        w = (m10 - m01) / s;
        qx = (m02 + m20) / s;
        qy = (m12 + m21) / s;
        qz = 0.25 * s;
    }
    const len = Math.hypot(w, qx, qy, qz) || 1;
    const sign = w < 0 ? -1 : 1;
    return [sign * w / len, sign * qx / len, sign * qy / len, sign * qz / len];
}

/**
 * Ball qpos0 cannot leave the identity quaternion, so the authored Euler
 * triple is the body frame. The composition matches `jointTransformForMate`:
 * extrinsic XYZ at the parent connector, then the child connector back.
 */
function ballPlacement(
    origin: readonly [number, number, number],
    child: readonly [number, number, number],
    raw: NumericPoses[string] | undefined,
): RestBodyPlacement {
    const pos0: [number, number, number] = [origin[0] - child[0], origin[1] - child[1], origin[2] - child[2]];
    const euler = eulerTriple(raw) ?? [0, 0, 0];
    if (euler.every((value) => Math.abs(value) < 1e-12)) return { posMm: pos0 };
    const rotation = Transform.eulerXYZDeg(euler[0], euler[1], euler[2]);
    const swung = rotation.point([-child[0], -child[1], -child[2]]);
    return {
        posMm: [origin[0] + swung[0], origin[1] + swung[1], origin[2] + swung[2]],
        quat: quatFromRotation(rotation),
    };
}

/**
 * Child body placement at the authored rest. Pose 0 keeps the connector
 * translation and omits the quaternion, so those exports stay unchanged.
 * A hinge rotates about the parent connector; a slide shifts along its axis.
 * A ball uses its Euler triple, because that joint has no scalar `ref`.
 */
export function restBodyPlacement(
    mate: MateRecord,
    frame: MateFrameMm | undefined,
    poses: NumericPoses,
): RestBodyPlacement {
    const origin = vec3(frame?.origin);
    const child = vec3(frame?.childOrigin);
    const pos0: [number, number, number] = [origin[0] - child[0], origin[1] - child[1], origin[2] - child[2]];
    if (mate.type === 'ball') return ballPlacement(origin, child, poses[mate.name]);
    const si = scalarRestSi(mate, poses);
    if (si === 0 || frame === undefined) return { posMm: pos0 };
    const axis = unit3(frame.axis);
    if (mate.type === 'prismatic') {
        const mm = si / MM_TO_M;
        return { posMm: [pos0[0] + axis[0] * mm, pos0[1] + axis[1] * mm, pos0[2] + axis[2] * mm] };
    }
    const turned = rotateAbout([pos0[0] - origin[0], pos0[1] - origin[1], pos0[2] - origin[2]], axis, si);
    const half = si / 2;
    const s = Math.sin(half);
    return {
        posMm: [origin[0] + turned[0], origin[1] + turned[1], origin[2] + turned[2]],
        quat: [Math.cos(half), axis[0] * s, axis[1] * s, axis[2] * s],
    };
}
