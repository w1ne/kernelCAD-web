// eval/oracle/render.ts
//
// Wraps `kernelcad render <script> --separate --pose <az>,<el> -o <stem>`.
// Used by per-task harnesses that want to score the model against a reference
// photo at a known camera pose.
//
// Requires a studio dev server at the configured base URL (default 5173 — set
// KERNELCAD_RENDER_BASE_URL to override).

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

const LOCAL_BUILD = './dist/cli/index.js';
const DEFAULT_BASE_URL = process.env.KERNELCAD_RENDER_BASE_URL ?? 'http://127.0.0.1:5173';

export interface RenderOpts {
  /** Output stem; PNGs get `.front.png` / `.pose-<az>-<el>.png` suffixes. */
  outStem: string;
  /** Width per tile. Default 1920 to match the demo-player layout. */
  width?: number;
  /** Height per tile. Default 1080. */
  height?: number;
  /** Repeat for multiple poses. Strings of the form `"<az>,<el>"`. */
  poses?: string[];
  /** Override the dev-server base URL. */
  baseUrl?: string;
}

export interface RenderResult {
  ok: boolean;
  paths: {
    front: string;
    right: string;
    top: string;
    iso: string;
    poses: Record<string, string>;   // keyed by "<az>,<el>" → absolute PNG path
  };
  error?: string;
}

function getBin(): { cmd: string; baseArgs: string[] } {
  const override = process.env.KERNELCAD_BIN;
  if (override) {
    if (override.endsWith('.js')) return { cmd: 'node', baseArgs: [override] };
    return { cmd: override, baseArgs: [] };
  }
  if (existsSync(LOCAL_BUILD)) return { cmd: 'node', baseArgs: [LOCAL_BUILD] };
  return { cmd: 'kernelcad', baseArgs: [] };
}

async function runOnce(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const { cmd, baseArgs } = getBin();
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, [...baseArgs, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export async function renderScript(scriptPath: string, opts: RenderOpts): Promise<RenderResult> {
  const width = opts.width ?? 1920;
  const height = opts.height ?? 1080;
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const poses = opts.poses ?? [];

  const args = [
    'render',
    scriptPath,
    '--separate',
    '-o', opts.outStem,
    '--width', String(width),
    '--height', String(height),
    '--base-url', baseUrl,
    '--hide-reference-images',  // eval scoring never sees reference-image overlays
  ];
  for (const p of poses) {
    args.push('--pose', p);
  }

  const r = await runOnce(args);
  if (r.code !== 0) {
    return {
      ok: false,
      paths: { front: '', right: '', top: '', iso: '', poses: {} },
      error: `kernelcad render exited ${r.code}: ${r.stderr.trim() || r.stdout.trim() || '(no output)'}`,
    };
  }

  // CLI emits one "Wrote <path>" line per output PNG. We could parse those,
  // but we know the file naming convention deterministically.
  const stemDir = dirname(opts.outStem);
  const stemBase = basename(opts.outStem).replace(/\.png$/i, '');
  const stem = join(stemDir, stemBase);
  const posesByKey: Record<string, string> = {};
  for (const p of poses) {
    const [az, el] = p.split(',').map((s) => s.trim());
    posesByKey[p] = `${stem}.pose-${az}-${el}.png`;
  }
  return {
    ok: true,
    paths: {
      front: `${stem}.front.png`,
      right: `${stem}.right.png`,
      top:   `${stem}.top.png`,
      iso:   `${stem}.iso.png`,
      poses: posesByKey,
    },
  };
}
