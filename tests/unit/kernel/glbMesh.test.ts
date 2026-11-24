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

/** One single-primitive node per name, each with an unauthored glTF material
 *  (metallic 0, roughness 1) so `inferSurface` decides the finish. */
async function buildNamedGlb(names: readonly string[]): Promise<Uint8Array> {
  const doc = new Document();
  doc.getRoot().getAsset().extras = { kernelcad: { units: 'mm' } };
  const buffer = doc.createBuffer();
  const scene = doc.createScene('named');
  const accessor = (array: Float32Array | Uint16Array, type: 'VEC3' | 'SCALAR') =>
    doc.createAccessor().setType(type).setArray(array as never).setBuffer(buffer);
  const positions = accessor(new Float32Array([0, 0, 0, 10, 0, 0, 0, 0, 10]), 'VEC3');
  const indices = accessor(new Uint16Array([0, 1, 2]), 'SCALAR');
  names.forEach((name, index) => {
    const material = doc.createMaterial(name)
      .setBaseColorFactor([0.5, 0.5, 0.5, 1]).setMetallicFactor(0).setRoughnessFactor(1);
    const primitive = doc.createPrimitive()
      .setAttribute('POSITION', positions).setIndices(indices).setMaterial(material);
    const node = doc.createNode(name)
      .setMesh(doc.createMesh(name).addPrimitive(primitive))
      .setTranslation([index * 20, 0, 0]);
    scene.addChild(node);
  });
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

  it('infers glass, e-paper, housing and hardware-metal finishes by name', async () => {
    const names = ['oled-cover', 'epaper-panel', 'housing-shroud', 'battery-holder', 'steel-screw', 'mcu-chip'];
    const decoded = await decodeGlbMesh(await buildNamedGlb(names));
    const finish = new Map(decoded.subMeshes.map((sub) => [sub.name, sub.material]));
    // Sleek glass: low roughness, a light clearcoat, no milky washout.
    expect(finish.get('oled-cover')).toMatchObject({ metalness: 0, roughness: 0.08, clearcoat: 0.35 });
    // Matte reflective e-ink paper.
    expect(finish.get('epaper-panel')).toMatchObject({ metalness: 0, roughness: 0.85 });
    // Moulded housing / IC body: satin, not glossy.
    expect(finish.get('housing-shroud')).toMatchObject({ metalness: 0, roughness: 0.58 });
    expect(finish.get('mcu-chip')).toMatchObject({ metalness: 0, roughness: 0.58 });
    // Metallic hardware.
    expect(finish.get('battery-holder')).toMatchObject({ metalness: 0.9, roughness: 0.28 });
    expect(finish.get('steel-screw')).toMatchObject({ metalness: 0.9, roughness: 0.28 });
  });
});
