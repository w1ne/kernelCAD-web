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

/** Named render looks. 'default' is the engineering-review look every render
 *  has always used; 'publish' is the studio product shot. */
export const RENDER_PRESETS = ['default', 'publish'] as const;
export type RenderPreset = (typeof RENDER_PRESETS)[number];

/** Stage spec the page applies for a publish capture. */
export interface PublishStageSpec {
  /** '#rrggbb' opaque backdrop, or 'transparent' for an alpha PNG. */
  background: string;
  /** Soft contact shadow under the model. */
  shadow: boolean;
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
  view?: 'front' | 'right' | 'top' | 'iso';
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
  /** Supersampling factor cap and the largest canvas edge the page may
   *  allocate for it. 2× over MSAA is visually clean; a 2048 px tile
   *  renders on a 4096 px canvas. */
  maxSupersample: 2,
  maxCanvasEdge: 4096,
  /** Turntable frames render at 1× (MSAA only): a 1080² loop is 180
   *  frames, 4× the pixels per frame would not fit the capture deadline,
   *  and the video encode smooths edges anyway. */
  turntableSupersample: 1,
} as const;

/** Output sizes the publish path accepts (px, per edge). */
export const PUBLISH_MIN_SIZE = 64;
export const PUBLISH_MAX_SIZE = 2048;

/** Supersampling factor for a `width × height` output: the largest integer
 *  ≤ maxSupersample whose canvas stays within maxCanvasEdge. */
export function publishSupersample(width: number, height: number): number {
  const longest = Math.max(width, height);
  const fit = Math.floor(PUBLISH_PRESET.maxCanvasEdge / longest);
  return Math.max(1, Math.min(PUBLISH_PRESET.maxSupersample, fit));
}

const NAMED_BACKGROUNDS: Record<string, string> = {
  white: '#ffffff',
  light: '#f3f4f6',
  dark: '#1f2328',
  black: '#000000',
};

/** Normalise a background option: 'transparent', a named backdrop, or a
 *  '#rgb' / '#rrggbb' hex colour. Returns undefined for anything else. */
export function parsePublishBackground(raw: string | undefined): string | undefined {
  if (raw === undefined) return PUBLISH_PRESET.background;
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
  | { ok: true; publish: PublishStageSpec | undefined }
  | { ok: false; reason: PublishLookRefusal };

/** Resolve preset + background + shadow into the publish stage spec (or
 *  undefined for the engineering look). background and shadow are refused,
 *  not ignored, outside the 'publish' preset. One rule set for every
 *  surface that takes these options. */
export function resolvePublishLook(
  input: { preset?: string; background?: string; shadow?: boolean },
  defaultPreset: RenderPreset,
): PublishLookResolution {
  const preset = input.preset ?? defaultPreset;
  if (!(RENDER_PRESETS as readonly string[]).includes(preset)) return { ok: false, reason: 'unknown-preset' };
  if (preset !== 'publish') {
    if (input.background !== undefined || input.shadow !== undefined) return { ok: false, reason: 'look-without-publish' };
    return { ok: true, publish: undefined };
  }
  const background = parsePublishBackground(input.background);
  if (background === undefined) return { ok: false, reason: 'invalid-background' };
  return { ok: true, publish: { background, shadow: input.shadow ?? PUBLISH_PRESET.shadow } };
}

export const PUBLISH_BACKGROUND_HINT =
  "Pass background as 'white' (default), 'light', 'dark', 'black', 'transparent', or a hex colour like '#f5f5f0'.";

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
