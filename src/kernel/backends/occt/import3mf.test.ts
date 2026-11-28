// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { parse3mfMesh, ThreeMfImportError } from './import3mf';

const fixture = resolve(process.cwd(), 'docs/demos/3mf-resource-ids/generic-cube.3mf');
const componentFixture = resolve(process.cwd(), 'docs/demos/from3mf-component-assembly/two-block-assembly.3mf');
// lib3mf 2.5.0 output (make-fixture.py): root components object, meshes in /3D/Objects via p:path.
const productionFixture = resolve(process.cwd(), 'examples/interoperability/3mf-production/standoff-plate.3mf');
const ROOT_MODEL = '3D/3dmodel.model';
const OBJECTS_MODEL = '3D/Objects/standoff_plate.model';

function productionArchive(rewrite: (files: Record<string, string>) => void): Uint8Array {
  const files = unzipSync(readFileSync(productionFixture));
  const text: Record<string, string> = {};
  for (const [name, data] of Object.entries(files)) text[name] = new TextDecoder().decode(data);
  rewrite(text);
  return zipSync(Object.fromEntries(Object.entries(text).map(([name, xml]) => [name, new TextEncoder().encode(xml)])));
}

function axisRange(positions: ArrayLike<number>, axis: number): [number, number] {
  const values = Array.from(positions).filter((_coordinate, index) => index % 3 === axis);
  return [Math.min(...values), Math.max(...values)];
}

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

describe('3MF Production extension (p:path model parts)', () => {
  it('resolves components that reference objects in a separate model part', () => {
    const mesh = parse3mfMesh(new Uint8Array(readFileSync(productionFixture)));

    expect(mesh.unit).toBe('millimeter');
    expect(mesh.bodies).toHaveLength(3);
    expect(mesh.triangleCount).toBe(12 + 2 * 20);
    expect(axisRange(mesh.positions, 0)).toEqual([0, 60]);
    expect(axisRange(mesh.positions, 1)).toEqual([0, 40]);
    expect(axisRange(mesh.positions, 2)).toEqual([0, 11]);
    // The second standoff is turned 90 degrees: its flats face X, so it spans 50 +/- 3.464101 in X.
    expect(axisRange(mesh.bodies[2], 0).map((value) => Number(value.toFixed(6)))).toEqual([46.535899, 53.464101]);
    expect(axisRange(mesh.bodies[2], 1)).toEqual([16, 24]);
  });

  it('accepts the production prefix in requiredextensions, under any declared prefix', () => {
    const required = productionArchive((files) => {
      files[ROOT_MODEL] = files[ROOT_MODEL].replace('<model ', '<model requiredextensions="p" ');
    });
    expect(parse3mfMesh(required).bodies).toHaveLength(3);

    const renamed = productionArchive((files) => {
      files[ROOT_MODEL] = files[ROOT_MODEL]
        .replace('xmlns:p=', 'xmlns:prod=')
        .replace('<model ', '<model requiredextensions="prod" ')
        .replaceAll('p:path=', 'prod:path=')
        .replaceAll('p:UUID=', 'prod:UUID=');
    });
    expect(parse3mfMesh(renamed).bodies).toHaveLength(3);
  });

  it('finds the root model part from the package start-part relationship', () => {
    const moved = productionArchive((files) => {
      files['3D/main.model'] = files[ROOT_MODEL];
      delete files[ROOT_MODEL];
      files['_rels/.rels'] = files['_rels/.rels'].replace('Target="/3D/3dmodel.model"', 'Target="/3D/main.model"');
    });
    expect(parse3mfMesh(moved).bodies).toHaveLength(3);
  });

  it('refuses unresolved, nested and unit-mismatched model-part references', () => {
    const missingPart = productionArchive((files) => {
      delete files[OBJECTS_MODEL];
    });
    expect(() => parse3mfMesh(missingPart)).toThrow(/model part '\/3D\/Objects\/standoff_plate.model' is missing/);

    const missingObject = productionArchive((files) => {
      files[ROOT_MODEL] = files[ROOT_MODEL].replace('component objectid="1"', 'component objectid="9"');
    });
    expect(() => parse3mfMesh(missingObject)).toThrow(/references missing object '9' in '\/3D\/Objects\/standoff_plate.model'/);

    const nested = productionArchive((files) => {
      files[OBJECTS_MODEL] = files[OBJECTS_MODEL].replace(
        '</resources>',
        '<object id="7" type="model"><components><component objectid="1" p:path="/3D/Objects/standoff_plate.model" /></components></object></resources>',
      );
      files[ROOT_MODEL] = files[ROOT_MODEL].replace('component objectid="1"', 'component objectid="7"');
    });
    expect(() => parse3mfMesh(nested)).toThrow(/only the root model part may reference other model parts/);

    const inches = productionArchive((files) => {
      files[OBJECTS_MODEL] = files[OBJECTS_MODEL].replace('unit="millimeter"', 'unit="inch"');
    });
    expect(() => parse3mfMesh(inches)).toThrow(/unit 'inch' differs from the root model unit 'millimeter'/);
  });

  it('still refuses other required extensions next to the production extension', () => {
    const slice = productionArchive((files) => {
      files[ROOT_MODEL] = files[ROOT_MODEL].replace('<model ', '<model requiredextensions="p s" ');
    });
    expect(() => parse3mfMesh(slice)).toThrow(/unsupported extensions: s\./);
  });
});
