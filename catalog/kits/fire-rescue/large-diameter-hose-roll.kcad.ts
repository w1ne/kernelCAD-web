// SPDX-License-Identifier: CC0-1.0
// Large diameter supply hose roll: a 30 m length of 125 mm supply hose
// (LDH), the hose that carries water from a hydrant to the pumper. What sets
// it apart from an attack-hose roll is the size - a flat jacket 200 mm wide
// wound into a roll about 0.7 m across - and the sexless Storz couplings:
// a ribbed collar and flat face with two hooked lugs, one in the centre of
// the roll and one on the outer end, lying on a tail of flat hose. A wide
// webbing strap through the centre carries a grab loop. Generic
// visualization geometry at about real size, millimetres, Z up, roll axis
// across Y, tail toward +X, lowest point on z = 0.
meta({
  name: "large-diameter-hose-roll",
  license: 'CC0-1.0',
  title: "Large diameter supply hose roll",
  description: "Rolled 125 mm large-diameter supply hose: 200 mm wide flat jacket wound into a 0.7 m spiral standing on edge, a Storz coupling with ribbed collar and hooked lugs in the centre, the outer tail lying on the ground to a second Storz coupling with a blanking cap chain, and a wide webbing strap through the centre with a grab loop. Material controls: hose fabric, coupling metal, webbing and safety trim; weathered, highVisibility and municipalBlue presets.",
  tags: ['fire hose', 'supply hose', 'LDH', 'Storz coupling', 'hose roll', 'fire rescue', 'fire service', 'emergency scene', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 3000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const hoseFabricColor = param('hoseFabricColor', '#d8c24a', { label: 'Hose fabric' });
const couplingMetalColor = param('couplingMetalColor', '#b9c1c4', { label: 'Coupling metal' });
const webbingColor = param('webbingColor', '#b2382e', { label: 'Webbing and safety trim' });
presets({
  weathered: { hoseFabricColor: '#a8995a', couplingMetalColor: '#8c9698', webbingColor: '#7d4a40' },
  highVisibility: { hoseFabricColor: '#e17825', couplingMetalColor: '#c1c2b5', webbingColor: '#f2df62' },
  municipalBlue: { hoseFabricColor: '#3f6fa6', couplingMetalColor: '#c9cdcf', webbingColor: '#e8e3d4' },
});

const p = assembly("large-diameter-hose-roll");
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

const W = 200; // flat hose width
const R = 340; // outer radius of the roll
const CORE = 110; // radius of the centre hole
const TURNS = 7; // visible wraps (each stands for several real ones)
const PITCH = (R - CORE) / TURNS;
const GAP = 4;
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

// Storz coupling along +X from x = 0: shank, ribbed collar, flat face, two hooked lugs.
const storz = (name, x, z, dir) => {
  const place = (s) => (dir > 0 ? s : s.rotateZ(180)).translate(x, 0, z);
  add(`${name}-shank`, place(turned([[0, 0], [70, 0], [70, 80], [0, 80]]).rotateY(90)), couplingMetalColor);
  add(`${name}-collar`, place(turned([[0, 0], [88, 0], [92, 8], [92, 22], [86, 26], [92, 30], [92, 44], [86, 48], [92, 52], [92, 66], [88, 72], [0, 72]]).rotateY(90).translate(80, 0, 0)), couplingMetalColor);
  add(`${name}-face`, place(turned([[0, 0], [98, 0], [98, 22], [62, 22], [62, 18], [0, 18]]).rotateY(90).translate(152, 0, 0)), couplingMetalColor);
  for (const s of [-1, 1]) {
    const lug = sideXZ([[0, 0], [46, 0], [46, 10], [34, 22], [0, 22]], 54);
    add(`${name}-lug-${s}`, place((s > 0 ? lug : lug.rotateX(180)).translate(170, 0, s > 0 ? 78 : -78)), couplingMetalColor);
  }
};

// Outer tail lying flat on the ground out to a Storz coupling.
const TAIL = 420;
const T = PITCH - GAP;
add('hose-tail', sideXZ(rect(C[0] - 2, 0, C[0] + TAIL, T), W * 0.92), hoseFabricColor);
storz('outer-storz', C[0] + TAIL - 30, 100, 1);
add('blanking-cap', turned([[0, 0], [98, 0], [98, 30], [40, 40], [0, 40]]).rotateY(90).translate(C[0] + TAIL + 160, 0, 100), webbingColor);
// Centre coupling sitting in the core of the roll.
storz('centre-storz', C[0] + 100, C[1] - 10, -1);

// Webbing strap looped through the centre and over the top, with a grab loop.
const STRAP = 70;
const loop = (y0, z0, y1, z1, t) => frontYZ(rect(y0 - t, z0 - t, y1 + t, z1 + t), STRAP).subtract(frontYZ(rect(y0, z0, y1, z1), STRAP + 4));
add('strap', loop(-W / 2, C[1] + CORE - 6, W / 2, C[1] + R + 2, 6), webbingColor);
add('grab-loop', loop(-60, C[1] + R + 14, 60, C[1] + R + 150, 8), webbingColor);
add('strap-buckle', box(STRAP + 10, 50, 10, true).translate(0, 0, C[1] + R + 13), couplingMetalColor);

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
