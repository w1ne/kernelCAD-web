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
  hideReferenceImages: boolean;
  /** Additional `--pose <az,el>` captures, repeatable on the CLI. */
  poses?: string[];
  /** HDRI environment override: preset key, custom URL, or 'none'. */
  environment?: string;
  /** Suppress the kernelCAD version watermark on the captured frames.
   *  Used for clean hero artifacts intended for public posts. */
  noWatermark?: boolean;
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
      poses: input.poses,
      baseUrl: input.baseUrl,
      hideReferenceImages: input.hideReferenceImages,
      environment: input.environment,
      noWatermark: input.noWatermark,
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
    // Also emit pose-keyed PNGs alongside the view tiles.
    for (const [poseKey, buf] of Object.entries(result.pngsByPose ?? {})) {
      const [az, el] = poseKey.split(',').map((s) => s.trim());
      const suffix = `pose-${az}-${el}.png`;
      const outPath = input.out
        ? input.out.replace(/\.png$/i, `.${suffix}`)
        : join(dir, `${stem}.${suffix}`);
      await writeFile(outPath, buf);
      written.push(outPath);
    }
  } else {
    const outPath = input.out ?? join(dir, `${stem}.png`);
    const grid = await composite2x2(result.pngsByView, input.width, input.height);
    await writeFile(outPath, grid);
    written.push(outPath);
    // In composite mode, pose captures still emit as separate files next to
    // the composite output. Resolves the `node ... render --pose <az,el> -o
    // /tmp/<stem>.png` flow which expects `/tmp/<stem>.pose-<az>-<el>.png`.
    for (const [poseKey, buf] of Object.entries(result.pngsByPose ?? {})) {
      const [az, el] = poseKey.split(',').map((s) => s.trim());
      const suffix = `pose-${az}-${el}.png`;
      const posePath = (input.out ?? join(dir, `${stem}.png`)).replace(/\.png$/i, `.${suffix}`);
      await writeFile(posePath, buf);
      written.push(posePath);
    }
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
    .option('--hide-reference-images', 'hide referenceImage() overlays in rendered output (default false)', false)
    .option(
      '--pose <az,el>',
      'capture an arbitrary az,el pose (degrees; az=0,el=0 is front, +az is CCW around Z, +el lifts the camera). Repeatable.',
      (value: string, prev: string[]) => prev.concat([value]),
      [] as string[],
    )
    .option(
      '--environment <preset|url|none>',
      "HDRI environment preset ('studio', 'softbox', 'neutral', 'outdoor', 'warehouse'), a custom URL/path, or 'none' to force the default three-light rig",
    )
    .option(
      '--no-watermark',
      'suppress the kernelCAD version badge in the bottom-right of the captured frame (clean hero artifacts)',
      false,
    )
    .action(async (file: string, opts: {
      out?: string;
      separate: boolean;
      width: number;
      height: number;
      baseUrl: string;
      hideReferenceImages: boolean;
      pose: string[];
      environment?: string;
      watermark: boolean;  // commander inverts --no-watermark to opts.watermark = false
    }) => {
      const r = await renderScript({
        file,
        out: opts.out,
        separate: opts.separate,
        width: opts.width,
        height: opts.height,
        baseUrl: opts.baseUrl,
        hideReferenceImages: opts.hideReferenceImages,
        poses: opts.pose,
        environment: opts.environment,
        noWatermark: opts.watermark === false,
      });
      for (const p of r.outputPaths) console.log(`Wrote ${p}`);
      process.exitCode = r.exitCode;
    });
  return cmd;
}
