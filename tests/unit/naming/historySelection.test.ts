// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { faceHashOf, surfaceTypeOf } from '../../../src/kernel/backends/occt/createdRefs';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { q } from '../../../src/kernel/naming/queryConstructors';
import { evaluate } from '../../../src/kernel/naming/queryEvaluator';
import { buildModel } from '../../../src/modeling/buildModel';
import type { QueryScene } from '../../../src/kernel/naming/query';
import type { FeatureKind } from '../../../src/shared/intent/types';

async function sceneOf(code: string, kernel?: 'occt' | 'smlib'): Promise<QueryScene & { ids: Record<string, string>; diagnostics: { featureId?: string; code: string }[] }> {
  const model = await buildModel({ code, fileName: 'history.kcad.ts', kernel });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const id = (kind: FeatureKind) => model.records.find((record) => record.kind === kind)?.id ?? '';
  const last = model.records[model.records.length - 1];
  const backend = model.shapes.get(last.id) as OcctBackend;
  return {
    backend,
    featureId: last.id,
    records: model.records,
    diagnostics: model.diagnostics.map((d) => ({ featureId: d.featureId, code: d.code })),
    ids: { box: id('box'), cylinder: id('cylinder'), boolean: id('boolean'), fillet: id('fillet') },
  };
}

function handles(scene: QueryScene, query: ReturnType<typeof q.face>): string[] {
  return evaluate(query, scene).map((entity) => entity.handle).sort();
}

describe('history selectors after a cut and a fillet', () => {
  it('a cut keeps plate faces on the plate and hole walls on the cutter', async () => {
    const scene = await sceneOf(`
      const plate = box(40, 30, 10);
      const cutter = cylinder(20, 4).translate(20, 15, -2);
      return plate.subtract(cutter);
    `);
    const fromPlate = handles(scene, q.face(q.derivedFrom(scene.ids.box)));
    const fromCutter = handles(scene, q.face(q.derivedFrom(scene.ids.cylinder)));
    const bornCutter = handles(scene, q.face(q.createdBy(scene.ids.cylinder)));
    const sincePlate = handles(scene, q.face(q.newSince(scene.ids.box)));
    expect(fromPlate.length).toBeGreaterThan(0);
    expect(fromCutter.length).toBeGreaterThan(0);
    expect(fromCutter).toEqual(bornCutter);
    expect(fromPlate.filter((hash) => fromCutter.includes(hash))).toEqual([]);
    expect(sincePlate).toEqual(expect.arrayContaining(fromCutter));
    expect(sincePlate.filter((hash) => fromPlate.includes(hash))).toEqual([]);
    const passedThroughCut = handles(scene, q.face(q.derivedFrom(scene.ids.boolean)));
    const bornAtCut = handles(scene, q.face(q.createdBy(scene.ids.boolean)));
    expect(passedThroughCut.length).toBeGreaterThan(bornAtCut.length);
  });

  it('a fillet adds rounds that are new since the box and not created by it', async () => {
    const scene = await sceneOf(`return box(40, 30, 10).fillet(2, { face: 'top' });`);
    const fromBox = handles(scene, q.face(q.derivedFrom(scene.ids.box)));
    const bornBox = handles(scene, q.face(q.createdBy(scene.ids.box)));
    const sinceBox = handles(scene, q.face(q.newSince(scene.ids.box)));
    const fromFillet = handles(scene, q.face(q.derivedFrom(scene.ids.fillet)));
    const bornFillet = handles(scene, q.face(q.createdBy(scene.ids.fillet)));
    expect(sinceBox.length).toBeGreaterThan(0);
    expect(fromBox.length).toBeGreaterThan(0);
    expect(sinceBox.filter((hash) => fromBox.includes(hash))).toEqual([]);
    expect(bornFillet.length).toBeGreaterThan(0);
    expect(fromFillet).toEqual(expect.arrayContaining(bornFillet));
    expect(fromFillet.length).toBeGreaterThan(bornFillet.length);
    expect(bornBox.filter((hash) => sinceBox.includes(hash))).toEqual([]);
    const newEdges = evaluate(q.edge(q.newSince(scene.ids.box)), scene);
    expect(newEdges.length).toBeGreaterThan(0);
    expect(newEdges.every((edge) => edge.kind === 'edge')).toBe(true);
  });
});

describe('SMLib primitive lineage through a later boolean', () => {
  const cut = `
    export default box(10, 10, 10).subtract(cylinder(12, 3));
  `;

  it('keeps hole walls derived from the accepted cylinder', async () => {
    const scene = await sceneOf(cut, 'smlib');
    const accepted = scene.diagnostics.filter((d) =>
      d.code === 'recompute.kernel.guard-fallback' &&
      (d.featureId === scene.ids.cylinder || d.featureId === scene.ids.box));
    expect(accepted).toEqual([]);
    const hole = evaluate(q.face(q.derivedFrom(scene.ids.cylinder)), scene);
    expect(hole.length).toBeGreaterThan(0);
    expect(hole.every((face) => face.kind === 'face')).toBe(true);
    const liveFaces = new Set(scene.backend.faceHashes());
    expect(hole.every((face) => liveFaces.has(face.handle))).toBe(true);
    const surfaceByHash = new Map(
      scene.backend.getReplicadShape().faces.map((face) => [faceHashOf(face), surfaceTypeOf(face)]),
    );
    expect(hole.every((face) => surfaceByHash.get(face.handle) === 'CYLINDRE')).toBe(true);
  });

  it('keeps plate edges derived from the accepted box', async () => {
    const scene = await sceneOf(cut, 'smlib');
    const plateEdges = evaluate(q.edge(q.derivedFrom(scene.ids.box)), scene);
    expect(plateEdges.length).toBeGreaterThan(0);
    expect(plateEdges.every((edge) => edge.kind === 'edge')).toBe(true);
    const liveEdges = new Set(scene.backend.edgeHashes());
    expect(plateEdges.every((edge) => liveEdges.has(edge.handle))).toBe(true);
  });
});
