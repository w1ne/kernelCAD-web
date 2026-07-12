// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export type RobotHandCheck =
  | 'reachable-contact-points'
  | 'joint-limits-respected'
  | 'no-self-collision'
  | 'load-path-to-palm'
  | 'opposing-contact-normals'
  | 'object-clearance'
  | 'actuation-anchored';

export interface RobotHandGraspTask {
  id: string;
  name: string;
  object: string;
  purpose: string;
  contacts: string[];
  requiredChecks: RobotHandCheck[];
}

export const FUNCTION_FIRST_ROBOT_HAND_PRINCIPLES = [
  'Function before form: define grasp tasks and object contacts before visual styling.',
  'Contacts before fingers: finger count, thumb placement, and palm shape come from required contact geometry.',
  'Skeleton before solids: joint centers, axes, envelopes, and limits are authored before decorative bodies.',
  'Validation before polish: a hand that cannot hold target objects is rejected even if it looks plausible.',
  'Reference after function: visual references tune proportions only after the grasp tasks pass.',
] as const;

const BASE_CHECKS: RobotHandCheck[] = [
  'reachable-contact-points',
  'joint-limits-respected',
  'no-self-collision',
  'load-path-to-palm',
];

export const ROBOT_HAND_GRASP_TASKS: RobotHandGraspTask[] = [
  {
    id: 'pinch-thin-plate',
    name: 'Pinch thin plate',
    object: '2-5 mm plate or card edge',
    purpose: 'Prove fingertip opposition and fine-object aperture without cheating through interpenetration.',
    contacts: ['thumb pad', 'index fingertip'],
    requiredChecks: [...BASE_CHECKS, 'opposing-contact-normals', 'object-clearance'],
  },
  {
    id: 'power-cylinder',
    name: 'Power grasp cylinder',
    object: '30-55 mm diameter cylinder such as a bottle neck or handle',
    purpose: 'Prove wraparound grasp and palm/finger load path under torque.',
    contacts: ['thumb side', 'index phalanx', 'middle phalanx', 'palm saddle'],
    requiredChecks: [...BASE_CHECKS, 'opposing-contact-normals', 'actuation-anchored'],
  },
  {
    id: 'spherical-object',
    name: 'Spherical grasp',
    object: '35-65 mm sphere',
    purpose: 'Prove multi-point enclosure rather than one flat clamp line.',
    contacts: ['thumb pad', 'index fingertip', 'middle fingertip'],
    requiredChecks: [...BASE_CHECKS, 'opposing-contact-normals', 'object-clearance'],
  },
  {
    id: 'box-grasp',
    name: 'Box grasp',
    object: '45 x 30 x 25 mm rectangular block',
    purpose: 'Prove stable grasp on flat-sided objects without relying only on fingertip points.',
    contacts: ['thumb pad', 'index inner face', 'middle inner face', 'palm face'],
    requiredChecks: [...BASE_CHECKS, 'opposing-contact-normals', 'object-clearance'],
  },
  {
    id: 'hook-handle',
    name: 'Hook or handle pull',
    object: '8-16 mm handle or ring section',
    purpose: 'Prove load-bearing hook geometry and pin/load path through the palm.',
    contacts: ['curled finger inner surface', 'palm reaction support'],
    requiredChecks: [...BASE_CHECKS, 'actuation-anchored'],
  },
  {
    id: 'wide-object',
    name: 'Wide object aperture',
    object: 'object wider than relaxed palm contact span',
    purpose: 'Prove the hand opens far enough before closing around the target.',
    contacts: ['thumb outer reach', 'opposing finger outer reach'],
    requiredChecks: [...BASE_CHECKS, 'object-clearance'],
  },
];

export const ROBOT_HAND_ACCEPTANCE_GATES = [
  'grasp-aperture-covers-target-object',
  'opposing-contact-normals-resist-escape',
  'pose-envelope-has-no-breaking-collisions',
  'all-loaded-parts-are-in-mate-graph',
  'actuation-path-has-anchored-transmission',
  'all-contacting-fingers-have-physically-realized-joints',
  'visual-reference-is-applied-only-after-functional-gates-pass',
] as const;

export function summarizeRobotHandFunctionalBrief() {
  return {
    firstArtifact: 'three-finger functional hand',
    deferred: [
      'five-finger visual styling',
      'mesh feature fitting',
      'cosmetic palm shell',
      'extra non-contact fingers',
    ],
    why: 'A three-finger hand can cover the grasp tests with fewer joints, making disconnected parts, invalid axes, and fake load paths easier to detect before adding visual complexity.',
  };
}
