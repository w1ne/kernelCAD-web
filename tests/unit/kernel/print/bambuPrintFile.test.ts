// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bambu LAN printing starts from a `.gcode.3mf` project: the MQTT
// `project_file` command points at `Metadata/plate_1.gcode` inside it. The
// packer is pure (no network), so it is tested directly.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { bambuPrintFileName, buildBambuPrintFile, BAMBU_PLATE_GCODE } from '../../../../src/kernel/print/bambuPrintFile';
import { buildPrintProjectFileCommand } from '../../../../src/kernel/print/bambuUpload';

const gcode = strToU8('; kernelcad\nG28\nG1 X10 Y10\n');

describe('buildBambuPrintFile', () => {
  it('packs the G-code at the path the project_file command names, with its md5', () => {
    const files = unzipSync(buildBambuPrintFile(gcode));
    const param = (buildPrintProjectFileCommand('x.gcode.3mf').print as { param: string }).param;
    expect(param).toBe(BAMBU_PLATE_GCODE);
    expect(strFromU8(files[BAMBU_PLATE_GCODE])).toBe(strFromU8(gcode));
    expect(strFromU8(files[`${BAMBU_PLATE_GCODE}.md5`])).toBe(createHash('md5').update(gcode).digest('hex').toUpperCase());
    expect(strFromU8(files['3D/3dmodel.model'])).toContain('http://schemas.microsoft.com/3dmanufacturing/core/2015/02');
    expect(strFromU8(files['[Content_Types].xml'])).toMatch(/Extension="gcode"/);
  });

  it('keeps every part of a given model 3MF and adds the plate G-code', () => {
    const model = zipSync({
      '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" /></Types>'),
      '_rels/.rels': strToU8('<Relationships/>'),
      '3D/3dmodel.model': strToU8('<model>parts</model>'),
      'Metadata/model_settings.config': strToU8('<config/>'),
    });
    const files = unzipSync(buildBambuPrintFile(gcode, model));
    expect(strFromU8(files['3D/3dmodel.model'])).toBe('<model>parts</model>');
    expect(files['Metadata/model_settings.config']).toBeDefined();
    expect(files[BAMBU_PLATE_GCODE]).toBeDefined();
    const types = strFromU8(files['[Content_Types].xml']);
    expect(types).toMatch(/Extension="model"/);
    expect(types).toMatch(/Extension="gcode"/);
  });

  it('rejects a model file that is not a 3MF package', () => {
    expect(() => buildBambuPrintFile(gcode, strToU8('not a zip'))).toThrow(/zip/);
    expect(() => buildBambuPrintFile(gcode, zipSync({ 'a.txt': strToU8('x') }))).toThrow(/3dmodel\.model/);
  });
});

describe('bambuPrintFileName', () => {
  it('always ends the uploaded name in .3mf', () => {
    expect(bambuPrintFileName(undefined)).toBe('kernelcad.gcode.3mf');
    expect(bambuPrintFileName('part.gcode')).toBe('part.gcode.3mf');
    expect(bambuPrintFileName('part.gcode.3mf')).toBe('part.gcode.3mf');
  });
});
