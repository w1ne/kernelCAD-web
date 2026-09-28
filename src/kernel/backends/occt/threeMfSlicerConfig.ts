// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/threeMfSlicerConfig.ts
//
// Optional slicer project sidecars for the 3MF writer. They live under
// `Metadata/`, which the 3MF core spec leaves to producers, so a plain 3MF
// reader ignores them and still sees a valid model.
//
//   - 'bambu' / 'orca' (one shared format): `Metadata/model_settings.config`
//     gives each object its name and filament slot (`extruder`, 1-based),
//     each assembled part (component) its own name and slot, and puts every
//     object on plate 1. Deliberately NO `project_settings.config`: a partial
//     one (e.g. only filament colours) crashes the loader, and a full one
//     would override the user's printer/filament presets.
//   - 'prusa': `Metadata/Slic3r_PE_model.config` gives each object its name
//     and one volume per part as a triangle-index range with its own
//     extruder. Same reason for no `Slic3r_PE.config`.
//
// Filament slot N is the Nth distinct (material, colour) pair in part
// order; the core-spec `<basematerials>` carries the colour for each.

export type SlicerFlavor = 'generic' | 'bambu' | 'orca' | 'prusa';

/** One printable part as the slicer config sees it. */
export interface SlicerVolume {
  name: string;
  /** 1-based filament slot. */
  extruder: number;
  /** 'bambu'/'orca': the 3MF object id of this part's mesh object. */
  objectId: number;
  /** 'prusa': first/last triangle index of this part inside its object. */
  firstTriangle: number;
  lastTriangle: number;
}

/** One build-item object and the parts (volumes) it is made of. */
export interface SlicerObject {
  /** 3MF object id referenced by the build item. */
  id: number;
  name: string;
  volumes: SlicerVolume[];
}

const IDENTITY_4X4 = '1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1';

/** Build the `Metadata/*` files for `flavor` ('generic' → none). */
export function slicerConfigFiles(
  flavor: SlicerFlavor,
  objects: readonly SlicerObject[],
  escapeXml: (s: string) => string,
): Record<string, string> {
  if (flavor === 'bambu' || flavor === 'orca') {
    return { 'Metadata/model_settings.config': modelSettingsConfig(objects, escapeXml) };
  }
  if (flavor === 'prusa') {
    return { 'Metadata/Slic3r_PE_model.config': prusaModelConfig(objects, escapeXml) };
  }
  return {};
}

function modelSettingsConfig(
  objects: readonly SlicerObject[],
  esc: (s: string) => string,
): string {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<config>'];
  for (const o of objects) {
    lines.push(
      `  <object id="${o.id}">`,
      `    <metadata key="name" value="${esc(o.name)}"/>`,
      `    <metadata key="extruder" value="${o.volumes[0].extruder}"/>`,
    );
    // A plain mesh object is its own single part: the loader creates that
    // volume itself, so `<part>` entries are written only for component
    // objects (assembled layout), keyed by each component's object id.
    const isComponentObject = o.volumes.some((v) => v.objectId !== o.id);
    for (const v of isComponentObject ? o.volumes : []) {
      lines.push(
        `    <part id="${v.objectId}" subtype="normal_part">`,
        `      <metadata key="name" value="${esc(v.name)}"/>`,
        `      <metadata key="matrix" value="${IDENTITY_4X4}"/>`,
        `      <metadata key="extruder" value="${v.extruder}"/>`,
        `    </part>`,
      );
    }
    lines.push('  </object>');
  }
  lines.push(
    '  <plate>',
    '    <metadata key="plater_id" value="1"/>',
    '    <metadata key="plater_name" value=""/>',
    '    <metadata key="locked" value="false"/>',
  );
  for (const o of objects) {
    lines.push(
      '    <model_instance>',
      `      <metadata key="object_id" value="${o.id}"/>`,
      '      <metadata key="instance_id" value="0"/>',
      '    </model_instance>',
    );
  }
  lines.push('  </plate>', '</config>', '');
  return lines.join('\n');
}

function prusaModelConfig(
  objects: readonly SlicerObject[],
  esc: (s: string) => string,
): string {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<config>'];
  for (const o of objects) {
    lines.push(
      `  <object id="${o.id}" instances_count="1">`,
      `    <metadata type="object" key="name" value="${esc(o.name)}"/>`,
      `    <metadata type="object" key="extruder" value="${o.volumes[0].extruder}"/>`,
    );
    for (const v of o.volumes) {
      lines.push(
        `    <volume firstid="${v.firstTriangle}" lastid="${v.lastTriangle}">`,
        `      <metadata type="volume" key="name" value="${esc(v.name)}"/>`,
        `      <metadata type="volume" key="volume_type" value="ModelPart"/>`,
        `      <metadata type="volume" key="matrix" value="${IDENTITY_4X4}"/>`,
        `      <metadata type="volume" key="extruder" value="${v.extruder}"/>`,
        `    </volume>`,
      );
    }
    lines.push('  </object>');
  }
  lines.push('</config>', '');
  return lines.join('\n');
}
