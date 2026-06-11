// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/exportGlb.ts
//
// GLB writer using three.js's `GLTFExporter`. Builds a `THREE.Scene` from
// `sceneToWorldFrameParts` output (one mesh per part) and transcribes the
// `PBRMaterial` payload onto `THREE.MeshPhysicalMaterial`. The
// `KHR_materials_transmission` / `_clearcoat` / `_ior` / `_anisotropy` /
// `_sheen` / `_volume` glTF extensions are written automatically by
// GLTFExporter when the source material has the corresponding fields set.
//
// Axis convention: kernelCAD's world is Z-up (standard CAD); glTF's default
// is Y-up. With `axis: 'y-up'` (default) we apply a -PI/2 rotation about the
// X axis at the root of the scene graph so the GLB renders right-side-up in
// glTF viewers. `axis: 'z-up'` skips the rotation. The choice is recorded in
// `asset.extras.kernelcad.axisConvention` for downstream tooling.
//
// Provenance: `asset.extras.kernelcad` carries the writer's version, the
// build ISO date, and the axis convention. Embedded via the GLTFExporter's
// `extras` option (cast through `unknown` because the option's typing in
// `@types/three` does not advertise it but the exporter source reads it
// verbatim and writes it onto `asset.extras`).
//
// Draco compression is reserved but not implemented in this slice. The
// option type narrows `draco` to `false`; the runtime gate below rejects
// `draco: true` so a future slice can widen the type without changing the
// gate. The error message carries the `export.glb.draco-glass-conflict`
// code so the runtime layer can translate it into the structured
// diagnostic.

import * as THREE from 'three';
// Use the `three-stdlib` repackage of GLTFExporter rather than the JSM copy
// shipped under `three/examples/jsm/...`. The JSM copy assumes browser globals
// (`FileReader`, `Blob` shims, `URL.createObjectURL`) which vitest's Node
// environment does not provide; the `three-stdlib` build is Node-compatible
// and is already a direct dep (used by the gallery `scripts/lib/exportGlb.ts`
// utility). Per the plan note: the JSM path is the documented primary, the
// `three-stdlib` path is the documented backup; we use the backup since Node
// is the runtime.
import { GLTFExporter } from 'three-stdlib';
import { createRequire } from 'node:module';
import type { PBRMaterial } from '../../../shared/intent/material';
import {
  meshShapeForExport,
} from './occtBackend';
import type { MeshData } from './exportStlBinary';
import type { WorldFramePart } from './sceneToWorldFrame';

const requireFromHere = createRequire(import.meta.url);
// At source: src/kernel/backends/occt/exportGlb.ts → ../../../../package.json (4 up).
// At bundle: dist/cli/index.js → ../../package.json (2 up).
function loadPkg(): { version: string } {
  for (const rel of ['../../../../package.json', '../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}
const KERNELCAD_VERSION = loadPkg().version;

export interface ExportGlbOptions {
  format: 'glb';
  /** Axis convention. `y-up` (default, glTF convention) applies a -PI/2
   *  rotation about X at the scene root so viewers render the CAD body
   *  upright. `z-up` preserves kernelCAD's native orientation. */
  axis?: 'y-up' | 'z-up';
  /** Reserved for a future slice; runtime throws when `true` today. */
  draco?: false;
}

/** A world-frame part with a pre-computed triangle mesh. Used when the mesh
 *  has been computed upstream (or when a test wants to inject a custom mesh).
 *  When the input is a bare `WorldFramePart`, the writer meshes the part's
 *  shape via `meshShapeForExport`. */
export interface MeshedGlbPart extends WorldFramePart {
  readonly mesh: MeshData;
}

/**
 * Build the GLB bytes for an array of scene parts.
 *
 * Accepts either bare `WorldFramePart`s (writer meshes each shape via
 * `meshShapeForExport`) or `MeshedGlbPart`s (caller already meshed the
 * shape). The runtime wiring in `runAndExport` passes bare `WorldFramePart`s;
 * tests can inject custom meshes via the `MeshedGlbPart` overload.
 */
export async function exportGlbAsync(
  parts: ReadonlyArray<WorldFramePart | MeshedGlbPart>,
  options: ExportGlbOptions,
): Promise<Uint8Array> {
  // Runtime gate: `draco` is type-narrowed to `false`, but the gate catches
  // the case where a caller widens the type via `as unknown as ...` or a
  // future slice flips the type to optional-boolean. The error message
  // carries the diagnostic code so the runtime layer can translate it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((options as any).draco === true) {
    throw new Error(
      'export.glb.draco-glass-conflict: Draco compression is reserved but not yet implemented. Pass draco: false or omit.',
    );
  }
  if (parts.length === 0) {
    throw new Error('exportGlbAsync: no parts to write.');
  }

  const meshed: ReadonlyArray<MeshedGlbPart> = parts.map((p) =>
    hasMesh(p)
      ? p
      : { ...p, mesh: meshShapeForExport(p.shape.getReplicadShape()) },
  );

  const axis = options.axis ?? 'y-up';
  const root = new THREE.Group();
  if (axis === 'y-up') {
    // kernelCAD world is Z-up; glTF default is Y-up. Rotate the scene root
    // -PI/2 about X so +Z becomes +Y in viewer space.
    root.rotateX(-Math.PI / 2);
  }

  for (const p of meshed) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(p.mesh.vertices, 3),
    );
    geom.setIndex(Array.from(p.mesh.triangles));
    geom.computeVertexNormals();

    const mat = buildMaterial(p.material, p.color);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = p.name;
    root.add(mesh);
  }

  const scene = new THREE.Scene();
  scene.add(root);

  const exporter = new GLTFExporter();
  const isoDate = new Date().toISOString().slice(0, 10);
  const exporterOptions = {
    binary: true,
    includeCustomExtensions: true,
  } as unknown as Parameters<GLTFExporter['parse']>[3];

  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (out) => {
        if (out instanceof ArrayBuffer) {
          resolve(out);
        } else {
          reject(
            new Error('GLTFExporter returned JSON; expected ArrayBuffer (binary: true).'),
          );
        }
      },
      (err) => reject(err),
      exporterOptions,
    );
  });
  // Inject kernelCAD provenance into `asset.extras`. The three-stdlib
  // GLTFExporter does not surface an `extras` hook on the asset root, so we
  // post-process the GLB JSON chunk to add the provenance block. The
  // alternative would be a custom writer plugin, but the post-process is
  // simpler and keeps the writer's exporter usage stock.
  return injectAssetExtras(new Uint8Array(buffer), {
    kernelcad: {
      version: KERNELCAD_VERSION,
      isoDate,
      axisConvention: axis,
    },
  });
}

/**
 * Replace the JSON chunk of a GLB so that `asset.extras` carries the
 * supplied object. GLB layout: [12-byte header][JSON chunk][BIN chunk].
 * Each chunk has an 8-byte header (length + type). The JSON chunk is
 * padded with 0x20 (space) to a 4-byte boundary; the BIN chunk is padded
 * with 0x00. We re-pad both as needed and rewrite the file-length field
 * in the GLB header.
 */
function injectAssetExtras(
  bytes: Uint8Array,
  extras: Record<string, unknown>,
): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // GLB header: magic(4) + version(4) + length(4)
  const magic = view.getUint32(0, true);
  // 0x46546C67 = 'glTF' little-endian
  if (magic !== 0x46546c67) return bytes; // not a GLB; bail safely

  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== 0x4e4f534a /* JSON */) return bytes; // bail safely
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonText = new TextDecoder().decode(bytes.subarray(jsonStart, jsonEnd));
  const json = JSON.parse(jsonText) as {
    asset?: Record<string, unknown> & { extras?: Record<string, unknown> };
  };
  json.asset = json.asset ?? {};
  json.asset.extras = { ...(json.asset.extras ?? {}), ...extras };

  let newJsonBytes = new TextEncoder().encode(JSON.stringify(json));
  // Pad to 4-byte boundary with 0x20 (space).
  const pad = (4 - (newJsonBytes.byteLength % 4)) % 4;
  if (pad > 0) {
    const padded = new Uint8Array(newJsonBytes.byteLength + pad);
    padded.set(newJsonBytes, 0);
    for (let i = newJsonBytes.byteLength; i < padded.byteLength; i++) padded[i] = 0x20;
    newJsonBytes = padded;
  }

  const binChunkStart = jsonEnd;
  const binBytes = bytes.subarray(binChunkStart);

  const totalLength = 12 + 8 + newJsonBytes.byteLength + binBytes.byteLength;
  const out = new Uint8Array(totalLength);
  const outView = new DataView(out.buffer);
  // Header
  outView.setUint32(0, 0x46546c67, true); // 'glTF'
  outView.setUint32(4, 2, true); // version
  outView.setUint32(8, totalLength, true);
  // JSON chunk header
  outView.setUint32(12, newJsonBytes.byteLength, true);
  outView.setUint32(16, 0x4e4f534a, true); // 'JSON'
  out.set(newJsonBytes, 20);
  // BIN chunk (copy as-is — header + payload + any padding the original had).
  out.set(binBytes, 20 + newJsonBytes.byteLength);
  return out;
}

function hasMesh(p: WorldFramePart | MeshedGlbPart): p is MeshedGlbPart {
  const m = (p as MeshedGlbPart).mesh;
  return typeof m === 'object'
    && m !== null
    && 'triangles' in m
    && 'vertices' in m;
}

/**
 * Map a `PBRMaterial` (or legacy color token) onto a
 * `THREE.MeshPhysicalMaterial`. GLTFExporter walks the material's
 * properties and writes the corresponding `KHR_materials_*` extensions
 * automatically when fields are present.
 */
function buildMaterial(
  pbr: PBRMaterial | undefined,
  color: string | undefined,
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial();
  const baseColor = pbr?.baseColor ?? color ?? '#cccccc';
  try {
    mat.color = new THREE.Color(baseColor);
  } catch {
    mat.color = new THREE.Color('#cccccc');
  }
  if (pbr === undefined) return mat;

  if (pbr.metalness !== undefined) mat.metalness = pbr.metalness;
  if (pbr.roughness !== undefined) mat.roughness = pbr.roughness;
  if (pbr.clearcoat !== undefined) mat.clearcoat = pbr.clearcoat;
  if (pbr.clearcoatRoughness !== undefined) mat.clearcoatRoughness = pbr.clearcoatRoughness;
  if (pbr.ior !== undefined) mat.ior = pbr.ior;
  if (pbr.transmission !== undefined) {
    mat.transmission = pbr.transmission;
    if (pbr.transmission > 0) mat.transparent = true;
  }
  if (pbr.sheen !== undefined) mat.sheen = pbr.sheen;
  if (pbr.opacity !== undefined) {
    mat.opacity = pbr.opacity;
    if (pbr.opacity < 1) mat.transparent = true;
  }
  if (pbr.thickness !== undefined) mat.thickness = pbr.thickness;
  if (pbr.attenuationColor !== undefined) {
    try {
      mat.attenuationColor = new THREE.Color(pbr.attenuationColor);
    } catch {
      // ignore unknown role tokens; default white remains
    }
  }
  if (pbr.attenuationDistance !== undefined) mat.attenuationDistance = pbr.attenuationDistance;
  if (pbr.anisotropy !== undefined) mat.anisotropy = pbr.anisotropy;
  if (pbr.anisotropyRotation !== undefined) mat.anisotropyRotation = pbr.anisotropyRotation;
  return mat;
}
