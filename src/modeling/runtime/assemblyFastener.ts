// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P2 — declared fastener motion and tool envelopes. This module deliberately
// holds only metadata + validation: the geometry that sweeps a tool or a
// helical path lives in `assemblyPath.ts`, and the S2 adapter lives in
// `requirements/assemblyLedger.ts`.
import type { Vec3 } from '../../shared/intent/types';

/** A screw's thread hand. Right-hand is the ISO metric default. */
export type FastenerHandedness = 'right' | 'left';

export type ToolEnvelopeKind = 'cylinder' | 'cone';

/** The swept volume a driver/socket/hex key needs along the approach axis.
 *  It starts at the fastener's outermost face and extends outward. */
export interface ToolEnvelope {
    kind: ToolEnvelopeKind;
    /** Length along the approach axis, outward from the fastener. */
    lengthMm: number;
    /** Widest diameter (the tool body at the outside end). */
    diameterMm: number;
    /** Cone only: diameter at the fastener end. Defaults to 0 (a point). */
    tipDiameterMm?: number;
    /** Human/tool identity, e.g. `hex-key`, `socket`, `driver`. */
    label?: string;
    /** Declared standard the default came from, when it was not explicit. */
    standard?: string;
}

/** Fastened-mate metadata that lets the planner test a helical removal. */
export interface FastenerMotionInput {
    /** Removal/approach axis in the fastener mesh's own frame. */
    axis: Vec3;
    /** ISO 261 coarse pitch, mm per revolution. */
    pitchMm: number;
    handedness?: FastenerHandedness;
    /** Axial length that must unthread before the short free translation.
     *  Defaults to the fastener's own axial span. */
    threadLengthMm?: number;
    standard?: string;
    /** Explicit envelope. `null` means "this fastener has no modelled tool". */
    tool?: ToolEnvelope | null;
}

/** A press or snap fit is declared, never simulated by the rigid planner. */
export type FitKind = 'press' | 'snap';

export interface FitInput {
    kind: FitKind;
    /** Removal/approach axis in the part mesh's own frame. */
    axis?: Vec3;
}

/** Normalized, immutable form stored in the planner. */
export interface FastenerMotion {
    axis: Vec3;
    pitchMm: number;
    handedness: FastenerHandedness;
    threadLengthMm?: number;
    standard?: string;
    tool?: ToolEnvelope;
}

const EPS = 1e-12;

function finitePositive(value: number): boolean {
    return Number.isFinite(value) && value > 0;
}

function normalizedAxis(axis: readonly number[]): Vec3 | undefined {
    if (!Array.isArray(axis) || axis.length !== 3 || !axis.every(Number.isFinite))
        return undefined;
    const length = Math.hypot(axis[0], axis[1], axis[2]);
    if (!(length > EPS) || !Number.isFinite(length))
        return undefined;
    return [axis[0] / length, axis[1] / length, axis[2] / length];
}

function assertObject(value: unknown, where: string): void {
    if (!value || typeof value !== 'object')
        throw new Error(`${where} must be an object.`);
}
function assertPositive(value: number, where: string): void {
    if (!finitePositive(value))
        throw new Error(`${where} must be a positive finite number.`);
}
function assertOptionalPositive(value: number | undefined, where: string): void {
    if (value !== undefined && !finitePositive(value))
        throw new Error(`${where} must be a positive finite number.`);
}
function assertOptionalNonempty(value: string | undefined, where: string): void {
    if (value !== undefined && (typeof value !== 'string' || !value))
        throw new Error(`${where} must be a nonempty string.`);
}
function assertHandedness(value: FastenerHandedness | undefined, where: string): void {
    if (value !== undefined && value !== 'right' && value !== 'left')
        throw new Error(`${where} must be 'right' or 'left'.`);
}
function validateFastenerFields(input: FastenerMotionInput, where: string): Vec3 {
    assertObject(input, where);
    const axis = normalizedAxis(input.axis);
    if (!axis)
        throw new Error(`${where}.axis must be a finite nonzero [x, y, z] vector.`);
    assertPositive(input.pitchMm, `${where}.pitchMm`);
    assertHandedness(input.handedness, `${where}.handedness`);
    assertOptionalPositive(input.threadLengthMm, `${where}.threadLengthMm`);
    assertOptionalNonempty(input.standard, `${where}.standard`);
    return axis;
}
/** Validate and normalize a declared fastener. Throws on malformed input. */
export function normalizeFastenerMotion(input: FastenerMotionInput, where = 'fastener'): FastenerMotion {
    const axis = validateFastenerFields(input, where);
    const tool = input.tool === undefined || input.tool === null
        ? undefined
        : normalizeToolEnvelope(input.tool, `${where}.tool`);
    return {
        axis,
        pitchMm: input.pitchMm,
        handedness: input.handedness ?? 'right',
        ...(input.threadLengthMm !== undefined ? { threadLengthMm: input.threadLengthMm } : {}),
        ...(input.standard !== undefined ? { standard: input.standard } : {}),
        ...(tool !== undefined ? { tool } : {}),
    };
}
function assertToolKind(kind: ToolEnvelope['kind'], where: string): void {
    if (kind !== 'cylinder' && kind !== 'cone')
        throw new Error(`${where}.kind must be 'cylinder' or 'cone'.`);
}
function assertConeTip(kind: ToolEnvelope['kind'], tip: number | undefined, diameter: number, where: string): void {
    if (tip !== undefined && (!Number.isFinite(tip) || tip < 0))
        throw new Error(`${where}.tipDiameterMm must be a finite nonnegative number.`);
    if (kind === 'cylinder' && tip !== undefined && Math.abs(tip - diameter) > EPS)
        throw new Error(`${where}.tipDiameterMm only applies to a cone envelope.`);
}
/** Validate and normalize an explicit tool envelope. */
export function normalizeToolEnvelope(input: ToolEnvelope, where = 'tool'): ToolEnvelope {
    assertObject(input, where);
    assertToolKind(input.kind, where);
    assertPositive(input.lengthMm, `${where}.lengthMm`);
    assertPositive(input.diameterMm, `${where}.diameterMm`);
    assertConeTip(input.kind, input.tipDiameterMm, input.diameterMm, where);
    assertOptionalNonempty(input.label, `${where}.label`);
    assertOptionalNonempty(input.standard, `${where}.standard`);
    return {
        kind: input.kind,
        lengthMm: input.lengthMm,
        diameterMm: input.diameterMm,
        ...(input.tipDiameterMm !== undefined ? { tipDiameterMm: input.tipDiameterMm } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.standard !== undefined ? { standard: input.standard } : {}),
    };
}
export function normalizeFit(input: FitInput | FitKind, where = 'fit'): FitInput {
    const raw: FitInput = typeof input === 'string' ? { kind: input } : input;
    if (!raw || (raw.kind !== 'press' && raw.kind !== 'snap'))
        throw new Error(`${where}.kind must be 'press' or 'snap'.`);
    if (raw.axis === undefined)
        return { kind: raw.kind };
    const axis = normalizedAxis(raw.axis);
    if (!axis)
        throw new Error(`${where}.axis must be a finite nonzero [x, y, z] vector.`);
    return { kind: raw.kind, axis };
}

/** Hex-key across-flats sizes (ISO 4762 / 7380 / 10642 / 4026). */
const SOCKET_ACROSS_FLATS: Readonly<Record<string, number>> = {
    M2: 1.5, M2_5: 2, M3: 2.5, M4: 3, M5: 4, M6: 5,
    M8: 6, M10: 8, M12: 10, M16: 14, M20: 17,
};

/** Hex-head across flats (ISO 4017) and nut across flats (ISO 4032). */
const HEX_ACROSS_FLATS: Readonly<Record<string, number>> = {
    M3: 5.5, M4: 7, M5: 8, M6: 10, M8: 13,
    M10: 16, M12: 18, M16: 24, M20: 30,
};

function toolFamily(input: { family?: string; standard?: string }): 'socket' | 'hex' | 'none' {
    const family = input.family ?? '';
    const standard = input.standard ?? '';
    if (/(socket-head|button-head|flat-head|countersunk|set-screw)/i.test(family) || /(4762|7380|10642|4026)/.test(standard))
        return 'socket';
    if (/(hex-head|hex-nut|lock-nut|nut)/i.test(family) || /(4017|4032|985)/.test(standard))
        return 'hex';
    return 'none';
}
function hexKeyEnvelope(acrossFlats: number | undefined, standard: string): ToolEnvelope | undefined {
    if (acrossFlats === undefined || !finitePositive(acrossFlats))
        return undefined;
    return {
        kind: 'cylinder',
        lengthMm: 40,
        diameterMm: Math.max(acrossFlats + 2, acrossFlats * 1.5),
        label: 'hex-key',
        ...(standard ? { standard } : {}),
    };
}
function socketEnvelope(acrossFlats: number | undefined, standard: string): ToolEnvelope | undefined {
    if (acrossFlats === undefined || !finitePositive(acrossFlats))
        return undefined;
    return {
        kind: 'cylinder',
        lengthMm: 40,
        diameterMm: acrossFlats + 6,
        label: 'socket',
        ...(standard ? { standard } : {}),
    };
}
/** Default tool envelopes by catalog family/standard. These are clearance
 *  envelopes, not certified tool drawings: a hex key is a cylinder of the
 *  key's shaft plus working clearance; a socket is a cylinder around the
 *  across-flats size. Return `undefined` for a family whose tool is not
 *  modelled, so the planner never invents a pass/fail. */
export function defaultToolEnvelope(input: {
    family?: string;
    standard?: string;
    thread?: string;
    acrossFlatsMm?: number;
}): ToolEnvelope | undefined {
    const thread = (input.thread ?? '').replace('.', '_');
    const standard = input.standard ?? '';
    const family = toolFamily(input);
    if (family === 'socket')
        return hexKeyEnvelope(input.acrossFlatsMm ?? SOCKET_ACROSS_FLATS[thread], standard);
    if (family === 'hex')
        return socketEnvelope(input.acrossFlatsMm ?? HEX_ACROSS_FLATS[thread], standard);
    return undefined;
}
