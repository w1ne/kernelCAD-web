// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const ANIMATION_CODES = {
  // Animation views (7) — multi-track keyframe animationView() validation.
  // The first five fire at capture time from CaptureSession.addAnimationView
  // (errors THROW KernelError — the addDfmSpec precedent, since stashed
  // virtual-record diagnostics never reach evaluate; warns stash on
  // metadata.diagnostics). animation.collision is registered ahead of the
  // motion-verification surface that emits it (capture/verify slice).
  'animation.param.unknown': {
    hintTemplate:
      "An animationView track (or the legacy sweep 'param') names a param that no prior param() call declared, or one declared with a non-numeric type. Declare a numeric param first — e.g. const angle = param('angleDeg', 0, { min: 0, max: 360 }) — or fix the spelling in tracks[].param; boolean params cannot be animated.",
    nextAction: { kind: 'fix-arg', field: 'tracks[].param' },
    defaultSeverity: 'error',
    group: 'animation',
    description: 'An animationView track (or legacy sweep) references a param name not declared by a prior param() call in the session, or declared with a non-numeric type.',
  },
  'animation.track.duplicate-param': {
    hintTemplate:
      'Two animationView tracks target the same param; a param may appear in at most one track per call. Merge the keyframes into a single track for that param.',
    nextAction: { kind: 'fix-arg', field: 'tracks' },
    defaultSeverity: 'error',
    group: 'animation',
    description: 'Two or more tracks in one animationView() call animate the same param name.',
  },
  'animation.keys.invalid': {
    hintTemplate:
      'Fix the track/key named in the message: tracks must be a non-empty array, every track needs at least one key, atMs and value must be finite with atMs >= 0, atMs must be unique within a track, and ease must be one of linear | step | easeIn | easeOut | easeInOut.',
    nextAction: { kind: 'fix-arg', field: 'see-message' },
    defaultSeverity: 'error',
    group: 'animation',
    description: 'An animationView track or keyframe is malformed (empty tracks/keys, non-finite or negative atMs, non-finite value, duplicate atMs within a track, or unknown ease).',
  },
  'animation.value.clamped': {
    hintTemplate:
      "A keyframe value lies outside the param's declared min/max range; the stored value was clamped to the range boundary. Author key values inside the param() range, or widen the range on the param() declaration if the sweep is intended.",
    nextAction: { kind: 'fix-arg', field: 'tracks[].keys[].value' },
    defaultSeverity: 'warn',
    group: 'animation',
    description: 'An animationView keyframe value fell outside the declared param min/max range and was clamped to the boundary.',
  },
  'animation.view.shadowed': {
    hintTemplate:
      'Multiple animationView() calls registered; capture uses only the LAST record. Remove the earlier animationView() calls (record ids in the message), or keep only the intended timeline.',
    nextAction: { kind: 'rewrite-feature', guidance: 'remove the earlier animationView() calls so only the intended record remains' },
    defaultSeverity: 'warn',
    group: 'animation',
    description: 'A later animationView() call shadows one or more earlier animationView records; only the last record is captured.',
  },
  'animation.collision': {
    hintTemplate:
      'Two parts collide at a sampled timestamp of the animation timeline (the message names the colliding part pair and the time in ms). Adjust the keyframes so the poses stay clear at that time, or reshape / add clearance to the colliding geometry.',
    nextAction: { kind: 'rewrite-feature', guidance: 'adjust the keyframes or the colliding part geometry so the named pair stays clear at the reported timestamp' },
    defaultSeverity: 'error',
    group: 'animation',
    description: 'Motion verification found two parts interpenetrating at a sampled timestamp of the animationView timeline.',
  },
  'animation.bake.geometry-param': {
    hintTemplate:
      'A track param drives part GEOMETRY (a dimension, extrude depth, hole radius, …) rather than a mate pose, so Studio baked playback — which only re-applies rigid per-part world transforms — would show the wrong shape. Studio playback supports POSE-ONLY (mate-driven) timelines; render geometry-animating timelines with `kernelcad animate` (offline MP4 re-meshes every frame).',
    nextAction: { kind: 'call-tool', tool: 'kernelcad animate', args: { reason: 'geometry-animating timeline' } },
    defaultSeverity: 'error',
    group: 'animation',
    description: 'An animationView track param re-lowers part-local geometry (not just a solvedAssembly mate pose), so Studio baked playback — which only re-applies rigid per-part transforms — cannot represent it; offline MP4 capture is required.',
  },
} as const satisfies Record<`animation.${string}`, DiagnosticCodeSpec>;
