#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const OUT_DIR = resolve('docs/demos/v0.11/scissor-lift');
const OUT_MP4 = resolve(OUT_DIR, 'demo.mp4');
const HERO_PNG = resolve(OUT_DIR, 'hero-frame.png');
const W = 1280;
const H = 720;
const FPS = 30;
const DURATION_S = 6;
const FRAMES = FPS * DURATION_S;

mkdirSync(dirname(OUT_MP4), { recursive: true });

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #0f1216; }
  body { font-family: Inter, system-ui, sans-serif; }
  svg { width: ${W}px; height: ${H}px; display: block; }
  .shadow { filter: blur(14px); opacity: 0.35; }
  .rail { stroke: #4f5963; stroke-width: 18; stroke-linecap: round; }
  .deck { fill: #e6ecef; stroke: #9ca7b0; stroke-width: 3; }
  .deck-rib { stroke: #aeb7bf; stroke-width: 5; }
  .armA { stroke: #f6b23b; stroke-width: 18; stroke-linecap: round; }
  .armB { stroke: #f0782f; stroke-width: 18; stroke-linecap: round; }
  .pin { fill: #1f2933; stroke: #f4f7f8; stroke-width: 5; }
  .washer { fill: none; stroke: #c9d1d8; stroke-width: 4; }
  .roller { fill: #27313b; stroke: #d5dce2; stroke-width: 3; }
  .actuator { stroke: #8e99a3; stroke-width: 14; stroke-linecap: round; }
  .rod { stroke: #dbe1e5; stroke-width: 8; stroke-linecap: round; }
  .label { fill: #cbd5dd; font-size: 18px; letter-spacing: 0.04em; opacity: 0.88; }
</style>
</head>
<body>
<svg id="scene" viewBox="0 0 ${W} ${H}" aria-label="Animated scissor lift mechanism"></svg>
<script>
const svg = document.getElementById('scene');
const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  svg.appendChild(n);
  return n;
}
function line(x1,y1,x2,y2, cls) { return el('line', { x1, y1, x2, y2, class: cls }); }
function circle(cx,cy,r, cls) { return el('circle', { cx, cy, r, class: cls }); }
function rect(x,y,w,h,rx, cls) { return el('rect', { x, y, width: w, height: h, rx, class: cls }); }
function text(x,y,t) { const n = el('text', { x, y, class: 'label' }); n.textContent = t; return n; }
function drawStage(cx, baseY, h, half, depth, name) {
  const y0 = baseY, y1 = baseY - h;
  const xL = cx - half, xR = cx + half;
  for (const d of [depth, -depth]) {
    line(xL, y0 + d, xR, y1 + d, 'armA');
    line(xR, y0 + d, xL, y1 + d, 'armB');
  }
  for (const [x,y] of [[xL,y0],[xR,y0],[cx,baseY-h/2],[xL,y1],[xR,y1]]) {
    circle(x, y + depth, 13, 'washer');
    circle(x, y - depth, 13, 'washer');
    circle(x, y, 10, 'pin');
  }
  circle(xR, y0 + depth, 11, 'roller');
  circle(xR, y0 - depth, 11, 'roller');
  circle(xL, y1 + depth, 11, 'roller');
  circle(xL, y1 - depth, 11, 'roller');
}
window.renderFrame = (t) => {
  svg.textContent = '';
  const phase = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
  const angle = (24 + 28 * phase) * Math.PI / 180;
  const L = 282;
  const h = Math.sin(angle) * L;
  const half = Math.cos(angle) * L / 2;
  const cx = 650;
  const baseY = 590;
  const depth = 34;
  const topY = baseY - h * 2;
  el('ellipse', { cx, cy: 642, rx: 410, ry: 46, fill: '#000', class: 'shadow' });
  line(cx - half - 52, baseY + depth + 24, cx + half + 52, baseY + depth + 24, 'rail');
  line(cx - half - 52, baseY - depth + 24, cx + half + 52, baseY - depth + 24, 'rail');
  rect(cx - half - 72, baseY + 15, 46, 30, 8, 'deck');
  rect(cx + half + 26, baseY + 15, 46, 30, 8, 'deck');
  drawStage(cx, baseY, h, half, depth, 'lower');
  drawStage(cx, baseY - h, h, half, depth, 'upper');
  line(cx - half + 35, baseY + 8, cx - 18, baseY - h / 2 - 8, 'actuator');
  line(cx - half + 82, baseY - 36, cx + 24, baseY - h / 2 - 22, 'rod');
  rect(cx - half - 70, topY - 42, half * 2 + 140, 32, 9, 'deck');
  for (let i = -3; i <= 3; i++) line(cx + i * 46, topY - 37, cx + i * 46, topY - 14, 'deck-rib');
  text(72, 92, 'SCISSOR-LIFT MECHANISM');
  text(72, 120, 'pinned links + sliding roller tracks');
};
window.renderFrame(0.38);
</script>
</body>
</html>`;

async function main() {
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => window.renderFrame(0.38));
  await page.screenshot({ path: HERO_PNG, type: 'png' });

  const ffmpeg = spawn('ffmpeg', [
    '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23',
    OUT_MP4,
  ], { stdio: ['pipe', 'pipe', 'inherit'] });

  for (let i = 0; i < FRAMES; i += 1) {
    await page.evaluate((t) => window.renderFrame(t), i / FRAMES);
    const buf = await page.screenshot({ type: 'png' });
    await new Promise((resolveWrite, rejectWrite) => {
      ffmpeg.stdin.write(buf, (err) => err ? rejectWrite(err) : resolveWrite());
    });
  }
  ffmpeg.stdin.end();
  await new Promise((resolveClose, rejectClose) => {
    ffmpeg.on('close', (code) => code === 0 ? resolveClose() : rejectClose(new Error('ffmpeg exit ' + code)));
  });
  await browser.close();
  console.log('Wrote ' + OUT_MP4);
  console.log('Wrote ' + HERO_PNG);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
