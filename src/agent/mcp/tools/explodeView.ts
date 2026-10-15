// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { buildExplodeTimeline, type ExplodePartInput } from '../../../modeling/animation/explodeTimeline';

export interface ExplodeViewInput {
  parts?: ExplodePartInput[];
  assembly_order?: string[];
  handoff?: { parts?: Array<{ ref?: string; position_mm?: { value?: number[] }; bbox_mm?: { value?: number[] }; physical?: { bbox_mm?: number[] } }>; assembly_order?: string[]; assembly?: { order?: string[] } };
  mode?: 'axis' | 'radial';
  axis?: [number, number, number];
  spacing?: number;
  duration_ms?: number;
}

type HandoffPart = NonNullable<NonNullable<ExplodeViewInput['handoff']>['parts']>[number];

function hasUsableHandoffGeometry(part: HandoffPart): part is HandoffPart & {
  ref: string;
  position_mm: { value: number[] };
  physical?: { bbox_mm: number[] };
  bbox_mm?: { value: number[] };
} {
  const center = part.position_mm?.value;
  const size = part.bbox_mm?.value ?? part.physical?.bbox_mm;
  return Boolean(
    part.ref && center && size && center.length >= 2 && size.length >= 3 &&
    center.slice(0, 3).every(Number.isFinite) && size.slice(0, 3).every((value) => Number.isFinite(value) && value > 0),
  );
}

function mapHandoffPart(part: HandoffPart, skipped: string[]): ExplodePartInput[] {
  if (!hasUsableHandoffGeometry(part)) {
    skipped.push(part.ref ?? '(unnamed)');
    return [];
  }
  const center = part.position_mm?.value;
  const size = part.bbox_mm?.value ?? part.physical?.bbox_mm;
  const bboxSize = size!.slice(0, 3) as [number, number, number];
  // LabWired's 2D board placements are measured on the board's top plane.
  // Treat that point as the bbox footprint center and lift the bbox center
  // by half its height; preserve explicit 3D positions as already centered.
  const centerZ = center[2] ?? bboxSize[2] / 2;
  return [{ name: part.ref, center: [center[0]!, center[1]!, centerZ], size: bboxSize }];
}

function resolveParts(input: ExplodeViewInput, skipped: string[]): ExplodePartInput[] | undefined {
  return input.parts ?? input.handoff?.parts?.flatMap((part) => mapHandoffPart(part, skipped));
}

function timelineOptions(input: ExplodeViewInput) {
  const metadataOrder = input.handoff?.assembly_order ?? input.handoff?.assembly?.order;
  return {
    ...(input.assembly_order ? { order: input.assembly_order } : {}),
    ...(metadataOrder ? { metadataOrder } : {}),
    ...(input.axis ? { axis: input.axis } : {}),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(input.spacing !== undefined ? { spacing: input.spacing } : {}),
    ...(input.duration_ms !== undefined ? { durationMs: input.duration_ms } : {}),
  };
}

function combineWarnings(timelineWarnings: string[], skipped: string[]): string[] {
  if (!skipped.length) return timelineWarnings;
  return [...timelineWarnings, `Skipped handoff part(s) without usable position or bbox: ${skipped.join(', ')}.`];
}

export function explodeViewTool(input: ExplodeViewInput) {
  const skippedHandoffParts: string[] = [];
  const parts = resolveParts(input, skippedHandoffParts);
  if (!Array.isArray(parts) || parts.length === 0) throw new Error('Provide parts with name, center and size in mm, or a handoff with ref, XY position_mm.value and physical.bbox_mm (or bbox_mm.value) for each placeable part.');
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
    warnings: combineWarnings(timeline.warnings, skippedHandoffParts),
    param_declarations: paramDeclarations,
    script_fragment: `${paramDeclarations}\nanimationView({ name: 'Exploded view — assembly', tracks: ${JSON.stringify(animationTracks, null, 2)} });`,
    animation_tracks: animationTracks,
    reverse_animation_tracks: reverseAnimationTracks,
    part_transforms: partTransforms,
    playback: 'Use param_declarations once in the model script. Apply each part transform expression to the existing shape before passing it to assembly.part(). Paste script_fragment for the forward assembly timeline, or use reverse_animation_tracks for disassembly. Studio Animation and capture_animation consume the declared animationView timeline.',
  };
}
