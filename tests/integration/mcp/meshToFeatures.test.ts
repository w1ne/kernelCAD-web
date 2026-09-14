// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/mcp/meshToFeatures.test.ts
//
// MCP `mesh_to_features` round trips: kernelCAD models → the real STL exporter
// → reconstruction → the emitted script is evaluated and measured against the
// mesh. Bound stated here and asserted for every exact-CAD round trip:
// volume IoU >= 0.98 and max surface deviation <= 0.05 mm.

import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { meshToFeaturesTool, occtReconstructionEvaluator } from '../../../src/agent/mcp/tools/meshToFeatures';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { resolveAssumptionsTool } from '../../../src/agent/mcp/tools/resolveAssumptions';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { reconstructFromSoup, type ReconstructSuccess } from '../../../src/agent/reconstruct/reconstruct';
import { parseMeshBytes } from '../../../src/agent/reconstruct/meshIO';
import { blobSoup, jitterSoup } from '../../unit/reconstruct/testMeshes';

const MAX_DEV_BOUND_MM = 0.05;

const MODELS = {
  plate: `return box(80, 50, 6).holes('top', {
    positions: [{ u: -30, v: -17 }, { u: 30, v: -17 }, { u: -30, v: 17 }, { u: 30, v: 17 }],
    diameter: 5.5, depth: 'through',
  });`,
  lBracket: `return path().moveTo(0, 0).lineTo(60, 0).lineTo(60, 6).lineTo(6, 6).lineTo(6, 45).lineTo(0, 45).close()
    .extrude(30)
    .hole({ byNormal: 'Y', atY: 6 }, { u: 12, v: 0, diameter: 6, depth: 'through' })
    .hole({ byNormal: 'X', atX: 6 }, { u: 5, v: 0, diameter: 6, depth: 'through' });`,
  flangedCylinder: `return cylinder(8, 30).union(cylinder(20, 15).translate(0, 0, 8))
    .hole({ byNormal: 'Z', atZ: 28 }, { u: 0, v: 0, diameter: 12, depth: 'through' })
    .holes({ byNormal: 'Z', atZ: 8 }, {
      positions: [{ u: 22, v: 0 }, { u: 0, v: 22 }, { u: -22, v: 0 }, { u: 0, v: -22 }],
      diameter: 6, depth: 'through',
    });`,
  counterboredSpacer: `return box(30, 30, 12).hole('top', {
    u: 0, v: 0, diameter: 6.5, depth: 'through', counterbore: { diameter: 11, depth: 5 },
  });`,
} as const;

type ModelName = keyof typeof MODELS;
const stlPath: Partial<Record<ModelName, string>> = {};
const results: Partial<Record<ModelName, ReconstructSuccess>> = {};
let dir = '';

async function exportStl(name: ModelName): Promise<string> {
  const r = await runAndExport({ code: MODELS[name], fileName: `${name}.kcad.ts`, format: 'stl' });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new Error(`${name}: ${errors.map((e) => e.message).join('; ')}`);
  const path = join(dir, `${name}.stl`);
  writeFileSync(path, r.bytes);
  return path;
}

async function reconstructModel(name: ModelName): Promise<ReconstructSuccess> {
  if (results[name]) return results[name]!;
  stlPath[name] ??= await exportStl(name);
  const r = await meshToFeaturesTool({ file: stlPath[name]! });
  if (!r.ok) throw new Error(`${name}: ${r.error}`);
  results[name] = r;
  return r;
}

function expectFaithful(r: ReconstructSuccess): void {
  expect(r.fidelity.verdict).toBe('faithful');
  expect(r.fidelity.volumeIoU).toBeGreaterThanOrEqual(0.98);
  expect(r.fidelity.maxDeviationMm).toBeLessThanOrEqual(MAX_DEV_BOUND_MM);
  expect(r.mesh.watertight).toBe(true);
  expect(r.unmatchedRegions).toEqual([]);
  expect(r.diagnostics).toEqual([]);
}

async function expectScriptEvaluates(script: string): Promise<void> {
  const ev = (await evaluateScriptTool({ code: script })) as { ok: boolean; diagnostics?: Array<{ severity: string; message: string }> };
  const errors = (ev.diagnostics ?? []).filter((d) => d.severity === 'error');
  expect(errors).toEqual([]);
  expect(ev.ok).toBe(true);
}

describe('mesh_to_features round trips', () => {
  beforeAll(async () => {
    await initOcct();
    dir = mkdtempSync(join(tmpdir(), 'mesh-to-features-'));
  }, 120000);

  it('rebuilds a plate with four through holes as a param-driven extrude + one holes() pattern', async () => {
    const r = await reconstructModel('plate');
    expectFaithful(r);
    expect(r.features.body).toBe('extrude');
    expect(r.features.holes).toEqual([
      expect.objectContaining({ axis: 'Z', count: 4, diameterMm: 5.5, kind: 'through' }),
    ]);
    const params = Object.fromEntries(r.features.params.map((p) => [p.name, p.value]));
    expect(params).toMatchObject({ thickness: 6, width: 80, length: 50, holes1Diameter: 5.5 });
    expect(r.script).toContain(".holes({ byNormal: 'Z', atZ: 6 }");
    expect(r.script).toContain("depth: 'through'");
    // The B-rep hole detector sees four through bores on the reconstruction.
    expect(r.reconstructedHoles?.filter((h) => h.kind === 'through' && h.diameterMm === 5.5)).toHaveLength(4);
    await expectScriptEvaluates(r.script);
  }, 180000);

  it('rebuilds an L-bracket with cross-drilled holes in both legs', async () => {
    const r = await reconstructModel('lBracket');
    expectFaithful(r);
    expect(r.features.body).toBe('extrude');
    expect(r.features.holes.map((h) => [h.axis, h.count, h.diameterMm, h.kind]).sort()).toEqual([
      ['X', 1, 6, 'through'],
      ['Y', 1, 6, 'through'],
    ]);
    expect(r.script).toContain("byNormal: 'X', atX: 6");
    expect(r.script).toContain("byNormal: 'Y', atY: 6");
    await expectScriptEvaluates(r.script);
  }, 180000);

  it('rebuilds a flanged cylinder as a revolve with a bore and a bolt circle', async () => {
    const r = await reconstructModel('flangedCylinder');
    expectFaithful(r);
    expect(r.features.body).toBe('revolve');
    expect(r.features.bodyBlocks).toBe(2);
    expect(r.script).toContain('.revolve()');
    expect(r.features.holes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ axis: 'Z', count: 1, diameterMm: 12, kind: 'through' }),
        expect.objectContaining({ axis: 'Z', count: 4, diameterMm: 6, kind: 'through' }),
      ]),
    );
    const params = Object.fromEntries(r.features.params.map((p) => [p.name, p.value]));
    expect(params).toMatchObject({ step1Radius: 30, step1Height: 8, step2Radius: 15, step2Height: 20 });
    await expectScriptEvaluates(r.script);
  }, 180000);

  it('rebuilds a spacer with a counterbored through hole', async () => {
    const r = await reconstructModel('counterboredSpacer');
    expectFaithful(r);
    expect(r.features.holes).toEqual([
      expect.objectContaining({ axis: 'Z', count: 1, diameterMm: 6.5, kind: 'through', counterbore: expect.objectContaining({ diameterMm: 11 }) }),
    ]);
    expect(r.script).toContain('counterbore: {');
    await expectScriptEvaluates(r.script);
  }, 180000);

  it('never calls an organic blob faithful and lists what it could not match', async () => {
    const r = await reconstructFromSoup(blobSoup(), occtReconstructionEvaluator, { sourceName: 'blob' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fidelity.verdict).not.toBe('faithful');
    expect(['approximate', 'failed']).toContain(r.fidelity.verdict);
    expect(r.unmatchedRegions.length).toBeGreaterThan(0);
    expect(r.unmatchedRegions[0].kind).toBe('freeform');
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('reference.mesh.freeform-region-unmatched');
    expect(codes).toContain('reference.mesh.low-fidelity');
    expect(r.ledger.facts.some((f) => f.kind === 'missing')).toBe(true);
    // Every pass was measured; the verdict is the metric's, not a claim.
    expect(r.passes.every((p) => p.ok && typeof p.volumeIoU === 'number')).toBe(true);
  }, 180000);

  it('recovers hole diameters from a jittered (scan-like) plate mesh', async () => {
    stlPath.plate ??= await exportStl('plate');
    const soup = jitterSoup(parseMeshBytes(new Uint8Array(readFileSync(stlPath.plate!)), 'stl'), 0.02);
    const r = await reconstructFromSoup(soup, occtReconstructionEvaluator, { sourceName: 'jittered plate' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.features.holes).toHaveLength(1);
    expect(r.features.holes[0].count).toBe(4);
    const dia = r.features.params.find((p) => p.name === 'holes1Diameter')!;
    expect(Math.abs(dia.measured - 5.5)).toBeLessThan(0.02);
    expect(dia.value).toBe(5.5);
    expect(r.fidelity.volumeIoU).toBeGreaterThanOrEqual(0.98);
  }, 180000);

  it('writes script + ledger whose param facts resolve straight into set_param overrides', async () => {
    stlPath.counterboredSpacer ??= await exportStl('counterboredSpacer');
    const out = join(dir, 'spacer.kcad.ts');
    const r = await meshToFeaturesTool({ file: stlPath.counterboredSpacer!, out });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.written).toEqual({ script: out, ledger: join(dir, 'spacer.ledger.json') });
    expect(readFileSync(out, 'utf8')).toBe(r.script);
    const resolved = await resolveAssumptionsTool({
      ledgerPath: r.written!.ledger,
      resolutions: [{ id: 'hole1Diameter', value: 6.6 }, { id: 'thickness', confirm: true }],
    });
    expect(resolved.ok).toBe(true);
    expect(resolved.paramOverrides).toEqual({ hole1Diameter: 6.6, thickness: 12 });
  }, 180000);

  it('dispatches through the MCP registry with inline base64 data and rejects bad input', async () => {
    stlPath.counterboredSpacer ??= await exportStl('counterboredSpacer');
    const data = readFileSync(stlPath.counterboredSpacer!).toString('base64');
    const viaRegistry = (await callMcpTool('mesh_to_features', { data, maxPasses: 1 })) as { ok: boolean; fidelity?: { verdict: string } };
    expect(viaRegistry.ok).toBe(true);
    expect(viaRegistry.fidelity?.verdict).toBe('faithful');

    const none = await meshToFeaturesTool({});
    expect(none).toMatchObject({ ok: false, errorCode: 'cli.invalid-args' });
    const missing = await meshToFeaturesTool({ file: join(dir, 'does-not-exist.stl') });
    expect(missing).toMatchObject({ ok: false, errorCode: 'cli.file-read' });
    const junk = await meshToFeaturesTool({ data: Buffer.from('not a mesh at all').toString('base64') });
    expect(junk).toMatchObject({ ok: false, errorCode: 'cli.invalid-args' });
  }, 180000);
});
