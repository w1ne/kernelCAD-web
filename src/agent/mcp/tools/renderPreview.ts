// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/renderPreview.ts
//
// MCP `render_preview` tool (#440) — first-class inline visual feedback for
// agents: { code | file } → deterministic PNG views on disk, NO studio /
// dev-server precondition. This closes the agent loop evaluate → render →
// LOOK → fix entirely in-band.
//
// REUSE, NOT A NEW RENDERER: the pixels come from the exact same pipeline as
// `kernelcad render` / `kernelcad render inspect` — Node-side OCCT meshing +
// the DemoPlayerPage bridge driven by headless chromium (headlessRender.ts).
// What #440 adds is provisioning: resolveRenderBaseUrl() serves the prebuilt
// static player (dist/headless-player) from an ephemeral 127.0.0.1 port, so
// no `npm run dev` is needed (playerServer.ts). A live dev server is still
// honored as a fallback lane, and { base_url } forces one explicitly.
//
// PHYSICS-LOOP PARITY: the same mechanism-truth probe and broken-mechanism
// protocol as the render CLI (render.ts): broken + KERNELCAD_RENDER_STRICT
// refuses; broken otherwise still renders, with every RGB tile watermarked
// "MECHANISM BROKEN". Never weakened here — a preview that hides brokenness
// would defeat the visual-inspection mandate.
//
// LOCAL-PATH CONTRACT: returned image paths live on the MCP server's
// filesystem. Local stdio clients (Claude Code, Cursor, ...) read them
// directly; HOSTED clients (remote MCP) should use `open_in_studio` instead.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import {
  headlessRender,
  ALL_VIEWS,
  type HeadlessRenderOpts,
  type HeadlessRenderResult,
  type RenderView,
} from '../../render/headlessRender';
import { resolveRenderBaseUrl, type ResolvedRenderBase } from '../../render/playerServer';
import {
  buildObjectFilter,
  isRenderStrictMode,
  parseSectionFlag,
  runRenderMechanismProbe,
  watermarkBrokenMechanism,
} from '../../cli/commands/render';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

/** Generous request/response deadline for one preview (5 minutes — a cold
 *  render is ~20-30 s; the deadline only catches a wedged browser). */
export const RENDER_PREVIEW_TIMEOUT_MS = 5 * 60 * 1000;

export interface RenderPreviewInput {
  /** Inline kernelCAD script source. Mutually exclusive with file. NOTE:
   *  relative imports (e.g. lib.fromSTEP('./servo.step')) resolve against a
   *  temp directory in code mode — pass { file } for scripts with relative
   *  asset imports. */
  code?: string;
  /** Path to a .kcad.ts script on disk. Mutually exclusive with code. */
  file?: string;
  /** Canonical views to render; subset of front/right/top/iso. Default: all
   *  four. Pass fewer for faster iteration (e.g. ['iso']). */
  views?: string[];
  /** Extra arbitrary camera pose "az,el" in degrees (az=0,el=0 is front,
   *  +az rotates CCW around Z, +el lifts the camera). */
  pose?: string;
  /** Show only matching feature ids / assembly part names. Mutually
   *  exclusive with hide. */
  focus?: string[];
  /** Hide matching feature ids / assembly part names. Mutually exclusive
   *  with focus. */
  hide?: string[];
  /** Directory the PNGs are written into. Default: a fresh temp session dir
   *  (os tmpdir / kernelcad-preview-*). */
  out_dir?: string;
  /** Per-view tile width in px (default 768). */
  width?: number;
  /** Per-view tile height in px (default 768). */
  height?: number;
  /** HDRI environment override: preset key (studio/softbox/neutral/outdoor/
   *  warehouse), URL, or 'none' for the default three-light rig. */
  environment?: string;
  /** Suppress the kernelCAD version watermark. */
  no_watermark?: boolean;
  /** Skip the mechanism-truth probe (it can dominate latency on large
   *  assemblies — full BREP interference sweeps). The preview then reports
   *  mechanism: 'unverified'. IGNORED under KERNELCAD_RENDER_STRICT=1: the
   *  strict gate always probes and refuses broken mechanisms. */
  no_mechanism_check?: boolean;
  /** Advanced: force a specific render server base URL (e.g. a running
   *  studio dev server) instead of the bundled static player. */
  base_url?: string;
  /** Cut the model with a single axis-aligned section plane so the captures
   *  show interior structure (wall thickness, pockets, whether a bore runs
   *  through) instead of only the outer shell. `position` is in mm along the
   *  axis in kernelCAD's Z-up frame; `flip` keeps the positive-axis side
   *  (default keeps the negative-axis side). */
  section?: { axis: 'x' | 'y' | 'z'; position: number; flip?: boolean };
}

export interface RenderPreviewImage {
  /** 'front' | 'right' | 'top' | 'iso' | 'pose <az>,<el>' */
  name: string;
  /** Absolute PNG path on the MCP server's filesystem. */
  path: string;
  /** What the camera shows — axis orientation in kernelCAD's Z-up frame. */
  description: string;
}

export interface RenderPreviewOutput {
  ok: boolean;
  images: RenderPreviewImage[];
  /** Directory holding the PNGs (session temp dir unless out_dir given). */
  out_dir?: string;
  /** Model AABB in mm (the same bounds the camera was fit to). */
  bounds?: { min: [number, number, number]; max: [number, number, number] };
  /** Mechanism-truth verdict: 'real' (verified clean), 'broken' (tiles are
   *  watermarked MECHANISM BROKEN), 'unverified' (no assembly / probe
   *  skipped). */
  mechanism?: 'real' | 'broken' | 'unverified';
  /** De-duplicated failure codes when mechanism === 'broken'. */
  mechanism_failure_codes?: string[];
  /** Which lane served the render: bundled static player, live dev server,
   *  or an explicit base_url. */
  render_source?: 'static-player' | 'dev-server' | 'explicit';
  /** Wall-clock render time in ms (provisioning + browser + captures). */
  render_ms?: number;
  diagnostics: CompilerDiagnostic[];
  error?: string;
  errorCode?: string;
  errorHint?: string;
}

/** Per-view camera orientation, phrased for an agent that needs to map
 *  pixels back to model coordinates (kernelCAD is Z-up). Derived from
 *  DemoPlayerPage's setRenderView camera math — keep in sync. */
export const VIEW_DESCRIPTIONS: Record<RenderView, string> = {
  front:
    'Front elevation — camera on -Y looking at the model; screen right = +X, screen up = +Z.',
  right:
    'Right side elevation — camera on +X; screen right = +Y, screen up = +Z.',
  top:
    'Geometric +Z top-down plan — camera on +Z looking down; screen right = +X, screen up = +Y. For imported parts, this is not necessarily the product exterior.',
  iso:
    'Geometric Z-up three-quarter overview — camera in the (+X, -Y, +Z) octant. Product exterior versus underside depends on model orientation.',
};

function poseDescription(az: number, el: number): string {
  return (
    `Custom pose az=${az}°, el=${el}° — az=0,el=0 is the front view, ` +
    '+az rotates the camera CCW around +Z, +el lifts it above the horizon.'
  );
}

/** Injectable seams for unit tests (no real chromium / static server). */
export interface RenderPreviewDeps {
  render: (opts: HeadlessRenderOpts) => Promise<HeadlessRenderResult>;
  resolveBaseUrl: (explicit?: string) => Promise<ResolvedRenderBase>;
  mechanismProbe: typeof runRenderMechanismProbe;
}

const realDeps: RenderPreviewDeps = {
  render: headlessRender,
  resolveBaseUrl: resolveRenderBaseUrl,
  mechanismProbe: runRenderMechanismProbe,
};

function refusal(code: string, message: string, hint: string): RenderPreviewOutput {
  const diagnostic: CompilerDiagnostic = {
    target: 'export-occt',
    code: code as CompilerDiagnostic['code'],
    severity: 'error',
    message,
    hint,
  };
  return {
    ok: false,
    images: [],
    diagnostics: [diagnostic],
    error: message,
    errorCode: code,
    errorHint: hint,
  };
}

function parsePose(raw: string): { az: number; el: number } | undefined {
  const [azStr, elStr, rest] = raw.split(',').map(s => s.trim());
  const az = Number(azStr);
  const el = Number(elStr);
  if (rest !== undefined || !Number.isFinite(az) || !Number.isFinite(el)) return undefined;
  return { az, el };
}

export async function renderPreviewTool(
  input: RenderPreviewInput,
  deps: RenderPreviewDeps = realDeps,
): Promise<RenderPreviewOutput> {
  // --- Input validation: every refusal carries a registry code + hint. ---
  const hasCode = typeof input.code === 'string' && input.code.length > 0;
  const hasFile = typeof input.file === 'string' && input.file.length > 0;
  if (hasCode === hasFile) {
    return refusal(
      'cli.invalid-args',
      hasCode
        ? 'render_preview: code and file are mutually exclusive — pass exactly one.'
        : 'render_preview: pass { code } (inline script source) or { file } (path to a .kcad.ts script).',
      'Provide exactly one of { code } or { file }.',
    );
  }

  let views: RenderView[];
  if (input.views === undefined || input.views.length === 0) {
    views = [...ALL_VIEWS];
  } else {
    const invalid = input.views.filter(v => !(ALL_VIEWS as readonly string[]).includes(v));
    if (invalid.length > 0) {
      return refusal(
        'cli.invalid-args',
        `render_preview: unknown view(s): ${invalid.join(', ')}. Valid views: ${ALL_VIEWS.join(', ')}.`,
        "Pass views as a subset of ['front', 'right', 'top', 'iso'], or omit it for all four.",
      );
    }
    views = [...new Set(input.views)] as RenderView[];
  }

  let pose: { az: number; el: number } | undefined;
  if (input.pose !== undefined) {
    pose = parsePose(input.pose);
    if (pose === undefined) {
      return refusal(
        'cli.invalid-args',
        `render_preview: invalid pose '${input.pose}' (expected '<az>,<el>' in degrees, e.g. '30,20').`,
        "Pass pose as '<az>,<el>' degrees, e.g. pose: '30,20'.",
      );
    }
  }

  let objectFilter;
  try {
    objectFilter = buildObjectFilter({
      ...(input.focus !== undefined ? { focus: input.focus } : {}),
      ...(input.hide !== undefined ? { hide: input.hide } : {}),
    });
  } catch (e) {
    return refusal(
      'cli.invalid-args',
      e instanceof Error ? e.message.replace(/^render: /, 'render_preview: ') : String(e),
      'Pass only focus OR hide, not both.',
    );
  }

  const width = input.width ?? 768;
  const height = input.height ?? 768;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64 || width > 2048 || height > 2048) {
    return refusal(
      'cli.invalid-args',
      `render_preview: width/height must be integers in [64, 2048] (got ${width}×${height}).`,
      'Pass width and height between 64 and 2048 pixels, or omit them for the 768×768 default.',
    );
  }

  // Section plane: reuse the CLI's parseSectionFlag so positionRaw carries the
  // digits verbatim (stringifying the Number would emit exponent notation the
  // page-side `?section=` regex silently rejects → an unclipped render).
  let section: { axis: 'x' | 'y' | 'z'; position: number; positionRaw: string; flip: boolean } | undefined;
  if (input.section !== undefined) {
    try {
      const parsed = parseSectionFlag(`${input.section.axis}=${input.section.position}`);
      section = { ...parsed, flip: input.section.flip ?? false };
    } catch {
      return refusal(
        'cli.invalid-args',
        `render_preview: invalid section ${JSON.stringify(input.section)} — axis must be 'x', 'y', or 'z' and position a finite decimal.`,
        "Pass section as { axis: 'x'|'y'|'z', position: <number>, flip?: boolean }, e.g. { axis: 'z', position: 10 }.",
      );
    }
  }

  // --- Session dir + code-mode temp script. ---
  let outDir: string;
  let scriptPath: string;
  try {
    if (input.out_dir !== undefined && input.out_dir !== '') {
      outDir = resolve(input.out_dir);
      await mkdir(outDir, { recursive: true });
    } else {
      outDir = await mkdtemp(join(tmpdir(), 'kernelcad-preview-'));
    }
    if (hasCode) {
      scriptPath = join(outDir, 'model.kcad.ts');
      await writeFile(scriptPath, input.code!, 'utf8');
    } else {
      scriptPath = isAbsolute(input.file!) ? input.file! : resolve(input.file!);
    }
  } catch (e) {
    return refusal(
      'cli.file-write',
      `render_preview: could not prepare the output directory: ${e instanceof Error ? e.message : String(e)}`,
      'Check that out_dir is writable, or omit it to use a temp session directory.',
    );
  }

  const work = renderPreviewWork({ input, deps, scriptPath, outDir, views, pose, objectFilter, width, height, section });
  // Swallow the losing chain's rejection if the timeout wins (same pattern as
  // capture_animation) so it never surfaces as an unhandled rejection.
  work.catch(() => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<RenderPreviewOutput>(res => {
    timer = setTimeout(
      () =>
        res(
          refusal(
            'cli.export-exception',
            `render_preview: the render did not finish within ${Math.round(RENDER_PREVIEW_TIMEOUT_MS / 60000)} minutes and was abandoned.`,
            'Reduce the number of views, check that playwright chromium is installed (npx playwright install chromium), then retry.',
          ),
        ),
      RENDER_PREVIEW_TIMEOUT_MS,
    );
    timer.unref?.();
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function renderPreviewWork(args: {
  input: RenderPreviewInput;
  deps: RenderPreviewDeps;
  scriptPath: string;
  outDir: string;
  views: RenderView[];
  pose?: { az: number; el: number };
  objectFilter: ReturnType<typeof buildObjectFilter>;
  width: number;
  height: number;
  section?: { axis: 'x' | 'y' | 'z'; position: number; positionRaw: string; flip: boolean };
}): Promise<RenderPreviewOutput> {
  const { input, deps, scriptPath, outDir, views, pose, objectFilter, width, height, section } = args;
  const t0 = Date.now();

  // Physics-loop probe — identical protocol to the render CLI: strict mode
  // refuses outright; otherwise broken mechanisms render watermarked.
  // no_mechanism_check skips the probe for fast iteration on large
  // assemblies (capture_animation precedent: full BREP sweeps can take tens
  // of minutes) and honestly reports 'unverified' — but NEVER under strict
  // mode, where the gate always runs.
  const skipProbe = input.no_mechanism_check === true && !isRenderStrictMode();
  const probe = skipProbe
    ? { mechanism: 'unverified' as const, failures: [] }
    : await deps.mechanismProbe(scriptPath);
  const failureCodes = [...new Set(probe.failures.map(f => f.code))];
  if (probe.mechanism === 'broken' && isRenderStrictMode()) {
    return {
      ...refusal(
        'cli.export-exception',
        `render_preview: MECHANISM BROKEN — render refused in strict mode (${failureCodes.join(', ')}).`,
        'Fix the mechanism failures (run validate / review_cad for detail), or unset KERNELCAD_RENDER_STRICT to render a watermarked preview.',
      ),
      mechanism: 'broken',
      mechanism_failure_codes: failureCodes,
      diagnostics: [...probe.failures],
    };
  }

  // Provision a render surface (static player preferred; see playerServer.ts).
  let base: ResolvedRenderBase;
  try {
    base = await deps.resolveBaseUrl(input.base_url);
  } catch (e) {
    return refusal(
      'cli.export-exception',
      `render_preview: ${e instanceof Error ? e.message : String(e)}`,
      'Run `npm run build:player` (in-repo) or reinstall the kernelcad package so dist/headless-player exists; alternatively start `npm run dev` or pass base_url.',
    );
  }

  let result: HeadlessRenderResult;
  try {
    result = await deps.render({
      scriptPath,
      viewportWidth: width,
      viewportHeight: height,
      views,
      ...(pose !== undefined ? { poses: [`${pose.az},${pose.el}`] } : {}),
      baseUrl: base.baseUrl,
      hideReferenceImages: false,
      ...(input.environment !== undefined ? { environment: input.environment } : {}),
      ...(input.no_watermark === true ? { noWatermark: true } : {}),
      ...(objectFilter !== undefined ? { objectFilter } : {}),
      ...(section !== undefined ? { section } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isModelFault = /failed to compile/.test(message);
    return refusal(
      isModelFault ? 'cli.script-exception' : 'cli.export-exception',
      `render_preview: ${message}`,
      isModelFault
        ? 'Run evaluate_script on the same source to get per-feature diagnostics, fix the script, then re-render.'
        : 'Ensure playwright chromium is installed (npx playwright install chromium) and retry; pass base_url to use a running studio dev server instead.',
    );
  } finally {
    await base.close().catch(() => undefined);
  }

  // Write tiles; broken mechanisms get the same RGB watermark as the CLI.
  const stamp = async (buf: Buffer): Promise<Buffer> =>
    probe.mechanism === 'broken' ? watermarkBrokenMechanism(buf, probe.failures) : buf;
  const images: RenderPreviewImage[] = [];
  try {
    for (const view of views) {
      const buf = result.pngsByView[view];
      if (!buf) continue;
      const path = join(outDir, `${view}.png`);
      await writeFile(path, await stamp(buf));
      images.push({ name: view, path, description: VIEW_DESCRIPTIONS[view] });
    }
    for (const [poseKey, buf] of Object.entries(result.pngsByPose)) {
      const [az, el] = poseKey.split(',').map(s => s.trim());
      const path = join(outDir, `pose-${az}-${el}.png`);
      await writeFile(path, await stamp(buf));
      images.push({ name: `pose ${poseKey}`, path, description: poseDescription(Number(az), Number(el)) });
    }
  } catch (e) {
    return refusal(
      'cli.file-write',
      `render_preview: could not write PNGs: ${e instanceof Error ? e.message : String(e)}`,
      'Check that out_dir is writable, or omit it to use a temp session directory.',
    );
  }

  return {
    ok: true,
    images,
    out_dir: outDir,
    bounds: result.bounds,
    mechanism: probe.mechanism,
    ...(probe.mechanism === 'broken' ? { mechanism_failure_codes: failureCodes } : {}),
    render_source: base.source,
    render_ms: Date.now() - t0,
    diagnostics: probe.mechanism === 'broken' ? [...probe.failures] : [],
  };
}
