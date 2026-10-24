// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { buildExplodeTimeline, type ExplodePartInput } from '../../../modeling/animation/explodeTimeline';

export interface ExplodeViewInput {
  parts?: ExplodePartInput[];
  assembly_order?: string[];
  mode?: 'axis' | 'radial';
  axis?: [number, number, number];
  spacing?: number;
  duration_ms?: number;
}

function timelineOptions(input: ExplodeViewInput) {
  return {
    ...(input.assembly_order ? { order: input.assembly_order } : {}),
    ...(input.axis ? { axis: input.axis } : {}),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(input.spacing !== undefined ? { spacing: input.spacing } : {}),
    ...(input.duration_ms !== undefined ? { durationMs: input.duration_ms } : {}),
  };
}

export function explodeViewTool(input: ExplodeViewInput) {
  const parts = input.parts;
  if (!Array.isArray(parts) || parts.length === 0) throw new Error('Provide parts with name, center and size in mm.');
  const timeline = buildExplodeTimeline(parts, timelineOptions(input));
  const paramBindings = timeline.tracks.map((track, index) => ({ track, binding: `explodeParam${index + 1}` }));
  const paramDeclarations = paramBindings.map(({ track, binding }) =>
    `const ${binding} = param(${JSON.stringify(track.param)}, 0, { min: 0, max: 1, description: ${JSON.stringify(`Exploded-view translation factor for ${track.part}`)} });`,
  ).join('\n');
  const animationTracks = timeline.tracks.map((track) => ({ param: track.param, keys: track.keys }));
  const reverseAnimationTracks = timeline.reverseTracks.map((track) => ({ param: track.param, keys: track.keys }));
  const partTransforms = paramBindings.map(({ track, binding }) => ({
    part: track.part,
    expression: `existingShape.translate(${track.offset.map((component) => `${binding}.multiply(${component})`).join(', ')})`,
  }));
  return {
    ok: true,
    ...timeline,
    warnings: timeline.warnings,
    param_declarations: paramDeclarations,
    script_fragment: `${paramDeclarations}\nanimationView({ name: 'Exploded view — assembly', tracks: ${JSON.stringify(animationTracks, null, 2)} });`,
    animation_tracks: animationTracks,
    reverse_animation_tracks: reverseAnimationTracks,
    part_transforms: partTransforms,
    playback: 'Use param_declarations once in the model script. Apply each part transform expression to the existing shape before passing it to assembly.part(). Paste script_fragment for the forward assembly timeline, or use reverse_animation_tracks for disassembly. Studio Animation and capture_animation consume the declared animationView timeline.',
  };
}
