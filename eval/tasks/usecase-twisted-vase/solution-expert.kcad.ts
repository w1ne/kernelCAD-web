// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-twisted-vase/solution-expert.kcad.ts
//
// Typical use case U10: twisted hexagonal vase, 180 mm tall, 90 mm across
// (corners) at the base widening to 110 mm, 60° twist, 2 mm wall, closed
// bottom.
//
// A hexagon turned by 60° is the same hexagon, so a loft between only the
// bottom and the top profile has nothing to twist. Three more sections,
// each turned 20° further and a little larger, carry the twist up the height.
// The cavity is the same twisted loft 2 mm inside, from the bottom's top face
// out through the rim.

const height = 180;
const acrossBottom = 90;
const acrossTop = 110;
const twistDeg = 60;
const wall = 2;
const steps = 3;

function hexagon(across: number, rotDeg: number) {
  const r = across / 2;
  let p = path();
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 + rotDeg) * Math.PI) / 180;
    p = i === 0 ? p.moveTo(r * Math.cos(a), r * Math.sin(a)) : p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
}

// Section at height z: size and turn grow evenly with height.
const across = (z: number) => acrossBottom + ((acrossTop - acrossBottom) * z) / height;
const turn = (z: number) => (twistDeg * z) / height;

/** Loft through `steps + 1` sections from z0 to z1, `inset` mm inside the outline. */
function twisted(z0: number, z1: number, inset: number) {
  const offset = inset / Math.cos(Math.PI / 6); // wall normal to the flats -> corner offset
  const at = (i: number) => z0 + ((z1 - z0) * i) / steps;
  const sections = [];
  for (let i = 1; i <= steps; i++) sections.push(hexagon(across(at(i)) - 2 * offset, turn(at(i))));
  return hexagon(across(z0) - 2 * offset, turn(z0))
    .loft(sections, { spacing: (z1 - z0) / steps })
    .translate(0, 0, z0);
}

// Outer body minus the inner cavity: a 2 mm wall, a 2 mm bottom, open top.
const cavityTop = height + 1;
return twisted(0, height, 0).subtract(twisted(wall, cavityTop, wall));
