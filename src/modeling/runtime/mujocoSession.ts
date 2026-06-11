// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mujocoSession.ts
//
// Thin wrapper around @mujoco/mujoco for the physics-loop gate.
// Lazy-loads the WASM module on first use (the binary is ~9 MB; we
// don't want it in the recompute critical path — only `validate`
// invokes it). Subsequent calls share the same Module instance.
//
// API surface (intentionally small — see plan §Task 3):
//   - loadMujocoSession(mjcfXml) → Session
//   - Session.setPose(qpos)
//   - Session.inverseDynamics() → { qfrc, finite }
//   - Session.step(seconds, dt?) → { qpos, xpos }
//   - Session.xposNow() → ReadonlyMap<bodyName, Vec3>
//   - Session.dispose()
//
// Coordinate units: MuJoCo SI throughout (radians, metres, kg, seconds).
// The MJCF emitter converts kernelCAD's mm/deg up-front; downstream
// criterion code converts back as needed for diagnostic messages.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// We type the mujoco module loosely; the d.ts file in the package is
// 3.5k lines of Embind-generated noise that adds little safety here.
// The session interface (below) is the typed surface we expose to
// criterion code.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MujocoModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MjModelHandle = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MjDataHandle = any;

let cachedModule: MujocoModule | null = null;

/**
 * Load (and cache) the WASM module. Browser code can import the package
 * directly; in Node we have to feed Emscripten the `.wasm` binary as
 * a Buffer and tell it where the loader file lives via `locateFile`.
 */
async function loadModule(): Promise<MujocoModule> {
    if (cachedModule !== null) return cachedModule;
    const require_ = createRequire(import.meta.url);
    const pkgEntry = require_.resolve('@mujoco/mujoco');
    const pkgDir = dirname(pkgEntry);
    const wasmBinary = await readFile(join(pkgDir, 'mujoco.wasm'));
    // The CLI tsconfig uses moduleResolution: Node, which doesn't
    // honor package.json `exports` maps — so a static `import` of
    // '@mujoco/mujoco' fails to resolve at build time. Importing via
    // a string variable hides the specifier from the TS resolver
    // (resolved at runtime by Node's ESM loader, which DOES honor
    // exports maps). vitest's bundler-style resolution would
    // tolerate the static form too, but going through the variable
    // makes both paths work without diverging.
    const specifier = '@mujoco/mujoco';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import(specifier)) as any;
    const factory = mod.default;
    cachedModule = await factory({
        wasmBinary,
        locateFile: (path: string) => join(pkgDir, path),
        // Silence Emscripten's print routing; criterion code surfaces
        // its own diagnostics.
        print: () => undefined,
        printErr: () => undefined,
    });
    return cachedModule;
}

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
     * MJCF `<option>` default). Returns final qpos + world body
     * positions. Used by criterion 6 (drop-on-release).
     */
    step(seconds: number, dt = 0.001): { qpos: number[]; xpos: Map<string, [number, number, number]> } {
        this.assertAlive();
        // Force the integrator timestep to our explicit dt; MuJoCo's
        // default is 2 ms which is fine but we want determinism.
        this.model.opt.timestep = dt;
        const steps = Math.max(1, Math.round(seconds / dt));
        for (let i = 0; i < steps; i++) {
            this.mujoco.mj_step(this.model, this.data);
        }
        const qpos = Array.from(this.data.qpos as ArrayLike<number>);
        return { qpos, xpos: this.xposNow() };
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

    /** Run forward kinematics + dynamics population (no integration). */
    forward(): void {
        this.assertAlive();
        this.mujoco.mj_forward(this.model, this.data);
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
 * @param mjcfXml — the MJCF string (from `assemblyToMjcf`).
 * @param bodyOrder / jointOrder — emitter-side ordering, so the session
 *   can translate index → name without re-parsing the XML.
 */
export async function loadMujocoSession(
    mjcfXml: string,
    bodyOrder: readonly string[],
    jointOrder: readonly { mjcfName: string; mateName: string }[],
): Promise<MujocoSession> {
    const mujoco = await loadModule();
    const model = mujoco.MjModel.from_xml_string(mjcfXml);
    const data = new mujoco.MjData(model);
    return new MujocoSession(mujoco, model, data, bodyOrder, jointOrder);
}
