// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/print/bambuPrintFile.ts
//
// Bambu Lab printers start a LAN print from a sliced 3MF project, not from a
// bare .gcode file: the MQTT `project_file` command names the 3MF on the SD
// card (`url`) and the plate G-code inside it (`param:
// Metadata/plate_1.gcode`). This packs the sliced G-code into such a
// `.gcode.3mf`.
//
// When the caller has the model 3MF from `export` (format '3mf', ideally
// `slicer: 'bambu'`), the print file IS that 3MF plus the plate G-code, so
// the printer's file list shows the same named, coloured parts. Without
// one, a minimal core-3MF shell (empty resources and build) carries the
// G-code.

import { createHash } from 'node:crypto';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export const BAMBU_PLATE_GCODE = 'Metadata/plate_1.gcode';

const MINIMAL_MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources />
  <build />
</model>
`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>
`;

const GCODE_TYPES = [
  '  <Default Extension="gcode" ContentType="text/x.gcode" />',
  '  <Default Extension="md5" ContentType="text/plain" />',
];

/**
 * Build the `.gcode.3mf` a Bambu printer prints from. Throws when
 * `model3mf` is given but is not a 3MF package (no `3D/3dmodel.model`).
 */
export function buildBambuPrintFile(gcode: Uint8Array, model3mf?: Uint8Array): Uint8Array {
  let files: Record<string, Uint8Array>;
  if (model3mf !== undefined) {
    try {
      files = unzipSync(model3mf);
    } catch (e) {
      throw new Error(`model 3MF is not a zip package: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!files['3D/3dmodel.model']) {
      throw new Error('model 3MF has no 3D/3dmodel.model part.');
    }
  } else {
    files = {
      '[Content_Types].xml': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
        '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />\n' +
        '  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />\n' +
        '</Types>\n',
      ),
      '_rels/.rels': strToU8(RELS),
      '3D/3dmodel.model': strToU8(MINIMAL_MODEL),
    };
  }
  files['[Content_Types].xml'] = strToU8(withGcodeTypes(strFromU8(files['[Content_Types].xml'] ?? new Uint8Array())));
  files[BAMBU_PLATE_GCODE] = gcode;
  files[`${BAMBU_PLATE_GCODE}.md5`] = strToU8(createHash('md5').update(gcode).digest('hex').toUpperCase());
  return zipSync(files);
}

/** The uploaded print-file name: always ends in `.3mf`
 *  (`part.gcode` -> `part.gcode.3mf`). */
export function bambuPrintFileName(filename: string | undefined): string {
  const name = filename ?? 'kernelcad.gcode';
  return name.toLowerCase().endsWith('.3mf') ? name : `${name}.3mf`;
}

function withGcodeTypes(contentTypes: string): string {
  const missing = GCODE_TYPES.filter((line) => {
    const ext = /Extension="([^"]+)"/.exec(line)![1];
    return !new RegExp(`Extension="${ext}"`, 'i').test(contentTypes);
  });
  if (missing.length === 0) return contentTypes;
  if (!contentTypes.includes('</Types>')) {
    throw new Error('model 3MF has no [Content_Types].xml <Types> element.');
  }
  return contentTypes.replace('</Types>', `${missing.join('\n')}\n</Types>`);
}
