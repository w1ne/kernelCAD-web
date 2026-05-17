#!/usr/bin/env node
// scripts/renderStlMatchingKernelcad.mjs
//
// Render an STL (or multiple) using the SAME camera math as kernelCAD's
// DemoPlayerPage.tsx setRenderPose. Goal: produce a reference image at the
// identical framing convention agent builds are rendered with, so scoring
// builds against this reference uses an apples-to-apples comparison.
//
// Usage:
//   node scripts/renderStlMatchingKernelcad.mjs \
//     --stl /path/a.stl --stl /path/b.stl \
//     --pose 30,15 --size 1024 --out /tmp/ref.png

import { chromium } from 'playwright';
import { resolve, isAbsolute, join } from 'node:path';
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  return process.argv[i + 1];
}
function args(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--' + name) out.push(process.argv[i + 1]);
  }
  return out;
}

const stlPaths = args('stl');
const pose = arg('pose', '30,15');
const size = Number(arg('size', '1024'));
const out = arg('out', '/tmp/stl-render.png');
const baseUrl = arg('base-url', 'http://localhost:5173');
const rotate = arg('rotate', '-90,0,0');

if (stlPaths.length === 0) {
  console.error('usage: renderStlMatchingKernelcad.mjs --stl <path> [--stl <path>] [--pose 30,15] [--size 1024] [--out <png>]');
  process.exit(2);
}

const [azStr, elStr] = pose.split(',').map(s => s.trim());

// Copy STLs into the worktree's public/ so vite serves them at /tmp-stls/<name>
const worktreeRoot = resolve(import.meta.dirname, '..');
const publicStaticDir = join(worktreeRoot, 'public', 'tmp-stls');
mkdirSync(publicStaticDir, { recursive: true });
const servedUrls = [];
for (const p of stlPaths) {
  const abs = isAbsolute(p) ? p : resolve(p);
  if (!existsSync(abs)) {
    console.error(`STL not found: ${abs}`);
    process.exit(2);
  }
  const base = abs.split('/').pop();
  const dest = join(publicStaticDir, base);
  copyFileSync(abs, dest);
  servedUrls.push(`/tmp-stls/${base}`);
}

const stlQueryParams = servedUrls.map(u => `stl=${encodeURIComponent(u)}`).join('&');
const url = `${baseUrl}/renderStlMatchingKernelcad.html?${stlQueryParams}&az=${azStr}&el=${elStr}&size=${size}&rotate=${encodeURIComponent(rotate)}`;

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: size, height: size } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('page error:', e));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });

await page.goto(url);
try {
  await page.waitForFunction(() => window.__stlReady === true || window.__stlError, { timeout: 30000 });
  const err = await page.evaluate(() => window.__stlError);
  if (err) {
    console.error('STL load error:', err);
    await browser.close();
    process.exit(3);
  }
  const bbox = await page.evaluate(() => window.__bbox);
  console.error('rendered bbox:', JSON.stringify(bbox));
  // Wait for renderer to settle
  await page.waitForTimeout(500);
  await page.screenshot({ path: out, type: 'png' });
  console.log(`Wrote ${out}`);
} finally {
  await browser.close();
}
