// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/step-colour-space/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { importBrepBytes } from '../../../src/kernel/backends/occt/importBrep';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = 'docs/demos/step-single-body-roundtrip/motor-plate.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/step-colour-space/capture-demo.mts';
const IMPLEMENTATION_FILES = [
  'src/kernel/backends/occt/stepColour.ts',
  'src/kernel/backends/occt/stepAssemblyExport.ts',
  'src/kernel/import/stepAssemblyImport.ts',
];
const SCRIPT_COLOUR = '#3366cc';
const SCRIPT_CHANNELS = [0x33 / 255, 0x66 / 255, 0xcc / 255];
// A colour entity as another system writes it: the display channels, as given.
const FOREIGN_ENTITY = "COLOUR_RGB('',0.2,0.4,0.8)";
// Measured on develop 9b7ba3241 with the same source and the same foreign
// entity, before this change (failing run of stepColour.test.ts).
const BEFORE = {
  commit: '9b7ba3241',
  writtenChannels: [0.484529207832, 0.665185089102, 0.906331759313],
  writtenAsHex: '#7caae7',
  foreignReadAsHex: '#08229a',
};
const COLOUR_ENTITY = /COLOUR_RGB\s*\(\s*'[^']*'\s*,([^)]*)\)/;
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;
const hexOf = (channels: number[]) => `#${channels.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;

await initOcct();
const code = await readFile(SOURCE, 'utf8');

// 1. Write: the colour entity in the file holds the channels of the script colour.
const exported = await runAndExport({ code, fileName: SOURCE, format: 'step' });
assert.deepEqual(exported.diagnostics.filter((d) => d.severity === 'error'), []);
const text = new TextDecoder().decode(exported.bytes);
const entity = COLOUR_ENTITY.exec(text);
assert.ok(entity, 'the file has a colour entity');
const writtenChannels = entity[1].split(',').map(Number);
writtenChannels.forEach((value, i) => assert.ok(Math.abs(value - SCRIPT_CHANNELS[i]) < 1e-6, `written channel ${i}`));
assert.equal(hexOf(writtenChannels), SCRIPT_COLOUR, 'written colour as hex');
assert.equal(hexOf(BEFORE.writtenChannels), BEFORE.writtenAsHex, 'recorded previous colour as hex');

// 2. Read: the same file returns the script colour.
const snapshot = await importStepAssembly(exported.bytes, 'motor-plate.step');
assert.equal(snapshot.occurrences.length, 1, 'one body');
assert.equal(snapshot.occurrences[0].color?.hex, SCRIPT_COLOUR, 'round-trip colour');

// 3. Read a colour entity that states its channels directly.
const foreignText = text.replace(COLOUR_ENTITY, FOREIGN_ENTITY);
assert.ok(foreignText.includes(FOREIGN_ENTITY));
const foreign = await importStepAssembly(new TextEncoder().encode(foreignText), 'foreign.step');
assert.equal(foreign.occurrences[0].color?.hex, SCRIPT_COLOUR, 'foreign colour');

const implementation = Object.fromEntries(await Promise.all(
  IMPLEMENTATION_FILES.map(async (file) => [file, sha256(await readFile(file))] as const),
));
const evidence = {
  scope: 'Local kernelCAD Node API: STEP export of a coloured part, text check of the colour entity, and read-back through the OCCT XCAF STEP reader.',
  invocation: INVOCATION,
  source: SOURCE,
  sourceSha256: sha256(code),
  implementationSha256: implementation,
  scriptColour: SCRIPT_COLOUR,
  scriptChannels: SCRIPT_CHANNELS.map((v) => round(v)),
  write: {
    file: '../step-single-body-roundtrip/motor-plate.step',
    bytes: exported.bytes.length,
    sha256: sha256(exported.bytes),
    colourEntity: entity[0],
    channels: writtenChannels,
    asHex: hexOf(writtenChannels),
    maxChannelError: round(Math.max(...writtenChannels.map((v, i) => Math.abs(v - SCRIPT_CHANNELS[i]))), 9),
  },
  read: {
    roundTripColour: snapshot.occurrences[0].color?.hex,
    foreignEntity: FOREIGN_ENTITY,
    foreignColour: foreign.occurrences[0].color?.hex,
  },
  before: BEFORE,
  limits: [
    'Other CAD systems were not used to open the file.',
    'The values under "before" are recorded from a run on the named commit; this script does not measure them again.',
    'A project imported from STEP with an earlier kernelCAD version holds the darker colour that version read.',
  ],
  simulationRun: false,
  deployed: false,
  hardwareAccepted: false,
};
const backend = importBrepBytes(snapshot.definitions[0].brep);
try {
  const mesh = backend.getMesh();
  const geometry = { positions: Array.from(mesh.positions, (v) => round(v, 4)), indices: Array.from(mesh.indices) };
  await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify(geometry)}\n`);
} finally {
  backend.dispose();
}
await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ write: evidence.write, read: evidence.read, before: BEFORE }, null, 2));
