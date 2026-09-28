// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/captureTurntableInput.ts
//
// Input validation for capture_animation's turntable mode
// ({ turntable: true }) — kept out of captureAnimation.ts so the timeline
// path stays readable. Every refusal is a typed cli.invalid-args with a
// hint; the tool turns it into its envelope.

import {
  PUBLISH_BACKGROUND_HINT,
  PUBLISH_MAX_SIZE,
  PUBLISH_MIN_SIZE,
  PUBLISH_PRESET,
  RENDER_PRESETS,
  parsePublishBackground,
  type PublishStageSpec,
  type RenderPreset,
} from '../../../shared/render/publishPreset';

export interface TurntableInputFields {
  turntable?: boolean;
  preset?: RenderPreset;
  width?: number;
  height?: number;
  duration_ms?: number;
  elevation_deg?: number;
  background?: string;
  shadow?: boolean;
  fps?: number;
  output_path?: string;
  frames_dir?: string;
  verify_every?: number;
}

export interface TurntableSettings {
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  elevationDeg: number;
  publish: PublishStageSpec | undefined;
}

export interface TurntableRefusal {
  message: string;
  hint: string;
}

/** Upper bound on one revolution's frame count (60 s at 30 fps). */
export const TURNTABLE_MAX_FRAMES = 1800;

const TURNTABLE_ONLY_FIELDS = ['preset', 'width', 'height', 'duration_ms', 'elevation_deg', 'background', 'shadow'] as const;

/** Timeline mode: the turntable-only fields are refused, not ignored. */
export function checkTimelineModeFields(input: TurntableInputFields): TurntableRefusal | undefined {
  const present = TURNTABLE_ONLY_FIELDS.filter((f) => input[f] !== undefined);
  if (present.length === 0) return undefined;
  return {
    message: `capture_animation: ${present.join(', ')} apply only to turntable mode.`,
    hint: 'Add turntable: true for a 360° orbit of the model, or drop those fields to capture the animationView timeline.',
  };
}

function checkSize(width: number, height: number, mp4: boolean): TurntableRefusal | undefined {
  const inRange = (n: number) => Number.isInteger(n) && n >= PUBLISH_MIN_SIZE && n <= PUBLISH_MAX_SIZE;
  if (!inRange(width) || !inRange(height)) {
    return {
      message: `capture_animation: turntable width/height must be integers in [${PUBLISH_MIN_SIZE}, ${PUBLISH_MAX_SIZE}] (got ${width}×${height}).`,
      hint: `Pass width and height between ${PUBLISH_MIN_SIZE} and ${PUBLISH_MAX_SIZE}, or omit them for ${PUBLISH_PRESET.turntableSize}×${PUBLISH_PRESET.turntableSize}.`,
    };
  }
  if (mp4 && (width % 2 !== 0 || height % 2 !== 0)) {
    return {
      message: `capture_animation: MP4 (H.264 yuv420p) needs even width/height (got ${width}×${height}).`,
      hint: 'Pass even width and height, or write a GIF / PNG sequence instead.',
    };
  }
  return undefined;
}

function checkTiming(durationMs: number, fps: number, elevationDeg: number): TurntableRefusal | undefined {
  if (!Number.isFinite(durationMs) || durationMs < 500 || durationMs > 60_000) {
    return { message: `capture_animation: duration_ms must be in [500, 60000] (got ${durationMs}).`, hint: 'One revolution of 4000-8000 ms reads well; omit duration_ms for 6000.' };
  }
  if (!Number.isFinite(fps) || fps <= 0 || fps > 60) {
    return { message: `capture_animation: turntable fps must be in (0, 60] (got ${fps}).`, hint: 'Use 30 fps for MP4, 15-20 fps for a small GIF.' };
  }
  if (Math.round((durationMs / 1000) * fps) > TURNTABLE_MAX_FRAMES) {
    return { message: `capture_animation: the turntable would exceed ${TURNTABLE_MAX_FRAMES} frames.`, hint: 'Lower duration_ms or fps.' };
  }
  if (!Number.isFinite(elevationDeg) || elevationDeg < -89 || elevationDeg > 89) {
    return { message: `capture_animation: elevation_deg must be in [-89, 89] (got ${elevationDeg}).`, hint: `Omit elevation_deg for the ${PUBLISH_PRESET.heroElDeg}° hero elevation.` };
  }
  return undefined;
}

function resolvePublish(input: TurntableInputFields, video: boolean): { publish: PublishStageSpec | undefined } | TurntableRefusal {
  const preset = input.preset ?? 'publish';
  if (!(RENDER_PRESETS as readonly string[]).includes(preset)) {
    return { message: `capture_animation: unknown preset '${String(preset)}'. Valid: ${RENDER_PRESETS.join(', ')}.`, hint: "Omit preset for the 'publish' studio look." };
  }
  if (preset !== 'publish') {
    if (input.background !== undefined || input.shadow !== undefined) {
      return { message: "capture_animation: background and shadow apply only to preset: 'publish'.", hint: 'Drop background/shadow, or omit preset.' };
    }
    return { publish: undefined };
  }
  const background = parsePublishBackground(input.background);
  if (background === undefined) {
    return { message: `capture_animation: invalid background '${String(input.background)}'.`, hint: PUBLISH_BACKGROUND_HINT };
  }
  if (background === 'transparent' && video) {
    return {
      message: 'capture_animation: a transparent background needs frames_dir (PNG sequence) — MP4 and GIF have no usable alpha.',
      hint: 'Pass frames_dir to keep alpha, or choose an opaque background.',
    };
  }
  return { publish: { background, shadow: input.shadow ?? PUBLISH_PRESET.shadow } };
}

/** Validate + default the turntable fields. */
export function resolveTurntableSettings(input: TurntableInputFields): TurntableSettings | TurntableRefusal {
  if (input.verify_every !== undefined) {
    return { message: 'capture_animation: verify_every applies to the animationView timeline, not a turntable.', hint: 'Drop verify_every in turntable mode.' };
  }
  const video = input.frames_dir === undefined;
  const mp4 = video && !/\.gif$/i.test(input.output_path ?? '');
  const width = input.width ?? PUBLISH_PRESET.turntableSize;
  const height = input.height ?? PUBLISH_PRESET.turntableSize;
  const sizeRefusal = checkSize(width, height, mp4);
  if (sizeRefusal) return sizeRefusal;
  const durationMs = input.duration_ms ?? PUBLISH_PRESET.turntableDurationMs;
  const fps = input.fps ?? PUBLISH_PRESET.turntableFps;
  const elevationDeg = input.elevation_deg ?? PUBLISH_PRESET.heroElDeg;
  const timingRefusal = checkTiming(durationMs, fps, elevationDeg);
  if (timingRefusal) return timingRefusal;
  const look = resolvePublish(input, video);
  if ('message' in look) return look;
  return { width, height, fps, durationMs, elevationDeg, publish: look.publish };
}
