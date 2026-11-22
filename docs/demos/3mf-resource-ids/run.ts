// SPDX-License-Identifier: MIT
// A generic writer fixture: no customer geometry, OCCT meshing, or printer use.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { JSDOM } from 'jsdom';
import { export3mfAsync, type MeshedPart } from '../../../src/kernel/backends/occt/export3mf';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../..');
const invocation = 'node --import tsx docs/demos/3mf-resource-ids/run.ts';
const scope = 'Local SDK validation replay; not deployed/slicer/hardware acceptance';
const cube = {
  vertices: [0,0,0, 10,0,0, 10,10,0, 0,10,0, 0,0,10, 10,0,10, 10,10,10, 0,10,10],
  triangles: [0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 1,2,6, 1,6,5, 2,3,7, 2,7,6, 3,0,4, 3,4,7],
};
const settings = { format: '3mf' as const, printUnit: 'mm' as const, arrange: 'none' as const, slicer: 'generic' as const };
const part: MeshedPart = { name: 'generic-cube', color: '#ff0000', shape: undefined as unknown as OcctBackend, mesh: cube };
const bytes = await export3mfAsync([part], settings);
const entries = unzipSync(bytes);
const xml = strFromU8(entries['3D/3dmodel.model']);
const doc = new JSDOM(xml, { contentType: 'application/xml' }).window.document;
const ns = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const elements = (tag: string) => [...doc.getElementsByTagNameNS(ns, tag)];
const resources = [...elements('resources')[0].children];
const resourceIds = resources.map((e) => Number(e.getAttribute('id')));
assert.equal(new Set(resourceIds).size, resourceIds.length);
assert(resourceIds.every((id) => Number.isInteger(id) && id > 0 && id < 2 ** 31));
const object = elements('object')[0];
const materials = elements('basematerials')[0];
const base = elements('base')[0];
const build = elements('item')[0];
assert.equal(object.getAttribute('pid'), materials.getAttribute('id'));
assert.equal(object.getAttribute('pindex'), '0');
assert.equal(build.getAttribute('objectid'), object.getAttribute('id'));
assert.equal(base.getAttribute('displaycolor')?.toUpperCase(), '#FF0000FF');
const vertices = elements('vertex').flatMap((v) => ['x','y','z'].map((key) => Number(v.getAttribute(key))));
const triangles = elements('triangle').flatMap((t) => ['v1','v2','v3'].map((key) => Number(t.getAttribute(key))));
assert.deepEqual(vertices, cube.vertices);
assert.deepEqual(triangles, cube.triangles);
assert.equal(doc.documentElement.getAttribute('unit'), 'millimeter');
const edges = new Map<string, { count: number; winding: number }>();
for (let i = 0; i < triangles.length; i += 3) {
  const tri = triangles.slice(i, i + 3);
  for (let j = 0; j < 3; j++) {
    const a = tri[j], b = tri[(j + 1) % 3];
    const key = `${Math.min(a,b)}:${Math.max(a,b)}`;
    const edge = edges.get(key) ?? { count: 0, winding: 0 };
    edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge);
  }
}
for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, winding: 0 });
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const evidence = {
  scope, invocation, settings, generatedAt: new Date().toISOString(), nodeVersion: process.version,
  exporterSha256: sha256(readFileSync(resolve(root,'src/kernel/backends/occt/export3mf.ts'))),
  fixture: { kind: 'generic injected watertight cube', dimensionsMm: [10,10,10], vertices: 8, triangles: 12 },
  resourceIds, objectId: Number(object.getAttribute('id')), materialId: Number(materials.getAttribute('id')),
  objectMaterialId: Number(object.getAttribute('pid')), materialIndex: 0,
  buildObjectId: Number(build.getAttribute('objectid')), displayColor: base.getAttribute('displaycolor'),
  checks: { resourceIdsUnique: true, positiveIds: true, materialReferenceResolves: true, buildReferenceResolves: true, verticesUnchanged: true, trianglesUnchanged: true, closedConsistentEdges: true, unitsUnchanged: true, colorUnchanged: true },
  edgeCount: edges.size, archiveBytes: bytes.length, archiveSha256: sha256(bytes),
  acceptedInSlicer: false, deployed: false, hardwareAccepted: false,
};
const transcript = [
  `$ ${invocation}`, scope,
  'INPUT  generic 10 x 10 x 10 mm cube; injected triangle mesh',
  'INPUT  8 vertices, 12 triangles; color #FF0000FF',
  'MODE   format=3mf; printUnit=mm; arrange=none; slicer=generic',
  `WRITE  generic-cube.3mf (${bytes.length} bytes)`,
  `XML    <basematerials id="${evidence.materialId}">`,
  `XML    <object id="${evidence.objectId}" pid="${evidence.objectMaterialId}" pindex="0">`,
  `XML    <item objectid="${evidence.buildObjectId}" />`,
  `PASS   resource IDs are unique: ${resourceIds.join(', ')}`,
  'PASS   object material and build references resolve',
  'PASS   all vertex coordinates and triangle indices unchanged',
  `PASS   ${edges.size} edges: two opposite uses each; closed mesh`,
  'PASS   millimeter units and #FF0000FF color preserved',
  'RESULT local exporter validation passed',
];
writeFileSync(resolve(output,'generic-cube.3mf'), bytes);
writeFileSync(resolve(output,'3dmodel.model'), xml);
writeFileSync(resolve(output,'evidence.json'), JSON.stringify(evidence,null,2)+'\n');
writeFileSync(resolve(output,'transcript.txt'), transcript.join('\n')+'\n');
console.log(transcript.join('\n'));
