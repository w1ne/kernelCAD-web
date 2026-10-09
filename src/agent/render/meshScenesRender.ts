// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/meshScenesRender.ts
//
// Display-only renders of coloured triangle bodies (FEA stress bands, printed
// infill bands). The bodies already ARE triangle meshes, so they go straight
// to the demo player instead of through `lib.fromSTL` (STL -> sewn B-rep ->
// re-tessellation, ~20 s for a bracket) and a generated script evaluation.
// One browser session and one player page serve every scene: each scene
// swaps the meshes, re-applies the publish stage (the contact shadow is baked
// from the visible model) and captures its tile.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Page } from 'playwright';
import sharp from 'sharp';
import type { FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';
import { parseBinaryStl, readRenderBodies } from '../../kernel/fea/renderBodies';
import { PUBLISH_PRESET, type PublishStageSpec } from '../../shared/render/publishPreset';
import {
  HEADLESS_VIEWPORT,
  openDemoPlayerPage,
  captureEngineeringTiles,
  removeDevChrome,
  type RenderView,
  swapSceneMeshes,
} from './headlessRender';
import { resolveRenderBaseUrl } from './playerServer';
import { PUBLISH_QUERY_PARTS, applyPublishStageOnPage, capturePublishTile } from './publishCapture';

/** One coloured body: `positions` holds 9 floats per triangle (outward winding). */
export interface MeshBody {
  name: string;
  color: string;
  positions: Float32Array;
}

export interface MeshScene {
  key: string;
  bodies: readonly MeshBody[];
}

export interface MeshSceneOpts {
  publish: PublishStageSpec;
  width?: number;
  height?: number;
  azDeg?: number;
  elDeg?: number;
}

/** The bodies of a generated band script, read from the sidecar next to it;
 *  undefined when there is none (an older or hand-written script). */
export async function loadMeshScene(key: string, scriptPath: string): Promise<MeshScene | undefined> {
  const dir = dirname(scriptPath);
  const refs = await readRenderBodies(dir);
  if (refs === undefined) return undefined;
  const bodies = await Promise.all(refs.map(async (r) => ({
    name: r.name,
    color: r.color,
    positions: parseBinaryStl(await readFile(join(dir, r.file))),
  })));
  return { key, bodies };
}

/** A body as one flat-shaded face: three vertices per triangle, each with
 *  the triangle's facet normal (what the STL import path produced). */
export function bodyToFeatureMesh(body: MeshBody, index: number): FeatureMeshSerialized {
  const p = body.positions;
  const triCount = Math.floor(p.length / 9);
  const vertices = Array.from(p.subarray(0, triCount * 9));
  const normals = new Array<number>(triCount * 9);
  const indices = new Array<number>(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    const o = t * 9;
    const ux = p[o + 3] - p[o], uy = p[o + 4] - p[o + 1], uz = p[o + 5] - p[o + 2];
    const vx = p[o + 6] - p[o], vy = p[o + 7] - p[o + 1], vz = p[o + 8] - p[o + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    for (let k = 0; k < 3; k++) {
      normals[o + k * 3] = nx / len;
      normals[o + k * 3 + 1] = ny / len;
      normals[o + k * 3 + 2] = nz / len;
      indices[t * 3 + k] = t * 3 + k;
    }
  }
  return {
    featureId: `body_${index}`,
    featureKind: 'importedStl',
    predecessors: [],
    displayName: body.name,
    color: body.color,
    faces: [{ vertices, indices, normals, faceId: 0 }],
  };
}

export function sceneBounds(bodies: readonly MeshBody[]): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of bodies) {
    for (let i = 0; i + 2 < b.positions.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        const v = b.positions[i + a];
        if (v < min[a]) min[a] = v;
        if (v > max[a]) max[a] = v;
      }
    }
  }
  return { min, max };
}

/** True when the tile is one flat colour (the WebGL canvas had not drawn yet:
 *  a transparent-black frame, or a bare backdrop with no model in it). */
async function isBlankTile(png: Buffer): Promise<boolean> {
  const { channels } = await sharp(png).stats();
  return channels.every((c) => c.min === c.max);
}

/** Capture one tile, retrying a blank frame after letting the page draw
 *  (the first capture on a fresh page is occasionally empty). */
async function captureSettled(
  page: Page,
  tile: { width: number; height: number; azDeg: number; elDeg: number },
): Promise<Buffer> {
  let png = await capturePublishTile(page, tile);
  for (let attempt = 0; attempt < 3 && (await isBlankTile(png)); attempt++) {
    await page.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
    png = await capturePublishTile(page, tile);
  }
  return png;
}

type SceneCapture<T> = (page: Page, first: boolean) => Promise<T>;

/** Open one player page and, scene by scene, swap the meshes in and run
 *  `capture`. Scenes with no triangles are skipped. */
async function renderScenes<T>(
  scenes: readonly MeshScene[],
  extraQueryParts: readonly string[],
  capture: SceneCapture<T>,
): Promise<Record<string, T>> {
  const base = await resolveRenderBaseUrl();
  const out: Record<string, T> = {};
  try {
    const handle = await openDemoPlayerPage({
      baseUrl: base.baseUrl,
      viewport: HEADLESS_VIEWPORT,
      extraQueryParts,
    });
    try {
      let first = true;
      for (const scene of scenes) {
        if (scene.bodies.every((b) => b.positions.length === 0)) continue;
        await swapSceneMeshes(handle.page, scene.bodies.map(bodyToFeatureMesh), sceneBounds(scene.bodies));
        if (first) await removeDevChrome(handle.page);
        out[scene.key] = await capture(handle.page, first);
        first = false;
      }
    } finally {
      await handle.close();
    }
  } finally {
    await base.close().catch(() => undefined);
  }
  return out;
}

/** Publish-look hero tile per scene, all through one browser page; key -> PNG. */
export async function renderMeshScenes(
  scenes: readonly MeshScene[],
  opts: MeshSceneOpts,
): Promise<Record<string, Buffer>> {
  const tile = {
    width: opts.width ?? PUBLISH_PRESET.stillWidth,
    height: opts.height ?? PUBLISH_PRESET.stillHeight,
    azDeg: opts.azDeg ?? PUBLISH_PRESET.heroAzDeg,
    elDeg: opts.elDeg ?? PUBLISH_PRESET.heroElDeg,
  };
  return renderScenes(scenes, PUBLISH_QUERY_PARTS, async (page) => {
    await applyPublishStageOnPage(page, opts.publish);
    return captureSettled(page, tile);
  });
}

/** Engineering-look tiles (the `render_preview` default look) per scene and
 *  view, all through one browser page. */
export async function renderMeshViews(
  scenes: readonly MeshScene[],
  opts: { views: readonly RenderView[]; width: number; height: number },
): Promise<Record<string, Partial<Record<RenderView, Buffer>>>> {
  return renderScenes(scenes, [], (page) => captureEngineeringTiles(page, opts, opts.views));
}
