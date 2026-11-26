// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { MujocoSession, MujocoScalarJointState } from './mujocoSessionCore';

export interface ContactPairRequirement {
    readonly bodies: readonly [string, string];
    /** Minimum number of distinct load-bearing contact episodes. */
    readonly minEpisodes: number;
    readonly maxPenetrationMm: number;
    readonly maxNormalForceN?: number;
    /** Ignore contacts at or below this normal load. */
    readonly minNormalForceN?: number;
}

export interface ContactModel {
    readonly friction: readonly [number, number, number];
    /** Positive contact time constant (s) and damping ratio. */
    readonly solref: readonly [number, number];
    /** Impedance lower/upper values and transition width (m). */
    readonly solimp: readonly [number, number, number];
}

export interface ContactDynamicsInput {
    readonly steps: number;
    readonly dtSeconds: number;
    /** Constant externally applied efforts, named compiled scalar joints (N or N·m). */
    readonly efforts: Readonly<Record<string, number>>;
    readonly pairs: readonly ContactPairRequirement[];
    readonly contactModel?: ContactModel;
    /** Ordered load-bearing onsets; indices reference pairs. Start order is explicit. */
    readonly sequence?: { readonly order: readonly number[]; readonly minCycles: number };
}

export interface ContactPairResult {
    readonly bodies: readonly [string, string];
    readonly episodes: number;
    readonly contactSteps: number;
    readonly peakNormalForceN: number;
    readonly maxPenetrationMm: number;
    readonly firstContactSeconds: number | null;
    readonly lastContactSeconds: number | null;
    readonly ok: boolean;
}

export interface ContactDynamicsResult {
    readonly ok: boolean;
    readonly steps: number;
    readonly dtSeconds: number;
    readonly durationSeconds: number;
    readonly initialJoints: readonly MujocoScalarJointState[];
    readonly finalJoints: readonly MujocoScalarJointState[];
    readonly pairs: readonly ContactPairResult[];
    readonly contactSequence?: { readonly cycles: number; readonly unexpectedOnsets: number; readonly ok: boolean };
}

const MAX_STEPS = 20000;
const positive = (n: number): boolean => Number.isFinite(n) && n > 0;
const nonnegative = (n: number): boolean => Number.isFinite(n) && n >= 0;

export function validateContactDynamicsInput(input: ContactDynamicsInput): void {
    if (!input || typeof input !== 'object') throw new Error('Missing dynamics input.');
    if (!Number.isSafeInteger(input.steps) || input.steps < 1 || input.steps > MAX_STEPS ||
        !positive(input.dtSeconds) || input.dtSeconds > 0.01) {
        throw new Error('Dynamics requires 1–20000 steps and a positive timestep of at most 0.01 s.');
    }
    if (input.efforts === null || typeof input.efforts !== 'object' ||
        Array.isArray(input.efforts) || Object.keys(input.efforts).length > 32 ||
        !Object.values(input.efforts).every(Number.isFinite)) {
        throw new Error('Dynamics efforts must be a named finite scalar effort map.');
    }
    if (!Array.isArray(input.pairs) || input.pairs.length === 0 || input.pairs.length > 32) {
        throw new Error('Dynamics requires 1–32 explicit contact pair requirements.');
    }
    const seen = new Set<string>();
    for (const pair of input.pairs) {
        if (!pair || !Array.isArray(pair.bodies) || pair.bodies.length !== 2 ||
            pair.bodies.some((name: string) => typeof name !== 'string' || name.length === 0) ||
            pair.bodies[0] === pair.bodies[1] ||
            !Number.isSafeInteger(pair.minEpisodes) || pair.minEpisodes < 0 ||
            !nonnegative(pair.maxPenetrationMm) ||
            (pair.maxNormalForceN !== undefined && !nonnegative(pair.maxNormalForceN)) ||
            (pair.minNormalForceN !== undefined && !nonnegative(pair.minNormalForceN))) {
            throw new Error('Invalid contact pair requirement.');
        }
        const key = pairKey(pair.bodies[0], pair.bodies[1]);
        if (seen.has(key)) throw new Error('Duplicate contact pair requirement.');
        seen.add(key);
    }
    const model = input.contactModel;
    if (model !== undefined && (!model ||
        !Array.isArray(model.friction) || model.friction.length !== 3 || !model.friction.every(nonnegative) ||
        !Array.isArray(model.solref) || model.solref.length !== 2 || !model.solref.every(positive) ||
        model.solref[0] < 2 * input.dtSeconds ||
        !Array.isArray(model.solimp) || model.solimp.length !== 3 || !model.solimp.every(positive) ||
        model.solimp[0] > model.solimp[1] || model.solimp[1] >= 1)) {
        throw new Error('Invalid contact model: friction, positive solref (time constant >= 2 dt), and ordered solimp values below 1 required.');
    }
    const sequence = input.sequence;
    if (sequence !== undefined && (!sequence || !Array.isArray(sequence.order) ||
        sequence.order.length < 2 || sequence.order.length > 32 ||
        !sequence.order.every((index: number) => Number.isSafeInteger(index) && index >= 0 && index < input.pairs.length) ||
        new Set(sequence.order).size !== sequence.order.length ||
        !Number.isSafeInteger(sequence.minCycles) || sequence.minCycles < 1)) {
        throw new Error('Invalid contact sequence requirement.');
    }
}

function pairKey(a: string, b: string): string {
    return JSON.stringify([a, b].sort());
}

function accumulator(requirement: ContactPairRequirement) {
    return { requirement, episodes: 0, contactSteps: 0, peakNormalForceN: 0,
        maxPenetrationMm: 0, firstContactSeconds: null as number | null,
        lastContactSeconds: null as number | null, previousLoaded: false };
}

/** Run without position control. Check every integration frontier, not animation samples.
 * These are model-based rigid-contact results, not material/contact stress or hardware acceptance. */
export function runContactDynamics(session: MujocoSession, input: ContactDynamicsInput): ContactDynamicsResult {
    validateContactDynamicsInput(input);
    const geoms = session.compiledGeoms();
    const bodies = new Set(geoms.filter((geom) => geom.contype !== 0 || geom.conaffinity !== 0).map((geom) => geom.body));
    const keys = input.pairs.map((pair) => pairKey(...pair.bodies));
    const accumulators = new Map(input.pairs.map((pair, index) => [keys[index], accumulator(pair)]));
    for (const pair of input.pairs) {
        if (!pair.bodies.every((body) => bodies.has(body))) throw new Error('Requested contact body has no collision geom.');
    }
    session.assertExternalJointOwnership(Object.keys(input.efforts));
    session.setJointEfforts(input.efforts);
    session.forward();
    const start = session.timeSeconds;
    const initialJoints = session.scalarJointStatesNow();
    let sequenceIndex = 0, cycles = 0, unexpectedOnsets = 0;
    const sequenceOrder = input.sequence?.order.map((index) => keys[index]);
    // The t=0 solver frontier is checked too: an initial overlap cannot hide.
    for (let step = 0; step <= input.steps; step++) {
        if (step > 0) session.stepFixed(1, input.dtSeconds);
        const normalLoads = new Map<string, number>();
        for (const contact of session.contactWrenchesNow()) {
            const key = pairKey(contact.bodyA, contact.bodyB);
            const acc = accumulators.get(key);
            if (!acc) continue;
            acc.maxPenetrationMm = Math.max(acc.maxPenetrationMm, -1000 * contact.distM);
            if (contact.active) normalLoads.set(key, (normalLoads.get(key) ?? 0) + Math.max(0, contact.forceN[0]));
        }
        const onsets: string[] = [];
        for (const [key, acc] of accumulators) {
            const force = normalLoads.get(key) ?? 0;
            acc.peakNormalForceN = Math.max(acc.peakNormalForceN, force);
            const loaded = force > (acc.requirement.minNormalForceN ?? 1e-6);
            if (loaded) {
                if (!acc.previousLoaded) {
                    acc.episodes++;
                    onsets.push(key);
                }
                if (step > 0) acc.contactSteps++;
                const time = session.timeSeconds - start;
                acc.firstContactSeconds ??= time;
                acc.lastContactSeconds = time;
            }
            acc.previousLoaded = loaded;
        }
        if (sequenceOrder !== undefined) {
            const relevant = onsets.filter((key) => sequenceOrder.includes(key));
            // Simultaneous onsets have no provable order at this timestep.
            if (relevant.length > 1) unexpectedOnsets += relevant.length;
            else if (relevant.length === 1) {
                if (relevant[0] !== sequenceOrder[sequenceIndex]) unexpectedOnsets++;
                else if (++sequenceIndex === sequenceOrder.length) {
                    cycles++;
                    sequenceIndex = 0;
                }
            }
        }
    }
    const pairs = [...accumulators.values()].map((acc) => ({
        bodies: acc.requirement.bodies,
        episodes: acc.episodes,
        contactSteps: acc.contactSteps,
        peakNormalForceN: acc.peakNormalForceN,
        maxPenetrationMm: acc.maxPenetrationMm,
        firstContactSeconds: acc.firstContactSeconds,
        lastContactSeconds: acc.lastContactSeconds,
        ok: acc.episodes >= acc.requirement.minEpisodes &&
            acc.maxPenetrationMm <= acc.requirement.maxPenetrationMm &&
            acc.peakNormalForceN <= (acc.requirement.maxNormalForceN ?? Infinity),
    }));
    const sequence = input.sequence === undefined ? undefined : {
        cycles, unexpectedOnsets, ok: cycles >= input.sequence.minCycles && unexpectedOnsets === 0,
    };
    return { ok: pairs.every((pair) => pair.ok) && (sequence?.ok ?? true), steps: input.steps, dtSeconds: input.dtSeconds,
        durationSeconds: session.timeSeconds - start, initialJoints,
        finalJoints: session.scalarJointStatesNow(), pairs, ...(sequence === undefined ? {} : { contactSequence: sequence }) };
}
