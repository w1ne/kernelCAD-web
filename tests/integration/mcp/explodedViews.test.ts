// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/mcp/explodedViews.test.ts
//
// Public-entry-point tests for exploded svg-drawing: balloons match BOM item
// numbers and the parts-list table text matches BOM rows.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const ASSEMBLY = `
const arm = assembly('enclosure');
arm.part('plate', box(40, 30, 3), { material: 'aluminum' });
arm.part('standoff_0', cylinder(3, 12), { at: [6, 6, 3], material: 'pla' });
arm.part('standoff_1', cylinder(3, 12), { at: [34, 24, 3], material: 'pla' });
arm.part('lid', box(40, 30, 2), { at: [0, 0, 15], material: 'abs' });
return arm.model();
`;

beforeAll(async () => {
  const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-exploded-'));
});
afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

describe('export svg-drawing exploded balloons + parts list', () => {
  it('balloon count equals BOM unique items and each balloon number matches its BOM row', async () => {
    const bom = await callMcpTool('inspect', { of: 'bom', code: ASSEMBLY }) as {
      ok: boolean;
      rows: Array<{ item: number; name: string; quantity: number; material: string | null; instancePaths: string[] }>;
    };
    expect(bom.ok).toBe(true);
    expect(bom.rows.length).toBeGreaterThanOrEqual(3);

    const out = join(tmpDir, 'drawing.svg');
    const exported = await callMcpTool('export', {
      target: 'model',
      code: ASSEMBLY,
      format: 'svg-drawing',
      output_path: out,
      options: {
        format: 'svg-drawing',
        exploded: { factor: 1.5, mode: 'radial' },
        balloons: true,
        partsList: true,
      },
    }) as { ok: boolean; output_path?: string; error?: string };

    expect(exported.ok, exported.error).toBe(true);
    const svg = readFileSync(out, 'utf8');
    expect(svg).toContain('data-kc-exploded="true"');

    const balloonItems = [...svg.matchAll(/data-kc-balloon="(\d+)"/g)].map((m) => Number(m[1]));
    expect(balloonItems.sort((a, b) => a - b)).toEqual(bom.rows.map((r) => r.item).sort((a, b) => a - b));
    expect(balloonItems).toHaveLength(bom.rows.length);

    for (const row of bom.rows) {
      expect(svg).toContain(`data-kc-balloon="${row.item}"`);
      expect(svg).toMatch(new RegExp(`data-kc-balloon="${row.item}"[^>]*data-kc-part="${row.instancePaths[0]}"`));
    }
  }, 60000);

  it('parts-list table text matches BOM rows', async () => {
    const bom = await callMcpTool('inspect', { of: 'bom', code: ASSEMBLY }) as {
      ok: boolean;
      rows: Array<{ item: number; name: string; quantity: number; material: string | null }>;
    };
    expect(bom.ok).toBe(true);

    const out = join(tmpDir, 'drawing.svg');
    const exported = await callMcpTool('export', {
      target: 'model',
      code: ASSEMBLY,
      format: 'svg-drawing',
      output_path: out,
      options: {
        format: 'svg-drawing',
        exploded: { factor: 1.5, mode: 'radial' },
        balloons: true,
        partsList: true,
      },
    }) as { ok: boolean; error?: string };
    expect(exported.ok, exported.error).toBe(true);
    const svg = readFileSync(out, 'utf8');
    expect(svg).toContain('id="parts-list"');
    for (const row of bom.rows) {
      expect(svg).toContain(`data-kc-bom-item="${row.item}"`);
      expect(svg).toContain(`data-kc-bom-name="${row.name}"`);
      expect(svg).toContain(`data-kc-bom-qty="${row.quantity}"`);
      const material = row.material ?? '—';
      expect(svg).toContain(`data-kc-bom-material="${material}"`);
    }
  }, 60000);

  it('emits drawing.balloons.bom-unavailable when balloons are requested on a single body', async () => {
    const out = join(tmpDir, 'block.svg');
    const exported = await callMcpTool('export', {
      target: 'model',
      code: 'return box(10, 10, 10);',
      format: 'svg-drawing',
      output_path: out,
      options: {
        format: 'svg-drawing',
        balloons: true,
        partsList: true,
      },
    }) as { ok: boolean; diagnostics?: Array<{ code: string }> };
    expect(exported.ok).toBe(true);
    expect(exported.diagnostics?.some((d) => d.code === 'drawing.balloons.bom-unavailable')).toBe(true);
  }, 60000);
});
