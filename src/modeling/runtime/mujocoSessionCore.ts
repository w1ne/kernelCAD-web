// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mujocoSessionCore.ts
//
// Host-independent wrapper around an initialized @mujoco/mujoco module.
// The Node CLI and browser worker each own loading and caching the module;
// this file contains only the session API shared by both hosts.
//
// API surface:
//   - createMujocoSession(module, mjcfXml, bodyOrder, jointOrder) → Session
//   - Session.setPose(qpos)
//   - Session.inverseDynamics() → { qfrc, finite }
//   - Session.step(seconds, dt?) → { qpos, xpos, bodyPoses }
//   - Session.xposNow() → ReadonlyMap<bodyName, Vec3>
//   - Session.bodyPosesNow() → ReadonlyMap<bodyName, placement in mm>
//   - Session.forward() — kinematics and contacts, no integration
//   - Session.compiledGeoms / compiledContacts / compiledBodies /
//     compiledJointStates / excludedBodyPairs — compiled model metadata
//     (not XML text)
//   - Session.dispose()
//
// Coordinate units: MuJoCo SI throughout (radians, metres, kg, seconds).
// The MJCF emitter converts kernelCAD's mm/deg up-front; downstream
// criterion code converts back as needed for diagnostic messages.

// We type the mujoco module loosely; the generated package declarations
// add little safety to this small host-independent session surface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MujocoModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MjModelHandle = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MjDataHandle = any;

/** Column-major rigid transform. Translation is millimetres. */
export type MujocoBodyMatrix = readonly [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
];

/**
 * World placement of one named assembly part after a simulation step.
 * The matrix maps the part-local frame (the frame the MJCF mesh was
 * emitted in) into world, in millimetres. That is the same placement
 * `solveMates` returns, so playback can apply it to the source shape.
 */
export interface MujocoBodyPose {
    readonly matrix: MujocoBodyMatrix;
}

/** Per-integration-step position snapshot, used for physics invariants. */
export type MujocoStepObserver = (qpos: readonly number[], step: number) => void;

const METRES_TO_MM = 1000;

/** mjtObj values from the MuJoCo WASM bindings. */
const OBJ_BODY = 1;
const OBJ_JOINT = 3;
const OBJ_GEOM = 5;
const OBJ_MESH = 10;
/** mjtJoint.mjJNT_SLIDE and mjJNT_HINGE. Free and ball are not scalar qpos. */
const JNT_SLIDE = 2;
const JNT_HINGE = 3;
/** mjtGeom.mjGEOM_MESH */
const GEOM_MESH = 7;
const GEOM_TYPE_NAME = ['plane', 'hfield', 'sphere', 'capsule', 'ellipsoid', 'cylinder', 'box', 'mesh', 'sdf'] as const;

export interface CompiledGeom {
    readonly id: number;
    readonly name: string;
    readonly bodyId: number;
    readonly body: string;
    readonly type: string;
    readonly group: number;
    readonly contype: number;
    readonly conaffinity: number;
    readonly margin: number;
    readonly mesh?: string;
}

export interface CompiledJointState {
    readonly name: string;
    readonly mate: string;
    /** Index of this scalar coordinate in `qpos`. */
    readonly qposAdr: number;
    readonly qpos: number;
    readonly limited: boolean;
    readonly range: readonly [number, number];
}

export interface CompiledContact {
    readonly geom1: number;
    readonly geom2: number;
    readonly geomA: string;
    readonly geomB: string;
    readonly bodyA: string;
    readonly bodyB: string;
    /** Signed distance in metres. Negative means penetration. */
    readonly distM: number;
}

export interface CompiledBodyDynamics {
    readonly id: number;
    readonly name: string;
    readonly parentId: number;
    readonly parentName: string;
    readonly massKg: number;
    readonly comM: readonly [number, number, number];
    /** Principal moments about the centre of mass, kg·m². */
    readonly principalKgM2: readonly [number, number, number];
    /** Inertia-frame quaternion, MuJoCo order (w, x, y, z). */
    readonly iquat: readonly [number, number, number, number];
    /** Centroidal inertia in the body frame: [ixx, ixy, ixz, iyy, iyz, izz]. */
    readonly inertia6: readonly [number, number, number, number, number, number];
}

export interface ExcludedBodyPair {
    readonly bodyA: string;
    readonly bodyB: string;
}

/**
 * Body-frame inertia from principal moments and the inertia quaternion.
 * `I = R diag(principal) Rᵀ`, with `R` the rotation that maps the
 * inertia frame into the body frame. An identity quaternion leaves the
 * diagonal unchanged.
 */
export function inertia6FromPrincipal(
    principal: readonly [number, number, number],
    iquatWxyz: readonly [number, number, number, number],
): [number, number, number, number, number, number] {
    const [w, x, y, z] = iquatWxyz;
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, xz = x * z, yz = y * z;
    const wx = w * x, wy = w * y, wz = w * z;
    const r = [
        [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy)],
        [2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx)],
        [2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)],
    ];
    const at = (row: number, col: number): number =>
        r[row][0] * principal[0] * r[col][0]
        + r[row][1] * principal[1] * r[col][1]
        + r[row][2] * principal[2] * r[col][2];
    return [at(0, 0), at(0, 1), at(0, 2), at(1, 1), at(1, 2), at(2, 2)];
}

function modelCount(model: MjModelHandle, field: string): number {
    const value = model?.[field];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function modelAt(view: unknown, index: number): number {
    if (view == null || index < 0) return 0;
    const indexed = view as { get?: (i: number) => number } & ArrayLike<number>;
    const value = typeof indexed.get === 'function' ? indexed.get(index) : indexed[index];
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function bodyPoseAt(xpos: ArrayLike<number>, xmat: ArrayLike<number>, bodyIdx: number): MujocoBodyPose {
    const p = bodyIdx * 3;
    const r = bodyIdx * 9;
    // xmat is row-major. The matrix below is column-major, so the
    // first column is the image of local +X.
    return {
        matrix: [
            xmat[r], xmat[r + 3], xmat[r + 6], 0,
            xmat[r + 1], xmat[r + 4], xmat[r + 7], 0,
            xmat[r + 2], xmat[r + 5], xmat[r + 8], 0,
            xpos[p] * METRES_TO_MM,
            xpos[p + 1] * METRES_TO_MM,
            xpos[p + 2] * METRES_TO_MM,
            1,
        ],
    };
}

export type MujocoSessionFactory = (
    mjcfXml: string,
    bodyOrder: readonly string[],
    jointOrder: readonly { mjcfName: string; mateName: string }[],
) => Promise<MujocoSession>;

/**
 * One MuJoCo simulation. Owns an MjModel and MjData; `dispose()` must
 * be called when done to release WASM heap memory (Embind doesn't
 * GC C++ handles automatically).
 */
export class MujocoSession {
    private readonly mujoco: MujocoModule;
    private readonly model: MjModelHandle;
    private readonly data: MjDataHandle;
    private readonly bodyOrder: readonly string[];
    private readonly jointOrder: readonly { mjcfName: string; mateName: string }[];
    private disposed = false;

    constructor(
        mujoco: MujocoModule,
        model: MjModelHandle,
        data: MjDataHandle,
        bodyOrder: readonly string[],
        jointOrder: readonly { mjcfName: string; mateName: string }[],
    ) {
        this.mujoco = mujoco;
        this.model = model;
        this.data = data;
        this.bodyOrder = bodyOrder;
        this.jointOrder = jointOrder;
    }

    /** Number of generalized positions (joint DOFs, excluding ball quat). */
    get nq(): number {
        return Number(this.model.nq);
    }

    /** Number of generalized velocities (joint DOFs counting ball as 3). */
    get nv(): number {
        return Number(this.model.nv);
    }

    /** Number of bodies including the worldbody (index 0). */
    get nbody(): number {
        return Number(this.model.nbody);
    }

    /** Number of joints. */
    get njnt(): number {
        return Number(this.model.njnt);
    }

    /** Number of tendons. Stiff tendon limits need a finer integration step. */
    get ntendon(): number {
        return Number(this.model.ntendon);
    }

    /** Joint name list, in the order the MJCF emitter pushed them.
     *  Used to translate qpos / qfrc indices back to mate names. */
    get joints(): readonly { mjcfName: string; mateName: string }[] {
        return this.jointOrder;
    }

    /** Body name list (mirrors `model.nbody`; worldbody NOT included).
     *  Body index in MuJoCo = position in `bodyOrder` + 1 (worldbody is 0). */
    get bodies(): readonly string[] {
        return this.bodyOrder;
    }

    /**
     * Write the joint-position vector. Length must equal `nq`. Throws on
     * mismatch — that's a serializer bug, not a user-facing error.
     */
    setPose(qpos: readonly number[]): void {
        this.assertAlive();
        if (qpos.length !== this.nq) {
            throw new Error(
                `MujocoSession.setPose: qpos.length=${qpos.length} but model.nq=${this.nq}.`,
            );
        }
        const view = this.data.qpos;
        for (let i = 0; i < qpos.length; i++) view[i] = qpos[i];
        // Zero out velocity + acceleration so the next inverseDynamics /
        // forward call sees a known rest state.
        const qvel = this.data.qvel;
        for (let i = 0; i < qvel.length; i++) qvel[i] = 0;
        const qacc = this.data.qacc;
        for (let i = 0; i < qacc.length; i++) qacc[i] = 0;
    }

    /** Read the current qpos (live view; copy if you'll mutate later). */
    getQpos(): readonly number[] {
        this.assertAlive();
        return Array.from(this.data.qpos);
    }

    /**
     * Run inverse dynamics: given the current qpos / qvel=0 / qacc=0
     * stored in `data`, compute the joint torques required to hold the
     * pose (against gravity). Returns the torque vector + a finiteness
     * flag (used by criterion 5).
     *
     * The model must be in a well-defined kinematic state before
     * calling — `setPose` does the zeroing of qvel/qacc.
     */
    inverseDynamics(): { qfrc: number[]; allFinite: boolean } {
        this.assertAlive();
        this.mujoco.mj_inverse(this.model, this.data);
        const view = this.data.qfrc_inverse;
        const qfrc = Array.from(view as ArrayLike<number>);
        let allFinite = true;
        for (const v of qfrc) {
            if (!Number.isFinite(v)) {
                allFinite = false;
                break;
            }
        }
        return { qfrc, allFinite };
    }

    /**
     * Forward simulation for `seconds` (default `dt = 0.001 s` per
     * MJCF `<option>` default). Returns final qpos, world body
     * positions in metres, and per-part placements in millimetres.
     * Criterion 6 reads `xpos`; playback applies `bodyPoses`.
     */
    step(seconds: number, dt = 0.001, observeQpos?: MujocoStepObserver): {
        qpos: number[];
        xpos: Map<string, [number, number, number]>;
        bodyPoses: Map<string, MujocoBodyPose>;
    } {
        this.assertAlive();
        // Force the integrator timestep to our explicit dt; MuJoCo's
        // default is 2 ms which is fine but we want determinism.
        this.model.opt.timestep = dt;
        const steps = Math.max(1, Math.round(seconds / dt));
        for (let i = 0; i < steps; i++) {
            this.mujoco.mj_step(this.model, this.data);
            if (observeQpos !== undefined) {
                observeQpos(Array.from(this.data.qpos as ArrayLike<number>), i + 1);
            }
        }
        const qpos = Array.from(this.data.qpos as ArrayLike<number>);
        return { qpos, xpos: this.xposNow(), bodyPoses: this.bodyPosesNow() };
    }

    /**
     * Snapshot the current world position of every body. Skips
     * worldbody (index 0). Used pre-step (rest) + post-step (drift).
     */
    xposNow(): Map<string, [number, number, number]> {
        this.assertAlive();
        const xpos = this.data.xpos; // flat (nbody × 3) row-major
        const out = new Map<string, [number, number, number]>();
        for (let i = 0; i < this.bodyOrder.length; i++) {
            const bodyIdx = i + 1; // +1: skip worldbody
            out.set(this.bodyOrder[i], [
                xpos[bodyIdx * 3 + 0],
                xpos[bodyIdx * 3 + 1],
                xpos[bodyIdx * 3 + 2],
            ]);
        }
        return out;
    }

    /**
     * Snapshot the world placement of every named body. Skips worldbody
     * (index 0). `xpos` is metres and `xmat` is the body-to-world
     * rotation, row-major; the returned matrix is column-major with
     * translation in millimetres.
     */
    bodyPosesNow(): Map<string, MujocoBodyPose> {
        this.assertAlive();
        const xpos = this.data.xpos as ArrayLike<number>;
        const xmat = this.data.xmat as ArrayLike<number>;
        const out = new Map<string, MujocoBodyPose>();
        for (let i = 0; i < this.bodyOrder.length; i++) {
            out.set(this.bodyOrder[i], bodyPoseAt(xpos, xmat, i + 1));
        }
        return out;
    }

    /** Run forward kinematics and contact generation (no integration). */
    forward(): void {
        this.assertAlive();
        this.mujoco.mj_forward(this.model, this.data);
    }

    /**
     * Geoms as the compiler stored them: type, group, collision bits,
     * and mesh name. Names come from `mj_id2name`, not from the XML.
     */
    compiledGeoms(): CompiledGeom[] {
        this.assertAlive();
        const ngeom = modelCount(this.model, 'ngeom');
        const out: CompiledGeom[] = [];
        for (let id = 0; id < ngeom; id++) {
            const bodyId = modelAt(this.model.geom_bodyid, id);
            const typeId = modelAt(this.model.geom_type, id);
            const mesh = typeId === GEOM_MESH
                ? this.objectName(OBJ_MESH, modelAt(this.model.geom_dataid, id))
                : undefined;
            const name = this.objectName(OBJ_GEOM, id);
            out.push({
                id,
                name: name.length > 0 ? name : `geom${id}`,
                bodyId,
                body: this.objectName(OBJ_BODY, bodyId),
                type: GEOM_TYPE_NAME[typeId] ?? `type${typeId}`,
                group: modelAt(this.model.geom_group, id),
                contype: modelAt(this.model.geom_contype, id),
                conaffinity: modelAt(this.model.geom_conaffinity, id),
                margin: modelAt(this.model.geom_margin, id),
                ...(mesh !== undefined && mesh.length > 0 ? { mesh } : {}),
            });
        }
        return out;
    }

    /**
     * Scalar hinge and slide joints as compiled. `qpos` is the live
     * coordinate (qpos0 until `setPose`). Range is the compiled limit.
     * Free and ball joints are omitted: their qpos is not one scalar.
     *
     * `jnt_limited` is a bool array this WASM build cannot read. An
     * unlimited joint keeps the zero range the compiler allocates; a
     * limited joint stores a real interval. A locked limit of exactly
     * (0, 0) is indistinguishable from unlimited.
     */
    compiledJointStates(): CompiledJointState[] {
        this.assertAlive();
        const njnt = modelCount(this.model, 'njnt');
        const qpos = this.data.qpos as ArrayLike<number>;
        const mateByJoint = new Map(this.jointOrder.map((joint) => [joint.mjcfName, joint.mateName]));
        const out: CompiledJointState[] = [];
        for (let id = 0; id < njnt; id++) {
            const type = modelAt(this.model.jnt_type, id);
            if (type !== JNT_SLIDE && type !== JNT_HINGE) continue;
            const name = this.objectName(OBJ_JOINT, id);
            const adr = modelAt(this.model.jnt_qposadr, id);
            const lower = modelAt(this.model.jnt_range, id * 2);
            const upper = modelAt(this.model.jnt_range, id * 2 + 1);
            const limited = upper > lower || (lower !== 0 && lower === upper);
            out.push({
                name,
                mate: mateByJoint.get(name) ?? name,
                qposAdr: adr,
                qpos: Number(qpos[adr] ?? 0),
                limited,
                range: [lower, upper],
            });
        }
        return out;
    }

    /**
     * Contacts after the last `forward` or `step`. `distM` is MuJoCo's
     * signed distance in metres (negative means penetration).
     */
    compiledContacts(): CompiledContact[] {
        this.assertAlive();
        const ncon = Number(this.data.ncon ?? 0);
        const contacts = this.data.contact;
        if (contacts == null || typeof contacts.get !== 'function') return [];
        const geoms = this.compiledGeoms();
        const out: CompiledContact[] = [];
        for (let i = 0; i < ncon; i++) {
            const contact = contacts.get(i);
            if (contact === undefined) continue;
            const geom1 = Number(contact.geom1);
            const geom2 = Number(contact.geom2);
            const g1 = geoms[geom1];
            const g2 = geoms[geom2];
            out.push({
                geom1,
                geom2,
                geomA: g1?.name ?? `geom${geom1}`,
                geomB: g2?.name ?? `geom${geom2}`,
                bodyA: g1?.body ?? '',
                bodyB: g2?.body ?? '',
                distM: Number(contact.dist),
            });
        }
        return out;
    }

    /**
     * Compiled inertial frame of every body except the world body.
     * `inertia6` is the centroidal tensor in the body frame, rebuilt
     * from the principal moments and the inertia quaternion.
     */
    compiledBodies(): CompiledBodyDynamics[] {
        this.assertAlive();
        const nbody = modelCount(this.model, 'nbody');
        const out: CompiledBodyDynamics[] = [];
        for (let id = 1; id < nbody; id++) {
            const parentId = modelAt(this.model.body_parentid, id);
            const principal: [number, number, number] = [
                modelAt(this.model.body_inertia, id * 3),
                modelAt(this.model.body_inertia, id * 3 + 1),
                modelAt(this.model.body_inertia, id * 3 + 2),
            ];
            const iquat: [number, number, number, number] = [
                modelAt(this.model.body_iquat, id * 4),
                modelAt(this.model.body_iquat, id * 4 + 1),
                modelAt(this.model.body_iquat, id * 4 + 2),
                modelAt(this.model.body_iquat, id * 4 + 3),
            ];
            out.push({
                id,
                name: this.objectName(OBJ_BODY, id),
                parentId,
                parentName: parentId === 0 ? 'world' : this.objectName(OBJ_BODY, parentId),
                massKg: modelAt(this.model.body_mass, id),
                comM: [
                    modelAt(this.model.body_ipos, id * 3),
                    modelAt(this.model.body_ipos, id * 3 + 1),
                    modelAt(this.model.body_ipos, id * 3 + 2),
                ],
                principalKgM2: principal,
                iquat,
                inertia6: inertia6FromPrincipal(principal, iquat),
            });
        }
        return out;
    }

    /**
     * Body pairs the compiler will not contact. Signature is
     * `(min(id) << 16) + max(id)`, which is how the engine stores
     * `<contact><exclude>` after compile.
     */
    excludedBodyPairs(): ExcludedBodyPair[] {
        this.assertAlive();
        const nexclude = modelCount(this.model, 'nexclude');
        const out: ExcludedBodyPair[] = [];
        for (let i = 0; i < nexclude; i++) {
            const signature = modelAt(this.model.exclude_signature, i);
            const body1 = signature >>> 16;
            const body2 = signature & 0xffff;
            const name1 = this.objectName(OBJ_BODY, body1);
            const name2 = this.objectName(OBJ_BODY, body2);
            const [bodyA, bodyB] = name1 < name2 ? [name1, name2] : [name2, name1];
            out.push({ bodyA, bodyB });
        }
        out.sort((a, b) => a.bodyA.localeCompare(b.bodyA) || a.bodyB.localeCompare(b.bodyB));
        return out;
    }

    private objectName(objType: number, id: number): string {
        if (id < 0) return '';
        const named = this.mujoco.mj_id2name(this.model, objType, id);
        return typeof named === 'string' ? named : '';
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        try {
            this.data.delete();
        } catch {
            // Already deleted somewhere upstream — ignore.
        }
        try {
            this.model.delete();
        } catch {
            // Same.
        }
    }

    private assertAlive(): void {
        if (this.disposed) {
            throw new Error('MujocoSession used after dispose().');
        }
    }
}

/**
 * Compile an MJCF string into a fresh MujocoSession. Caller is
 * responsible for `dispose()` (typically in a `finally`).
 *
 * @param mjcfXml — the MJCF string (from assemblyToMjcf).
 * @param bodyOrder / jointOrder — emitter-side ordering, so the session
 *   can translate index → name without re-parsing the XML.
 */
export function createMujocoSession(
    mujoco: MujocoModule,
    mjcfXml: string,
    bodyOrder: readonly string[],
    jointOrder: readonly { mjcfName: string; mateName: string }[],
): MujocoSession {
    const model = mujoco.MjModel.from_xml_string(mjcfXml);
    const data = new mujoco.MjData(model);
    return new MujocoSession(mujoco, model, data, bodyOrder, jointOrder);
}
