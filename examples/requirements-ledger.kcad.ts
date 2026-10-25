// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-require-imports -- require() is the kernelCAD requirements API (S2), not a module import. */
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One requirements ledger (S2). Every declared requirement is measured by the
// kernel on every evaluation and reported in `requirements`:
//   kernelcad evaluate examples/requirements-ledger.kcad.ts --json
//   npx tsx src/agent/cli/index.ts evaluate examples/requirements-ledger.kcad.ts
//
// The bore count, envelope, volume and wall gap below are deliberately
// ordinary design intent, not expert solution geometry: an eval task can grade
// a build from these requirements alone.

const width = param('width', 48, { min: 36, max: 72 });
const depth = param('depth', 32, { min: 24, max: 48 });
const thickness = param('thickness', 6, { min: 4, max: 10 });
const bore = param('bore', 6, { min: 3, max: 10 });
const bossHeight = param('bossHeight', 12, { min: 6, max: 20 });

const plate = box(width, depth, thickness);
const boss = cylinder(bossHeight, bore.multiply(1.75)).translate(width.subtract(12), depth.divide(2), thickness);
const boreCutter = cylinder(bossHeight.add(2), bore).translate(width.subtract(12), depth.divide(2), thickness.subtract(1));
const part = plate.union(boss).subtract(boreCutter);

require('outer-envelope', bbox(part).within({
  x: [47.5, 48.5],
  y: [31.5, 32.5],
  z: [5.5, 18.5],
}));
require('one-through-bore', count(faces(part, { ofSurfaceType: 'CYLINDER' })).gte(1));
require('solid-volume', volume(part).gte(2_000));
require('boss-clear-of-edge', clearance(
  faces(part, { ofSurfaceType: 'CYLINDER' }),
  faces(part, { byNormal: '-Y' }),
).gte(0.5));
require('plate-top-level', angle(
  faces(part, { byNormal: 'Z', maxArea: 10_000 }),
  faces(part, { byNormal: 'Z', maxArea: 10_000 }),
).lte(1));

return part;
