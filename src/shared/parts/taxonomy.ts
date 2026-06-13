// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/parts/taxonomy.ts
//
// Canonical robotics-aware top-level categories for the parts catalog. The
// ingestion engine maps every part into exactly one of these via the source
// registry's categoryMap (+ keyword heuristics); unmapped parts fall to
// 'uncategorized' and are flagged for review rather than silently bucketed.

/** Robotics-aware top-level categories. `family` remains the finer bucket. */
export const PART_CATEGORIES = [
  'actuator', // motors, servos, gearmotors, cycloidal/QDD drives
  'gripper', // fingers, jaws, end-effectors
  'structural-frame', // brackets, gussets, plates, links, extrusion profiles
  'linear-motion', // rails, rods, blocks, lead screws, shaft supports
  'wheel', // wheels, hubs, casters, omni/mecanum
  'coupling', // shaft couplers, joints
  'gear', // spur/helical/bevel/worm, pulleys, sprockets
  'bearing', // ball/roller/bushing/thrust
  'fastener', // screws, nuts, washers, inserts, standoffs
  'sensor-mount', // sensor/camera mounts and brackets
  'electronics-module', // breakouts, headers, connectors, dev boards, PCBs
  'uncategorized', // heuristic fallback — flagged for review, never silently kept
] as const;

export type PartCategory = (typeof PART_CATEGORIES)[number];

const CATEGORY_SET = new Set<string>(PART_CATEGORIES);

export function isPartCategory(v: unknown): v is PartCategory {
  return typeof v === 'string' && CATEGORY_SET.has(v);
}

/**
 * Keyword heuristics used by the ingestion engine ONLY when a source's
 * categoryMap does not assign a category. Order matters: first match wins.
 * Keep conservative — a miss falls to 'uncategorized' (review), not a wrong bucket.
 */
export const CATEGORY_KEYWORDS: ReadonlyArray<readonly [PartCategory, readonly string[]]> = [
  ['actuator', ['motor', 'servo', 'stepper', 'nema', 'gearmotor', 'bldc', 'cycloidal', 'qdd', 'dynamixel', 'actuator']],
  ['gripper', ['gripper', 'finger', 'jaw', 'fin-ray', 'finray', 'end-effector', 'endeffector', 'claw']],
  ['linear-motion', ['rail', 'lm8', 'mgn', 'sbr', 'lead-screw', 'leadscrew', 'shaft-support', 'linear', 'carriage', 'slider']],
  ['wheel', ['wheel', 'omni', 'mecanum', 'caster', 'hub', 'tire']],
  ['coupling', ['coupler', 'coupling', 'oldham', 'jaw-coupler', 'u-joint']],
  ['gear', ['gear', 'pulley', 'sprocket', 'gt2', 'htd', 'pinion', 'rack']],
  ['bearing', ['bearing', 'bushing', '608', '623', '624', '625', 'lm', 'thrust']],
  ['fastener', ['screw', 'bolt', 'nut', 'washer', 'insert', 'standoff', 'shcs', 'm2', 'm3', 'm4', 'm5', 'm6']],
  ['sensor-mount', ['sensor', 'camera-mount', 'lidar', 'imu-mount', 'mount']],
  ['electronics-module', ['header', 'connector', 'jst', 'molex', 'breakout', 'feather', 'esp32', 'pcb', 'board', 'module']],
  ['structural-frame', ['bracket', 'gusset', 'plate', 'link', 'extrusion', '2020', '2040', 'v-slot', 'vslot', 'frame', 'chassis']],
];

/** Best-effort category from a name/path when the registry gives no mapping. */
export function guessCategory(text: string): PartCategory {
  const t = text.toLowerCase();
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => t.includes(k))) return cat;
  }
  return 'uncategorized';
}
