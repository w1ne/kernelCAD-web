// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A post's model is Z-up, as everything in kernelCAD; <model-viewer> takes +Y
// as up. The blog build turns the GLB once so the model stands the right way.

import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { turnZUpToYUp } from '../../../site/scripts/blogModel';

const dir = mkdtempSync(join(tmpdir(), 'kc-blog-glb-'));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Rotates `p` by the unit quaternion `q` ([x, y, z, w], as glTF stores it). */
function rotate(q: readonly number[], p: readonly number[]): number[] {
  const [x, y, z, w] = q;
  const [px, py, pz] = p;
  const tx = 2 * (y * pz - z * py);
  const ty = 2 * (z * px - x * pz);
  const tz = 2 * (x * py - y * px);
  return [px + w * tx + (y * tz - z * ty), py + w * ty + (z * tx - x * tz), pz + w * tz + (x * ty - y * tx)];
}

describe('turnZUpToYUp', () => {
  it('puts the scene under one node that maps model +Z to +Y and model -Y toward the camera', async () => {
    const doc = new Document();
    doc.createBuffer();
    const part = doc.createNode('part').setTranslation([1, 2, 3]);
    const tube = doc.createNode('tube');
    doc.createScene('scene').addChild(part).addChild(tube);
    const file = join(dir, 'model.glb');
    await new NodeIO().write(file, doc);

    await turnZUpToYUp(file);

    const scene = (await new NodeIO().read(file)).getRoot().listScenes()[0];
    const [turn, ...others] = scene.listChildren();
    expect(others).toEqual([]);
    expect(turn.listChildren().map((n) => n.getName())).toEqual(['part', 'tube']);
    const q = turn.getRotation();
    // `+ 0` turns -0 into 0 so the comparison is about direction, not sign of zero.
    const round = (v: readonly number[]) => v.map((c) => Number(c.toFixed(6)) + 0);
    expect(round(rotate(q, [0, 0, 1]))).toEqual([0, 1, 0]);
    expect(round(rotate(q, [0, -1, 0]))).toEqual([0, 0, 1]);
    // The parts keep their own transforms under the turn.
    expect(turn.listChildren()[0].getTranslation()).toEqual([1, 2, 3]);
  });
});

import { postMedia } from '../../../site/scripts/blogPage';
import { copyMeshoptDecoder, MESHOPT_DECODER_URL } from '../../../scripts/lib/meshoptAssets';
import { readFileSync } from 'node:fs';
it('configures the same-origin decoder before compressed model-viewer upgrade and copies its MIT license', () => {
  const html = postMedia({model:'examples/a.kcad.ts',modelCompression:'meshopt'}).lines.join('\n');
  expect(html).toContain(MESHOPT_DECODER_URL);
  expect(html.indexOf('self.ModelViewerElement')).toBeLessThan(html.indexOf('type="module"'));
  expect(postMedia({model:'examples/a.kcad.ts'}).lines.join('\n')).not.toContain('meshoptDecoderLocation');
  copyMeshoptDecoder(dir);
  expect(readFileSync(join(dir,'vendor/meshopt/meshopt_decoder.js'),'utf8')).toContain('MeshoptDecoder');
  expect(readFileSync(join(dir,'vendor/meshopt/LICENSE.md'),'utf8')).toContain('MIT');
});
