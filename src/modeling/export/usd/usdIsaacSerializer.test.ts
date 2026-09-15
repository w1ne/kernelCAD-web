// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// usd-isaac export. The stage is PARSED back with a small inline USDA reader
// and checked structurally — articulation root, bodies, joint types / axes /
// frames, masses, inertia, material bindings, and the referenced mesh layers —
// then pinned against a golden root layer. Substring checks would pass a
// stage no USD runtime could compose; walking prims and resolving
// relationships does not.

import { beforeAll, describe, expect, it } from 'vitest';
import { runScript } from '../../runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { createOcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import type { Assembly } from '../../capture/assembly';
import { isInertia6PositiveDefinite } from '../../runtime/mjcfExport';
import { linkInertia, quatFromTo, usdIsaacSerialize } from './usdIsaacSerializer';

// ----- minimal USDA reader ---------------------------------------------------

interface Prim {
  path: string;
  type: string;
  name: string;
  apiSchemas: string[];
  references: string[];
  attrs: Map<string, string>;
  children: Prim[];
}

interface Stage {
  meta: Map<string, string>;
  prims: Map<string, Prim>;
  roots: Prim[];
}

function parseUsda(text: string): Stage {
  const lines = text.split('\n').map((l) => l.trim());
  expect(lines[0]).toBe('#usda 1.0');
  const meta = new Map<string, string>();
  const prims = new Map<string, Prim>();
  const roots: Prim[] = [];
  const stack: Prim[] = [];
  let i = 1;

  // Layer metadata block.
  if (lines[i] === '(') {
    for (i++; lines[i] !== ')'; i++) {
      const m = /^(\w+)\s*=\s*(.+)$/.exec(lines[i]);
      if (m) meta.set(m[1], m[2].replace(/^"|"$/g, ''));
    }
    i++;
  }

  let pending: Prim | undefined;
  let inPrimMeta = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') continue;

    const def = /^def\s+(\w+)\s+"([^"]+)"\s*(\()?$/.exec(line);
    if (def) {
      const parentPath = stack.length > 0 ? stack[stack.length - 1].path : '';
      pending = {
        path: `${parentPath}/${def[2]}`,
        type: def[1],
        name: def[2],
        apiSchemas: [],
        references: [],
        attrs: new Map(),
        children: [],
      };
      inPrimMeta = def[3] === '(';
      continue;
    }
    if (inPrimMeta) {
      if (line === ')') { inPrimMeta = false; continue; }
      const api = /^prepend apiSchemas = \[(.*)\]$/.exec(line);
      if (api) pending!.apiSchemas.push(...api[1].split(',').map((s) => s.trim().replace(/"/g, '')));
      const ref = /^prepend references = @([^@]+)@$/.exec(line);
      if (ref) pending!.references.push(ref[1]);
      continue;
    }
    if (line === '{') {
      expect(pending, `'{' without a def at line ${i + 1}`).toBeDefined();
      const prim = pending!;
      if (stack.length > 0) stack[stack.length - 1].children.push(prim);
      else roots.push(prim);
      expect(prims.has(prim.path), `duplicate prim path ${prim.path}`).toBe(false);
      prims.set(prim.path, prim);
      stack.push(prim);
      pending = undefined;
      continue;
    }
    if (line === '}') {
      expect(stack.length, `unbalanced '}' at line ${i + 1}`).toBeGreaterThan(0);
      stack.pop();
      continue;
    }
    const attr = /^(?:uniform\s+)?([\w[\]]+)\s+([\w:.]+)(?:\s*=\s*(.+))?$/.exec(line);
    expect(attr, `unparseable line ${i + 1}: ${line}`).not.toBeNull();
    expect(stack.length, `attribute outside a prim at line ${i + 1}`).toBeGreaterThan(0);
    if (attr![3] !== undefined) stack[stack.length - 1].attrs.set(attr![2], attr![3]);
  }
  expect(stack).toHaveLength(0);
  return { meta, prims, roots };
}

const nums = (v: string): number[] =>
  v.replace(/[()[\]]/g, '').split(',').map((s) => s.trim()).filter((s) => s !== '').map(Number);
const token = (v: string): string => v.replace(/"/g, '');
const target = (v: string): string => v.replace(/^<|>$/g, '');

type Q = [number, number, number, number];
function rotate(q: Q, v: number[]): number[] {
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}
/** R · diag(d) · Rᵀ as the [ixx, ixy, ixz, iyy, iyz, izz] 6-vector. */
function tensorFromPrincipal(d: number[], q: Q): [number, number, number, number, number, number] {
  const cols = [rotate(q, [1, 0, 0]), rotate(q, [0, 1, 0]), rotate(q, [0, 0, 1])];
  const m = (r: number, c: number): number =>
    d[0] * cols[0][r] * cols[0][c] + d[1] * cols[1][r] * cols[1][c] + d[2] * cols[2][r] * cols[2][c];
  return [m(0, 0), m(0, 1), m(0, 2), m(1, 1), m(1, 2), m(2, 2)];
}

// ----- fixtures --------------------------------------------------------------

const TWO_LINK_ARM = `
const arm = assembly('two-link-usd-arm');
const base = arm.part('base', box(40, 40, 20, true).translate(0, 0, 10), { material: 'steel' });
const link1 = arm.part('link1', box(20, 20, 100, true).translate(0, 0, 50), { material: 'aluminum' });

base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 20] }, axis: [0, 0, 1] });
link1.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', { limitsDeg: [-90, 90] });

return arm.model();
`;

async function buildArm(code: string): Promise<Assembly> {
  const run = await runScript({ code, fileName: 'two-link.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const first = (run.session.assemblies as Map<string, Assembly>).values().next();
  expect(first.done).toBe(false);
  return first.value as Assembly;
}

describe('usdIsaacSerialize — two-link arm stage', () => {
  beforeAll(async () => { await initOcct(); }, 120000);

  it('parses into an articulation with two rigid bodies, one revolute joint, and bound materials', async () => {
    const arm = await buildArm(TWO_LINK_ARM);
    const out = await usdIsaacSerialize(arm, {});
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const stage = parseUsda(out.usda);
    expect(stage.meta.get('metersPerUnit')).toBe('1');
    expect(stage.meta.get('upAxis')).toBe('Z');
    expect(stage.roots).toHaveLength(1);
    const root = stage.roots[0];
    expect(stage.meta.get('defaultPrim')).toBe(root.name);
    expect(root.apiSchemas).toContain('PhysicsArticulationRootAPI');

    // --- bodies
    const bodies = [...stage.prims.values()].filter((p) => p.apiSchemas.includes('PhysicsRigidBodyAPI'));
    expect(bodies.map((b) => b.name).sort()).toEqual(['base', 'link1']);
    const base = bodies.find((b) => b.name === 'base')!;
    const link1 = bodies.find((b) => b.name === 'link1')!;

    // steel 7850 kg/m^3 * (40*40*20 mm^3); aluminum 2700 kg/m^3 * (20*20*100 mm^3)
    expect(Number(base.attrs.get('physics:mass'))).toBeCloseTo(7850 * 32000e-9, 6);
    expect(Number(link1.attrs.get('physics:mass'))).toBeCloseTo(2700 * 40000e-9, 6);
    expect(nums(base.attrs.get('physics:centerOfMass')!)).toEqual([0, 0, 0.01]);
    expect(nums(link1.attrs.get('physics:centerOfMass')!)).toEqual([0, 0, 0.05]);
    // link1 sits where the mate solve put it, not stacked at the origin.
    expect(nums(link1.attrs.get('xformOp:translate')!)).toEqual([0, 0, 0.02]);

    // --- inertia: principal moments in a principal frame that reconstruct a
    // positive-definite tensor equal to the closed-form box inertia.
    for (const [body, m, [a, b, c]] of [
      [base, 7850 * 32000e-9, [0.04, 0.04, 0.02]],
      [link1, 2700 * 40000e-9, [0.02, 0.02, 0.1]],
    ] as const) {
      const diag = nums(body.attrs.get('physics:diagonalInertia')!);
      expect(diag.every((d) => d > 0)).toBe(true);
      const q = nums(body.attrs.get('physics:principalAxes')!) as Q;
      const tensor = tensorFromPrincipal(diag, q);
      expect(isInertia6PositiveDefinite(tensor)).toBe(true);
      expect(tensor[0]).toBeCloseTo((m * (b * b + c * c)) / 12, 9);
      expect(tensor[3]).toBeCloseTo((m * (a * a + c * c)) / 12, 9);
      expect(tensor[5]).toBeCloseTo((m * (a * a + b * b)) / 12, 9);
    }

    // --- joint
    const joints = [...stage.prims.values()].filter((p) => p.type.startsWith('Physics') && p.type.endsWith('Joint'));
    expect(joints.map((j) => [j.name, j.type])).toEqual([['shoulder', 'PhysicsRevoluteJoint']]);
    const shoulder = joints[0];
    expect(token(shoulder.attrs.get('physics:axis')!)).toBe('Z');
    expect(Number(shoulder.attrs.get('physics:lowerLimit'))).toBe(-90);
    expect(Number(shoulder.attrs.get('physics:upperLimit'))).toBe(90);
    expect(target(shoulder.attrs.get('physics:body0')!)).toBe(base.path);
    expect(target(shoulder.attrs.get('physics:body1')!)).toBe(link1.path);
    // No drive declared → no drive attributes at all (never invented gains).
    expect([...shoulder.attrs.keys()].filter((k) => k.startsWith('drive:'))).toEqual([]);
    // Both sides of the joint name the same world anchor.
    const anchor0 = nums(shoulder.attrs.get('physics:localPos0')!).map((v, k) => v + nums(base.attrs.get('xformOp:translate')!)[k]);
    const anchor1 = nums(shoulder.attrs.get('physics:localPos1')!).map((v, k) => v + nums(link1.attrs.get('xformOp:translate')!)[k]);
    anchor0.forEach((v, k) => expect(v).toBeCloseTo(anchor1[k], 9));

    // --- geometry + materials
    for (const body of bodies) {
      const visual = stage.prims.get(`${body.path}/visual`)!;
      const collision = stage.prims.get(`${body.path}/collision`)!;
      expect(visual.type).toBe('Mesh');
      expect(collision.apiSchemas).toEqual(['PhysicsCollisionAPI', 'PhysicsMeshCollisionAPI']);
      expect(token(collision.attrs.get('physics:approximation')!)).toBe('convexHull');
      expect(visual.references).toEqual(collision.references);

      const layer = out.meshLayers.find((l) => l.relPath === visual.references[0]);
      expect(layer, `mesh layer ${visual.references[0]} is not emitted`).toBeDefined();
      const meshStage = parseUsda(layer!.usda);
      const mesh = meshStage.prims.get(`/${meshStage.meta.get('defaultPrim')}`)!;
      expect(mesh.type).toBe('Mesh');
      const points = nums(mesh.attrs.get('points')!);
      const indices = nums(mesh.attrs.get('faceVertexIndices')!);
      const counts = nums(mesh.attrs.get('faceVertexCounts')!);
      expect(points.length % 3).toBe(0);
      expect(counts.every((c) => c === 3)).toBe(true);
      expect(indices).toHaveLength(counts.length * 3);
      expect(Math.max(...indices)).toBeLessThan(points.length / 3);

      const binding = target(visual.attrs.get('material:binding')!);
      const material = stage.prims.get(binding)!;
      expect(material.type).toBe('Material');
      const shader = material.children.find((c) => c.type === 'Shader')!;
      expect(token(shader.attrs.get('info:id')!)).toBe('UsdPreviewSurface');
      expect(Number(shader.attrs.get('inputs:metallic'))).toBe(1); // both finishes are metals
    }

    // The base mesh is metres, in its own body frame: a 40x40x20 mm block.
    const baseLayer = parseUsda(out.meshLayers.find((l) => l.partName === 'base')!.usda);
    const bp = nums(baseLayer.prims.get('/base')!.attrs.get('points')!);
    const axis = (k: number) => bp.filter((_, n) => n % 3 === k);
    expect([Math.min(...axis(0)), Math.max(...axis(0))]).toEqual([-0.02, 0.02]);
    expect([Math.min(...axis(2)), Math.max(...axis(2))]).toEqual([0, 0.02]);

    await expect(out.usda).toMatchFileSnapshot('./__golden__/two-link-arm.usda');
  });

  it('emits a declared drive in the joint-type namespace, and nothing else', async () => {
    const arm = await buildArm(TWO_LINK_ARM);
    const out = await usdIsaacSerialize(arm, {
      drives: { shoulder: { stiffness: 1000, damping: 50, maxForce: 12, targetPosition: 15 } },
      collisionApproximation: 'convexDecomposition',
    });
    const stage = parseUsda(out.usda);
    const shoulder = [...stage.prims.values()].find((p) => p.name === 'shoulder')!;
    expect(shoulder.apiSchemas).toEqual(['PhysicsDriveAPI:angular']);
    expect(Number(shoulder.attrs.get('drive:angular:physics:stiffness'))).toBe(1000);
    expect(Number(shoulder.attrs.get('drive:angular:physics:damping'))).toBe(50);
    expect(Number(shoulder.attrs.get('drive:angular:physics:maxForce'))).toBe(12);
    expect(Number(shoulder.attrs.get('drive:angular:physics:targetPosition'))).toBe(15);
    expect([...shoulder.attrs.keys()].some((k) => k.startsWith('drive:linear:'))).toBe(false);
    const collision = [...stage.prims.values()].find((p) => p.path.endsWith('/base/collision'))!;
    expect(token(collision.attrs.get('physics:approximation')!)).toBe('convexDecomposition');
  });

  it('refuses a drive keyed by a joint that does not exist', async () => {
    const arm = await buildArm(TWO_LINK_ARM);
    const out = await usdIsaacSerialize(arm, { drives: { elbow: { stiffness: 1, damping: 1 } } });
    expect(out.usda).toBe('');
    const diag = out.diagnostics.find((d) => d.code === 'cli.invalid-args')!;
    expect(diag.severity).toBe('error');
    expect(diag.hint).toContain('shoulder');
  });

  it('lowers a prismatic mate with metre limits and a linear drive', async () => {
    const code = TWO_LINK_ARM.replace(
      "arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', { limitsDeg: [-90, 90] });",
      "arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'prismatic', { limitsMm: [0, 50] });",
    );
    const arm = await buildArm(code);
    const out = await usdIsaacSerialize(arm, { drives: { shoulder: { stiffness: 200, damping: 5 } } });
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const stage = parseUsda(out.usda);
    const joint = [...stage.prims.values()].find((p) => p.name === 'shoulder')!;
    expect(joint.type).toBe('PhysicsPrismaticJoint');
    expect(Number(joint.attrs.get('physics:lowerLimit'))).toBe(0);
    expect(Number(joint.attrs.get('physics:upperLimit'))).toBe(0.05);
    expect(joint.apiSchemas).toEqual(['PhysicsDriveAPI:linear']);
    expect(Number(joint.attrs.get('drive:linear:physics:stiffness'))).toBe(200);
  });

  it('carries a non-canonical axis as token X plus a frame rotation onto that axis', async () => {
    const code = TWO_LINK_ARM.replace(/axis: \[0, 0, 1\]/g, 'axis: [1, 1, 0]');
    const arm = await buildArm(code);
    const out = await usdIsaacSerialize(arm, {});
    const stage = parseUsda(out.usda);
    const joint = [...stage.prims.values()].find((p) => p.name === 'shoulder')!;
    expect(token(joint.attrs.get('physics:axis')!)).toBe('X');
    const jointX = rotate(nums(joint.attrs.get('physics:localRot0')!) as Q, [1, 0, 0]);
    expect(jointX[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(jointX[1]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(jointX[2]).toBeCloseTo(0, 5);
  });

  it('refuses a mate kind with no UsdPhysics joint equivalent', async () => {
    const code = TWO_LINK_ARM
      .replace(/type: 'axis',/g, "type: 'ball',")
      .replace(
        "arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', { limitsDeg: [-90, 90] });",
        "arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'ball', {});",
      );
    const arm = await buildArm(code);
    const out = await usdIsaacSerialize(arm, {});
    expect(out.usda).toBe('');
    expect(out.meshLayers).toEqual([]);
    const diag = out.diagnostics.find((d) => d.code === 'export.usd.joint-unsupported')!;
    expect(diag.severity).toBe('error');
    expect(diag.hint).toContain('sdf-gazebo');
  });
});

describe('usdIsaacSerialize — mass gate', () => {
  it('fails closed with export.usd.mass-missing when a link has no usable mass', async () => {
    // A collaborator-level fake: the gate under test only reads the part
    // list, the lowered shape's mass properties, and the capture records.
    const fakeArm = {
      name: 'massless',
      __parts: () => [{
        id: 'p1',
        name: 'ghost',
        density: 1000,
        mateConnectors: [],
        originalShape: {
          id: 'p1',
          lower: async () => ({
            massProperties: () => ({ mass: 0, com: [0, 0, 0], inertia6: [0, 0, 0, 0, 0, 0] }),
          }),
        },
      }],
      __joints: () => [],
      __mates: () => [],
      __session: () => ({ getRecords: () => [] }),
    } as unknown as Assembly;
    const out = await usdIsaacSerialize(fakeArm, {});
    expect(out.usda).toBe('');
    const diag = out.diagnostics.find((d) => d.code === 'export.usd.mass-missing')!;
    expect(diag.severity).toBe('error');
    expect(diag.hint).toContain('ghost');
    expect(diag.nextAction).toBeDefined();
  });
});

describe('usd-isaac frame maths', () => {
  it('quatFromTo handles the antiparallel case', () => {
    const q = quatFromTo([1, 0, 0], [-1, 0, 0]);
    const v = rotate(q, [1, 0, 0]);
    expect(v[0]).toBeCloseTo(-1, 9);
    expect(Math.hypot(v[1], v[2])).toBeCloseTo(0, 9);
  });

  it('linkInertia diagonalises a tensor with products of inertia and reconstructs it exactly', () => {
    const inertia6: [number, number, number, number, number, number] = [3e-4, 1e-4, 0, 2e-4, 0.5e-4, 4e-4];
    const li = linkInertia({ mass: 1, com: [10, 0, 0], inertia6 });
    expect(li.com).toEqual([0.01, 0, 0]);
    expect(li.diagonal.every((d) => d > 0)).toBe(true);
    const back = tensorFromPrincipal(li.diagonal, li.principalAxes);
    back.forEach((v, k) => expect(v).toBeCloseTo(inertia6[k], 12));
  });
});
