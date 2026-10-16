import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshForHeadlessRender } from '../../../src/agent/render/headlessRender';

beforeAll(async () => {
  await initOcct();
});

describe('display mesh assemblies', () => {
  it('meshes translated display mesh parts for headless rendering', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-mesh-assembly-'));
    try {
      writeFileSync(join(dir, 'triangle.stl'), [
        'solid triangle',
        'facet normal 0 0 1',
        'outer loop',
        'vertex 0 0 0',
        'vertex 10 0 0',
        'vertex 0 10 0',
        'endloop',
        'endfacet',
        'endsolid triangle',
      ].join('\n'));
      const scriptPath = join(dir, 'synthetic.kcad.ts');
      writeFileSync(scriptPath, [
        "const arm = assembly('synthetic');",
        "const body = await lib.meshFromSTL('./triangle.stl');",
        "const link = await lib.meshFromSTL('./triangle.stl');",
        "arm.part('body', body.color('#cc3344'));",
        "arm.part('link', link.translate(20, 0, 0).color('#3344cc'));",
        'return arm.solvedModel({});',
      ].join('\n'));

      const { meshing } = await meshForHeadlessRender({
        scriptPath,
        viewportWidth: 640,
        viewportHeight: 480,
      });
      expect(meshing.failedFeatureIds).toEqual([]);
      const body = meshing.features.find((feature) => feature.assemblyPartName === 'body');
      const link = meshing.features.find((feature) => feature.assemblyPartName === 'link');
      expect(body?.mesh?.indices).toHaveLength(3);
      expect(body?.color).toBe('#cc3344');
      expect(link?.mesh?.indices).toHaveLength(3);
      expect(link?.color).toBe('#3344cc');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
