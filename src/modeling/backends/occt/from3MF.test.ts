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
const componentFixture = resolve(process.cwd(), 'docs/demos/from3mf-component-assembly/two-block-assembly.3mf');
const productionFixture = resolve(process.cwd(), 'examples/interoperability/3mf-production/standoff-plate.3mf');
const disconnectedShellFixture = resolve(
  process.cwd(),
  'examples/interoperability/3mf-disconnected-shells/two-disconnected-solids.3mf',
);
// make-fixture.py: 60 x 40 x 3 plate + two 8 mm hex standoffs whose stored apothem is 3.464101 mm.
const PRODUCTION_VOLUME = 60 * 40 * 3 + 2 * 8 * 12 * 3.464101;

function validBrep(backend: OcctBackend): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(backend.getReplicadShape().wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

function solidCount(backend: OcctBackend): number {
  const oc = getOC() as any;
  const explorer = new oc.TopExp_Explorer_2(
    backend.getReplicadShape().wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let count = 0;
  try {
    for (; explorer.More(); explorer.Next()) count++;
    return count;
  } finally {
    explorer.delete?.();
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

  it('imports nested component instances as separate valid solids that accept a boolean', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dirname(componentFixture) });
    const imported = await api.lib.from3MF(basename(componentFixture));
    const drilled = imported.subtract(api.cylinder(10.2, 2).translate(13, 9, -0.1));
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(
      session.getRecords(),
      { paramTable: session.paramTable },
    );
    const sourceBackend = result.shapes.get(imported.id)!;
    const drilledBackend = result.shapes.get(drilled.id)!;

    const record = session.getRecords().find(candidate => candidate.id === imported.id)!;
    expect(record.kind).toBe('importedStl');
    expect(record.metadata).toMatchObject({ sourceFormat: '3mf', triangleCount: 24, isSolid: true, unit: 'millimeter' });
    expect(sourceBackend.volume()).toBeCloseTo(2000, 3);
    expect(sourceBackend.boundingBox()).toEqual({ min: [8, 4, 0], max: [30, 14, 10] });
    expect(solidCount(sourceBackend as OcctBackend)).toBe(2);
    expect(drilledBackend.volume()).toBeCloseTo(2000 - 40 * Math.PI, 2);
    expect(solidCount(drilledBackend as OcctBackend)).toBe(2);
    expect(validBrep(sourceBackend as OcctBackend)).toBe(true);
    expect(validBrep(drilledBackend as OcctBackend)).toBe(true);
    expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toHaveLength(0);
  });

  it('imports Production-extension model parts as valid solids that accept a boolean', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dirname(productionFixture) });
    const imported = await api.lib.from3MF(basename(productionFixture));
    // A 3 mm plate hole at (30, 20) and a 4 mm deep blind bore in the turned standoff at (50, 20).
    const bored = imported
      .subtract(api.cylinder(5, 1.5).translate(30, 20, -1))
      .subtract(api.cylinder(5, 1.5).translate(50, 20, 7));
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(
      session.getRecords(),
      { paramTable: session.paramTable },
    );
    const sourceBackend = result.shapes.get(imported.id)!;
    const boredBackend = result.shapes.get(bored.id)!;

    const record = session.getRecords().find(candidate => candidate.id === imported.id)!;
    expect(record.metadata).toMatchObject({ sourceFormat: '3mf', triangleCount: 52, isSolid: true, unit: 'millimeter' });
    expect(sourceBackend.volume()).toBeCloseTo(PRODUCTION_VOLUME, 6);
    expect(sourceBackend.boundingBox()).toEqual({ min: [0, 0, 0], max: [60, 40, 11] });
    expect(solidCount(sourceBackend as OcctBackend)).toBe(3);
    expect(validBrep(sourceBackend as OcctBackend)).toBe(true);
    expect(boredBackend.volume()).toBeCloseTo(PRODUCTION_VOLUME - 1.5 ** 2 * Math.PI * (3 + 4), 3);
    expect(solidCount(boredBackend as OcctBackend)).toBe(3);
    expect(validBrep(boredBackend as OcctBackend)).toBe(true);
    expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toHaveLength(0);
  });

  it('imports separated positive mesh shells in one 3MF object as a valid compound', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dirname(disconnectedShellFixture) });
    const imported = await api.lib.from3MF(basename(disconnectedShellFixture));
    const cut = imported.subtract(api.cylinder(12, 2).translate(5, 5, -1));
    const result = await new RecomputeEngine(createOcctLowerer(session)).run(
      session.getRecords(),
      { paramTable: session.paramTable },
    );
    const sourceBackend = result.shapes.get(imported.id)!;
    const cutBackend = result.shapes.get(cut.id)!;

    expect(sourceBackend.volume()).toBeCloseTo(1000 + 125 / 6, 6);
    expect(sourceBackend.boundingBox()).toEqual({ min: [0, 0, 0], max: [25, 10, 10] });
    expect(solidCount(sourceBackend as OcctBackend)).toBe(2);
    expect(validBrep(sourceBackend as OcctBackend)).toBe(true);
    expect(cutBackend.volume()).toBeCloseTo(1000 + 125 / 6 - 40 * Math.PI, 5);
    expect(solidCount(cutBackend as OcctBackend)).toBe(2);
    expect(validBrep(cutBackend as OcctBackend)).toBe(true);
    expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toHaveLength(0);
  });
});

