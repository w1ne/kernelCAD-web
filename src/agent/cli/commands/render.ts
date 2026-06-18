// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/cli/commands/render.ts
//
// `kernelcad render <file.kcad.ts>` — multi-view headless renderer.
//
// Default: 2×2 composite PNG (front, right, top, iso) saved next to the
// script. Use `--separate` to emit four individual files.
//
// Requires a studio dev server reachable at the configured base URL
// (see --base-url; default DEFAULT_RENDER_BASE_URL). For development run `npm run dev` first;
// a bundled-static-dist mode is on the v2 list.

import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import sharp from 'sharp';
import {
  headlessRender,
  composite2x2,
  ALL_VIEWS,
  DEFAULT_RENDER_BASE_URL,
  type HeadlessObjectFilter,
  type HeadlessInspectionChannel,
} from '../../render/headlessRender';
import { buildModelFromFile } from '../../../modeling/buildModel';
import type { Assembly } from '../../../modeling/capture/assembly';
import { checkMechanismTruth } from '../../../modeling/runtime/mechanismTruth';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

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
  /** Show only matching objects by feature/part name. */
  focus?: string[];
  /** Hide matching objects by feature/part name. */
  hide?: string[];
  /** Raw `--section <axis>=<pos>` value (e.g. `z=10`); validated by
   *  parseSectionFlag inside the same try/catch that buildObjectFilter
   *  uses, so a malformed value exits 1 before the browser spins up. */
  section?: string;
  /** Keep the positive-axis side of the section plane instead of the
   *  default negative-axis side. */
  sectionFlip?: boolean;
}

export interface RenderCliResult {
  exitCode: number;
  outputPaths: string[];
}

export interface RenderInspectInput {
  file: string;
  outDir: string;
  width: number;
  height: number;
  baseUrl: string;
  hideReferenceImages: boolean;
  environment?: string;
  noWatermark?: boolean;
  focus?: string[];
  hide?: string[];
  channels?: string[];
}

const SUPPORTED_INSPECT_CHANNELS = new Set<HeadlessInspectionChannel>(['rgb', 'mask', 'depth', 'normals']);

/**
 * Build a HeadlessObjectFilter from `--focus` / `--hide` pattern lists.
 *
 * Shared by `render`, `render inspect`, AND `animate` (the animation-capture
 * CLI reuses these exact semantics so a part name hidden in a render is hidden
 * the same way in a capture): focus and hide are mutually exclusive, each
 * value is comma-split + trimmed, and an all-empty input yields no filter.
 */
export function buildObjectFilter(input: { focus?: string[]; hide?: string[] }): HeadlessObjectFilter | undefined {
  const focus = normalizePatternList(input.focus);
  const hide = normalizePatternList(input.hide);
  if (focus.length > 0 && hide.length > 0) {
    throw new Error('render: --focus and --hide are mutually exclusive. Use one or the other.');
  }
  if (focus.length > 0) return { mode: 'focus', patterns: focus };
  if (hide.length > 0) return { mode: 'hide', patterns: hide };
  return undefined;
}

/**
 * Validate a `--section <axis>=<pos>` flag value.
 *
 * Accepts `x|y|z` `=` a decimal position (e.g. `z=10`, `x=-2.5`). Throws on
 * anything else so the caller's exit-1 try/catch (shared with
 * buildObjectFilter) rejects before the headless browser launches.
 *
 * `positionRaw` carries the validated digits verbatim for the demo-player
 * URL: stringifying the Number instead would emit exponent notation for
 * |pos| ≥ 1e21 or < 1e-6, which the page-side `?section=` regex rejects —
 * producing a silently unclipped render.
 */
export function parseSectionFlag(raw: string): {
  axis: 'x' | 'y' | 'z';
  position: number;
  positionRaw: string;
} {
  const m = /^([xyz])=(-?\d+(?:\.\d+)?)$/.exec(raw);
  if (!m) {
    throw new Error(
      `render: invalid --section value '${raw}'. Expected <axis>=<pos> with axis x, y, or z, e.g. --section z=10.`,
    );
  }
  return { axis: m[1] as 'x' | 'y' | 'z', position: Number(m[2]), positionRaw: m[2] };
}

function normalizePatternList(values: readonly string[] | undefined): string[] {
  return (values ?? [])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Physics-grounded loop integration (P1 surface convergence).
 *
 * `render inspect` and `render` both refuse to display a broken
 * mechanism without making that explicit:
 *
 *   - Default: WATERMARK each rendered PNG with a "MECHANISM BROKEN"
 *     overlay listing the first few failure codes. The render is still
 *     produced so the agent can visually diagnose, but no consumer can
 *     mistake it for a clean build.
 *   - `KERNELCAD_RENDER_STRICT=1`: REFUSE outright. No PNGs are
 *     written, the failure list goes to stderr, exit code 2. CI and
 *     hosted product pass this flag.
 *
 * The check runs the same `checkMechanismTruth` probe the CLI validate
 * + Studio runtime use (single source of truth — see spec
 * `docs/specs/2026-06-01-physics-grounded-loop-design.md`).
 */
export async function runRenderMechanismProbe(absScriptPath: string): Promise<{
  mechanism: 'real' | 'broken' | 'unverified';
  failures: CompilerDiagnostic[];
}> {
  try {
    const model = await buildModelFromFile({ file: absScriptPath });
    const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
    if (assemblies.length === 0) {
      return { mechanism: 'unverified', failures: [] };
    }
    // Verdict precedence across assemblies: broken > unverified > real.
    // A skipped BREP sweep (issue #348) surfaces as 'unverified'.
    let anyBroken = false;
    let anyUnverified = false;
    const aggregated: CompilerDiagnostic[] = [];
    for (const arm of assemblies) {
      const verdict = await checkMechanismTruth(arm);
      if (verdict.mechanism === 'broken') anyBroken = true;
      else if (verdict.mechanism === 'unverified') anyUnverified = true;
      aggregated.push(...verdict.failures);
    }
    return {
      mechanism: anyBroken ? 'broken' : anyUnverified ? 'unverified' : 'real',
      failures: aggregated,
    };
  } catch {
    return { mechanism: 'unverified', failures: [] };
  }
}

export function isRenderStrictMode(): boolean {
  const v = process.env.KERNELCAD_RENDER_STRICT;
  return v !== undefined && v !== '' && v !== '0' && v.toLowerCase() !== 'false';
}

/**
 * Print the broken-mechanism failure list to stderr in the same
 * "MECHANISM BROKEN" shape `kernelcad validate` uses, so an agent that
 * already learned to read the validate output sees the same surface
 * when render-inspect refuses.
 */
function reportBrokenMechanismToStderr(failures: readonly CompilerDiagnostic[]): void {
  const isTty = Boolean(process.stderr.isTTY);
  const RED = isTty ? '\x1b[31m' : '';
  const BOLD = isTty ? '\x1b[1m' : '';
  const RESET = isTty ? '\x1b[0m' : '';
  console.error(`${BOLD}${RED}MECHANISM BROKEN${RESET} — render refused (${failures.length} failure${failures.length === 1 ? '' : 's'})`);
  for (const d of failures) {
    console.error(`  ${RED}[ERROR]${RESET} ${d.code}`);
    console.error(`         ${d.message}`);
    console.error(`         hint: ${d.hint}`);
  }
}

/**
 * Compose a "MECHANISM BROKEN" watermark overlay onto each PNG buffer.
 *
 * Uses sharp's SVG composite — sharp is already in the deps tree and
 * the same pipeline composes the 2×2 view grid, so no new image lib.
 *
 * Lists the first few unique failure codes (de-duped — the same code
 * fires per pose-sample so 3+ entries with the same code would
 * dominate the box).
 */
export async function watermarkBrokenMechanism(
  buf: Buffer,
  failures: readonly CompilerDiagnostic[],
): Promise<Buffer> {
  const codes = Array.from(new Set(failures.map((f) => f.code))).slice(0, 3);
  const lines = ['MECHANISM BROKEN', ...codes.map((c) => `· ${c}`)];
  // Each line ~16px tall, ~10px padding around the box.
  const lineHeight = 16;
  const pad = 10;
  const charWidth = 7;
  const maxLineLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const boxW = Math.min(560, maxLineLen * charWidth + pad * 2);
  const boxH = lines.length * lineHeight + pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${boxW}" height="${boxH}">
    <rect x="0" y="0" width="${boxW}" height="${boxH}" fill="rgba(120,0,0,0.85)" rx="6" ry="6"/>
    ${lines.map((line, i) => {
      const y = pad + (i + 1) * lineHeight - 4;
      const fontWeight = i === 0 ? '700' : '400';
      const fontSize = i === 0 ? 14 : 12;
      return `<text x="${pad}" y="${y}" fill="#ffe0e0" font-family="monospace" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(line)}</text>`;
    }).join('\n    ')}
  </svg>`;
  return sharp(buf)
    .composite([{ input: Buffer.from(svg), top: 12, left: 12 }])
    .png()
    .toBuffer();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeInspectChannels(values: readonly string[] | undefined): HeadlessInspectionChannel[] {
  const channels = normalizePatternList(values);
  const requested = channels.length > 0 ? channels : ['rgb'];
  const unsupported = requested.filter((channel) => !SUPPORTED_INSPECT_CHANNELS.has(channel as HeadlessInspectionChannel));
  if (unsupported.length > 0) {
    throw new Error(`render inspect: unsupported channel(s): ${unsupported.join(', ')}. Supported channels: rgb, mask, depth, normals.`);
  }
  return [...new Set(requested)] as HeadlessInspectionChannel[];
}

export async function renderScript(input: RenderInput): Promise<RenderCliResult> {
  const filePath = resolve(input.file);
  let objectFilter: HeadlessObjectFilter | undefined;
  let section: { axis: 'x' | 'y' | 'z'; position: number; positionRaw: string; flip: boolean } | undefined;
  try {
    objectFilter = buildObjectFilter(input);
    if (input.section !== undefined) {
      section = { ...parseSectionFlag(input.section), flip: input.sectionFlip ?? false };
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 1, outputPaths: [] };
  }

  // Physics-loop probe — P1 surface convergence. Same refuse/watermark
  // protocol as renderInspectBundle (see runRenderMechanismProbe).
  const mechanismProbe = await runRenderMechanismProbe(filePath);
  if (mechanismProbe.mechanism === 'broken' && isRenderStrictMode()) {
    reportBrokenMechanismToStderr(mechanismProbe.failures);
    return { exitCode: 2, outputPaths: [] };
  }

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
      objectFilter,
      section,
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 1, outputPaths: [] };
  }

  const dir = dirname(filePath);
  const stem = basename(filePath).replace(/\.kcad\.ts$/, '').replace(/\.ts$/, '');
  const written: string[] = [];
  const stamp = async (buf: Buffer): Promise<Buffer> =>
    mechanismProbe.mechanism === 'broken'
      ? watermarkBrokenMechanism(buf, mechanismProbe.failures)
      : buf;

  if (input.separate) {
    for (const view of ALL_VIEWS) {
      const buf = result.pngsByView[view];
      if (!buf) continue;
      const outPath = input.out
        ? input.out.replace(/\.png$/i, `.${view}.png`)
        : join(dir, `${stem}.${view}.png`);
      await writeFile(outPath, await stamp(buf));
      written.push(outPath);
    }
    // Also emit pose-keyed PNGs alongside the view tiles.
    for (const [poseKey, buf] of Object.entries(result.pngsByPose ?? {})) {
      const [az, el] = poseKey.split(',').map((s) => s.trim());
      const suffix = `pose-${az}-${el}.png`;
      const outPath = input.out
        ? input.out.replace(/\.png$/i, `.${suffix}`)
        : join(dir, `${stem}.${suffix}`);
      await writeFile(outPath, await stamp(buf));
      written.push(outPath);
    }
  } else {
    const outPath = input.out ?? join(dir, `${stem}.png`);
    const grid = await composite2x2(result.pngsByView, input.width, input.height);
    await writeFile(outPath, await stamp(grid));
    written.push(outPath);
    // In composite mode, pose captures still emit as separate files next to
    // the composite output. Resolves the `node ... render --pose <az,el> -o
    // /tmp/<stem>.png` flow which expects `/tmp/<stem>.pose-<az>-<el>.png`.
    for (const [poseKey, buf] of Object.entries(result.pngsByPose ?? {})) {
      const [az, el] = poseKey.split(',').map((s) => s.trim());
      const suffix = `pose-${az}-${el}.png`;
      const posePath = (input.out ?? join(dir, `${stem}.png`)).replace(/\.png$/i, `.${suffix}`);
      await writeFile(posePath, await stamp(buf));
      written.push(posePath);
    }
  }

  return { exitCode: 0, outputPaths: written };
}

export async function renderInspectBundle(input: RenderInspectInput): Promise<RenderCliResult> {
  const filePath = resolve(input.file);
  const outDir = resolve(input.outDir);
  const rgbDir = join(outDir, 'channels', 'rgb');
  const maskDir = join(outDir, 'channels', 'mask');
  const depthDir = join(outDir, 'channels', 'depth');
  const normalsDir = join(outDir, 'channels', 'normals');
  let requestedChannels: HeadlessInspectionChannel[];
  try {
    requestedChannels = normalizeInspectChannels(input.channels);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 1, outputPaths: [] };
  }
  let objectFilter: HeadlessObjectFilter | undefined;
  try {
    objectFilter = buildObjectFilter(input);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 1, outputPaths: [] };
  }

  // Physics-loop probe — P1 surface convergence. Runs BEFORE the
  // (slow) headless render so strict mode refuses without spinning up
  // a browser tile. The renderer's existing exit-1 paths take
  // precedence over this; only a real broken mechanism + zero render
  // errors trigger refuse/watermark.
  const mechanismProbe = await runRenderMechanismProbe(filePath);
  if (mechanismProbe.mechanism === 'broken' && isRenderStrictMode()) {
    reportBrokenMechanismToStderr(mechanismProbe.failures);
    return { exitCode: 2, outputPaths: [] };
  }

  let result;
  try {
    result = await headlessRender({
      scriptPath: filePath,
      viewportWidth: input.width,
      viewportHeight: input.height,
      views: ALL_VIEWS,
      baseUrl: input.baseUrl,
      hideReferenceImages: input.hideReferenceImages,
      environment: input.environment,
      noWatermark: input.noWatermark,
      objectFilter,
      inspectionChannels: requestedChannels,
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 1, outputPaths: [] };
  }

  if (requestedChannels.includes('rgb')) {
    await mkdir(rgbDir, { recursive: true });
  }
  if (requestedChannels.includes('mask')) {
    await mkdir(maskDir, { recursive: true });
  }
  if (requestedChannels.includes('depth')) {
    await mkdir(depthDir, { recursive: true });
  }
  if (requestedChannels.includes('normals')) {
    await mkdir(normalsDir, { recursive: true });
  }

  const channelPaths: Record<string, Record<string, string>> = {};
  const pngPaths: string[] = [];
  if (requestedChannels.includes('rgb')) {
    channelPaths.rgb = {};
    for (const view of ALL_VIEWS) {
      const buf = result.pngsByView[view];
      if (!buf) throw new Error(`renderInspectBundle: missing rgb view '${view}'`);
      const relativePath = `channels/rgb/${view}.png`;
      const outPath = join(outDir, relativePath);
      // Physics-loop watermark — only the RGB channel gets the
      // broken-mechanism overlay. Mask / depth / normals channels are
      // analytical data; rewriting them with a text overlay would
      // corrupt downstream tooling that reads object-ids out of mask
      // RGB or normalized depth out of the depth tile.
      const finalBuf = mechanismProbe.mechanism === 'broken'
        ? await watermarkBrokenMechanism(buf, mechanismProbe.failures)
        : buf;
      await writeFile(outPath, finalBuf);
      channelPaths.rgb[view] = relativePath;
      pngPaths.push(outPath);
    }
  }
  if (requestedChannels.includes('mask')) {
    channelPaths.mask = {};
    for (const view of ALL_VIEWS) {
      const buf = result.maskPngsByView?.[view];
      if (!buf) throw new Error(`renderInspectBundle: missing mask view '${view}'`);
      const relativePath = `channels/mask/${view}.png`;
      const outPath = join(outDir, relativePath);
      await writeFile(outPath, buf);
      channelPaths.mask[view] = relativePath;
      pngPaths.push(outPath);
    }
  }
  for (const channel of ['depth', 'normals'] as const) {
    if (!requestedChannels.includes(channel)) continue;
    channelPaths[channel] = {};
    for (const view of ALL_VIEWS) {
      const buf = result.inspectionPngsByChannel?.[channel]?.[view];
      if (!buf) throw new Error(`renderInspectBundle: missing ${channel} view '${view}'`);
      const relativePath = `channels/${channel}/${view}.png`;
      const outPath = join(outDir, relativePath);
      await writeFile(outPath, buf);
      channelPaths[channel][view] = relativePath;
      pngPaths.push(outPath);
    }
  }

  const channelMetadata = {
    ...(result.maskObjects !== undefined
      ? {
          mask: {
            encoding: 'object-id-rgb8',
            background: '#000000',
            objects: result.maskObjects,
          },
        }
      : {}),
    ...(result.inspectionChannelMetadata?.depth !== undefined
      ? { depth: result.inspectionChannelMetadata.depth }
      : {}),
    ...(result.inspectionChannelMetadata?.normals !== undefined
      ? { normals: result.inspectionChannelMetadata.normals }
      : {}),
  };

  const manifestPath = join(outDir, 'manifest.json');
  const manifest = {
    bundleVersion: 1,
    scriptPath: filePath,
    generatedAt: new Date().toISOString(),
    requestedChannels,
    emittedChannels: Object.keys(channelPaths),
    viewport: { width: input.width, height: input.height },
    views: [...ALL_VIEWS],
    bounds: result.bounds,
    command: {
      name: 'kernelcad render inspect',
      channels: requestedChannels,
    },
    ...(objectFilter !== undefined ? { filters: { object: objectFilter } } : {}),
    ...(result.objectVisibility !== undefined
      ? {
          objects: {
            visible: result.objectVisibility.visible,
            hidden: result.objectVisibility.hidden,
          },
        }
      : {}),
    ...(Object.keys(channelMetadata).length > 0 ? { channelMetadata } : {}),
    caveats: [
      'Channels are view-dependent and reflect the same camera, visibility filter, tail-feature filtering, and reference-image visibility used for RGB.',
      ...(requestedChannels.includes('mask')
        ? ['Mask channel colors are stable within this bundle only and resolved through channelMetadata.mask.objects.']
        : []),
      ...(requestedChannels.includes('depth')
        ? ['Depth is normalized linear camera depth packed into RGBA8; use channelMetadata.depth.near/far and ignore background sentinel pixels.']
        : []),
      ...(requestedChannels.includes('normals')
        ? ['Normals are rasterized view-space normals, not stable topology or analytic OCCT face identifiers.']
        : []),
    ],
    channels: channelPaths,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return { exitCode: 0, outputPaths: [manifestPath, ...pngPaths] };
}

export function renderCommand(): Command {
  const cmd = new Command('render')
    .description('Render a .kcad.ts script to multi-view PNG (front, right, top, iso)')
    // Without positional options, `render`'s own --width/--height/--focus/
    // --hide (composite mode) greedily claim the identically-named flags
    // written after `render inspect <file> <outDir>`, so the inspect
    // subcommand silently never received them (#394).
    .enablePositionalOptions();

  cmd
    .command('inspect')
    .description('Render a .kcad.ts script to an inspection bundle directory')
    .argument('<file>', 'path to .kcad.ts script')
    .argument('<outDir>', 'output inspection bundle directory')
    .option('--width <n>', 'per-tile width in pixels', (v) => parseInt(v, 10), 1024)
    .option('--height <n>', 'per-tile height in pixels', (v) => parseInt(v, 10), 1024)
    .option(
      '--base-url <url>',
      'studio dev server URL (run `npm run dev` first)',
      DEFAULT_RENDER_BASE_URL,
    )
    .option('--hide-reference-images', 'hide referenceImage() overlays in rendered output (default false)', false)
    .option(
      '--environment <preset|url|none>',
      "HDRI environment preset ('studio', 'softbox', 'neutral', 'outdoor', 'warehouse'), a custom URL/path, or 'none' to force the default three-light rig",
    )
    .option(
      '--no-watermark',
      'suppress the kernelCAD version badge in the bottom-right of the captured frame (clean hero artifacts)',
      false,
    )
    .option('--channels <list>', 'comma-separated inspection channels to emit (rgb, mask, depth, normals)')
    .option('--focus <names>', 'show only comma-separated feature ids or assembly part names')
    .option('--hide <names>', 'hide comma-separated feature ids or assembly part names')
    .action(async (file: string, outDir: string, opts: {
      width: number;
      height: number;
      baseUrl: string;
      hideReferenceImages: boolean;
      environment?: string;
      watermark: boolean;
      channels?: string;
      focus?: string;
      hide?: string;
    }) => {
      const r = await renderInspectBundle({
        file,
        outDir,
        width: opts.width,
        height: opts.height,
        baseUrl: opts.baseUrl,
        hideReferenceImages: opts.hideReferenceImages,
        environment: opts.environment,
        noWatermark: opts.watermark === false,
        channels: opts.channels ? [opts.channels] : undefined,
        focus: opts.focus ? [opts.focus] : undefined,
        hide: opts.hide ? [opts.hide] : undefined,
      });
      for (const p of r.outputPaths) console.log(`Wrote ${p}`);
      process.exitCode = r.exitCode;
    });

  cmd
    .argument('<file>', 'path to .kcad.ts script')
    .option('-o, --out <path>', 'output PNG path (composite mode) or stem with .png suffix (separate mode)')
    .option('--separate', 'emit four individual PNG files instead of a 2×2 composite', false)
    .option('--width <n>', 'per-tile width in pixels', (v) => parseInt(v, 10), 1024)
    .option('--height <n>', 'per-tile height in pixels', (v) => parseInt(v, 10), 1024)
    .option(
      '--base-url <url>',
      'studio dev server URL (run `npm run dev` first)',
      DEFAULT_RENDER_BASE_URL,
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
    .option('--focus <names>', 'show only comma-separated feature ids or assembly part names')
    .option('--hide <names>', 'hide comma-separated feature ids or assembly part names')
    .option(
      '--section <axis>=<pos>',
      'clip the model with a section plane, e.g. --section z=10 (keeps the negative-axis side; see --section-flip)',
    )
    .option('--section-flip', 'keep the positive-axis side of the section plane instead', false)
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
      focus?: string;
      hide?: string;
      section?: string;
      sectionFlip: boolean;
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
        focus: opts.focus ? [opts.focus] : undefined,
        hide: opts.hide ? [opts.hide] : undefined,
        section: opts.section,
        sectionFlip: opts.sectionFlip,
      });
      for (const p of r.outputPaths) console.log(`Wrote ${p}`);
      process.exitCode = r.exitCode;
    });
  return cmd;
}
