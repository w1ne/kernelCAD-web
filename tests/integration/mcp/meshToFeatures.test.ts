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
import { blobSoup, boxSoup, jitterSoup } from '../../unit/reconstruct/testMeshes';

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
  // examples/bracket-with-hole.kcad.ts, verbatim: box, bore, .fillet(1) on every edge.
  filletedBracket: readFileSync(new URL('../../../examples/bracket-with-hole.kcad.ts', import.meta.url), 'utf8'),
  mixedFillets: `return box(80, 50, 8).fillet([
    { edges: { parallel: [0, 0, 1] }, radius: 3 },
    { edges: { atZ: 8, tolerance: 0.1 }, radius: 1 },
  ]);`,
  // A corner round whose radius grows from 1 mm to 4 mm along the part: a
  // ruled loft between two rounded sections, not a constant-radius fillet.
  variableBlend: `const a = path().moveTo(0, 0).lineTo(20, 0).lineTo(20, 9).threePointsArc(19, 10, 19.707, 9.707).lineTo(0, 10).close();
    const b = path().moveTo(0, 0).lineTo(20, 0).lineTo(20, 6).threePointsArc(16, 10, 18.828, 8.828).lineTo(0, 10).close();
    return a.loft(b, { planes: [{ plane: 'YZ', origin: [0, 0, 0] }, { plane: 'YZ', origin: [60, 0, 0] }], ruled: true });`,
  // 80 x 50 x 12 base, 30 x 50 x 10 step flush with its +X end, a through
  // bore in each, every vertical edge rounded 2 mm.
  steppedBlock: `const base = box(80, 50, 12);
    const step = box(30, 50, 10).translate(50, 0, 12);
    return base.union(step)
      .hole({ byNormal: 'Z', atZ: 12 }, { u: -5, v: 0, diameter: 6.6, depth: 12 })
      .hole({ byNormal: 'Z', atZ: 22 }, { u: 0, v: 0, diameter: 16, depth: 22 })
      .fillet(2, { parallel: [0, 0, 1] });`,
} as const;

/**
 * Analytic volume of the stepped block for a length (X) and vertical round
 * radius r: base + step − the two through bores − the material a 90° round
 * removes, r²(1 − π/4) per unit length, along 88 mm of vertical edges
 * (2 x 12 at x = 0, 2 x 22 at the flush x = length end, 2 x 10 at the step).
 */
function steppedBlockVolume(length: number, r: number): number {
  return length * 50 * 12 + 30 * 50 * 10 - Math.PI * 8 ** 2 * 22 - Math.PI * 3.3 ** 2 * 12 - r * r * (1 - Math.PI / 4) * 88;
}

type ShapeInfo = { volume: number; bbox: { min: number[]; max: number[] } };

async function shapeOf(code: string): Promise<ShapeInfo> {
  const r = (await callMcpTool('inspect', { of: 'shape', code })) as { ok: boolean; error?: string; shape?: ShapeInfo };
  expect(r.error).toBeUndefined();
  expect(r.ok).toBe(true);
  return r.shape!;
}

async function withParam(code: string, name: string, value: number): Promise<string> {
  const r = (await callMcpTool('set_param', { code, param_name: name, new_value: value })) as { ok: boolean; new_code?: string; error?: string };
  expect(r.error).toBeUndefined();
  expect(r.ok).toBe(true);
  return r.new_code!;
}

function expectBox(s: ShapeInfo, max: [number, number, number]): void {
  s.bbox.min.forEach((v) => expect(v).toBeCloseTo(0, 6));
  s.bbox.max.forEach((v, i) => expect(v).toBeCloseTo(max[i], 6));
}

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
    expect(params).toMatchObject({ thickness: 6, length: 80, width: 50, holes1Diameter: 5.5 });
    expect(r.features.profiles).toEqual([{ block: 1, outline: 'rectangle', rounds: 'none' }]);
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

  it('rebuilds the unseen filleted bracket (every edge rounded 1 mm) as a sharp body plus one fillet', async () => {
    const r = await reconstructModel('filletedBracket');
    expectFaithful(r);
    expect(r.features.fillets).toEqual([{ radiusMm: 1, edges: 14 }]);
    expect(r.features.holes).toEqual([expect.objectContaining({ count: 1, diameterMm: 8, kind: 'through' })]);
    expect(r.script).toContain('.fillet(filletRadius)');
    const fact = r.ledger.facts.find((f) => f.id === 'filletRadius');
    expect(fact).toMatchObject({ kind: 'inferred', value: 1 });
    await expectScriptEvaluates(r.script);
  }, 240000);

  it('recovers both radii of a plate with 3 mm vertical rounds and 1 mm top-edge rounds', async () => {
    const r = await reconstructModel('mixedFillets');
    expectFaithful(r);
    expect([...r.features.fillets].sort((a, b) => a.radiusMm - b.radiusMm)).toEqual([
      { radiusMm: 1, edges: 4 },
      { radiusMm: 3, edges: 4 },
    ]);
    expect(r.script).toContain('{ edges: { parallel: [0, 0, 1] }, radius: fillet1Radius }');
    expect(r.script).toContain('{ edges: { atZ: 8, tolerance: 0.01 }, radius: fillet2Radius }');
    await expectScriptEvaluates(r.script);
  }, 240000);

  it('leaves a variable-radius blend approximate instead of forcing a fillet onto it', async () => {
    const r = await reconstructModel('variableBlend');
    expect(r.fidelity.verdict).toBe('approximate');
    expect(r.features.fillets).toEqual([]);
    expect(r.notRepresented.some((n) => /radius varies along the edge/.test(n))).toBe(true);
    expect(r.diagnostics.map((d) => d.code)).toContain('reference.mesh.low-fidelity');
  }, 240000);

  it('rebuilds the stepped block as length/width-driven blocks plus one fillet param, and set_param edits it as designed', async () => {
    stlPath.steppedBlock ??= await exportStl('steppedBlock');
    const r = (await callMcpTool('mesh_to_features', { file: stlPath.steppedBlock! })) as ReconstructSuccess;
    expect(r.ok).toBe(true);
    expectFaithful(r);
    const params = Object.fromEntries(r.features.params.map((p) => [p.name, p.value]));
    expect(params).toEqual({
      length: 80,
      width: 50,
      block1Height: 12,
      block2Length: 30,
      block2Height: 10,
      hole1Diameter: 16,
      hole1Depth: 22,
      hole2Diameter: 6.6,
      hole2Depth: 12,
      filletRadius: 2,
    });
    expect(r.features.profiles).toEqual([
      { block: 1, outline: 'rectangle', rounds: 'fillet' },
      { block: 2, outline: 'rectangle', rounds: 'fillet' },
    ]);
    expect(r.features.fillets).toHaveLength(1);
    expect(r.features.fillets[0].radiusMm).toBe(2);
    // The profile is drawn from the params, and the step stays flush with the
    // base end: no literal corner coordinates, no arcs in the sketch.
    expect(r.script).toContain('.lineTo(length, width)');
    expect(r.script).toContain('.moveTo(length.subtract(block2Length), 0)');
    expect(r.script).not.toMatch(/threePointsArc|tangentArc/);
    expect(r.script).toContain('.fillet(filletRadius, { parallel: [0, 0, 1]');

    const base = await shapeOf(r.script);
    expect(base.volume).toBeCloseTo(steppedBlockVolume(80, 2), 0);
    expectBox(base, [80, 50, 22]);
    // Rounds 2 → 4: the fillet skin grows, nothing else moves.
    const r4 = await shapeOf(await withParam(r.script, 'filletRadius', 4));
    expect(r4.volume).toBeCloseTo(steppedBlockVolume(80, 4), 0);
    expect(base.volume - r4.volume).toBeCloseTo((16 - 4) * (1 - Math.PI / 4) * 88, 0);
    expectBox(r4, [80, 50, 22]);
    // Length 80 → 100: the base grows 20 mm and the step rides on its end.
    const l100 = await shapeOf(await withParam(r.script, 'length', 100));
    expect(l100.volume).toBeCloseTo(steppedBlockVolume(100, 2), 0);
    expect(l100.volume - base.volume).toBeCloseTo(20 * 50 * 12, 0);
    expectBox(l100, [100, 50, 22]);
  }, 240000);

  it('writes the stepped block rounds as param-driven tangent arcs when the fillet reading does not verify', async () => {
    stlPath.steppedBlock ??= await exportStl('steppedBlock');
    const soup = parseMeshBytes(new Uint8Array(readFileSync(stlPath.steppedBlock!)), 'stl');
    // An evaluator whose kernel cannot fillet: the sharp-profile reading fails.
    const noFillets: typeof occtReconstructionEvaluator = async (script, opts) =>
      script.includes('.fillet(') ? { ok: false, error: 'fillet unavailable' } : occtReconstructionEvaluator(script, opts);
    const r = await reconstructFromSoup(soup, noFillets, { sourceName: 'stepped block' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fidelity.verdict).toBe('faithful');
    expect(r.features.fillets).toEqual([]);
    expect(r.features.profiles).toEqual([
      { block: 1, outline: 'rectangle', rounds: 'arcs' },
      { block: 2, outline: 'rectangle', rounds: 'arcs' },
    ]);
    expect(r.features.params.find((p) => p.name === 'cornerRadius')?.value).toBe(2);
    expect(r.script).toContain('.lineTo(length.subtract(cornerRadius), 0)');
    expect(r.script).toContain('.tangentArc(length, cornerRadius)');
    expect(r.script).not.toContain('threePointsArc');
    const r4 = await shapeOf(await withParam(r.script, 'cornerRadius', 4));
    expect(r4.volume).toBeCloseTo(steppedBlockVolume(80, 4), 0);
    expectBox(r4, [80, 50, 22]);
  }, 240000);

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

  it('refuses to call an open (non-watertight) mesh faithful and says why', async () => {
    const box = boxSoup(40, 30, 10);
    // Drop the two +z triangles (quads are emitted bottom, top, …).
    const open = { ...box, positions: Float64Array.from([...box.positions.slice(0, 18), ...box.positions.slice(36)]) };
    const r = await reconstructFromSoup(open, occtReconstructionEvaluator, { sourceName: 'open box', maxPasses: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mesh.watertight).toBe(false);
    expect(r.mesh.openEdges).toBeGreaterThan(0);
    expect(r.fidelity.verdict).not.toBe('faithful');
    expect(r.diagnostics.map((d) => d.code)).toContain('reference.mesh.not-watertight');
    expect(r.ledger.facts.find((f) => f.id === 'mesh.watertight')).toMatchObject({ kind: 'visible', resolution: 'open' });
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
    // Noise fragments the segmentation, but every fragment lies on the
    // reconstructed surface, so none is reported as unmatched.
    expect(r.unmatchedRegions).toEqual([]);
    expect(r.fidelity.verdict).toBe('faithful');
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
    const overBudget = await meshToFeaturesTool({ data, maxTriangles: 100 });
    expect(overBudget).toMatchObject({ ok: false, errorCode: 'cli.invalid-args' });
    if (!overBudget.ok) expect(overBudget.error).toMatch(/over the 100 budget/);
  }, 180000);
});
