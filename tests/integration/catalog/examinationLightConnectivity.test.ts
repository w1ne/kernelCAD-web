// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { Matrix4, Ray, Vector3 } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { sourceWithParamValues } from '../../../scripts/buildCatalogDownloads';

const file = resolve(process.env.KCAD_EXAMINATION_LIGHT_SOURCE
  ?? resolve(import.meta.dirname, '../../../catalog/kits/medical/examination-light.kcad.ts'));
const source = readFileSync(file, 'utf8');
const intersections = [
  { parts: ['column', 'arm'], point: [0, 0.810, 0] },
  { parts: ['arm', 'lamp-neck'], point: [0.239, 0.813, 0] },
  { parts: ['lamp-neck', 'head'], point: [0.270, 0.865, 0] },
] as const;

beforeAll(async () => { await initOcct(); }, 120_000);

async function verify(code: string, scale: number) {
  const result = await runAndExport({
    fileName: basename(file), scriptDir: dirname(file), code, format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 450 } },
  });
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const root = (await new NodeIO().readBinary(result.bytes)).getRoot();
  const inside = (name: string, point: Vector3) => {
    const node = root.listNodes().find((candidate) => candidate.getName() === name);
    if (!node?.getMesh()) throw new Error('Missing native body: ' + name);
    const matrix = new Matrix4().fromArray(node.getWorldMatrix());
    const ray = new Ray(point, new Vector3(1, Math.SQRT2 / 4, Math.sqrt(3) / 5).normalize());
    const distances: number[] = [];
    for (const primitive of node.getMesh()!.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION');
      if (!positions) throw new Error('Missing vertices: ' + name);
      const indices = primitive.getIndices()?.getArray();
      const vertex = (i: number) => new Vector3().fromArray(positions.getElement(i, [])).applyMatrix4(matrix);
      for (let i = 0; i < (indices?.length ?? positions.getCount()); i += 3) {
        const hit = ray.intersectTriangle(vertex(indices?.[i] ?? i),
          vertex(indices?.[i + 1] ?? i + 1), vertex(indices?.[i + 2] ?? i + 2), false, new Vector3());
        if (hit) distances.push(hit.distanceTo(point));
      }
    }
    distances.sort((a, b) => a - b);
    return distances.filter((distance, index) => index === 0 || distance - distances[index - 1]! > 1e-8).length % 2 === 1;
  };
  // A shared interior point establishes actual mesh overlap, not just overlapping bounds.
  for (const joint of intersections) {
    const point = new Vector3(...joint.point).multiplyScalar(scale);
    for (const part of joint.parts) expect.soft(inside(part, point), joint.parts.join(' / ') + ': ' + part).toBe(true);
  }
  const header = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength);
  const metadata = JSON.parse(new TextDecoder().decode(result.bytes.subarray(20, 20 + header.getUint32(12, true)))).asset.extras.kernelcad;
  expect(metadata.stats.triangles).toBeLessThanOrEqual(450);
  expect(metadata.stats.minUpM).toBeCloseTo(0, 6);
  [0.472, 0.879, 0.242].forEach((dimension, index) => expect(metadata.stats.sizeM[index]).toBeCloseTo(dimension * scale, 5));
  return metadata;
}

describe('examination light has continuous scene-prop supports', () => {
  it.each([0.65, 1, 1.35])('connects column, arm and head at scale %s', async (scale) => {
    await verify(sourceWithParamValues(source, { scale }, file), scale);
  }, 120_000);

  it('preserves both authored palettes without changing connections', async () => {
    const index = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../catalog/index.json'), 'utf8'));
    const asset = index.assets.find((row: { kit: string; id: string }) => row.kit === 'medical' && row.id === 'examination-light');
    for (const values of Object.values(asset.presets) as Record<string, string>[]) {
      const metadata = await verify(sourceWithParamValues(source, values, file), 1);
      for (const zone of asset.palette) for (const part of zone.parts) {
        const actual = metadata.palette.find((entry: { parts: string[] }) => entry.parts.includes(part));
        expect(actual?.color.toLowerCase(), part).toBe(values[zone.name]!.toLowerCase());
      }
    }
  }, 120_000);
});
