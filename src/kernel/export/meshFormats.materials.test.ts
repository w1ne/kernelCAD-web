// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { exportMeshObj, exportMeshObjZip, exportMeshUsd } from './meshFormats';

const triangle = {
  vertices: [0, 0, 0, 10, 0, 0, 0, 10, 0],
  triangles: [0, 1, 2],
};

const brass = {
  name: 'brass',
  baseColor: '#c8a24a',
  metalness: 1,
  roughness: 0.35,
  opacity: 0.8,
};

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe('named OBJ and USD materials', () => {
  it('writes usemtl and a sibling MTL with Kd, d, and Ns from the PBR payload', () => {
    const { obj, mtl } = exportMeshObj([{ name: 'fastener', mesh: triangle, material: brass }]);
    const objText = text(obj);
    const mtlText = text(mtl);

    expect(objText).toContain('mtllib model.mtl');
    expect(objText).toContain('o fastener');
    expect(objText).toContain('usemtl brass');
    expect(mtlText).toContain('newmtl brass');
    expect(mtlText).toContain('Kd 0.784314 0.635294 0.290196');
    expect(mtlText).toContain('d 0.8');
    expect(mtlText).toContain('Ns 14.326531');
  });

  it('keeps the GLB name for a finish and resolves a role-token colour', () => {
    const { obj, mtl } = exportMeshObj([
      { name: 'fastener', mesh: triangle, material: { baseColor: '#c8a24a', metalness: 1, roughness: 0.35, name: 'brass' } },
      { name: 'body', mesh: triangle, color: 'plate', colorParamName: 'hull' },
    ]);
    const objText = text(obj);
    const mtlText = text(mtl);

    expect(objText).toContain('usemtl brass');
    expect(objText).toContain('usemtl hull');
    expect(mtlText).toContain('newmtl hull');
    expect(mtlText).toContain('Kd 0.658824 0.603922 0.486275');
  });

  it('reuses one MTL entry for the same payload and suffixes a same-name collision', () => {
    const { obj, mtl } = exportMeshObj([
      { name: 'bolt', mesh: triangle, material: brass },
      { name: 'nut', mesh: triangle, material: { ...brass } },
      { name: 'cap', mesh: triangle, material: { ...brass, roughness: 0.5 } },
    ]);
    const objText = text(obj);
    const mtlText = text(mtl);

    expect(objText.match(/usemtl brass\n/g)).toHaveLength(2);
    expect(objText).toContain('usemtl brass-2');
    expect(mtlText.match(/newmtl /g)).toHaveLength(2);
    expect(mtlText).toContain('newmtl brass-2');
    expect(mtlText).toContain('Ns 6');
  });

  it('zips model.obj and model.mtl for a single-file caller', () => {
    const files = unzipSync(exportMeshObjZip([{ name: 'fastener', mesh: triangle, material: brass }]));
    expect(strFromU8(files['model.obj']!)).toContain('usemtl brass');
    expect(strFromU8(files['model.obj']!)).toContain('mtllib model.mtl');
    expect(strFromU8(files['model.mtl']!)).toContain('newmtl brass');
    expect(strFromU8(files['model.mtl']!)).toContain('Kd 0.784314 0.635294 0.290196');
  });

  it('binds a named UsdPreviewSurface to each mesh', () => {
    const usd = text(exportMeshUsd([
      { name: 'fastener', mesh: triangle, material: brass },
      { name: 'body', mesh: triangle, color: 'plate', colorParamName: 'hull' },
    ]));

    expect(usd).toContain('def Material "brass"');
    expect(usd).toContain('def Material "hull"');
    expect(usd).toContain('uniform token info:id = "UsdPreviewSurface"');
    expect(usd).toContain('color3f inputs:diffuseColor = (0.577580, 0.361307, 0.068478)');
    expect(usd).toContain('float inputs:metallic = 1.000000');
    expect(usd).toContain('float inputs:roughness = 0.350000');
    expect(usd).toContain('float inputs:opacity = 0.800000');
    expect(usd).toContain('prepend apiSchemas = ["MaterialBindingAPI"]');
    expect(usd).toContain('rel material:binding = </Model/Materials/brass>');
    expect(usd).toContain('rel material:binding = </Model/Materials/hull>');
    expect(usd.match(/def Material /g)).toHaveLength(2);
  });
});
