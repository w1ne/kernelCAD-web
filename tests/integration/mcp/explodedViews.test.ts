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

function readCookbookAssembly(): string {
  const markdown = readFileSync(join(process.cwd(), 'cookbook/snippets/exploded-assembly-drawing.md'), 'utf8');
  const match = markdown.match(/```typescript\r?\n([\s\S]*?)\r?\n```/);
  if (!match?.[1]) throw new Error('exploded-assembly-drawing cookbook snippet has no TypeScript block');
  return match[1];
}

const ASSEMBLY = readCookbookAssembly();

const EXAMPLE = readFileSync(join(process.cwd(), 'examples/exploded/enclosure.kcad.ts'), 'utf8');

type InspectedAssembly = {
  ok: boolean;
  parts?: Array<{ name: string; bbox: { min: [number, number, number]; max: [number, number, number] } }>;
};

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
  it('keeps the cookbook and CLI example standoffs 6 mm wide and 12 mm tall', async () => {
    for (const code of [ASSEMBLY, EXAMPLE]) {
      const inspected = await callMcpTool('inspect', { of: 'assembly', code }) as InspectedAssembly;
      expect(inspected.ok).toBe(true);

      for (let i = 0; i < 4; i++) {
        const part = inspected.parts?.find(({ name }) => name === `standoff_${i}`);
        expect(part, `missing standoff_${i}`).toBeDefined();
        if (!part) continue;

        const size = part.bbox.max.map((max, axis) => max - part.bbox.min[axis]!);
        expect(size[0]).toBeCloseTo(6, 3);
        expect(size[1]).toBeCloseTo(6, 3);
        expect(size[2]).toBeCloseTo(12, 3);
      }
    }
  }, 120000);

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
