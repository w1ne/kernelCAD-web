// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The model a blog post shows in its 3D view: the gallery's GLB pipeline
// (scripts/lib/exportGlb.ts, then scripts/lib/optimizeGlb.ts with its flags),
// then one turn so the model stands up in <model-viewer>.

import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readWebGlb, webGlbIO, packMeshoptGlb } from '../../scripts/lib/optimizeGlb';
import { copyMeshoptDecoder } from '../../scripts/lib/meshoptAssets';

/**
 * Size limit for a post's model. A gallery tile allows 600 KB; a post shows one
 * model, larger, so it gets more room. It is still a hard limit.
 */
export const POST_GLB_MAX_BYTES = 2_000_000;

/**
 * kernelCAD is Z-up; glTF, and so <model-viewer>, is Y-up. Puts the whole scene
 * under one node turned -90 degrees about X: model +Z becomes up, and model -Y,
 * the side a kernelCAD front view looks at, faces the viewer's default camera.
 */
export async function turnZUpToYUp(file: string): Promise<void> {
  const io = await webGlbIO();
  const doc = await readWebGlb(file);
  for (const scene of doc.getRoot().listScenes()) {
    const turn = doc.createNode('z-up-to-y-up').setRotation([-Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
    for (const child of scene.listChildren()) {
      scene.removeChild(child);
      turn.addChild(child);
    }
    scene.addChild(turn);
  }
  await io.write(file, doc);
}

/** Builds `target` from the model script at `script`. Both paths are absolute. */
export async function buildPostGlb(repoRoot: string, script: string, target: string, label: string, compression?: 'meshopt'): Promise<void> {
  const { exportGlb } = await import('../../scripts/lib/exportGlb');
  const { optimizeGlb } = await import('../../scripts/lib/optimizeGlb');
  const work = mkdtempSync(path.join(tmpdir(), 'kcad-blog-glb-'));
  try {
    const raw = path.join(work, 'model.raw.glb');
    await exportGlb({ scriptPath: script, outPath: raw });
    await optimizeGlb(raw, target, { repoRoot, label, maxBytes: compression ? 0 : POST_GLB_MAX_BYTES, preserveMaterials: true });
    await turnZUpToYUp(target);
    if (compression === 'meshopt') {
      await packMeshoptGlb(target, target);
      copyMeshoptDecoder(path.join(repoRoot, 'site/public'));
    }
    const bytes = statSync(target).size;
    if (bytes >= POST_GLB_MAX_BYTES) throw new Error(`${label}: final model GLB is ${bytes} bytes (limit ${POST_GLB_MAX_BYTES})`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
