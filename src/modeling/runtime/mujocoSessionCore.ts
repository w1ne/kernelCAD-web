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
//   - Session.bodyVelocitiesNow() → world-axis velocity at the body origin, SI
//   - Session.forward() — kinematics and contacts, no integration
//   - Session.setJointEfforts / scalarJointStatesNow / sensorReadingsNow
//   - Session.stepFixed(stepCount, dt) — exact simulated-clock frontier
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

/** World-axis velocity at the regular body-frame origin, not its centre of mass. */
export interface MujocoBodyVelocity {
    readonly velocityMps: readonly [number, number, number];
    readonly angularVelocityRadS: readonly [number, number, number];
}

/** Per-integration-step position snapshot, used for physics invariants. */
export type MujocoStepObserver = (qpos: readonly number[], step: number) => void;

const METRES_TO_MM = 1000;

/** mjtObj values from the MuJoCo WASM bindings. */
const OBJ_BODY = 1;
const OBJ_XBODY = 2;
const OBJ_JOINT = 3;
const OBJ_GEOM = 5;
const OBJ_MESH = 10;
const OBJ_SENSOR = 20;
const OBJ_ACTUATOR = 19;
const TRN_JOINT = 0;
const TRN_JOINT_IN_PARENT = 1;
const WARNING_NAMES = ['INERTIA', 'CONTACTFULL', 'CNSTRFULL', 'BADQPOS', 'BADQVEL', 'BADQACC', 'BADCTRL'] as const;
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


/** A scalar coordinate; hinge units are rad, rad/s and N·m, slide units are m, m/s and N. */
export interface MujocoScalarJointState {
    readonly name: string;
    readonly kind: 'hinge' | 'slide';
    readonly qposAdr: number;
    readonly dofAdr: number;
    readonly position: number;
    readonly velocity: number;
    readonly appliedEffort: number;
}

/** Named compiled sensor output. Units and local frame follow its MJCF declaration. */
export interface MujocoSensorReading {
    readonly name: string;
    /** MuJoCo mjtSensor enum: accelerometer = 1 (m/s²), gyro = 3 (rad/s). */
    readonly type: number;
    readonly values: readonly number[];
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

/** Native solver contact wrench, in MuJoCo's contact frame. */
export interface MujocoContactWrench extends CompiledContact {
    readonly active: boolean;
    readonly forceN: readonly [number, number, number];
    readonly torqueNm: readonly [number, number, number];
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
    private stepFailure: string | undefined;

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

    /**
     * Copy velocities at the same last forward/stepFixed frontier as bodyPosesNow.
     * XBODY selects the regular body origin; BODY would select its inertial COM.
     * flg_local=0 requests world axes. MuJoCo returns angular then linear values.
     * This observation neither integrates nor runs another forward pass.
     */
    bodyVelocitiesNow(): Map<string, MujocoBodyVelocity> {
        this.assertAlive();
        const out = new Map<string, MujocoBodyVelocity>();
        const buffer = new this.mujoco.DoubleBuffer(6);
        try {
            for (let i = 0; i < this.bodyOrder.length; i++) {
                this.mujoco.mj_objectVelocity(this.model, this.data, OBJ_XBODY, i + 1, buffer, 0);
                const values = Array.from(buffer.GetView() as ArrayLike<number>);
                if (values.length !== 6 || !values.every(Number.isFinite)) {
                    throw new Error(`Non-finite body velocity for "${this.bodyOrder[i]}".`);
                }
                out.set(this.bodyOrder[i], {
                    velocityMps: [values[3], values[4], values[5]],
                    angularVelocityRadS: [values[0], values[1], values[2]],
                });
            }
        } finally {
            buffer.delete();
        }
        return out;
    }

    /** Run forward kinematics and contacts without integration; optionally set the solver timestep first. */
    forward(dtSeconds?: number): void {
        this.assertAlive();
        if (dtSeconds !== undefined) {
            if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) throw new Error('MujocoSession.forward: timestep must be positive and finite.');
            this.model.opt.timestep = dtSeconds;
        }
        this.mujoco.mj_forward(this.model, this.data);
    }

    /** A contact acceptance study owns every drive; hidden native controllers invalidate it. */
    assertNoActuators(): void {
        this.assertAlive();
        if (modelCount(this.model, 'nu') !== 0) throw new Error('Contact dynamics requires an actuator-free model; apply joint efforts explicitly.');
    }


    /** Elapsed simulated time in seconds, independent of wall-clock playback. */
    get timeSeconds(): number {
        this.assertAlive();
        return Number(this.data.time);
    }

    /**
     * Snapshot named hinge/slide coordinates and velocities. qpos and qvel
     * addresses differ after a free or ball joint; do not index qvel by qposAdr.
     * Unnamed, free and ball joints are not scalar effort ports.
     */
    scalarJointStatesNow(): MujocoScalarJointState[] {
        this.assertAlive();
        const out: MujocoScalarJointState[] = [];
        for (let id = 0; id < modelCount(this.model, 'njnt'); id++) {
            const type = modelAt(this.model.jnt_type, id);
            if (type !== JNT_SLIDE && type !== JNT_HINGE) continue;
            const name = this.objectName(OBJ_JOINT, id);
            if (name.length === 0) continue;
            const qposAdr = modelAt(this.model.jnt_qposadr, id);
            const dofAdr = modelAt(this.model.jnt_dofadr, id);
            out.push({
                name,
                kind: type === JNT_HINGE ? 'hinge' : 'slide',
                qposAdr,
                dofAdr,
                position: Number(this.data.qpos[qposAdr]),
                velocity: Number(this.data.qvel[dofAdr]),
                appliedEffort: Number(this.data.qfrc_applied[dofAdr]),
            });
        }
        return out;
    }

    /**
     * Replace this session's complete externally applied generalized effort.
     * Keys are compiled MJCF hinge/slide joint names, not mate aliases.
     * Validate the whole frame before writing. Omitted joints receive zero;
     * an empty object clears all applied effort, including root coordinates.
     * This port owns qfrc_applied. MJCF actuator forces remain independent.
     */
    setJointEfforts(efforts: Readonly<Record<string, number>>): void {
        this.assertAlive();
        const joints = new Map(this.scalarJointStatesNow().map((joint) => [joint.name, joint]));
        const writes = Object.entries(efforts).map(([name, effort]) => {
            const joint = joints.get(name);
            if (joint === undefined) {
                throw new Error(`MujocoSession.setJointEfforts: unknown named scalar joint "${name}".`);
            }
            if (!Number.isFinite(effort)) {
                throw new Error(`MujocoSession.setJointEfforts: non-finite effort for "${name}".`);
            }
            return { dofAdr: joint.dofAdr, effort };
        });
        const applied = this.data.qfrc_applied;
        for (let i = 0; i < this.nv; i++) applied[i] = 0;
        for (const { dofAdr, effort } of writes) applied[dofAdr] = effort;
    }


    /**
     * Validate a native-owned joint set before enabling external shaft coupling.
     * Direct MJCF actuators on those coordinates would introduce a second driver.
     * Indirect actuator transmissions cannot prove disjoint ownership here and
     * are rejected. This check does not claim calibrated inertias or motor units.
     */
    assertExternalJointOwnership(jointNames: readonly string[]): void {
        this.assertAlive();
        const known = new Set(this.scalarJointStatesNow().map((joint) => joint.name));
        const owned = new Set(jointNames);
        if (owned.size !== jointNames.length) throw new Error('External joint ownership contains duplicate names.');
        for (const name of owned) {
            if (!known.has(name)) throw new Error(`Unknown external scalar joint "${name}".`);
        }
        for (let id = 0; id < modelCount(this.model, 'nu'); id++) {
            const transmission = modelAt(this.model.actuator_trntype, id);
            if (transmission !== TRN_JOINT && transmission !== TRN_JOINT_IN_PARENT) {
                throw new Error('External joint ownership cannot be established with indirect MJCF actuators.');
            }
            const joint = this.objectName(OBJ_JOINT, modelAt(this.model.actuator_trnid, id * 2));
            if (owned.has(joint)) {
                const actuator = this.objectName(OBJ_ACTUATOR, id);
                throw new Error(`External joint "${joint}" is also driven by MJCF actuator "${actuator}".`);
            }
        }
    }

    /**
     * Copy named sensor outputs at the last forward/stepFixed frontier.
     * Accelerometer values are site-local specific force in m/s²; gyro values
     * are site-local angular velocity in rad/s. No device channels are imposed.
     * Unnamed sensors are omitted. Other sensor units follow the MJCF reference.
     */
    sensorReadingsNow(): MujocoSensorReading[] {
        this.assertAlive();
        const out: MujocoSensorReading[] = [];
        for (let id = 0; id < modelCount(this.model, 'nsensor'); id++) {
            const name = this.objectName(OBJ_SENSOR, id);
            if (name.length === 0) continue;
            const adr = modelAt(this.model.sensor_adr, id);
            const dim = modelAt(this.model.sensor_dim, id);
            out.push({
                name,
                type: modelAt(this.model.sensor_type, id),
                values: Array.from({ length: dim }, (_, i) => Number(this.data.sensordata[adr + i])),
            });
        }
        return out;
    }

    /**
     * Advance exactly stepCount integration steps. This co-simulation entry
     * point does not round a duration or advance on a wall-clock timer.
     * Refresh derived poses, contacts and sensors at the completed frontier;
     * mj_step alone can leave those derived arrays at its pre-integration state.
     * Callers must bound batch size and timestep for their stability/work budget.
     * Any engine warning, invalid state or unexpected clock reset faults the
     * session; dispose and recreate it before publishing another frame.
     */
    stepFixed(stepCount: number, dt: number): void {
        this.assertAlive();
        if (!Number.isSafeInteger(stepCount) || stepCount < 1) {
            throw new Error('MujocoSession.stepFixed: stepCount must be a positive safe integer.');
        }
        if (!Number.isFinite(dt) || dt <= 0) {
            throw new Error('MujocoSession.stepFixed: dt must be positive and finite.');
        }
        this.model.opt.timestep = dt;
        let expectedTime = Number(this.data.time);
        try {
            this.assertStepState(expectedTime);
            for (let i = 0; i < stepCount; i++) {
                const nextTime = expectedTime + dt;
                if (!Number.isFinite(nextTime) || nextTime <= expectedTime) {
                    throw new Error('Integration timestep cannot advance the simulated clock.');
                }
                this.mujoco.mj_step(this.model, this.data);
                expectedTime = nextTime;
                this.assertStepState(expectedTime);
            }
            this.mujoco.mj_forward(this.model, this.data);
            this.assertStepState(expectedTime);
        } catch (error) {
            this.stepFailure = error instanceof Error ? error.message : String(error);
            throw new Error(`MujocoSession.stepFixed failed: ${this.stepFailure} Dispose and recreate the session.`);
        }
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
     * Read actual constraint-solver contact wrenches after forward/stepFixed.
     * Force component 0 is normal; components 1 and 2 are tangential.
     * Inactive (margin-only) contacts are explicitly marked, not counted as load.
     */
    contactWrenchesNow(): MujocoContactWrench[] {
        this.assertAlive();
        const ncon = Number(this.data.ncon);
        const contacts = this.compiledContacts();
        if (contacts.length !== ncon) throw new Error('Incomplete native contact observation.');
        if (ncon === 0) return [];
        const buffer = new this.mujoco.DoubleBuffer(6);
        try {
            return contacts.map((contact, id) => {
                const native = this.data.contact.get(id);
                const address = Number(native?.efc_address);
                if (!Number.isInteger(address) || !Number.isFinite(contact.distM)) {
                    throw new Error('Invalid native contact observation.');
                }
                const active = address >= 0;
                this.mujoco.mj_contactForce(this.model, this.data, id, buffer);
                const v = Array.from(buffer.GetView() as ArrayLike<number>);
                if (v.length !== 6 || !v.every(Number.isFinite)) {
                    throw new Error('Non-finite native contact wrench.');
                }
                return { ...contact, active, forceN: [v[0], v[1], v[2]], torqueNm: [v[3], v[4], v[5]] };
            });
        } finally {
            buffer.delete();
        }
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


    /** Reject divergence, automatic reset and stale frontiers instead of publishing them. */
    private assertStepState(expectedTime: number): void {
        const time = Number(this.data.time);
        const tolerance = 1e-10 * Math.max(1, Math.abs(expectedTime));
        if (!Number.isFinite(time) || Math.abs(time - expectedTime) > tolerance) {
            throw new Error(`Invalid simulation frontier: expected ${expectedTime}s, received ${time}s.`);
        }
        // These bindings are borrowed references into MjData, not owned handles.
        // Deleting an individual warning (or this vector) corrupts MjData.
        const warnings = this.data.warning;
        for (let id = 0; id < WARNING_NAMES.length; id++) {
            const warning = warnings.get(id);
            if (warning === undefined) throw new Error('Missing MuJoCo warning diagnostics.');
            if (Number(warning.number) > 0) {
                throw new Error(`MuJoCo ${WARNING_NAMES[id]} warning (index ${warning.lastinfo}).`);
            }
        }
        for (const field of ['qpos', 'qvel', 'qacc', 'sensordata'] as const) {
            const values = this.data[field] as ArrayLike<number>;
            for (let i = 0; i < values.length; i++) {
                const value = Number(values[i]);
                if (!Number.isFinite(value) || this.mujoco.mju_isBad(value)) {
                    throw new Error(`Invalid ${field}[${i}]=${value} at ${time}s.`);
                }
            }
        }
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
        if (this.stepFailure !== undefined) {
            throw new Error(`MujocoSession has a failed step: ${this.stepFailure} Dispose and recreate the session.`);
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
    try {
        const data = new mujoco.MjData(model);
        return new MujocoSession(mujoco, model, data, bodyOrder, jointOrder);
    } catch (error) {
        try {
            model.delete();
        } catch {
            // Preserve the construction failure if native cleanup also fails.
        }
        throw error;
    }
}
