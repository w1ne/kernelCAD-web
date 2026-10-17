// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Builds the demo FreeCAD document from real RP1 STEP parts. Usage:
//   npx tsx docs/demos/cad-import-freecad/make-fcstd.ts <out.FCStd> <step> [<step>...]
// Each part becomes a PartDesign::Body with its BREP and a Placement that spaces the
// parts out along X. The spacing is a demo layout, not the RP1 assembly placement.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepCached } from '../../../src/modeling/parts/stepParseCache';

const [out, ...steps] = process.argv.slice(2);
if (!out || steps.length === 0) throw new Error('usage: make-fcstd.ts <out.FCStd> <step>...');

await initOcct();
const files: Record<string, Uint8Array> = {};
let objects = '';
for (let i = 0; i < steps.length; i++) {
  const backend = await importStepCached(readFileSync(steps[i]!));
  const member = `Part${i}.brp`;
  files[member] = backend.exportBREP();
  const x = i * 260;
  objects += `<Object name="Part${i}" type="PartDesign::Body"><Properties>
    <Property name="Label" type="App::PropertyString"><String value="${basename(steps[i]!, '.STEP')}"/></Property>
    <Property name="Shape" type="Part::PropertyPartShape"><Part file="${member}"/></Property>
    <Property name="Placement" type="App::PropertyPlacement"><PropertyPlacement Px="${x}" Py="0" Pz="0" Q0="0" Q1="0" Q2="0" Q3="1"/></Property>
    </Properties></Object>\n`;
}
const xml = `<?xml version='1.0' encoding='utf-8'?>\n<Document SchemaVersion="4"><ObjectData Count="${steps.length}">\n${objects}</ObjectData></Document>`;
writeFileSync(out, zipSync({ 'Document.xml': strToU8(xml), ...files }));
console.log(`wrote ${out} with ${steps.length} bodies`);
