// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/optimizeGlb.test.ts
//
// Guards the colour gate against the false positive that broke the marketing
// deploy: `dedup` legitimately collapses duplicate material OBJECTS (93 -> 10 on
// royal-pop-pocket-watch) while every distinct COLOUR survives. Gating on object
// count rejected a perfectly good build; gating on the colour set does not.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Document, NodeIO } from '@gltf-transform/core';
import { countDistinctColors, countMaterials } from './optimizeGlb';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'kc-glb-mat-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Write a GLB carrying `colors`, each repeated `dupes` times as separate
 *  material objects — the shape OCCT exports produce. */
async function writeGlb(name: string, colors: number[][], dupes: number): Promise<string> {
  const doc = new Document();
  const buf = doc.createBuffer();
  for (const c of colors) {
    for (let i = 0; i < dupes; i++) {
      doc.createMaterial().setBaseColorFactor(c as [number, number, number, number]);
    }
  }
  // a GLB needs at least one scene to round-trip
  doc.createScene();
  void buf;
  const path = join(dir, name);
  await new NodeIO().write(path, doc);
  return path;
}

const RED: number[] = [1, 0, 0, 1];
const GREEN: number[] = [0, 1, 0, 1];
const BLUE: number[] = [0, 0, 1, 1];

describe('countDistinctColors', () => {
  it('counts COLOURS, not material objects — 9 objects sharing 3 colours reads as 3', async () => {
    const p = await writeGlb('dupes.glb', [RED, GREEN, BLUE], 3);
    expect(await countMaterials(p)).toBe(9);
    expect(await countDistinctColors(p)).toBe(3);
  });

  it('treats every material as one colour when they are all identical', async () => {
    const p = await writeGlb('same.glb', [RED], 12);
    expect(await countMaterials(p)).toBe(12);
    expect(await countDistinctColors(p)).toBe(1);
  });

  it('is unchanged by dedup: the real-world 93 -> 10 case preserves the colour count', async () => {
    // before: 10 colours x 9 duplicate objects; after dedup: 10 objects, 10 colours
    const before = await writeGlb('before.glb',
      Array.from({ length: 10 }, (_, i) => [i / 10, 0, 0, 1]), 9);
    const after = await writeGlb('after.glb',
      Array.from({ length: 10 }, (_, i) => [i / 10, 0, 0, 1]), 1);
    expect(await countMaterials(before)).toBe(90);
    expect(await countMaterials(after)).toBe(10);
    // the object count collapses, the colour set does not — so preserveMaterials holds
    expect(await countDistinctColors(after)).toBe(await countDistinctColors(before));
  });

  it('DOES detect real palette flattening — distinct colours actually lost', async () => {
    const before = await writeGlb('rich.glb', [RED, GREEN, BLUE], 1);
    const flattened = await writeGlb('flat.glb', [RED], 3);
    expect(await countDistinctColors(flattened)).toBeLessThan(
      await countDistinctColors(before),
    );
  });
});

import { packMeshoptGlb, webGlbIO } from './optimizeGlb';
import { ALL_EXTENSIONS, KHRMaterialsClearcoat, type Clearcoat } from '@gltf-transform/extensions';
import { readFileSync, writeFileSync } from 'node:fs';

describe('opt-in meshopt packing', () => {
  it('preserves Float32 bits, oriented triangles, PBR extension, transforms, extras and associations', async () => {
    const doc = new Document();
    const buffer = doc.createBuffer();
    const position = doc.createAccessor('positions').setType('VEC3').setArray(new Float32Array([0,0,0, 1.123456789,0,0, 0,1e-20,0, 0,0,1])).setBuffer(buffer);
    const normal = doc.createAccessor('normals').setType('VEC3').setArray(new Float32Array([0,0,1, 0,0,1, 0,0,1, 0,0,1])).setBuffer(buffer);
    // Minimum index is deliberately not first: TRIANGLES may cyclically rotate.
    const indices = doc.createAccessor('indices').setType('SCALAR').setArray(new Uint32Array([2,0,1, 3,1,0])).setBuffer(buffer);
    const clearcoat = doc.createExtension(KHRMaterialsClearcoat).createClearcoat().setClearcoatFactor(.7);
    const material = doc.createMaterial('red').setBaseColorFactor([1,0,0,1]).setExtras({kind:'native'}).setExtension('KHR_materials_clearcoat', clearcoat);
    const primitive = doc.createPrimitive().setAttribute('POSITION',position).setAttribute('NORMAL',normal).setIndices(indices).setMaterial(material);
    const mesh = doc.createMesh('tube').addPrimitive(primitive).setExtras({part:'p'});
    doc.createScene().addChild(doc.createNode('part').setMesh(mesh).setTranslation([3,4,5]).setExtras({name:'retained'}));
    const input = join(dir,'input.glb'), output = join(dir,'packed.glb');
    await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(input,doc);
    await packMeshoptGlb(input,output);
    const decoded = await (await webGlbIO()).read(output);
    const p = decoded.getRoot().listMeshes()[0].listPrimitives()[0];
    for (const semantic of ['POSITION','NORMAL']) {
      const a = primitive.getAttribute(semantic)!.getArray()!, b=p.getAttribute(semantic)!.getArray()!;
      expect(Buffer.from(b.buffer,b.byteOffset,b.byteLength)).toEqual(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
    }
    const a=indices.getArray()!, b=p.getIndices()!.getArray()!;
    for(let i=0;i<a.length;i+=3) expect([0,1,2].some(r=>[0,1,2].every(k=>a[i+k]===b[i+(k+r)%3]))).toBe(true);
    expect(Array.from(b)).not.toEqual(Array.from(a));
    expect(decoded.getRoot().listNodes()[0].getTranslation()).toEqual([3,4,5]);
    expect(decoded.getRoot().listNodes()[0].getExtras()).toEqual({name:'retained'});
    expect(p.getMaterial()!.getExtension<Clearcoat>('KHR_materials_clearcoat')!.getClearcoatFactor()).toBe(.7);
    expect(await countDistinctColors(output)).toBe(1);
    expect(await countMaterials(output)).toBe(1);
    expect(readFileSync(output).includes(Buffer.from('EXT_meshopt_compression'))).toBe(true);
  });
  it.each([true, false])('rejects unknown optional extensions even when declared=%s', async declared => {
    const doc = new Document(); doc.createScene();
    const io = new NodeIO(); const json = await io.writeJSON(doc);
    if (declared) json.json.extensionsUsed=['VENDOR_unknown'];
    json.json.extensions={VENDOR_unknown:{retain:42}};
    const input = join(dir,'unknown.gltf'); writeFileSync(input,JSON.stringify(json.json));
    await expect(packMeshoptGlb(input,join(dir,'out.glb'))).rejects.toThrow(/unsupported.*VENDOR_unknown/i);
  });
});

import { assertPackedGeometry } from './meshoptGeometry';
it('accepts cyclic triangle indices but rejects reversed winding or any changed attribute bit', () => {
  const make = (indices:number[], values=[0,0,0,1,0,0,0,1,0]) => {
    const doc=new Document(),buffer=doc.createBuffer();
    const position=doc.createAccessor().setType('VEC3').setArray(new Float32Array(values)).setBuffer(buffer);
    const index=doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer);
    doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION',position).setIndices(index));
    return doc;
  };
  expect(()=>assertPackedGeometry(make([2,0,1]),make([0,1,2]))).not.toThrow();
  expect(()=>assertPackedGeometry(make([2,0,1]),make([0,2,1]))).toThrow(/triangle/);
  expect(()=>assertPackedGeometry(make([2,0,1]),make([2,0,1],[0,0,-0,1,0,0,0,1,0]))).toThrow(/attribute/);
});
