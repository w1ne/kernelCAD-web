// tests/unit/kernel/backends/occt/export3mf.test.ts
//
// Round-trip gate for the 3MF writer. Builds a SceneBackend, walks it
// through `sceneToWorldFrameParts`, encodes via `export3mfAsync`, then
// unzips the bytes and parses `3D/3dmodel.model` to verify the OPC layout +
// per-part identity (name, color, unit, embedded source).

import { describe, it, expect, beforeAll } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import {
  initOcct,
  OcctBackend,
} from '../../../../../src/kernel/backends/occt/occtBackend';
import { sceneToWorldFrameParts } from '../../../../../src/kernel/backends/occt/sceneToWorldFrame';
import { export3mfAsync } from '../../../../../src/kernel/backends/occt/export3mf';
import { Transform } from '../../../../../src/shared/runtime/se3';
import type { SceneBackend } from '../../../../../src/kernel/backends/sceneBackend';

describe('export3mfAsync', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('writes a valid OPC zip containing [Content_Types].xml, _rels/.rels, 3D/3dmodel.model', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
          color: '#ff0000',
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
    });
    const entries = unzipSync(bytes);
    expect(Object.keys(entries)).toEqual(
      expect.arrayContaining([
        '[Content_Types].xml',
        '_rels/.rels',
        '3D/3dmodel.model',
      ]),
    );
    const model = strFromU8(entries['3D/3dmodel.model']);
    expect(model).toMatch(/<model[^>]*unit="millimeter"/);
    expect(model).toMatch(/<object id="1" type="model" name="cube"/);
    // basematerials carries the part color.
    expect(model).toMatch(/displaycolor="#FF0000FF"/i);
  });

  it('emits one <object> per scene part', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'left',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
        {
          name: 'right',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.translation(20, 0, 0),
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
    });
    const entries = unzipSync(bytes);
    const model = strFromU8(entries['3D/3dmodel.model']);
    const objects = model.match(/<object\b/g) ?? [];
    expect(objects).toHaveLength(2);
  });

  it('embeds the script source under Metadata/source.kcad.ts when embedSource: true', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
      ],
    };
    const sourceText = '// kernelCAD source\nreturn box(10, 10, 10);';
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
      embedSource: true,
      scriptSource: sourceText,
    });
    const entries = unzipSync(bytes);
    expect(entries['Metadata/source.kcad.ts']).toBeDefined();
    expect(strFromU8(entries['Metadata/source.kcad.ts'])).toBe(sourceText);
  });

  it('writes unit="inch" when printUnit: "in"', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
      printUnit: 'in',
    });
    const model = strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
    expect(model).toMatch(/unit="inch"/);
  });

  it('round-trips vertex + triangle counts via the unpacked model.xml', async () => {
    // A unit box meshed via meshShapeForExport: 8 corner vertices + 12
    // triangles (6 faces × 2 triangles each). The writer must emit exactly
    // those counts so the file is independently parseable.
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
    });
    const model = strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
    const vertexNodes = model.match(/<vertex\b/g) ?? [];
    const triangleNodes = model.match(/<triangle\b/g) ?? [];
    expect(vertexNodes.length).toBe(8);
    expect(triangleNodes.length).toBe(12);
  });

  it('rejects a non-watertight mesh with an error whose message contains "watertight"', async () => {
    // Inject a non-watertight mesh directly via the meshed-part overload so
    // we exercise the assertWatertight gate without depending on a broken
    // BREP. A single triangle is the minimal non-watertight mesh.
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
      ],
    };
    const [first] = sceneToWorldFrameParts(scene);
    const open = [
      {
        ...first,
        mesh: { vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0], triangles: [0, 1, 2] },
      },
    ];
    await expect(export3mfAsync(open, { format: '3mf' })).rejects.toThrow(
      /watertight/i,
    );
  });
});
