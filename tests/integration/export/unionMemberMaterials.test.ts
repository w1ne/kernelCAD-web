// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One rigid body, several finishes: a `union()` keeps each member's
// `.finish()` / `.material()` / `.color()` on the faces that came from that
// member — in the Studio mesh (featureMeshing), in an assembly part's mesh
// (scene fan-out), and in GLB export. Cut faces and faces born in a later
// feature take the body's finish. A finish on the union result still covers
// every face.

import { beforeAll, describe, expect, it } from 'vitest';
import { runScript } from '../../../src/composition/runScript';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshFeaturesPerFeature, type FeatureMesh } from '../../../src/modeling/capture/featureMeshing';
import type { PBRMaterial } from '../../../src/shared/intent/material';

const SERVO = `
const caseBody = box(40, 20, 30).finish('abs', { color: '#202226' });
const horn = cylinder(8, 4).translate(0, 0, 30).finish('aluminium');
const screw = cylinder(3, 1.5).translate(15, 0, 30).finish('steel');
`;

beforeAll(async () => {
  await initOcct();
});

async function meshes(code: string): Promise<{ features: FeatureMesh[]; tailId: string }> {
  const run = await runScript({ code, fileName: 'union-members.kcad.ts' });
  const { features } = await meshFeaturesPerFeature(run.records, run.paramTable, run.session);
  return { features, tailId: run.records[run.records.length - 1]!.id };
}

function centroid(f: FeatureMesh['faces'][number]): [number, number, number] {
  const v = f.vertices;
  let x = 0, y = 0, z = 0;
  const n = v.length / 3;
  for (let i = 0; i < v.length; i += 3) { x += v[i]!; y += v[i + 1]!; z += v[i + 2]!; }
  return [x / n, y / n, z / n];
}

/** Material name each face renders with: the per-face entry, else the feature default. */
function faceNames(mesh: FeatureMesh): Array<{ name: string | undefined; c: [number, number, number] }> {
  return mesh.faces.map((f) => {
    const pbr: PBRMaterial | undefined = mesh.materialByFaceId?.[f.faceId] ?? mesh.material;
    return { name: pbr?.name, c: centroid(f) };
  });
}

function glbJson(bytes: Uint8Array): {
  materials?: Array<{ name?: string }>;
  meshes: Array<{ name?: string; primitives: Array<{ material?: number }> }>;
} {
  const buf = Buffer.from(bytes);
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
}

function glbMaterialNamesUsed(bytes: Uint8Array): string[] {
  const json = glbJson(bytes);
  const names = new Set<string>();
  for (const m of json.meshes) {
    for (const p of m.primitives) {
      if (p.material !== undefined) names.add(json.materials?.[p.material]?.name ?? '?');
    }
  }
  return [...names].sort();
}

describe('union() keeps each member finish on its own faces', () => {
  it('Studio mesh: case faces stay ABS, horn faces aluminium, screw faces steel', async () => {
    const { features, tailId } = await meshes(`${SERVO}\nreturn union(caseBody, horn, screw);`);
    const body = features.find((f) => f.featureId === tailId)!;
    expect(body.material?.name).toBe('abs');
    const faces = faceNames(body);
    const names = new Set(faces.map((f) => f.name));
    expect(names).toEqual(new Set(['abs', 'aluminium', 'steel']));
    for (const f of faces) {
      if (f.name === 'aluminium') expect(Math.hypot(f.c[0], f.c[1])).toBeLessThan(4.01);
      if (f.name === 'steel') expect(Math.hypot(f.c[0] - 15, f.c[1])).toBeLessThan(1.51);
      if (f.name !== 'abs') expect(f.c[2]).toBeGreaterThanOrEqual(30 - 1e-6);
    }
  });

  it('a cut face takes the body finish, not the cutter finish', async () => {
    const { features, tailId } = await meshes(
      `${SERVO}\nreturn union(caseBody, horn).subtract(cylinder(50, 3).translate(10, 5, -5).finish('steel'));`,
    );
    const body = features.find((f) => f.featureId === tailId)!;
    const names = new Set(faceNames(body).map((f) => f.name));
    expect(names).toEqual(new Set(['abs', 'aluminium']));
  });

  it('a fillet after the union keeps member finishes; a blend on the horn rim stays aluminium', async () => {
    const { features, tailId } = await meshes(`${SERVO}\nreturn union(caseBody, horn).fillet(0.5);`);
    const body = features.find((f) => f.featureId === tailId)!;
    expect(body.material?.name).toBe('abs');
    const faces = faceNames(body);
    expect(new Set(faces.map((f) => f.name))).toEqual(new Set(['abs', 'aluminium']));
    // The horn's top rim blend: a curved band whose every vertex sits just
    // under the horn top (z 37.5..38) — not the flat top disc.
    const rim = body.faces
      .map((face, i) => ({ face, name: faces[i]!.name }))
      .filter(({ face }) => {
        const v = face.vertices;
        let minZ = Infinity, maxZ = -Infinity;
        for (let i = 2; i < v.length; i += 3) { minZ = Math.min(minZ, v[i]!); maxZ = Math.max(maxZ, v[i]!); }
        return minZ > 37.4 && maxZ - minZ > 0.1;
      });
    expect(rim.length).toBeGreaterThan(0);
    for (const f of rim) expect(f.name).toBe('aluminium');
  });

  it('a bore drilled only through one member has that member finish', async () => {
    const { features, tailId } = await meshes(
      `${SERVO}\nreturn union(caseBody, horn).subtract(cylinder(4, 1).translate(0, 0, 34).finish('steel'));`,
    );
    const body = features.find((f) => f.featureId === tailId)!;
    const bore = faceNames(body).filter((f) => Math.hypot(f.c[0], f.c[1]) < 1.01 && f.c[2] > 34);
    expect(bore.length).toBeGreaterThan(0);
    for (const f of bore) expect(f.name).toBe('aluminium');
  });

  it('a finish on the union result still covers every face', async () => {
    const { features, tailId } = await meshes(`${SERVO}\nreturn union(caseBody, horn, screw).finish('brass');`);
    const body = features.find((f) => f.featureId === tailId)!;
    expect(body.material?.name).toBe('brass');
    expect(body.materialByFaceId).toBeUndefined();
  });

  it('operands sharing one finish produce no per-face entries', async () => {
    const { features, tailId } = await meshes(
      `return union(box(10, 10, 10).finish('steel'), cylinder(5, 3).translate(5, 5, 10).finish('steel'));`,
    );
    const body = features.find((f) => f.featureId === tailId)!;
    expect(body.material?.name).toBe('steel');
    expect(body.materialByFaceId).toBeUndefined();
  });

  it('assembly part built from a union keeps member finishes in its mesh', async () => {
    const { features } = await meshes(
      `${SERVO}\nconst arm = assembly('servo');\narm.part('servo', union(caseBody, horn, screw));\nreturn arm.model();`,
    );
    const part = features.find((f) => f.assemblyPartName === 'servo')!;
    expect(part).toBeDefined();
    expect(new Set(faceNames(part).map((f) => f.name))).toEqual(new Set(['abs', 'aluminium', 'steel']));
  });

  it('GLB export writes one material per member finish for a single body', async () => {
    const out = await runAndExport({
      code: `${SERVO}\nreturn union(caseBody, horn, screw);`,
      fileName: 'servo.kcad.ts',
      format: 'glb',
    });
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(glbMaterialNamesUsed(out.bytes!)).toEqual(['abs', 'aluminium', 'steel']);
  });

  it('GLB export writes member finishes for an assembly part', async () => {
    const out = await runAndExport({
      code: `${SERVO}\nconst arm = assembly('servo');\narm.part('servo', union(caseBody, horn, screw));\nreturn arm.model();`,
      fileName: 'servo-asm.kcad.ts',
      format: 'glb',
    });
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(glbMaterialNamesUsed(out.bytes!)).toEqual(['abs', 'aluminium', 'steel']);
  });
});

describe('examples/exports/servo-member-finishes.kcad.ts', () => {
  it('exports one body whose GLB keeps the case, horn and screw finishes', async () => {
    const { readFileSync } = await import('node:fs');
    const code = readFileSync(new URL('../../../examples/exports/servo-member-finishes.kcad.ts', import.meta.url), 'utf8');
    const out = await runAndExport({ code, fileName: 'servo-member-finishes.kcad.ts', format: 'glb' });
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(glbMaterialNamesUsed(out.bytes!)).toEqual(['abs', 'aluminium', 'steel']);
  });
});
