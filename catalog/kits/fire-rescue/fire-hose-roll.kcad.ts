// SPDX-License-Identifier: CC0-1.0
// Fire hose roll: one 15 m length of 45 mm attack hose in a straight roll.
// What makes it a hose roll is the flat woven jacket wound into a tight
// spiral standing on edge, the male coupling tucked in the centre and the
// female coupling on the outer end, lying on the ground on a short tail of
// flat hose. The female coupling has a swivel with rocker lugs for a
// spanner. A webbing strap through the centre with a carry loop holds the
// roll. Generic visualization geometry at about real size (about 360 mm
// across, 75 mm flat hose width), millimetres, Z up, roll axis across Y,
// tail toward +X, lowest point on z = 0.
meta({
  name: "fire-hose-roll",
  license: 'CC0-1.0',
  title: "Fire hose roll",
  description: "Straight-rolled 45 mm attack hose: flat woven jacket wound into a spiral standing on edge, male coupling tucked in the centre, outer tail lying on the ground to a female coupling with swivel and rocker lugs, and a webbing strap through the centre with a carry loop. Material controls: hose fabric, coupling metal, webbing and safety trim; weathered, highVisibility and forestryGreen presets.",
  tags: ['fire hose', 'hose roll', 'attack hose', 'hose coupling', 'fire rescue', 'fire service', 'emergency scene', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const hoseFabricColor = param('hoseFabricColor', '#c94732', { label: 'Hose fabric' });
const couplingMetalColor = param('couplingMetalColor', '#c4bb9a', { label: 'Coupling metal' });
const webbingColor = param('webbingColor', '#2f3437', { label: 'Webbing and safety trim' });
presets({
  weathered: { hoseFabricColor: '#965443', couplingMetalColor: '#8c9698', webbingColor: '#4a4a44' },
  highVisibility: { hoseFabricColor: '#e17825', couplingMetalColor: '#c1c2b5', webbingColor: '#f2df62' },
  forestryGreen: { hoseFabricColor: '#5f7a4a', couplingMetalColor: '#b9b7aa', webbingColor: '#d8c25a' },
});

const p = assembly("fire-hose-roll");
// Parts are collected, then lifted so the lowest point rests on z = 0.
const parts = [];
const add = (name, shape, finish) => parts.push([name, shape.color(finish)]);

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Side profile [[x, z], ...] extruded t wide across Y, centred on y = 0.
const sideXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Front profile [[y, z], ...] extruded t long along +X, centred on x = 0.
const frontYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
const rect = (a0, b0, a1, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];

const W = 75; // flat hose width
const R = 180; // outer radius of the roll
const CORE = 48; // radius of the centre hole
const TURNS = 6; // visible wraps (each stands for several real ones)
const PITCH = (R - CORE) / TURNS;
const GAP = 3;
const C = [0, R]; // roll centre (x, z): the roll stands on its outer wrap

// Spiral jacket ending at the bottom of the roll, running off toward +X.
const spiral = () => {
  const n = TURNS * 24;
  const end = -Math.PI / 2;
  const outer = [];
  const inner = [];
  for (let i = 0; i <= n; i++) {
    const a = end - (2 * Math.PI * TURNS * (n - i)) / n;
    const r = R - (PITCH * TURNS * (n - i)) / n;
    outer.push([C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)]);
    inner.push([C[0] + (r - PITCH + GAP) * Math.cos(a), C[1] + (r - PITCH + GAP) * Math.sin(a)]);
  }
  return [...outer, ...inner.reverse()];
};
add('hose-jacket-roll', sideXZ(spiral(), W), hoseFabricColor);

// Outer tail lying flat on the ground out to the female coupling.
const TAIL = 300;
add('hose-tail', sideXZ(rect(C[0] - 2, 0, C[0] + TAIL, PITCH - GAP), W), hoseFabricColor);
const fx = C[0] + TAIL;
add('female-shank', turned([[0, 0], [30, 0], [30, 50], [0, 50]]).rotateY(90).translate(fx - 20, 0, 34), couplingMetalColor);
add('female-swivel', turned([[0, 0], [40, 0], [40, 6], [44, 10], [44, 50], [40, 56], [0, 56]]).rotateY(90).translate(fx + 26, 0, 34), couplingMetalColor);
for (const a of [90, 210, 330]) {
  const t = (a * Math.PI) / 180;
  add(`rocker-lug-${a}`, box(30, 14, 14, true).translate(fx + 58, 47 * Math.cos(t), 34 + 47 * Math.sin(t)), couplingMetalColor);
}
add('female-bore', cylinder(4, 28, 16).rotateY(90).translate(fx + 80, 0, 34), webbingColor);

// Male coupling tucked in the centre hole.
add('male-coupling', turned([[0, 0], [26, 0], [26, 36], [32, 36], [32, 48], [24, 48], [24, 80], [0, 80]]).rotateY(-90).translate(C[0] + 40, 0, C[1]), couplingMetalColor);

// Webbing strap looped through the centre and over the top, with a carry loop.
const STRAP = 40;
const loop = (y0, z0, y1, z1, t) => frontYZ(rect(y0 - t, z0 - t, y1 + t, z1 + t), STRAP).subtract(frontYZ(rect(y0, z0, y1, z1), STRAP + 4));
add('strap', loop(-W / 2, C[1] + CORE - 4, W / 2, C[1] + R + 2, 4), webbingColor);
add('carry-loop', loop(-30, C[1] + R + 10, 30, C[1] + R + 90, 6), webbingColor);
add('strap-buckle', box(STRAP + 8, 30, 8, true).translate(0, 0, C[1] + R + 8), couplingMetalColor);

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
