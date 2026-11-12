import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const evidence = JSON.parse(readFileSync(join(here, 'verification.json'), 'utf8'));
const output = join(here, 'demo.mp4');
const frameDir = mkdtempSync(join(tmpdir(), 'kcad-tendon-anchor-'));
const width = 1280;
const height = 720;
const fps = 24;
const scale = 4.2;
const x0 = 500;
const y0 = 394;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function x(mm) {
  return x0 + mm * scale;
}

function panel(title, subtitle, body, badge = 'LOCAL KERNELCAD MESH CHECK · NO SIMULATION OR DEPLOYMENT CLAIM') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f4f7fb"/>
    <rect width="100%" height="13" fill="#2866d5"/>
    <text x="72" y="84" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#17243a">${escapeXml(title)}</text>
    <text x="74" y="126" font-family="Arial,sans-serif" font-size="21" fill="#53657f">${escapeXml(subtitle)}</text>
    ${body}
    <rect x="72" y="647" width="755" height="32" rx="16" fill="#e0e9f7"/>
    <text x="91" y="668" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing=".45" fill="#31547f">${escapeXml(badge)}</text>
    <text x="1206" y="668" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#66758b">kernelCAD · issue #917</text>
  </svg>`;
}

function codeSlide() {
  const body = `
    <rect x="80" y="176" width="1120" height="405" rx="22" fill="#fff" stroke="#d8e1ee"/>
    <text x="116" y="225" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#415573">EXAMPLE INPUT</text>
    <text x="116" y="278" font-family="monospace" font-size="21" fill="#23354d">arm.part('base', box(20, 20, 10, true), { at: [100, 0, 0] })</text>
    <text x="116" y="332" font-family="monospace" font-size="21" fill="#2866d5">arm.revolute('hinge', base, link, { axis: [0, 0, 1], origin: [0, 0, 0] })</text>
    <text x="116" y="386" font-family="monospace" font-size="21" fill="#c56a15">arm.tendon('spring', { from: 'base.hook', to: 'link.eye', ... })</text>
    <rect x="116" y="431" width="1048" height="96" rx="14" fill="#f4f7fb"/>
    <text x="143" y="472" font-family="Arial,sans-serif" font-size="19" fill="#53657f">Focused workflow</text>
    <text x="143" y="506" font-family="monospace" font-size="18" fill="#17243a">mesh the emitted tendon → average each 16-vertex endpoint ring</text>
    <text x="116" y="557" font-family="Arial,sans-serif" font-size="17" fill="#53657f">Regression source: tests/integration/lowering/mateAtPlacement.test.ts</text>
  `;
  return panel('Tendon anchors follow jointed part placement', 'A placed base part, a legacy revolute joint, and one tendon', body);
}

function sceneSlide(progress) {
  const from = evidence.actual.fromMm;
  const to = evidence.actual.toMm;
  const startX = x(to[0]);
  const endX = x(from[0]);
  const revealX = startX + (endX - startX) * progress;
  const body = `
    <rect x="80" y="170" width="1120" height="418" rx="22" fill="#fff" stroke="#d8e1ee"/>
    <text x="111" y="215" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#415573">MESH ENDPOINTS · MILLIMETRES</text>
    <line x1="170" y1="${y0}" x2="1110" y2="${y0}" stroke="#dbe2eb" stroke-width="2"/>
    <line x1="${x(10)}" y1="${y0 - 102}" x2="${x(10)}" y2="${y0 + 102}" stroke="#dc644d" stroke-width="3" stroke-dasharray="8 7"/>
    <text x="${x(10) - 12}" y="${y0 - 119}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#bb4e3a">old result x=10</text>
    <rect x="${x(-10)}" y="${y0 - 54}" width="84" height="108" rx="8" fill="#91afd9" stroke="#456790" stroke-width="3"/>
    <rect x="${x(90)}" y="${y0 - 54}" width="84" height="108" rx="8" fill="#8fc7aa" stroke="#438568" stroke-width="3"/>
    <text x="${x(0)}" y="${y0 - 68}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#34445d">link</text>
    <text x="${x(100)}" y="${y0 - 68}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#34445d">base · at 100 mm</text>
    <line x1="${startX}" y1="${y0}" x2="${revealX}" y2="${y0}" stroke="#e88b27" stroke-width="8" stroke-linecap="round"/>
    <circle cx="${startX}" cy="${y0}" r="9" fill="#e88b27" stroke="#8e5011" stroke-width="3"/>
    <circle cx="${endX}" cy="${y0}" r="9" fill="#e88b27" stroke="#8e5011" stroke-width="3"/>
    <text x="${startX}" y="${y0 + 89}" text-anchor="middle" font-family="monospace" font-size="17" fill="#31547f">eye x=${to[0]} mm</text>
    <text x="${endX}" y="${y0 + 89}" text-anchor="middle" font-family="monospace" font-size="17" fill="#31547f">hook x=${from[0]} mm</text>
    <text x="111" y="543" font-family="Arial,sans-serif" font-size="17" fill="#53657f">Tendon mesh rings: from [${from.join(', ')}] · to [${to.join(', ')}]</text>
    <text x="111" y="571" font-family="Arial,sans-serif" font-size="16" fill="#53657f">Old x=10 endpoint was 100 mm from the expected hook at x=110; the mesh now lands there.</text>
  `;
  return panel('The tendon mesh now meets its hook', 'Diagram scaled from the verified native tendon mesh coordinates', body,
    'LOCAL MESH VERIFICATION · NO DYNAMIC SIMULATION, DEPLOYMENT, OR HARDWARE ACCEPTANCE');
}

async function saveFrame(index, svg) {
  await sharp(Buffer.from(svg)).png().toFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.png`));
}

try {
  let index = 0;
  const opening = panel(
    'A positioned part keeps its tendon anchor',
    'KernelCAD regression repair · issue #917 · legacy arm.revolute path',
    `<rect x="88" y="187" width="1104" height="374" rx="24" fill="#fff" stroke="#d8e1ee"/>
     <text x="143" y="275" font-family="Arial,sans-serif" font-size="24" fill="#53657f">The base is placed at x=100 mm.</text>
     <text x="143" y="331" font-family="Arial,sans-serif" font-size="24" fill="#53657f">Its connector is local x=10 mm, so the mesh endpoint belongs at x=110 mm.</text>
     <text x="143" y="408" font-family="Arial,sans-serif" font-size="22" fill="#17243a">The integration test reads the real tendon mesh and checks both ends.</text>
     <text x="143" y="475" font-family="monospace" font-size="18" fill="#2866d5">examples/kinematic/jointed-tendon-anchor-at.kcad.ts</text>`,
  );
  for (let i = 0; i < 36; i += 1) await saveFrame(index++, opening);
  const code = codeSlide();
  for (let i = 0; i < 36; i += 1) await saveFrame(index++, code);
  for (let i = 0; i < 120; i += 1) await saveFrame(index++, sceneSlide(i / 119));
  for (let i = 0; i < 48; i += 1) await saveFrame(index++, sceneSlide(1));
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps), '-i', join(frameDir, 'frame-%04d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    output,
  ], { cwd: repo, stdio: 'inherit' });
  console.log(`Wrote ${resolve(output)} (10.0s, ${fps} fps, ${width}x${height}).`);
} finally {
  rmSync(frameDir, { recursive: true, force: true });
}
