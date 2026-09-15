// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Real end-to-end coverage for `.wrapTexture()` → GLB export: the exported
// GLB must carry a real image + TEXCOORD_0, not just an untextured mesh.
// Verified by loading the written bytes back with @gltf-transform/core
// (the same library the brief asks us to validate with), matching how a
// downstream viewer actually consumes the file.
import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { Document, NodeIO } from '@gltf-transform/core';
import { initOcct } from './occtBackend';
import { runAndExport } from '../../../agent/script-runtime/export';

beforeAll(async () => {
  await initOcct();
});

async function makeTestPng(dir: string): Promise<string> {
  const path = join(dir, 'label.png');
  // A tiny 8x4 gradient PNG — big enough to have real pixel content, small
  // enough to keep the test fast.
  const buf = await sharp({
    create: { width: 8, height: 4, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 255 } },
  }).png().toBuffer();
  writeFileSync(path, buf);
  return path;
}

describe('wrapTexture → GLB export', () => {
  it('embeds a real image + TEXCOORD_0 for a cylinder wrap, with UVs in [0,1]', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-wraptexture-'));
    try {
      const imagePath = await makeTestPng(dir);
      const code = [
        `const can = cylinder(10, 30).wrapTexture({ path: ${JSON.stringify(imagePath)} }, { type: 'cylinder', axis: [0, 0, 1] });`,
        `return can;`,
      ].join('\n');

      const result = await runAndExport({
        code,
        fileName: 'can.kcad.ts',
        format: 'glb',
        scriptDir: dir,
        options: { format: 'glb' },
      });

      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(result.bytes.byteLength).toBeGreaterThan(0);

      const io = new NodeIO();
      const doc: Document = await io.readBinary(result.bytes);
      const root = doc.getRoot();

      const meshes = root.listMeshes();
      expect(meshes.length).toBeGreaterThan(0);
      const mesh = meshes[0];
      const prims = mesh.listPrimitives();
      expect(prims.length).toBeGreaterThan(0);
      const prim = prims[0];

      // TEXCOORD_0 present with a plausible UV range.
      const uv = prim.getAttribute('TEXCOORD_0');
      expect(uv).not.toBeNull();
      const uvArray = uv!.getArray()!;
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
      for (let i = 0; i < uvArray.length; i += 2) {
        minU = Math.min(minU, uvArray[i]);
        maxU = Math.max(maxU, uvArray[i]);
        minV = Math.min(minV, uvArray[i + 1]);
        maxV = Math.max(maxV, uvArray[i + 1]);
      }
      expect(minU).toBeGreaterThanOrEqual(0);
      expect(maxU).toBeLessThanOrEqual(1);
      expect(minV).toBeGreaterThanOrEqual(0);
      expect(maxV).toBeLessThanOrEqual(1);
      // A cylinder wrap must actually use the full angular range (u) and
      // most of the height range (v) — not collapse to a point.
      expect(maxU - minU).toBeGreaterThan(0.5);
      expect(maxV - minV).toBeGreaterThan(0.5);

      // Real image embedded, referenced by the material.
      const material = prim.getMaterial();
      expect(material).not.toBeNull();
      const baseColorTexture = material!.getBaseColorTexture();
      expect(baseColorTexture).not.toBeNull();
      const image = baseColorTexture!.getImage();
      expect(image).not.toBeNull();
      expect(image!.byteLength).toBeGreaterThan(0);
      expect(baseColorTexture!.getMimeType()).toBe('image/png');

      // Round-trip the embedded image bytes through sharp to confirm they
      // decode to the same pixel dimensions as the source PNG.
      const meta = await sharp(Buffer.from(image!)).metadata();
      expect(meta.width).toBe(8);
      expect(meta.height).toBe(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('leaves an untextured part with no TEXCOORD_0 material texture', async () => {
    const code = `return cylinder(10, 30).finish('abs', { color: '#3366cc' });`;
    const result = await runAndExport({
      code,
      fileName: 'plain.kcad.ts',
      format: 'glb',
      options: { format: 'glb' },
    });
    const io = new NodeIO();
    const doc = await io.readBinary(result.bytes);
    const mesh = doc.getRoot().listMeshes()[0];
    const prim = mesh.listPrimitives()[0];
    const material = prim.getMaterial();
    expect(material?.getBaseColorTexture() ?? null).toBeNull();
  });

  it('wrapTexture rejects an invalid projection at build time (not at export)', async () => {
    const code = `return cylinder(10, 30).wrapTexture({ path: 'x.png' }, { type: 'cone' });`;
    await expect(
      runAndExport({ code, fileName: 'bad.kcad.ts', format: 'glb', options: { format: 'glb' } }),
    ).rejects.toThrow(/wrapTexture: projection must be/);
  });

  it('wrapTexture rejects a bad imageRef', async () => {
    const code = `return cylinder(10, 30).wrapTexture({}, { type: 'sphere' });`;
    await expect(
      runAndExport({ code, fileName: 'bad2.kcad.ts', format: 'glb', options: { format: 'glb' } }),
    ).rejects.toThrow(/wrapTexture: imageRef must be/);
  });
});
