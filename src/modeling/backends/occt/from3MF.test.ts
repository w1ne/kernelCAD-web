// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { basename, dirname, resolve } from 'node:path';
import { getOC } from 'replicad';
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../capture/captureSession';
import { createModelingApi } from '../../api';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { createOcctLowerer } from './occtLowerer';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';

const fixture = resolve(process.cwd(), 'docs/demos/3mf-resource-ids/generic-cube.3mf');

function validBrep(backend: OcctBackend): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(backend.getReplicadShape().wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

describe('lib.from3MF', () => {
  it('gives triangle-budget guidance when the bounded import limit is exceeded', async () => {
    const api = createModelingApi({ session: new CaptureSession(), scriptDir: dirname(fixture) });
    await expect(api.lib.from3MF(basename(fixture), { maxTriangles: 11 })).rejects.toMatchObject({
      hint: expect.stringContaining('from3MF.too-many-triangles'),
    });
  });

  it('imports a closed 3MF mesh in millimetres as an editable faceted solid', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dirname(fixture) });
    const imported = await api.lib.from3MF(basename(fixture));
    const drilled = imported.subtract(api.cylinder(10.2, 2).translate(5, 5, -0.1));
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(
      session.getRecords(),
      { paramTable: session.paramTable },
    );
    const sourceBackend = result.shapes.get(imported.id)!;
    const drilledBackend = result.shapes.get(drilled.id)!;

    const record = session.getRecords().find(candidate => candidate.id === imported.id)!;
    expect(record.kind).toBe('importedStl');
    expect(record.metadata).toMatchObject({
      sourceFormat: '3mf',
      geometryKind: 'mesh',
      triangleCount: 12,
      isSolid: true,
      unit: 'millimeter',
    });
    expect(sourceBackend.volume()).toBeCloseTo(1000, 3);
    expect(sourceBackend.boundingBox()).toEqual({ min: [0, 0, 0], max: [10, 10, 10] });
    expect(drilledBackend.volume()).toBeCloseTo(1000 - 40 * Math.PI, 2);
    expect(validBrep(sourceBackend as OcctBackend)).toBe(true);
    expect(validBrep(drilledBackend as OcctBackend)).toBe(true);
    expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toHaveLength(0);
  });
});
