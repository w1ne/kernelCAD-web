// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/export3mf.ts
//
// Minimal 3MF (Open Packaging Convention) writer. 3MF is a zip with three
// required XML parts: `[Content_Types].xml`, `_rels/.rels`, and
// `3D/3dmodel.model`. The container is built with `fflate` (already a direct
// dep) and the XML is hand-rolled — mirroring the `exportStlBinary`
// precedent: small, format-aware, no heavy 3MF library on the dep tree.
//
// Per-part identity (name + base color) comes from `SceneBackend.parts` via
// `sceneToWorldFrameParts`. PBR is surfaced as `baseColor` only because 3MF
// has no rich PBR slot — full PBR transcription lands in the GLB writer.
// Colours are a core-spec `<basematerials>` group (one `<base>` per distinct
// material name + colour); each mesh object references its entry with
// object-level `pid`/`pindex`.
//
// Slicer-ready output (all opt-in, default output is unchanged in layout):
// `arrange` lays parts out on the bed (`threeMfPlate.ts`), `orient` puts each
// part's largest flat face down, and `slicer` adds a per-object name +
// filament-slot sidecar under `Metadata/` (`threeMfSlicerConfig.ts`).
//
// Validity gate: every part mesh is fed through `assertWatertight` before
// the zip is built. The half-edge check throws when any undirected edge is
// shared by anything other than two triangles; the runtime layer translates
// that error into the `export.3mf.not-watertight` diagnostic.

import { zipSync, strToU8 } from 'fflate';
import { createRequire } from 'node:module';
import {
  meshShapeForExport,
} from './occtBackend';
import type { MeshData } from './exportStlBinary';
import type { PBRMaterial } from '../../../shared/intent/material';
import type { WorldFramePart } from './sceneToWorldFrame';
import { assertWatertight } from './assertWatertight';
import { resolveColor } from '../../../shared/render/palette';
import { resolvePrinterProfile } from '../../export/gcode/printerProfiles';
import {
  dropToPlateOrigin,
  meshBounds,
  orientLargestFlatFaceDown,
  packFootprints,
  translateMesh,
  type Bounds3,
} from './threeMfPlate';
import {
  slicerConfigFiles,
  type SlicerFlavor,
  type SlicerObject,
  type SlicerVolume,
} from './threeMfSlicerConfig';

const requireFromHere = createRequire(import.meta.url);
// At source: src/kernel/backends/occt/export3mf.ts → ../../../../package.json (4 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
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

export type ThreeMfUnit = 'mm' | 'cm' | 'in';

/**
 * Where build items go on the print bed.
 *  - `none` (default): every part at its modelled world position (unchanged
 *    legacy output).
 *  - `plate`: one build item per part, each dropped to Z=0 (optionally
 *    re-oriented, see `orient`) and shelf-packed on the bed without overlap.
 *  - `assembled`: parts keep their relative positions as ONE multi-part
 *    object (multi-colour inlays, two-colour keycaps), dropped to Z=0 and
 *    centred on the bed.
 */
export type ThreeMfArrange = 'none' | 'plate' | 'assembled';

export type { SlicerFlavor } from './threeMfSlicerConfig';

export interface Export3mfOptions {
  format: '3mf';
  /** 3MF document unit. Default `mm`. */
  printUnit?: ThreeMfUnit;
  /** When `true`, embed the original `.kcad.ts` source as a 3MF extension
   *  file (`Metadata/source.kcad.ts`). Requires `scriptSource` to be set. */
  embedSource?: boolean;
  /** Source text to embed when `embedSource === true`. */
  scriptSource?: string;
  /** Bed layout. Default `none`. */
  arrange?: ThreeMfArrange;
  /** `arrange: 'plate'` only: rotate each part so its largest flat face it
   *  can rest on faces the bed. Default `false`. */
  orient?: boolean;
  /** Slicer project sidecar under `Metadata/` (per-object name + filament
   *  slot, plate 1). `generic` (default) writes none; `bambu` and `orca`
   *  share one format; `prusa` writes its own. The model stays core 3MF. */
  slicer?: SlicerFlavor;
  /** Bed profile for `arrange` (see `options.printer` on gcode export).
   *  Default `generic-fdm`. */
  printer?: string;
  /** Name of the multi-part object for `arrange: 'assembled'`. */
  assemblyName?: string;
}

/** A world-frame part with a pre-computed triangle mesh. Used by the runtime
 *  wiring when the mesh has been computed upstream (or when a test wants to
 *  inject a custom mesh). When the input is a bare `WorldFramePart`, the
 *  writer meshes the part's shape via `meshShapeForExport`. */
export interface MeshedPart extends WorldFramePart {
  readonly mesh: MeshData;
}

const PRINT_UNIT_TAG: Record<ThreeMfUnit, string> = {
  mm: 'millimeter',
  cm: 'centimeter',
  in: 'inch',
};

/** Gap between packed parts on the plate (mm). */
const PLATE_SPACING_MM = 5;

/** A mesh `<object>` to write: one per part, except the prusa assembled
 *  layout which concatenates all parts into one object. */
interface MeshObject {
  id: number;
  name: string;
  mesh: MeshData;
  /** basematerials index for the object (and its first part). */
  pindex: number;
  /** Per-triangle basematerials index when parts share the object. */
  trianglePindex?: number[];
}

/** A `<build><item>`: object id plus an optional XY(Z) translation. */
interface BuildItem {
  objectId: number;
  translate?: [number, number, number];
}

/**
 * Build the 3MF bytes for an array of scene parts.
 *
 * Accepts either bare `WorldFramePart`s (the writer meshes each shape via
 * `meshShapeForExport`) or `MeshedPart`s (caller has already meshed the
 * shape). The runtime wiring in `runAndExport` passes bare `WorldFramePart`s;
 * tests can inject custom meshes via the `MeshedPart` overload.
 */
export async function export3mfAsync(
  parts: ReadonlyArray<WorldFramePart | MeshedPart>,
  options: Export3mfOptions,
): Promise<Uint8Array> {
  if (parts.length === 0) {
    throw new Error('export3mfAsync: no parts to write.');
  }

  const meshed: ReadonlyArray<MeshedPart> = parts.map((p) =>
    hasMesh(p)
      ? p
      : { ...p, mesh: meshShapeForExport(p.shape.getReplicadShape()) },
  );

  for (const p of meshed) assertWatertight(p.mesh);

  const printUnit: ThreeMfUnit = options.printUnit ?? 'mm';
  const arrange: ThreeMfArrange = options.arrange ?? 'none';
  const slicer: SlicerFlavor = options.slicer ?? 'generic';
  const isoDate = new Date().toISOString().slice(0, 10);

  const { bases, partPindex, partSlot } = resolvePartMaterials(meshed);
  const baseMaterialEntries = bases
    .map((b) => `      <base name="${escapeXml(b.name)}" displaycolor="${b.hex}" />`)
    .join('\n');

  const layout = layoutParts(meshed, partPindex, partSlot, arrange, slicer, options);

  const objectEntries = [
    ...layout.meshObjects.map(meshObjectXml),
    ...layout.componentObjects.map((c) => [
      `  <object id="${c.id}" type="model" name="${escapeXml(c.name)}">`,
      `    <components>`,
      ...c.componentIds.map((id) => `      <component objectid="${id}" />`),
      `    </components>`,
      `  </object>`,
    ].join('\n')),
  ].join('\n');

  const buildItems = layout.buildItems
    .map((b) =>
      b.translate === undefined
        ? `    <item objectid="${b.objectId}" />`
        : `    <item objectid="${b.objectId}" transform="1 0 0 0 1 0 0 0 1 ${b.translate.map(fmt).join(' ')}" />`,
    )
    .join('\n');

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="${PRINT_UNIT_TAG[printUnit]}" xml:lang="en-US"
       xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">kernelcad ${KERNELCAD_VERSION}</metadata>
  <metadata name="CreationDate">${isoDate}</metadata>
  <resources>
    <basematerials id="${BASEMATERIALS_ID}">
${baseMaterialEntries}
    </basematerials>
${objectEntries}
  </resources>
  <build>
${buildItems}
  </build>
</model>
`;

  const sidecars = slicerConfigFiles(slicer, layout.slicerObjects, escapeXml);
  const hasConfig = Object.keys(sidecars).length > 0;
  const embedSource = !!(options.embedSource && options.scriptSource);
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
${embedSource ? '  <Default Extension="ts" ContentType="text/plain" />\n' : ''}${hasConfig ? '  <Default Extension="config" ContentType="application/xml" />\n' : ''}</Types>
`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel0"
                Target="/3D/3dmodel.model"
                Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>
`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(relsXml),
    '3D/3dmodel.model': strToU8(modelXml),
  };
  for (const [path, text] of Object.entries(sidecars)) files[path] = strToU8(text);
  if (embedSource) {
    files['Metadata/source.kcad.ts'] = strToU8(options.scriptSource!);
  }
  return zipSync(files);
}

const BASEMATERIALS_ID = 1;

/**
 * One `<base>` per distinct (name, colour): the name is the part's
 * engineering material when it has one (`pla`), else the part name. Filament
 * slots are the distinct (material, colour) pairs in part order, 1-based.
 */
function resolvePartMaterials(parts: ReadonlyArray<MeshedPart>): {
  bases: Array<{ name: string; hex: string }>;
  partPindex: number[];
  partSlot: number[];
} {
  const bases: Array<{ name: string; hex: string }> = [];
  const baseIndex = new Map<string, number>();
  const slotIndex = new Map<string, number>();
  const partPindex: number[] = [];
  const partSlot: number[] = [];
  for (const p of parts) {
    const hex = resolveBaseColor(p.color, p.material);
    const name = p.materialName ?? p.name;
    const baseKey = `${name}\u0000${hex}`;
    let bi = baseIndex.get(baseKey);
    if (bi === undefined) {
      bi = bases.length;
      bases.push({ name, hex });
      baseIndex.set(baseKey, bi);
    }
    partPindex.push(bi);
    const slotKey = `${p.materialName ?? ''}\u0000${hex}`;
    let slot = slotIndex.get(slotKey);
    if (slot === undefined) {
      slot = slotIndex.size + 1;
      slotIndex.set(slotKey, slot);
    }
    partSlot.push(slot);
  }
  return { bases, partPindex, partSlot };
}

interface Layout {
  meshObjects: MeshObject[];
  componentObjects: Array<{ id: number; name: string; componentIds: number[] }>;
  buildItems: BuildItem[];
  slicerObjects: SlicerObject[];
}

function layoutParts(
  parts: ReadonlyArray<MeshedPart>,
  partPindex: readonly number[],
  partSlot: readonly number[],
  arrange: ThreeMfArrange,
  slicer: SlicerFlavor,
  options: Export3mfOptions,
): Layout {
  const bed = arrange === 'none' ? undefined : resolvePrinterProfile(options.printer).bedSizeMm;
  const triCount = (m: MeshData) => m.triangles.length / 3;
  const volume = (i: number, objectId: number, first = 0): SlicerVolume => ({
    name: parts[i].name,
    extruder: partSlot[i],
    objectId,
    firstTriangle: first,
    lastTriangle: first + triCount(parts[i].mesh) - 1,
  });

  if (arrange === 'assembled' && bed) {
    const name = options.assemblyName ?? 'assembly';
    const group = mergedBounds(parts.map((p) => meshBounds(p.mesh)));
    const shift: [number, number, number] = [
      -(group.min[0] + group.max[0]) / 2,
      -(group.min[1] + group.max[1]) / 2,
      -group.min[2],
    ];
    const moved = parts.map((p) => translateMesh(p.mesh, ...shift));
    const center: [number, number, number] = [bed.x / 2, bed.y / 2, 0];

    if (slicer === 'prusa') {
      // PrusaSlicer's multi-part object is one mesh split into volumes by
      // triangle ranges; per-triangle pindex keeps each part's colour in the
      // core model too.
      const vertices: number[] = [];
      const triangles: number[] = [];
      const trianglePindex: number[] = [];
      const volumes: SlicerVolume[] = [];
      moved.forEach((m, i) => {
        const base = vertices.length / 3;
        volumes.push(volume(i, 1, triangles.length / 3));
        for (const c of m.vertices) vertices.push(c);
        for (const t of m.triangles) triangles.push(t + base);
        for (let k = 0; k < triCount(m); k++) trianglePindex.push(partPindex[i]);
      });
      return {
        meshObjects: [{ id: 1, name, mesh: { vertices, triangles }, pindex: partPindex[0], trianglePindex }],
        componentObjects: [],
        buildItems: [{ objectId: 1, translate: center }],
        slicerObjects: [{ id: 1, name, volumes }],
      };
    }

    const parentId = parts.length + 1;
    return {
      meshObjects: moved.map((mesh, i) => ({ id: i + 1, name: parts[i].name, mesh, pindex: partPindex[i] })),
      componentObjects: [{ id: parentId, name, componentIds: parts.map((_, i) => i + 1) }],
      buildItems: [{ objectId: parentId, translate: center }],
      slicerObjects: [{ id: parentId, name, volumes: parts.map((_, i) => volume(i, i + 1)) }],
    };
  }

  let meshes = parts.map((p) => p.mesh);
  let translations: Array<[number, number, number] | undefined> = parts.map(() => undefined);
  if (arrange === 'plate' && bed) {
    meshes = meshes.map((m) => dropToPlateOrigin(options.orient ? orientLargestFlatFaceDown(m) : m));
    const footprints = meshes.map((m) => {
      const b = meshBounds(m);
      return { w: b.max[0] - b.min[0], d: b.max[1] - b.min[1] };
    });
    const packed = packFootprints(footprints, bed.x, bed.y, PLATE_SPACING_MM);
    translations = packed.centers.map(([x, y]) => [x, y, 0]);
  }
  return {
    meshObjects: meshes.map((mesh, i) => ({ id: i + 1, name: parts[i].name, mesh, pindex: partPindex[i] })),
    componentObjects: [],
    buildItems: meshes.map((_, i) => ({
      objectId: i + 1,
      ...(translations[i] !== undefined ? { translate: translations[i] } : {}),
    })),
    slicerObjects: parts.map((p, i) => ({ id: i + 1, name: p.name, volumes: [volume(i, i + 1)] })),
  };
}

function mergedBounds(all: readonly Bounds3[]): Bounds3 {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of all) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], b.min[a]);
      max[a] = Math.max(max[a], b.max[a]);
    }
  }
  return { min, max };
}

function meshObjectXml(o: MeshObject): string {
  const verts = o.mesh.vertices;
  const vertexNodes: string[] = [];
  for (let v = 0; v < verts.length; v += 3) {
    vertexNodes.push(
      `        <vertex x="${verts[v]}" y="${verts[v + 1]}" z="${verts[v + 2]}" />`,
    );
  }
  const tris = o.mesh.triangles;
  const triNodes: string[] = [];
  for (let t = 0; t < tris.length; t += 3) {
    const own = o.trianglePindex?.[t / 3];
    const props = own === undefined || own === o.pindex ? '' : ` pid="${BASEMATERIALS_ID}" p1="${own}"`;
    triNodes.push(
      `        <triangle v1="${tris[t]}" v2="${tris[t + 1]}" v3="${tris[t + 2]}"${props} />`,
    );
  }
  return [
    `  <object id="${o.id}" type="model" name="${escapeXml(o.name)}" pid="${BASEMATERIALS_ID}" pindex="${o.pindex}">`,
    `    <mesh>`,
    `      <vertices>`,
    ...vertexNodes,
    `      </vertices>`,
    `      <triangles>`,
    ...triNodes,
    `      </triangles>`,
    `    </mesh>`,
    `  </object>`,
  ].join('\n');
}

/** Transform-matrix number: at most 4 decimals, no `-0`. */
function fmt(n: number): string {
  const r = Math.round(n * 1e4) / 1e4;
  return String(r === 0 ? 0 : r);
}

function hasMesh(p: WorldFramePart | MeshedPart): p is MeshedPart {
  return (
    typeof (p as MeshedPart).mesh === 'object' &&
    (p as MeshedPart).mesh !== null &&
    'triangles' in (p as MeshedPart).mesh &&
    'vertices' in (p as MeshedPart).mesh
  );
}

function escapeXml(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
}

function resolveBaseColor(
  color: string | undefined,
  material: PBRMaterial | undefined,
): string {
  // Role tokens ('plate', 'tool', ...) resolve through the shared palette,
  // so a 3MF part shows the same colour as the viewport.
  const candidate = resolveColor(material?.baseColor ?? color) ?? '#cccccc';
  // 3MF wants #RRGGBBAA. If the input is #RRGGBB, append AA=FF.
  if (/^#[0-9a-f]{6}$/i.test(candidate)) return `${candidate}FF`.toUpperCase();
  if (/^#[0-9a-f]{8}$/i.test(candidate)) return candidate.toUpperCase();
  return '#CCCCCCFF';
}
