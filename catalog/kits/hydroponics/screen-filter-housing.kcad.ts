// SPDX-License-Identifier: CC0-1.0
// Screen filter housing: the inline irrigation screen filter that stops grit
// and debris from blocking drippers and emitters, installed in a PVC line on
// two pipe stands.
// What makes it a screen filter: a cast head with inlet and outlet on one
// line, a ribbed bowl hanging below it held by a clamp ring (so the bowl can
// be dropped to pull the mesh cartridge), pressure gauges on the inlet and
// outlet side to read the clogging drop, a flush ball valve at the bottom of
// the bowl and an arrow showing the flow direction.
// Generic visualization geometry at about real size (2 in or 3 in line,
// bowl about 200 mm across), millimetres, Z up, front toward -Y.

meta({
  name: "screen-filter-housing",
  license: 'CC0-1.0',
  title: "Screen filter housing",
  description: "Inline irrigation screen filter at about real size: cast head with flow arrow and in-line inlet and outlet unions, ribbed bowl hanging on a clamp ring, inlet and outlet pressure gauges, flush ball valve with drain elbow, and PVC line on two pipe stands; 2 in or 3 in size. Material controls: bowl, head and clamp, PVC pipework and stands. redBowl, blueBowl, blackGrey and weathered presets.",
  tags: ['screen filter', 'irrigation filter', 'mesh filter', 'inline filter', 'filtration', 'drip irrigation', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bowl = param('bowl', '#b3262b', { label: 'Bowl (glass-filled polymer)' });
const head = param('head', '#2a2d30', { label: 'Head and clamp ring (polymer)' });
const pipe = param('pipe', '#8e9497', { label: 'Pipework (PVC)' });
const stand = param('stand', '#3d4347', { label: 'Pipe stands (galvanised steel)' });
const size = param('size', '2in', { choices: ['2in', '3in'], label: 'Line size' });

presets({
  redBowl: { bowl: '#b3262b', head: '#2a2d30', pipe: '#8e9497', stand: '#3d4347' },
  blueBowl: { bowl: '#2f6fa8', head: '#2a2d30', pipe: '#dcdcd4', stand: '#5a6066' },
  blackGrey: { bowl: '#2a2d30', head: '#6b7176', pipe: '#8e9497', stand: '#3d4347' },
  weathered: { bowl: '#8a4a42', head: '#3e403c', pipe: '#a9a99c', stand: '#5c5a52' },
});

const p = assembly("screen-filter-housing");
const k = size.value === '3in' ? 1.3 : 1;
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 20) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

const ZL = 700 * k; // line height
const PR = 30 * k; // pipe radius
const BR = 100 * k; // bowl radius
const BH = 360 * k; // bowl height
const ZB = ZL - 70 * k; // top of the bowl (under the head)

// Head: a block casting with round port bosses on the line.
add("head-body", blk(0, 0, ZL - 80 * k, 190 * k, 170 * k, 170 * k).color(head));
add("head-cap", cylZ(0, 0, ZL + 90 * k, 20 * k, 70 * k, 16).color(head));
add("air-release", cylZ(0, 0, ZL + 110 * k, 26 * k, 14 * k, 8).color('#c9ccce'));
for (const side of [-1, 1]) {
  add(`port-boss-${side > 0 ? 'out' : 'in'}`, cylX(side > 0 ? 95 * k : -135 * k, 0, ZL, 40 * k, PR + 10 * k, 14).color(head));
}
add("flow-arrow-shaft", blk(0, -86 * k, ZL + 20 * k, 90 * k, 3, 14 * k).color('#f2f2ec'));
add("flow-arrow-head", box(22 * k, 3, 22 * k, true).rotateY(45).translate(48 * k, -86 * k, ZL + 27 * k).color('#f2f2ec'));

// Clamp ring with its hand-wheel screw, joining head to bowl.
add("clamp-ring", cylZ(0, 0, ZB - 30 * k, 40 * k, BR + 14 * k, 24).color(head));
add("clamp-screw", cylY(0, -BR - 14 * k, ZB - 10 * k, 50 * k, 9 * k, 8).color('#c9ccce'));
add("clamp-wheel", cylY(0, -BR - 60 * k, ZB - 10 * k, 16 * k, 30 * k, 10).color(head));

// Bowl: revolved, tapering to a rounded bottom, with grip ribs.
add("bowl", turned([
  [0, ZB - BH - 30 * k], [40 * k, ZB - BH - 24 * k], [70 * k, ZB - BH], [BR - 8 * k, ZB - BH * 0.55], [BR, ZB - 30 * k], [BR, ZB], [0, ZB],
]).color(bowl));
for (let r = 0; r < 12; r++) {
  const a = (r / 12) * 360;
  add(`grip-rib-${r}`, box(10 * k, 10 * k, 120 * k, true).translate(BR, 0, ZB - 110 * k).rotateZ(a).color(bowl));
}
add("bowl-label", blk(0, -BR + 6 * k, ZB - 230 * k, 70 * k, 6, 50 * k).color('#f2f2ec'));
add("mesh-mark", blk(0, -BR + 4 * k, ZB - 200 * k, 40 * k, 6, 10 * k).color('#2a8a4a'));

// Flush valve at the bottom of the bowl with a drain elbow.
const ZF = ZB - BH - 30 * k;
add("flush-nipple", cylZ(0, 0, ZF - 40 * k, 40 * k, 16 * k, 10).color(pipe));
add("flush-valve", blk(0, 0, ZF - 90 * k, 60 * k, 60 * k, 50 * k).color('#c9ccce'));
add("flush-lever", blk(40 * k, 0, ZF - 72 * k, 90 * k, 14 * k, 12 * k).color('#c0392b'));
add("drain-drop", cylZ(0, 0, ZF - 150 * k, 60 * k, 16 * k, 10).color(pipe));
add("drain-elbow", cylY(0, 0, ZF - 150 * k, 90 * k, 16 * k, 10).color(pipe));

// Pressure gauges on inlet and outlet side.
for (const [tag, x] of [['in', -70 * k], ['out', 70 * k]] as const) {
  add(`${tag}-gauge-stem`, cylZ(x, -40 * k, ZL + 90 * k, 40 * k, 6 * k, 6).color('#c9a84a'));
  add(`${tag}-gauge`, cylY(x, -20 * k, ZL + 160 * k, 26 * k, 34 * k, 16).color('#d9dcde'));
  add(`${tag}-gauge-face`, cylY(x, -46 * k, ZL + 160 * k, 2, 29 * k, 16).color('#f4f4ee'));
  add(`${tag}-gauge-needle`, box(22 * k, 2, 3, true).translate(9 * k, 0, 0).rotateY(tag === 'in' ? -40 : -20).translate(x, -49 * k, ZL + 160 * k).color('#c0392b'));
}

// Unions and PVC line each side.
const LL = 560 * k;
for (const side of [-1, 1]) {
  const tag = side > 0 ? 'out' : 'in';
  const x0 = side > 0 ? 135 * k : -135 * k - 60 * k;
  add(`${tag}-union-nut`, cylX(x0, 0, ZL, 60 * k, PR + 16 * k, 8).color(head));
  add(`${tag}-pipe`, cylX(side > 0 ? 195 * k : -195 * k - LL, 0, ZL, LL, PR, 14).color(pipe));
  // Pipe stand: post, saddle and foot.
  const sx = side * (195 * k + LL - 120 * k);
  add(`${tag}-stand-post`, blk(sx, 0, 0, 40 * k, 40 * k, ZL - PR - 10 * k).color(stand));
  add(`${tag}-stand-foot`, blk(sx, 0, 0, 180 * k, 180 * k, 12 * k).color(stand));
  add(`${tag}-stand-saddle`, cylX(sx - 25 * k, 0, ZL, 50 * k, PR + 6 * k, 14).color(stand));
  add(`${tag}-pipe-end`, cylX(side > 0 ? 195 * k + LL - 10 * k : -195 * k - LL - 10 * k, 0, ZL, 20 * k, PR + 6 * k, 14).color(pipe));
}

return p.model();
