// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateFastenerInstallationCatalog } from '../../../scripts/generateFastenerInstallationCatalog';
import { callMcpTool, getToolDefinition } from '../../../src/agent/mcp/toolRegistry';
import type { HoleFastenerCoverageReport } from '../../../src/modeling/runtime/holeFastenerCoverage';
const fixture = vi.hoisted(() => ({ dir: '' }));
vi.mock('../../../src/modeling/parts/catalog', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/modeling/parts/catalog')>();
  return { ...actual, loadCatalog: () => actual.loadCatalog(fixture.dir) };
});
beforeAll(async () => { fixture.dir=mkdtempSync(join(tmpdir(),'kc-hole-public-')); await generateFastenerInstallationCatalog(fixture.dir); });
afterAll(() => rmSync(fixture.dir,{recursive:true,force:true}));
describe('public verify hole-fastener coverage workflow', () => {
  it('runs the documented example, extra-hole failure, reason repair and wrong-size failure', async () => {
    const source = readFileSync('examples/hole-fastener-coverage/four-hole-plate.kcad.ts','utf8');
    const run = (code: string, args = {}) => callMcpTool('verify',{check:'hole-fastener-coverage',code,...args}) as Promise<HoleFastenerCoverageReport>;
    const covered = await run(source);
    expect(covered).toMatchObject({ok:true,source:'local',status:'pass',counts:{holes:4,matched:4}});
    const extra = source.replace("param('extraHole', false", "param('extraHole', true");
    const failed = await run(extra);
    expect(failed).toMatchObject({ok:false,status:'fail',counts:{holes:5,failed:1}});
    const unexplained = failed.holes.find(h=>h.status==='fail')!;
    expect(unexplained.message).toBe('unexplained hole');
    const explained = await run(extra,{holeReasons:{[unexplained.id]:'cable pass-through'}});
    expect(explained).toMatchObject({ok:true,status:'pass',counts:{matched:4,explained:1}});
    const wrong = await run(source.replace('cylinder(4, 1.6)','cylinder(4, 1.25)'));
    expect(wrong).toMatchObject({ok:false,status:'fail',counts:{failed:4}});
    expect(wrong.holes.every(h=>h.fastener?.size==='M3')).toBe(true);
    const schema = getToolDefinition('verify')!.outputSchema!;
    expect(schema.properties).toHaveProperty('holes');
    expect(schema.properties).toHaveProperty('uncertainties');
  });
});
