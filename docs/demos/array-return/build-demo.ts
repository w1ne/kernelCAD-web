// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from '../../../src/composition/buildModel';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';

const dir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(dir, 'return-multipart.kcad.ts');
const code = await readFile(sourcePath, 'utf8');
const model = await buildModel({ code, fileName: sourcePath });
if (!isSceneBackend(model.rootShape)) throw new Error('Array return did not lower to a SceneBackend');
const viewerMeshes = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
if (viewerMeshes.failedFeatureIds.length > 0) throw new Error('Viewer meshing failed for one or more features');
const sceneMeshes = viewerMeshes.features.filter(feature => feature.assemblyFeatureId === model.rootId);

const parts = model.rootShape.parts.map(part => {
  if (!(part.shape instanceof OcctBackend)) throw new Error(`Part ${part.name} did not lower to OCCT`);
  const mesh = sceneMeshes.find(feature => feature.assemblyPartName === part.name);
  if (!mesh || mesh.faces.length === 0) throw new Error(`Part ${part.name} did not produce a viewer mesh`);
  return {
    name: part.name,
    volumeMm3: part.shape.volume(),
    bounds: part.shape.boundingBox(),
    faces: mesh.faces,
  };
});
if (parts.length !== 2 || parts.some(part => part.volumeMm3 <= 0)) {
  throw new Error('Expected two non-empty bodies from the array-return Scene');
}

const verification = {
  provenance: 'Local buildModel + OCCT display mesh; not a deployed UI or hardware acceptance test.',
  rootKind: 'SceneBackend',
  rootId: model.rootId,
  bodyCount: parts.length,
  parts: parts.map(({ name, volumeMm3, bounds }) => ({ name, volumeMm3, bounds })),
};
await writeFile(resolve(dir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

const colors = ['#55b8f2', '#ffb454'];
type Point = readonly [number, number, number];
const triangles: { points: [Point, Point, Point]; depth: number; color: string }[] = [];
const project = ([x, y, z]: Point): [number, number] => [x - y, (x + y) * 0.48 - z];
for (const [partIndex, part] of parts.entries()) {
  const color = colors[partIndex % colors.length]!;
  for (const face of part.faces) {
    for (let i = 0; i + 2 < face.indices.length; i += 3) {
      const points = [0, 1, 2].map(offset => {
        const vertex = face.indices[i + offset]! * 3;
        return [face.vertices[vertex]!, face.vertices[vertex + 1]!, face.vertices[vertex + 2]!] as const;
      }) as [Point, Point, Point];
      triangles.push({
        points,
        depth: points.reduce((sum, [x, y, z]) => sum + x + y + z, 0) / 3,
        color,
      });
    }
  }
}
triangles.sort((a, b) => a.depth - b.depth);
const projected = triangles.flatMap(triangle => triangle.points.map(project));
const minX = Math.min(...projected.map(point => point[0]));
const maxX = Math.max(...projected.map(point => point[0]));
const minY = Math.min(...projected.map(point => point[1]));
const maxY = Math.max(...projected.map(point => point[1]));
const scale = Math.min(520 / Math.max(maxX - minX, 1), 350 / Math.max(maxY - minY, 1));
const screen = (point: Point): [number, number] => {
  const [x, y] = project(point);
  return [902 + (x - (minX + maxX) / 2) * scale, 362 - (y - (minY + maxY) / 2) * scale];
};
const polygonMarkup = triangles.map(({ points, color }) => {
  const coords = points.map(point => screen(point).map(value => value.toFixed(1)).join(',')).join(' ');
  return `<polygon points="${coords}" fill="${color}" fill-opacity=".9" stroke="#10243a" stroke-opacity=".38" stroke-width=".7"/>`;
}).join('\n');
const sourceLines = code.trim().split('\n').map((line, index) =>
  `<text x="64" y="${276 + index * 28}" class="code"><tspan class="line">${index + 1}</tspan>${escapeXml(line)}</text>`,
).join('\n');
const partRows = verification.parts.map((part, index) =>
  `<text x="730" y="${550 + index * 28}" class="part"><tspan fill="${colors[index % colors.length]}">●</tspan> ${escapeXml(part.name)} <tspan class="muted">${part.volumeMm3.toFixed(0)} mm³</tspan></text>`,
).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#101d30"/><stop offset="1" stop-color="#17263a"/></linearGradient></defs>
<rect width="1280" height="720" fill="url(#bg)"/>
<text x="54" y="66" class="title">Array return keeps every solid</text>
<text x="56" y="104" class="sub">One script return → a named multi-part Scene → both bodies reach the viewer/export path</text>
<rect x="42" y="150" width="560" height="492" rx="18" fill="#0b1524" stroke="#31455f"/>
<text x="66" y="193" class="label">MODEL SOURCE</text>
${sourceLines}
<line x1="66" y1="394" x2="576" y2="394" stroke="#31455f"/>
<text x="66" y="430" class="label">LOCAL VERIFICATION</text>
<text x="66" y="468" class="stat">✓ SceneBackend root</text>
<text x="66" y="502" class="stat">✓ 2 named, non-empty bodies</text>
<text x="66" y="536" class="stat">✓ Meshed from the lowered solids</text>
<rect x="626" y="150" width="612" height="492" rx="18" fill="#0b1524" stroke="#31455f"/>
<text x="654" y="193" class="label">LOWERED RESULT · ISOMETRIC MESH</text>
<ellipse cx="902" cy="506" rx="246" ry="25" fill="#050b13" opacity=".52"/>
${polygonMarkup}
<line x1="654" y1="526" x2="1210" y2="526" stroke="#31455f"/>
${partRows}
<text x="55" y="687" class="foot">LOCAL BUILD + MESH VALIDATION · replayed evidence, not deployed behavior or hardware acceptance</text>
<style>.title{font:700 34px -apple-system,BlinkMacSystemFont,sans-serif;fill:#f3f7fb}.sub{font:17px -apple-system,BlinkMacSystemFont,sans-serif;fill:#a8bbd0}.label{font:700 13px -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:1.4px;fill:#91a8c2}.code{font:18px SFMono-Regular,Menlo,monospace;fill:#e2edf8}.line{fill:#7186a0;display:inline-block;width:34px}.stat{font:18px -apple-system,BlinkMacSystemFont,sans-serif;fill:#86e1b2}.part{font:17px -apple-system,BlinkMacSystemFont,sans-serif;fill:#e6eef8}.muted{fill:#9db1c8;font-size:14px}.foot{font:13px -apple-system,BlinkMacSystemFont,sans-serif;fill:#91a8c2;letter-spacing:.25px}</style>
</svg>`;
await writeFile(resolve(dir, 'demo.svg'), svg);
console.log(JSON.stringify(verification, null, 2));

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
