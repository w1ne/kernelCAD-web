// SPDX-License-Identifier: CC0-1.0
// Fines screen: the inclined vibrating screen that takes the grit, soil,
// broken glass and food scraps out of a mixed waste stream before it
// reaches the pickers. A steeply sloped deck of woven wire mesh panels sits
// in a box of heavy side plates braced by round tubes; an exciter beam
// with a motor on each end throws the whole box on four coil springs so
// the load bounces down the slope. Fines fall through the mesh into a
// funnel and onto a cross belt; everything too big walks off the low end
// into an overs chute. What makes it a vibrating screen rather than a
// chute: the sloped mesh deck with the cross-tube bracing, the exciter
// beam and motors on top, the coil springs at the corners and the two
// outlets (fines under, overs off the end).
// Generic visualization geometry at about real size (6.3 m long, 3.6 m
// wide, 3.6 m high), millimetres, Z up, deck falling toward -X.

meta({
  name: "fines-screen",
  license: 'CC0-1.0',
  title: "Fines screen",
  description: "Inclined vibrating fines screen at about real size: sloped deck of woven mesh panels between braced side plates, exciter beam with twin motors across the top, four coil springs on a four-leg support stand, feed box at the high end, funnel under the deck onto a fines cross belt, and an overs chute dropping onto a pile at the low end. Material controls: frame paint, screen mesh, coil springs, fines. plant, weathered, highVisibility and compost presets.",
  tags: ["recycling", "fines screen", "vibrating screen", "inclined screen", "screening", "grit removal", "materials recovery", "MRF", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6f9e', { label: 'Frame and side plates (paint)' });
const mesh = param('mesh', '#b9c0c4', { label: 'Screen mesh (woven wire)' });
const springs = param('springs', '#e0b52f', { label: 'Coil springs' });
const fines = param('fines', '#6b5640', { label: 'Fines (grit, soil, glass)' });

presets({
  plant: { frame: '#2f6f9e', mesh: '#b9c0c4', springs: '#e0b52f', fines: '#6b5640' },
  weathered: { frame: '#566673', mesh: '#8f918c', springs: '#8d7f4e', fines: '#5e5243' },
  highVisibility: { frame: '#e3742b', mesh: '#c9d0d4', springs: '#2f8f4e', fines: '#6b5640' },
  compost: { frame: '#3c7a4e', mesh: '#d36a2c', springs: '#e8c12c', fines: '#3f2f22' },
});

const p = assembly("fines-screen");
// Built with the deck falling toward +X, then turned 180 degrees so the
// mesh faces the preview camera and the discharge end sits on the left.
const add = (name: string, shape: Shape) => p.part(name, shape.rotateZ(180).scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const dark = '#2a2e31';

// Deck line: s along the slope (falling toward +X), h normal to the deck.
const ANG = 20, L = 4800, W = 1800, X0 = -2500, Z0 = 3000;
const ca = Math.cos((ANG * Math.PI) / 180), sa = Math.sin((ANG * Math.PI) / 180);
const at = (s: number, h: number): [number, number] => [X0 + s * ca + h * sa, Z0 - s * sa + h * ca];
const onDeck = (shape: Shape, s: number, h: number, y = 0) => {
  const [x, z] = at(s, h);
  return shape.rotateY(ANG).translate(x, y, z);
};

// Side plates and the round cross tubes that brace them.
for (const sd of [-1, 1]) {
  const y = sd * (W / 2 + 15);
  add(`side-plate-${sd < 0 ? 'f' : 'b'}`, profileXZ([at(-150, -260), at(L, -260), at(L, 160), at(-150, 380)], 30).translate(0, y, 0).color(frame));
  add(`side-flange-${sd < 0 ? 'f' : 'b'}`, onDeck(box(L + 150, 90, 40, true), L / 2 - 75, -280, sd * (W / 2 + 60)).color(frame));
}
for (const s of [700, 1900, 3100, 4300]) add(`cross-tube-${s}`, onDeck(cylinder(W + 60, 85, 12).rotateX(90).translate(0, W / 2 + 30, 0), s, -150).color(frame));

// Woven mesh panels with dark tensioning bars between them.
const NP = 6, PL = L / NP;
for (let i = 0; i < NP; i++) {
  add(`mesh-panel-${i}`, onDeck(box(PL - 30, W - 20, 14, true), PL / 2 + i * PL, 0).color(mesh));
  add(`panel-bar-${i}`, onDeck(box(40, W, 40, true), i * PL, 10).color(dark));
  for (let k = 1; k < 4; k++) add(`wire-${i}-${k}`, onDeck(box(10, W - 30, 8, true), i * PL + (k * PL) / 4, 10).color('#8a9296'));
}

// Fines bed on the mesh, thick at the feed end and thinning downhill.
add("fines-bed", profileXZ([at(0, 10), at(L * 0.8, 10), at(L * 0.55, 60), at(0, 170)], W - 60).color(fines));
for (let i = 0; i < 6; i++) add(`clod-${i}`, onDeck(box(220, 180, 120, true).rotateZ(i * 37).rotateX(i * 21), 1800 + i * 450, 90, -W / 2 + 300 + ((i * 5) % 6) * 230).color(i % 2 ? '#8a7a64' : fines));

// Exciter beam across the top with a vibrator motor outboard on each side.
const [ex, ez] = at(L * 0.42, 720);
add("exciter-beam", blk(ex, 0, ez - 160, 420, W + 60, 320).color(frame));
for (const sd of [-1, 1]) {
  const y0 = sd * (W / 2 + 30);
  add(`exciter-post-${sd < 0 ? 'f' : 'b'}`, profileXZ([at(L * 0.42 - 450, 300), at(L * 0.42 + 450, 300), [ex + 210, ez + 160], [ex - 210, ez + 160]], 40).translate(0, sd * (W / 2 + 15), 0).color(frame));
  add(`motor-${sd < 0 ? 'f' : 'b'}`, cylinder(560, 200, 14).rotateX(90).translate(ex, sd < 0 ? y0 : y0 + 560, ez).color(dark));
  add(`motor-cap-${sd < 0 ? 'f' : 'b'}`, cylinder(100, 240, 14).rotateX(90).translate(ex, sd < 0 ? y0 - 560 : y0 + 660, ez).color(springs));
}

// Feed box over the high end.
const [fx, fz] = at(200, 420);
add("feed-box", rect(900, W - 100).loft([rect(1100, W + 100)], {
  planes: [{ plane: 'XY' as const, origin: [fx - 150, 0, fz] as [number, number, number] }, { plane: 'XY' as const, origin: [fx - 250, 0, fz + 700] as [number, number, number] }],
  ruled: true,
}).subtract(blk(fx - 230, 0, fz + 80, 950, W - 200, 700)).color(frame));

// Spring brackets, coil springs and the four-leg stand.
for (const sd of [-1, 1]) {
  const y = sd * (W / 2 + 200);
  for (const s of [500, L - 500]) {
    const [bx, bz] = at(s, -260);
    const top = bz - 260;
    add(`spring-bracket-${sd < 0 ? 'f' : 'b'}-${s}`, blk(bx, y, top, 360, 340, 120).color(frame));
    add(`spring-core-${sd < 0 ? 'f' : 'b'}-${s}`, cylinder(380, 70, 10).translate(bx, y, top - 380).color(dark));
    for (let k = 0; k < 3; k++) add(`spring-${sd < 0 ? 'f' : 'b'}-${s}-${k}`, torus(110, 24, 8).translate(bx, y, top - 330 + k * 120).color(springs));
    add(`leg-${sd < 0 ? 'f' : 'b'}-${s}`, blk(bx, y, 0, 220, 220, top - 380).color(frame));
    add(`foot-${sd < 0 ? 'f' : 'b'}-${s}`, blk(bx, y, 0, 400, 400, 25).color(frame));
  }
}
const [lx0] = at(500, -260), [lx1] = at(L - 500, -260);
for (const sd of [-1, 1]) add(`stand-rail-${sd < 0 ? 'f' : 'b'}`, blk((lx0 + lx1) / 2, sd * (W / 2 + 200), 700, lx1 - lx0, 160, 160).color(frame));
add("stand-cross", blk(lx1, 0, 700, 160, W + 560, 160).color(frame));

// Fines funnel under the deck onto a cross belt running out toward -Y.
const [ux] = at(L * 0.45, 0);
add("fines-funnel", rect(900, W - 400).loft([rect(2600, W + 40)], {
  planes: [{ plane: 'XY' as const, origin: [ux, 0, 1000] as [number, number, number] }, { plane: 'XY' as const, origin: [ux, 0, 1700] as [number, number, number] }],
  ruled: true,
}).color(frame));
const YB0 = -W / 2 - 300, YB1 = W / 2 + 1700, ZB = 620;
add("fines-belt", blk(ux, (YB0 + YB1) / 2, ZB, 800, YB1 - YB0, 40).color('#2b2f33'));
add("fines-on-belt", blk(ux, (YB0 + YB1) / 2 + 300, ZB + 40, 520, YB1 - YB0 - 900, 60).color(fines));
for (const sd of [-1, 1]) add(`belt-rail-${sd < 0 ? 'l' : 'r'}`, blk(ux + sd * 440, (YB0 + YB1) / 2, ZB - 140, 80, YB1 - YB0, 180).color(frame));
for (const y of [YB0 + 200, YB1 - 200]) for (const sd of [-1, 1]) add(`belt-leg-${y}-${sd < 0 ? 'l' : 'r'}`, blk(ux + sd * 440, y, 0, 80, 80, ZB - 140).color(frame));

// Overs chute off the low end onto a pile.
const [ox, oz] = at(L, 60);
add("overs-chute", profileXZ([[ox - 40, oz + 60], [ox + 140, oz + 60], [ox + 900, oz - 700], [ox + 720, oz - 760]], W + 60).color(frame));
add("overs-pile", rect(1800, 2000).loft([rect(500, 700)], {
  planes: [{ plane: 'XY' as const, origin: [ox + 1300, 0, 0] as [number, number, number] }, { plane: 'XY' as const, origin: [ox + 1250, 0, 500] as [number, number, number] }],
  ruled: true,
}).color('#8a7f70'));
for (let i = 0; i < 5; i++) add(`overs-lump-${i}`, box(260, 200, 140, true).rotateZ(i * 41).rotateY(i * 17).translate(ox + 1000 + (i % 3) * 300, -600 + i * 300, 330 + (i % 2) * 120).color(i % 2 ? '#c9b48a' : '#5c7a8c'));

return p.model();
