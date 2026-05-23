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
    pbrMetallicRoughness?: { baseColorFactor?: number[] };
    extensions?: Record<string, Record<string, unknown>>;
  }>;
  extensionsUsed?: string[];
  asset?: { extras?: Record<string, unknown> };
  nodes?: Array<{ name?: string; mesh?: number }>;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(0, true)).toBe(0x46546c67); // 'glTF'
  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  expect(jsonType).toBe(0x4e4f534a); // 'JSON'
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
}

function makeScene(parts: { name: string; shape: OcctBackend; material?: PBRMaterial; color?: string }[]): SceneBackend {
  return {
    target: 'export-occt',
    assemblyName: 'demo',
    _kind: 'scene',
    parts: parts.map((p): SceneBackendPart => {
      const entry: SceneBackendPart = {
        name: p.name,
        shape: p.shape,
        worldTransform: Transform.identity(),
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
});
