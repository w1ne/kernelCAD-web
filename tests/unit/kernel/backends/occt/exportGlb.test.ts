// tests/unit/kernel/backends/occt/exportGlb.test.ts
//
// Round-trip gate for the GLB writer. Builds a SceneBackend, walks it via
// `sceneToWorldFrameParts`, encodes via `exportGlbAsync`, then parses the
// emitted .glb binary with `@gltf-transform/core` and asserts the node
// hierarchy + PBR material round-trips (metalness / roughness / anisotropy
// transcription through `KHR_materials_*` extensions).

import { describe, it, expect, beforeAll } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import {
  initOcct,
  OcctBackend,
  meshShapeForExport,
} from '../../../../../src/kernel/backends/occt/occtBackend';
import { sceneToWorldFrameParts } from '../../../../../src/kernel/backends/occt/sceneToWorldFrame';
import { exportGlbAsync } from '../../../../../src/kernel/backends/occt/exportGlb';
import type { SolvedRigAssembly } from '../../../../../src/kernel/export/rigHierarchy';
import { expandFinish } from '../../../../../src/shared/render/finishes';
import { Transform } from '../../../../../src/shared/runtime/se3';
import type { SceneBackend, SceneBackendPart } from '../../../../../src/kernel/backends/sceneBackend';
import type { PBRMaterial } from '../../../../../src/shared/intent/material';

/**
 * Parse the JSON chunk of a GLB into a plain object. `@gltf-transform/core`'s
 * `NodeIO.readBinary` only surfaces extensions whose plugin is registered, so
 * we use this raw view to assert the `KHR_materials_*` extension was actually
 * written into the file (matching the precedent in
 * `scripts/lib/exportGlb.test.ts`).
 */
function parseGlbJson(bytes: Uint8Array): {
  materials?: Array<{
    name?: string;
    pbrMetallicRoughness?: { baseColorFactor?: number[] };
    extensions?: Record<string, Record<string, unknown>>;
  }>;
  extensionsUsed?: string[];
  asset?: { extras?: Record<string, unknown> };
  nodes?: Array<{ name?: string; mesh?: number; children?: number[]; matrix?: number[] }>;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(0, true)).toBe(0x46546c67); // 'glTF'
  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  expect(jsonType).toBe(0x4e4f534a); // 'JSON'
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
}

function makeScene(parts: { name: string; shape: OcctBackend; material?: PBRMaterial; color?: string; worldTransform?: Transform }[]): SceneBackend {
  return {
    target: 'export-occt',
    assemblyName: 'demo',
    _kind: 'scene',
    parts: parts.map((p): SceneBackendPart => {
      const entry: SceneBackendPart = {
        name: p.name,
        shape: p.shape,
        worldTransform: p.worldTransform ?? Transform.identity(),
        ...(p.color !== undefined ? { color: p.color } : {}),
        ...(p.material !== undefined ? { material: p.material } : {}),
      };
      return entry;
    }),
  };
}

function meshAllParts(scene: SceneBackend) {
  return sceneToWorldFrameParts(scene).map((p) => ({
    ...p,
    mesh: meshShapeForExport(p.shape.getReplicadShape()),
  }));
}

describe('exportGlbAsync', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  it('writes a valid GLB with one node per scene part', async () => {
    const scene = makeScene([
      { name: 'cube', shape: OcctBackend.box(10, 10, 10), color: '#88ccff' },
    ]);
    const meshed = meshAllParts(scene);
    const bytes = await exportGlbAsync(meshed, { format: 'glb' });
    expect(bytes.length).toBeGreaterThan(20);
    // GLB magic = 'glTF' (0x67 0x6C 0x54 0x46 little-endian).
    expect(bytes[0]).toBe(0x67);
    expect(bytes[1]).toBe(0x6C);
    expect(bytes[2]).toBe(0x54);
    expect(bytes[3]).toBe(0x46);

    // Round-trip parse and verify a node by the expected name exists. The
    // three-stdlib exporter writes the THREE.Mesh's name onto the glTF
    // *node* (not the mesh), matching the runtime intent of "one part = one
    // named node in the scene graph".
    const doc = await new NodeIO().readBinary(bytes);
    const nodes = doc.getRoot().listNodes();
    expect(nodes.some((n) => n.getName() === 'cube')).toBe(true);
  });

  it('preserves PBR fields via MeshPhysicalMaterial (metalness / roughness / anisotropy)', async () => {
    const scene = makeScene([
      {
        name: 'metalCube',
        shape: OcctBackend.box(10, 10, 10),
        material: {
          baseColor: '#cccccc',
          metalness: 0.9,
          roughness: 0.2,
          anisotropy: 0.5,
        },
      },
    ]);
    const meshed = meshAllParts(scene);
    const bytes = await exportGlbAsync(meshed, { format: 'glb' });
    // Use NodeIO for the core-spec PBR fields (metalness / roughness).
    const doc = await new NodeIO().readBinary(bytes);
    const mat = doc.getRoot().listMaterials()[0];
    expect(mat).toBeDefined();
    expect(mat.getMetallicFactor()).toBeCloseTo(0.9, 3);
    expect(mat.getRoughnessFactor()).toBeCloseTo(0.2, 3);
    // For the KHR_materials_anisotropy extension we parse the GLB JSON
    // directly — @gltf-transform/core only surfaces extensions whose plugin
    // is registered, and we don't bring in @gltf-transform/extensions just
    // for the test. The on-disk presence of the extension is the contract.
    const json = parseGlbJson(bytes);
    expect(json.extensionsUsed ?? []).toContain('KHR_materials_anisotropy');
    const ext = json.materials?.[0]?.extensions?.['KHR_materials_anisotropy'] as
      | { anisotropyStrength?: number }
      | undefined;
    expect(ext?.anisotropyStrength).toBeCloseTo(0.5, 3);
  });

  it('preserves PBR base colors round-trip (pink + yellow PBR cubes)', async () => {
    const scene = makeScene([
      {
        name: 'pink',
        shape: OcctBackend.box(10, 10, 10),
        material: { baseColor: '#ff2f87', metalness: 0, roughness: 0.34 },
      },
      {
        name: 'yellow',
        shape: OcctBackend.box(10, 10, 10),
        material: { baseColor: '#ffd91a', metalness: 0, roughness: 0.38 },
      },
    ]);
    const meshed = meshAllParts(scene);
    const bytes = await exportGlbAsync(meshed, { format: 'glb' });
    const doc = await new NodeIO().readBinary(bytes);
    const baseColors = doc
      .getRoot()
      .listMaterials()
      .map((m) => m.getBaseColorFactor());
    // GLTFExporter writes linear-space colors (sRGB->linear conversion).
    // #ff2f87 (sRGB) -> ~(1.0, 0.028, 0.242) linear; the dominant red + low
    // green + non-trivial blue is the discriminator.
    expect(
      baseColors.some(
        (c) => c && c[0] > 0.9 && c[1] < 0.08 && c[2] > 0.2,
      ),
    ).toBe(true);
    // #ffd91a (sRGB) -> ~(1.0, 0.694, 0.010) linear; dominant red + high
    // green + ~zero blue.
    expect(
      baseColors.some(
        (c) => c && c[0] > 0.9 && c[1] > 0.6 && c[2] < 0.05,
      ),
    ).toBe(true);
  });

  it('writes finish and colour-parameter material names as unique non-empty GLB names', async () => {
    const scene = makeScene([
      { name: 'fastener', shape: OcctBackend.box(10, 10, 10), material: expandFinish('brass') },
      {
        name: 'body',
        shape: OcctBackend.box(8, 8, 8),
        material: { baseColor: '#477a91', metalness: 0.1, roughness: 0.6 },
      },
    ]);
    const meshed = meshAllParts(scene).map((part, index) => ({
      ...part,
      ...(index === 1 ? { colorParamName: 'hull' } : {}),
    }));
    const bytes = await exportGlbAsync(meshed, { format: 'glb' });
    const names = (parseGlbJson(bytes).materials ?? []).map((material) => material.name);

    expect(names).toEqual(expect.arrayContaining(['brass', 'hull']));
    expect(names.every((name) => typeof name === 'string' && name.trim().length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('deduplicates identical PBR materials that share an explicit name', async () => {
    const shared = { name: 'coating', baseColor: '#56789a', metalness: 0.2, roughness: 0.4 };
    const scene = makeScene([
      { name: 'left', shape: OcctBackend.box(10, 10, 10), material: shared },
      { name: 'right', shape: OcctBackend.box(8, 8, 8), material: { ...shared } },
    ]);
    const bytes = await exportGlbAsync(meshAllParts(scene), { format: 'glb' });
    const names = (parseGlbJson(bytes).materials ?? []).map((material) => material.name);

    expect(names).toEqual(['coating']);
  });

  it('embeds asset.extras.kernelcad with version + isoDate + axisConvention', async () => {
    const scene = makeScene([{ name: 'cube', shape: OcctBackend.box(10, 10, 10) }]);
    const meshed = meshAllParts(scene);
    const bytes = await exportGlbAsync(meshed, { format: 'glb' });
    const doc = await new NodeIO().readBinary(bytes);
    const asset = doc.getRoot().getAsset();
    expect(asset.extras?.kernelcad).toBeDefined();
    const kc = asset.extras!.kernelcad as {
      version: string;
      isoDate: string;
      axisConvention: string;
    };
    expect(kc.axisConvention).toBe('y-up');
    expect(kc.version).toBeTruthy();
    expect(kc.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('names kernelCAD in asset.generator', async () => {
    const scene = makeScene([{ name: 'cube', shape: OcctBackend.box(10, 10, 10) }]);
    const meshed = meshAllParts(scene);
    const bytes = await exportGlbAsync(meshed, { format: 'glb' });
    // glTF-Transform's reader drops asset.generator; read the JSON chunk raw.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true))));
    expect(json.asset.generator).toMatch(/^kernelCAD \S+ \(https:\/\/kernelcad\.com\)$/);
  });

  it('records axisConvention="z-up" when axis: "z-up" is passed', async () => {
    const scene = makeScene([{ name: 'cube', shape: OcctBackend.box(10, 10, 10) }]);
    const meshed = meshAllParts(scene);
    const bytes = await exportGlbAsync(meshed, { format: 'glb', axis: 'z-up' });
    const doc = await new NodeIO().readBinary(bytes);
    const asset = doc.getRoot().getAsset();
    const kc = asset.extras!.kernelcad as { axisConvention: string };
    expect(kc.axisConvention).toBe('z-up');
  });

  it('throws export.glb.draco-glass-conflict at runtime when draco === true', async () => {
    const scene = makeScene([
      {
        name: 'lens',
        shape: OcctBackend.box(10, 10, 1),
        material: { baseColor: '#ffffff', transmission: 0.95, ior: 1.5 },
      },
    ]);
    const meshed = meshAllParts(scene);
    // Cast through `unknown` because the type narrows draco to false; the
    // runtime gate covers the case where a future slice widens the type.
    await expect(
      exportGlbAsync(
        meshed,
        { format: 'glb', draco: true } as unknown as Parameters<typeof exportGlbAsync>[1],
      ),
    ).rejects.toThrow(/draco/i);
  });

  it('throws on an empty parts array', async () => {
    await expect(exportGlbAsync([], { format: 'glb' })).rejects.toThrow(/no parts/i);
  });

  it('exports a pivot hierarchy and asset-level rig extras by default when solved mates are supplied', async () => {
    const scene = makeScene([
      { name: 'base', shape: OcctBackend.box(20, 20, 5) },
      { name: 'lid', shape: OcctBackend.box(20, 30, 5), worldTransform: Transform.translation(10, 0, 5) },
    ]);
    const solved: SolvedRigAssembly = {
      groundedPart: 'base',
      parts: [
        { name: 'base', worldTransform: Transform.identity().toMat4() },
        { name: 'lid', worldTransform: Transform.translation(10, 0, 5).toMat4() },
      ],
      mates: [{ name: 'lid', type: 'revolute', a: 'base.hinge', b: 'lid.hinge', limitsDeg: [0, 110] }],
      connectorsByPartName: {
        base: [{ name: 'hinge', type: 'axis', origin: [10, 0, 5], axis: [0, 0, 1] }],
        lid: [{ name: 'hinge', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] }],
      },
    };
    const bytes = await exportGlbAsync(meshAllParts(scene), { format: 'glb' }, solved);
    const json = parseGlbJson(bytes);
    const pivot = json.nodes?.find((node) => node.name === 'pivot:lid');
    const partNode = json.nodes?.find((node) => node.name === 'part:lid');
    const lid = json.nodes?.find((node) => node.name === 'lid');
    expect(pivot).toBeDefined();
    expect(pivot?.children).toContain(json.nodes?.indexOf(partNode!));
    expect(partNode?.children).toContain(json.nodes?.indexOf(lid!));
    expect(lid?.matrix).toBeDefined();
    expect(json.asset?.extras?.kernelcad).toMatchObject({
      rig: { lid: { type: 'rotate', axis: 'z', range: [0, 110], node: 'pivot:lid' } },
    });
  });

  it('keeps flat GLB output when hierarchy is explicitly flat', async () => {
    const scene = makeScene([
      { name: 'base', shape: OcctBackend.box(20, 20, 5) },
      { name: 'lid', shape: OcctBackend.box(20, 30, 5), worldTransform: Transform.translation(10, 0, 5) },
    ]);
    const solved: SolvedRigAssembly = {
      groundedPart: 'base',
      parts: [
        { name: 'base', worldTransform: Transform.identity().toMat4() },
        { name: 'lid', worldTransform: Transform.translation(10, 0, 5).toMat4() },
      ],
      mates: [{ name: 'lid', type: 'revolute', a: 'base.hinge', b: 'lid.hinge' }],
      connectorsByPartName: {
        base: [{ name: 'hinge', type: 'axis', origin: [10, 0, 5], axis: [0, 0, 1] }],
        lid: [{ name: 'hinge', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] }],
      },
    };
    const json = parseGlbJson(await exportGlbAsync(meshAllParts(scene), { format: 'glb', hierarchy: 'flat' }, solved));
    expect(json.nodes?.some((node) => node.name === 'pivot:lid')).toBe(false);
    expect(json.asset?.extras?.kernelcad).not.toHaveProperty('rig');
  });
});

describe('exportGlbAsync style: lowpoly', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  function readColor0(bytes: Uint8Array) {
    return new NodeIO().readBinary(bytes);
  }

  it('writes faceted, vertex-coloured parts on one shared palette material in metres', async () => {
    const scene = makeScene([
      { name: 'trunk', shape: OcctBackend.cylinder(400, 60), color: '#8b5a2b' },
      { name: 'crown', shape: OcctBackend.box(300, 300, 300).translate([-150, -150, 400]), color: '#3f8f3f' },
    ]);
    const bytes = await exportGlbAsync(sceneToWorldFrameParts(scene), { format: 'glb', style: 'lowpoly' });

    const json = parseGlbJson(bytes);
    expect(json.materials?.map((m) => m.name)).toEqual(['kernelcad-palette']);

    const doc = await readColor0(bytes);
    const trunk = doc.getRoot().listNodes().find((n) => n.getName() === 'trunk')!;
    const prim = trunk.getMesh()!.listPrimitives()[0]!;
    expect(prim.getIndices()).toBeNull(); // flat: one vertex per facet corner
    const color = prim.getAttribute('COLOR_0')!;
    const c = color.getElement(0, []);
    // #8b5a2b, sRGB -> linear.
    expect(c[0]).toBeCloseTo(0.258, 2);
    expect(c[1]).toBeCloseTo(0.102, 2);
    expect(c[2]).toBeCloseTo(0.024, 2);

    const extras = json.asset?.extras?.kernelcad as {
      units: string; style: string;
      stats: { triangles: number; sizeM: number[]; minUpM: number };
      palette: Array<{ name: string; color: string; parts: string[] }>;
    };
    expect(extras.units).toBe('m');
    expect(extras.style).toBe('lowpoly');
    expect(extras.stats.sizeM[1]).toBeCloseTo(0.7, 6); // Y-up height
    expect(extras.stats.sizeM[0]).toBeCloseTo(0.3, 6);
    expect(extras.stats.minUpM).toBeCloseTo(0, 6);
    // Default 30 degree facets: a 12-segment cylinder (24 side + 2 x 10 cap
    // triangles) plus a 12-triangle box.
    expect(extras.stats.triangles).toBeLessThanOrEqual(44 + 12);
    expect(extras.palette.map((z) => [z.color, z.parts])).toEqual([
      ['#8b5a2b', ['trunk']],
      ['#3f8f3f', ['crown']],
    ]);
    // The root carries the millimetre -> metre scale.
    const root = doc.getRoot().listScenes()[0]!.listChildren()[0]!;
    expect(root.getScale()[0]).toBeCloseTo(0.001, 9);
  });

  it('uses far fewer triangles than the default pbr mesh for curved parts', async () => {
    const scene = makeScene([{ name: 'post', shape: OcctBackend.cylinder(500, 50) }]);
    const parts = sceneToWorldFrameParts(scene);
    const low = parseGlbJson(await exportGlbAsync(parts, { format: 'glb', style: 'lowpoly' }));
    const pbr = parseGlbJson(await exportGlbAsync(parts, { format: 'glb' }));
    const lowTris = (low.asset?.extras?.kernelcad as { stats: { triangles: number } }).stats.triangles;
    const pbrTris = (pbr.asset?.extras?.kernelcad as { stats: { triangles: number } }).stats.triangles;
    expect(lowTris * 3).toBeLessThan(pbrTris);
    expect((pbr.asset?.extras?.kernelcad as { units: string }).units).toBe('mm');
  });

  it('keeps glass on its own material', async () => {
    const scene = makeScene([
      { name: 'frame', shape: OcctBackend.box(100, 10, 100), color: '#444444' },
      { name: 'pane', shape: OcctBackend.box(90, 2, 90), material: { baseColor: '#aaddff', transmission: 0.9 } },
    ]);
    const json = parseGlbJson(await exportGlbAsync(sceneToWorldFrameParts(scene), { format: 'glb', style: 'lowpoly' }));
    expect(json.materials?.map((m) => m.name).sort()).toEqual(['kernelcad-palette', 'pane']);
  });

  it('fails the triangle budget instead of writing an over-budget file', async () => {
    const scene = makeScene([{ name: 'ball', shape: OcctBackend.sphere(100) }]);
    await expect(exportGlbAsync(sceneToWorldFrameParts(scene), {
      format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 10 },
    })).rejects.toThrow(/^export\.glb\.triangle-budget: \d+ triangles exceeds lowpoly\.maxTriangles 10\./);
    await expect(exportGlbAsync(sceneToWorldFrameParts(scene), {
      format: 'glb', style: 'lowpoly', lowpoly: { angularDeg: 1 },
    })).rejects.toThrow(/^export\.glb\.lowpoly-angle/);
  });
});
