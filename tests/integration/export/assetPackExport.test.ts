// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const CODE = `
meta({
  id: 'brass-cube',
  name: 'Brass cube',
  license: 'MIT',
  authors: ['Kernel Test'],
});
const width = param('width', 20, { min: 10, max: 40, unit: 'mm', description: 'Cube width' });
presets({ Wide: { width: 30 } });
return box(width, width, width).material({ name: 'brass', baseColor: '#c8a24a', metalness: 1, roughness: 0.35 });
`;

function glbJson(bytes: Uint8Array): {
  materials?: Array<{ name?: string }>;
  asset?: { extras?: { kernelcad?: { stats?: { triangles?: number; materials?: number } } } };
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true))));
}

describe('asset-pack export', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('zips a default-parameter GLB that keeps material names and stats', async () => {
    const first = await runAndExport({ code: CODE, fileName: 'brass-cube.kcad.ts', format: 'asset-pack' });
    const second = await runAndExport({ code: CODE, fileName: 'brass-cube.kcad.ts', format: 'asset-pack' });
    expect(first.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(second.bytes).toEqual(first.bytes);

    const files = unzipSync(first.bytes);
    expect(Object.keys(files).sort()).toEqual([
      'LICENSE.txt',
      'README.md',
      'brass-cube.glb',
      'brass-cube.kcad.ts',
      'brass-cube.params.json',
      'index.html',
      'manifest.json',
    ]);
    const readme = strFromU8(files['README.md']!);
    expect(readme).toContain('width');
    expect(readme).toContain('Cube width');
    expect(readme).toContain('Wide');
    expect(strFromU8(files['LICENSE.txt']!)).toContain('SPDX-License-Identifier: MIT');
    expect(strFromU8(files['brass-cube.kcad.ts']!)).toContain("meta({");

    const json = glbJson(files['brass-cube.glb']!);
    expect(json.materials?.some((material) => material.name === 'brass')).toBe(true);
    expect(json.asset?.extras?.kernelcad?.stats?.triangles).toBeGreaterThan(0);
    expect(json.asset?.extras?.kernelcad?.stats?.materials).toBeGreaterThan(0);
  });
});