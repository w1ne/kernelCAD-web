import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshForHeadlessRender } from '../../../src/agent/render/headlessRender';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

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

  it('evaluates a mated display mesh assembly with the mechanism gates on', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-mesh-assembly-'));
    try {
      // A closed 10 mm cube, so connectors at its centre sit in its material.
      const v = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10]];
      const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
      const facets = quads.flatMap(([a, b, c, d]) => [[a, b, c], [a, c, d]]).map(t => [
        'facet normal 0 0 0', 'outer loop', ...t.map(i => `vertex ${v[i].join(' ')}`), 'endloop', 'endfacet',
      ].join('\n'));
      writeFileSync(join(dir, 'cube.stl'), ['solid cube', ...facets, 'endsolid cube'].join('\n'));
      const scriptPath = join(dir, 'rover.kcad.ts');
      writeFileSync(scriptPath, [
        "const spin = param('spin', 0, { min: -360, max: 360 });",
        "const arm = assembly('rover');",
        "const chassis = arm.part('chassis', (await lib.meshFromSTL('./cube.stl')).color('#252b30'));",
        "const wheel = arm.part('wheel', (await lib.meshFromSTL('./cube.stl')).color('#202124'));",
        "chassis.connector('axle', { type: 'axis', origin: { kind: 'vec3', value: [10, 5, 5] }, axis: [1, 0, 0] });",
        "wheel.connector('axle', { type: 'axis', origin: { kind: 'vec3', value: [0, 5, 5] }, axis: [1, 0, 0] });",
        "arm.mate('spin', 'chassis.axle', 'wheel.axle', 'revolute', { pose: spin });",
        'return arm.solvedModel();',
      ].join('\n'));
      // Used to throw "Display mesh bodies do not expose BRep topology" from
      // the connector gate, which only needs each part's bounds.
      const out = (await callMcpTool('evaluate_script', { file: scriptPath, autosave: false } as never)) as {
        ok: boolean; diagnostics: Array<{ code?: string; severity: string }>; mechanismSummary?: { verdict: string };
      };
      expect(out.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(out.ok).toBe(true);
      expect(out.mechanismSummary?.verdict).toBe('real');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
