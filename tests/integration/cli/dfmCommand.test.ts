// tests/integration/cli/dfmCommand.test.ts
//
// W3 Task 8 — `kernelcad dfm <file>` CLI surface + evaluate enforcement.
//
//   - thin-wall single-shape script → exit 1; the human-facing diagnostics
//     name the part, the measured thickness, and a world-frame xyz,
//   - `--json` emits the full DfmCheckReport in the `{ ok, report,
//     diagnostics }` envelope (the export/parts JSON convention),
//   - script WITHOUT dfmSpec → exit 2 with a "script declares no
//     dfmSpec(...)" message + non-empty hint (the gates are opt-in),
//   - unreadable file → exit 2 with cli.file-read,
//   - clean fixture → exit 0 with a PASS summary,
//   - summary line shape: `DFM: <p> parts, <c> clearance pairs, <w> wall
//     clusters, <v> voids — <PASS|FAIL>` (+ `, N unknown` when nonzero),
//   - evaluate enforcement: `evaluateScript({ code })` fails a thin-wall
//     dfmSpec script with dfm.wall.too-thin; the SAME geometry without the
//     dfmSpec line passes (enforcement strictly opt-in).

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { dfmCommand, dfmScript, formatDfmSummary } from '../../../src/agent/cli/commands/dfm';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import type { DfmCheckReport } from '../../../src/modeling/runtime/dfm/runDfmChecks';

const THIN = 'dfmSpec({ minWall: 1.5 });\nreturn box(20, 20, 1);\n';
const CLEAN = 'dfmSpec({ minWall: 1.5 });\nreturn box(20, 20, 10);\n';
const NO_SPEC = 'return box(20, 20, 1);\n';

let dir: string;
let thinPath: string;
let cleanPath: string;
let noSpecPath: string;

beforeAll(async () => {
  await initOcct();
  dir = await mkdtemp(join(tmpdir(), 'kcad-dfm-cli-'));
  thinPath = join(dir, 'thin.kcad.ts');
  cleanPath = join(dir, 'clean.kcad.ts');
  noSpecPath = join(dir, 'no-spec.kcad.ts');
  await writeFile(thinPath, THIN);
  await writeFile(cleanPath, CLEAN);
  await writeFile(noSpecPath, NO_SPEC);
}, 120_000);

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe('kernelcad dfm (CLI)', () => {
  it('fails a thin-wall single-shape script with part + thickness + xyz', async () => {
    const r = await dfmScript({ file: thinPath });
    expect(r.exitCode).toBe(1);
    expect(r.report).toBeDefined();
    const thin = r.diagnostics.filter(d => d.code === 'dfm.wall.too-thin');
    expect(thin.length).toBeGreaterThan(0);
    // Human output names the part, the measured thickness, and a location.
    expect(thin[0].message).toContain("'shape'");
    expect(thin[0].message).toMatch(/\d+\.\d+ mm wall/);
    expect(thin[0].message).toMatch(/\(-?\d+\.\d, -?\d+\.\d, -?\d+\.\d\)/);
    expect(thin[0].hint?.trim().length ?? 0).toBeGreaterThan(0);
    expect(r.summary).toMatch(/^DFM: 1 parts, 0 clearance pairs, \d+ wall clusters, 0 voids — FAIL$/);
  }, 120_000);

  it('--json emits the full DfmCheckReport in the { ok, report, diagnostics } envelope', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((s: unknown) => { lines.push(String(s)); });
    await dfmCommand().parseAsync(['node', 'dfm', thinPath, '--json']);
    expect(process.exitCode).toBe(1);
    const payload = JSON.parse(lines.join('\n')) as {
      ok: boolean;
      report: DfmCheckReport;
      diagnostics: { code: string }[];
    };
    expect(payload.ok).toBe(false);
    // The envelope carries the FULL report struct from runDfmChecksOnModel.
    expect(payload.report.clearance).toEqual([]);
    expect(payload.report.walls.length).toBe(1);
    expect(payload.report.walls[0].part).toBe('shape');
    expect(payload.report.voids.length).toBe(1);
    expect(Array.isArray(payload.report.diagnostics)).toBe(true);
    expect(typeof payload.report.timings.total).toBe('number');
    expect(payload.diagnostics.some(d => d.code === 'dfm.wall.too-thin')).toBe(true);
  }, 120_000);

  it('exits 2 with a no-spec message + hint when the script declares no dfmSpec', async () => {
    const r = await dfmScript({ file: noSpecPath });
    expect(r.exitCode).toBe(2);
    expect(r.report).toBeUndefined();
    const noSpec = r.diagnostics.find(d => d.message.includes('script declares no dfmSpec('));
    expect(noSpec).toBeDefined();
    expect(noSpec!.hint?.trim().length ?? 0).toBeGreaterThan(0);
  }, 120_000);

  it('exits 2 with cli.file-read for a missing file', async () => {
    const r = await dfmScript({ file: join(dir, 'does-not-exist.kcad.ts') });
    expect(r.exitCode).toBe(2);
    expect(r.diagnostics.some(d => d.code === 'cli.file-read')).toBe(true);
  });

  it('passes a clean fixture with exit 0 and a PASS summary', async () => {
    const r = await dfmScript({ file: cleanPath });
    expect(r.exitCode).toBe(0);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.summary).toBe('DFM: 1 parts, 0 clearance pairs, 0 wall clusters, 0 voids — PASS');
  }, 120_000);
});

describe('DFM summary line', () => {
  const report = (over: Partial<DfmCheckReport>): DfmCheckReport => ({
    clearance: [],
    walls: [],
    voids: [],
    diagnostics: [],
    timings: { total: 1 },
    ...over,
  });

  it('surfaces the unknown-pair count when nonzero without flipping PASS', () => {
    const r = report({
      clearance: [
        { a: 'left', b: 'right', status: 'ok', distanceMm: 2, exact: true },
        { a: 'left', b: 'broken', status: 'unknown', distanceMm: NaN, exact: false },
        { a: 'right', b: 'broken', status: 'unknown', distanceMm: NaN, exact: false },
      ],
    });
    expect(formatDfmSummary(r)).toBe(
      'DFM: 3 parts, 3 clearance pairs, 0 wall clusters, 0 voids, 2 unknown — PASS',
    );
  });

  it('omits the unknown count when zero and FAILs on error diagnostics', () => {
    const r = report({
      diagnostics: [{
        target: 'export-occt', code: 'dfm.wall.too-thin', severity: 'error',
        message: 'x', hint: 'y',
      }],
    });
    expect(formatDfmSummary(r)).toBe(
      'DFM: 0 parts, 0 clearance pairs, 0 wall clusters, 0 voids — FAIL',
    );
  });
});

describe('evaluate enforcement (evaluateAndBuildScript hook)', () => {
  it('evaluateScript fails a thin-wall dfmSpec script with dfm.wall.too-thin', async () => {
    const r = await evaluateScript({ code: THIN });
    expect(r.exitCode).toBe(1);
    expect(r.diagnostics.some(d => d.code === 'dfm.wall.too-thin')).toBe(true);
  }, 120_000);

  it('the same geometry WITHOUT dfmSpec passes — enforcement is strictly opt-in', async () => {
    const r = await evaluateScript({ code: NO_SPEC });
    expect(r.exitCode).toBe(0);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 120_000);
});
