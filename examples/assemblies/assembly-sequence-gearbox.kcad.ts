// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Twelve-part gearbox blockout for the assembly sequence planner, plus four
// M4-style bolts, a tool-clearance rib and a declared press fit. Parts are
// declared in REMOVAL order (cover first, base last) so the reverse peel is a
// bottom-up build sequence. The two fastened mate clusters (shaft + its two
// gears) are real subassembly candidates. The screws declare a helical removal
// axis and pitch, so P2 plans them as helical steps instead of unknown. The rib
// sits beside one screw head, close enough to make its tool envelope
// unreachable; the planner reports `tool-blocked` naming the rib. Gear A's mate
// declares a press fit, so its step is `requires-force` and is never simulated.
// This is a geometry fixture, not a functioning transmission.

const arm = assembly('gearbox sequence');
const boltPositions: [number, number][] = [[30, 18], [30, -18], [-30, 18], [-30, -18]];

let cover = box(90, 70, 6, true).translate(0, 0, 39);
for (const [x, y] of boltPositions)
  cover = cover.subtract(cylinder(10, 2.5, 12).translate(x, y, 35));
cover = cover.finish('anodized');
const gearA = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(-18, 0, 10).finish('brass');
const gearB = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(-18, 0, 22).finish('brass');
const gearC = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(18, 0, 10).finish('brass');
const gearD = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(18, 0, 22).finish('brass');
const inputShaft = box(6, 6, 30, true).translate(-18, 0, 21).finish('steel');
const outputShaft = box(6, 6, 30, true).translate(18, 0, 21).finish('steel');
const postA = box(8, 8, 28, true).translate(-36, -26, 20).finish('aluminium-brushed');
const postB = box(8, 8, 28, true).translate(36, -26, 20).finish('aluminium-brushed');
const postC = box(8, 8, 28, true).translate(-36, 26, 20).finish('aluminium-brushed');
const postD = box(8, 8, 28, true).translate(36, 26, 20).finish('aluminium-brushed');
let base = box(90, 70, 6, true).translate(0, 0, 3);
for (const [x, y] of boltPositions)
  base = base.subtract(cylinder(10, 2.5, 12).translate(x, y, -2));
base = base.finish('anodized');

const coverRef = arm.part('cover', cover);
const gearDRef = arm.part('gear-d', gearD);
const gearCRef = arm.part('gear-c', gearC);
const gearBRef = arm.part('gear-b', gearB);
const gearARef = arm.part('gear-a', gearA);
const outputShaftRef = arm.part('output-shaft', outputShaft);
const inputShaftRef = arm.part('input-shaft', inputShaft);
arm.part('post-d', postD);
arm.part('post-c', postC);
arm.part('post-b', postB);
arm.part('post-a', postA);
arm.part('base', base);

// A blockout M4-style bolt: 5.5 mm head over a 3 mm shank. The head bearing is
// at local z=0, so `at` places it on the cover's top face. Catalog fasteners
// work the same way; this keeps the fixture lightweight and self-contained.
const boltShape = box(5.5, 5.5, 4, true).translate(0, 0, 2).union(box(3, 3, 40, true).translate(0, 0, -20)).finish('steel');
for (let index = 0; index < boltPositions.length; index++) {
  const [x, y] = boltPositions[index];
  const label = String.fromCharCode(97 + index);
  const boltRef = arm.part(`bolt-${label}`, boltShape, { at: [x, y, 42.1] });
  boltRef.connector('head-bearing', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] }, normal: [0, 0, 1] });
  coverRef.connector(`bolt-${label}-seat`, { type: 'frame', origin: { kind: 'vec3', value: [x, y, 42.1] }, normal: [0, 0, 1] });
  arm.mate(`bolt-${label}-fastened`, `bolt-${label}.head-bearing`, `cover.bolt-${label}-seat`, 'fastened', {
    fastener: {
      part: `bolt-${label}`,
      axis: [0, 0, 1],
      pitchMm: 0.7,
      threadLengthMm: 12,
      standard: 'ISO 4762',
      tool: { kind: 'cylinder', lengthMm: 30, diameterMm: 9, label: 'hex-key' },
    },
  });
}

// A rib beside bolt A's head: the screw still translates out, but the driver
// envelope cannot reach the socket. P2 reports tool-blocked { fastener, rib }.
arm.part('tool-clearance-rib', box(1.5, 4, 10, true).translate(34.75, 18, 47).finish('aluminium-brushed'));

// Frame connectors are mate metadata, not geometry: the planner groups the
// cluster and plans its inside; it does not solve the mates in this example.
const seat = (value: [number, number, number]) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value } });
inputShaftRef.connector('gear-a-seat', seat([0, 0, -11])).connector('gear-b-seat', seat([0, 0, 1]));
outputShaftRef.connector('gear-c-seat', seat([0, 0, -11])).connector('gear-d-seat', seat([0, 0, 1]));
gearARef.connector('shaft-mount', seat([0, 0, 0]));
gearBRef.connector('shaft-mount', seat([0, 0, 0]));
gearCRef.connector('shaft-mount', seat([0, 0, 0]));
gearDRef.connector('shaft-mount', seat([0, 0, 0]));
arm.mate('input-shaft-gear-a', 'input-shaft.gear-a-seat', 'gear-a.shaft-mount', 'fastened', { fit: { kind: 'press', part: 'gear-a', axis: [0, 0, 1] } });
arm.mate('input-shaft-gear-b', 'input-shaft.gear-b-seat', 'gear-b.shaft-mount', 'fastened');
arm.mate('output-shaft-gear-c', 'output-shaft.gear-c-seat', 'gear-c.shaft-mount', 'fastened');
arm.mate('output-shaft-gear-d', 'output-shaft.gear-d-seat', 'gear-d.shaft-mount', 'fastened');

return arm.model();
