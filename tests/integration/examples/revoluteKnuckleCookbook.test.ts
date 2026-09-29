// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The revolute-joint-knuckle and chained-revolute-arm cookbook snippets teach
// the "disjoint axial ranges along the rotation axis" rule. Prove the snippets
// are collision-free at every limit (every limit CORNER for the chained arm)
// and pass the mechanism gates, and that the naive knuckle (boxes straddling
// the pivot) the rule replaces does collide.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { lookupCookbookTool } from '../../../src/agent/mcp/tools/lookupCookbook';
import type { Assembly } from '../../../src/modeling/capture/assembly';

function snippetBody(id: string): string {
  const md = readFileSync(`cookbook/snippets/${id}.md`, 'utf8');
  return md.split('```typescript')[1].split('```')[0];
}

function atPose(code: string, poses: Record<string, number>): string {
  const posed = code.replace(/return arm\.solvedModel\([^)]*\);/, `return arm.solvedModel(${JSON.stringify(poses)});`);
  expect(posed).not.toBe(code);
  return posed;
}

async function interferingPairs(code: string): Promise<string[]> {
  const r = await checkInterference({ code, fileName: 'knuckle.kcad.ts', epsilonMm3: 1e-6 });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r.pairs.map((p) => `${p.a}/${p.b}:${p.volumeMm3.toFixed(3)}`);
}

async function mechanismFailures(code: string): Promise<string[]> {
  const { evaluation, model } = await evaluateAndBuildScript({ code });
  expect(evaluation.exitCode, JSON.stringify(evaluation.diagnostics)).toBe(0);
  const arm = [...(model!.session.assemblies as Map<string, Assembly>).values()][0];
  const truth = await checkMechanismTruth(arm);
  return truth.failures.map((f) => `${f.code}: ${f.message}`);
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('revolute-joint-knuckle snippet', () => {
  const code = snippetBody('revolute-joint-knuckle');

  it('is collision-free at both limits and at rest', async () => {
    for (const hinge of [-100, 0, 100]) {
      expect(await interferingPairs(atPose(code, { hinge })), `hinge ${hinge}`).toEqual([]);
    }
  }, 180_000);

  it('passes the mechanism gates', async () => {
    expect(await mechanismFailures(code)).toEqual([]);
  }, 180_000);

  it('negative control: knuckle boxes straddling the pivot collide when the joint turns', async () => {
    const naive = `
const arm = assembly('naive');
const parent = arm.part('parent', box(30, 18, 12).translate(-24, -9, -6));
const child = arm.part('child', box(30, 18, 12).translate(-6, -9, -6));
parent.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
child.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('hinge', 'parent.pivot', 'child.pivot', 'revolute', { limitsDeg: [-100, 100] });
return arm.solvedModel({ hinge: 60 }, { validate: 'off' });
`;
    expect((await interferingPairs(naive)).length).toBe(1);
  }, 180_000);
});

describe('chained-revolute-arm snippet', () => {
  const code = snippetBody('chained-revolute-arm');

  it('is collision-free at every combination of joint limits', async () => {
    for (const shoulder of [-100, 0]) {
      for (const elbow of [-90, 90]) {
        for (const wrist of [-90, 90]) {
          const pose = { shoulder, elbow, wrist };
          expect(await interferingPairs(atPose(code, pose)), JSON.stringify(pose)).toEqual([]);
        }
      }
    }
  }, 600_000);

  it('passes the mechanism gates', async () => {
    expect(await mechanismFailures(code)).toEqual([]);
  }, 300_000);
});

describe('lookup_cookbook surfaces the knuckle snippets', () => {
  it.each([
    ['revolute joint knuckle clevis tongue pin', 'revolute-joint-knuckle'],
    ['hinge knuckle collides at every angle', 'revolute-joint-knuckle'],
    ['robot arm with three revolute joints', 'chained-revolute-arm'],
  ])('"%s" -> %s', async (query, id) => {
    const r = await lookupCookbookTool({ query });
    expect(r.ok).toBe(true);
    expect(r.hits!.slice(0, 3).map((h) => h.id)).toContain(id);
  });
});
