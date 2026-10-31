// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, loadAssetCatalog, readAssetSource } from '../../../src/agent/catalog/catalogStore';
import { emitAssetModule } from '../../../src/agent/catalog/assetModule';

type AssetModule = {
  default: (options?: Record<string, unknown>) => THREE.Group;
  meta: { id: string; triangles: number };
  runtimeKnobs: string[];
  palette: Array<{ color: string; param?: string }>;
};

let dir: string;
let mod: AssetModule;
let source: string;

function triangles(group: THREE.Object3D): number {
  let count = 0;
  group.traverse((o) => { if (o instanceof THREE.Mesh) count += o.geometry.getAttribute('position').count / 3; });
  return count;
}

function colorsOf(group: THREE.Object3D): Set<string> {
  const out = new Set<string>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const c = o.geometry.getAttribute('color');
    if (c) out.add(`#${new THREE.Color(c.getX(0), c.getY(0), c.getZ(0)).getHexString()}`);
  });
  return out;
}

beforeAll(async () => {
  await initOcct();
  const { dir: catalogDir, index } = loadAssetCatalog();
  const asset = index.assets.find((row) => row.id === 'pine-tree')!;
  const glb = await exportLowPolyAsset(readAssetSource(catalogDir, asset), 'pine-tree.kcad.ts');
  // Resolve three from this repo so the temp module can import it by URL.
  source = await emitAssetModule(asset, glb, { threeSpecifier: import.meta.resolve('three') });
  dir = mkdtempSync(join(tmpdir(), 'kcad-asset-module-'));
  writeFileSync(join(dir, 'pine-tree.mjs'), source);
  mod = await import(pathToFileURL(join(dir, 'pine-tree.mjs')).href) as AssetModule;
}, 120_000);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('catalog asset ES module', () => {
  it('builds the published asset synchronously with the catalog triangle count, flat-shaded on one material', () => {
    const group = mod.default();
    expect(group).toBeInstanceOf(THREE.Group);
    expect(triangles(group)).toBe(mod.meta.triangles);
    const materials = new Set<THREE.Material>();
    group.traverse((o) => { if (o instanceof THREE.Mesh) materials.add(o.material as THREE.Material); });
    expect([...materials].map((m) => m.name)).toEqual(['kernelcad-palette']);
    expect(colorsOf(group)).toEqual(new Set(['#7a4b2a', '#2f7d4a']));
    const box = new THREE.Box3().setFromObject(group);
    expect(box.max.y - box.min.y).toBeCloseTo(4.5, 3);
    expect(box.min.y).toBeCloseTo(0, 6);
  });

  it('recolours palette zones from colour knobs and presets at runtime', () => {
    expect(mod.runtimeKnobs).toEqual(['bark', 'leaves']);
    expect(colorsOf(mod.default({ leaves: '#c0392b' }))).toEqual(new Set(['#7a4b2a', '#c0392b']));
    expect(colorsOf(mod.default({ preset: 'autumn' }))).toEqual(new Set(['#7a4b2a', '#c9772b']));
  });

  it('refuses geometry knobs and unknown knobs with an actionable message', () => {
    expect(() => mod.default({ tiers: '5' })).toThrow(/changes geometry; bake that variant/);
    expect(() => mod.default({ height: 3 })).toThrow(/unknown knob 'height'/);
    expect(() => mod.default({ preset: 'neon' })).toThrow(/unknown preset/);
    expect(() => mod.default({ tiers: '3' })).not.toThrow(); // the default value is fine
  });

  it('embeds no source code and stays small', () => {
    expect(source).not.toContain('meta({');
    expect(source.length).toBeLessThan(40_000);
  });
});
