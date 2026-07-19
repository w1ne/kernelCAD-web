#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Builds one GLB per docs example so a reader sees the model on page load
// instead of an empty canvas with a Run button under it.
//
// Why not just run the engine on load: the OCCT wasm is ~11 MB. Downloading it
// before first paint would make every docs page slower in exchange for a
// picture, which is the opposite trade. So the geometry is evaluated here, at
// build time, and the page ships a few tens of KB of triangles.
//
// The hard requirement is that the prebaked view and the live view are the same
// view. This script therefore reproduces the worker's pipeline exactly —
// `meshFeaturesPerFeature` then `selectTerminalFeatures`, faces with no
// triangles skipped, bounds taken over raw pre-transform vertices — rather than
// going through scripts/lib/exportGlb.ts, which merges a whole script into one
// mesh and bakes PBR materials the live path does not use. Same selection rule
// in, same picture out.
//
// Colours are NOT baked into the GLB. They travel as tokens in the manifest and
// the page resolves them with the same `resolveColor` the live renderer calls,
// so a prebaked body and a re-run body cannot come out different shades.

import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, Scene } from 'three';
import { GLTFExporter, mergeVertices } from 'three-stdlib';
import { buildDocsPages, type DocsPage } from '../../src/docs/liveDocs';
import { loadScriptFeatures } from '../../src/modeling/runtime/scriptLoader';
import {
  meshFeaturesPerFeature,
  selectTerminalFeatures,
} from '../../src/modeling/capture/featureMeshing';
import { appearanceOf, type DocsAppearance } from '../island/docsAppearance';
import {
  DOCS_MODEL_DIR,
  DOCS_MODEL_MANIFEST,
  hashExampleCode,
  staleModels,
  type DocsModel,
  type DocsModelManifest,
} from './docsModels';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

interface Baked {
  glb: Buffer;
  bounds: { min: number[]; max: number[] };
  appearances: DocsAppearance[];
}

/**
 * Evaluate one example and turn its drawn features into a GLB.
 *
 * The script runs from a temp file because the node script loader reads source
 * off disk. Examples import nothing, so the directory it sits in is irrelevant.
 */
async function bake(page: DocsPage, code: string): Promise<Baked> {
  const dir = mkdtempSync(path.join(tmpdir(), 'kcad-docs-'));
  const scriptPath = path.join(dir, `${page.slug}.kcad.ts`);
  try {
    writeFileSync(scriptPath, code);
    const loaded = await loadScriptFeatures(scriptPath);
    const meshed = await meshFeaturesPerFeature(
      loaded.features.map((f) => f.record),
      loaded.paramTable,
      loaded.session,
    );
    if (meshed.failedFeatureIds.length > 0) {
      throw new Error(`features failed to mesh: ${meshed.failedFeatureIds.join(', ')}`);
    }

    const scene = new Scene();
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const appearances: DocsAppearance[] = [];

    for (const feature of selectTerminalFeatures(meshed.features)) {
      // Construction geometry (a measured Curve3D) has no triangles. Skipping
      // it matches the worker; it is not a fallback, there is nothing to draw.
      if (feature.faces.length === 0) continue;

      const totalVerts = feature.faces.reduce((s, f) => s + f.vertices.length, 0);
      const totalIndices = feature.faces.reduce((s, f) => s + f.indices.length, 0);
      const positions = new Float32Array(totalVerts);
      const normals = new Float32Array(totalVerts);
      const indices = new Uint32Array(totalIndices);
      let vOff = 0;
      let iOff = 0;
      for (const face of feature.faces) {
        positions.set(face.vertices, vOff);
        normals.set(face.normals, vOff);
        const base = vOff / 3;
        for (let i = 0; i < face.indices.length; i++) indices[iOff + i] = face.indices[i] + base;
        vOff += face.vertices.length;
        iOff += face.indices.length;
      }
      // Bounds over the raw vertices, before the assembly transform — the same
      // (slightly odd, but load-bearing) rule docs-worker.ts uses. Computing it
      // differently here would move the camera the instant a reader hits Run.
      for (let i = 0; i < positions.length; i += 3) {
        for (let axis = 0; axis < 3; axis++) {
          const v = positions[i + axis];
          if (v < min[axis]) min[axis] = v;
          if (v > max[axis]) max[axis] = v;
        }
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new BufferAttribute(normals, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));
      // OCCT meshes every face on its own, so shared edges carry duplicate
      // coordinate-equal vertices. Welding is lossless — differing normals keep
      // hard edges split — and it is most of the reason these files are small.
      const mesh = new Mesh(mergeVertices(geometry));
      mesh.name = `feature-${appearances.length}`;
      if (feature.transform) mesh.applyMatrix4(new Matrix4().fromArray([...feature.transform]));
      scene.add(mesh);
      appearances.push(appearanceOf(feature.color, feature.material));
    }

    if (scene.children.length === 0) {
      throw new Error('example produced no drawable geometry');
    }

    const exporter = new GLTFExporter();
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        scene,
        (result) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error('GLTFExporter returned a non-binary result'));
        },
        reject,
        { binary: true },
      );
    });

    return { glb: Buffer.from(buffer), bounds: { min, max }, appearances };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function prebakeDocsModels(): Promise<DocsModel[]> {
  const pages = buildDocsPages().filter((p) => p.example !== null);
  const outDir = path.join(REPO_ROOT, 'site', DOCS_MODEL_DIR);
  mkdirSync(outDir, { recursive: true });

  const models: DocsModel[] = [];
  for (const page of pages) {
    const code = page.example!.code;
    const baked = await bake(page, code);
    const file = `${page.slug}.glb`;
    writeFileSync(path.join(outDir, file), baked.glb);
    models.push({
      slug: page.slug,
      url: `/${DOCS_MODEL_DIR}/${file}`,
      codeHash: hashExampleCode(code),
      bytes: statSync(path.join(outDir, file)).size,
      bounds: baked.bounds,
      appearances: baked.appearances,
    });
    console.log(`  ${page.slug}.glb — ${baked.glb.length.toLocaleString()} bytes`);
  }

  const manifest: DocsModelManifest = { models };
  writeFileSync(
    path.join(outDir, DOCS_MODEL_MANIFEST),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  // Check our own output against the source we just read. Cheap, and it is the
  // gate that would catch a partial run — a crash between writing a GLB and
  // writing the manifest leaves exactly the stale pairing this file exists to
  // prevent.
  const stale = staleModels(buildDocsPages(), manifest);
  if (stale.length > 0) {
    throw new Error(`prebake produced a stale manifest:\n  - ${stale.join('\n  - ')}`);
  }
  return models;
}

async function main(): Promise<void> {
  const models = await prebakeDocsModels();
  const total = models.reduce((n, m) => n + m.bytes, 0);
  console.log(`✓ ${DOCS_MODEL_DIR} — ${models.length} models, ${total.toLocaleString()} bytes`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('prebake-docs-models failed:', err);
    process.exit(1);
  });
}
