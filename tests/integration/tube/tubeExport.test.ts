// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { runTubeChecksOnModel } from '../../../src/modeling/runtime/tube/runTubeChecks';
import { runAndExport, runAndExportParts } from '../../../src/agent/script-runtime/export';
import { listPartStats } from '../../../src/agent/script-runtime/partStats';
import { exportScript } from '../../../src/agent/cli/commands/export';

// Parallel hollow tubes: offset 1 mm overlaps their walls; offset 30 mm
// leaves 20 mm clearance. No fitting exemptions or expensive bent routes.
const lines = (offset: number, declareSpec = true) => `
const asm = assembly('parallel-lines');
${declareSpec ? 'tubeSpec({});' : ''}
asm.part('a', tube('a', { from: { point: [0, 0, 0] }, to: { point: [100, 0, 0] }, od: 10, wall: 1, bendRadius: 30 }));
asm.part('b', tube('b', { from: { point: [0, ${offset}, 0] }, to: { point: [100, ${offset}, 0] }, od: 10, wall: 1, bendRadius: 30 }));
return asm.model();`;
const BROKEN = lines(1);
const GOOD = lines(30);
const dirs: string[] = [];
beforeAll(async () => { await initOcct(); }, 120_000);
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function workspace(): { file: string; out: string } {
  const dir = mkdtempSync(join(tmpdir(), 'kcad-tube-export-'));
  dirs.push(dir);
  const file = join(dir, 'lines.kcad.ts');
  writeFileSync(file, BROKEN);
  return { file, out: join(dir, 'lines.step') };
}

describe('tube checks before fabrication export', () => {
  it('CLI refuses overlapping tubes before writing a STEP file', async () => {
    const model = await buildModel({ code: BROKEN, fileName: 'lines.kcad.ts' });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const report = await runTubeChecksOnModel(model);
    expect(report?.diagnostics.filter(d => d.severity === 'error').map(d => d.code)).toEqual(['tube.clearance.overlap']);
    const { file, out } = workspace();
    const result = await exportScript({ file, format: 'step', out });
    expect(result.exitCode).toBe(1);
    expect(result.bytesWritten).toBe(0);
    expect(result.diagnostics.map(d => d.code)).toContain('tube.clearance.overlap');
    expect(existsSync(out)).toBe(false);
  }, 120_000);

  it('preserves a previous STEP file when the tube gate refuses a new export', async () => {
    const { file, out } = workspace();
    writeFileSync(out, 'previous accepted STEP');
    const result = await exportScript({ file, format: 'step', out });
    expect(result.exitCode).toBe(1);
    expect(readFileSync(out, 'utf8')).toBe('previous accepted STEP');
  }, 120_000);

  it.each(['step', 'stl', 'dxf', '3mf', 'gcode'] as const)('%s returns no fabrication bytes for overlapping tubes', async format => {
    const result = await runAndExport({ code: BROKEN, fileName: 'lines.kcad.ts', format });
    expect(result.diagnostics.map(d => d.code)).toContain('tube.clearance.overlap');
    expect(result.bytes).toHaveLength(0);
    expect(result.meshes).toBeUndefined();
  }, 120_000);

  it('exports passing tubes as real STEP solids', async () => {
    const result = await runAndExport({ code: GOOD, fileName: 'lines.kcad.ts', format: 'step' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(new TextDecoder().decode(result.bytes)).toContain('ISO-10303');
  }, 120_000);

  it('retains nonfatal tube warnings on successful STEP exports', async () => {
    const result = await runAndExport({ code: lines(30, false), fileName: 'lines.kcad.ts', format: 'step' });
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'tube.spec.defaulted', severity: 'warn' }));
  }, 120_000);

  it('checks single returned tube bend rules before STEP export', async () => {
    const result = await runAndExport({ code: `
tubeSpec({});
return tube('tight', { from: { point: [0, 0, 0] }, to: { point: [100, 100, 0] }, via: [[100, 0, 0]], od: 10, wall: 1, bendRadius: 20 });`,
      fileName: 'tight.kcad.ts', format: 'step' });
    expect(result.diagnostics.map(d => d.code)).toContain('tube.bend.radius-too-small');
    expect(result.bytes).toHaveLength(0);
  }, 120_000);

  it('keeps invalid tubes available as GLB for inspection', async () => {
    const result = await runAndExport({ code: BROKEN, fileName: 'lines.kcad.ts', format: 'glb' });
    expect(result.bytes.length).toBeGreaterThan(12);
    expect(new DataView(result.bytes.buffer, result.bytes.byteOffset).getUint32(0, true)).toBe(0x46546c67);
  }, 120_000);

  it('exports passing tubes as STL', async () => {
    const result = await runAndExport({ code: GOOD, fileName: 'lines.kcad.ts', format: 'stl' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(result.bytes.length).toBeGreaterThan(84);
  }, 120_000);

  it('refuses invalid tubes even when STL watertight verification is disabled', async () => {
    const result = await runAndExport({ code: BROKEN, fileName: 'lines.kcad.ts', format: 'stl', options: { format: 'stl', verify: false } });
    expect(result.diagnostics.map(d => d.code)).toContain('tube.clearance.overlap');
    expect(result.bytes).toHaveLength(0);
  }, 120_000);

  it('exports selected passing tubes as per-part STL', async () => {
    const result = await runAndExportParts({ code: GOOD, fileName: 'lines.kcad.ts', parts: ['a'] });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(result.parts.map(p => p.name)).toEqual(['a']);
    expect(result.parts[0].bytes.length).toBeGreaterThan(84);
  }, 120_000);

  it('keeps part measurements available for inspection of invalid tubes', async () => {
    const result = await listPartStats({ code: BROKEN, fileName: 'lines.kcad.ts' });
    expect(result.parts.map(p => p.name)).toEqual(['a', 'b']);
    for (const part of result.parts) {
      expect(part.volumeMm3).toBeGreaterThan(0);
      expect(part.triangleCount).toBeGreaterThan(0);
    }
  }, 120_000);

  it('refuses per-part STL without allowing selection to bypass the tube gate', async () => {
    const result = await runAndExportParts({ code: BROKEN, fileName: 'lines.kcad.ts', parts: ['a'] });
    expect(result.diagnostics.map(d => d.code)).toContain('tube.clearance.overlap');
    expect(result.parts).toEqual([]);
  }, 120_000);
});
