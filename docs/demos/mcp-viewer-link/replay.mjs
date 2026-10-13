// Render the actual captured MCP results and viewer meshes into a readable
// eight-second evidence replay. This is not a browser recording or deployment.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
const directory = new URL('.', import.meta.url);
const first = JSON.parse(await readFile(new URL('first.json', directory)));
const second = JSON.parse(await readFile(new URL('second.json', directory)));
if (first.result.viewerUrl !== second.result.viewerUrl) throw new Error('Different links');
if (first.mesh.features.at(-1).volume !== 6000 || second.mesh.features.at(-1).volume !== 12000) throw new Error('Unexpected geometry');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const [label, packet, width] of [['first', first, 20], ['second', second, 40]]) {
  const polygons = [];
  for (const face of packet.mesh.features.at(-1).faces) {
    const vertices = face.vertices;
    for (let i = 0; i < face.indices.length; i += 3) {
      const points = face.indices.slice(i, i + 3).map(index => vertices.slice(index * 3, index * 3 + 3));
      const projected = points.map(([x, y, z]) => [980 + 7 * ((x - width / 2) - (y - 15)) * 0.866, 325 + 7 * (0.5 * ((x - width / 2) + (y - 15)) - (z - 5))]);
      const top = points.every(point => Math.abs(point[2] - 10) < 0.001);
      polygons.push({ depth: points.reduce((sum, [x, y, z]) => sum + x + y + z, 0), svg: `<polygon points="${projected.map(point => point.join(',')).join(' ')}" fill="${top ? '#decbaa' : '#9faeba'}" stroke="#19242e" stroke-width="1"/>` });
    }
  }
  polygons.sort((a, b) => a.depth - b.depth);
  const title = label === 'first' ? 'First full build returns a live Studio link' : 'Later source edit updates the same Studio link';
  const lines = label === 'first' ? ['evaluate_script({ code })', '', "const width = param('width', 20);", 'return box(width, 30, 10);', '', 'ok: true', 'featureCount: 1', 'viewerUrl: returned on this first build'] : ['set_param({', "  param_name: 'width',", '  new_value: 40', '})', '', 'ok: true', 'viewerUrl: identical to first build', 'source: width 40'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#111b27"/><text x="40" y="54" fill="#ffffff" font-family="sans-serif" font-size="30">${title}</text><text x="40" y="91" fill="#9dafbf" font-family="sans-serif" font-size="18">Local validation · replay of actual stdio MCP calls and viewer endpoint responses</text><rect x="30" y="125" width="640" height="390" rx="10" fill="#1c2939"/>${lines.map((line, i) => `<text x="50" y="${164 + i * 37}" fill="#e5edf5" font-family="monospace" font-size="21">${escape(line)}</text>`).join('')}${polygons.map(polygon => polygon.svg).join('')}<text x="800" y="515" fill="#c7d6e6" font-family="sans-serif" font-size="20">Viewer mesh: ${width} × 30 × 10 mm</text><text x="800" y="548" fill="#8dd7ad" font-family="sans-serif" font-size="20">Volume: ${packet.mesh.features.at(-1).volume.toLocaleString('en-US')} mm³</text><text x="40" y="578" fill="#8dd7ad" font-family="sans-serif" font-size="19">Same process session URL:</text><text x="40" y="612" fill="#edf4fa" font-family="monospace" font-size="16">${escape(packet.result.viewerUrl)}</text><text x="40" y="674" fill="#8f9fac" font-family="sans-serif" font-size="17">Mesh replay, not a Studio screen recording. No deployed or hardware acceptance claim.</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL(`${label}.png`, directory)));
}
const settings = ['-y', '-loop', '1', '-t', '4', '-i', fileURLToPath(new URL('first.png', directory)), '-loop', '1', '-t', '4', '-i', fileURLToPath(new URL('second.png', directory)), '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]', '-map', '[v]', '-t', '8', '-r', '24', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', fileURLToPath(new URL('demo.mp4', directory))];
const encoding = spawnSync('/opt/homebrew/bin/ffmpeg', settings, { encoding: 'utf8' });
if (encoding.status !== 0) throw new Error(encoding.stderr);
await writeFile(new URL('settings.json', directory), JSON.stringify({ width: 1280, height: 720, fps: 24, durationSeconds: 8, kind: 'actual-mcp-result-and-mesh-replay', ffmpeg: settings, sameUrl: true, volumesMm3: [6000, 12000], capturedAt: [first.capturedAt, second.capturedAt] }, null, 2) + '\n');
console.log('demo.mp4: same-link replay verified, 6000 → 12000 mm³');
