// src/cli/commands/render.ts
//
// `kernelcad render <file.kcad.ts>` — multi-view headless renderer.
//
// Default: 2×2 composite PNG (front, right, top, iso) saved next to the
// script. Use `--separate` to emit four individual files.
//
// Requires a studio dev server reachable at the configured base URL
// (default http://127.0.0.1:5173). For development run `npm run dev` first;
// a bundled-static-dist mode is on the v2 list.

import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { headlessRender, composite2x2, ALL_VIEWS } from '../../render/headlessRender';

export interface RenderInput {
  file: string;
  out?: string;
  separate: boolean;
  width: number;
  height: number;
  baseUrl: string;
}

export interface RenderCliResult {
  exitCode: number;
  outputPaths: string[];
}

export async function renderScript(input: RenderInput): Promise<RenderCliResult> {
  const filePath = resolve(input.file);

  let result;
  try {
    result = await headlessRender({
      scriptPath: filePath,
      viewportWidth: input.width,
      viewportHeight: input.height,
      views: ALL_VIEWS,
      baseUrl: input.baseUrl,
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 1, outputPaths: [] };
  }

  const dir = dirname(filePath);
  const stem = basename(filePath).replace(/\.kcad\.ts$/, '').replace(/\.ts$/, '');
  const written: string[] = [];

  if (input.separate) {
    for (const view of ALL_VIEWS) {
      const buf = result.pngsByView[view];
      if (!buf) continue;
      const outPath = input.out
        ? input.out.replace(/\.png$/i, `.${view}.png`)
        : join(dir, `${stem}.${view}.png`);
      await writeFile(outPath, buf);
      written.push(outPath);
    }
  } else {
    const outPath = input.out ?? join(dir, `${stem}.png`);
    const grid = await composite2x2(result.pngsByView, input.width, input.height);
    await writeFile(outPath, grid);
    written.push(outPath);
  }

  return { exitCode: 0, outputPaths: written };
}

export function renderCommand(): Command {
  const cmd = new Command('render')
    .description('Render a .kcad.ts script to multi-view PNG (front, right, top, iso)')
    .argument('<file>', 'path to .kcad.ts script')
    .option('-o, --out <path>', 'output PNG path (composite mode) or stem with .png suffix (separate mode)')
    .option('--separate', 'emit four individual PNG files instead of a 2×2 composite', false)
    .option('--width <n>', 'per-tile width in pixels', (v) => parseInt(v, 10), 1024)
    .option('--height <n>', 'per-tile height in pixels', (v) => parseInt(v, 10), 1024)
    .option(
      '--base-url <url>',
      'studio dev server URL (run `npm run dev` first)',
      'http://localhost:5173',
    )
    .action(async (file: string, opts: {
      out?: string;
      separate: boolean;
      width: number;
      height: number;
      baseUrl: string;
    }) => {
      const r = await renderScript({
        file,
        out: opts.out,
        separate: opts.separate,
        width: opts.width,
        height: opts.height,
        baseUrl: opts.baseUrl,
      });
      for (const p of r.outputPaths) console.log(`Wrote ${p}`);
      process.exitCode = r.exitCode;
    });
  return cmd;
}
