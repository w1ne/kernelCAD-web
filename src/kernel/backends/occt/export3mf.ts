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
// With `arrange`, the layout is checked against the printer bed; parts that
// do not fit are still written, and `export3mfWithReportAsync` returns them
// as bed warnings for the runtime to surface as diagnostics.
//
// Units: all layout and bed math runs in millimetres (the model and printer
// profile unit). `printUnit` only rescales the numbers at write time, so
// vertex coordinates and build-item offsets always agree with the declared
// `<model unit>`: a 10 mm cube is `1` with `unit="centimeter"`.
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
import {
  attributionGenerator,
  KERNELCAD_HOMEPAGE,
  KERNELCAD_NAME,
} from '../../../shared/links/attribution';
import {
  resolvePrinterProfile, exceedsBed, smallestFittingProfiles, type PrinterProfile,
} from '../../export/gcode/printerProfiles';
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
  /** Printer profile id (see `PRINTER_PROFILE_IDS`): the bed for `arrange`,
   *  and the `slicer` default when `slicer` is omitted. Default
   *  `generic-fdm`. An unknown id throws with the list of valid ids. */
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

/** Millimetres per document unit: written numbers are `mm / MM_PER_UNIT`. */
const MM_PER_UNIT: Record<ThreeMfUnit, number> = { mm: 1, cm: 10, in: 25.4 };

/** Slack for bed-fit comparisons (mm), so float noise never warns. */
const BED_FIT_EPS_MM = 1e-6;

type Vec3 = [number, number, number];

/** One part named in a bed warning, with its extents on the bed (mm). */
export interface ThreeMfBedPart {
  name: string;
  sizeMm: Vec3;
}

/**
 * A bed-fit problem found by `arrange`. The file is still written.
 *  - `plate-overflow` (`plate`): these parts each fit the bed, but the
 *    packed layout is larger than the bed and put them past its edge.
 *    `neededMm` is the whole layout's footprint and height.
 *  - `exceeds-bed`: these parts alone are larger than the bed in X/Y or
 *    taller than the build height. With `assembled`, `object` names the
 *    multi-part object, `neededMm` is its extents, and `parts` are the parts
 *    that stick out of the build volume.
 *  `fitsOn` names the smallest bundled profiles (ids, smallest bed first)
 *  on which the same layout would print with no bed warning.
 */
export interface ThreeMfBedWarning {
  kind: 'plate-overflow' | 'exceeds-bed';
  printer: string;
  bedMm: { x: number; y: number; z: number };
  parts: ThreeMfBedPart[];
  neededMm: Vec3;
  object?: string;
  fitsOn: string[];
}

export interface Export3mfResult {
  bytes: Uint8Array;
  bedWarnings: ThreeMfBedWarning[];
}

const ARRANGE_VALUES: readonly ThreeMfArrange[] = ['none', 'plate', 'assembled'];
const SLICER_VALUES: readonly SlicerFlavor[] = ['generic', 'bambu', 'orca', 'prusa'];

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

/** Build the 3MF bytes; see `export3mfWithReportAsync`. */
export async function export3mfAsync(
  parts: ReadonlyArray<WorldFramePart | MeshedPart>,
  options: Export3mfOptions,
): Promise<Uint8Array> {
  return (await export3mfWithReportAsync(parts, options)).bytes;
}

/**
 * Build the 3MF bytes for an array of scene parts, plus the bed warnings of
 * the `arrange` layout (always empty for `arrange: 'none'`).
 *
 * Accepts either bare `WorldFramePart`s (the writer meshes each shape via
 * `meshShapeForExport`) or `MeshedPart`s (caller has already meshed the
 * shape). The runtime wiring in `runAndExport` passes bare `WorldFramePart`s;
 * tests can inject custom meshes via the `MeshedPart` overload.
 */
export async function export3mfWithReportAsync(
  parts: ReadonlyArray<WorldFramePart | MeshedPart>,
  options: Export3mfOptions,
): Promise<Export3mfResult> {
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
  // Resolve (and so validate) the printer whenever it is named, even without
  // `arrange`: it also picks the slicer family when `slicer` is omitted.
  const printer = options.printer !== undefined ? resolvePrinterProfile(options.printer) : undefined;
  const slicer: SlicerFlavor = options.slicer ?? printer?.slicer ?? 'generic';
  if (!ARRANGE_VALUES.includes(arrange)) {
    throw new Error(`export3mfAsync: options.arrange must be one of ${ARRANGE_VALUES.join(', ')}; got '${String(arrange)}'.`);
  }
  if (!SLICER_VALUES.includes(slicer)) {
    throw new Error(`export3mfAsync: options.slicer must be one of ${SLICER_VALUES.join(', ')}; got '${String(slicer)}'.`);
  }
  if (!Object.hasOwn(MM_PER_UNIT, printUnit)) {
    throw new Error(`export3mfAsync: options.printUnit must be one of ${Object.keys(MM_PER_UNIT).join(', ')}; got '${String(printUnit)}'.`);
  }
  const mmPerUnit = MM_PER_UNIT[printUnit];
  const isoDate = new Date().toISOString().slice(0, 10);

  const { bases, partPindex, partSlot } = resolvePartMaterials(meshed);
  const baseMaterialEntries = bases
    .map((b) => `      <base name="${escapeXml(b.name)}" displaycolor="${b.hex}" />`)
    .join('\n');

  const layout = layoutParts(meshed, partPindex, partSlot, arrange, slicer, options);

  const objectEntries = [
    ...layout.meshObjects.map((o) => meshObjectXml(o, mmPerUnit)),
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
        : `    <item objectid="${b.objectId}" transform="1 0 0 0 1 0 0 0 1 ${b.translate.map((c) => fmt(c / mmPerUnit)).join(' ')}" />`,
    )
    .join('\n');

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="${PRINT_UNIT_TAG[printUnit]}" xml:lang="en-US"
       xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">${escapeXml(attributionGenerator(KERNELCAD_VERSION))}</metadata>
  <metadata name="Description">${escapeXml(`Made with ${KERNELCAD_NAME} (${KERNELCAD_HOMEPAGE})`)}</metadata>
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
  return { bytes: zipSync(files), bedWarnings: layout.bedWarnings };
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
  bedWarnings: ThreeMfBedWarning[];
}

function layoutParts(
  parts: ReadonlyArray<MeshedPart>,
  partPindex: readonly number[],
  partSlot: readonly number[],
  arrange: ThreeMfArrange,
  slicer: SlicerFlavor,
  options: Export3mfOptions,
): Layout {
  const profile = arrange === 'none' ? undefined : resolvePrinterProfile(options.printer);
  const bed = profile?.bedSizeMm;
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
    const objectSize = extents(group);
    const bedWarnings = withFitsOn(
      assembledBedWarnings(profile!, parts, moved, center, objectSize, name),
      (p) => !exceedsBed({ x: objectSize[0], y: objectSize[1], z: objectSize[2] }, p),
    );

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
        bedWarnings,
      };
    }

    const parentId = parts.length + 1;
    return {
      meshObjects: moved.map((mesh, i) => ({ id: i + 1, name: parts[i].name, mesh, pindex: partPindex[i] })),
      componentObjects: [{ id: parentId, name, componentIds: parts.map((_, i) => i + 1) }],
      buildItems: [{ objectId: parentId, translate: center }],
      slicerObjects: [{ id: parentId, name, volumes: parts.map((_, i) => volume(i, i + 1)) }],
      bedWarnings,
    };
  }

  let meshes = parts.map((p) => p.mesh);
  let translations: Array<[number, number, number] | undefined> = parts.map(() => undefined);
  const bedWarnings: ThreeMfBedWarning[] = [];
  if (arrange === 'plate' && bed) {
    meshes = meshes.map((m) => dropToPlateOrigin(options.orient ? orientLargestFlatFaceDown(m) : m));
    const bounds = meshes.map(meshBounds);
    const footprints = bounds.map((b) => ({ w: b.max[0] - b.min[0], d: b.max[1] - b.min[1] }));
    const packed = packFootprints(footprints, bed.x, bed.y, PLATE_SPACING_MM);
    const placed = packed.centers.map(([x, y]): Vec3 => [x, y, 0]);
    translations = placed;
    bedWarnings.push(...withFitsOn(
      plateBedWarnings(profile!, parts, bounds, placed, packed.layout),
      (p) => plateFits(bounds, footprints, p),
    ));
  }
  return {
    meshObjects: meshes.map((mesh, i) => ({ id: i + 1, name: parts[i].name, mesh, pindex: partPindex[i] })),
    componentObjects: [],
    buildItems: meshes.map((_, i) => ({
      objectId: i + 1,
      ...(translations[i] !== undefined ? { translate: translations[i] } : {}),
    })),
    slicerObjects: parts.map((p, i) => ({ id: i + 1, name: p.name, volumes: [volume(i, i + 1)] })),
    bedWarnings,
  };
}

function bedWarning(
  kind: ThreeMfBedWarning['kind'],
  profile: PrinterProfile,
  fields: Pick<ThreeMfBedWarning, 'parts' | 'neededMm' | 'object'>,
): ThreeMfBedWarning {
  return { kind, printer: profile.name, bedMm: { ...profile.bedSizeMm }, ...fields, fitsOn: [] };
}

/** Fill `fitsOn` with the smallest profiles that `fits` (only when warned). */
function withFitsOn(
  warnings: ThreeMfBedWarning[],
  fits: (p: PrinterProfile) => boolean,
): ThreeMfBedWarning[] {
  if (warnings.length === 0) return warnings;
  const fitsOn = smallestFittingProfiles(fits).map((p) => p.name);
  return warnings.map((w) => ({ ...w, fitsOn: [...fitsOn] }));
}

/** `plate`: whether every part fits `profile` alone and the packer, run on
 *  that bed, keeps the whole layout on it — the same test that raises the
 *  plate warnings, so a listed profile never warns. */
function plateFits(
  bounds: readonly Bounds3[],
  footprints: ReadonlyArray<{ w: number; d: number }>,
  profile: PrinterProfile,
): boolean {
  const bed = profile.bedSizeMm;
  const packed = packFootprints(footprints, bed.x, bed.y, PLATE_SPACING_MM);
  return bounds.every((b, i) => withinBed(b, [packed.centers[i][0], packed.centers[i][1], 0], bed));
}

/** `assembled`: the object prints as one, so it fits only as a whole. Names
 *  the parts (moved into bed coordinates by `center`) outside the volume. */
function assembledBedWarnings(
  profile: PrinterProfile,
  parts: ReadonlyArray<MeshedPart>,
  moved: readonly MeshData[],
  center: Vec3,
  objectSize: Vec3,
  object: string,
): ThreeMfBedWarning[] {
  const outside = moved
    .map((m, i) => ({ name: parts[i].name, b: meshBounds(m) }))
    .filter(({ b }) => !withinBed(b, center, profile.bedSizeMm))
    .map(({ name, b }) => ({ name, sizeMm: extents(b) }));
  return outside.length === 0
    ? []
    : [bedWarning('exceeds-bed', profile, { parts: outside, neededMm: objectSize, object })];
}

/** `plate`: parts larger than the bed alone, then parts that fit alone but
 *  the packer placed (at `placed`) past the bed edge. */
function plateBedWarnings(
  profile: PrinterProfile,
  parts: ReadonlyArray<MeshedPart>,
  bounds: readonly Bounds3[],
  placed: readonly Vec3[],
  layout: { w: number; d: number },
): ThreeMfBedWarning[] {
  const bed = profile.bedSizeMm;
  const sizes = bounds.map(extents);
  const tooBig = (s: Vec3) =>
    s[0] > bed.x + BED_FIT_EPS_MM || s[1] > bed.y + BED_FIT_EPS_MM || s[2] > bed.z + BED_FIT_EPS_MM;
  const all = parts.map((_, i) => i);
  const oversized = all.filter((i) => tooBig(sizes[i]));
  const offBed = all.filter((i) => !oversized.includes(i) && !withinBed(bounds[i], placed[i], bed));
  const named = (idx: number[]) => idx.map((i) => ({ name: parts[i].name, sizeMm: sizes[i] }));
  const out: ThreeMfBedWarning[] = [];
  if (oversized.length > 0) {
    const neededMm = [0, 1, 2].map((a) => Math.max(...oversized.map((i) => sizes[i][a]))) as Vec3;
    out.push(bedWarning('exceeds-bed', profile, { parts: named(oversized), neededMm }));
  }
  if (offBed.length > 0) {
    const neededMm: Vec3 = [layout.w, layout.d, Math.max(...sizes.map((s) => s[2]))];
    out.push(bedWarning('plate-overflow', profile, { parts: named(offBed), neededMm }));
  }
  return out;
}

function extents(b: Bounds3): Vec3 {
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
}

/** Whether mesh bounds `b`, moved by `offset`, lie inside the build volume. */
function withinBed(
  b: Bounds3,
  offset: readonly number[],
  bed: { x: number; y: number; z: number },
): boolean {
  const size = [bed.x, bed.y, bed.z];
  for (let a = 0; a < 3; a++) {
    if (b.min[a] + offset[a] < -BED_FIT_EPS_MM) return false;
    if (b.max[a] + offset[a] > size[a] + BED_FIT_EPS_MM) return false;
  }
  return true;
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

/** `<object>` XML; vertex coordinates are mm divided by `mmPerUnit`. */
function meshObjectXml(o: MeshObject, mmPerUnit: number): string {
  const verts = o.mesh.vertices;
  const vertexNodes: string[] = [];
  for (let v = 0; v < verts.length; v += 3) {
    vertexNodes.push(
      `        <vertex x="${verts[v] / mmPerUnit}" y="${verts[v + 1] / mmPerUnit}" z="${verts[v + 2] / mmPerUnit}" />`,
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
