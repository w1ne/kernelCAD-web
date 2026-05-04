#!/usr/bin/env node
// Renders brand HTML templates to PNG via Playwright (headless Chromium).
// Outputs land in site/public/brand/ AND site/public/og-image.png at root.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../brand-templates');
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const BRAND_OUT = path.join(PUBLIC_DIR, 'brand');

const TARGETS = [
  { template: 'avatar.html',         out: 'avatar-light.png',     w: 400,  h: 400 },
  { template: 'avatar-dark.html',    out: 'avatar-dark.png',      w: 400,  h: 400 },
  { template: 'x-header.html',       out: 'x-header.png',         w: 1500, h: 500 },
  { template: 'linkedin-cover.html', out: 'linkedin-cover.png',   w: 1128, h: 191 },
  { template: 'og-image.html',       out: 'og-image.png',         w: 1280, h: 640 },
];

async function main() {
  fs.mkdirSync(BRAND_OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const t of TARGETS) {
    const templatePath = path.join(TEMPLATES_DIR, t.template);
    if (!fs.existsSync(templatePath)) {
      console.error(`✗ missing template: ${templatePath}`);
      continue;
    }
    const ctx = await browser.newContext({
      viewport: { width: t.w, height: t.h },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(templatePath).href);
    await page.evaluate(() => document.fonts.ready);
    const outPath = path.join(BRAND_OUT, t.out);
    await page.screenshot({ path: outPath, omitBackground: false });
    await ctx.close();
    const size = fs.statSync(outPath).size;
    console.log(`✓ ${t.template} → brand/${t.out} (${t.w}×${t.h}@2x, ${(size/1024).toFixed(1)} KB)`);
  }
  await browser.close();

  fs.copyFileSync(path.join(BRAND_OUT, 'og-image.png'), path.join(PUBLIC_DIR, 'og-image.png'));
  console.log(`✓ copied og-image.png → public/og-image.png`);
}

main().catch(e => { console.error(e); process.exit(1); });
