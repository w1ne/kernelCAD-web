// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P2 capture-time validation for fastener/fit metadata on a fastened mate.
// Kept out of assemblyJoints.ts so the mate API file stays inside its size
// budget; the record builder only copies already-validated fields.
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { parseConnectorRef, type FastenerMateMetadata, type FitMateMetadata, type MateRecord } from '../mates/mate';
import type { MateType } from '../mates/mateTypes';
import { normalizeToolEnvelope } from '../runtime/assemblyFastener';

export interface FastenerMateOptionsFields {
    fastener?: FastenerMateMetadata;
    fit?: FitMateMetadata;
}

function mateEndpoints(aRef: string, bRef: string): Set<string> {
    return new Set([parseConnectorRef(aRef).partName, parseConnectorRef(bRef).partName]);
}

function assertFastenerAxis(value: unknown, path: string, name: string): void {
    if (value === undefined) return;
    if (!Array.isArray(value) || value.length !== 3 || !value.every(n => typeof n === 'number' && Number.isFinite(n))
        || !(Math.hypot(value[0], value[1], value[2]) > 0)) {
        invalidArgs({
            api: `mate('${name}', aRef, bRef, 'fastened', { ${path} })`,
            path,
            got: value,
            requires: 'a finite nonzero [x, y, z] removal/approach axis in the named part frame',
            example: "arm.mate('bolt', 'bolt.head-bearing', 'cover.hole-a', 'fastened', { fastener: { part: 'bolt', axis: [0, 0, 1], pitchMm: 0.5 } })",
        });
    }
}

function assertFastenerPart(name: string, part: string | undefined, endpoints: Set<string>, path: string): void {
    if (part !== undefined && !endpoints.has(part)) {
        invalidArgs({
            api: `mate('${name}', aRef, bRef, 'fastened', { ${path} })`,
            path,
            got: part,
            requires: `one of the mate's part endpoints: ${[...endpoints].join(', ')}`,
            example: "arm.mate('bolt', 'bolt.head-bearing', 'cover.hole-a', 'fastened', { fastener: { part: 'bolt', axis: [0, 0, 1], pitchMm: 0.5 } })",
        });
    }
}

function assertFastenerPitch(name: string, pitchMm: number | undefined): void {
    if (pitchMm !== undefined && (!(typeof pitchMm === 'number') || !Number.isFinite(pitchMm) || pitchMm <= 0)) {
        invalidArgs({
            api: `mate('${name}', aRef, bRef, 'fastened', { fastener: { pitchMm } })`,
            path: 'opts.fastener.pitchMm',
            got: pitchMm,
            requires: 'a positive finite mm-per-revolution pitch (omit it to use the catalog coarse pitch)',
            example: "arm.mate('bolt', 'bolt.head-bearing', 'cover.hole-a', 'fastened', { fastener: { part: 'bolt', axis: [0, 0, 1], pitchMm: 0.5 } })",
        });
    }
}

function assertFastenerHandedness(name: string, handedness: 'right' | 'left' | undefined): void {
    if (handedness !== undefined && handedness !== 'right' && handedness !== 'left') {
        invalidArgs({
            api: `mate('${name}', aRef, bRef, 'fastened', { fastener: { handedness } })`,
            path: 'opts.fastener.handedness',
            got: handedness,
            requires: "'right' or 'left' (omit for the ISO metric right-hand default)",
            example: "arm.mate('bolt', 'bolt.head-bearing', 'cover.hole-a', 'fastened', { fastener: { part: 'bolt', axis: [0, 0, 1], pitchMm: 0.5, handedness: 'right' } })",
        });
    }
}

function validateFastenerOptions(name: string, opts: FastenerMateOptionsFields, endpoints: Set<string>): void {
    if (opts.fastener === undefined) return;
    assertFastenerAxis(opts.fastener.axis, 'fastener.axis', name);
    assertFastenerPart(name, opts.fastener.part, endpoints, 'opts.fastener.part');
    assertFastenerPitch(name, opts.fastener.pitchMm);
    assertFastenerHandedness(name, opts.fastener.handedness);
    if (opts.fastener.tool !== undefined && opts.fastener.tool !== null)
        normalizeToolEnvelope(opts.fastener.tool, 'opts.fastener.tool');
}

function validateFitOptions(name: string, opts: FastenerMateOptionsFields, endpoints: Set<string>): void {
    if (opts.fit === undefined) return;
    if (opts.fit.kind !== 'press' && opts.fit.kind !== 'snap') {
        invalidArgs({
            api: `mate('${name}', aRef, bRef, 'fastened', { fit: { kind } })`,
            path: 'opts.fit.kind',
            got: opts.fit.kind,
            requires: "'press' or 'snap'",
            example: "arm.mate('gear', 'shaft.seat', 'gear.bore', 'fastened', { fit: { kind: 'press', part: 'gear' } })",
        });
    }
    assertFastenerPart(name, opts.fit.part, endpoints, 'opts.fit.part');
    assertFastenerAxis(opts.fit.axis, 'fit.axis', name);
}

/** Validate the P2 metadata on a fastened mate. A fastener or fit on a moving
 *  mate is ambiguous, so both are refused outside `fastened`. */
export function validateFastenerMateMetadata(
    name: string,
    type: MateType,
    aRef: string,
    bRef: string,
    opts: FastenerMateOptionsFields | undefined,
): void {
    if (opts?.fastener === undefined && opts?.fit === undefined) return;
    if (type !== 'fastened') {
        invalidArgs({
            api: `mate('${name}', aRef, bRef, '${type}', { fastener | fit })`,
            path: opts.fastener !== undefined ? 'opts.fastener' : 'opts.fit',
            gotText: `P2 fastener/fit metadata on a '${type}' mate`,
            requires: "a 'fastened' mate — helical removal and press/snap fits describe a fixed joint",
            example: "arm.mate('bolt', 'bolt.head-bearing', 'cover.hole-a', 'fastened', { fastener: { part: 'bolt', axis: [0, 0, 1], pitchMm: 0.5 } })",
        });
    }
    const endpoints = mateEndpoints(aRef, bRef);
    validateFastenerOptions(name, opts, endpoints);
    validateFitOptions(name, opts, endpoints);
}

export function fastenerRecordOf(opts: FastenerMateOptionsFields | undefined): Pick<MateRecord, 'fastener'> | Record<string, never> {
    if (opts?.fastener === undefined) return {};
    return {
        fastener: {
            ...opts.fastener,
            ...(opts.fastener.tool !== undefined && opts.fastener.tool !== null
                ? { tool: normalizeToolEnvelope(opts.fastener.tool, 'opts.fastener.tool') }
                : {}),
        },
    };
}

export function fitRecordOf(opts: FastenerMateOptionsFields | undefined): Pick<MateRecord, 'fit'> | Record<string, never> {
    return opts?.fit === undefined ? {} : { fit: { ...opts.fit } };
}
