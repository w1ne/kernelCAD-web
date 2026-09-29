// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// End-to-end: a real script through the real kernel, feature meshing, the
// bridge serialization and the Studio geometry adapter, then face → feature
// → source range, and source position → faces.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScript } from '../../modeling/runtime/runScript';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { serializeForBridge } from '../../modeling/capture/featureMeshSerialize';
import { featureMeshesToGeometries } from '../context/geometry/types';
import type { GeometryResult } from '../../shared/worker/workerTypes';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { buildFeatureSourceIndex, featuresAtPosition, type SourceRange } from './featureSourceIndex';
import { facesForTargets, highlightTargets, pickOwner } from './geometryLineage';

const CODE = [
    "const body = box(40, 30, 10);",
    "const rounded = body.fillet(2, { parallel: [0, 0, 1] });",
    "const drilled = rounded.hole('top', { u: 0, v: 0, diameter: 6, depth: 'through' });",
    "return drilled;",
    "",
].join('\n');

function textOf(code: string, r: SourceRange): string {
    const lines = code.split('\n');
    if (r.startLineNumber !== r.endLineNumber) throw new Error('single-line ranges only');
    return lines[r.startLineNumber - 1]!.slice(r.startColumn - 1, r.endColumn - 1);
}

type FaceClass = 'plane' | 'fillet' | 'bore';

function classify(face: GeometryResult['faces'][number]): FaceClass {
    if (face.plane) return 'plane';
    if (face.cylinder && Math.abs(face.cylinder.radius - 2) < 1e-6) return 'fillet';
    if (face.cylinder && Math.abs(face.cylinder.radius - 3) < 1e-6) return 'bore';
    throw new Error(`unexpected face ${face.faceId}`);
}

let records: FeatureRecord[];
let terminal: GeometryResult;

beforeAll(async () => {
    await initOcct();
    const run = await runScript({ code: CODE, fileName: 'lineage.kcad.ts' });
    records = run.records;
    const meshing = await meshFeaturesPerFeature(run.records, run.paramTable, run.session);
    // Through JSON, as the dev and hosted mesh endpoints deliver it.
    const wire = JSON.parse(JSON.stringify(meshing.features.map(serializeForBridge)));
    const geometries = featureMeshesToGeometries(wire);
    terminal = geometries.find((g) => g.featureId === records[records.length - 1]!.id)!;
}, 120_000);

describe('selection ↔ code lineage on box + fillet + hole', () => {
    it('maps every face of the final solid to the call that created it', () => {
        const index = buildFeatureSourceIndex(CODE, records);
        const expected: Record<FaceClass, string> = {
            plane: 'box(40, 30, 10)',
            fillet: 'fillet(2, { parallel: [0, 0, 1] })',
            bore: "hole('top', { u: 0, v: 0, diameter: 6, depth: 'through' })",
        };
        const seen = new Set<FaceClass>();
        for (const face of terminal.faces) {
            const cls = classify(face);
            const owner = pickOwner(terminal, { shapeIndex: 0, kind: 'face', id: face.faceId });
            expect(owner, `face ${face.faceId} (${cls})`).not.toBeNull();
            const entry = index.byFeatureId.get(owner!);
            expect(entry?.callRange, `face ${face.faceId} (${cls})`).toBeDefined();
            expect(textOf(CODE, entry!.callRange!)).toBe(expected[cls]);
            seen.add(cls);
        }
        expect([...seen].sort()).toEqual(['bore', 'fillet', 'plane']);
    });

    it('maps the hole rim edges to the hole and the fillet tangent edges to the fillet', () => {
        const holeId = records.find((r) => r.kind === 'hole')!.id;
        const filletId = records.find((r) => r.kind === 'fillet')!.id;
        const edgeCount = terminal.edgeRanges!.length / 2;
        const owners = Array.from({ length: edgeCount }, (_, id) =>
            pickOwner(terminal, { shapeIndex: 0, kind: 'edge', id }));
        // Two rims + the bore seam belong to the hole.
        expect(owners.filter((o) => o === holeId).length).toBeGreaterThanOrEqual(2);
        expect(owners.filter((o) => o === filletId).length).toBeGreaterThanOrEqual(8);
        expect(owners.every((o) => o !== null)).toBe(true);
    });

    it('code cursor → exactly the faces that call produced', () => {
        const index = buildFeatureSourceIndex(CODE, records);
        const byClass = (ids: number[]): FaceClass[] => [...new Set(
            ids.map((id) => classify(terminal.faces.find((f) => f.faceId === id)!)),
        )].sort();

        // Cursor on `fillet` in line 2.
        const filletIds = featuresAtPosition(index, 2, CODE.split('\n')[1]!.indexOf('fillet') + 2);
        const filletFaces = facesForTargets(terminal, highlightTargets(filletIds, records));
        expect(filletFaces).toHaveLength(4);
        expect(byClass(filletFaces)).toEqual(['fillet']);

        // Cursor inside the hole's option object.
        const holeIds = featuresAtPosition(index, 3, CODE.split('\n')[2]!.indexOf('diameter') + 1);
        expect(byClass(facesForTargets(terminal, highlightTargets(holeIds, records)))).toEqual(['bore']);

        // Cursor on `const body` (statement, not the call): the box's faces.
        const boxIds = featuresAtPosition(index, 1, 2);
        const boxFaces = facesForTargets(terminal, highlightTargets(boxIds, records));
        expect(boxFaces).toHaveLength(6);
        expect(byClass(boxFaces)).toEqual(['plane']);
    });
});

const ASM = [
    "const arm = assembly('a');",
    "const plate = box(40, 30, 10).fillet(2, { parallel: [0, 0, 1] }).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through' });",
    "const base = arm.part('base', plate);",
    "const link = arm.part('arm', box(10, 40, 6).translate(0, 20, 0));",
    "base.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 20, 16] }, axis: [0, 1, 0] });",
    "link.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });",
    "arm.mate('elbow', 'base.pivot', 'arm.pivot', 'revolute', { limitsDeg: [0, 90] });",
    "return arm.solvedModel({ elbow: 45 });",
].join('\n');

describe('selection ↔ code lineage through an assembly part', () => {
    it('maps faces of a posed part mesh to the calls inside the part source', async () => {
        const run = await runScript({ code: ASM, fileName: 'asm.kcad.ts' });
        const meshing = await meshFeaturesPerFeature(run.records, run.paramTable, run.session);
        const geometries = featureMeshesToGeometries(JSON.parse(JSON.stringify(meshing.features.map(serializeForBridge))));
        const base = geometries.find((g) => g.assemblyPartName === 'base')!;
        const index = buildFeatureSourceIndex(ASM, run.records);
        const line2 = ASM.split('\n')[1]!;
        const calls = new Set(base.faces.map((f) => {
            const owner = pickOwner(base, { shapeIndex: 0, kind: 'face', id: f.faceId })!;
            const r = index.byFeatureId.get(owner)!.callRange!;
            return line2.slice(r.startColumn - 1, r.endColumn - 1).split('(')[0];
        }));
        expect([...calls].sort()).toEqual(['box', 'fillet', 'hole']);

        // Cursor on the part's `part(` call → the whole part (part-level).
        const partIds = featuresAtPosition(index, 3, ASM.split('\n')[2]!.indexOf('part(') + 2);
        expect(facesForTargets(base, highlightTargets(partIds, run.records))).toHaveLength(base.faces.length);
    }, 120_000);
});
