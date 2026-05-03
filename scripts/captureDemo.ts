#!/usr/bin/env node
// scripts/captureDemo.ts
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { loadScriptFeatures } from './lib/scriptLoader';
import { computeTimeline, type PacingOverride } from './lib/pacingEngine';
import { FfmpegPipeline } from './lib/ffmpegPipeline';
import { composeStaticPanel } from './lib/staticPanel';
import { whatsNewTemplate, writeWhatsNewIfMissing } from './lib/whatsNewTemplate';

interface Args {
  task?: string;
  script?: string;
  prompt?: string;
  module: string;
  output: string;
  pacing?: string;
  titleCardSvg?: string;
  rotateOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = { rotateOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--task') { a.task = next; i++; }
    else if (arg === '--script') { a.script = next; i++; }
    else if (arg === '--prompt') { a.prompt = next; i++; }
    else if (arg === '--module') { a.module = next; i++; }
    else if (arg === '--output') { a.output = next; i++; }
    else if (arg === '--pacing') { a.pacing = next; i++; }
    else if (arg === '--title-card-svg') { a.titleCardSvg = next; i++; }
    else if (arg === '--rotate-only') { a.rotateOnly = true; }
  }
  if (!a.module || !a.output) {
    console.error('Usage: captureDemo --module v0.X --output <dir> (--task <id> | --script <path> --prompt <path>)');
    process.exit(2);
  }
  if (!a.task && !(a.script && a.prompt)) {
    console.error('Must specify either --task or both --script and --prompt');
    process.exit(2);
  }
  return a as Args;
}

async function ensureViteRunning(): Promise<{ stop: () => void }> {
  // Try to reach existing dev server first.
  try {
    const res = await fetch('http://127.0.0.1:5173/');
    if (res.ok) return { stop: () => {} };
  } catch { /* not running, will start */ }
  const { spawn } = await import('node:child_process');
  const proc = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  // Wait for ready signal.
  await new Promise<void>((resolveReady, rejectReady) => {
    const t = setTimeout(() => rejectReady(new Error('vite did not start within 30s')), 30000);
    proc.stdout.on('data', (d: Buffer) => {
      if (d.toString().includes('Local:')) {
        clearTimeout(t);
        resolveReady();
      }
    });
  });
  return { stop: () => proc.kill('SIGTERM') };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`captureDemo: module=${args.module}, output=${args.output}`);
  mkdirSync(args.output, { recursive: true });

  // Suppress still-unused imports until Tasks 19-20 consume them.
  void (readFileSync as unknown);
  void (writeFileSync as unknown);
  void (existsSync as unknown);
  void (resolve as unknown);
  void (join as unknown);
  void (basename as unknown);
  void (execSync as unknown);
  void ({} as PacingOverride);
  void (loadScriptFeatures as unknown);
  void (computeTimeline as unknown);
  void (FfmpegPipeline as unknown);
  void (composeStaticPanel as unknown);
  void (whatsNewTemplate as unknown);
  void (writeWhatsNewIfMissing as unknown);

  const vite = await ensureViteRunning();
  const browser: Browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page: Page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/demo-player');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 15000 });
  await page.evaluate((v) => window.__demoPlayer!.setVersion(v), args.module);

  console.log('demo-player ready');

  // Subsequent tasks: load script, run replay, capture frames, ffmpeg.

  await browser.close();
  vite.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
