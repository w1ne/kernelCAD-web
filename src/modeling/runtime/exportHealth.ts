// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/exportHealth.ts
//
// MJCF/URDF export health. Exports the assembly, compiles the MJCF, runs
// forward at qpos0, and compares the compiled model with the CAD solid.
// qpos0 is the authored mate pose: scalar joints use `ref`, and a ball
// joint's Euler triple is the child body quaternion. Contacts, geom bits,
// and joint ranges come from the compiled model, not from XML text. A
// compiled contact is a collision-geometry artefact only when the CAD
// solids are clear: overlap at or below 0.01 mm³ and clearance greater
// than 0.01 mm. Zero or missing clearance stays a finding.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { MassProperties } from '../../kernel/properties/massProperties';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { urdfSerialize } from '../export/urdf/urdfSerializer';
import { URDF_DEFAULT_DENSITY_KG_M3 } from '../export/urdf/linkInertial';
import {
    assemblyToMjcf,
    MJCF_DEFAULT_DENSITY_KG_M3,
    mjcfMeshAssetName,
} from './mjcfExport';
import { CONTACT_THICKNESS_MM, INTERPENETRATION_EPSILON_MM3 } from './jointContactCap';
import { measureCadExactPairs, type CadExactMeasurement } from './exportHealthCad';
import type {
    CompiledBodyDynamics,
    CompiledContact,
    CompiledGeom,
    CompiledJointState,
    ExcludedBodyPair,
    MujocoSession,
    MujocoSessionFactory,
} from './mujocoSessionCore';

/** Stated comparison tolerances. A row mismatches when any component exceeds these. */
export const EXPORT_HEALTH_TOLERANCE = {
    massAbsKg: 1e-6,
    massRel: 1e-4,
    comAbsM: 1e-4,
    inertiaAbsKgM2: 1e-9,
    inertiaRel: 1e-4,
    /**
     * Signed distance at or above this (metres) is a margin or touching
     * contact. More negative than this is penetration. 1e-6 m is 0.001 mm.
     */
    penetrationEpsM: 1e-6,
    /** A compiled qpos this far past a joint range (radians or metres) is outside. */
    qposAbs: 1e-8,
} as const;

export interface InertiaSample {
    readonly massKg: number;
    readonly comM: readonly [number, number, number];
    readonly inertia6: readonly [number, number, number, number, number, number];
}

export interface InertiaReference extends InertiaSample {
    readonly densityKgM3: number;
    readonly massSource: 'geometry' | 'declared-mass';
}

export interface RestContactRow {
    readonly bodyA: string;
    readonly bodyB: string;
    readonly geomA: string;
    readonly geomB: string;
    /** Compiled mesh asset when the geom is a mesh. Collision geoms are often unnamed. */
    readonly meshA?: string;
    readonly meshB?: string;
    readonly distM: number;
    /** Positive depth. Zero on a margin-only row. */
    readonly penetrationM: number;
    readonly kind: 'penetration' | 'margin';
    /**
     * Boolean intersection volume of the two CAD solids at this pose, mm³.
     * Present when the exact probe finished.
     */
    readonly cadExactOverlapMm3?: number;
    /** Minimum distance between the CAD solids, mm. Zero when they overlap. */
    readonly cadDistanceMm?: number;
    /**
     * The compiled geom overlaps, and the CAD solids are clear of each
     * other. Overlap must be at or below the shared 0.01 mm³ floor, and
     * the measured clearance must be finite and greater than the 0.01 mm
     * face-contact floor. A convex hull can do that. Zero, missing, or
     * smaller clearance stays a real contact. The row stays visible either
     * way and an artefact does not fail the check.
     */
    readonly collisionGeomArtefact?: boolean;
}

export interface VisualFinding {
    readonly body: string;
    readonly geom: string;
    readonly kind: 'visual-collision-bits' | 'collision-visual-mesh';
    readonly source: 'mjcf' | 'urdf';
    readonly contype: number;
    readonly conaffinity: number;
    readonly mesh?: string;
    readonly detail: string;
}

export interface InertiaRow {
    readonly body: string;
    readonly fallback: boolean;
    readonly regularized: boolean;
    readonly mismatch: boolean;
    readonly notes: readonly string[];
    readonly cad: { readonly mjcf: InertiaReference; readonly urdf: InertiaReference } | null;
    readonly mjcf: (InertiaSample & { readonly mismatch: boolean }) | null;
    readonly urdf: (InertiaSample & { readonly mismatch: boolean; readonly densityKgM3: number }) | { readonly missing: true };
}

export interface QposLimitFinding {
    readonly joint: string;
    readonly mate: string;
    readonly qpos: number;
    readonly lower: number;
    readonly upper: number;
}

export interface RestQposRow {
    readonly joint: string;
    readonly mate: string;
    readonly qpos: number;
}

export interface ExportGeomRow {
    readonly name: string;
    readonly body: string;
    readonly type: string;
    readonly group: number;
    readonly contype: number;
    readonly conaffinity: number;
    readonly role: 'visual' | 'collision' | 'other';
    readonly mesh?: string;
}

export interface BodyExportExpectation {
    readonly body: string;
    /** Mesh asset names of declared collision solids (`part-<slug>__cN`). */
    readonly solidCollisionMeshes: readonly string[];
    /** Whole-part mesh asset name used when no collision solid is declared. */
    readonly visualMeshNames: readonly string[];
}

export interface ParsedUrdfLink {
    readonly name: string;
    readonly massKg: number;
    readonly comM: readonly [number, number, number];
    readonly inertia6: readonly [number, number, number, number, number, number];
    readonly visualMesh?: string;
    readonly collisionMesh?: string;
}

export interface ExportHealthReport {
    readonly ok: boolean;
    readonly summary: string;
    readonly tolerance: typeof EXPORT_HEALTH_TOLERANCE;
    readonly restContacts: {
        readonly penetrating: readonly RestContactRow[];
        readonly marginOnly: readonly RestContactRow[];
    };
    /** Scalar joint coordinates the forward ran at. This is compiled qpos0. */
    readonly restQpos: readonly RestQposRow[];
    /** Compiled qpos0 values outside the joint range. */
    readonly qposOutsideLimits: readonly QposLimitFinding[];
    readonly visualFindings: readonly VisualFinding[];
    readonly inertia: readonly InertiaRow[];
    readonly geoms: readonly ExportGeomRow[];
    readonly excludedBodyPairs: readonly ExcludedBodyPair[];
    readonly inertiaNotes: readonly string[];
}

export interface AssessCompiledExportInput {
    readonly geoms: readonly CompiledGeom[];
    readonly contacts: readonly CompiledContact[];
    readonly bodies: readonly CompiledBodyDynamics[];
    readonly excludedBodyPairs: readonly ExcludedBodyPair[];
    readonly expectations: readonly BodyExportExpectation[];
    readonly inertiaNotes: readonly string[];
    readonly urdfLinks: readonly ParsedUrdfLink[];
    readonly cadByBody: ReadonlyMap<string, { mjcf: InertiaReference; urdf: InertiaReference } | null>;
    readonly joints?: readonly CompiledJointState[];
}

type Inertia6 = [number, number, number, number, number, number];

function pairKey(a: string, b: string): string {
    return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function orderedPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
}

export function withinTolerance(actual: number, expected: number, absTol: number, relTol: number): boolean {
    const tol = Math.max(absTol, relTol * Math.max(Math.abs(actual), Math.abs(expected)));
    return Math.abs(actual - expected) <= tol;
}

export function inertiaMatches(actual: InertiaSample, expected: InertiaSample): boolean {
    const t = EXPORT_HEALTH_TOLERANCE;
    if (!withinTolerance(actual.massKg, expected.massKg, t.massAbsKg, t.massRel)) return false;
    for (let i = 0; i < 3; i++) {
        if (!withinTolerance(actual.comM[i], expected.comM[i], t.comAbsM, 0)) return false;
    }
    for (let i = 0; i < 6; i++) {
        if (!withinTolerance(actual.inertia6[i], expected.inertia6[i], t.inertiaAbsKgM2, t.inertiaRel)) return false;
    }
    return true;
}

function visualOnly(geom: CompiledGeom): boolean {
    return geom.name.startsWith('visual-')
        || geom.name.startsWith('wrap-')
        || geom.group === 2
        || geom.group === 3;
}

function geomRole(geom: CompiledGeom): ExportGeomRow['role'] {
    if (visualOnly(geom)) return 'visual';
    if (geom.contype !== 0 || geom.conaffinity !== 0) return 'collision';
    return 'other';
}

function notesFor(partName: string, inertiaNotes: readonly string[]): { fallback: boolean; regularized: boolean; notes: string[] } {
    const notes = inertiaNotes.filter((note) => note.startsWith(`${partName}:`));
    return {
        fallback: notes.some((note) => note.includes('substituted unit inertia')),
        regularized: notes.some((note) => note.includes('principal moments')),
        notes,
    };
}

function scaleMass(mp: MassProperties, massKg: number): InertiaSample {
    const k = mp.mass > 0 ? massKg / mp.mass : 1;
    return {
        massKg: mp.mass * k,
        comM: [mp.com[0] * 1e-3, mp.com[1] * 1e-3, mp.com[2] * 1e-3],
        inertia6: mp.inertia6.map((v) => v * k) as unknown as Inertia6,
    };
}

function sampleOf(mp: MassProperties, densityKgM3: number, massSource: InertiaReference['massSource'], declaredMass?: number): InertiaReference {
    const scaled = declaredMass !== undefined ? scaleMass(mp, declaredMass) : scaleMass(mp, mp.mass);
    return { ...scaled, densityKgM3, massSource };
}

async function cadReference(part: AssemblyPartStored): Promise<{ mjcf: InertiaReference; urdf: InertiaReference } | null> {
    let lowered: OcctBackend;
    try {
        const shape = await part.originalShape.lower();
        if (!(shape instanceof OcctBackend)) return null;
        lowered = shape;
    } catch {
        return null;
    }
    const mjcfDensity = part.density ?? MJCF_DEFAULT_DENSITY_KG_M3;
    const urdfDensity = part.density ?? URDF_DEFAULT_DENSITY_KG_M3;
    try {
        const mjcfMp = lowered.massProperties(mjcfDensity);
        const urdfMp = mjcfDensity === urdfDensity ? mjcfMp : lowered.massProperties(urdfDensity);
        const declared = part.massKg !== undefined && part.massKg > 0 && mjcfMp.mass > 0 ? part.massKg : undefined;
        return {
            mjcf: sampleOf(mjcfMp, mjcfDensity, declared !== undefined ? 'declared-mass' : 'geometry', declared),
            urdf: sampleOf(urdfMp, urdfDensity, declared !== undefined ? 'declared-mass' : 'geometry', declared),
        };
    } catch {
        return null;
    }
}

function expectationFor(part: AssemblyPartStored): BodyExportExpectation {
    const base = mjcfMeshAssetName(part.name);
    return {
        body: part.name,
        visualMeshNames: [base],
        solidCollisionMeshes: part.collisionShapes.map((_, index) => `${base}__c${index}`),
    };
}

/** Pull link inertials and visual/collision mesh filenames out of a URDF document. */
export function parseUrdfLinks(urdf: string): ParsedUrdfLink[] {
    const links: ParsedUrdfLink[] = [];
    const linkRe = /<link name="([^"]+)">([\s\S]*?)<\/link>/g;
    for (const match of urdf.matchAll(linkRe)) {
        const body = match[2] ?? '';
        const inertial = body.match(/<inertial>([\s\S]*?)<\/inertial>/)?.[1] ?? '';
        const mass = Number(inertial.match(/<mass value="([^"]+)"/)?.[1] ?? NaN);
        const origin = (inertial.match(/<origin xyz="([^"]+)"/)?.[1] ?? '').trim().split(/\s+/).map(Number);
        const inertia = inertial.match(/<inertia ([^/]*)\/>/);
        const attr = (name: string): number => Number(inertia?.[1]?.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? NaN);
        const mesh = (block: string): string | undefined => {
            const section = body.match(new RegExp(`<${block}>[\\s\\S]*?</${block}>`));
            return section?.[0].match(/filename="([^"]+)"/)?.[1];
        };
        if (!Number.isFinite(mass) || origin.length < 3) continue;
        links.push({
            name: match[1],
            massKg: mass,
            comM: [origin[0], origin[1], origin[2]],
            inertia6: [attr('ixx'), attr('ixy'), attr('ixz'), attr('iyy'), attr('iyz'), attr('izz')],
            ...(mesh('visual') !== undefined ? { visualMesh: mesh('visual') } : {}),
            ...(mesh('collision') !== undefined ? { collisionMesh: mesh('collision') } : {}),
        });
    }
    return links;
}

function restContactSkipKeys(
    bodies: readonly CompiledBodyDynamics[],
    excludedBodyPairs: readonly ExcludedBodyPair[],
): Set<string> {
    const skip = new Set(excludedBodyPairs.map((pair) => pairKey(pair.bodyA, pair.bodyB)));
    for (const body of bodies) {
        if (body.parentName.length > 0 && body.parentName !== 'world') {
            skip.add(pairKey(body.name, body.parentName));
        }
    }
    return skip;
}

/** A world body or a nameless body is not a part-to-part rest contact. */
function worldOrNamelessContact(contact: CompiledContact): boolean {
    return contact.bodyA.length === 0
        || contact.bodyB.length === 0
        || contact.bodyA === 'world'
        || contact.bodyB === 'world';
}

function compiledMesh(geoms: readonly CompiledGeom[], body: string, geomName: string): string | undefined {
    return geoms.find((geom) => geom.body === body && geom.name === geomName)?.mesh;
}

function orderedGeomNames(contact: CompiledContact, bodyA: string): { geomA: string; geomB: string } {
    if (bodyA === contact.bodyA) return { geomA: contact.geomA, geomB: contact.geomB };
    return { geomA: contact.geomB, geomB: contact.geomA };
}

function meshPairFields(meshA: string | undefined, meshB: string | undefined): { meshA?: string; meshB?: string } {
    return {
        ...(meshA !== undefined ? { meshA } : {}),
        ...(meshB !== undefined ? { meshB } : {}),
    };
}

function penetrationMetres(distM: number): number {
    return distM < 0 ? -distM : 0;
}

function contactKindOf(distM: number): RestContactRow['kind'] {
    return distM < -EXPORT_HEALTH_TOLERANCE.penetrationEpsM ? 'penetration' : 'margin';
}

function restContactRow(contact: CompiledContact, geoms: readonly CompiledGeom[]): RestContactRow {
    const [bodyA, bodyB] = orderedPair(contact.bodyA, contact.bodyB);
    const { geomA, geomB } = orderedGeomNames(contact, bodyA);
    return {
        bodyA,
        bodyB,
        geomA,
        geomB,
        ...meshPairFields(compiledMesh(geoms, bodyA, geomA), compiledMesh(geoms, bodyB, geomB)),
        distM: contact.distM,
        penetrationM: penetrationMetres(contact.distM),
        kind: contactKindOf(contact.distM),
    };
}

function compareRestContacts(a: RestContactRow, b: RestContactRow): number {
    const byBody = a.bodyA.localeCompare(b.bodyA) || a.bodyB.localeCompare(b.bodyB);
    return byBody || a.distM - b.distM;
}

function contactRows(
    contacts: readonly CompiledContact[],
    bodies: readonly CompiledBodyDynamics[],
    excludedBodyPairs: readonly ExcludedBodyPair[],
    geoms: readonly CompiledGeom[],
): { penetrating: RestContactRow[]; marginOnly: RestContactRow[] } {
    const skip = restContactSkipKeys(bodies, excludedBodyPairs);
    const penetrating: RestContactRow[] = [];
    const marginOnly: RestContactRow[] = [];
    for (const contact of contacts) {
        if (worldOrNamelessContact(contact)) continue;
        if (skip.has(pairKey(contact.bodyA, contact.bodyB))) continue;
        const row = restContactRow(contact, geoms);
        if (row.kind === 'penetration') penetrating.push(row);
        else marginOnly.push(row);
    }
    penetrating.sort(compareRestContacts);
    marginOnly.sort(compareRestContacts);
    return { penetrating, marginOnly };
}

function collisionBitsOn(geom: CompiledGeom): boolean {
    return geom.contype !== 0 || geom.conaffinity !== 0;
}

function visualBitFinding(geom: CompiledGeom): VisualFinding {
    return {
        body: geom.body,
        geom: geom.name,
        kind: 'visual-collision-bits',
        source: 'mjcf',
        contype: geom.contype,
        conaffinity: geom.conaffinity,
        ...(geom.mesh !== undefined ? { mesh: geom.mesh } : {}),
        detail: `Visual geom '${geom.name}' on '${geom.body}' has contype ${geom.contype} and conaffinity ${geom.conaffinity}.`,
    };
}

/** Visual mesh used by a collision geom when solid collision meshes were declared. */
function visualMeshOnCollisionGeom(
    geom: CompiledGeom,
    expected: BodyExportExpectation | undefined,
    bitsOn: boolean,
): string | undefined {
    if (expected === undefined || expected.solidCollisionMeshes.length === 0) return undefined;
    if (geom.type !== 'mesh' || geom.mesh === undefined || !bitsOn) return undefined;
    if (expected.solidCollisionMeshes.includes(geom.mesh)) return undefined;
    if (!expected.visualMeshNames.includes(geom.mesh)) return undefined;
    return geom.mesh;
}

function mjcfVisualMeshFinding(geom: CompiledGeom, mesh: string): VisualFinding {
    return {
        body: geom.body,
        geom: geom.name,
        kind: 'collision-visual-mesh',
        source: 'mjcf',
        contype: geom.contype,
        conaffinity: geom.conaffinity,
        mesh,
        detail: `Collision geom '${geom.name}' on '${geom.body}' uses visual mesh '${mesh}' while solid collision meshes were declared.`,
    };
}

function appendMjcfVisualFindings(
    findings: VisualFinding[],
    geom: CompiledGeom,
    expected: BodyExportExpectation | undefined,
): void {
    const bitsOn = collisionBitsOn(geom);
    if (visualOnly(geom) && bitsOn) findings.push(visualBitFinding(geom));
    const mesh = visualMeshOnCollisionGeom(geom, expected, bitsOn);
    if (mesh !== undefined) findings.push(mjcfVisualMeshFinding(geom, mesh));
}

/** Collision mesh when a URDF link reuses its visual mesh despite declared solids. */
function urdfCollisionReusesVisual(link: ParsedUrdfLink, expected: BodyExportExpectation | undefined): string | undefined {
    if (expected === undefined || expected.solidCollisionMeshes.length === 0) return undefined;
    if (link.visualMesh === undefined || link.visualMesh !== link.collisionMesh) return undefined;
    return link.visualMesh;
}

function urdfVisualMeshFinding(link: ParsedUrdfLink, mesh: string): VisualFinding {
    return {
        body: link.name,
        geom: 'collision',
        kind: 'collision-visual-mesh',
        source: 'urdf',
        contype: 0,
        conaffinity: 0,
        mesh,
        detail: `URDF link '${link.name}' uses the visual mesh for collision while solid collision pieces were declared.`,
    };
}

function visualFindingsOf(
    geoms: readonly CompiledGeom[],
    expectations: readonly BodyExportExpectation[],
    urdfLinks: readonly ParsedUrdfLink[],
): VisualFinding[] {
    const byBody = new Map(expectations.map((item) => [item.body, item]));
    const findings: VisualFinding[] = [];
    for (const geom of geoms) appendMjcfVisualFindings(findings, geom, byBody.get(geom.body));
    for (const link of urdfLinks) {
        const mesh = urdfCollisionReusesVisual(link, byBody.get(link.name));
        if (mesh !== undefined) findings.push(urdfVisualMeshFinding(link, mesh));
    }
    return findings;
}

type CadInertiaPair = { mjcf: InertiaReference; urdf: InertiaReference };

function lookupInertiaSides(body: string, input: AssessCompiledExportInput): {
    cad: CadInertiaPair | null;
    compiled: CompiledBodyDynamics | null;
    urdf: ParsedUrdfLink | null;
} {
    return {
        cad: input.cadByBody.get(body) ?? null,
        compiled: input.bodies.find((item) => item.name === body) ?? null,
        urdf: input.urdfLinks.find((link) => link.name === body) ?? null,
    };
}

function compiledInertiaSample(compiled: CompiledBodyDynamics | null): InertiaSample | null {
    if (compiled === null) return null;
    return { massKg: compiled.massKg, comM: compiled.comM, inertia6: compiled.inertia6 };
}

function urdfInertiaSample(urdf: ParsedUrdfLink | null): InertiaSample | null {
    if (urdf === null) return null;
    return { massKg: urdf.massKg, comM: urdf.comM, inertia6: urdf.inertia6 };
}

function mjcfSampleMismatch(cad: CadInertiaPair | null, sample: InertiaSample | null): boolean {
    if (cad !== null && sample !== null) return !inertiaMatches(sample, cad.mjcf);
    return cad !== null || sample !== null;
}

function urdfSampleMismatch(
    synthesisedUrdf: boolean,
    cad: CadInertiaPair | null,
    sample: InertiaSample | null,
): boolean {
    if (synthesisedUrdf) return false;
    if (cad !== null && sample !== null) return !inertiaMatches(sample, cad.urdf);
    return true;
}

function densityDifferenceNote(cad: CadInertiaPair | null): string | undefined {
    if (cad === null || cad.mjcf.densityKgM3 === cad.urdf.densityKgM3) return undefined;
    return `MJCF density ${cad.mjcf.densityKgM3} kg/m³, URDF density ${cad.urdf.densityKgM3} kg/m³.`;
}

const SYNTHESISED_URDF_NOTE = 'Synthesised URDF link with no CAD solid and no compiled MJCF body.';

function inertiaRowNotes(
    flagged: readonly string[],
    synthesisedUrdf: boolean,
    cad: CadInertiaPair | null,
): string[] {
    const notes = [...flagged];
    if (synthesisedUrdf) notes.push(SYNTHESISED_URDF_NOTE);
    const density = densityDifferenceNote(cad);
    if (density !== undefined) notes.push(density);
    return notes;
}

function mjcfInertiaCell(sample: InertiaSample | null, mismatch: boolean): InertiaRow['mjcf'] {
    if (sample === null) return null;
    return { ...sample, mismatch };
}

function urdfInertiaCell(
    sample: InertiaSample | null,
    mismatch: boolean,
    cad: CadInertiaPair | null,
): InertiaRow['urdf'] {
    if (sample === null) return { missing: true };
    return {
        ...sample,
        mismatch,
        densityKgM3: cad?.urdf.densityKgM3 ?? URDF_DEFAULT_DENSITY_KG_M3,
    };
}

function inertiaRow(body: string, input: AssessCompiledExportInput): InertiaRow {
    const sides = lookupInertiaSides(body, input);
    const flags = notesFor(body, input.inertiaNotes);
    const mjcfSample = compiledInertiaSample(sides.compiled);
    const urdfSample = urdfInertiaSample(sides.urdf);
    // A ball mate's URDF decomposition adds dummy links. They are not
    // CAD solids and they are not MJCF bodies, so they are not a mismatch.
    const synthesisedUrdf = sides.cad === null && sides.compiled === null && sides.urdf !== null;
    const mjcfMismatch = mjcfSampleMismatch(sides.cad, mjcfSample);
    const urdfMismatch = urdfSampleMismatch(synthesisedUrdf, sides.cad, urdfSample);
    return {
        body,
        fallback: flags.fallback,
        regularized: flags.regularized,
        mismatch: flags.fallback || flags.regularized || mjcfMismatch || urdfMismatch,
        notes: inertiaRowNotes(flags.notes, synthesisedUrdf, sides.cad),
        cad: sides.cad,
        mjcf: mjcfInertiaCell(mjcfSample, mjcfMismatch),
        urdf: urdfInertiaCell(urdfSample, urdfMismatch, sides.cad),
    };
}

function inertiaBodyNames(input: AssessCompiledExportInput): string[] {
    return [...new Set<string>([
        ...input.cadByBody.keys(),
        ...input.bodies.map((body) => body.name),
        ...input.urdfLinks.map((link) => link.name),
    ])].sort();
}

function inertiaRows(input: AssessCompiledExportInput): InertiaRow[] {
    return inertiaBodyNames(input).map((body) => inertiaRow(body, input));
}

function qposRows(joints: readonly CompiledJointState[]): { restQpos: RestQposRow[]; qposOutsideLimits: QposLimitFinding[] } {
    const eps = EXPORT_HEALTH_TOLERANCE.qposAbs;
    const restQpos: RestQposRow[] = [];
    const qposOutsideLimits: QposLimitFinding[] = [];
    for (const joint of joints) {
        restQpos.push({ joint: joint.name, mate: joint.mate, qpos: joint.qpos });
        if (!joint.limited) continue;
        const [lower, upper] = joint.range;
        if (joint.qpos < lower - eps || joint.qpos > upper + eps) {
            qposOutsideLimits.push({
                joint: joint.name,
                mate: joint.mate,
                qpos: joint.qpos,
                lower,
                upper,
            });
        }
    }
    const byMate = (a: { mate: string; joint: string }, b: { mate: string; joint: string }) =>
        a.mate.localeCompare(b.mate) || a.joint.localeCompare(b.joint);
    restQpos.sort(byMate);
    qposOutsideLimits.sort(byMate);
    return { restQpos, qposOutsideLimits };
}

function realContact(row: RestContactRow): boolean {
    return row.collisionGeomArtefact !== true;
}

function summarize(report: Omit<ExportHealthReport, 'ok' | 'summary'>): { ok: boolean; summary: string } {
    const penetrating = report.restContacts.penetrating.filter(realContact).length;
    const margin = report.restContacts.marginOnly.filter(realContact).length;
    const artefacts = report.restContacts.penetrating.length
        + report.restContacts.marginOnly.length
        - penetrating
        - margin;
    const visual = report.visualFindings.length;
    const inertia = report.inertia.filter((row) => row.mismatch).length;
    const qpos = report.qposOutsideLimits.length;
    const ok = penetrating === 0 && margin === 0 && visual === 0 && inertia === 0 && qpos === 0;
    const artefactNote = artefacts === 0
        ? ''
        : ` ${artefacts} rest contact(s) are collision-geometry artefacts; exact CAD overlap is at or below ${INTERPENETRATION_EPSILON_MM3} mm³ and CAD clearance is greater than ${CONTACT_THICKNESS_MM} mm.`;
    const summary = ok
        ? `Export health passed at qpos0.${artefactNote}`
        : `Export health failed at qpos0: ${penetrating} penetrating rest contact(s), ${margin} margin-only rest contact(s), ${visual} visual-collision finding(s), ${inertia} inertia row(s) outside tolerance or flagged, ${qpos} qpos0 value(s) outside joint limits.${artefactNote}`;
    return { ok, summary };
}

/** Classify a compiled model. Pure: the session reader supplies the inputs. */
export function assessCompiledExport(input: AssessCompiledExportInput): ExportHealthReport {
    const restContacts = contactRows(input.contacts, input.bodies, input.excludedBodyPairs, input.geoms);
    const { restQpos, qposOutsideLimits } = qposRows(input.joints ?? []);
    const visualFindings = visualFindingsOf(input.geoms, input.expectations, input.urdfLinks);
    const inertia = inertiaRows(input);
    const geoms: ExportGeomRow[] = input.geoms.map((geom) => ({
        name: geom.name,
        body: geom.body,
        type: geom.type,
        group: geom.group,
        contype: geom.contype,
        conaffinity: geom.conaffinity,
        role: geomRole(geom),
        ...(geom.mesh !== undefined ? { mesh: geom.mesh } : {}),
    }));
    const body = {
        tolerance: EXPORT_HEALTH_TOLERANCE,
        restContacts,
        restQpos,
        qposOutsideLimits,
        visualFindings,
        inertia,
        geoms,
        excludedBodyPairs: input.excludedBodyPairs,
        inertiaNotes: input.inertiaNotes,
    };
    return { ...summarize(body), ...body };
}

async function readCompiled(session: MujocoSession): Promise<Pick<AssessCompiledExportInput, 'geoms' | 'contacts' | 'bodies' | 'excludedBodyPairs' | 'joints'>> {
    const qpos0 = session.getQpos();
    const joints = session.compiledJointStates();
    session.setPose(qpos0);
    session.forward();
    return {
        geoms: session.compiledGeoms(),
        contacts: session.compiledContacts(),
        bodies: session.compiledBodies(),
        excludedBodyPairs: session.excludedBodyPairs(),
        joints,
    };
}

function inertiaNotesFrom(mjcfNotes: readonly string[], diagnostics: readonly CompilerDiagnostic[]): string[] {
    const notes = [...mjcfNotes];
    const seen = new Set(notes);
    for (const diagnostic of diagnostics) {
        if (diagnostic.code !== 'export.urdf.inertia-fallback') continue;
        if (seen.has(diagnostic.message)) continue;
        seen.add(diagnostic.message);
        notes.push(diagnostic.message);
    }
    return notes;
}

/**
 * A compiled contact is a hull artefact only when the CAD probe finished
 * and the solids are apart. Volume at or below 0.01 mm³ is not enough: a
 * touching pair and a sliver overlap both sit on that floor, and a missing
 * distance is not clearance. Clearance must be finite and greater than
 * CONTACT_THICKNESS_MM (0.01 mm), the same linear floor the mechanism rule
 * uses to tell face contact from a gap.
 */
export function collisionGeomArtefactOf(hit: CadExactMeasurement): boolean {
    const clearanceMm = hit.distanceMm;
    return hit.confirmed
        && hit.volumeMm3 <= INTERPENETRATION_EPSILON_MM3
        && clearanceMm !== undefined
        && Number.isFinite(clearanceMm)
        && clearanceMm > CONTACT_THICKNESS_MM;
}

function withCadExact(report: ExportHealthReport, measured: ReadonlyMap<string, CadExactMeasurement>): ExportHealthReport {
    const apply = (row: RestContactRow): RestContactRow => {
        const hit = measured.get(pairKey(row.bodyA, row.bodyB));
        if (hit === undefined || !hit.confirmed) return row;
        return {
            ...row,
            cadExactOverlapMm3: hit.volumeMm3,
            ...(hit.distanceMm !== undefined ? { cadDistanceMm: hit.distanceMm } : {}),
            collisionGeomArtefact: collisionGeomArtefactOf(hit),
        };
    };
    const body = {
        ...report,
        restContacts: {
            penetrating: report.restContacts.penetrating.map(apply),
            marginOnly: report.restContacts.marginOnly.map(apply),
        },
    };
    return { ...body, ...summarize(body) };
}

/**
 * Export `arm` to MJCF and URDF, compile the MJCF, and run forward at qpos0.
 * qpos0 is the authored mate pose. Scalar joints store it as `ref`. A ball
 * joint keeps the identity quaternion and stores the Euler triple as the
 * child body orientation. The caller owns the MuJoCo session factory.
 */
export async function checkExportHealth(
    arm: Assembly,
    options: { readonly sessionFactory: MujocoSessionFactory },
): Promise<ExportHealthReport> {
    const exported = await assemblyToMjcf(arm);
    const urdf = await urdfSerialize(arm, {});
    const parts = arm.__parts();
    const cadByBody = new Map<string, { mjcf: InertiaReference; urdf: InertiaReference } | null>();
    for (const part of parts) cadByBody.set(part.name, await cadReference(part));
    const session = await options.sessionFactory(exported.mjcf, exported.bodyOrder, exported.jointOrder);
    try {
        const compiled = await readCompiled(session);
        const report = assessCompiledExport({
            ...compiled,
            expectations: parts.map(expectationFor),
            inertiaNotes: inertiaNotesFrom(exported.inertiaNotes, urdf.diagnostics),
            urdfLinks: urdf.urdf.length > 0 ? parseUrdfLinks(urdf.urdf) : [],
            cadByBody,
        });
        const contacts = [...report.restContacts.penetrating, ...report.restContacts.marginOnly];
        if (contacts.length === 0) return report;
        const measured = await measureCadExactPairs(arm, contacts);
        return withCadExact(report, measured);
    } finally {
        session.dispose();
    }
}
