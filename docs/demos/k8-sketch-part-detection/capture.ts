// Local, deterministic demo replay. The model response is fixture data.
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { traceFromImage } from '../../../src/agent/vision';
import type { Vec2Normalized } from '../../../src/agent/vision';

const execFileAsync = promisify(execFile);
const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '../../..');
const fixture = JSON.parse(await readFile(join(root, 'tests/fixtures/vision/argon-grow-parts-response.json'), 'utf8')) as { parts: unknown[] };
const inputSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#f5eedc"/><path d="M120 90 Q480 35 840 90 L840 450 Q480 500 120 450 Z" fill="none" stroke="#333" stroke-width="8"/><g fill="none" stroke="#555" stroke-width="4"><rect x="270" y="150" width="205" height="90"/><rect x="520" y="150" width="135" height="70"/><rect x="270" y="300" width="250" height="90"/><rect x="550" y="300" width="150" height="90"/></g><g fill="#333" font-family="sans-serif" font-size="20"><text x="315" y="210">ESP32 DevKitC</text><text x="540" y="195">2 × A4988</text><text x="310" y="350">2 × NEMA17</text><text x="570" y="350">SG90 pen lift</text><text x="700" y="415">12V DC jack</text></g></svg>`;
const sketchPath = join(dir, 'sketch.png');
await sharp(Buffer.from(inputSvg)).png().toFile(sketchPath);
const sketchBase64 = (await readFile(sketchPath)).toString('base64');
const outline: Vec2Normalized[] = [[0.12, 0.1], [0.88, 0.1], [0.88, 0.9], [0.12, 0.9]];
const result = await traceFromImage({ imageUrl: sketchPath, backend: 'opencv', detectParts: true, hint: 'electronics device napkin sketch' }, {
  extractSilhouettePolyline: async () => outline,
  visionClient: { generate: async () => ({ text: JSON.stringify(fixture), tokensIn: 0, tokensOut: 0 }) },
});
await writeFile(join(dir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);

const partOverlays = (result.detectedParts ?? []).map((part) => {
  const [rawX1, rawY1, rawX2, rawY2] = part.bbox;
  const [x1, y1, x2, y2] = part.coordinateFrame === 'outline'
    ? [0.12 + rawX1 * 0.76, 0.1 + rawY1 * 0.8, 0.12 + rawX2 * 0.76, 0.1 + rawY2 * 0.8]
    : [rawX1, rawY1, rawX2, rawY2];
  const x = 95 + x1 * 480, y = 164 + y1 * 270, width = (x2 - x1) * 480, height = (y2 - y1) * 270;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#ef6548" stroke-width="4"/><text x="${x}" y="${Math.max(35, y - 8)}" fill="#b52f20" font-size="18" font-family="sans-serif">${escapeXml(part.name)} ×${part.quantity}</text>`;
}).join('');
const bom = (result.draftBom ?? []).map((row, i) => `<text x="695" y="178" font-family="sans-serif" font-size="20" fill="#243246" transform="translate(0 ${i * 56})">${i + 1}. ${escapeXml(row.partName)}  ×${row.qty}  (${row.confidence.toFixed(2)})</text>`).join('');
const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#fffdf7"/><text x="44" y="58" font-family="sans-serif" font-size="30" font-weight="bold" fill="#182535">trace_from_image · labeled parts + draft BOM</text><text x="44" y="94" font-family="sans-serif" font-size="16" fill="#647184">LOCAL REPLAY · MOCKED VISION RESPONSE · NOT DEPLOYED BEHAVIOR</text><image href="data:image/png;base64,${sketchBase64}" x="35" y="130" width="600" height="338"/><rect x="665" y="125" width="565" height="340" rx="14" fill="#f2f5f8"/>${bom}${partOverlays}<text x="44" y="535" font-family="sans-serif" font-size="19" fill="#334155">Outline preserved · ${result.features[0]?.waypoints.length ?? 0} normalized points</text><text x="44" y="575" font-family="sans-serif" font-size="16" fill="#647184">Part boxes and centers are normalized to the outline bounds; confidence is model-reported.</text><text x="44" y="615" font-family="sans-serif" font-size="16" fill="#647184">Catalog candidates are tentative. Unmatched labels remain for review.</text></svg>`;
await sharp(Buffer.from(frameSvg), { density: 144 }).png().toFile(join(dir, 'result-frame.png'));
await execFileAsync('/opt/homebrew/bin/ffmpeg', ['-y', '-loop', '1', '-i', join(dir, 'result-frame.png'), '-t', '6', '-r', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(dir, 'demo.mp4')]);
console.log(JSON.stringify({ ok: result.ok, parts: result.detectedParts?.length, bom: result.draftBom?.length, video: join(dir, 'demo.mp4') }));

function escapeXml(value: string): string { return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!); }
