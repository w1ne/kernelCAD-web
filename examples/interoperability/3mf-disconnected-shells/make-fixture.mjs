// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Add a second outward-wound, closed shell to the cube mesh in the base 3MF.
// The result is a valid core 3MF object containing two separated solids.
// Run: node examples/interoperability/3mf-disconnected-shells/make-fixture.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync, zipSync } from 'fflate';

const source = resolve('docs/demos/3mf-resource-ids/generic-cube.3mf');
const target = resolve('examples/interoperability/3mf-disconnected-shells/two-disconnected-solids.3mf');
const parts = unzipSync(readFileSync(source));
const modelPath = Object.keys(parts).find((path) => path.toLowerCase() === '3d/3dmodel.model');
if (modelPath === undefined) throw new Error('The source 3MF has no root model part.');

const xml = new TextDecoder().decode(parts[modelPath]);
const vertices = [
  '<vertex x="20" y="0" z="0" />',
  '<vertex x="21" y="0" z="0" />',
  '<vertex x="20" y="1" z="0" />',
  '<vertex x="20" y="0" z="1" />',
].join('');
const triangles = [
  '<triangle v1="8" v2="10" v3="9" />',
  '<triangle v1="8" v2="9" v3="11" />',
  '<triangle v1="9" v2="10" v3="11" />',
  '<triangle v1="10" v2="8" v3="11" />',
].join('');

if (!xml.includes('</vertices>') || !xml.includes('</triangles>')) {
  throw new Error('The source 3MF model does not have a core mesh to extend.');
}
parts[modelPath] = new TextEncoder().encode(
  xml.replace('</vertices>', `${vertices}</vertices>`)
    .replace('</triangles>', `${triangles}</triangles>`),
);
writeFileSync(target, zipSync(parts));
