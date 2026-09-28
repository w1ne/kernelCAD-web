// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/mcp/tools/export3mfBedFit.test.ts
//
// Public entry points for the 3MF bed-fit warning: the MCP `export` tool
// (through `callMcpTool`) and the CLI `exportScript` with `--options`. A
// plate that overflows the bed is still written, and the result carries a
// `warn` diagnostic that names the parts, the bed and the needed footprint.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { callMcpTool } from '../../../../src/agent/mcp/toolRegistry';
import { exportScript, parseExportOptionsFlag } from '../../../../src/agent/cli/commands/export';
import type { CompilerDiagnostic } from '../../../../src/shared/diagnostics/diagnostic';

// Six 100 x 100 mm tiles cannot share a 220 x 220 mm bed; one 300 mm bar
// is longer than the bed on its own.
const TILES = `
const a = assembly('tiles');
for (let i = 0; i < 6; i++) a.part('tile' + i, box(100, 100, 10), { at: [0, 0, 0] });
a.part('bar', box(300, 20, 10), { at: [0, 0, 0] });
return a.model();
`;

let dir: string;
beforeAll(async () => {
  const { initOcct } = await import('../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
  dir = mkdtempSync(join(tmpdir(), 'kernelcad-3mf-bed-'));
}, 60000);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function expectBedWarnings(diagnostics: readonly CompilerDiagnostic[]): void {
  const exceeds = diagnostics.find(d => d.code === 'export.3mf.exceeds-bed')!;
  expect(exceeds.severity).toBe('warn');
  expect(exceeds.message).toContain("'bar' 300.0x20.0x10.0mm");
  expect(exceeds.message).toContain("'generic-fdm' bed (220.0x220.0x250.0mm)");
  expect(exceeds.nextAction).toEqual({ kind: 'fix-arg', field: 'options.printer' });
  const overflow = diagnostics.find(d => d.code === 'export.3mf.plate-overflow')!;
  expect(overflow.severity).toBe('warn');
  expect(overflow.message).toMatch(/needs \d+\.\dx\d+\.\dmm of bed/);
  expect(overflow.message).toMatch(/'tile\d' 100\.0x100\.0x10\.0mm/);
  expect(overflow.message).not.toContain("'bar'");
  expect(overflow.hint).toMatch(/larger bed.*fewer parts per plate.*split/);
  // Both hints name the smallest bundled profiles the layout fits on.
  expect(overflow.hint).toMatch(/ Fits on: [^']+\('[a-z0-9.-]+'\)/);
  expect(exceeds.hint).toMatch(/ Fits on: [^']+\('[a-z0-9.-]+'\)/);
  expect(exceeds.hint).not.toContain("'generic-fdm'");
}

describe("3MF arrange: 'plate' bed-fit warning", () => {
  it('MCP export writes the file, stays ok, and returns the warnings', async () => {
    const out = join(dir, 'tiles-mcp.3mf');
    const r = await callMcpTool('export', {
      target: 'model',
      code: TILES,
      format: '3mf',
      output_path: out,
      options: { format: '3mf', arrange: 'plate' },
    }) as { ok: boolean; byte_count: number; diagnostics: CompilerDiagnostic[] };
    expect(r.ok).toBe(true);
    expect(r.byte_count).toBeGreaterThan(0);
    expect(existsSync(out)).toBe(true);
    expectBedWarnings(r.diagnostics);
  });

  it('CLI export --options writes the file, exits 0, and returns the warnings', async () => {
    const file = join(dir, 'tiles.kcad.ts');
    writeFileSync(file, TILES);
    const out = join(dir, 'tiles-cli.3mf');
    const parsed = parseExportOptionsFlag('{"arrange":"plate"}', '3mf');
    expect(parsed.ok).toBe(true);
    const r = await exportScript({
      file, format: '3mf', out, ...(parsed.ok ? { options: parsed.options } : {}),
    });
    expect(r.exitCode).toBe(0);
    expect(r.bytesWritten).toBeGreaterThan(0);
    expect(existsSync(out)).toBe(true);
    expectBedWarnings(r.diagnostics);
  });
});
