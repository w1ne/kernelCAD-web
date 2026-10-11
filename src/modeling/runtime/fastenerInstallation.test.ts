// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateFastenerInstallationCatalog } from '../../../scripts/generateFastenerInstallationCatalog';
import type { Assembly } from '../capture/assembly';
import { buildModel } from '../buildModel';
import { checkFastenerInstallation } from './fastenerInstallation';
import { Transform } from '../../shared/runtime/se3';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';

const fixture = vi.hoisted(() => ({ dir: '' }));
vi.mock('../parts/catalog', async importOriginal => {
  const actual = await importOriginal<typeof import('../parts/catalog')>();
  return { ...actual, loadCatalog: () => actual.loadCatalog(fixture.dir) };
});
beforeAll(async () => { fixture.dir = mkdtempSync(join(tmpdir(), 'kc-fastener-')); await generateFastenerInstallationCatalog(fixture.dir); });
afterAll(() => rmSync(fixture.dir, { recursive: true, force: true }));

export function installationSource({ lift = 0, offset = 0, tilt = 0, length = 10, sidewall = false, ambiguous = false, manual = false } = {}): string {
  return `
  const a = assembly('installation');
  const hole = cylinder(4, 1.6).translate(0,0,-.5);
  let plate = box(20,20,3,true).translate(0,0,1.5).subtract(hole);
  ${ambiguous ? 'plate = plate.subtract(cylinder(4,1.6).translate(5,0,-.5));' : ''}
  a.part('plate', plate);
  a.part('washer', (await lib.fetchPart('iso-7089-m3')).translate(0,0,3));
  a.part('nut', (await lib.fetchPart('iso-4032-m3')).translate(0,0,-2.4));
  ${sidewall ? "a.part('wall', box(2,20,8,true).translate(3.75,0,6));" : ''}
  const screw = ${manual ? 'cylinder(10,1.5)' : `await lib.fetchPart('iso-4762-m3x${length}')`};
  a.part('screw', screw.rotate([0,1,0], ${tilt}).translate(${offset},0,${3.5 + lift}));
  return a.model();`;
}
const station = { part: 'screw', against: ['washer', 'plate'], engagementPart: 'nut', minEngagementMm: 2.3, maxProtrusionMm: 4.2 };
async function audit(options = {}) { const model = await buildModel({ code: installationSource(options), fileName: 'fixture.kcad.ts' }); return { model, report: checkFastenerInstallation(model, { fasteners: [station] }) }; }
function metric(report: Awaited<ReturnType<typeof audit>>['report'], name: string) { return report.stations[0].metrics.find(m => m.name === name)!; }
describe('measured fastener installation (real OCCT)', () => {
  it('measures a seated plate/washer/nut station', async () => {
    const { report } = await audit();
    expect(report.status).toBe('pass'); expect(report.ok).toBe(true);
    expect(metric(report, 'bearing-gap').value).toBeCloseTo(0, 4);
    expect(metric(report, 'engagement').value).toBeCloseTo(2.4, 3);
    expect(metric(report, 'tip-protrusion').value).toBeCloseTo(4.1, 3);
  });
  it('does not classify a bore above a thin 0.08 mm blind cap as open through', async () => {
    const source = `const a=assembly('thin-cap');
      a.part('plate',box(20,20,3,true).translate(0,0,1.5)
        .subtract(cylinder(3,1.6).translate(0,0,.08)));
      a.part('screw',(await lib.fetchPart('iso-4762-m3x10')).translate(0,0,3));
      return a.model();`;
    const model = await buildModel({code:source,fileName:'thin-cap.kcad.ts'});
    const report = checkFastenerInstallation(model,{fasteners:[{part:'screw',against:['plate']}]});
    expect(report.ok).toBe(false);
    expect(report.stations[0].metrics.find(m=>m.name==='bore-diameter')!.status).toBe('unknown');
  });
  it('accounts for screw tilt accumulated before a distant receiver, with real interference evidence', async () => {
    const {model} = await audit({tilt:1});
    const scene = model.rootShape;
    expect(isSceneBackend(scene)).toBe(true);
    if (!isSceneBackend(scene)) throw new Error('Missing fixture scene');
    const screw = scene.parts.find(p=>p.name==='screw')!;
    const nut = scene.parts.find(p=>p.name==='nut')!;
    const overlap = (screw.shape as OcctBackend).clone().applyTransform(screw.worldTransform)
      .intersect((nut.shape as OcctBackend).clone().applyTransform(nut.worldTransform)).volume();
    expect(overlap).toBeGreaterThan(.5);
    const report=checkFastenerInstallation(model,{fasteners:[{...station,against:['washer']}]});
    expect(report.ok).toBe(false);
    expect(report.stations[0].metrics.find(m=>m.name==='bore-diameter' && m.part==='nut')!.status).toBe('fail');
  });
  it('rejects hash-bound connector positions that do not lie on the actual shaft cylinder', async () => {
    const model = await buildModel({code:`const a=assembly('bad-interface');
      a.part('washer',(await lib.fetchPart('iso-7089-m3')).translate(.3,0,0));
      a.part('screw',(await lib.fetchPart('iso-4762-m3x10')).translate(0,0,.5));
      return a.model();`,fileName:'bad-interface.kcad.ts'});
    const record=model.records.find(r=>r.metadata?.catalogPart?.family==='socket-head-cap-screw')!;
    const metadata=JSON.parse(JSON.stringify(record.metadata)) as typeof record.metadata;
    for (const connector of metadata!.catalogPart!.connectorManifest!.connectors) {
      (connector.origin as [number,number,number])[0]+=.3;
    }
    record.metadata=metadata;
    const report=checkFastenerInstallation(model,{fasteners:[{part:'screw',against:['washer']}]});
    expect(report.ok).toBe(false);
    expect(report.stations[0].metrics.find(m=>m.name==='catalog-geometry')!.status).toBe('unknown');
  });
  it('finds a 1.5 mm lifted bearing even while shank intersects bores', async () => {
    const { report } = await audit({ lift: 1.5 });
    expect(metric(report, 'bearing-gap')).toMatchObject({ status: 'fail', value: 1.5 }); expect(report.ok).toBe(false);
  });
  it('measures offset and tilt', async () => {
    const offset = (await audit({ offset: .5 })).report;
    expect(metric(offset, 'coaxial-offset').status).toBe('fail');
    const tilted = (await audit({ tilt: 5 })).report;
    expect(metric(tilted, 'axis-tilt').value).toBeCloseTo(5, 3); expect(tilted.ok).toBe(false);
  });
  it('fails declared short engagement and protrusion limits', async () => {
    expect(metric((await audit({ length: 6, lift: 1 })).report, 'engagement').status).toBe('fail');
    const { model } = await audit();
    const report = checkFastenerInstallation(model, { fasteners: [{ ...station, maxProtrusionMm: 1 }] });
    expect(metric(report, 'tip-protrusion').status).toBe('fail');
  });
  it('sidewall contact cannot seat a floating head', async () => {
    const { model } = await audit({ lift: 1.5, sidewall: true });
    const report = checkFastenerInstallation(model, { fasteners: [{ ...station, against: ['wall', 'washer', 'plate'] }] });
    expect(metric(report, 'bearing-gap').status).toBe('fail'); expect(report.ok).toBe(false);
  });
  it('uses transformed screw axes and solved world placements', async () => {
    const { model, report: original } = await audit();
    const transform = Transform.translation(48, -21, 13).compose(Transform.rotationAxisAngleDeg([1,2,3], 72));
    for (const [id, shape] of model.shapes) if (isSceneBackend(shape)) model.shapes.set(id, { ...shape, parts: shape.parts.map(p => ({ ...p, worldTransform: transform.compose(p.worldTransform) })) } as never);
    model.rootShape = model.shapes.get(model.rootId!);
    const report = checkFastenerInstallation(model, { fasteners: [station] });
    expect(report.status).toBe('pass');
    for (const m of original.stations[0].metrics) if (m.value !== null) expect(report.stations[0].metrics.find(n => n.name === m.name && n.part === m.part)!.value).toBeCloseTo(m.value, 4);
  });
  it('manual geometry has unknown metadata and two candidate bores are ambiguous', async () => {
    expect((await audit({ manual: true })).report.status).toBe('partial');
    const report = (await audit({ ambiguous: true, offset: 2.5 })).report;
    expect(report.ok).toBe(false); expect(report.stations[0].metrics.some(m => m.status === 'unknown')).toBe(true);
  });
  it('geometry probe failures remain unknown', async () => {
    const { model } = await audit();
    const spy = vi.spyOn(OcctBackend.prototype, 'intersect').mockImplementation(() => { throw new Error('probe failure'); });
    const report = checkFastenerInstallation(model, { fasteners: [station] });
    spy.mockRestore(); expect(report.ok).toBe(false); expect(report.status).toBe('partial');
  });
  it('zero stations is no coverage; invalid thresholds fail closed', async () => {
    const { model } = await audit();
    expect(checkFastenerInstallation(model, { fasteners: [] })).toMatchObject({ ok: false, status: 'no-coverage' });
    expect(() => checkFastenerInstallation(model, { fasteners: [station], toleranceMm: NaN })).toThrow(/tolerance/);
    expect(() => checkFastenerInstallation(model, { fasteners: [{ ...station, engagementPart: 3 as never }] })).toThrow(/engagementPart/);
    expect(() => checkFastenerInstallation(model, { fasteners: [station], assembly: 3 as never })).toThrow(/assembly/);
  });
});

describe('catalog installation evidence binding', () => {
  it('does not certify local geometry whose bytes no longer match the catalog hash', async () => {
    const path = join(fixture.dir,'socket-head-cap-screw','iso-4762-m3x10.step');
    const bytes = readFileSync(path);
    try {
      writeFileSync(path,Buffer.concat([bytes,Buffer.from('\n')]));
      expect((await audit()).report).toMatchObject({ ok: false, status: 'partial' });
    } finally { writeFileSync(path,bytes); }
  });
  it('does not retain a contradictory local sidecar as trusted catalog evidence', async () => {
    const path = join(fixture.dir,'socket-head-cap-screw','iso-4762-m3x10.json');
    const bytes = readFileSync(path);
    try {
      const manifest = JSON.parse(bytes.toString()); manifest.partId = 'different-screw';
      writeFileSync(path,JSON.stringify(manifest));
      expect((await audit()).report).toMatchObject({ ok: false, status: 'partial' });
    } finally { writeFileSync(path,bytes); }
  });
  it('rejects an existing sidecar hash rather than overwriting its contradictory binding', async () => {
    const path = join(fixture.dir,'socket-head-cap-screw','iso-4762-m3x10.json');
    const bytes = readFileSync(path);
    try {
      const manifest = JSON.parse(bytes.toString()); manifest.geometrySha256 = 'f'.repeat(64);
      writeFileSync(path,JSON.stringify(manifest));
      expect((await audit()).report).toMatchObject({ ok: false, status: 'partial' });
    } finally { writeFileSync(path,bytes); }
  });
  it('does not trust metadata manually attached to authored primitives', async () => {
    const { model } = await audit({ manual: true });
    const imported = (await audit()).model.records.find(r => r.metadata?.catalogPart?.family === 'socket-head-cap-screw')!;
    const screw = (model.session.assemblies.get('installation') as Assembly).__parts().find(p => p.name==='screw')!;
    const manual = model.records.find(r => r.id === screw.originalShape.id)!;
    manual.metadata = imported.metadata;
    expect(checkFastenerInstallation(model, { fasteners: [station] })).toMatchObject({ ok: false, status: 'partial' });
  });
});
