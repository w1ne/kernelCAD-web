// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { runAndExport } from '../../../../src/agent/script-runtime/export';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('GLB metre-scale handoff demo evidence', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports standard-viewer dimensions with named parts and PBR materials', { timeout: 60_000 }, async () => {
    const repository = resolve(import.meta.dirname, '../../../..');
    const sourcePath = join(repository, 'examples/exports/glb-meter-handoff.kcad.ts');
    const code = readFileSync(sourcePath, 'utf8');
    const result = await runAndExport({ code, fileName: 'glb-meter-handoff.kcad.ts', format: 'glb' });
    const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual([]);

    const doc = await new NodeIO().readBinary(result.bytes);
    const root = doc.getRoot().listScenes()[0]!.listChildren()[0]!;
    const plate = doc.getRoot().listNodes().find((node) => node.getName() === 'base_plate')!;
    const position = plate.getMesh()!.listPrimitives()[0]!.getAttribute('POSITION')!;
    const min = position.getMin([]);
    const max = position.getMax([]);
    const scale = root.getScale();
    const sizeM = max.map((value, axis) => (value - min[axis]!) * scale[axis]!);
    const sortedSizeM = [...sizeM].sort((a, b) => a - b);
    const nodeNames = doc.getRoot().listNodes().map((node) => node.getName());
    const materialNames = doc.getRoot().listMaterials().map((material) => material.getName());
    const extras = doc.getRoot().getAsset().extras!.kernelcad as { units: string };

    expect(extras.units).toBe('m');
    expect(scale).toEqual([0.001, 0.001, 0.001]);
    sortedSizeM.forEach((dimension, index) => {
      expect(dimension).toBeCloseTo([0.012, 0.3, 0.7][index]!, 9);
    });
    expect(nodeNames).toEqual(expect.arrayContaining(['base_plate', 'brass_standoff']));
    expect(materialNames).toEqual(expect.arrayContaining(['anodized aluminium', 'brass']));
    expect(result.bytes.byteLength).toBeGreaterThan(20);

    if (process.env.UPDATE_GLB_METER_DEMO === '1') {
      const outputDir = join(repository, 'docs/demos/glb-meter-handoff');
      writeFileSync(join(outputDir, 'handoff.glb'), result.bytes);
      writeFileSync(join(outputDir, 'verification.json'), `${JSON.stringify({
        checkedAt: new Date().toISOString(),
        source: 'examples/exports/glb-meter-handoff.kcad.ts',
        invocation: 'UPDATE_GLB_METER_DEMO=1 npx vitest run tests/integration/kernel/export/glbMeterScaleDemoCapture.test.ts --reporter=dot',
        exporter: 'runAndExport(format="glb")',
        glbBytes: result.bytes.byteLength,
        glbSha256: createHash('sha256').update(result.bytes).digest('hex'),
        authoredSizeMm: [700, 300, 12],
        importedSizeM: sortedSizeM,
        rootScale: scale,
        units: extras.units,
        nodes: nodeNames,
        materials: materialNames,
        exportWarnings: result.diagnostics.filter((diagnostic) => diagnostic.severity === 'warn').map((diagnostic) => diagnostic.message),
        claims: {
          localGlbExport: true,
          standardGltfDimensionConvention: true,
          vectorDiagramIsNotViewerRender: true,
          simulation: false,
          deployedBehavior: false,
          hardwareAcceptance: false,
        },
      }, null, 2)}\n`);
    }
  });

  it('honors an explicit millimetre selection through the script export path', { timeout: 60_000 }, async () => {
    const repository = resolve(import.meta.dirname, '../../../..');
    const sourcePath = join(repository, 'examples/exports/glb-meter-handoff.kcad.ts');
    const code = readFileSync(sourcePath, 'utf8');
    const result = await runAndExport({
      code,
      fileName: 'glb-meter-handoff.kcad.ts',
      format: 'glb',
      options: { format: 'glb', units: 'mm' },
    });
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);

    const doc = await new NodeIO().readBinary(result.bytes);
    const root = doc.getRoot().listScenes()[0]!.listChildren()[0]!;
    const plate = doc.getRoot().listNodes().find((node) => node.getName() === 'base_plate')!;
    const position = plate.getMesh()!.listPrimitives()[0]!.getAttribute('POSITION')!;
    const min = position.getMin([]);
    const max = position.getMax([]);
    const sizeMm = max.map((value, axis) => value - min[axis]!);
    const extras = doc.getRoot().getAsset().extras!.kernelcad as { units: string };

    expect(extras.units).toBe('mm');
    expect(root.getScale()).toEqual([1, 1, 1]);
    sizeMm.sort((a, b) => a - b).forEach((dimension, index) => {
      expect(dimension).toBeCloseTo([12, 300, 700][index]!, 4);
    });
  });
});
