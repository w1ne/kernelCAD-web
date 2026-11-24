// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/assemblies/glbMechanismVerify.test.ts
//
// Imported KiCad / LabWired GLB hardware (PCB + pins + panel) as a first-class
// animatable rigid body mated to a parametric BRep bracket. Verifies that
// clearance, DFM, swept collision and animation-pose checks measure the real
// GLB geometry instead of reporting it unknown.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { dfmCheckTool } from '../../../src/agent/mcp/tools/dfmCheck';
import { validateAssemblyTool } from '../../../src/agent/mcp/tools/validateAssembly';
import { checkPhysicsTool } from '../../../src/agent/mcp/tools/checkPhysics';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { BuiltModel } from '../../../src/composition/buildModel';
import { checkSweptCollision } from '../../../src/kinematic/checkSweptCollision';
import { checkClearanceRangeTool } from '../../../src/agent/mcp/tools/checkClearanceRange';
import { detectInterferencesForPoses } from '../../../src/modeling/mates/poseEnvelope';
import { verifyAnimation } from '../../../src/modeling/animation/verifyAnimation';
import type { NormalizedAnimationTrack } from '../../../src/shared/intent/animationViewRecord';

type Mechanism = 'revolute' | 'prismatic';

const dir = mkdtempSync(join(tmpdir(), 'kcad-glb-mech-'));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** An L-profile board (PCB plus raised panel) extruded along Y, as one
 *  connected multi-material mesh. Triangles are a soup; the connectivity gate
 *  welds equal coordinates, so the panel and pad skins belong to the board. */
function boardProfileTriangles(): number[][] {
  const tris: number[][] = [];
  const profile: Array<[number, number]> = [
    [0, 0], [30, 0], [30, 10], [24, 10], [24, 2], [0, 2],
  ];
  const y0 = 0;
  const y1 = 20;
  // Front / back faces, split into the board rectangle and the panel block.
  tris.push([0, y0, 0, 30, y0, 0, 30, y0, 2], [0, y0, 0, 30, y0, 2, 0, y0, 2]);
  tris.push([24, y0, 2, 30, y0, 2, 30, y0, 10], [24, y0, 2, 30, y0, 10, 24, y0, 10]);
  tris.push([0, y1, 0, 30, y1, 2, 30, y1, 0], [0, y1, 0, 0, y1, 2, 30, y1, 2]);
  tris.push([24, y1, 2, 30, y1, 10, 30, y1, 2], [24, y1, 2, 24, y1, 10, 30, y1, 10]);
  // Extruded side quads along every profile edge.
  for (let i = 0; i < profile.length; i++) {
    const [x0, z0] = profile[i];
    const [x1, z1] = profile[(i + 1) % profile.length];
    tris.push([x0, y0, z0, x1, y0, z1, x1, y1, z1]);
    tris.push([x0, y0, z0, x1, y1, z1, x0, y1, z0]);
  }
  return tris;
}

async function hardwareGlb(): Promise<Uint8Array> {
  const doc = new Document();
  doc.getRoot().getAsset().extras = { kernelcad: { units: 'mm' } };
  const buffer = doc.createBuffer();
  const scene = doc.createScene('hardware');
  const accessor = (array: Float32Array | Uint16Array, type: 'VEC3' | 'SCALAR') =>
    doc.createAccessor().setType(type).setArray(array as never).setBuffer(buffer);
  const pcb = doc.createMaterial('solder-mask').setBaseColorFactor([0.1, 0.4, 0.2, 1]);
  const gold = doc.createMaterial('gold-pad').setBaseColorFactor([1, 0.77, 0.34, 1]);
  const dark = doc.createMaterial('panel').setBaseColorFactor([0.1, 0.1, 0.12, 1]);
  const primitive = (name: string, tris: number[][], material: typeof pcb) => {
    const positions = new Float32Array(tris.flat());
    const node = doc.createNode(name)
      .setMesh(doc.createMesh(name).addPrimitive(
        doc.createPrimitive().setAttribute('POSITION', accessor(positions, 'VEC3')).setMaterial(material),
      ));
    scene.addChild(node);
  };
  primitive('pcb-board', boardProfileTriangles(), pcb);
  // Raised-panel skin shares the exact top-face coordinates of the board.
  primitive('panel', [
    [24, 0, 10, 30, 0, 10, 30, 20, 10],
    [24, 0, 10, 30, 20, 10, 24, 20, 10],
  ], dark);
  // Gold pad/pin region shares the board-top corner vertex (0, 0, 2).
  primitive('gold-pads', [
    [0, 0, 2, 10, 0, 2, 10, 8, 2],
    [0, 0, 2, 10, 8, 2, 0, 8, 2],
  ], gold);
  return new NodeIO().writeBinary(doc);
}

function limitsFor(kind: Mechanism, colliding: boolean): readonly [number, number] {
  if (kind === 'revolute') return colliding ? [0, 60] : [0, 25];
  return colliding ? [0, 20] : [0, 10];
}

function bracketFor(kind: Mechanism): string {
  const post = 'box(10, 20, 24).translate(15, 0, 6)';
  if (kind === 'prismatic') {
    return `box(80, 20, 6).union(${post}).union(box(5, 20, 40).translate(70, 0, 6))`;
  }
  // A gantry column + bridge carries a stop wall beside the horizontally
  // swinging board; the board tilts about the vertical hinge into it.
  return `box(60, 20, 6).union(${post}).union(box(5, 5, 44).translate(5, 15, 6)).union(box(55, 20, 5).translate(5, 15, 45)).union(box(15, 15, 15).translate(45, 35, 30))`;
}

function scriptFor(kind: Mechanism, colliding: boolean): string {
  const [low, high] = limitsFor(kind, colliding);
  const axis = kind === 'revolute' ? '0, 0, 1' : '1, 0, 0';
  const limitsKey = kind === 'revolute' ? 'limitsDeg' : 'limitsMm';
  return [
    `const swing = param('swing', ${low}, { min: ${low}, max: ${high} });`,
    `animationView({ name: 'glb ${kind}', fps: 10, tracks: [{ param: 'swing', keys: [{ atMs: 0, value: ${low} }, { atMs: 1000, value: ${high} }] }] });`,
    "const board = await lib.meshFromGLB('./hardware.glb', { units: 'mm', upAxis: 'z' });",
    `const arm = assembly('glb-${kind}-${colliding ? 'hit' : 'clear'}');`,
    `const bracket = arm.part('bracket', ${bracketFor(kind)});`,
    "const carrier = arm.part('carrier', box(5, 20, 2));",
    "const display = arm.part('display', board);",
    `bracket.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [25, 10, 30] }, axis: [${axis}] });`,
    `carrier.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 10, 0] }, axis: [${axis}] });`,
    "carrier.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [2.5, 10, 2] } });",
    "display.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 10, 0] } });",
    `arm.mate('swing', 'bracket.axis', 'carrier.axis', '${kind}', { pose: swing, ${limitsKey}: [${low}, ${high}] });`,
    "arm.mate('seat', 'carrier.mount', 'display.mount', 'fastened');",
    'dfmSpec({ minClearance: 1 });',
    "return arm.solvedModel({}, { clearances: [{ parts: ['bracket', 'display'], minMm: 1 }], contacts: [{ parts: ['bracket', 'carrier'], maxVolumeMm3: 1 }] });",
  ].join('\n');
}

function writeScript(kind: Mechanism, colliding: boolean): string {
  const path = join(dir, `${kind}-${colliding ? 'hit' : 'clear'}.kcad.ts`);
  writeFileSync(path, scriptFor(kind, colliding));
  return path;
}

async function built(file: string): Promise<{ model: BuiltModel; arm: Assembly }> {
  const { evaluation, model } = await evaluateAndBuildScript({ file });
  expect(evaluation.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  if (model === undefined) throw new Error('model build failed');
  const arm = [...model.session.assemblies.values()][0] as Assembly;
  expect(arm).toBeDefined();
  return { model, arm };
}

function tracksOf(model: BuiltModel): NormalizedAnimationTrack[] {
  const records = model.records.filter((r) => r.kind === 'animationView');
  const metadata = records[records.length - 1]!.metadata as unknown as { tracks: NormalizedAnimationTrack[] };
  return metadata.tracks;
}

beforeAll(async () => {
  writeFileSync(join(dir, 'hardware.glb'), await hardwareGlb());
});

const MECHANISMS: readonly Mechanism[] = ['revolute', 'prismatic'];

describe.each(MECHANISMS)('GLB hardware mechanism (%s)', (kind) => {
  it('measures real clearance and passes assembly, swept, clearance-range, DFM and animation checks', async () => {
    const file = writeScript(kind, false);
    const { model, arm } = await built(file);

    const assembly = await validateAssemblyTool({ file });
    expect(assembly.ok).toBe(true);

    // MuJoCo physics (criteria 5/6) cannot model an imported GLB body yet: it
    // has no BRep mass properties, so the MJCF builder emits no body for it.
    // The gate must say so loudly (unverified + budget warning) rather than
    // claim a completed dynamics verdict over geometry it never simulated.
    const physics = await checkPhysicsTool({ file });
    expect(physics.ok).toBe(false);
    expect(physics).toMatchObject({ mechanism: 'unverified', coverage: { physics: false } });
    const physicsFailures = 'failures' in physics ? physics.failures : [];
    expect(physicsFailures.map((f) => f.code)).toContain('mechanism.physics-budget-exceeded');

    const swept = await checkSweptCollision(arm, { joint: 'swing', range: [...limitsFor(kind, false), 1] });
    expect(swept.ok).toBe(true);
    expect(swept.collidingPoses).toEqual([]);

    const range = await checkClearanceRangeTool({ file, min_clearance_mm: 1 });
    expect(range.ok).toBe(true);
    if (!('rows' in range)) throw new Error('clearance-range returned no rows');
    const row = range.rows.find((r) => r.at === 'range');
    expect(row).toBeDefined();
    expect(row!.actual).not.toBeNull();
    expect(Number.isFinite(row!.actual!)).toBe(true);
    expect(row!.actual!).toBeGreaterThanOrEqual(1);

    const dfm = await dfmCheckTool({ file });
    expect(dfm.ok).toBe(true);
    const bracketDisplay = dfm.clearance.find(
      (r) => [r.a, r.b].sort().join('|') === ['bracket', 'display'].sort().join('|'),
    );
    expect(bracketDisplay?.status).toBe('ok');
    expect(Number.isFinite(bracketDisplay!.distanceMm)).toBe(true);

    const animation = await verifyAnimation(model, tracksOf(model));
    expect(animation.ok).toBe(true);
    expect(animation.collisions).toEqual([]);
  }, 300_000);

  it('detects the GLB hardware colliding with the BRep stop and reports the pose', async () => {
    const file = writeScript(kind, true);
    const { model, arm } = await built(file);

    const swept = await checkSweptCollision(arm, { joint: 'swing', range: [...limitsFor(kind, true), 1] });
    expect(swept.ok).toBe(false);
    expect(swept.collidingPoses.length).toBeGreaterThan(0);
    expect(swept.collidingPoses.some((p) => p.contacts.some(
      (c) => [c.partA, c.partB].sort().join('|') === ['bracket', 'display'].sort().join('|'),
    ))).toBe(true);

    const range = await checkClearanceRangeTool({ file, min_clearance_mm: 1 });
    expect(range.ok).toBe(false);
    if (!('rows' in range)) throw new Error('clearance-range returned no rows');
    expect(range.rows.some((r) => r.status === 'fail')).toBe(true);

    const pairs = await detectInterferencesForPoses(arm, { swing: limitsFor(kind, true)[1] }, 0.01);
    const hit = pairs.find((p) => [p.a, p.b].sort().join('|') === ['bracket', 'display'].sort().join('|'));
    expect(hit).toBeDefined();
    expect(hit!.volumeMm3).toBeGreaterThan(0.01);

    const animation = await verifyAnimation(model, tracksOf(model));
    expect(animation.ok).toBe(false);
    expect(animation.collisions.length).toBeGreaterThan(0);
    expect(animation.collisions.some(
      (c) => [c.a, c.b].sort().join('|') === ['bracket', 'display'].sort().join('|'),
    )).toBe(true);
  }, 300_000);
});
