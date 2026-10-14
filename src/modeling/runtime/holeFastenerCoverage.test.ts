// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateFastenerInstallationCatalog } from '../../../scripts/generateFastenerInstallationCatalog';
import { createHash } from 'node:crypto';
import { SEED_FAMILIES } from '../../../scripts/generateSeedCatalog';
import { Transform } from '../../shared/runtime/se3';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { buildModel } from '../buildModel';
import { checkHoleFastenerCoverage } from './holeFastenerCoverage';

const fixture = vi.hoisted(() => ({ dir: '' }));
vi.mock('../parts/catalog', async importOriginal => {
  const actual = await importOriginal<typeof import('../parts/catalog')>();
  return { ...actual, loadCatalog: () => actual.loadCatalog(fixture.dir) };
});
beforeAll(async () => {
  fixture.dir = mkdtempSync(join(tmpdir(), 'kc-coverage-'));
  await generateFastenerInstallationCatalog(fixture.dir);
  const path = join(fixture.dir,'index.json');
  const index = JSON.parse(readFileSync(path,'utf8'));
  for (const [familyName,args] of [
    ['heat-set-insert',{thread:'M3',lengthMm:3.8}],
    ['flat-head-countersunk',{thread:'M3',lengthMm:10}],
    ['button-head-cap-screw',{thread:'M3',lengthMm:10}],
    ['hex-nut',{thread:'M5'}],
    ['lock-washer',{thread:'M3'}],
    ['flat-washer',{thread:'M6'}],
    ['socket-head-cap-screw',{thread:'M6',lengthMm:10}],
  ] as const) {
    const family = SEED_FAMILIES.find(f => f.id === familyName)!;
    const built = await family.generate(args);
    const sha256 = createHash('sha256').update(built.stepBytes).digest('hex');
    const manifest = { schemaVersion:1,partId:built.record.id,family:familyName,geometrySha256:sha256,connectors:built.connectors,license:'MIT' };
    index.records.push({...built.record,sha256,source:'local-catalog',connectorManifest:manifest});
    const dir = join(fixture.dir,familyName); mkdirSync(dir,{recursive:true});
    writeFileSync(join(dir,`${built.record.id}.step`),built.stepBytes);
    writeFileSync(join(dir,`${built.record.id}.json`),JSON.stringify(manifest));
  }
  writeFileSync(path,JSON.stringify(index));
});
afterAll(() => rmSync(fixture.dir, { recursive: true, force: true }));

function source({ extra = false, diameter = 3.2, lift = 0, offset = 0, screws = 4 } = {}): string {
  return `const a = assembly('coverage');
  const points = [[-6,-6],[-6,6],[6,-6],[6,6]];
  let plate = box(24,24,3,true).translate(0,0,1.5);
  for (const [x,y] of points) plate = plate.subtract(cylinder(4,${diameter / 2}).translate(x,y,-.5));
  ${extra ? 'plate = plate.subtract(cylinder(4,2).translate(0,0,-.5));' : ''}
  a.part('plate', plate);
  for (let i=0;i<${screws};i++) a.part('screw-'+i,(await lib.fetchPart('iso-4762-m3x10')).translate(points[i][0]+${offset},points[i][1],${3 + lift}));
  return a.model();`;
}
async function model(options = {}) { return buildModel({ code: source(options), fileName: 'coverage.kcad.ts' }); }

describe('hole-fastener coverage (real OCCT)', () => {
  it('passes a plate with four M3 holes and four catalog screws', async () => {
    const report = checkHoleFastenerCoverage(await model(), {});
    expect(report).toMatchObject({ ok: true, source: 'local', status: 'pass', counts: { holes: 4, matched: 4, failed: 0 } });
    expect(report.holes.every(h => h.fastener?.catalogId === 'iso-4762-m3x10' && h.fastener.size === 'M3')).toBe(true);
  });
  it('fails one extra hole with location and diameter', async () => {
    const report = checkHoleFastenerCoverage(await model({ extra: true }), {});
    expect(report).toMatchObject({ ok: false, status: 'fail', counts: { holes: 5, matched: 4, failed: 1 } });
    expect(report.holes.find(h => h.status === 'fail')).toMatchObject({ message: 'unexplained hole', diameterMm: 4, location: [0,0,0] });
  });
  it('accepts a written reason for the extra hole', async () => {
    const built = await model({ extra: true });
    const id = checkHoleFastenerCoverage(built, {}).holes.find(h => h.diameterMm === 4)!.id;
    const report = checkHoleFastenerCoverage(built, { holeReasons: { [id]: 'cable pass-through' } });
    expect(report).toMatchObject({ ok: true, counts: { matched: 4, explained: 1 } });
    expect(report.holes.find(h => h.id === id)?.reason).toBe('cable pass-through');
  });
  it.each([2.5, 4])('flags a mismatched %s mm bore even with reasons', async diameter => {
    const built = await model({ diameter });
    const reasons = Object.fromEntries(checkHoleFastenerCoverage(built, {}).holes.map(h => [h.id, 'vent']));
    const report = checkHoleFastenerCoverage(built, { holeReasons: reasons });
    expect(report).toMatchObject({ ok: false, status: 'fail', counts: { failed: 4 } });
    expect(report.holes.every(h => h.message === 'fastener size does not fit hole')).toBe(true);
  });
  it('accepts explicitly declared tap pilots using the existing ISO thread table', async () => {
    const built = await model({ diameter: 2.5 });
    const holeFits = Object.fromEntries(checkHoleFastenerCoverage(built, {}).holes.map(h => [h.id, 'tap' as const]));
    expect(checkHoleFastenerCoverage(built, { holeFits })).toMatchObject({ ok: true, counts: { matched: 4 } });
  });
  it.each([{ lift: 15 }, { offset: 1 }, { screws: 3 }])('does not cover holes with absent or nonoverlapping screws: %j', async options => {
    expect(checkHoleFastenerCoverage(await model(options), {})).toMatchObject({ ok: false, status: 'fail' });
  });
  it('matches screws through catalog washers and threaded nuts', async () => {
    const built = await buildModel({ code: `const a=assembly('stack');
      a.part('nut',(await lib.fetchPart('iso-4032-m3')).translate(0,0,-3));
      a.part('washer',(await lib.fetchPart('iso-7089-m3')).translate(0,0,0));
      a.part('screw',(await lib.fetchPart('iso-4762-m3x10')).translate(0,0,.5)); return a.model();`, fileName:'stack.kcad.ts' });
    expect(checkHoleFastenerCoverage(built,{})).toMatchObject({ok:true,counts:{holes:2,matched:2}});
  });
  it('uses the actual catalog lock-washer bore rather than the normal flat-washer clearance', async () => {
    const built = await buildModel({code:`const a=assembly('lock-washer');
      a.part('washer',await lib.fetchPart('din-127b-m3'));
      a.part('screw',(await lib.fetchPart('iso-4762-m3x10')).translate(0,0,.8));return a.model();`,fileName:'lock-washer.kcad.ts'});
    const report = checkHoleFastenerCoverage(built,{});
    expect(report).toMatchObject({ok:true,counts:{holes:1,matched:1}});
    expect(report.holes[0].fastener).toMatchObject({size:'M3',expectedDiameterMm:3.1});
  });
  it.each(['iso-10642-m3x10','iso-7380-m3x10'])('matches catalog screw family %s', async id => {
    const built = await buildModel({code:source().replaceAll('iso-4762-m3x10',id),fileName:'family.kcad.ts'});
    expect(checkHoleFastenerCoverage(built,{})).toMatchObject({ok:true,counts:{matched:4}});
  });
  it('matches a placed insert by outer diameter while retaining its internal bore', async () => {
    const index = JSON.parse(readFileSync(join(fixture.dir,'index.json'),'utf8'));
    const record = index.records.find((r: {family:string}) => r.family === 'heat-set-insert');
    const built = await buildModel({code:`const a=assembly('insert');
      a.part('plate',box(20,20,4,true).translate(0,0,2).subtract(cylinder(5,${record.attributes.outerDiameterMm/2}).translate(0,0,-.5)));
      a.part('insert',await lib.fetchPart('${record.id}')); return a.model();`,fileName:'insert.kcad.ts'});
    const report = checkHoleFastenerCoverage(built,{});
    expect(report.holes.find(h=>h.part==='plate')).toMatchObject({status:'matched',fastener:{catalogId:record.id,fit:'insert'}});
    expect(report.holes.find(h=>h.part==='insert')).toMatchObject({status:'fail',message:'unexplained hole'});
    const id = report.holes.find(h=>h.part==='insert')!.id;
    expect(checkHoleFastenerCoverage(built,{holeReasons:{[id]:'reserved threaded receiver'}})).toMatchObject({ok:true});
  });
  it('disambiguates a screw through an installed insert by compatible bore size', async () => {
    const index = JSON.parse(readFileSync(join(fixture.dir,'index.json'),'utf8'));
    const record = index.records.find((r: {family:string}) => r.family === 'heat-set-insert');
    const built = await buildModel({code:`const a=assembly('insert-stack');
      a.part('plate',box(20,20,4,true).translate(0,0,2).subtract(cylinder(5,${record.attributes.outerDiameterMm/2}).translate(0,0,-.5)));
      a.part('insert',await lib.fetchPart('${record.id}'));
      a.part('screw',(await lib.fetchPart('iso-4762-m3x10')).translate(0,0,4)); return a.model();`,fileName:'insert-stack.kcad.ts'});
    const report = checkHoleFastenerCoverage(built,{});
    expect(report).toMatchObject({ok:true,counts:{holes:2,matched:2}});
    expect(report.holes.find(h=>h.part==='plate')!.fastener!.part).toBe('insert');
    expect(report.holes.find(h=>h.part==='insert')!.fastener!.part).toBe('screw');
  });
  it('cannot override a known catalog receiver thread mismatch with a tap declaration', async () => {
    const built = await buildModel({code:`const a=assembly('bad-threads');
      a.part('nut',await lib.fetchPart('iso-4032-m5'));
      a.part('screw',(await lib.fetchPart('iso-4762-m6x10')).translate(0,0,5));return a.model();`,fileName:'bad-threads.kcad.ts'});
    const report = checkHoleFastenerCoverage(built,{holeFits:{'nut/hole-1':'tap'}});
    expect(report).toMatchObject({ok:false,status:'fail'});
    expect(report.holes[0]).toMatchObject({status:'fail',message:'fastener size does not fit hole',fastener:{size:'M6'}});
  });
  it('does not hide an oversized second screw behind a correctly sized match', async () => {
    const built = await buildModel({code:source().replace('return a.model();',"a.part('wrong-screw',(await lib.fetchPart('iso-4762-m6x10')).translate(-6,-6,3));return a.model();"),fileName:'wrong-duplicate.kcad.ts'});
    const report = checkHoleFastenerCoverage(built,{});
    expect(report).toMatchObject({ok:false,status:'fail',counts:{failed:1}});
    expect(report.holes.find(h=>h.status==='fail')!.fastener).toMatchObject({part:'wrong-screw',size:'M6'});
  });
  it('cannot explain away a real slot-breached partial bore', async () => {
    const built = await buildModel({code:'return box(40,40,10).subtract(cylinder(20,3).translate(20,20,-5)).subtract(box(10,2,20).translate(20,17.5,-5));',fileName:'breach.kcad.ts'});
    const first = checkHoleFastenerCoverage(built,{});
    expect(first).toMatchObject({ok:false,status:'partial',counts:{holes:1,unknown:1}});
    expect(checkHoleFastenerCoverage(built,{holeReasons:{[first.holes[0].id]:'vent'}})).toMatchObject({ok:false,status:'partial'});
  });
  it('keeps ids and matching invariant under solved rigid world placement', async () => {
    const built = await model();
    const original = checkHoleFastenerCoverage(built,{});
    const scene = built.rootShape;
    if (!isSceneBackend(scene)) throw new Error('Missing scene');
    const placement = Transform.translation(30,20,10).compose(Transform.rotationAxisAngleDeg([1,2,3],47));
    built.rootShape = {...scene,parts:scene.parts.map(p=>({...p,worldTransform:placement.compose(p.worldTransform)}))} as never;
    const report = checkHoleFastenerCoverage(built,{});
    expect(report.ok).toBe(true);
    expect(report.holes.map(h=>h.id)).toEqual(original.holes.map(h=>h.id));
    for (let i=0;i<4;i++) report.holes[i].location.forEach((n,j)=>expect(n).toBeCloseTo(placement.point(original.holes[i].location)[j],5));
  });
  it('never turns inspection errors into a passing empty inventory', async () => {
    const built = await model();
    const spy = vi.spyOn(OcctBackend.prototype,'getReplicadShape').mockImplementation(()=>{throw new Error('probe failed');});
    try { expect(checkHoleFastenerCoverage(built,{})).toMatchObject({ok:false,status:'partial'}); }
    finally { spy.mockRestore(); }
  });
  it('reports ambiguous overlapping fasteners as unknown even with reasons', async () => {
    const built = await buildModel({code:source().replace('return a.model();', "a.part('duplicate',(await lib.fetchPart('iso-4762-m3x10')).translate(-6,-6,3)); return a.model();"),fileName:'ambiguous.kcad.ts'});
    const first = checkHoleFastenerCoverage(built,{});
    const id = first.holes.find(h=>h.status==='unknown')!.id;
    expect(checkHoleFastenerCoverage(built,{holeReasons:{[id]:'vent'}})).toMatchObject({ok:false,status:'partial',counts:{unknown:1}});
  });
  it('rejects blank reasons, stale selectors and invalid tolerances', async () => {
    const built = await model();
    expect(() => checkHoleFastenerCoverage(built, { holeReasons: { 'plate/hole-1': ' ' } })).toThrow(/reason/);
    expect(() => checkHoleFastenerCoverage(built, { holeReasons: { typo: 'vent' } })).toThrow(/selector/);
    expect(() => checkHoleFastenerCoverage(built, { toleranceMm: NaN })).toThrow(/tolerance/);
    expect(() => checkHoleFastenerCoverage(built, { assembly: 'missing' })).toThrow(/assembly/);
  });
  it('checks single returned solids and does not claim coverage on zero holes', async () => {
    const built = await buildModel({ code: 'return box(20,20,3).subtract(cylinder(4,2).translate(10,10,0));', fileName: 'root.kcad.ts' });
    expect(checkHoleFastenerCoverage(built, {})).toMatchObject({ ok: false, counts: { holes: 1 } });
    const empty = await buildModel({ code: 'return box(20,20,3);', fileName: 'empty.kcad.ts' });
    expect(checkHoleFastenerCoverage(empty, {})).toMatchObject({ ok: false, status: 'no-coverage' });
  });
});
