// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// GATE: every drawn body carries edge lines, on both render paths.
//
// The docs viewer shows shaded models with feature edges on top. There are two
// paths that build a body — the prebaked model (docsBody.buildPrebakedBody) and
// the live Run result (docsBody.buildLiveFeature) — and both must attach edges
// from the same code, or pressing Run would redraw the model without them (or
// with different ones). These tests build bodies through the real functions the
// island calls and assert the LineSegments child is there, then assert the
// dispose path frees the edge geometry so a Run does not leak one per press.
//
// The prebaked path is checked against the actual .kcm files when a docs build
// has produced them (they are gitignored build artifacts, so on a clean
// checkout the synthetic bodies below carry the test). The live path is run once
// through OCCT, the exact way liveDocsExamples.browser.test.ts runs an example.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildPrebakedBody, buildLiveFeature, disposeBodyTree } from './docsBody';
import { decodeDocsMesh, type DocsMeshData } from './docsMesh';
import { appearanceOf } from './docsAppearance';
import type { DocsMeshFeature, DocsMeshFace } from './docs-worker';
import { DOCS_MODEL_DIR, DOCS_MODEL_EXT, DOCS_MODEL_MANIFEST } from '../scripts/docsModels';
import { buildDocsPages } from '../../src/docs/liveDocs';
import { runScriptInBrowser } from '../../src/modeling/runtime/browserRuntime';
import {
  meshFeaturesPerFeature,
  selectTerminalFeatures,
} from '../../src/modeling/capture/featureMeshing';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.resolve(HERE, '..', DOCS_MODEL_DIR);

/** The one LineSegments child three attaches under a body, or null. */
function edgeChild(root: THREE.Object3D): THREE.LineSegments | null {
  let found: THREE.LineSegments | null = null;
  root.traverse((n) => {
    if (n instanceof THREE.LineSegments) found = n;
  });
  return found;
}

function segmentCount(lines: THREE.LineSegments): number {
  return lines.geometry.getAttribute('position').count / 2;
}

/** A box, expressed as a prebaked body: twelve feature edges, no triangulation. */
function boxBody(): DocsMeshData {
  const g = new THREE.BoxGeometry(10, 10, 10);
  return {
    positions: g.getAttribute('position').array as Float32Array,
    normals: g.getAttribute('normal').array as Float32Array,
    indices: g.getIndex()!.array as Uint32Array,
    transform: null,
  };
}

/**
 * A box expressed as the worker expresses it: six independent OCCT faces, each
 * its own little vertex soup. buildLiveFeature must weld these back into the one
 * body the prebake would have stored — which is what makes the edges match.
 */
function boxFaces(): DocsMeshFace[] {
  const g = new THREE.BoxGeometry(10, 10, 10).toNonIndexed();
  const pos = g.getAttribute('position').array as Float32Array;
  const nor = g.getAttribute('normal').array as Float32Array;
  const faces: DocsMeshFace[] = [];
  for (let f = 0; f < 6; f++) {
    const start = f * 6 * 3; // two triangles, six vertices, three floats each
    faces.push({
      vertices: pos.slice(start, start + 18),
      normals: nor.slice(start, start + 18),
      indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
    });
  }
  return faces;
}

describe('docs body edges', () => {
  it('a prebaked body gets a LineSegments child with feature edges', () => {
    const mesh = buildPrebakedBody(boxBody(), undefined);
    const edges = edgeChild(mesh);
    expect(edges, 'prebaked body has no edge lines').not.toBeNull();
    // A cube has twelve edges. Anything near zero means EdgesGeometry ran on the
    // wrong attribute; the full triangle count would mean the threshold is off.
    expect(segmentCount(edges!)).toBe(12);
  });

  it('a live feature welds its faces and gets the same edges as the prebaked body', () => {
    const feature: DocsMeshFeature = {
      featureId: 'synthetic',
      faces: boxFaces(),
      appearance: {},
    };
    const mesh = buildLiveFeature(feature);
    expect(mesh, 'live feature is not a single welded mesh').toBeInstanceOf(THREE.Mesh);
    const edges = edgeChild(mesh);
    expect(edges, 'live body has no edge lines').not.toBeNull();
    // The same twelve a prebaked box gets above: proof the welding lines the two
    // paths up rather than the live path drawing the full per-face wireframe.
    expect(segmentCount(edges!)).toBe(12);
  });

  it('disposeBodyTree frees every edge geometry, not just the meshes', () => {
    const root = new THREE.Group();
    root.add(buildPrebakedBody(boxBody(), undefined));
    root.add(buildLiveFeature({ featureId: 'x', faces: boxFaces(), appearance: {} }));

    // Watch the actual EdgesGeometry instances, since leaking those is the
    // failure this guards: three fires a 'dispose' event when dispose() runs.
    const edgeGeometries: THREE.BufferGeometry[] = [];
    root.traverse((n) => {
      if (n instanceof THREE.LineSegments) edgeGeometries.push(n.geometry);
    });
    expect(edgeGeometries.length).toBeGreaterThan(0);
    const disposed = new Set<THREE.BufferGeometry>();
    for (const g of edgeGeometries) g.addEventListener('dispose', () => disposed.add(g));

    disposeBodyTree(root);
    expect(disposed.size, 'an edge geometry was left undisposed').toBe(edgeGeometries.length);
  });

  const finishModel = path.join(MODEL_DIR, `finish-edges${DOCS_MODEL_EXT}`);
  const manifestPath = path.join(MODEL_DIR, DOCS_MODEL_MANIFEST);
  const built = existsSync(finishModel) && existsSync(manifestPath);

  it.runIf(built)('every prebaked body from the real models carries edges', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      models: { slug: string; appearances: (Record<string, unknown> | undefined)[] }[];
    };
    let bodiesChecked = 0;
    let totalSegments = 0;
    for (const model of manifest.models) {
      const file = path.join(MODEL_DIR, `${model.slug}${DOCS_MODEL_EXT}`);
      if (!existsSync(file)) continue;
      const buf = readFileSync(file);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const bodies = decodeDocsMesh(ab);
      bodies.forEach((body, i) => {
        const mesh = buildPrebakedBody(body, model.appearances[i] as never);
        const edges = edgeChild(mesh);
        // Every body gets the edge child, from the shared code. The count may be
        // zero for a legitimately smooth body — a fully-rounded box has no edge
        // above the threshold — so vacuity is guarded across the corpus below,
        // not per body.
        expect(edges, `${model.slug} body ${i} has no edge lines`).not.toBeNull();
        totalSegments += segmentCount(edges!);
        bodiesChecked++;
      });
    }
    expect(bodiesChecked, 'no prebaked bodies were checked').toBeGreaterThan(0);
    expect(totalSegments, 'the whole corpus produced no edge segments').toBeGreaterThan(0);
  });

  it('a live feature meshed through OCCT carries edges (real Run path)', async () => {
    await initOcct();
    const page = buildDocsPages().find((p) => p.slug === 'finish-edges');
    expect(page?.example, 'finish-edges example is missing').toBeTruthy();

    const result = await runScriptInBrowser({
      code: page!.example!.code,
      fileName: 'finish-edges.kcad.js',
    });
    const meshed = await meshFeaturesPerFeature(
      result.records,
      result.paramTable,
      result.session as unknown as Parameters<typeof meshFeaturesPerFeature>[2],
    );
    const drawn = selectTerminalFeatures(meshed.features).filter((f) => f.faces.length > 0);
    expect(drawn.length, 'example drew nothing').toBeGreaterThan(0);

    for (const f of drawn) {
      const feature: DocsMeshFeature = {
        featureId: f.featureId,
        faces: f.faces.map((face) => ({
          vertices: face.vertices,
          normals: face.normals,
          indices: face.indices,
        })),
        appearance: appearanceOf(f.color, f.material),
        transform: f.transform,
      };
      const mesh = buildLiveFeature(feature);
      expect(mesh, 'live feature is not a mesh').toBeInstanceOf(THREE.Mesh);
      expect(edgeChild(mesh), 'a live body has no edge lines').not.toBeNull();
    }
  }, 120_000);
});
