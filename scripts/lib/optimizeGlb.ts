// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/optimizeGlb.ts
//
// ONE optimization path for every web-delivered GLB we publish.
//
// NAMING IS DELIBERATE: this OPTIMIZES, it does not DECIMATE. Measured on the
// 95-body spice-dispenser carousel (892 896 raw bytes):
//
//   --simplify-error  0.0005 -> 552 176 bytes
//   --simplify-error  0.001  -> 552 176 bytes
//   --simplify-error  0.002  -> 552 176 bytes
//   --simplify-error  0.005  -> 552 176 bytes
//   --simplify-error  0.01   -> 552 176 bytes
//
// Byte-identical across a 20x range, with `simplify` completing in 16 ms: the
// simplification pass is a NO-OP on our geometry. OCCT tessellates each face
// independently with hard normals, so even after welding the mesh is a set of
// topologically disconnected islands and edge-collapse has nothing to collapse
// across. The ~38% reduction comes entirely from the other optimize passes
// (dedup, prune, …), which is real and worth keeping — but do not believe a
// `--simplify-error` tweak here will buy you bytes. It will not.
//
// If you need genuinely fewer triangles, mesh coarser at the SOURCE (a web mesh
// profile threaded through MeshOptions) rather than post-processing.
//
// Both consumers (scripts/buildBoardGlbs.ts for catalog boards,
// site/scripts/build-gallery.ts for marketing gallery entries) call this. Do not
// re-implement the gltf-transform invocation anywhere else: the flags below are
// load-bearing and drifting them silently changes what users download.
//
//   --compress false          no Draco/meshopt, so no client-side decoder needed
//   --texture-compress false  our models are untextured; skip the work
//   --palette false           KEEP one material per component — palette merging
//                             would flatten the per-feature colours the models rely on

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

/** Retained at the gltf-transform default. Tuning it does nothing on OCCT
 *  per-face meshes (see the measurement table above) — kept explicit rather than
 *  implicit so the no-op is visible at the call site. */
export const DEFAULT_SIMPLIFY_ERROR = '0.0005';

/** Resolve the gltf-transform CLI binary installed as a devDependency. */
export function gltfTransformBin(repoRoot: string): string {
  const bin = join(repoRoot, 'node_modules', '.bin', 'gltf-transform');
  if (!existsSync(bin)) {
    throw new Error(
      `gltf-transform CLI not found at ${bin}. Install it: npm i -D @gltf-transform/cli`,
    );
  }
  return bin;
}

/** Read a GLB and count its distinct materials — the proxy for "colors kept".
 *  Optimization preserves one material per component (palette merging is
 *  disabled), so a multi-component model keeps multiple materials. */
export async function countMaterials(glbPath: string): Promise<number> {
  const io = new NodeIO();
  const doc = await io.read(glbPath);
  return doc.getRoot().listMaterials().length;
}

export interface OptimizeOptions {
  /** Repo root, used to locate the gltf-transform binary. */
  repoRoot: string;
  /** Passed through to gltf-transform; see DEFAULT_SIMPLIFY_ERROR. */
  simplifyError?: string;
  /** Fail if the result has fewer materials than this. Pass 0 to skip (a
   *  single-material model is legitimate; a multi-part assembly losing its
   *  colours is not). */
  minMaterials?: number;
  /** Fail if the result is >= this many bytes. Pass 0 to skip. */
  maxBytes?: number;
  /** Label used in error messages (part id, gallery slug, …). */
  label?: string;
  timeoutMs?: number;
}

export interface OptimizeResult {
  bytes: number;
  materials: number;
}

/**
 * Optimize `inPath` to `outPath`, then enforce the declared size/material gates.
 * Throws with a labelled message on violation — and, unlike the bare assert this
 * replaced, the message points at levers that actually move the number.
 */
export async function optimizeGlb(
  inPath: string,
  outPath: string,
  opts: OptimizeOptions,
): Promise<OptimizeResult> {
  const label = opts.label ?? outPath;
  const bin = gltfTransformBin(opts.repoRoot);

  execFileSync(
    bin,
    [
      'optimize',
      inPath,
      outPath,
      '--simplify-error',
      opts.simplifyError ?? DEFAULT_SIMPLIFY_ERROR,
      '--compress',
      'false',
      '--texture-compress',
      'false',
      '--palette',
      'false',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: opts.timeoutMs ?? 120_000 },
  );

  const bytes = statSync(outPath).size;
  if (opts.maxBytes && bytes >= opts.maxBytes) {
    throw new Error(
      `${label}: optimized GLB is ${(bytes / 1024).toFixed(0)} KB ` +
        `(>= ${(opts.maxBytes / 1024).toFixed(0)} KB limit). ` +
        `Note: raising --simplify-error will NOT help (no-op on OCCT per-face ` +
        `meshes). Mesh coarser at the source, or reduce the model's body count.`,
    );
  }

  const materials = await countMaterials(outPath);
  if (opts.minMaterials && materials < opts.minMaterials) {
    throw new Error(
      `${label}: optimized GLB has ${materials} material(s); ` +
        `expected >= ${opts.minMaterials} (colors lost — check --palette false).`,
    );
  }

  return { bytes, materials };
}
