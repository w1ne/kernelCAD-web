#!/usr/bin/env node
// Picks the highest-semver demo from ../docs/demos/v*/, copies the MP4 into
// site/public/demo.mp4, and writes site/public/demo.json with metadata.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMOS_ROOT = path.resolve(__dirname, '../../docs/demos');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

export function parseSemver(name) {
  const m = /^v(\d+)\.(\d+)(?:\.(\d+))?$/.exec(name);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function findLatestDemo(entries) {
  const versioned = entries
    .map(name => ({ name, ver: parseSemver(name) }))
    .filter(e => e.ver !== null);
  if (versioned.length === 0) return null;
  versioned.sort((a, b) => compareSemver(b.ver, a.ver));
  return versioned[0].name;
}

function findFirstMp4(dir) {
  // walks one level deep; demo dirs are <root>/<v>/<task>/*.mp4
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const sub = path.join(dir, entry.name);
      for (const f of fs.readdirSync(sub)) {
        if (f.endsWith('.mp4')) return path.join(sub, f);
      }
    } else if (entry.name.endsWith('.mp4')) {
      return path.join(dir, entry.name);
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(DEMOS_ROOT)) {
    console.error(`demos root not found: ${DEMOS_ROOT}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(DEMOS_ROOT);
  const latest = findLatestDemo(entries);
  if (!latest) {
    console.error(`no v*/ directories under ${DEMOS_ROOT}`);
    process.exit(1);
  }
  const demoDir = path.join(DEMOS_ROOT, latest);
  const mp4 = findFirstMp4(demoDir);
  if (!mp4) {
    console.error(`no .mp4 found under ${demoDir}`);
    process.exit(1);
  }

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const dest = path.join(PUBLIC_DIR, 'demo.mp4');
  fs.copyFileSync(mp4, dest);

  const meta = {
    version: latest,
    source: path.relative(path.resolve(__dirname, '../..'), mp4),
    captured_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(PUBLIC_DIR, 'demo.json'), JSON.stringify(meta, null, 2));

  console.log(`✓ ${latest}: copied ${path.basename(mp4)} → site/public/demo.mp4`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
