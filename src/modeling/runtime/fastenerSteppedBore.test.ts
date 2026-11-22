// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateFastenerInstallationCatalog } from '../../../scripts/generateFastenerInstallationCatalog';
import { buildModel } from '../buildModel';
import { checkFastenerInstallation } from './fastenerInstallation';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { Transform } from '../../shared/runtime/se3';

const fixture = vi.hoisted(() => ({ dir: '' }));
vi.mock('../parts/catalog', async importOriginal => {
  const actual = await importOriginal<typeof import('../parts/catalog')>();
  return { ...actual, loadCatalog: () => actual.loadCatalog(fixture.dir) };
});
beforeAll(async () => {
  fixture.dir = mkdtempSync(join(tmpdir(), 'kc-stepped-bore-'));
  await generateFastenerInstallationCatalog(fixture.dir);
});
afterAll(() => rmSync(fixture.dir, { recursive: true, force: true }));

const stock = 'box(20,20,6.4).translate(-10,-10,0)';
const straight = stock + '.subtract(cylinder(8.4,1.75).translate(0,0,-1))';
const stepped = straight + '.subtract(cylinder(4.4,3.3).translate(0,0,3))';
const station = { part: 'screw', against: ['plate'] };
async function modelFor(body = stepped, offset = 0) {
  return buildModel({ fileName: 'stepped-bore.kcad.ts', code: `const a=assembly('stepped-bore');
    a.part('plate',${body});
    a.part('screw',(await lib.fetchPart('iso-4762-m3x10')).rotate([1,0,0],180).translate(${offset},0,0));
    return a.model();` });
}
async function audit(body = stepped, offset = 0) {
  return checkFastenerInstallation(await modelFor(body,offset), { fasteners: [station] });
}
const metric = (report: Awaited<ReturnType<typeof audit>>, name: string) => report.stations[0].metrics.find(m => m.name === name)!;

describe('continuous stepped bore paths (real OCCT)', () => {
  it.each([false,true])('measures a full coaxial rear step, rigid transform=%s', async transformed => {
    const model = await modelFor();
    if (transformed) {
      const placement = Transform.translation(48,-21,13).compose(Transform.rotationAxisAngleDeg([1,2,3],72));
      for (const [id,shape] of model.shapes) if (isSceneBackend(shape)) {
        model.shapes.set(id,{...shape,parts:shape.parts.map(p=>({...p,worldTransform:placement.compose(p.worldTransform)}))} as never);
      }
      model.rootShape = model.shapes.get(model.rootId!);
    }
    const report = checkFastenerInstallation(model,{fasteners:[station]});
    expect(report.status,JSON.stringify(report)).toBe('pass');
    expect(metric(report,'bore-diameter').value).toBeCloseTo(3.5,6);
    expect(metric(report,'axial-overlap').value).toBeCloseTo(6.4,6);
    expect(metric(report,'bearing-gap').value).toBeCloseTo(0,6);
  });

  it('uses the minimum diameter across three adjacent full-wall steps', async () => {
    const body = 'box(20,20,8).translate(-10,-10,0)'
      + '.subtract(cylinder(10,1.75).translate(0,0,-1))'
      + '.subtract(cylinder(6,3.3).translate(0,0,3)).subtract(cylinder(3,4).translate(0,0,6))';
    const report = await audit(body);
    expect(report.status,JSON.stringify(report)).toBe('pass');
    expect(metric(report,'bore-diameter').value).toBeCloseTo(3.5,6);
    expect(metric(report,'axial-overlap').value).toBeCloseTo(8,6);
  });

  it('does not replace the limiting small diameter with the larger rear clearance', async () => {
    const report = await audit(stepped,.4);
    expect(report.status,JSON.stringify(report)).toBe('fail');
    expect(metric(report,'bore-diameter')).toMatchObject({status:'fail',value:3.5});
  });

  it('retains a measured zero overlap when the entire path is beyond the screw tip', async () => {
    const report = await audit(stepped+'.translate(0,0,12)');
    expect(metric(report,'axial-overlap')).toMatchObject({status:'fail',value:0});
    expect(report.ok).toBe(false);
  });
});

describe('unsupported stepped paths stay unknown (real OCCT)', () => {
  it.each([.02,.2])('does not join coaxial blind holes across a %s mm web', async web => {
    const body = stock + '.subtract(cylinder(4,1.75).translate(0,0,-1))'
      + `.subtract(cylinder(4.4,3.3).translate(0,0,${3+web}))`;
    const report = await audit(body);
    expect(report.ok).toBe(false);
    expect(metric(report,'bore-diameter').status).toBe('unknown');
  });

  const cases = [
    ['internal material in the common core',stepped+'.union(cylinder(.15,.8).translate(0,0,4))'],
    ['thin blind cap',stock+'.subtract(cylinder(8,1.75).translate(0,0,.08)).subtract(cylinder(4.4,3.3).translate(0,0,3))'],
    ['distinct nearby axes',straight+'.subtract(cylinder(4.4,3.3).translate(.02,0,3))'],
    ['skewed rear axis',straight+'.subtract(cylinder(4.4,3.3).rotate([0,1,0],.2).translate(0,0,3))'],
    ['narrow small-wall breach',stepped+'.subtract(box(15,.4,1).translate(0,-.2,1).rotate([0,0,1],45))'],
    ['narrow large-wall breach',stepped+'.subtract(box(15,.4,1).translate(0,-.2,4).rotate([0,0,1],45))'],
    ['partial continuation after rear pocket','box(20,20,8).translate(-10,-10,0)'
      + '.subtract(cylinder(10,1.75).translate(0,0,-1)).subtract(cylinder(3.4,3.3).translate(0,0,3))'
      + '.subtract(box(10,20,2).translate(0,-10,6.4))'],
  ];
  it.each(cases)('does not certify a %s',async (_name,body) => {
    const report = await audit(body);
    expect(report.ok,JSON.stringify(report)).toBe(false);
    expect(metric(report,'bore-diameter').status).toBe('unknown');
  });
});
