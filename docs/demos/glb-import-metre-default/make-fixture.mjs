// Writes the demo GLB: one 3.0 x 0.2 x 0.2 metre beam with no scene extras.
// glTF 2.0 defines these raw coordinates as metres, so the imported display
// mesh must span 3000 x 200 x 200 mm.
//
//   node docs/demos/glb-import-metre-default/make-fixture.mjs
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const here = dirname(fileURLToPath(import.meta.url));
const doc = new Document();
const buffer = doc.createBuffer();

// Eight corners of a 3 x 0.2 x 0.2 m box, two triangles per face.
const corners = [
  [0, 0, 0], [3, 0, 0], [3, 0.2, 0], [0, 0.2, 0],
  [0, 0, 0.2], [3, 0, 0.2], [3, 0.2, 0.2], [0, 0.2, 0.2],
];
const faces = [
  [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
  [0, 1, 5], [0, 5, 4], [2, 3, 7], [2, 7, 6],
  [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5],
];
const positions = new Float32Array(faces.flatMap((face) => face.flatMap((i) => corners[i])));
const accessor = doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer);
const material = doc.createMaterial('steel')
  .setBaseColorFactor([0.6, 0.62, 0.65, 1]).setMetallicFactor(0.8).setRoughnessFactor(0.35);
const primitive = doc.createPrimitive().setAttribute('POSITION', accessor).setMaterial(material);
const node = doc.createNode('beam').setMesh(doc.createMesh('beam').addPrimitive(primitive));
doc.createScene('demo').addChild(node);

const bytes = await new NodeIO().writeBinary(doc);
writeFileSync(resolve(here, 'beam.glb'), bytes);
console.log(JSON.stringify({
  file: 'beam.glb',
  bytes: bytes.byteLength,
  extras: null,
  rawSceneMetres: [3, 0.2, 0.2],
  triangles: faces.length,
}, null, 2));
