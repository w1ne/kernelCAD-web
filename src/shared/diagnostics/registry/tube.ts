// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bent-tube gates. Emitted after a script is built by
// src/modeling/runtime/tube/runTubeChecks.ts: the bend and straight rules
// declared by `tubeSpec({...})` (or its defaults), tube clearance against
// parts and other tubes, and tube ends that left their ports.

import type { DiagnosticCodeSpec } from './types';

export const TUBE_CODES = {
  'tube.bend.radius-too-small': {
    hintTemplate:
      'Raise `bendRadius` to at least the stated value, or lower `minBendRadiusFactor` in `tubeSpec` if the shop can bend tighter.',
    nextAction: { kind: 'fix-arg', field: 'bendRadius' },
    defaultSeverity: 'error',
    group: 'tube',
    description: "A tube's centreline bend radius is below the tubeSpec factor times its outer diameter.",
  },
  'tube.straight.between-bends-too-short': {
    hintTemplate:
      'Move one of the two corners apart by the stated length, or lower `bendRadius`.',
    nextAction: { kind: 'fix-arg', field: 'via' },
    defaultSeverity: 'error',
    group: 'tube',
    description: 'The straight left between two bends of a tube is shorter than the tubeSpec rule.',
  },
  'tube.straight.end-too-short': {
    hintTemplate:
      'Move the first (or last) corner away from the port along the port axis by the stated length.',
    nextAction: { kind: 'fix-arg', field: 'via' },
    defaultSeverity: 'error',
    group: 'tube',
    description: 'The straight at a tube end is shorter than the tubeSpec rule or the minimum the port declares.',
  },
  'tube.bend.angle-exceeded': {
    hintTemplate:
      'Move the corner so the bend opens up, or split it into two bends.',
    nextAction: { kind: 'fix-arg', field: 'via' },
    defaultSeverity: 'error',
    group: 'tube',
    description: 'A tube bend turns through more than the tubeSpec maximum bend angle.',
  },
  'tube.clearance.violated': {
    hintTemplate:
      'Move the nearest corner away from the named part or tube by at least the stated shortfall.',
    nextAction: { kind: 'fix-arg', field: 'via' },
    defaultSeverity: 'error',
    group: 'tube',
    description: 'A tube is closer to a part or to another tube than the tubeSpec clearance for that pair.',
  },
  'tube.clearance.overlap': {
    hintTemplate:
      'The tube passes through the named part or tube. Re-route the leg around it.',
    nextAction: { kind: 'fix-arg', field: 'via' },
    defaultSeverity: 'error',
    group: 'tube',
    description: 'A tube shares volume with a part or with another tube.',
  },
  'tube.port.misaligned': {
    hintTemplate:
      'Put the first (or last) corner on the port axis; the message gives the nearest point on the axis. A tube end off its port means the part moved: pass the port again or fix the point.',
    nextAction: { kind: 'fix-arg', field: 'via' },
    defaultSeverity: 'error',
    group: 'tube',
    description: 'A tube end leg is off its port axis, or the tube end no longer sits on its port.',
  },
  'tube.spec.defaulted': {
    hintTemplate:
      "No `tubeSpec` declared; default rules applied (3 × OD bend radius, 2 × OD straight between bends, 2.5 × OD straight at the ends, 6 mm clearance). Declare `tubeSpec({...})` to state the shop's rules.",
    nextAction: { kind: 'fix-arg', field: 'tubeSpec' },
    defaultSeverity: 'warn',
    group: 'tube',
    description: 'The script builds tubes without a tubeSpec, so the default bending and clearance rules were enforced.',
  },
  'tube.end.part-not-found': {
    hintTemplate:
      'Set `part` on the tube end to the name the part was added under with `asm.part(name, ...)`, or remove `part` if the end sits in free space.',
    nextAction: { kind: 'fix-arg', field: 'part' },
    defaultSeverity: 'error',
    group: 'tube',
    description: 'A plain tube end names a part that the assembly does not have, so the end has no fitting zone.',
  },
} as const satisfies Record<`tube.${string}`, DiagnosticCodeSpec>;
