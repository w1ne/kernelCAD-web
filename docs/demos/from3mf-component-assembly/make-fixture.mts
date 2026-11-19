// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Repackage the kernelCAD-exported 10 mm cube as a two-instance, nested
// 3MF Core component assembly. Keeps the source OPC package and mesh intact.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { strToU8, unzipSync, zipSync } from 'fflate';

const directory = import.meta.dirname;
const sourcePath = resolve(directory, '../3mf-resource-ids/generic-cube.3mf');
const outputPath = resolve(directory, 'two-block-assembly.3mf');
const files = unzipSync(await readFile(sourcePath));
const modelPath = Object.keys(files).find((name) => name.toLowerCase() === '3d/3dmodel.model');
if (!modelPath) throw new Error('Source 3MF has no unambiguous 3D model part.');

let xml = new TextDecoder().decode(files[modelPath]);
const nestedAssembly = [
  '    <object id="3" type="model" name="two-block-subassembly">',
  '      <components>',
  '        <component objectid="1" />',
  '        <component objectid="1" transform="-1 0 0 0 1 0 0 0 1 22 0 0" />',
  '      </components>',
  '    </object>',
  '    <object id="4" type="model" name="two-block-assembly">',
  '      <components>',
  '        <component objectid="3" transform="1 0 0 0 1 0 0 0 1 3 4 0" />',
  '      </components>',
  '    </object>',
].join('\n');

if (!xml.includes('</resources>') || !xml.includes('<item objectid="1" />')) {
  throw new Error('Source 3MF does not match the expected kernelCAD cube fixture.');
}
xml = xml
  .replace('</resources>', `${nestedAssembly}\n  </resources>`)
  .replace('<item objectid="1" />', '<item objectid="4" transform="1 0 0 0 1 0 0 0 1 5 0 0" />');
files[modelPath] = strToU8(xml);
await writeFile(outputPath, zipSync(files));
console.log(`wrote ${outputPath}`);
