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
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import type { PBRMaterial } from '../../../shared/intent/material';
import {
  meshShapeForExport,
} from './occtBackend';
import { resolveColor } from '../../../shared/render/palette';
import type { MeshData } from './exportStlBinary';
import type { WorldFramePart } from './sceneToWorldFrame';
import { computeProjectedUVs } from '../../../shared/intent/textureProjection';
import { resolveAndLoadTextureBytes } from '../../../shared/textures';
import { attributionGenerator } from '../../../shared/links/attribution';
import { createMaterialNameRegistry } from '../../export/materialNaming';
import {
  createPaletteCollector,
  flatColoredGeometry,
  lowPolyDeflection,
  measureMeshes,
  needsOwnMaterial,
  paletteMaterial,
  type GlbStats,
  type LowPolyGlbOptions,
} from '../../export/lowPolyGlb';
import {
  buildRigTree,
  invertRigidMatrix,
  rigMetadataFromTree,
  type RigNode,
  type SolvedRigAssembly,
} from '../../export/rigHierarchy';

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
  /** Preserve solved mate pivots, or retain the historical flat node list. */
  hierarchy?: 'rig' | 'flat';
  /** Axis convention. `y-up` (default, glTF convention) applies a -PI/2
   *  rotation about X at the scene root so viewers render the CAD body
   *  upright. `z-up` preserves kernelCAD's native orientation. */
  axis?: 'y-up' | 'z-up';
  /** Reserved for a future slice; runtime throws when `true` today. */
  draco?: false;
  /** `pbr` (default): smooth export-grade mesh, one PBR material per finish.
   *  `lowpoly`: coarse faceted mesh with flat normals; every opaque part
   *  carries its colour in `COLOR_0` and shares one material, so assets
   *  merge into one draw call. Glass/translucent parts keep their own. */
  style?: 'pbr' | 'lowpoly';
  /** Tessellation and triangle budget for `style: 'lowpoly'`. */
  lowpoly?: LowPolyGlbOptions;
  /** Length unit of the written file. Default `mm` for `pbr` (historical)
   *  and `m` for `lowpoly` (glTF's unit; game engines expect metres). */
  units?: 'mm' | 'm';
  /** Directory relative-path texture refs resolve against. Mirrors
   *  `referenceImage()` / material texture-loading convention. Only needed
   *  when a part carries `material.textureProjection` with a relative
   *  `textures.albedo.path`. */
  scriptDir?: string;
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
  solvedAssembly?: SolvedRigAssembly,
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

  const { meshed, layout, stats } = meshPartsForGlb(parts, options);
  const rigTree = options.hierarchy !== 'flat' && solvedAssembly !== undefined && solvedAssembly.mates.length > 0
    ? buildRigTree(solvedAssembly)
    : undefined;
  const { scene, wrappedParts, palette } = createExportScene(meshed, layout, rigTree, solvedAssembly);

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
  //
  // `asset.generator` names kernelCAD (see shared/links/attribution.ts). It is
  // written last, after the texture post-process, because glTF-Transform
  // stamps its own generator when it rewrites the file.
  let out: Uint8Array = new Uint8Array(buffer);
  if (wrappedParts.length > 0) {
    out = await embedWrappedTextures(out, meshed, wrappedParts, options.scriptDir);
  }

  const kernelcadExtras: Record<string, unknown> = {
    version: KERNELCAD_VERSION,
    isoDate,
    axisConvention: layout.axis,
    units: layout.units,
    style: layout.style,
    stats,
  };
  if (palette !== undefined) kernelcadExtras.palette = palette;
  if (rigTree !== undefined) {
    const metadata = rigMetadataFromTree(rigTree);
    kernelcadExtras.rig = metadata.rig;
    kernelcadExtras.rigWarnings = metadata.warnings;
  }
  return injectAssetExtras(out, { kernelcad: kernelcadExtras }, attributionGenerator(KERNELCAD_VERSION));
}

/** Mesh every part (coarse for `lowpoly`), resolve the file layout, measure
 *  it, and enforce the low-poly triangle budget before anything is written. */
function meshPartsForGlb(
  parts: ReadonlyArray<WorldFramePart | MeshedGlbPart>,
  options: ExportGlbOptions,
): { meshed: MeshedGlbPart[]; layout: ExportSceneLayout; stats: GlbStats } {
  const style = options.style ?? 'pbr';
  const deflection = style === 'lowpoly' ? lowPolyDeflection(options.lowpoly) : undefined;
  const meshed = parts.map((p): MeshedGlbPart =>
    hasMesh(p)
      ? p
      : { ...p, mesh: meshShapeForExport(p.shape.getReplicadShape(), deflection) },
  );
  const layout: ExportSceneLayout = {
    axis: options.axis ?? 'y-up',
    units: options.units ?? (style === 'lowpoly' ? 'm' : 'mm'),
    style,
  };
  const stats = measureMeshes(meshed.map((p) => p.mesh), layout.axis);
  const maxTriangles = options.lowpoly?.maxTriangles;
  if (maxTriangles !== undefined && stats.triangles > maxTriangles) {
    throw new Error(
      `export.glb.triangle-budget: ${stats.triangles} triangles exceeds lowpoly.maxTriangles ${maxTriangles}.`,
    );
  }
  return { meshed, layout, stats };
}

interface ExportSceneContext {
  readonly root: THREE.Group;
  readonly rigTree: readonly RigNode[] | undefined;
  readonly rigPartNodes: Map<string, THREE.Group> | undefined;
  readonly solvedAssembly: SolvedRigAssembly | undefined;
  readonly wrappedParts: Array<{ name: string; projection: NonNullable<PBRMaterial['textureProjection']> }>;
  readonly materialNames: ReturnType<typeof createMaterialNameRegistry>;
  readonly materialsByKey: Map<string, THREE.Material>;
  /** Present for `style: 'lowpoly'`. */
  readonly lowPoly: {
    readonly material: THREE.MeshStandardMaterial;
    readonly palette: ReturnType<typeof createPaletteCollector>;
  } | undefined;
}

interface ExportSceneLayout {
  readonly axis: 'y-up' | 'z-up';
  readonly units: 'mm' | 'm';
  readonly style: 'pbr' | 'lowpoly';
}

function createExportScene(
  meshed: ReadonlyArray<MeshedGlbPart>,
  layout: ExportSceneLayout,
  rigTree: RigNode[] | undefined,
  solvedAssembly: SolvedRigAssembly | undefined,
): {
  scene: THREE.Scene;
  wrappedParts: ExportSceneContext['wrappedParts'];
  palette: ReturnType<ReturnType<typeof createPaletteCollector>['zones']> | undefined;
} {
  const root = new THREE.Group();
  if (layout.axis === 'y-up') {
    // kernelCAD world is Z-up; glTF default is Y-up. Rotate the scene root
    // -PI/2 about X so +Z becomes +Y in viewer space.
    root.rotateX(-Math.PI / 2);
  }
  // kernelCAD models in millimetres; a metre file scales at the root so rig
  // pivots and part transforms below keep their authored values.
  if (layout.units === 'm') root.scale.setScalar(0.001);
  const rigPartNodes = rigTree === undefined ? undefined : createRigGroups(rigTree, root);
  const context: ExportSceneContext = {
    root,
    rigTree,
    rigPartNodes,
    solvedAssembly,
    wrappedParts: [],
    materialNames: createMaterialNameRegistry(),
    materialsByKey: new Map(),
    lowPoly: layout.style === 'lowpoly'
      ? { material: paletteMaterial(), palette: createPaletteCollector() }
      : undefined,
  };
  meshed.forEach((part, index) => addPartToExportScene(part, index, context));

  const scene = new THREE.Scene();
  scene.add(root);
  return { scene, wrappedParts: context.wrappedParts, palette: context.lowPoly?.palette.zones() };
}

function addPartToExportScene(
  part: MeshedGlbPart,
  index: number,
  context: ExportSceneContext,
): void {
  const resolved = context.materialNames.resolve({
    pbr: part.material,
    colorParamName: part.colorParamName,
    partName: part.name,
    materialIndex: index,
    color: part.color,
  });
  const lowPoly = context.lowPoly;
  let mesh: THREE.Mesh;
  if (lowPoly === undefined) {
    const geom = createPartGeometry(part, context.wrappedParts);
    mesh = new THREE.Mesh(geom, getExportMaterial(resolved.key, resolved.name, part, context));
  } else {
    const color = buildMaterial(part.material, part.color, resolved.name).color;
    lowPoly.palette.add(resolved.name, color, part.name);
    const geom = flatColoredGeometry(part.mesh, needsOwnMaterial(part.material) ? new THREE.Color(1, 1, 1) : color);
    const material = needsOwnMaterial(part.material)
      ? getExportMaterial(resolved.key, resolved.name, part, context)
      : lowPoly.material;
    mesh = new THREE.Mesh(geom, material);
  }
  mesh.name = part.name;
  attachPartMesh(mesh, part, context);
}

function createPartGeometry(
  part: MeshedGlbPart,
  wrappedParts: ExportSceneContext['wrappedParts'],
): THREE.BufferGeometry {
  // Projected UVs are serialized with the mesh; Node image bytes are embedded
  // later by the glTF-Transform post-process because GLTFExporter needs Canvas.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.mesh.vertices, 3));
  geometry.setIndex(Array.from(part.mesh.triangles));
  geometry.computeVertexNormals();
  const projection = part.material?.textureProjection;
  if (projection !== undefined && part.material?.textures?.albedo !== undefined) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(computeProjectedUVs(part.mesh.vertices, projection), 2));
    wrappedParts.push({ name: part.name, projection });
  }
  return geometry;
}

function getExportMaterial(
  key: string,
  name: string,
  part: MeshedGlbPart,
  context: ExportSceneContext,
): THREE.Material {
  let material = context.materialsByKey.get(key);
  if (material === undefined) {
    material = buildMaterial(part.material, part.color, name);
    context.materialsByKey.set(key, material);
  }
  return material;
}

function attachPartMesh(
  mesh: THREE.Mesh,
  part: MeshedGlbPart,
  context: ExportSceneContext,
): void {
  if (context.rigTree === undefined || context.rigPartNodes === undefined) {
    context.root.add(mesh);
    return;
  }
  const partNode = context.rigPartNodes.get(part.name);
  const worldTransform = part.worldTransform
    ?? context.solvedAssembly?.parts.find((item) => item.name === part.name)?.worldTransform;
  if (partNode === undefined || worldTransform === undefined) {
    throw new Error(`exportGlbAsync: rig hierarchy has no solved part transform for '${part.name}'.`);
  }
  mesh.matrixAutoUpdate = false;
  mesh.matrix.fromArray(invertRigidMatrix(worldTransform) as number[]);
  partNode.add(mesh);
}

function createRigGroups(nodes: readonly RigNode[], root: THREE.Group): Map<string, THREE.Group> {
  const partNodes = new Map<string, THREE.Group>();
  const add = (node: RigNode, parent: THREE.Group): void => {
    const group = new THREE.Group();
    group.name = node.kind === 'part' ? `part:${node.name}` : node.name;
    group.matrixAutoUpdate = false;
    group.matrix.fromArray(node.matrix as number[]);
    parent.add(group);
    if (node.kind === 'part') partNodes.set(node.name, group);
    node.children.forEach((child) => add(child, group));
  };
  nodes.forEach((node) => add(node, root));
  return partNodes;
}

/**
 * Post-process a written GLB to embed the real texture image for each part
 * that called `.wrapTexture()`. GLTFExporter (three-stdlib) has no Node
 * image-encoding path (it expects a browser Canvas for `.map` textures), so
 * the image is embedded here instead: load the referenced image bytes
 * (`resolveAndLoadTextureBytes`, same loader `.material({textures})` uses),
 * add it as a glTF image + texture, and point the matching mesh primitive's
 * `baseColorTexture` at it. The `TEXCOORD_0` accessor is already present
 * (written by GLTFExporter from the `uv` BufferAttribute set above) — this
 * step only adds the image + material texture reference.
 */
async function embedWrappedTextures(
  glb: Uint8Array,
  meshed: ReadonlyArray<MeshedGlbPart>,
  wrappedParts: ReadonlyArray<{ name: string }>,
  scriptDir: string | undefined,
): Promise<Uint8Array> {
  const io = new NodeIO();
  const doc: Document = await io.readBinary(glb);
  const root = doc.getRoot();
  const wrappedNames = new Set(wrappedParts.map((w) => w.name));

  // GLTFExporter (three-stdlib) names the glTF NODE after the THREE.Object3D
  // (`mesh.name = p.name` above), not the glTF MESH — meshes come out
  // unnamed. Match on node name and follow node → mesh.
  for (const node of root.listNodes()) {
    const name = node.getName();
    if (!wrappedNames.has(name)) continue;
    const mesh = node.getMesh();
    if (mesh === null) continue;
    const part = meshed.find((p) => p.name === name);
    const albedoRef = part?.material?.textures?.albedo;
    if (albedoRef === undefined) continue;

    const loaded = await resolveAndLoadTextureBytes(albedoRef, scriptDir);
    // glTF images must be PNG or JPEG; transcode webp via sharp.
    const isPngOrJpeg = loaded.contentType === 'image/png' || loaded.contentType === 'image/jpeg';
    const pngBuffer = isPngOrJpeg ? loaded.buffer : await sharp(loaded.buffer).png().toBuffer();
    const mimeType = isPngOrJpeg ? loaded.contentType : 'image/png';

    const image = doc.createTexture(name).setImage(new Uint8Array(pngBuffer)).setMimeType(mimeType);

    for (const prim of mesh.listPrimitives()) {
      let material = prim.getMaterial();
      if (material === null) {
        material = doc.createMaterial(`${name}-material`);
        prim.setMaterial(material);
      }
      material.setBaseColorTexture(image);
    }
  }

  return await io.writeBinary(doc);
}

/**
 * Replace the JSON chunk of a GLB so that `asset.extras` carries the
 * supplied object and, when given, `asset.generator` is `generator`. GLB layout: [12-byte header][JSON chunk][BIN chunk].
 * Each chunk has an 8-byte header (length + type). The JSON chunk is
 * padded with 0x20 (space) to a 4-byte boundary; the BIN chunk is padded
 * with 0x00. We re-pad both as needed and rewrite the file-length field
 * in the GLB header.
 */
function injectAssetExtras(
  bytes: Uint8Array,
  extras: Record<string, unknown>,
  generator?: string,
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
  if (generator !== undefined) json.asset.generator = generator;

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
  name: string,
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial();
  mat.name = name;
  applyBaseColor(mat, pbr, color);
  if (pbr === undefined) return mat;

  applySurfaceFields(mat, pbr);
  applyOpticalFields(mat, pbr);
  return mat;
}

function applyBaseColor(
  mat: THREE.MeshPhysicalMaterial,
  pbr: PBRMaterial | undefined,
  color: string | undefined,
): void {
  const authored = pbr?.baseColor ?? color;
  // Role tokens ('plate', 'servo', …) are authoring intent, not CSS colour
  // names — resolve them through the shared ROLE_PALETTE first. Handing a
  // token straight to THREE.Color logs "Unknown color plate" and silently
  // leaves the material white, which the exporter then omits entirely
  // (baseColorFactor [1,1,1,1] is the glTF default).
  const baseColor = resolveColor(authored) ?? authored ?? '#cccccc';
  try {
    mat.color = new THREE.Color(baseColor);
  } catch {
    mat.color = new THREE.Color('#cccccc');
  }
}

function applySurfaceFields(mat: THREE.MeshPhysicalMaterial, pbr: PBRMaterial): void {
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
}

function applyOpticalFields(mat: THREE.MeshPhysicalMaterial, pbr: PBRMaterial): void {
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
}
