// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { runAndExport } from '../../../../src/agent/script-runtime/export';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('GLB rig demo evidence capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports and verifies the original hinge example hierarchy', async () => {
    const repository = resolve(import.meta.dirname, '../../../..');
    const sourcePath = join(repository, 'examples/assemblies/glb-rig-hinge.kcad.ts');
    const code = readFileSync(sourcePath, 'utf8');
    const result = await runAndExport({ code, fileName: 'glb-rig-hinge.kcad.ts', format: 'glb' });
    const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual([]);

    const view = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength);
    const jsonLength = view.getUint32(12, true);
    const gltf = JSON.parse(new TextDecoder().decode(result.bytes.subarray(20, 20 + jsonLength))) as {
      nodes?: Array<{ name?: string; children?: number[]; mesh?: number }>;
      asset?: { extras?: { kernelcad?: { rig?: Record<string, unknown>; rigWarnings?: string[] } } };
    };
    const names = new Set((gltf.nodes ?? []).map((node) => node.name));
    expect(names.has('pivot:lid')).toBe(true);
    expect(names.has('part:lid')).toBe(true);
    expect(names.has('lid')).toBe(true);
    expect(gltf.asset?.extras?.kernelcad?.rig?.lid).toMatchObject({
      type: 'rotate', axis: 'z', range: [-35, 75], node: 'pivot:lid',
    });

    expect(result.bytes.byteLength).toBeGreaterThan(20);

    if (process.env.UPDATE_GLB_RIG_DEMO === '1') {
      const outputDir = join(repository, 'docs/demos/glb-rig');
      writeFileSync(join(outputDir, 'demo.glb'), result.bytes);
      writeFileSync(join(outputDir, 'verification.json'), `${JSON.stringify({
        checkedAt: new Date().toISOString(),
        source: 'examples/assemblies/glb-rig-hinge.kcad.ts',
        exporter: 'runAndExport(format="glb")',
        glbBytes: result.bytes.byteLength,
        glbSha256: createHash('sha256').update(result.bytes).digest('hex'),
        nodes: gltf.nodes?.map((node) => ({ name: node.name, children: node.children, mesh: node.mesh })),
        rig: gltf.asset?.extras?.kernelcad?.rig,
        rigWarnings: gltf.asset?.extras?.kernelcad?.rigWarnings ?? [],
        exportWarnings: result.diagnostics.filter((diagnostic) => diagnostic.severity === 'warn').map((d) => d.message),
        claims: {
          nativeGlbHierarchy: true,
          threeJsRendered: false,
          simulationAcceptance: false,
          deployedBehavior: false,
          hardwareAcceptance: false,
        },
      }, null, 2)}\n`);
    }
  });
});
