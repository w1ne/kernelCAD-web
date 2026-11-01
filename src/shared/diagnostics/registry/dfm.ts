// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const DFM_CODES = {
  // DFM print-prep gates (4) — W3 Task 7: dfmSpec({...}) enforcement
  // (min-wall sampling, part-pair clearance, voxel void/channel topology).
  'dfm.wall.too-thin': {
    hintTemplate:
      'A printed wall is thinner than dfmSpec.minWall at the reported location. Thicken the section (offset the cut, widen the rib), or lower minWall only if the target printer resolves it.',
    nextAction: { kind: 'rewrite-feature', guidance: 'thicken the wall at the reported xyz to >= minWall' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Inward ray sampling measured a material wall thinner than the declared minimum.',
  },
  'dfm.clearance.violated': {
    hintTemplate:
      'Two distinct parts sit closer than dfmSpec.minClearance. Translate one part along its mating direction, or add the pair to dfmSpec.ignore if the contact is intentional (seated vendor part, fastened printed joint).',
    nextAction: { kind: 'rewrite-feature', guidance: 'open the gap to >= minClearance or declare the pair in dfmSpec.ignore' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'BREP minimum distance between a part pair is below the declared clearance and the pair is not mated, ignored, or interfering.',
  },
  'dfm.channel.openings-mismatch': {
    hintTemplate:
      'A declared channel has a different number of mouth openings than declared — a breach adds openings, a blocked mouth removes them, and found=0 can mean the channel is wider than the ~16mm detection limit. Inspect the channel walls near the part surface.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Voxel flood-fill counted a different number of channel mouths than the dfmSpec.channels declaration.',
  },
  'dfm.void.undeclared': {
    hintTemplate:
      'A sealed internal void traps powder/resin/support and is unprintable on FDM without declaration. Open a drain channel, or declare it via dfmSpec.channels with sealed: true if intentional.',
    nextAction: { kind: 'rewrite-feature', guidance: 'open a drain channel or declare the void sealed: true' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Flood-fill found an enclosed empty region not declared as a sealed channel.',
  },
  // FDM printability check (7) — dfmSpec({ process: 'fdm' }): overhang and
  // bridge support, nozzle-relative walls and features, bed contact, tip
  // risk, and bed fit, with a ranked axis-aligned print orientation.
  'dfm.fdm.overhang-unsupported': {
    hintTemplate:
      'Downward-facing surfaces steeper than maxOverhangDeg have nothing below them to print onto. Reorient the part, add a 45° chamfer or gusset under the overhang, or slice with supports.',
    nextAction: { kind: 'rewrite-feature', guidance: 'apply the recommended rotation or buildDirection, or chamfer the overhang to 45°' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'An overhang region is neither bridged between supports nor within one nozzle width of its support in the declared FDM build direction.',
  },
  'dfm.fdm.bridge-too-long': {
    hintTemplate:
      'A flat ceiling spans further between its supports than maxBridgeMm, so the bridge sags. Shorten the span with an intermediate rib, reorient the part, or slice with supports.',
    nextAction: { kind: 'rewrite-feature', guidance: 'add a rib under the span or reorient the part' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A horizontal downward face anchored at both ends spans longer than the declared FDM maximum bridge length.',
  },
  'dfm.fdm.wall-below-nozzle': {
    hintTemplate:
      'A wall thinner than two nozzle widths cannot hold two perimeters; the slicer drops or thins it. Thicken it to at least 2 × nozzleMm.',
    nextAction: { kind: 'rewrite-feature', guidance: 'thicken the wall at the reported xyz to >= 2 × nozzleMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Inward ray sampling measured a wall thinner than twice the declared FDM nozzle diameter.',
  },
  'dfm.fdm.feature-too-small': {
    hintTemplate:
      'Holes under 5 × nozzleMm print undersized or close up; pins under 7.5 × nozzleMm are fragile. Enlarge the feature, drill the hole after printing, or use a finer nozzle.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A full cylindrical hole or pin has a diameter below the FDM minimum derived from the nozzle diameter.',
  },
  'dfm.fdm.bed-contact-low': {
    hintTemplate:
      'The part rests on a small fraction of its footprint, so first-layer adhesion is weak and it can detach mid-print. Reorient onto a flat face or add a brim.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Bed-contact area is below 10% of the convex footprint in the FDM build direction.',
  },
  'dfm.fdm.tip-risk': {
    hintTemplate:
      'The part is tall relative to its narrowest base width and may tip or wobble as the nozzle drags past. Print it lying down, widen the base, or add a brim.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Height divided by the minimum width of the bed-contact patch exceeds 8 in the FDM build direction.',
  },
  'dfm.fdm.exceeds-bed': {
    hintTemplate:
      "The part in its FDM build orientation is larger than the printer profile's bed. Reorient it, split it into printable sub-parts, or pick a printer profile with a larger bed.",
    nextAction: { kind: 'retry-with-smaller-param', param: 'scale', factor: 0.9 },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "The part's extents in the declared FDM build direction exceed the selected printer profile's bed on some axis.",
  },
  // Injection-moulding check (6) — dfmSpec({ process: 'moulding' }): draft,
  // undercuts, thin and thick walls, sharp internal corners, and an explicit
  // marker for anything the check could not measure.
  'dfm.moulding.undercut': {
    hintTemplate:
      'Material blocks this face from releasing along the pull direction, so the part locks in the mould. Remove the overhang, core it out from the pull direction, change pullDirection, or budget a side action / lifter.',
    nextAction: { kind: 'rewrite-feature', guidance: 'open the face to the pull direction or move the feature onto a side action' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A ray from a face toward the mould half it releases into (±pull direction, by the side the face faces) hits the part itself.',
  },
  'dfm.moulding.draft-insufficient': {
    hintTemplate:
      'A face that slides against the mould on ejection has less draft than minDraftDeg, so it drags, scuffs and raises ejection force. Apply shape.draft(angle, { face, pullDir }) to the face (1° smooth finish; add ~1° per 0.025 mm texture depth).',
    nextAction: { kind: 'rewrite-feature', guidance: 'add draft >= minDraftDeg to the reported face' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A face whose normal is not parallel to the pull direction has a measured draft angle below the declared minimum.',
  },
  'dfm.moulding.thin-wall': {
    hintTemplate:
      'Melt freezes off in walls thinner than minWallMm before the cavity fills (short shot). Thicken the section to the nominal wall, or lower minWallMm only for a high-flow resin.',
    nextAction: { kind: 'rewrite-feature', guidance: 'thicken the wall at the reported xyz to >= minWallMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Inward ray sampling measured a moulded wall thinner than the declared moulding minimum.',
  },
  'dfm.moulding.thick-wall': {
    hintTemplate:
      'Sections thicker than maxWallMm cool slowly and shrink more than their surroundings: sink marks, voids and warp. Core the section out to the nominal wall and recover stiffness with ribs (rib thickness 50-60 % of the wall).',
    nextAction: { kind: 'rewrite-feature', guidance: 'core out the thick section at the reported xyz to <= maxWallMm' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'The largest inscribed sphere of the part (voxel distance transform refined by exact mesh distance) is wider than the declared moulding maximum wall.',
  },
  'dfm.moulding.sharp-corner': {
    hintTemplate:
      'An internal corner tighter than minRadiusMm concentrates stress and disturbs flow. Fillet the concave edge (inside radius about half the wall, outside radius = inside + wall).',
    nextAction: { kind: 'rewrite-feature', guidance: 'fillet the reported concave edge to >= minRadiusMm' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A concave crease between two faces (radius 0) or a concave cylindrical blend with a radius below the declared minimum.',
  },
  'dfm.moulding.unmeasured': {
    hintTemplate:
      'The moulding check could not measure this quantity on this part, so it is NOT passed — it is unknown. Inspect the part for open or degenerate geometry with evaluate and re-run.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A moulding measurement produced no usable sample (no wall ray hit, empty voxel grid, or face normals unavailable).',
  },
} as const satisfies Record<`dfm.${string}`, DiagnosticCodeSpec>;
