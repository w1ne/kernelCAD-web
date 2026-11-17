// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/exportHealth.ts
//
// MJCF/URDF export health. Exports the assembly, compiles the MJCF, runs
// forward at qpos0, and compares the compiled model with the CAD solid.
// Contacts and geom bits come from the compiled model, not from XML text.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { MassProperties } from '../../kernel/properties/massProperties';
import { urdfSerialize } from '../export/urdf/urdfSerializer';
import { URDF_DEFAULT_DENSITY_KG_M3 } from '../export/urdf/linkInertial';
import {
    assemblyToMjcf,
    MJCF_DEFAULT_DENSITY_KG_M3,
    mjcfMeshAssetName,
} from './mjcfExport';
import type {
    CompiledBodyDynamics,
    CompiledContact,
    CompiledGeom,
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

function contactRows(
    contacts: readonly CompiledContact[],
    bodies: readonly CompiledBodyDynamics[],
    excludedBodyPairs: readonly ExcludedBodyPair[],
    geoms: readonly CompiledGeom[],
): { penetrating: RestContactRow[]; marginOnly: RestContactRow[] } {
    const skip = new Set(excludedBodyPairs.map((pair) => pairKey(pair.bodyA, pair.bodyB)));
    for (const body of bodies) {
        if (body.parentName.length > 0 && body.parentName !== 'world') {
            skip.add(pairKey(body.name, body.parentName));
        }
    }
    const penetrating: RestContactRow[] = [];
    const marginOnly: RestContactRow[] = [];
    for (const contact of contacts) {
        if (contact.bodyA.length === 0 || contact.bodyB.length === 0) continue;
        if (contact.bodyA === 'world' || contact.bodyB === 'world') continue;
        if (skip.has(pairKey(contact.bodyA, contact.bodyB))) continue;
        const [bodyA, bodyB] = orderedPair(contact.bodyA, contact.bodyB);
        const swapped = bodyA !== contact.bodyA;
        const geomA = swapped ? contact.geomB : contact.geomA;
        const geomB = swapped ? contact.geomA : contact.geomB;
        const meshA = geoms.find((geom) => geom.body === bodyA && geom.name === geomA)?.mesh;
        const meshB = geoms.find((geom) => geom.body === bodyB && geom.name === geomB)?.mesh;
        const row: RestContactRow = {
            bodyA,
            bodyB,
            geomA,
            geomB,
            ...(meshA !== undefined ? { meshA } : {}),
            ...(meshB !== undefined ? { meshB } : {}),
            distM: contact.distM,
            penetrationM: contact.distM < 0 ? -contact.distM : 0,
            kind: contact.distM < -EXPORT_HEALTH_TOLERANCE.penetrationEpsM ? 'penetration' : 'margin',
        };
        (row.kind === 'penetration' ? penetrating : marginOnly).push(row);
    }
    const byName = (a: RestContactRow, b: RestContactRow) =>
        a.bodyA.localeCompare(b.bodyA) || a.bodyB.localeCompare(b.bodyB) || a.distM - b.distM;
    penetrating.sort(byName);
    marginOnly.sort(byName);
    return { penetrating, marginOnly };
}

function visualFindingsOf(
    geoms: readonly CompiledGeom[],
    expectations: readonly BodyExportExpectation[],
    urdfLinks: readonly ParsedUrdfLink[],
): VisualFinding[] {
    const byBody = new Map(expectations.map((item) => [item.body, item]));
    const findings: VisualFinding[] = [];
    for (const geom of geoms) {
        const bitsOn = geom.contype !== 0 || geom.conaffinity !== 0;
        if (visualOnly(geom) && bitsOn) {
            findings.push({
                body: geom.body,
                geom: geom.name,
                kind: 'visual-collision-bits',
                source: 'mjcf',
                contype: geom.contype,
                conaffinity: geom.conaffinity,
                ...(geom.mesh !== undefined ? { mesh: geom.mesh } : {}),
                detail: `Visual geom '${geom.name}' on '${geom.body}' has contype ${geom.contype} and conaffinity ${geom.conaffinity}.`,
            });
        }
        const expected = byBody.get(geom.body);
        if (
            expected !== undefined
            && expected.solidCollisionMeshes.length > 0
            && geom.type === 'mesh'
            && geom.mesh !== undefined
            && bitsOn
            && !expected.solidCollisionMeshes.includes(geom.mesh)
            && expected.visualMeshNames.includes(geom.mesh)
        ) {
            findings.push({
                body: geom.body,
                geom: geom.name,
                kind: 'collision-visual-mesh',
                source: 'mjcf',
                contype: geom.contype,
                conaffinity: geom.conaffinity,
                mesh: geom.mesh,
                detail: `Collision geom '${geom.name}' on '${geom.body}' uses visual mesh '${geom.mesh}' while solid collision meshes were declared.`,
            });
        }
    }
    for (const link of urdfLinks) {
        const expected = byBody.get(link.name);
        if (expected === undefined || expected.solidCollisionMeshes.length === 0) continue;
        if (link.visualMesh === undefined || link.visualMesh !== link.collisionMesh) continue;
        findings.push({
            body: link.name,
            geom: 'collision',
            kind: 'collision-visual-mesh',
            source: 'urdf',
            contype: 0,
            conaffinity: 0,
            mesh: link.collisionMesh,
            detail: `URDF link '${link.name}' uses the visual mesh for collision while solid collision pieces were declared.`,
        });
    }
    return findings;
}

function inertiaRows(input: AssessCompiledExportInput): InertiaRow[] {
    const names = new Set<string>([
        ...input.cadByBody.keys(),
        ...input.bodies.map((body) => body.name),
        ...input.urdfLinks.map((link) => link.name),
    ]);
    const rows: InertiaRow[] = [];
    for (const body of [...names].sort()) {
        const flags = notesFor(body, input.inertiaNotes);
        const cad = input.cadByBody.get(body) ?? null;
        const compiled = input.bodies.find((item) => item.name === body) ?? null;
        const urdf = input.urdfLinks.find((link) => link.name === body) ?? null;
        const mjcfSample: InertiaSample | null = compiled === null ? null : {
            massKg: compiled.massKg,
            comM: compiled.comM,
            inertia6: compiled.inertia6,
        };
        const mjcfMismatch = cad !== null && mjcfSample !== null ? !inertiaMatches(mjcfSample, cad.mjcf) : cad !== null || mjcfSample !== null;
        const urdfSample: InertiaSample | null = urdf === null ? null : {
            massKg: urdf.massKg,
            comM: urdf.comM,
            inertia6: urdf.inertia6,
        };
        const urdfMismatch = cad !== null && urdfSample !== null ? !inertiaMatches(urdfSample, cad.urdf) : true;
        const notes = [...flags.notes];
        if (cad !== null && cad.mjcf.densityKgM3 !== cad.urdf.densityKgM3) {
            notes.push(`MJCF density ${cad.mjcf.densityKgM3} kg/m³, URDF density ${cad.urdf.densityKgM3} kg/m³.`);
        }
        rows.push({
            body,
            fallback: flags.fallback,
            regularized: flags.regularized,
            mismatch: flags.fallback || flags.regularized || mjcfMismatch || urdfMismatch,
            notes,
            cad,
            mjcf: mjcfSample === null ? null : { ...mjcfSample, mismatch: mjcfMismatch },
            urdf: urdfSample === null
                ? { missing: true }
                : { ...urdfSample, mismatch: urdfMismatch, densityKgM3: cad?.urdf.densityKgM3 ?? URDF_DEFAULT_DENSITY_KG_M3 },
        });
    }
    return rows;
}

function summarize(report: Omit<ExportHealthReport, 'ok' | 'summary'>): { ok: boolean; summary: string } {
    const penetrating = report.restContacts.penetrating.length;
    const margin = report.restContacts.marginOnly.length;
    const visual = report.visualFindings.length;
    const inertia = report.inertia.filter((row) => row.mismatch).length;
    const ok = penetrating === 0 && margin === 0 && visual === 0 && inertia === 0;
    const summary = ok
        ? 'Export health passed at qpos0.'
        : `Export health failed at qpos0: ${penetrating} penetrating rest contact(s), ${margin} margin-only rest contact(s), ${visual} visual-collision finding(s), ${inertia} inertia row(s) outside tolerance or flagged.`;
    return { ok, summary };
}

/** Classify a compiled model. Pure: the session reader supplies the inputs. */
export function assessCompiledExport(input: AssessCompiledExportInput): ExportHealthReport {
    const restContacts = contactRows(input.contacts, input.bodies, input.excludedBodyPairs, input.geoms);
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
        visualFindings,
        inertia,
        geoms,
        excludedBodyPairs: input.excludedBodyPairs,
        inertiaNotes: input.inertiaNotes,
    };
    return { ...summarize(body), ...body };
}

async function readCompiled(session: MujocoSession): Promise<Pick<AssessCompiledExportInput, 'geoms' | 'contacts' | 'bodies' | 'excludedBodyPairs'>> {
    const qpos0 = session.getQpos();
    session.setPose(qpos0);
    session.forward();
    return {
        geoms: session.compiledGeoms(),
        contacts: session.compiledContacts(),
        bodies: session.compiledBodies(),
        excludedBodyPairs: session.excludedBodyPairs(),
    };
}

/**
 * Export `arm` to MJCF and URDF, compile the MJCF, and run forward at qpos0.
 * The caller owns the MuJoCo session factory (Node or the browser worker).
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
        return assessCompiledExport({
            ...compiled,
            expectations: parts.map(expectationFor),
            inertiaNotes: exported.inertiaNotes,
            urdfLinks: urdf.urdf.length > 0 ? parseUrdfLinks(urdf.urdf) : [],
            cadByBody,
        });
    } finally {
        session.dispose();
    }
}
