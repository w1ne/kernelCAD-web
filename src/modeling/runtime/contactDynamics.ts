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
    /** Ordered load-bearing onsets; indices reference pairs. Start order is explicit. */
    readonly sequence?: { readonly order: readonly number[]; readonly minCycles: number };
}

/** Contact material is applied during CAD-to-MJCF compilation, before the native run. */
export interface ContactDynamicsStudyInput extends ContactDynamicsInput {
    readonly contactModel?: ContactModel;
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

function validateEfforts(efforts: Readonly<Record<string, number>>): void {
    if (!efforts || typeof efforts !== 'object' || Array.isArray(efforts) ||
        Object.keys(efforts).length > 32 || !Object.values(efforts).every(Number.isFinite)) {
        throw new Error('Dynamics efforts must be a named finite scalar effort map.');
    }
}

function validateContactPair(pair: ContactPairRequirement): void {
    if (!pair || !Array.isArray(pair.bodies) || pair.bodies.length !== 2 ||
        pair.bodies.some((name: string) => typeof name !== 'string' || name.length === 0) ||
        pair.bodies[0] === pair.bodies[1]) {
        throw new Error('Contact pair requires two distinct named bodies.');
    }
    if (!Number.isSafeInteger(pair.minEpisodes) || pair.minEpisodes < 0 ||
        !nonnegative(pair.maxPenetrationMm) ||
        (pair.maxNormalForceN !== undefined && !nonnegative(pair.maxNormalForceN)) ||
        (pair.minNormalForceN !== undefined && !nonnegative(pair.minNormalForceN))) {
        throw new Error('Invalid contact pair requirement.');
    }
}

function validateContactPairs(pairs: readonly ContactPairRequirement[]): void {
    if (!Array.isArray(pairs) || pairs.length === 0 || pairs.length > 32) {
        throw new Error('Dynamics requires 1–32 explicit contact pair requirements.');
    }
    const seen = new Set<string>();
    for (const pair of pairs) {
        validateContactPair(pair);
        const key = pairKey(pair.bodies[0], pair.bodies[1]);
        if (seen.has(key)) throw new Error('Duplicate contact pair requirement.');
        seen.add(key);
    }
}

function numericTuple(value: unknown, length: number, accepts: (n: number) => boolean): value is number[] {
    return Array.isArray(value) && value.length === length && value.every(accepts);
}

/** Compile-time configuration; a running native session retains its compiled contact parameters. */
export function validateContactModel(model: ContactModel | undefined, dtSeconds: number): void {
    if (model === undefined) return;
    if (!model || !numericTuple(model.friction, 3, nonnegative) ||
        !numericTuple(model.solref, 2, positive) || model.solref[0] < 2 * dtSeconds ||
        !numericTuple(model.solimp, 3, positive) || model.solimp[0] > model.solimp[1] || model.solimp[1] >= 1) {
        throw new Error('Invalid contact model: friction, positive solref (time constant >= 2 dt), and ordered solimp values below 1 required.');
    }
}

function validateSequence(sequence: ContactDynamicsInput['sequence'], pairCount: number): void {
    if (sequence === undefined) return;
    if (!sequence || !Array.isArray(sequence.order) || sequence.order.length < 2 || sequence.order.length > 32 ||
        !sequence.order.every((index: number) => Number.isSafeInteger(index) && index >= 0 && index < pairCount) ||
        new Set(sequence.order).size !== sequence.order.length ||
        !Number.isSafeInteger(sequence.minCycles) || sequence.minCycles < 1) {
        throw new Error('Invalid contact sequence requirement.');
    }
}

export function validateContactDynamicsInput(input: ContactDynamicsInput): void {
    if (!input || typeof input !== 'object') throw new Error('Missing dynamics input.');
    if (!Number.isSafeInteger(input.steps) || input.steps < 1 || input.steps > MAX_STEPS ||
        !positive(input.dtSeconds) || input.dtSeconds > 0.01) {
        throw new Error('Dynamics requires 1–20000 steps and a positive timestep of at most 0.01 s.');
    }
    validateEfforts(input.efforts);
    validateContactPairs(input.pairs);
    validateSequence(input.sequence, input.pairs.length);
}

export function validateContactDynamicsStudyInput(input: ContactDynamicsStudyInput): void {
    validateContactDynamicsInput(input);
    validateContactModel(input.contactModel, input.dtSeconds);
}

function pairKey(a: string, b: string): string {
    return JSON.stringify([a, b].sort());
}

function accumulator(requirement: ContactPairRequirement) {
    return { requirement, episodes: 0, contactSteps: 0, peakNormalForceN: 0,
        maxPenetrationMm: 0, firstContactSeconds: null as number | null,
        lastContactSeconds: null as number | null, previousLoaded: false };
}

type ContactAccumulator = ReturnType<typeof accumulator>;

function contactLoads(session: MujocoSession, accumulators: ReadonlyMap<string, ContactAccumulator>): Map<string, number> {
    const normalLoads = new Map<string, number>();
    for (const contact of session.contactWrenchesNow()) {
        const key = pairKey(contact.bodyA, contact.bodyB);
        const acc = accumulators.get(key);
        if (!acc) continue;
        acc.maxPenetrationMm = Math.max(acc.maxPenetrationMm, -1000 * contact.distM);
        if (contact.active) normalLoads.set(key, (normalLoads.get(key) ?? 0) + Math.max(0, contact.forceN[0]));
    }
    return normalLoads;
}

function observeContacts(accumulators: ReadonlyMap<string, ContactAccumulator>, loads: ReadonlyMap<string, number>,
    time: number, countStep: boolean): string[] {
    const onsets: string[] = [];
    for (const [key, acc] of accumulators) {
        const force = loads.get(key) ?? 0;
        acc.peakNormalForceN = Math.max(acc.peakNormalForceN, force);
        const loaded = force > (acc.requirement.minNormalForceN ?? 1e-6);
        if (loaded) {
            if (!acc.previousLoaded) {
                acc.episodes++;
                onsets.push(key);
            }
            if (countStep) acc.contactSteps++;
            acc.firstContactSeconds ??= time;
            acc.lastContactSeconds = time;
        }
        acc.previousLoaded = loaded;
    }
    return onsets;
}

interface SequenceAccumulator {
    order: readonly string[];
    index: number;
    cycles: number;
    unexpectedOnsets: number;
}

function observeSequence(state: SequenceAccumulator, onsets: readonly string[]): void {
    const relevant = onsets.filter((key) => state.order.includes(key));
    // Simultaneous onsets have no provable order at this timestep.
    if (relevant.length > 1) state.unexpectedOnsets += relevant.length;
    else if (relevant.length === 1) {
        if (relevant[0] !== state.order[state.index]) state.unexpectedOnsets++;
        else if (++state.index === state.order.length) {
            state.cycles++;
            state.index = 0;
        }
    }
}

function contactPairResult(acc: ContactAccumulator): ContactPairResult {
    return {
        bodies: acc.requirement.bodies, episodes: acc.episodes, contactSteps: acc.contactSteps,
        peakNormalForceN: acc.peakNormalForceN, maxPenetrationMm: acc.maxPenetrationMm,
        firstContactSeconds: acc.firstContactSeconds, lastContactSeconds: acc.lastContactSeconds,
        ok: acc.episodes >= acc.requirement.minEpisodes &&
            acc.maxPenetrationMm <= acc.requirement.maxPenetrationMm &&
            acc.peakNormalForceN <= (acc.requirement.maxNormalForceN ?? Infinity),
    };
}

function assertContactBodies(session: MujocoSession, pairs: readonly ContactPairRequirement[]): void {
    const bodies = new Set(session.compiledGeoms().filter((geom) => geom.contype !== 0 || geom.conaffinity !== 0).map((geom) => geom.body));
    for (const pair of pairs) {
        if (!pair.bodies.every((body) => bodies.has(body))) throw new Error('Requested contact body has no collision geom.');
    }
}

/** Run without position control. Check every integration frontier, not animation samples.
 * Contact parameters belong to the compiled session; compile with the study's contactModel first.
 * These are model-based rigid-contact results, not material/contact stress or hardware acceptance. */
export function runContactDynamics(session: MujocoSession, input: ContactDynamicsInput): ContactDynamicsResult {
    validateContactDynamicsInput(input);
    assertContactBodies(session, input.pairs);
    // Every coordinate must remain free of hidden native position/velocity controllers.
    session.assertNoActuators();
    session.assertExternalJointOwnership(Object.keys(input.efforts));
    session.setJointEfforts(input.efforts);
    session.forward(input.dtSeconds);
    const start = session.timeSeconds;
    const initialJoints = session.scalarJointStatesNow();
    const keys = input.pairs.map((pair) => pairKey(...pair.bodies));
    const accumulators = new Map(input.pairs.map((pair, index) => [keys[index], accumulator(pair)]));
    const sequenceState: SequenceAccumulator | undefined = input.sequence === undefined ? undefined : {
        order: input.sequence.order.map((index) => keys[index]), index: 0, cycles: 0, unexpectedOnsets: 0,
    };
    // The t=0 solver frontier uses the requested timestep too: initial overlaps cannot hide.
    for (let step = 0; step <= input.steps; step++) {
        if (step > 0) session.stepFixed(1, input.dtSeconds);
        const loads = contactLoads(session, accumulators);
        const onsets = observeContacts(accumulators, loads, session.timeSeconds - start, step > 0);
        if (sequenceState) observeSequence(sequenceState, onsets);
    }
    const pairs = [...accumulators.values()].map(contactPairResult);
    const sequence = sequenceState === undefined ? undefined : {
        cycles: sequenceState.cycles, unexpectedOnsets: sequenceState.unexpectedOnsets,
        ok: sequenceState.cycles >= input.sequence!.minCycles && sequenceState.unexpectedOnsets === 0,
    };
    return { ok: pairs.every((pair) => pair.ok) && (sequence?.ok ?? true), steps: input.steps, dtSeconds: input.dtSeconds,
        durationSeconds: session.timeSeconds - start, initialJoints,
        finalJoints: session.scalarJointStatesNow(), pairs, ...(sequence === undefined ? {} : { contactSequence: sequence }) };
}
