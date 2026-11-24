// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/glbMesh.test.ts
//
// lib.meshFromGLB: a composite in-memory GLB decodes into material groups,
// rotates glTF Y-up to kernelCAD Z-up, and yields a display body.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Document, NodeIO } from '@gltf-transform/core';
import { decodeGlbMesh } from '../../../src/kernel/backends/glbMesh';
import { meshFromGLB } from '../../../src/modeling/parts/fromMeshFormats';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';

const tmpDir = mkdtempSync(join(tmpdir(), 'kcad-glb-'));
afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

/** One right triangle whose legs are `width` raw units; no scene extras. */
async function buildUndeclaredGlb(width: number, extras?: unknown): Promise<Uint8Array> {
  const doc = new Document();
  if (extras !== undefined) doc.getRoot().getAsset().extras = extras as never;
  const buffer = doc.createBuffer();
  const positions = doc.createAccessor().setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, width, 0, 0, 0, width, 0])).setBuffer(buffer);
  const primitive = doc.createPrimitive().setAttribute('POSITION', positions);
  doc.createScene('beam').addChild(
    doc.createNode('beam').setMesh(doc.createMesh('beam').addPrimitive(primitive)),
  );
  return new NodeIO().writeBinary(doc);
}

function sizeOf(positions: Float32Array): [number, number, number] {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, positions[i + k]!);
      max[k] = Math.max(max[k]!, positions[i + k]!);
    }
  }
  return [max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!];
}

async function buildGlb(): Promise<Uint8Array> {
  const doc = new Document();
  doc.getRoot().getAsset().extras = { kernelcad: { units: 'mm' } };
  const buffer = doc.createBuffer();
  const scene = doc.createScene('board');
  const accessor = (array: Float32Array | Uint16Array, type: 'VEC3' | 'VEC2' | 'SCALAR') =>
    doc.createAccessor().setType(type).setArray(array as never).setBuffer(buffer);
  const positions = accessor(new Float32Array([0, 0, 0, 10, 0, 0, 0, 0, 10]), 'VEC3');
  const normals = accessor(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 'VEC3');
  const uv = accessor(new Float32Array([0, 0, 1, 0, 0, 1]), 'VEC2');
  const indices = accessor(new Uint16Array([0, 1, 2]), 'SCALAR');
  const pcb = doc.createMaterial('solder-mask').setBaseColorFactor([0.1, 0.4, 0.2, 1]).setMetallicFactor(0).setRoughnessFactor(1);
  const gold = doc.createMaterial('gold-pad').setBaseColorFactor([1, 0.77, 0.34, 1]).setMetallicFactor(0).setRoughnessFactor(1);
  for (const [name, material, translation] of [
    ['pcb-board', pcb, [0, 0, 0]],
    ['gold-pad', gold, [10, 0, 0]],
  ] as const) {
    const primitive = doc.createPrimitive()
      .setAttribute('POSITION', positions).setAttribute('NORMAL', normals)
      .setAttribute('TEXCOORD_0', uv).setIndices(indices).setMaterial(material);
    const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive));
    if (name === 'gold-pad') {
      // Nested holder: composing the parent transform twice would double the offset.
      const holder = doc.createNode('pad-holder').setTranslation([...translation] as [number, number, number]);
      holder.addChild(node);
      scene.addChild(holder);
    } else {
      scene.addChild(node.setTranslation([...translation] as [number, number, number]));
    }
  }
  return new NodeIO().writeBinary(doc);
}

describe('decodeGlbMesh / lib.meshFromGLB', () => {
  it('keeps primitive material groups and infers PCB surfaces', async () => {
    const decoded = await decodeGlbMesh(await buildGlb());
    expect(decoded.subMeshes.map((s) => s.name)).toEqual(['pcb-board', 'gold-pad']);
    expect(decoded.subMeshes[0]!.material).toMatchObject({ roughness: 0.38, clearcoat: 0.42, metalness: 0 });
    expect(decoded.subMeshes[1]!.material).toMatchObject({ roughness: 0.24, metalness: 0.92 });
    expect(decoded.subMeshes[0]!.uv).toHaveLength(6);
    expect(decoded.positions).toHaveLength(18);
    expect(Array.from(decoded.indices.slice(3))).toEqual([3, 4, 5]);
  });

  it('converts Y-up to Z-up and applies nested node transforms once', async () => {
    const decoded = await decodeGlbMesh(await buildGlb());
    const normal = decoded.subMeshes[0]!.normals;
    // `+ 0` folds -0 into 0: the rotation legitimately produces negative zero.
    expect([normal[0], normal[1], normal[2]].map((v) => Math.round(v) + 0)).toEqual([0, 0, 1]);
    const second = decoded.subMeshes[1]!.positions;
    expect([second[0], second[1], second[2]].map((v) => Math.round(v) + 0)).toEqual([10, 0, 0]);
  });
  it('reads an undeclared GLB in glTF metres, not by a guessed extent', async () => {
    // glTF 2.0 defines scene coordinates in metres. Raw 3.0 is a 3 m beam,
    // so the display mesh must span 3000 mm. The old extent heuristic only
    // scaled raw values below 2 and imported this 1000x too small.
    const decoded = await decodeGlbMesh(await buildUndeclaredGlb(3));
    expect(sizeOf(decoded.positions)[0]).toBeCloseTo(3000, 6);
    expect(decoded.units).toBe('m');
    expect(decoded.unitScale).toBe(1000);
    expect(decoded.unitSource).toBe('gltf-default');
  });

  it('scales a small undeclared GLB by the same metre rule', async () => {
    const decoded = await decodeGlbMesh(await buildUndeclaredGlb(0.3));
    expect(sizeOf(decoded.positions)[0]).toBeCloseTo(300, 6);
    expect(decoded.unitSource).toBe('gltf-default');
  });

  it('keeps declared extras and explicit options authoritative', async () => {
    const declaredMm = await decodeGlbMesh(
      await buildUndeclaredGlb(3000, { kernelcad: { units: 'mm' } }),
    );
    expect(declaredMm.unitScale).toBe(1);
    expect(declaredMm.unitSource).toBe('extras');
    expect(sizeOf(declaredMm.positions)[0]).toBeCloseTo(3000, 6);

    const forcedMm = await decodeGlbMesh(
      await buildUndeclaredGlb(3, { kernelcad: { units: 'm' } }),
      { units: 'mm' },
    );
    expect(forcedMm.unitScale).toBe(1);
    expect(forcedMm.unitSource).toBe('option');
    expect(sizeOf(forcedMm.positions)[0]).toBeCloseTo(3, 6);
  });

  it('keeps a pre-0.17 kernelCAD export in its raw millimetres', async () => {
    // Old kernelCAD exporters wrote `extras.kernelcad` without `units` and
    // used raw millimetre coordinates; they must not be re-read as metres.
    const legacy = await decodeGlbMesh(
      await buildUndeclaredGlb(3000, { kernelcad: { version: '0.15.0' } }),
    );
    expect(legacy.unitScale).toBe(1);
    expect(legacy.unitSource).toBe('legacy-kernelcad');
    expect(sizeOf(legacy.positions)[0]).toBeCloseTo(3000, 6);
  });

  it('records the unit decision on the imported shape', async () => {
    const path = join(tmpDir, 'metre-beam.glb');
    writeFileSync(path, await buildUndeclaredGlb(3));
    const session = new CaptureSession();
    const shape = await meshFromGLB({ session, scriptDir: tmpDir }, 'metre-beam.glb');
    expect(session.getRecords().find((r) => r.id === shape.id)?.metadata)
      .toMatchObject({ units: 'm', unitScale: 1000, unitSource: 'gltf-default' });
  });

  it('imports the GLB as a display mesh with sub-meshes', async () => {
    const path = join(tmpDir, 'board.glb');
    writeFileSync(path, await buildGlb());
    const session = new CaptureSession();
    const shape = await meshFromGLB({ session, scriptDir: tmpDir }, 'board.glb');
    expect(session.getRecords().find((r) => r.id === shape.id)?.metadata)
      .toMatchObject({ sourceFormat: 'glb', materialGroupCount: 2 });
    const backend = session.importedGeometry.get(shape.id) as { getMesh: () => { subMeshes?: unknown[] } };
    expect(backend.getMesh().subMeshes).toHaveLength(2);
  });
});
