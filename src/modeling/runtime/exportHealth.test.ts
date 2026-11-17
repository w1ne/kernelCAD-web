// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Fair check for MJCF/URDF export health. The three-box assembly is real
// geometry. Expected mass and inertia come from the closed-form box solid,
// not from the exporter and not from massProperties. One MuJoCo compile
// covers that assembly. A second, tiny hand-written MJCF covers a visual
// geom whose collision bits are on; that model is not produced by the exporter.

import { describe, expect, it, vi } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { assemblyToMjcf, unitInertiaNote } from './mjcfExport';
import { fmtNum } from './mjcfXmlFormat';
import { loadMujocoSession } from './mujocoSession';
import { CONTACT_THICKNESS_MM, INTERPENETRATION_EPSILON_MM3 } from './jointContactCap';
import {
    assessCompiledExport,
    checkExportHealth,
    collisionGeomArtefactOf,
    type InertiaSample,
} from './exportHealth';
import type { CompiledBodyDynamics, CompiledContact, CompiledGeom } from './mujocoSessionCore';

const A_MM: [number, number, number] = [40, 30, 20];
const B_MM: [number, number, number] = [10, 30, 20];
const MJCF_DENSITY = 2700;
const URDF_DENSITY = 1000;

/** Closed-form mass properties of a centred box. Sizes are full extents in mm. */
function boxSolid(sizeMm: readonly [number, number, number], densityKgM3: number): InertiaSample {
    const [sx, sy, sz] = sizeMm.map((mm) => mm / 1000);
    const massKg = densityKgM3 * sx * sy * sz;
    return {
        massKg,
        comM: [0, 0, 0],
        inertia6: [
            massKg * (sy * sy + sz * sz) / 12,
            0,
            0,
            massKg * (sx * sx + sz * sz) / 12,
            0,
            massKg * (sx * sx + sy * sy) / 12,
        ],
    };
}

function expectNear(actual: number, expected: number, rel = 1e-4, abs = 1e-9): void {
    const tol = Math.max(abs, rel * Math.max(Math.abs(actual), Math.abs(expected)));
    expect(Math.abs(actual - expected), `got ${actual}, expected ${expected}, tol ${tol}`).toBeLessThanOrEqual(tol);
}

function expectSample(actual: InertiaSample, expected: InertiaSample): void {
    expectNear(actual.massKg, expected.massKg, 1e-4, 1e-6);
    for (let i = 0; i < 3; i++) expectNear(actual.comM[i], expected.comM[i], 0, 1e-4);
    for (let i = 0; i < 6; i++) expectNear(actual.inertia6[i], expected.inertia6[i], 1e-4, 1e-9);
}

function geom(partial: Partial<CompiledGeom> & Pick<CompiledGeom, 'name' | 'body'>): CompiledGeom {
    return {
        id: 0,
        bodyId: 1,
        type: 'mesh',
        group: 1,
        contype: 1,
        conaffinity: 1,
        margin: 0,
        ...partial,
    };
}

describe('export health classification', () => {
    it('suppresses a hull contact only when CAD clearance is past the face-contact floor', () => {
        expect(INTERPENETRATION_EPSILON_MM3).toBe(0.01);
        expect(CONTACT_THICKNESS_MM).toBe(0.01);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0, distanceMm: 4 })).toBe(true);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0.01, distanceMm: 4 })).toBe(true);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0, distanceMm: 0.02 })).toBe(true);
        // Touching, a sliver overlap, clearance at the floor, and a missing
        // distance are real contacts. The volume floor alone does not suppress.
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0, distanceMm: 0 })).toBe(false);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0.008, distanceMm: 0 })).toBe(false);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0, distanceMm: 0.01 })).toBe(false);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0 })).toBe(false);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0, distanceMm: Number.NaN })).toBe(false);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0, distanceMm: Number.POSITIVE_INFINITY })).toBe(false);
        expect(collisionGeomArtefactOf({ confirmed: false, volumeMm3: 0, distanceMm: 4 })).toBe(false);
        expect(collisionGeomArtefactOf({ confirmed: true, volumeMm3: 0.010001, distanceMm: 4 })).toBe(false);
    });

    it('splits penetration from margin contacts and drops parent/child and explicit excludes', () => {
        const bodies = [
            { id: 1, name: 'a', parentId: 0, parentName: 'world', massKg: 1, comM: [0, 0, 0], principalKgM2: [1, 1, 1], iquat: [1, 0, 0, 0], inertia6: [1, 0, 0, 1, 0, 1] },
            { id: 2, name: 'b', parentId: 1, parentName: 'a', massKg: 1, comM: [0, 0, 0], principalKgM2: [1, 1, 1], iquat: [1, 0, 0, 0], inertia6: [1, 0, 0, 1, 0, 1] },
            { id: 3, name: 'c', parentId: 2, parentName: 'b', massKg: 1, comM: [0, 0, 0], principalKgM2: [1, 1, 1], iquat: [1, 0, 0, 0], inertia6: [1, 0, 0, 1, 0, 1] },
        ] satisfies CompiledBodyDynamics[];
        const contacts: CompiledContact[] = [
            { geom1: 0, geom2: 1, geomA: 'ga', geomB: 'gb', bodyA: 'a', bodyB: 'b', distM: -0.02 },
            { geom1: 1, geom2: 2, geomA: 'gb', geomB: 'gd', bodyA: 'b', bodyB: 'd', distM: -0.01 },
            { geom1: 0, geom2: 2, geomA: 'ga', geomB: 'gc', bodyA: 'a', bodyB: 'c', distM: -0.015 },
            { geom1: 0, geom2: 3, geomA: 'ga', geomB: 'ge', bodyA: 'a', bodyB: 'e', distM: 0.0002 },
        ];
        const report = assessCompiledExport({
            geoms: [],
            contacts,
            bodies,
            excludedBodyPairs: [{ bodyA: 'b', bodyB: 'd' }],
            expectations: [],
            inertiaNotes: [],
            urdfLinks: [],
            cadByBody: new Map(),
        });
        expect(report.restContacts.penetrating.map((row) => [row.bodyA, row.bodyB, row.penetrationM])).toEqual([
            ['a', 'c', 0.015],
        ]);
        expect(report.restContacts.marginOnly).toEqual([
            expect.objectContaining({ bodyA: 'a', bodyB: 'e', kind: 'margin', penetrationM: 0, distM: 0.0002 }),
        ]);
        expect(report.ok).toBe(false);
    });

    it('flags a visual geom with collision bits and a visual mesh used where a solid was declared', () => {
        const report = assessCompiledExport({
            geoms: [
                geom({ name: 'visual-shell', body: 'base', group: 2, contype: 1, conaffinity: 2, mesh: 'base_visual' }),
                geom({ name: 'visual-ok', body: 'base', group: 2, contype: 0, conaffinity: 0, type: 'sphere' }),
                geom({ name: 'collision-from-visual', body: 'base', group: 1, mesh: 'base_visual' }),
                geom({ name: 'solid-box', body: 'base', group: 1, type: 'box' }),
            ],
            contacts: [],
            bodies: [],
            excludedBodyPairs: [],
            expectations: [{ body: 'base', solidCollisionMeshes: ['base_solid'], visualMeshNames: ['base_visual'] }],
            inertiaNotes: [],
            urdfLinks: [{
                name: 'base',
                massKg: 1,
                comM: [0, 0, 0],
                inertia6: [1, 0, 0, 1, 0, 1],
                visualMesh: 'meshes/base.stl',
                collisionMesh: 'meshes/base.stl',
            }],
            cadByBody: new Map(),
        });
        expect(report.visualFindings.map((row) => `${row.source}:${row.kind}:${row.geom}`).sort()).toEqual([
            'mjcf:collision-visual-mesh:collision-from-visual',
            'mjcf:collision-visual-mesh:visual-shell',
            'mjcf:visual-collision-bits:visual-shell',
            'urdf:collision-visual-mesh:collision',
        ]);
        expect(report.visualFindings.find((row) => row.geom === 'visual-ok')).toBeUndefined();
        expect(report.visualFindings.find((row) => row.geom === 'solid-box')).toBeUndefined();
    });

    it('records a unit-inertia note when mass properties throw', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('unit-inertia');
        arm.part('slug', kcad.box(10, 10, 10, true));
        const spy = vi.spyOn(OcctBackend.prototype, 'massProperties').mockImplementation(() => {
            throw new Error('mass properties unavailable');
        });
        try {
            const exported = await assemblyToMjcf(arm);
            expect(exported.inertiaNotes).toContain(unitInertiaNote('slug'));
        } finally {
            spy.mockRestore();
        }
    });
});

describe('three-box export health at qpos0', () => {
    it('reports the non-adjacent overlap, omits mate neighbours, and matches box inertia', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('three-box-rest-overlap');
        const axisAt = (origin: [number, number, number]) => ({
            type: 'axis' as const,
            origin: { kind: 'vec3' as const, value: origin },
            axis: [0, 1, 0] as [number, number, number],
        });
        // A and C are 40×30×20 boxes. At qpos0, C's origin sits 5 mm along +X
        // from A's origin, so the solids overlap by 35 mm, 30 mm, and 20 mm
        // on X, Y, and Z. B is the 10 mm spacer between the two revolute mates.
        arm.part('a', kcad.box(A_MM[0], A_MM[1], A_MM[2], true)).connector('ab', axisAt([20, 0, 0]));
        arm.part('b', kcad.box(B_MM[0], B_MM[1], B_MM[2], true))
            .connector('ab', axisAt([-5, 0, 0]))
            .connector('bc', axisAt([5, 0, 0]))
            .wrapGeom('rail', { axis: [0, 0, 1], origin: [0, 0, 80], radius: 3, halfLengthMm: 5 });
        arm.part('c', kcad.box(A_MM[0], A_MM[1], A_MM[2], true)).connector('bc', axisAt([25, 0, 0]));
        arm.mate('ab', 'a.ab', 'b.ab', 'revolute', { pose: 0, limitsDeg: [-30, 30] });
        arm.mate('bc', 'b.bc', 'c.bc', 'revolute', { pose: 0, limitsDeg: [-30, 30] });

        const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });

        expect(report.excludedBodyPairs).toEqual([
            { bodyA: 'a', bodyB: 'b' },
            { bodyA: 'b', bodyB: 'c' },
        ]);
        const pairs = [...report.restContacts.penetrating, ...report.restContacts.marginOnly]
            .map((row) => `${row.bodyA}:${row.bodyB}`);
        expect(pairs).not.toContain('a:b');
        expect(pairs).not.toContain('b:c');
        const overlap = report.restContacts.penetrating.filter((row) => row.bodyA === 'a' && row.bodyB === 'c');
        expect(overlap.length).toBeGreaterThan(0);
        // Smallest overlap of the two centred boxes is 20 mm along Z.
        // A metre/millimetre slip would report tens of metres.
        for (const row of overlap) {
            // Analytic minimum translation is the 20 mm Z overlap.
            // 0.5 mm absolute rejects a 30 mm or 35 mm axis and a unit slip.
            expect(row.penetrationM).toBeCloseTo(0.02, 3);
            expect(row.penetrationM).toBeCloseTo(-row.distM, 12);
            expect(row.kind).toBe('penetration');
            // Collision geoms are unnamed in the export. The compiled mesh
            // asset is the identity, read from the model rather than the XML.
            expect(row.meshA).toBe('part-a');
            expect(row.meshB).toBe('part-c');
            // 35 mm × 30 mm × 20 mm of real solid overlap. A hull-only
            // contact would report a volume at or below 0.01 mm³.
            expect(row.collisionGeomArtefact).toBe(false);
            expect(row.cadExactOverlapMm3).toBeCloseTo(35 * 30 * 20, -1);
            expect(row.cadDistanceMm).toBeCloseTo(0, 3);
        }
        expect(report.restContacts.marginOnly.filter((row) => row.bodyA === 'a' && row.bodyB === 'c')).toEqual([]);

        const rail = report.geoms.find((row) => row.name.startsWith('wrap-'));
        expect(rail).toMatchObject({ role: 'visual', contype: 0, conaffinity: 0, group: 3 });
        expect(report.visualFindings).toEqual([]);

        for (const body of ['a', 'c'] as const) {
            const row = report.inertia.find((item) => item.body === body);
            expect(row?.fallback).toBe(false);
            expect(row?.regularized).toBe(false);
            expect(row?.mismatch).toBe(false);
            expect(row?.mjcf).not.toBeNull();
            expect(row?.urdf).not.toHaveProperty('missing');
            expectSample(row!.mjcf!, boxSolid(A_MM, MJCF_DENSITY));
            expectSample(row!.urdf as InertiaSample, boxSolid(A_MM, URDF_DENSITY));
        }
        const spacer = report.inertia.find((item) => item.body === 'b');
        expect(spacer?.mismatch).toBe(false);
        expectSample(spacer!.mjcf!, boxSolid(B_MM, MJCF_DENSITY));
        expectSample(spacer!.urdf as InertiaSample, boxSolid(B_MM, URDF_DENSITY));
        expect(report.ok).toBe(false);
        expect(report.summary).toContain('penetrating');
        expect(report.qposOutsideLimits).toEqual([]);
        expect(report.restQpos.map((row) => row.qpos)).toEqual([0, 0]);
    }, 60000);
});

describe('compiled visual geom collision bits', () => {
    it('reads non-zero contype from the compiled model and flags that visual geom', async () => {
        const mjcf = `<?xml version="1.0"?>
<mujoco>
  <asset>
    <mesh name="base_visual" vertex="0 0 0  0.02 0 0  0 0.02 0  0 0 0.02"/>
  </asset>
  <worldbody>
    <body name="base">
      <inertial pos="0 0 0" mass="0.01" diaginertia="1e-4 1e-4 1e-4"/>
      <geom name="visual-shell" type="mesh" mesh="base_visual" group="2" contype="1" conaffinity="2"/>
      <geom name="visual-ok" type="sphere" size="0.004" pos="0 0 0.05" group="2" contype="0" conaffinity="0"/>
      <geom name="collision-from-visual" type="mesh" mesh="base_visual" group="1" contype="1" conaffinity="1"/>
      <geom name="solid-box" type="box" size="0.01 0.01 0.01" group="1" contype="1" conaffinity="1"/>
    </body>
  </worldbody>
</mujoco>
`;
        const session = await loadMujocoSession(mjcf, ['base'], []);
        try {
            session.setPose(session.getQpos());
            session.forward();
            const geoms = session.compiledGeoms();
            const shell = geoms.find((row) => row.name === 'visual-shell');
            expect(shell).toMatchObject({ contype: 1, conaffinity: 2, group: 2, mesh: 'base_visual', type: 'mesh' });
            const clear = geoms.find((row) => row.name === 'visual-ok');
            expect(clear).toMatchObject({ contype: 0, conaffinity: 0 });
            const report = assessCompiledExport({
                geoms,
                contacts: session.compiledContacts(),
                bodies: session.compiledBodies(),
                excludedBodyPairs: session.excludedBodyPairs(),
                expectations: [{ body: 'base', solidCollisionMeshes: ['base_solid'], visualMeshNames: ['base_visual'] }],
                inertiaNotes: [],
                urdfLinks: [],
                cadByBody: new Map(),
            });
            expect(report.visualFindings.some((row) => row.kind === 'visual-collision-bits' && row.geom === 'visual-shell' && row.contype === 1)).toBe(true);
            expect(report.visualFindings.some((row) => row.kind === 'collision-visual-mesh' && row.geom === 'collision-from-visual' && row.mesh === 'base_visual')).toBe(true);
            expect(report.visualFindings.some((row) => row.geom === 'visual-ok' || row.geom === 'solid-box')).toBe(false);
        } finally {
            session.dispose();
        }
    }, 30000);
});

describe('declared mass and unit-inertia flags', () => {
    it('fails the row when the URDF mass is not the declared mass', () => {
        const declared = {
            massKg: 0.055,
            comM: [0, 0, 0] as const,
            inertia6: [1e-6, 0, 0, 1e-6, 0, 1e-6] as const,
        };
        const body = {
            id: 1,
            name: 'servo',
            parentId: 0,
            parentName: 'world',
            massKg: declared.massKg,
            comM: [0, 0, 0] as const,
            principalKgM2: [1, 1, 1] as const,
            iquat: [1, 0, 0, 0] as const,
            inertia6: declared.inertia6,
        };
        const report = assessCompiledExport({
            geoms: [],
            contacts: [],
            bodies: [body],
            excludedBodyPairs: [],
            expectations: [],
            inertiaNotes: [],
            urdfLinks: [{
                name: 'servo',
                massKg: 0.032128,
                comM: [0, 0, 0],
                inertia6: declared.inertia6,
            }],
            cadByBody: new Map([['servo', {
                mjcf: { ...declared, densityKgM3: 2700, massSource: 'declared-mass' },
                urdf: { ...declared, densityKgM3: 1000, massSource: 'declared-mass' },
            }]]),
        });
        const row = report.inertia.find((item) => item.body === 'servo');
        expect(row?.mjcf).toMatchObject({ mismatch: false, massKg: 0.055 });
        expect(row?.urdf).toMatchObject({ mismatch: true, massKg: 0.032128 });
        expect(row?.fallback).toBe(false);
        expect(row?.mismatch).toBe(true);
        expect(report.ok).toBe(false);
    });

    it('compares MJCF and URDF to the declared mass of a centred box', async () => {
        await initOcct();
        const size: [number, number, number] = [10, 20, 30];
        const declaredKg = 0.055;
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('declared-mass');
        arm.part('servo', kcad.box(size[0], size[1], size[2], true), { massKg: declaredKg });
        const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });
        const row = report.inertia.find((item) => item.body === 'servo');
        const [sx, sy, sz] = size.map((mm) => mm / 1000);
        const expected = boxSolid(size, declaredKg / (sx * sy * sz));
        expect(expected.massKg).toBeCloseTo(declaredKg, 12);
        expect(expected.massKg).not.toBeCloseTo(MJCF_DENSITY * sx * sy * sz, 4);
        expect(row?.cad?.mjcf.massSource).toBe('declared-mass');
        expect(row?.cad?.urdf.massSource).toBe('declared-mass');
        expect(row?.fallback).toBe(false);
        expect(row?.regularized).toBe(false);
        expect(row?.mismatch).toBe(false);
        expectSample(row!.mjcf!, expected);
        expectSample(row!.urdf as InertiaSample, expected);
        expect(report.ok).toBe(true);
    }, 30000);

    it('marks the health row fallback and mismatched when mass properties throw', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('unit-inertia-health');
        arm.part('slug', kcad.box(10, 10, 10, true));
        const spy = vi.spyOn(OcctBackend.prototype, 'massProperties').mockImplementation(() => {
            throw new Error('mass properties unavailable');
        });
        try {
            const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });
            const row = report.inertia.find((item) => item.body === 'slug');
            expect(row?.fallback).toBe(true);
            expect(row?.mismatch).toBe(true);
            expect(row?.notes.join('\n')).toContain(unitInertiaNote('slug'));
            expect(row?.mjcf?.massKg).toBeCloseTo(1, 6);
            expect(row?.urdf).toMatchObject({ massKg: 1 });
            expect(report.ok).toBe(false);
        } finally {
            spy.mockRestore();
        }
    }, 30000);
});

describe('authored rest pose versus coordinate zero', () => {
    const axisAt = (origin: [number, number, number]) => ({
        type: 'axis' as const,
        origin: { kind: 'vec3' as const, value: origin },
        axis: [0, 0, 1] as [number, number, number],
    });

    it('clears the stop at the authored 90° and overlaps it at coordinate 0', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('swing-clear');
        // Link at coordinate 0 occupies x=[20,60]. The stop is a free root,
        // not a fastened neighbour: a stop fixed to the base is in the base
        // rigid group and the swing exclusion would hide the overlap.
        // The stop occupies x=[30,50]. Minimum overlap at coordinate 0 is
        // 10 mm. At 90° about Z through x=20 the link occupies x=[15,25]
        // and the stop is clear by 5 mm.
        arm.part('base', kcad.box(40, 40, 10, true)).connector('hinge', axisAt([20, 0, 0]));
        arm.part('link', kcad.box(40, 10, 10, true)).connector('hinge', axisAt([-20, 0, 0]));
        arm.part('stop', kcad.box(20, 10, 10, true), { at: [40, 0, 0] });
        arm.mate('swing', 'base.hinge', 'link.hinge', 'revolute', { pose: 90, limitsDeg: [-20, 120] });

        const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });
        const swing = report.restQpos.find((row) => row.mate === 'swing');
        expect(swing?.qpos).toBeCloseTo(Math.PI / 2, 6);
        expect(report.qposOutsideLimits).toEqual([]);
        const pairs = [...report.restContacts.penetrating, ...report.restContacts.marginOnly]
            .map((row) => `${row.bodyA}:${row.bodyB}`);
        expect(pairs).not.toContain('link:stop');
        expect(report.restContacts.penetrating).toEqual([]);
        expect(report.ok).toBe(true);

        const exported = await assemblyToMjcf(arm);
        expect(exported.mjcf).toContain(`ref="${(Math.PI / 2).toFixed(6)}"`);
        const session = await loadMujocoSession(exported.mjcf, exported.bodyOrder, exported.jointOrder);
        try {
            session.setPose(new Array(session.nq).fill(0));
            session.forward();
            const hits = session.compiledContacts().filter((contact) => {
                const pair = [contact.bodyA, contact.bodyB].sort().join(':');
                return pair === 'link:stop' && contact.distM < -1e-6;
            });
            expect(hits.length).toBeGreaterThan(0);
            for (const hit of hits) expect(-hit.distM).toBeCloseTo(0.01, 3);
        } finally {
            session.dispose();
        }
    }, 30000);

    it('reports qpos0 outside the joint range when the authored pose is 0', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('limit-rest');
        arm.part('base', kcad.box(10, 10, 10, true)).connector('hinge', axisAt([20, 0, 0]));
        arm.part('link', kcad.box(10, 10, 10, true)).connector('hinge', axisAt([0, 0, 0]));
        arm.mate('shoulder', 'base.hinge', 'link.hinge', 'revolute', { pose: 0, limitsDeg: [12, 40] });
        const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });
        expect(report.restContacts.penetrating).toEqual([]);
        expect(report.restQpos).toEqual([expect.objectContaining({ mate: 'shoulder' })]);
        expect(report.restQpos[0]?.qpos).toBeCloseTo(0, 8);
        expect(report.qposOutsideLimits).toEqual([expect.objectContaining({
            mate: 'shoulder',
            qpos: expect.any(Number),
        })]);
        expect(report.qposOutsideLimits[0]?.lower).toBeCloseTo(12 * Math.PI / 180, 6);
        expect(report.qposOutsideLimits[0]?.upper).toBeCloseTo(40 * Math.PI / 180, 6);
        expect(report.ok).toBe(false);
        expect(report.summary).toContain('outside joint limits');
    }, 30000);

    const ballAt = (origin: [number, number, number]) => ({
        type: 'ball' as const,
        origin: { kind: 'vec3' as const, value: origin },
    });

    it('clears the stop at an authored ball Euler and overlaps it at the zero triple', async () => {
        await initOcct();
        const half = Math.PI / 4;
        const quat = [Math.cos(half), 0, Math.sin(half), 0].map((value) => fmtNum(value)).join(' ');
        const build = (pose: [number, number, number]) => {
            const kcad = createModelingApi({ session: new CaptureSession() });
            const arm = kcad.assembly('ball-rest');
            // At the zero triple the link occupies x=[20,60]. The free stop
            // is centred at x=60, so it occupies x=[50,70]: a 10×10×10 mm³
            // overlap, 10 mm deep. A stop centred on the link is strictly
            // inside the link hull, and this MuJoCo build reports no contact
            // for that containment. Ry(90) about the parent connector at x=20
            // swings the link to x=[15,25], 25 mm clear of the stop.
            arm.part('base', kcad.box(40, 40, 10, true)).connector('wrist', ballAt([20, 0, 0]));
            arm.part('link', kcad.box(40, 10, 10, true)).connector('wrist', ballAt([-20, 0, 0]));
            arm.part('stop', kcad.box(20, 10, 10, true), { at: [60, 0, 0] });
            arm.mate('wrist', 'base.wrist', 'link.wrist', 'ball', { pose });
            return arm;
        };

        const clear = build([0, 90, 0]);
        const cleared = await checkExportHealth(clear, { sessionFactory: loadMujocoSession });
        const hits = [...cleared.restContacts.penetrating, ...cleared.restContacts.marginOnly]
            .map((row) => `${row.bodyA}:${row.bodyB}`);
        expect(hits).not.toContain('link:stop');
        expect(cleared.restContacts.penetrating.filter((row) => row.collisionGeomArtefact !== true)).toEqual([]);
        expect(cleared.ok).toBe(true);
        const exported = await assemblyToMjcf(clear);
        expect(exported.mjcf).toContain('type="ball"');
        expect(exported.mjcf).not.toMatch(/type="ball"[^>]*\bref=/);
        expect(exported.mjcf).toContain(`quat="${quat}"`);

        const overlapped = await checkExportHealth(build([0, 0, 0]), { sessionFactory: loadMujocoSession });
        const overlap = overlapped.restContacts.penetrating.filter((row) => row.bodyA === 'link' && row.bodyB === 'stop');
        expect(overlap.length).toBeGreaterThan(0);
        for (const row of overlap) {
            expect(row.penetrationM).toBeCloseTo(0.01, 3);
            expect(row.collisionGeomArtefact).toBe(false);
            expect(row.cadExactOverlapMm3).toBeCloseTo(10 * 10 * 10, -1);
        }
        expect(overlapped.ok).toBe(false);
        const identity = await assemblyToMjcf(build([0, 0, 0]));
        expect(identity.mjcf).not.toContain('quat=');
    }, 30000);

    it('emits the coupling-consistent ref, not a conflicting driven pose', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('coupled-ref');
        arm.part('base', kcad.box(20, 10, 10, true))
            .connector('src', axisAt([5, 0, 0]))
            .connector('drv', axisAt([-5, 0, 0]));
        arm.part('source', kcad.box(10, 10, 10, true)).connector('hinge', axisAt([0, 0, 0]));
        arm.part('driven', kcad.box(10, 10, 10, true)).connector('hinge', axisAt([0, 0, 0]));
        arm.mate('src', 'base.src', 'source.hinge', 'revolute', { pose: 20, limitsDeg: [-40, 40] });
        arm.mate('drv', 'base.drv', 'driven.hinge', 'revolute', { pose: 5, limitsDeg: [-40, 40] });
        arm.coupleMates('drv', { source: 'src', ratio: -1, offset: 3 });
        const { mjcf } = await assemblyToMjcf(arm);
        const rad = (deg: number) => (deg * Math.PI / 180).toFixed(6);
        expect(mjcf).toContain(`ref="${rad(20)}"`);
        expect(mjcf).toContain(`ref="${rad(-17)}"`);
        expect(mjcf).not.toContain(`ref="${rad(5)}"`);
        expect(mjcf).toMatch(/polycoef="0 -1\.000000 0 0 0"/);
    }, 30000);
});

describe('collision geometry that the CAD solid does not share', () => {
    it('reports a convex-hull contact in the inner corner of an L as an artefact', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('hull-corner');
        const axis = (origin: [number, number, number]) => ({
            type: 'axis' as const,
            origin: { kind: 'vec3' as const, value: origin },
            axis: [0, 1, 0] as [number, number, number],
        });
        // Slab x=[0,40], z=[0,10] plus wall x=[0,10], z=[0,40]. The cube's
        // world origin is (18, 0, 18) mm, so it occupies x=[14,22], z=[14,22]:
        // 4 mm clear of both the slab top and the wall face. The collision
        // cloud is the convex hull of that L, which fills the corner. MuJoCo
        // reports a 14 mm penetration there. A shape strictly inside another
        // hull (a box inside a frame) produces no contact in this build, so
        // the corner has to cross the hull. The anchor is large enough that
        // its inertia is not regularized, and it does not meet the cube.
        const slab = kcad.box(40, 20, 10, true).translate(20, 0, 5);
        const wall = kcad.box(10, 20, 40, true).translate(5, 0, 20);
        arm.part('ell', kcad.union(slab, wall)).connector('pin', axis([-30, 0, 0]));
        arm.part('anchor', kcad.box(20, 20, 20, true))
            .connector('pin', axis([0, 0, 0]))
            .connector('seat', axis([48, 0, 18]));
        arm.part('cube', kcad.box(8, 8, 8, true)).connector('seat', axis([0, 0, 0]));
        arm.mate('pin', 'ell.pin', 'anchor.pin', 'revolute', { pose: 0, limitsDeg: [-90, 90] });
        arm.mate('seat', 'anchor.seat', 'cube.seat', 'revolute', { pose: 0, limitsDeg: [-90, 90] });

        const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });
        const rows = [...report.restContacts.penetrating, ...report.restContacts.marginOnly]
            .filter((item) => item.bodyA === 'cube' && item.bodyB === 'ell');
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row.kind).toBe('penetration');
            expect(row.penetrationM).toBeCloseTo(0.014, 3);
            expect(row.collisionGeomArtefact).toBe(true);
            expect(row.cadExactOverlapMm3).toBe(0);
            expect(row.cadDistanceMm).toBeCloseTo(4, 2);
        }
        expect(report.restContacts.penetrating.filter((item) => item.collisionGeomArtefact !== true)).toEqual([]);
        expect(report.restContacts.marginOnly.filter((item) => item.collisionGeomArtefact !== true)).toEqual([]);
        expect(report.ok).toBe(true);
        expect(report.summary).toContain('collision-geometry artefacts');
        expect(report.summary).toContain('CAD clearance is greater than 0.01 mm');
    }, 30000);

    it('keeps a touching pair inside the convex hull as a real contact', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const arm = kcad.assembly('hull-touch');
        const axis = (origin: [number, number, number]) => ({
            type: 'axis' as const,
            origin: { kind: 'vec3' as const, value: origin },
            axis: [0, 1, 0] as [number, number, number],
        });
        // Same L as the 4 mm artefact. The cube centre is at world
        // (14, 0, 14) mm, so the 8 mm cube occupies x=[10,18], z=[10,18]
        // and shares the wall face and the slab face. Exact volume and
        // distance are 0. The hull still contains the cube. This build
        // reports a 14 mm penetration, and the zero clearance keeps every
        // row a real contact. The anchor stays clear of both solids.
        const slab = kcad.box(40, 20, 10, true).translate(20, 0, 5);
        const wall = kcad.box(10, 20, 40, true).translate(5, 0, 20);
        arm.part('ell', kcad.union(slab, wall)).connector('pin', axis([-30, 0, 0]));
        arm.part('anchor', kcad.box(20, 20, 20, true))
            .connector('pin', axis([0, 0, 0]))
            .connector('seat', axis([44, 0, 14]));
        arm.part('cube', kcad.box(8, 8, 8, true)).connector('seat', axis([0, 0, 0]));
        arm.mate('pin', 'ell.pin', 'anchor.pin', 'revolute', { pose: 0, limitsDeg: [-90, 90] });
        arm.mate('seat', 'anchor.seat', 'cube.seat', 'revolute', { pose: 0, limitsDeg: [-90, 90] });

        const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });
        const exported = await assemblyToMjcf(arm);
        expect(exported.mjcf).toContain('<body name="anchor" pos="-0.030000 0 0">');
        expect(exported.mjcf).toContain('<body name="cube" pos="0.044000 0 0.014000">');
        const rows = [...report.restContacts.penetrating, ...report.restContacts.marginOnly]
            .filter((item) => item.bodyA === 'cube' && item.bodyB === 'ell');
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row.kind).toBe('penetration');
            expect(row.penetrationM).toBeCloseTo(0.014, 3);
            expect(row.collisionGeomArtefact).toBe(false);
            expect(row.cadExactOverlapMm3).toBeCloseTo(0, 3);
            expect(row.cadExactOverlapMm3).toBeLessThanOrEqual(INTERPENETRATION_EPSILON_MM3);
            expect(row.cadDistanceMm).toBeCloseTo(0, 3);
            expect(row.cadDistanceMm ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(CONTACT_THICKNESS_MM);
        }
        expect(report.inertia.filter((row) => row.mismatch)).toEqual([]);
        expect(report.visualFindings).toEqual([]);
        expect(report.qposOutsideLimits).toEqual([]);
        expect(report.ok).toBe(false);
        expect(report.summary).toContain('penetrating');
    }, 30000);
});
