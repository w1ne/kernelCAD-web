// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { runAndExport } from '../../../../src/agent/script-runtime/export';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { setParamValue } from '../../../../src/modeling/edits/setParamValue';

interface LowPolyExtras {
  units: string;
  style: string;
  stats: { triangles: number; sizeM: number[]; minUpM: number };
  palette: Array<{ name: string; color: string; parts: string[] }>;
}

const VARIANTS: Array<{ id: string; params: Record<string, string> }> = [
  { id: 'default', params: {} },
  { id: 'tall-five-tiers', params: { heightM: '8', tiers: '5', sides: '6' } },
  { id: 'autumn-short', params: { heightM: '3', tiers: '2', sides: '5', leaves: '#c9772b' } },
];

function withParams(code: string, params: Record<string, string>): string {
  return Object.entries(params).reduce((source, [name, value]) => {
    const edited = setParamValue(source, name, value);
    if (!edited.ok) throw new Error(edited.error);
    return edited.new_code;
  }, code);
}

function glbJson(bytes: Uint8Array): { materials?: Array<{ name?: string }>; asset?: { extras?: { kernelcad?: LowPolyExtras } } } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true))));
}

describe('low-poly GLB demo evidence capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports the original pine tree and two parameter variants inside its triangle budget', async () => {
    const repository = resolve(import.meta.dirname, '../../../..');
    const source = 'catalog/kits/nature/pine-tree.kcad.ts';
    const code = readFileSync(join(repository, source), 'utf8');
    const evidence = [];
    for (const variant of VARIANTS) {
      const result = await runAndExport({
        code: withParams(code, variant.params),
        fileName: 'pine-tree.kcad.ts',
        format: 'glb',
        options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 400 } },
      });
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const json = glbJson(result.bytes);
      const extras = json.asset!.extras!.kernelcad!;
      expect(json.materials?.map((m) => m.name)).toEqual(['kernelcad-palette']);
      expect(extras).toMatchObject({ units: 'm', style: 'lowpoly' });
      expect(extras.stats.triangles).toBeLessThanOrEqual(400);
      expect(extras.stats.minUpM).toBeCloseTo(0, 6);
      expect(extras.stats.sizeM[1]).toBeCloseTo(Number(variant.params.heightM ?? '4.5'), 6);
      evidence.push({ variant, bytes: result.bytes, extras });
    }

    if (process.env.UPDATE_GLB_LOWPOLY_DEMO === '1') {
      const outputDir = join(repository, 'docs/demos/glb-lowpoly');
      for (const item of evidence) writeFileSync(join(outputDir, `pine-${item.variant.id}.glb`), item.bytes);
      writeFileSync(join(outputDir, 'verification.json'), `${JSON.stringify({
        checkedAt: new Date().toISOString(),
        source,
        exporter: 'runAndExport(format="glb", options={ style: "lowpoly", lowpoly: { maxTriangles: 400 } })',
        variants: evidence.map((item) => ({
          id: item.variant.id,
          params: item.variant.params,
          file: `pine-${item.variant.id}.glb`,
          glbBytes: item.bytes.byteLength,
          glbSha256: createHash('sha256').update(item.bytes).digest('hex'),
          stats: item.extras.stats,
          palette: item.extras.palette,
        })),
        claims: {
          nativeLowPolyGlb: true,
          oneSharedOpaqueMaterial: true,
          triangleBudgetEnforced: true,
          threeJsRendered: false,
          engineImportTested: false,
          deployedBehavior: false,
        },
      }, null, 2)}\n`);
    }
  });
});
