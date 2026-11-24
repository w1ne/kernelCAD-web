// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/render/publishPreset.ts
//
// The 'publish' render preset: a clean studio product shot for sharing a
// design (gallery tiles, social posts, README images, product pages).
// Single source of truth for the preset's parameters — the Node side
// (render_preview, capture_animation turntable) validates and forwards
// them, and the demo-player page (publishStage.ts) builds the stage from
// them. Pure data + pure helpers only: this module is imported by both the
// browser bundle and the CLI, so it must not touch three.js or Node APIs.

import type { RenderView } from './views';

/** Named render looks. 'default' is the engineering-review look every render
 *  has always used; 'publish' is the share-ready studio product shot; 'studio'
 *  is the standard KernelCAD studio graphical render mode (4:3, soft studio
 *  gradient backdrop, slightly higher hero camera). */
export const RENDER_PRESETS = ['default', 'publish', 'studio'] as const;
export type RenderPreset = (typeof RENDER_PRESETS)[number];

/** Stage spec the page applies for a publish / studio capture. */
export interface PublishStageSpec {
  /** '#rrggbb' opaque backdrop, 'studio' for the procedural sweep, or
   *  'transparent' for an alpha PNG. */
  background: string;
  /** Soft contact shadow under the model. */
  shadow: boolean;
  /** 'studio' enables AgX tone mapping, procedural Z-up softbox IBL, and
   *  directional self-shadowing; omitted / 'publish' keeps the legacy
   *  publish stage pixel-identical for committed catalog previews. */
  stage?: 'publish' | 'studio';
}

/** One publish frame request: camera + output size. The page renders at
 *  `width*supersample × height*supersample`; the Node side downsamples. */
export interface PublishFrameRequest {
  width: number;
  height: number;
  supersample: number;
  /** Fill margin of the silhouette fit (1.3 → the model's projected
   *  silhouette spans 1/1.3 ≈ 77% of the binding frame axis, ~11.5% air on
   *  each side of it). */
  margin: number;
  /** Camera direction. `view` snaps to a canonical engineering view;
   *  otherwise az/el in degrees (same convention as setRenderPose). */
  view?: RenderView;
  azDeg?: number;
  elDeg?: number;
  /** 'pose' fits the model for this az only; 'orbit' fits the worst case
   *  over a full 360° orbit at this elevation, so every turntable frame
   *  shares one camera distance (no zoom pumping). */
  fit?: 'pose' | 'orbit';
}

export interface PublishFrameCapture {
  pngDataUrl: string;
  /** Camera distance used (mm), for diagnostics and tests. */
  distance: number;
}

export const PUBLISH_PRESET = {
  /** 3/4 front-right hero: az=30° right of the front view, el=22° above
   *  the horizon (setRenderPose convention; kernelCAD is Z-up). */
  heroAzDeg: 30,
  heroElDeg: 22,
  margin: 1.3,
  background: '#ffffff',
  shadow: true,
  stillWidth: 1600,
  stillHeight: 1200,
  turntableSize: 1080,
  turntableDurationMs: 6000,
  turntableFps: 30,
  /** Supersampling factor cap and the largest canvas edge / area the page may
   *  allocate for it. Hosted SwiftShader runs are memory-capped: 2× over MSAA
   *  is visually clean, but 1600×1200 at 2× (3200×2400) was killed for OOM.
   *  The cap keeps both edges ≤ 2560 AND the supersampled area ≤ 2560×1920
   *  (1280×960 at 2×), so larger tiles use 1× plus WebGL MSAA. */
  maxSupersample: 2,
  maxCanvasEdge: 2560,
  maxCanvasArea: 2560 * 1920,
  /** Turntable frames render at 1× (MSAA only): a 1080² loop is 180
   *  frames, 4× the pixels per frame would not fit the capture deadline,
   *  and the video encode smooths edges anyway. */
  turntableSupersample: 1,
} as const;

/** Standard KernelCAD studio graphical render mode. Same capture machinery as
 *  'publish' (supersampled, auto-framed, no watermark) with a 4:3 still, a
 *  slightly higher 3/4 hero camera, more air around the silhouette, and the
 *  procedural studio-gradient backdrop. */
export const STUDIO_PRESET = {
  ...PUBLISH_PRESET,
  heroAzDeg: 32,
  heroElDeg: 24,
  margin: 1.28,
  background: 'studio',
  shadow: true,
  stillWidth: 1280,
  stillHeight: 960,
} as const;

/** Output sizes the publish path accepts (px, per edge). */
export const PUBLISH_MIN_SIZE = 64;
export const PUBLISH_MAX_SIZE = 2048;

/** Supersampling factor for a `width × height` output: the largest integer
 *  ≤ maxSupersample whose canvas stays within maxCanvasEdge AND maxCanvasArea. */
export function publishSupersample(width: number, height: number): number {
  const { maxSupersample, maxCanvasEdge, maxCanvasArea } = PUBLISH_PRESET;
  for (let factor = maxSupersample; factor > 1; factor--) {
    const longest = Math.max(width, height) * factor;
    if (longest <= maxCanvasEdge && width * height * factor * factor <= maxCanvasArea) return factor;
  }
  return 1;
}

const NAMED_BACKGROUNDS: Record<string, string> = {
  white: '#ffffff',
  light: '#f3f4f6',
  dark: '#1f2328',
  black: '#000000',
  neutral: '#e8ecf1',
  /** Sentinel: the page bakes a soft radial studio gradient sweep. */
  studio: 'studio',
};

/** Normalise a background option: 'transparent', a named backdrop, or a
 *  '#rgb' / '#rrggbb' hex colour. Returns undefined for anything else. */
export function parsePublishBackground(
  raw: string | undefined,
  fallback: string = PUBLISH_PRESET.background,
): string | undefined {
  if (raw === undefined) return fallback;
  const value = raw.trim().toLowerCase();
  if (value === 'transparent') return 'transparent';
  if (NAMED_BACKGROUNDS[value] !== undefined) return NAMED_BACKGROUNDS[value];
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return undefined;
}

/** Why a look request was refused. Each surface (render_preview,
 *  capture_animation, the CLI) words its own message for these. */
export type PublishLookRefusal = 'unknown-preset' | 'look-without-publish' | 'invalid-background';

export type PublishLookResolution =
  | { ok: true; preset: RenderPreset; publish: PublishStageSpec | undefined }
  | { ok: false; reason: PublishLookRefusal };

/** Resolve preset + background + shadow into the publish stage spec (or
 *  undefined for the engineering look). background and shadow are refused,
 *  not ignored, outside the 'publish' / 'studio' presets. One rule set for
 *  every surface that takes these options. */
export function resolvePublishLook(
  input: { preset?: string; background?: string; shadow?: boolean },
  defaultPreset: RenderPreset,
): PublishLookResolution {
  const rawPreset = input.preset ?? defaultPreset;
  if (!(RENDER_PRESETS as readonly string[]).includes(rawPreset)) return { ok: false, reason: 'unknown-preset' };
  const preset = rawPreset as RenderPreset;
  if (preset !== 'publish' && preset !== 'studio') {
    if (input.background !== undefined || input.shadow !== undefined) return { ok: false, reason: 'look-without-publish' };
    return { ok: true, preset, publish: undefined };
  }
  const defaults = preset === 'studio' ? STUDIO_PRESET : PUBLISH_PRESET;
  const background = parsePublishBackground(input.background, defaults.background);
  if (background === undefined) return { ok: false, reason: 'invalid-background' };
  const publish: PublishStageSpec = {
    background,
    shadow: input.shadow ?? defaults.shadow,
    ...(preset === 'studio' ? { stage: 'studio' as const } : {}),
  };
  return { ok: true, preset, publish };
}

export const PUBLISH_BACKGROUND_HINT =
  "Pass background as 'white', 'light', 'dark', 'black', 'neutral', 'studio' (soft studio gradient, the studio preset default), 'transparent', or a hex colour like '#f5f5f0'.";

/** Unit camera direction (target → camera) for an az/el pose. az=0,el=0 is
 *  the front view (camera on -Y); +az rotates CCW around +Z; +el lifts. */
export function poseCameraDir(azDeg: number, elDeg: number): [number, number, number] {
  const az = (azDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  const cosEl = Math.cos(el);
  return [Math.sin(az) * cosEl, -Math.cos(az) * cosEl, Math.sin(el)];
}

/** Azimuths (deg) of a seamless turntable loop: `frameCount` evenly spaced
 *  steps over 360°, starting at `startAzDeg`, EXCLUDING the 360° endpoint so
 *  the last frame flows into the first without a duplicated pose. */
export function turntableAzimuths(frameCount: number, startAzDeg: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < frameCount; i++) out.push(startAzDeg + (360 * i) / frameCount);
  return out;
}
