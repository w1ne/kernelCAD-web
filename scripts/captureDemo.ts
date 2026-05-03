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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  // Suppress unused-import warnings at scaffold stage — Tasks 18-20 consume all imports.
  void (mkdirSync as unknown);
  void (readFileSync as unknown);
  void (writeFileSync as unknown);
  void (existsSync as unknown);
  void (resolve as unknown);
  void (join as unknown);
  void (basename as unknown);
  void (execSync as unknown);
  void (chromium as unknown);
  void ({} as Browser);
  void ({} as Page);
  void (loadScriptFeatures as unknown);
  void (computeTimeline as unknown);
  void ({} as PacingOverride);
  void (FfmpegPipeline as unknown);
  void (composeStaticPanel as unknown);
  void (whatsNewTemplate as unknown);
  void (writeWhatsNewIfMissing as unknown);
  console.log(`captureDemo: module=${args.module}, output=${args.output}`);
  // Subsequent tasks fill the body.
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
