// src/agent/cli/commands/inspect.test.ts
//
// W4 inspection — Task 4: `kernelcad inspect step` CLI. Tests target the
// exported action function (repo convention — commander wiring is thin).
// Fixture: same two-disjoint-solid STEP recipe as inspectStep.test.ts.

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OcctBackend, initOcct } from '../../../kernel/backends/occt/occtBackend';
import { inspectStepCli, formatStepReport, inspectCommand } from './inspect';

let tmpDir: string;
let stepPath: string;

beforeAll(async () => {
  await initOcct();
  // Plate with a Ø4 blind hole 6 deep + a disjoint cube — round-trips as a
  // 2-solid compound.
  const plate = OcctBackend.box(20, 20, 10, true)
    .subtract(OcctBackend.cylinder(6, 2).translate(0, 0, -1));
  const cube = OcctBackend.box(5, 5, 5, true).translate(40, 0, 0);
  const compound = plate.union(cube);
  tmpDir = mkdtempSync(join(tmpdir(), 'kcad-inspectcli-'));
  stepPath = join(tmpDir, 'two-solids.step');
  writeFileSync(stepPath, await compound.exportSTEPAsync());
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('inspectStepCli', () => {
  it('inspects a valid STEP file with exit 0 and a full report', async () => {
    const r = await inspectStepCli({ file: stepPath });
    expect(r.exitCode).toBe(0);
    expect(r.diagnostics).toHaveLength(0);
    expect(r.report?.solidCount).toBe(2);
    expect(r.report?.solids).toHaveLength(2);
    const plate = r.report!.solids.find((s) => s.volumeMm3 > 1000)!;
    expect(plate.holes).toHaveLength(1);
  });

  it('exits 2 with a hinted diagnostic for a missing file', async () => {
    const missing = await inspectStepCli({
      file: '/tmp/definitely-missing.step',
    });
    expect(missing.exitCode).toBe(2);
    expect(missing.report).toBeUndefined();
    expect(missing.diagnostics).toHaveLength(1);
    expect(missing.diagnostics[0].severity).toBe('error');
    expect(missing.diagnostics[0].hint).toContain('inspect');
  });

  it('exits 1 for a file that exists but is not parseable STEP', async () => {
    const badPath = join(tmpDir, 'garbage.step');
    writeFileSync(badPath, 'ISO-10303-21; this is not a valid STEP body');
    const r = await inspectStepCli({ file: badPath });
    expect(r.exitCode).toBe(1);
    expect(r.report).toBeUndefined();
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].code).toBe('feature.kernel-failed');
  });
});

describe('inspect step --json wiring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  it('success JSON matches the { ok, report, diagnostics } convention', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await inspectCommand().parseAsync(['node', 'kernelcad', 'step', stepPath, '--json']);
    expect(log).toHaveBeenCalledTimes(1);
    const out = JSON.parse(log.mock.calls[0][0] as string);
    expect(out.ok).toBe(true);
    expect(out.report.solidCount).toBe(2);
    expect(out.diagnostics).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it('failure JSON keeps the { ok: false, diagnostics } shape', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await inspectCommand().parseAsync([
      'node', 'kernelcad', 'step', '/tmp/definitely-missing.step', '--json',
    ]);
    const out = JSON.parse(log.mock.calls[0][0] as string);
    expect(out.ok).toBe(false);
    expect(out.report).toBeUndefined();
    expect(out.diagnostics).toHaveLength(1);
    expect(process.exitCode).toBe(2);
  });
});

describe('formatStepReport', () => {
  it('prints one block per solid with bbox, volume, faces, and hole lines', async () => {
    const r = await inspectStepCli({ file: stepPath });
    const text = formatStepReport(r.report!);
    const lines = text.split('\n');
    // One header line per solid.
    const headers = lines.filter((l) => l.startsWith('solid #'));
    expect(headers).toHaveLength(2);
    // Plate header carries bbox ranges, volume, face count, hole count.
    const plateHeader = headers.find((l) => l.includes('8 faces'))!;
    expect(plateHeader).toMatch(/bbox \[.*\]×\[.*\]×\[.*\] mm/);
    expect(plateHeader).toMatch(/volume \d+ mm³/);
    expect(plateHeader).toMatch(/1 hole:$/);
    // The blind hole gets its own indented line.
    const holeLine = lines.find((l) => l.includes('Ø4'))!;
    expect(holeLine).toMatch(/Ø4(\.0)? blind, depth 6(\.0)?, axis \(.*\) → \(.*\)/);
    // The cube has no holes and no trailing colon.
    const cubeHeader = headers.find((l) => l.includes('6 faces'))!;
    expect(cubeHeader).toMatch(/0 holes$/);
  });
});
