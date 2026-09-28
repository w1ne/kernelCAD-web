// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/renderLook.ts
//
// `kernelcad render` look flags: `--preset`, `--background`, `--no-shadow`,
// `--width`, `--height`. The option rules are render_preview's
// (resolvePublishLook in src/shared/render/publishPreset.ts); this module
// only turns them into what headlessRender captures and words the refusals
// with CLI flag names. A bad combination exits 1 before the render surface
// is provisioned.

import { ALL_VIEWS, type RenderView } from '../../render/headlessRender';
import {
  PUBLISH_BACKGROUND_HINT,
  PUBLISH_MAX_SIZE,
  PUBLISH_MIN_SIZE,
  PUBLISH_PRESET,
  RENDER_PRESETS,
  resolvePublishLook,
  type PublishLookRefusal,
  type PublishStageSpec,
} from '../../../shared/render/publishPreset';
import type { RenderCliResult, RenderInput } from './render';

/** Default per-tile size of the engineering look. */
const DEFAULT_TILE_SIZE = 1024;

export interface RenderLook {
  publish: PublishStageSpec | undefined;
  /** Bare publish render: one hero shot instead of the four views. */
  hero: boolean;
  width: number;
  height: number;
  views: readonly RenderView[];
  poses: string[] | undefined;
}

export type RenderLookResolution = { ok: true; look: RenderLook } | { ok: false; result: RenderCliResult };

function refuse(message: string, hint: string): RenderLookResolution {
  console.error(`${message}\n  hint: ${hint}`);
  return { ok: false, result: { exitCode: 1, outputPaths: [] } };
}

function refuseLook(reason: PublishLookRefusal, input: RenderInput): RenderLookResolution {
  switch (reason) {
    case 'unknown-preset':
      return refuse(
        `render: unknown --preset '${String(input.preset)}'. Valid: ${RENDER_PRESETS.join(', ')}.`,
        'Pass --preset publish for a studio product shot, or omit --preset for the engineering look.',
      );
    case 'look-without-publish':
      return refuse(
        'render: --background and --no-shadow apply only to --preset publish.',
        'Add --preset publish, or drop --background/--no-shadow for the engineering look.',
      );
    case 'invalid-background':
      return refuse(
        `render: invalid --background '${String(input.background)}'.`,
        PUBLISH_BACKGROUND_HINT.replace(/^Pass background/, 'Pass --background'),
      );
  }
}

function publishLook(input: RenderInput, publish: PublishStageSpec): RenderLookResolution {
  const width = input.width ?? PUBLISH_PRESET.stillWidth;
  const height = input.height ?? PUBLISH_PRESET.stillHeight;
  const inRange = (n: number) => Number.isInteger(n) && n >= PUBLISH_MIN_SIZE && n <= PUBLISH_MAX_SIZE;
  if (!inRange(width) || !inRange(height)) {
    return refuse(
      `render: --preset publish needs --width/--height integers in [${PUBLISH_MIN_SIZE}, ${PUBLISH_MAX_SIZE}] (got ${width}×${height}).`,
      `Pass sizes in that range, or omit them for ${PUBLISH_PRESET.stillWidth}×${PUBLISH_PRESET.stillHeight}.`,
    );
  }
  // Same rule as render_preview: a bare publish render is one hero shot;
  // --separate (the four views) or --pose still work under the preset.
  const hero = !input.separate && (input.poses ?? []).length === 0;
  return {
    ok: true,
    look: {
      publish,
      hero,
      width,
      height,
      views: input.separate ? ALL_VIEWS : [],
      poses: hero ? [`${PUBLISH_PRESET.heroAzDeg},${PUBLISH_PRESET.heroElDeg}`] : input.poses,
    },
  };
}

/** Resolve the look flags into what the renderer captures. */
export function resolveRenderLook(input: RenderInput): RenderLookResolution {
  const resolved = resolvePublishLook(input, 'default');
  if (!resolved.ok) return refuseLook(resolved.reason, input);
  if (resolved.publish !== undefined) return publishLook(input, resolved.publish);
  return {
    ok: true,
    look: {
      publish: undefined,
      hero: false,
      width: input.width ?? DEFAULT_TILE_SIZE,
      height: input.height ?? DEFAULT_TILE_SIZE,
      views: ALL_VIEWS,
      poses: input.poses,
    },
  };
}
