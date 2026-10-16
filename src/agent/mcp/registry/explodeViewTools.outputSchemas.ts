// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const EXPLODE_VIEW_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  explode_view: {
    type: 'object', properties: {
      ok: { type: 'boolean' },
      order: { type: 'array', items: { type: 'string' } },
      durationMs: { type: 'number' },
      tracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      reverseTracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      param_declarations: { type: 'string', description: 'Ready-to-paste param() calls that declare every animation track parameter with its initial value.' },
      script_fragment: { type: 'string', description: 'Ready-to-paste declarations and forward animationView() call.' },
      animation_tracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      reverse_animation_tracks: { type: 'array', items: { type: 'object', additionalProperties: true } },
      part_transforms: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part expressions to apply to existing shapes before assembly.part().' },
      cameraPlan: { type: 'object', additionalProperties: true, description: 'Suggested target and camera distance for assembled/exploded capture framing; camera keyframes are guidance and are not consumed by animationView.' },
      warnings: { type: 'array', items: { type: 'string' } },
      playback: { type: 'string' },
    }, required: ['ok', 'order', 'durationMs', 'tracks', 'reverseTracks', 'warnings', 'cameraPlan'], additionalProperties: false,
  },
};
