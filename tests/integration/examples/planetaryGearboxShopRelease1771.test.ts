// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/examples/planetaryGearboxShopRelease1771.test.ts
//
// Regression gate for #1771 on the shipped cookbook snippet: the housing's
// datum B query used to miss (its outer wall centroid sits on the axis, not at
// X = -flangeR) and the assembly sheet swallowed the real error, so both the
// single-part and the full-assembly drawing exports failed.
//
// The snippet is exported through the public MCP `export` tool so the test
// covers the same path an author or agent uses: capture -> lower -> datum
// resolution -> svg sheet -> vector PDF.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const SNIPPET = 'cookbook/snippets/planetary-gearbox-shop-release.md';

/** The ```typescript block of the cookbook snippet. */
function snippetCode(): string {
  const md = readFileSync(SNIPPET, 'utf8');
  const block = md.match(/```typescript\r?\n([\s\S]*?)\r?\n```/);
  if (!block) throw new Error(`${SNIPPET}: no typescript block`);
  return block[1];
}

/** The snippet stops after the housing, so the single-part export exercises
 *  the same datum A/B/C declarations as the assembly. */
function housingCode(code: string): string {
  const cut = code.indexOf('let cover = path()');
  if (cut < 0) throw new Error('housing boundary not found in the snippet');
  return `${code.slice(0, cut)}\nreturn housing;\n`;
}

let tmpDir = '';
beforeAll(async () => {
  const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-planetary-'));
}, 180000);

afterAll(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

describe('planetary-gearbox-shop-release drawing exports (#1771)', () => {
  it.each([
    ['housing', 'svg-drawing', 'housing.svg'],
    ['housing', 'pdf-drawing', 'housing.pdf'],
    ['assembly', 'svg-drawing', 'assembly.svg'],
    ['assembly', 'pdf-drawing', 'assembly.pdf'],
  ] as const)('exports the %s as %s', async (which, format, fileName) => {
    const code = snippetCode();
    const body = which === 'housing' ? housingCode(code) : code;
    const out = join(tmpDir, fileName);
    const result = await callMcpTool('export', {
      target: 'model',
      code: body,
      format,
      output_path: out,
      options: { format },
    }) as { ok: boolean; error?: string; diagnostics?: Array<{ severity: string; code: string; message: string }> };

    expect(result.ok, result.error).toBe(true);
    const errors = (result.diagnostics ?? []).filter(d => d.severity === 'error');
    expect(errors, JSON.stringify(errors)).toEqual([]);
    const bytes = readFileSync(out);
    expect(bytes.length).toBeGreaterThan(1000);
    if (format === 'pdf-drawing') expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  }, 240000);

  it('draws the resolved datum symbols and the position frame on the assembly sheet', async () => {
    const out = join(tmpDir, 'assembly-datums.svg');
    const result = await callMcpTool('export', {
      target: 'model',
      code: snippetCode(),
      format: 'svg-drawing',
      output_path: out,
      options: { format: 'svg-drawing' },
    }) as { ok: boolean; error?: string };

    expect(result.ok, result.error).toBe(true);
    const svg = readFileSync(out, 'utf8');
    for (const label of ['A', 'B', 'C']) {
      expect(svg).toContain(`data-kc-datum="${label}"`);
    }
    expect(svg).toContain('data-kc-fcf="⌖ ⌀0.2 A B C"');
  }, 240000);
});
