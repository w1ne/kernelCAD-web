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

import { summarizeScene, unavailableSceneSummary, type SceneSummary } from '../../script-runtime/sceneSummary';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import {
  headlessRender,
  compositeSheet,
  ALL_VIEWS,
  SHEET_VIEWS,
  type HeadlessRenderOpts,
  type HeadlessRenderResult,
  type RenderView,
} from '../../render/headlessRender';
import { isRenderView } from '../../../shared/render/views';
import { resolveRenderBaseUrl, type ResolvedRenderBase } from '../../render/playerServer';
import {
  buildObjectFilter,
  isRenderStrictMode,
  parseSectionFlag,
  runRenderMechanismProbe,
  watermarkBrokenMechanism,
} from '../../cli/commands/render';
import { mechanismErrors } from '../../cli/lib/mechanismBanner';
import { overlayRefusalFor } from './renderPreviewOverlayRefusal';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { parseExplodeInput, type ParsedExplode } from '../../../modeling/runtime/explodedPoses';
import { loadScriptFeatures } from '../../../composition/scriptLoader';
import {
  PUBLISH_BACKGROUND_HINT,
  PUBLISH_PRESET,
  RENDER_PRESETS,
  resolvePublishLook,
  STUDIO_PRESET,
  type PublishStageSpec,
  type RenderPreset,
} from '../../../shared/render/publishPreset';
import {
  buildSurfaceQualityOverlay,
  SURFACE_QUALITY_OVERLAYS,
  type SurfaceQualityOverlay,
} from './surfaceQualityOverlay';
import {
  validateDisplaySurfaces,
  validateIndicatorStates,
  type DisplaySurfaceSpec,
  type IndicatorStateSpec,
  type ResolvedDisplaySurface,
  type ResolvedIndicatorState,
} from '../../../shared/render/displaySurface';
import { resolveDisplaySurfaceImages } from '../../render/displaySurfaceImages';

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
  /** Views to render; any of front/back/left/right/top/bottom/iso. Default:
   *  front/right/top/iso (all seven with `sheet`). Pass fewer for faster
   *  iteration (e.g. ['iso']). */
  views?: string[];
  /** Also write `sheet.png`: every rendered view tiled and labelled in one
   *  image, for a single-look check that nothing is missing from any side.
   *  With no `views`, renders all seven (adds back/left/bottom). */
  sheet?: boolean;
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
  /** Mesh shading: 'smooth' (kernel vertex normals, default) or 'flat'
   *  (face normals) to inspect tessellation / surface wobble. */
  shading?: 'smooth' | 'flat';
  /** Playwright screenshot deadline in ms. Default leaves Playwright's 30 s
   *  in place; raise it for heavy lofts on slow machines. */
  screenshot_timeout_ms?: number;
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
  /** Explode a multi-part assembly for the preview. `mode` defaults to
   *  `'mate-axis'`. Requires the script to return `assembly.model()` /
   *  `solvedModel()`. */
  explode?: { factor: number; mode?: 'radial' | 'mate-axis' };
  /** Surface-quality overlay: zebra stripes, curvature vertex colours, or
   *  continuity-class edge colours. Built as coloured STL bands and drawn
   *  through this same pipeline (FEA heatmap path). */
  overlay?: 'zebra' | 'curvature' | 'continuity';
  /** Render look. 'default' is the engineering-review look. 'publish' is a
   *  studio product shot for sharing: key/fill/rim lights + room IBL, soft
   *  contact shadow, clean backdrop (or transparent), supersampled
   *  anti-aliasing, 30° lens, auto-framed with margin, no watermark. 'studio'
   *  is the standard KernelCAD studio graphical render mode (4:3 still,
   *  studio lighting, AgX tone mapping, studio gradient backdrop). With
   *  no views/pose either studio preset renders ONE 'hero' image. */
  preset?: RenderPreset;
  /** 'publish' / 'studio' only: 'white', 'light', 'dark', 'black',
   *  'neutral', 'studio' (soft gradient), 'transparent' (PNG alpha), or a
   *  '#rrggbb' hex colour. */
  background?: string;
  /** 'publish' / 'studio' only: soft contact shadow under the model (default true). */
  shadow?: boolean;
  /** Display surfaces: textured planes seated on loaded part faces (real
   *  display PNGs on an OLED/LCD/e-paper module, a label, a decal). */
  displays?: DisplaySurfaceSpec[];
  /** Live / simulated LED and indicator emissive states (0 = off, 1 = full). */
  indicators?: IndicatorStateSpec[];
}

export interface RenderPreviewImage {
  /** A RenderView name, 'sheet', 'hero' or 'pose <az>,<el>'. */
  name: string;
  /** Absolute PNG path on the MCP server's filesystem. */
  path: string;
  /** What the camera shows — axis orientation in kernelCAD's Z-up frame. */
  description: string;
}

export interface RenderPreviewOutput {
  sceneSummary?: SceneSummary;
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
  /** Requested display parts whose textured plane was seated on a visible
   *  part. Present only when `displays` was passed. */
  displays_applied?: string[];
  /** Requested display parts that matched no visible part/feature, or whose
   *  face had no usable extent. A non-empty list fails the call: a texture
   *  that never landed must not be reported as rendered. */
  displays_missing?: string[];
  /** Requested indicator parts whose LED state was applied. */
  indicators_applied?: string[];
  /** Requested indicator parts that matched nothing — same rule as displays. */
  indicators_missing?: string[];
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
  back:
    'Rear elevation — camera on +Y looking at the model; screen right = -X, screen up = +Z.',
  left:
    'Left side elevation — camera on -X; screen right = -Y, screen up = +Z.',
  right:
    'Right side elevation — camera on +X; screen right = +Y, screen up = +Z.',
  bottom:
    'Geometric -Z underside — camera on -Z looking up; screen right = +X, screen up = -Y (the top view mirrored about X).',
  top:
    'Geometric +Z top-down plan — camera on +Z looking down; screen right = +X, screen up = +Y. For imported parts, this is not necessarily the product exterior.',
  iso:
    'Geometric Z-up three-quarter overview — camera in the (+X, -Y, +Z) octant. Product exterior versus underside depends on model orientation.',
};

/** Name of the labelled all-views image `sheet: true` adds. */
export const SHEET_IMAGE_NAME = 'sheet';
const SHEET_DESCRIPTION =
  'Inspection sheet — every rendered view tiled in one image, each labelled with its view name ' +
  '(see the per-view images for axis orientation). Check every tile, not just the overview.';

/** Name of the single image a bare studio-preset call renders. */
export const PUBLISH_HERO_NAME = 'hero';

function presetDefaults(preset: RenderPreset): typeof PUBLISH_PRESET | typeof STUDIO_PRESET {
  return preset === 'studio' ? STUDIO_PRESET : PUBLISH_PRESET;
}

function heroPose(preset: RenderPreset): string {
  const p = presetDefaults(preset);
  return `${p.heroAzDeg},${p.heroElDeg}`;
}

function heroDescription(preset: RenderPreset): string {
  const p = presetDefaults(preset);
  return (
    `Publish hero — 3/4 front-right product shot (az=${p.heroAzDeg}°, el=${p.heroElDeg}°), ` +
    'silhouette centred and auto-framed with margin; kernelCAD is Z-up.'
  );
}

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

function resolvePreviewSource(input: RenderPreviewInput, defaultViews: readonly RenderView[]):
  | { ok: true; hasCode: boolean; views: RenderView[] }
  | { ok: false; result: RenderPreviewOutput } {
  // --- Input validation: every refusal carries a registry code + hint. ---
  const hasCode = typeof input.code === 'string' && input.code.length > 0;
  const hasFile = typeof input.file === 'string' && input.file.length > 0;
  if (hasCode === hasFile) {
    return {
      ok: false,
      result: refusal(
        'cli.invalid-args',
        hasCode
          ? 'render_preview: code and file are mutually exclusive — pass exactly one.'
          : 'render_preview: pass { code } (inline script source) or { file } (path to a .kcad.ts script).',
        'Provide exactly one of { code } or { file }.',
      ),
    };
  }

  let views: RenderView[];
  if (input.views === undefined || input.views.length === 0) {
    views = [...defaultViews];
  } else {
    const invalid = input.views.filter(v => !isRenderView(v));
    if (invalid.length > 0) {
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          `render_preview: unknown view(s): ${invalid.join(', ')}. Valid views: ${SHEET_VIEWS.join(', ')}.`,
          `Pass views as a subset of [${SHEET_VIEWS.map(v => `'${v}'`).join(', ')}], or omit it for the default set.`,
        ),
      };
    }
    views = [...new Set(input.views)] as RenderView[];
  }
  return { ok: true, hasCode, views };
}

function resolvePreviewPreset(input: RenderPreviewInput):
  | { ok: true; preset: RenderPreset; publish: PublishStageSpec | undefined }
  | { ok: false; result: RenderPreviewOutput } {
  const look = resolvePublishLook(input, 'default');
  if (look.ok) return look;
  switch (look.reason) {
    case 'unknown-preset':
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          `render_preview: unknown preset '${String(input.preset)}'. Valid: ${RENDER_PRESETS.join(', ')}.`,
          "Pass preset: 'publish' or 'studio' for a studio product shot, or omit it for the engineering look.",
        ),
      };
    case 'look-without-publish':
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          "render_preview: background and shadow apply only to preset: 'publish' or 'studio'.",
          "Add preset: 'publish' or 'studio', or drop background/shadow for the engineering look.",
        ),
      };
    case 'invalid-background':
      return {
        ok: false,
        result: refusal('cli.invalid-args', `render_preview: invalid background '${String(input.background)}'.`, PUBLISH_BACKGROUND_HINT),
      };
  }
}

function resolvePreviewCamera(input: RenderPreviewInput):
  | { ok: true; pose: { az: number; el: number } | undefined }
  | { ok: false; result: RenderPreviewOutput } {
  let pose: { az: number; el: number } | undefined;
  if (input.pose !== undefined) {
    pose = parsePose(input.pose);
    if (pose === undefined) {
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          `render_preview: invalid pose '${input.pose}' (expected '<az>,<el>' in degrees, e.g. '30,20').`,
          "Pass pose as '<az>,<el>' degrees, e.g. pose: '30,20'.",
        ),
      };
    }
  }
  return { ok: true, pose };
}

function resolvePreviewFilter(input: RenderPreviewInput):
  | { ok: true; objectFilter: ReturnType<typeof buildObjectFilter> }
  | { ok: false; result: RenderPreviewOutput } {
  let objectFilter;
  try {
    objectFilter = buildObjectFilter({
      ...(input.focus !== undefined ? { focus: input.focus } : {}),
      ...(input.hide !== undefined ? { hide: input.hide } : {}),
    });
  } catch (e) {
    return {
      ok: false,
      result: refusal(
        'cli.invalid-args',
        e instanceof Error ? e.message.replace(/^render: /, 'render_preview: ') : String(e),
        'Pass only focus OR hide, not both.',
      ),
    };
  }
  return { ok: true, objectFilter };
}

function validDimension(value: number): boolean {
  return Number.isInteger(value) && value >= 64 && value <= 2048;
}

function defaultPreviewSize(preset: RenderPreset | undefined): { width: number; height: number } {
  if (preset === undefined || preset === 'default') return { width: 768, height: 768 };
  const defaults = presetDefaults(preset);
  return { width: defaults.stillWidth, height: defaults.stillHeight };
}

function resolvePreviewDimensions(input: RenderPreviewInput, preset: RenderPreset | undefined):
  | { ok: true; width: number; height: number }
  | { ok: false; result: RenderPreviewOutput } {
  const defaults = defaultPreviewSize(preset);
  const width = input.width ?? defaults.width;
  const height = input.height ?? defaults.height;
  if (!validDimension(width) || !validDimension(height)) {
    return {
      ok: false,
      result: refusal(
        'cli.invalid-args',
        `render_preview: width/height must be integers in [64, 2048] (got ${width}×${height}).`,
        `Pass width and height between 64 and 2048 pixels, or omit them for the ${defaults.width}×${defaults.height} default.`,
      ),
    };
  }
  return { ok: true, width, height };
}

function resolvePreviewGeometry(input: RenderPreviewInput):
  | {
      ok: true;
      explode: ParsedExplode | undefined;
      section: { axis: 'x' | 'y' | 'z'; position: number; positionRaw: string; flip: boolean } | undefined;
      overlay: SurfaceQualityOverlay | undefined;
    }
  | { ok: false; result: RenderPreviewOutput } {
  // Section plane: reuse the CLI's parseSectionFlag so positionRaw carries the
  // digits verbatim (stringifying the Number would emit exponent notation the
  // page-side `?section=` regex silently rejects → an unclipped render).
  let explode: ParsedExplode | undefined;
  if (input.explode !== undefined) {
    const parsed = parseExplodeInput(input.explode);
    if (!parsed.ok) {
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          `render_preview: ${parsed.message}`,
          "Pass explode as { factor: <number ≥ 0>, mode?: 'radial'|'mate-axis' }.",
        ),
      };
    }
    explode = parsed.value;
  }

  let section: { axis: 'x' | 'y' | 'z'; position: number; positionRaw: string; flip: boolean } | undefined;
  if (input.section !== undefined) {
    try {
      const parsed = parseSectionFlag(`${input.section.axis}=${input.section.position}`);
      section = { ...parsed, flip: input.section.flip ?? false };
    } catch {
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          `render_preview: invalid section ${JSON.stringify(input.section)} — axis must be 'x', 'y', or 'z' and position a finite decimal.`,
          "Pass section as { axis: 'x'|'y'|'z', position: <number>, flip?: boolean }, e.g. { axis: 'z', position: 10 }.",
        ),
      };
    }
  }

  let overlay: SurfaceQualityOverlay | undefined;
  if (input.overlay !== undefined) {
    if (!(SURFACE_QUALITY_OVERLAYS as readonly string[]).includes(input.overlay)) {
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          `render_preview: unknown overlay '${String(input.overlay)}'. Valid: ${SURFACE_QUALITY_OVERLAYS.join(', ')}.`,
          "Pass overlay as 'zebra', 'curvature', or 'continuity', or omit it for a plain render.",
        ),
      };
    }
    overlay = input.overlay;
  }
  return { ok: true, explode, section, overlay };
}

async function preparePreviewSession(input: RenderPreviewInput, hasCode: boolean):
  Promise<{ ok: true; outDir: string; scriptPath: string } | { ok: false; result: RenderPreviewOutput }> {
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
    return {
      ok: false,
      result: refusal(
        'cli.file-write',
        `render_preview: could not prepare the output directory: ${e instanceof Error ? e.message : String(e)}`,
        'Check that out_dir is writable, or omit it to use a temp session directory.',
      ),
    };
  }
  return { ok: true, outDir, scriptPath };
}

/** Validate `displays` / `indicators` and turn display images into data URLs
 *  (they resolve against the script's directory). */
async function resolvePreviewOverlays(input: RenderPreviewInput, scriptPath: string): Promise<
  | { ok: true; displays?: ResolvedDisplaySurface[]; indicators?: ResolvedIndicatorState[] }
  | { ok: false; result: RenderPreviewOutput }
> {
  const displayCheck = validateDisplaySurfaces(input.displays);
  if (!displayCheck.ok) {
    return { ok: false, result: refusal('cli.invalid-args', `render_preview: ${displayCheck.message}`, displayCheck.hint) };
  }
  const indicatorCheck = validateIndicatorStates(input.indicators);
  if (!indicatorCheck.ok) {
    return { ok: false, result: refusal('cli.invalid-args', `render_preview: ${indicatorCheck.message}`, indicatorCheck.hint) };
  }
  let displays: ResolvedDisplaySurface[] | undefined;
  if (displayCheck.displays.length > 0) {
    try {
      displays = await resolveDisplaySurfaceImages(displayCheck.displays, dirname(scriptPath));
    } catch (e) {
      return {
        ok: false,
        result: refusal(
          'cli.invalid-args',
          `render_preview: ${e instanceof Error ? e.message : String(e)}`,
          'Pass image as a PNG/JPEG/WebP path relative to the script, an absolute path, or a data:image/... URI.',
        ),
      };
    }
  }
  return {
    ok: true,
    ...(displays !== undefined ? { displays } : {}),
    ...(indicatorCheck.indicators.length > 0 ? { indicators: indicatorCheck.indicators } : {}),
  };
}

/** What a call captures when it names no views: the sheet's seven views,
 *  the publish hero (no views, one pose), or the canonical four. */function resolvePreviewShots(
  input: RenderPreviewInput,
  publish: PublishStageSpec | undefined,
): { hero: boolean; defaultViews: readonly RenderView[] } {
  if (input.sheet === true) return { hero: false, defaultViews: SHEET_VIEWS };
  if (publish === undefined) return { hero: false, defaultViews: ALL_VIEWS };
  const hero = (input.views ?? []).length === 0 && input.pose === undefined;
  return { hero, defaultViews: [] };
}

export async function renderPreviewTool(
  input: RenderPreviewInput,
  deps: RenderPreviewDeps = realDeps,
): Promise<RenderPreviewOutput> {
  const presetPhase = resolvePreviewPreset(input);
  if (!presetPhase.ok) return presetPhase.result;
  const { preset, publish } = presetPhase;

  const { hero, defaultViews } = resolvePreviewShots(input, publish);
  const source = resolvePreviewSource(input, defaultViews);
  if (!source.ok) return source.result;
  const { hasCode, views } = source;

  const camera = resolvePreviewCamera(hero ? { ...input, pose: heroPose(preset) } : input);
  if (!camera.ok) return camera.result;
  const { pose } = camera;

  const filter = resolvePreviewFilter(input);
  if (!filter.ok) return filter.result;
  const { objectFilter } = filter;

  const dimensions = resolvePreviewDimensions(input, preset);
  if (!dimensions.ok) return dimensions.result;
  const { width, height } = dimensions;

  const geometry = resolvePreviewGeometry(input);
  if (!geometry.ok) return geometry.result;
  const { explode, section, overlay } = geometry;

  const session = await preparePreviewSession(input, hasCode);
  if (!session.ok) return session.result;
  const { outDir, scriptPath } = session;

  const overlays = await resolvePreviewOverlays(input, scriptPath);
  if (!overlays.ok) return overlays.result;

  const work = renderPreviewWork({
    input, deps, scriptPath, outDir, views, pose, objectFilter, width, height, section, explode, overlay, publish, hero,
    heroDescription: hero ? heroDescription(preset) : undefined,
    displays: overlays.displays,
    indicators: overlays.indicators,
  });
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

type MechanismProbeResult = Awaited<ReturnType<RenderPreviewDeps['mechanismProbe']>>;

async function validateExplodeAssembly(
  explode: ParsedExplode | undefined,
  scriptPath: string,
): Promise<RenderPreviewOutput | undefined> {
  if (explode !== undefined) {
    try {
      const loaded = await loadScriptFeatures(scriptPath);
      if (loaded.session.assemblies.size === 0) {
        return refusal(
          'render.explode.no-assembly',
          'render_preview: explode requires the script to capture an assembly().',
          'Wrap each body in assembly().part(name, shape) and return arm.model() or arm.solvedModel(), then pass explode again.',
        );
      }
    } catch (e) {
      return refusal(
        'cli.script-exception',
        `render_preview: ${e instanceof Error ? e.message : String(e)}`,
        'Run evaluate_script on the same source to get per-feature diagnostics, fix the script, then re-render.',
      );
    }
  }
  return undefined;
}

// Physics-loop probe — identical protocol to the render CLI: strict mode
// refuses outright; otherwise broken mechanisms render watermarked.
// no_mechanism_check skips the probe for fast iteration on large
// assemblies (capture_animation precedent: full BREP sweeps can take tens
// of minutes) and honestly reports 'unverified' — but NEVER under strict
// mode, where the gate always runs.
async function probeMechanismGate(
  input: RenderPreviewInput,
  deps: RenderPreviewDeps,
  scriptPath: string,
): Promise<{ probe: MechanismProbeResult; failureCodes: string[] } | { refusal: RenderPreviewOutput }> {
  const skipProbe = input.no_mechanism_check === true && !isRenderStrictMode();
  const probe = skipProbe
    ? { mechanism: 'unverified' as const, failures: [] }
    : await deps.mechanismProbe(scriptPath);
  // Only error-severity entries make the verdict 'broken'; info/warn notes stay in `diagnostics`.
  const failureCodes = [...new Set(mechanismErrors(probe.failures).map(f => f.code))];
  if (probe.mechanism === 'broken' && isRenderStrictMode()) {
    return {
      refusal: {
        ...refusal(
          'cli.export-exception',
          `render_preview: MECHANISM BROKEN — render refused in strict mode (${failureCodes.join(', ')}).`,
          'Fix the mechanism failures (run validate / review_cad for detail), or unset KERNELCAD_RENDER_STRICT to render a watermarked preview.',
        ),
        mechanism: 'broken',
        mechanism_failure_codes: failureCodes,
        diagnostics: [...probe.failures],
      },
    };
  }
  return { probe, failureCodes };
}

async function buildOverlayScript(
  input: RenderPreviewInput,
  overlay: SurfaceQualityOverlay | undefined,
  scriptPath: string,
  outDir: string,
): Promise<{ renderScriptPath: string } | { refusal: RenderPreviewOutput }> {
  let renderScriptPath = scriptPath;
  if (overlay !== undefined) {
    const built = await buildSurfaceQualityOverlay({
      ...(input.file !== undefined ? { file: scriptPath } : { code: input.code }),
      overlay,
      outDir,
    });
    if (!built.ok) {
      return {
        refusal: refusal(
          built.errorCode ?? 'cli.export-exception',
          `render_preview overlay '${overlay}': ${built.error}`,
          'Run inspect({ of: \'continuity\' | \'curvature\' }) on the same source; the overlay is a picture of those numbers.',
        ),
      };
    }
    renderScriptPath = built.scriptPath;
  }
  return { renderScriptPath };
}

// Provision a render surface (static player preferred; see playerServer.ts).
async function resolveRenderBase(
  input: RenderPreviewInput,
  deps: RenderPreviewDeps,
): Promise<{ base: ResolvedRenderBase } | { refusal: RenderPreviewOutput }> {
  try {
    return { base: await deps.resolveBaseUrl(input.base_url) };
  } catch (e) {
    return {
      refusal: refusal(
        'cli.export-exception',
        `render_preview: ${e instanceof Error ? e.message : String(e)}`,
        'Run `npm run build:player` (in-repo) or reinstall the kernelcad package so dist/headless-player exists; alternatively start `npm run dev` or pass base_url.',
      ),
    };
  }
}

interface PreviewRenderRequest {
  renderScriptPath: string;
  views: RenderView[];
  pose?: { az: number; el: number };
  objectFilter: ReturnType<typeof buildObjectFilter>;
  width: number;
  height: number;
  section?: { axis: 'x' | 'y' | 'z'; position: number; positionRaw: string; flip: boolean };
  explode?: ParsedExplode;
  publish?: PublishStageSpec;
  displays?: readonly ResolvedDisplaySurface[];
  indicators?: readonly ResolvedIndicatorState[];
}

/** The renderer request for one preview: view/pose/dimension options plus the
 *  CLI overrides and the resolved display / indicator overlays. */
function previewRenderOptions(
  input: RenderPreviewInput,
  base: ResolvedRenderBase,
  req: PreviewRenderRequest,
  onBuild: NonNullable<HeadlessRenderOpts['onBuild']>,
): HeadlessRenderOpts {
  return {
    onBuild,
    scriptPath: req.renderScriptPath,
    viewportWidth: req.width,
    viewportHeight: req.height,
    views: req.views,
    ...(req.pose !== undefined ? { poses: [`${req.pose.az},${req.pose.el}`] } : {}),
    baseUrl: base.baseUrl,
    hideReferenceImages: false,
    objectFilter: req.objectFilter,
    ...(input.environment !== undefined ? { environment: input.environment } : {}),
    ...(input.shading !== undefined ? { shading: input.shading } : {}),
    ...(input.screenshot_timeout_ms !== undefined ? { screenshotTimeoutMs: input.screenshot_timeout_ms } : {}),
    ...(input.no_watermark === true ? { noWatermark: true } : {}),
    ...(req.section !== undefined ? { section: req.section } : {}),
    ...(req.explode !== undefined ? { explode: req.explode } : {}),
    ...(req.publish !== undefined ? { publish: req.publish } : {}),
    ...(req.displays !== undefined ? { displays: req.displays } : {}),
    ...(req.indicators !== undefined ? { indicators: req.indicators } : {}),
  };
}

async function runHeadlessRenderPhase(
  input: RenderPreviewInput,
  deps: RenderPreviewDeps,
  base: ResolvedRenderBase,
  opts: PreviewRenderRequest,
): Promise<{ result: HeadlessRenderResult; renderSource: ResolvedRenderBase['source']; sceneSummary: SceneSummary } | { refusal: RenderPreviewOutput }> {
  let result: HeadlessRenderResult;
  let sceneSummary = unavailableSceneSummary();
  try {
    result = await deps.render(previewRenderOptions(input, base, opts, (root) => { sceneSummary = summarizeScene(root); }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Model faults raised while building the scene (an import that will not read, parts that
    // overlap) are the script's to fix; only the rest points at the browser or render server.
    const isModelFault = /failed to compile|\blib\.\w+:|\boverlap by\b/.test(message);
    return {
      refusal: {
        sceneSummary,
        ...refusal(
          isModelFault ? 'cli.script-exception' : 'cli.export-exception',
          `render_preview: ${message}`,
          isModelFault
            ? 'Run evaluate_script on the same source to get per-feature diagnostics, fix the script, then re-render.'
            : 'Ensure playwright chromium is installed (npx playwright install chromium) and retry; pass base_url to use a running studio dev server instead.',
        ),
      },
    };
  } finally {
    await base.close().catch(() => undefined);
  }
  return { result, renderSource: base.source, sceneSummary };
}

// Write tiles; broken mechanisms get the same RGB watermark as the CLI.
async function writePreviewImages(
  outDir: string,
  views: RenderView[],
  result: HeadlessRenderResult,
  stamp: (buf: Buffer) => Promise<Buffer>,
  hero: { name: string; description: string } | undefined,
  sheet?: { width: number; height: number },
): Promise<{ images: RenderPreviewImage[] } | { refusal: RenderPreviewOutput }> {
  const images: RenderPreviewImage[] = [];
  try {
    if (sheet !== undefined && views.some(v => result.pngsByView[v] !== undefined)) {
      const path = join(outDir, `${SHEET_IMAGE_NAME}.png`);
      const tiles = Object.fromEntries(views.map(v => [v, result.pngsByView[v]]));
      await writeFile(path, await stamp(await compositeSheet(tiles, sheet.width, sheet.height)));
      images.push({ name: SHEET_IMAGE_NAME, path, description: SHEET_DESCRIPTION });
    }
    for (const view of views) {
      const buf = result.pngsByView[view];
      if (!buf) continue;
      const path = join(outDir, `${view}.png`);
      await writeFile(path, await stamp(buf));
      images.push({ name: view, path, description: VIEW_DESCRIPTIONS[view] });
    }
    for (const [poseKey, buf] of Object.entries(result.pngsByPose)) {
      if (hero !== undefined) {
        const path = join(outDir, `${PUBLISH_HERO_NAME}.png`);
        await writeFile(path, await stamp(buf));
        images.push({ name: PUBLISH_HERO_NAME, path, description: hero.description });
        continue;
      }
      const [az, el] = poseKey.split(',').map(s => s.trim());
      const path = join(outDir, `pose-${az}-${el}.png`);
      await writeFile(path, await stamp(buf));
      images.push({ name: `pose ${poseKey}`, path, description: poseDescription(Number(az), Number(el)) });
    }
  } catch (e) {
    return {
      refusal: refusal(
        'cli.file-write',
        `render_preview: could not write PNGs: ${e instanceof Error ? e.message : String(e)}`,
        'Check that out_dir is writable, or omit it to use a temp session directory.',
      ),
    };
  }
  return { images };
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
  explode?: ParsedExplode;
  overlay?: SurfaceQualityOverlay;
  publish?: PublishStageSpec;
  hero: boolean;
  heroDescription?: string;
  displays?: readonly ResolvedDisplaySurface[];
  indicators?: readonly ResolvedIndicatorState[];
}): Promise<RenderPreviewOutput> {
  const { input, deps, scriptPath, outDir, views, pose, objectFilter, width, height, section, explode, overlay, publish, hero, heroDescription: description, displays, indicators } = args;
  const t0 = Date.now();

  const explodeRefusal = await validateExplodeAssembly(explode, scriptPath);
  if (explodeRefusal !== undefined) return explodeRefusal;

  const gate = await probeMechanismGate(input, deps, scriptPath);
  if ('refusal' in gate) return gate.refusal;
  const { probe, failureCodes } = gate;

  const overlayPhase = await buildOverlayScript(input, overlay, scriptPath, outDir);
  if ('refusal' in overlayPhase) return overlayPhase.refusal;

  const basePhase = await resolveRenderBase(input, deps);
  if ('refusal' in basePhase) return basePhase.refusal;

  const renderPhase = await runHeadlessRenderPhase(input, deps, basePhase.base, {
    renderScriptPath: overlayPhase.renderScriptPath,
    views,
    pose,
    objectFilter,
    width,
    height,
    section,
    explode,
    publish,
    displays,
    indicators,
  });
  if ('refusal' in renderPhase) return renderPhase.refusal;
  const { result, renderSource, sceneSummary } = renderPhase;

  const stamp = async (buf: Buffer): Promise<Buffer> =>
    probe.mechanism === 'broken' ? watermarkBrokenMechanism(buf, probe.failures) : buf;
  const imagePhase = await writePreviewImages(
    outDir, views, result, stamp,
    hero ? { name: PUBLISH_HERO_NAME, description: description ?? '' } : undefined,
    input.sheet === true ? { width, height } : undefined,
  );
  if ('refusal' in imagePhase) return { ...imagePhase.refusal, sceneSummary };
  const { images } = imagePhase;

  const overlays = result.displayOverlays;
  const overlayRefusal = overlayRefusalFor(overlays);
  return {
    ok: overlayRefusal === undefined,
    images,
    out_dir: outDir,
    bounds: result.bounds,
    sceneSummary,
    mechanism: probe.mechanism,
    ...(probe.mechanism === 'broken' ? { mechanism_failure_codes: failureCodes } : {}),
    render_source: renderSource,
    render_ms: Date.now() - t0,
    ...(overlays !== undefined
      ? {
          displays_applied: overlays.displaysApplied,
          displays_missing: overlays.displaysMissing,
          indicators_applied: overlays.indicatorsApplied,
          indicators_missing: overlays.indicatorsMissing,
        }
      : {}),
    ...(overlayRefusal !== undefined ? { error: overlayRefusal.message, errorCode: overlayRefusal.code, errorHint: overlayRefusal.hint } : {}),
    diagnostics: [
      ...(probe.mechanism === 'broken' ? probe.failures : []),
      ...(overlayRefusal !== undefined ? [overlayRefusal] : []),
    ],
  };
}
