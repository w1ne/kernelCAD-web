// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateFastenerInstallationCatalog } from '../../../scripts/generateFastenerInstallationCatalog';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { FastenerInstallationReport } from '../../../src/modeling/runtime/fastenerInstallationTypes';
const fixture = vi.hoisted(() => ({ dir: '' }));
vi.mock('../../../src/modeling/parts/catalog', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/modeling/parts/catalog')>();
  return { ...actual, loadCatalog: () => actual.loadCatalog(fixture.dir) };
});
beforeAll(async () => { fixture.dir=mkdtempSync(join(tmpdir(),'kc-fastener-public-')); await generateFastenerInstallationCatalog(fixture.dir); });
afterAll(() => rmSync(fixture.dir,{recursive:true,force:true}));
const fasteners = ['left','right'].map(side => ({ part: `${side}-screw`, against: [`${side}-washer`,'l-bracket','base'], engagementPart: `${side}-nut`, minEngagementMm: 2.3, maxProtrusionMm: 1.2 }));
describe('public verify installation repair workflow', () => {
  it('runs the actual colored catalog/parametric-placement example before and after repair', async () => {
    const source = readFileSync('examples/fastener-installation/l-bracket-mount.kcad.ts','utf8');
    const faulty = await callMcpTool('verify',{ check: 'fastener-installation', code: source, fasteners }) as FastenerInstallationReport;
    expect(faulty).toMatchObject({ ok:false,status:'fail',counts:{requested:2,measured:2,failed:1,unknown:0} });
    expect(faulty.stations[1].metrics.find(m=>m.name==='bearing-gap')!.value).toBeCloseTo(1.5,4);
    const repaired = await callMcpTool('verify',{ check: 'fastener-installation', code: source.replace("param('liftedHeadMm', 1.5", "param('liftedHeadMm', 0"), fasteners }) as FastenerInstallationReport;
    expect(repaired).toMatchObject({ ok:true,status:'pass',counts:{requested:2,measured:2,passed:2,unknown:0} });
    for (const station of repaired.stations) {
      expect(station.metrics.find(m=>m.name==='engagement')!.value).toBeCloseTo(2.4,4);
      expect(station.metrics.find(m=>m.name==='tip-protrusion')!.value).toBeCloseTo(1.1,4);
    }
  });
});
