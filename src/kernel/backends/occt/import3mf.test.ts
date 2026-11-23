// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { parse3mfMesh, ThreeMfImportError } from './import3mf';

const fixture = resolve(process.cwd(), 'docs/demos/3mf-resource-ids/generic-cube.3mf');
const componentFixture = resolve(process.cwd(), 'docs/demos/from3mf-component-assembly/two-block-assembly.3mf');

function cubeArchive(rewrite: (xml: string) => string): Uint8Array {
  const files = unzipSync(readFileSync(fixture));
  const modelPath = Object.keys(files).find((name) => name.toLowerCase() === '3d/3dmodel.model')!;
  const xml = new TextDecoder().decode(files[modelPath]);
  return zipSync({ [modelPath]: new TextEncoder().encode(rewrite(xml)) });
}

describe('core 3MF triangle mesh import', () => {
  it('applies model units and build-item transforms in double precision', () => {
    const bytes = cubeArchive((xml) => xml
      .replace('unit="millimeter"', 'unit="centimeter"')
      .replace('<item objectid="1" />', '<item objectid="1" transform="1 0 0 0 1 0 0 0 1 2 0 0" />'));
    const mesh = parse3mfMesh(bytes);
    const xs = Array.from(mesh.positions).filter((_coordinate, index) => index % 3 === 0);
    const ys = Array.from(mesh.positions).filter((_coordinate, index) => index % 3 === 1);
    const zs = Array.from(mesh.positions).filter((_coordinate, index) => index % 3 === 2);

    expect(mesh.unit).toBe('centimeter');
    expect(mesh.triangleCount).toBe(12);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([20, 120]);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([0, 100]);
    expect([Math.min(...zs), Math.max(...zs)]).toEqual([0, 100]);
  });

  it('enforces the triangle budget while parsing the model', () => {
    const bytes = new Uint8Array(readFileSync(fixture));
    expect(() => parse3mfMesh(bytes, 11)).toThrow(/11 triangle import budget/);
  });

  it('refuses required extensions instead of dropping them', () => {
    const extension = cubeArchive((xml) => xml.replace('<model unit=', '<model requiredextensions="vendor-ext" unit='));
    expect(() => parse3mfMesh(extension)).toThrow(ThreeMfImportError);
    expect(() => parse3mfMesh(extension)).toThrow(/unsupported extensions/);
  });

  it('refuses cyclic and unresolved component references', () => {
    const cycle = cubeArchive((xml) => xml
      .replace('</resources>', '<object id="3" type="model"><components><component objectid="3" /></components></object></resources>')
      .replace('<item objectid="1" />', '<item objectid="3" />'));
    expect(() => parse3mfMesh(cycle)).toThrow(/component reference cycle/);

    const missing = cubeArchive((xml) => xml
      .replace('</resources>', '<object id="3" type="model"><components><component objectid="99" /></components></object></resources>')
      .replace('<item objectid="1" />', '<item objectid="3" />'));
    expect(() => parse3mfMesh(missing)).toThrow(/references missing object '99'/);
  });

  it('resolves nested component instances and applies each transform in model units', () => {
    const bytes = new Uint8Array(readFileSync(componentFixture));
    const mesh = parse3mfMesh(bytes);
    const xs = Array.from(mesh.positions).filter((_coordinate, index) => index % 3 === 0);
    const ys = Array.from(mesh.positions).filter((_coordinate, index) => index % 3 === 1);
    const zs = Array.from(mesh.positions).filter((_coordinate, index) => index % 3 === 2);

    expect(mesh.unit).toBe('millimeter');
    expect(mesh.triangleCount).toBe(24);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([8, 30]);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([4, 14]);
    expect([Math.min(...zs), Math.max(...zs)]).toEqual([0, 10]);
    expect(() => parse3mfMesh(bytes, 23)).toThrow(/23 import budget/);
  });

  it('refuses disconnected shells in one mesh object instead of assuming independent solids', () => {
    const secondTetrahedron = cubeArchive((xml) => xml
      .replace('</vertices>', `${[
        '<vertex x="20" y="0" z="0" />',
        '<vertex x="21" y="0" z="0" />',
        '<vertex x="20" y="1" z="0" />',
        '<vertex x="20" y="0" z="1" />',
      ].join('')}</vertices>`)
      .replace('</triangles>', `${[
        '<triangle v1="8" v2="10" v3="9" />',
        '<triangle v1="8" v2="9" v3="11" />',
        '<triangle v1="9" v2="10" v3="11" />',
        '<triangle v1="10" v2="8" v3="11" />',
      ].join('')}</triangles>`));
    expect(() => parse3mfMesh(secondTetrahedron)).toThrow(/multiple mesh shells/);
  });
});
