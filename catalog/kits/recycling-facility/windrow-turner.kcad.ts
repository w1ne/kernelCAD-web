// SPDX-License-Identifier: CC0-1.0
// Self-propelled straddle compost windrow turner, the machine that drives
// along an open-air compost row and flips it to aerate it. What makes it one:
// a tall tunnel frame that straddles the whole windrow on two crawler tracks;
// a full-width rotor drum slung under the tunnel roof with paddle flights
// wound helically along it; a heap of compost passing through the tunnel; a
// glazed operator cab on one leg and a diesel power pack with exhaust stack
// and radiator on the roof beam. Millimetres, Z up, ground origin, the rotor
// spans X and the machine travels along Y.
meta({
  name: "windrow-turner",
  license: 'CC0-1.0',
  title: "Windrow turner",
  description: "Self-propelled straddle compost windrow turner at about real size: tunnel frame on two crawler tracks with sprockets and rollers, full-width rotor drum with helical paddle flights and a rear curtain, compost windrow running through the tunnel, glazed operator cab with ladder and handrail, roof-mounted diesel power pack with radiator grille and exhaust stack. Material controls: machine paint, tracks and undercarriage, rotor steel, cab glazing; weathered, highVisibility and green-machine presets.",
  tags: ["recycling", "materials recovery", "waste management", "organics", "compost", "windrow turner", "crawler", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', '#e0a321', { label: 'Machine paint' });
const tracks = param('tracks', '#2c3033', { label: 'Tracks and undercarriage' });
const rotor = param('rotor', '#8f969a', { label: 'Rotor drum and flights' });
const glass = param('glass', '#7fa8bd', { label: 'Cab glazing' });
presets({
  weathered: { paint: '#a98845', tracks: '#3a3936', rotor: '#7a6f62', glass: '#6b8290' },
  highVisibility: { paint: '#ffc93a', glass: '#9fd0e6' },
  greenMachine: { paint: '#3f7d3a', rotor: '#b0b5b8', glass: '#8fb4c4' },
});

const p = assembly("windrow-turner");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Section [[x, z], ...] extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
const alongX = (shape) => shape.rotateY(90);

const steel = '#5a5f63', exhaust = '#3a3c3e';
const legX = 2650; // track centreline either side of the windrow

// ---- Windrow: a compost heap with a crowned section passing through the tunnel ----
const heap = [];
for (let i = 0; i <= 12; i++) {
  const a = (Math.PI * i) / 12;
  heap.push([Math.cos(a) * 2150, Math.max(0, Math.sin(a)) * 1550 * (0.8 + 0.2 * Math.sin(a))]);
}
add('windrow', prismY(heap, -3600, 3600).color('#5b4330'));
add('windrow-turned', prismY(heap.map(([x, z]) => [x * 0.96, z * 1.08]), 1400, 3600).color('#6e5238'));

// ---- Crawler tracks: stadium-shaped belts with sprocket, idler and rollers ----
for (const s of [-1, 1]) {
  const x = s * legX;
  const run = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 8;
    run.push([1350 + Math.cos(a) * 330, 330 + Math.sin(a) * 330]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / 8;
    run.push([-1350 + Math.cos(a) * 330, 330 + Math.sin(a) * 330]);
  }
  add(`track-${s}`, prismX(run, x - 300, x + 300).color(tracks));
  for (let i = -6; i <= 6; i++) add(`grouser-${s}-${i}`, blk(x - 310, i * 220 - 30, 0, x + 310, i * 220 + 30, 45).color(tracks));
  add(`sprocket-${s}`, alongX(rod(280, -320, 320)).translate(x, 1350, 330).color(steel));
  add(`idler-${s}`, alongX(rod(270, -320, 320)).translate(x, -1350, 330).color(steel));
  for (const y of [-700, 0, 700]) add(`roller-${s}-${y}`, alongX(rod(120, -330, 330)).translate(x, y, 200).color(steel));
  add(`track-frame-${s}`, blk(x - 220, -1250, 420, x + 220, 1250, 700).color(paint));
  add(`final-drive-${s}`, alongX(rod(220, s > 0 ? 300 : -460, s > 0 ? 460 : -300)).translate(x, 1350, 330).color(tracks));
}

// ---- Tunnel frame: two tapered legs and a deep roof beam spanning the windrow ----
for (const s of [-1, 1]) {
  const x0 = s * (legX - 260), x1 = s * (legX + 260);
  add(`leg-${s}`, prismY([[x0, 700], [x1, 700], [s * (legX + 200), 3000], [s * (legX - 200), 3000]], -950, 950).color(paint));
  add(`leg-brace-${s}`, prismY([[s * (legX - 260), 2500], [s * (legX - 260), 3000], [s * (legX - 760), 3000]], -700, 700).color(paint));
}
add('roof-beam', blk(-legX - 260, -1000, 3000, legX + 260, 1000, 3550).color(paint));
add('roof-deck', blk(-legX - 300, -1100, 3550, legX + 300, 1100, 3600).color(steel));
for (const s of [-1, 1]) add(`roof-handrail-post-${s}`, blk(-legX, s * 1060 - 20, 3600, legX, s * 1060 + 20, 3640).color(paint));

// ---- Rotor: full-width drum with helical paddle flights, under a hood ----
const rz = 1650, ry = 0;
add('rotor-hood', prismX([[-1050, 2950], [1050, 2950], [1050, 2250], [800, 2050], [-700, 2700]], -legX + 260, legX - 260).color(paint));
add('rotor-drum', alongX(rod(330, -legX + 280, legX - 280)).translate(0, ry, rz).color(rotor));
for (const s of [-1, 1]) add(`rotor-hub-${s}`, alongX(rod(420, -170, 170)).translate(s * (legX - 420), ry, rz).color(tracks));
for (let i = 0; i < 26; i++) {
  const x = -legX + 560 + i * 175;
  for (const k of [0, 1]) {
    const a = (i * 0.48 + k * Math.PI) * (x < 0 ? 1 : -1);
    const tip = [Math.cos(a) * 760, Math.sin(a) * 760];
    const tipB = [Math.cos(a + 0.22) * 760, Math.sin(a + 0.22) * 760];
    const root = [Math.cos(a) * 300, Math.sin(a) * 300], rootB = [Math.cos(a + 0.22) * 300, Math.sin(a + 0.22) * 300];
    add(`flight-${i}-${k}`, prismX([root, tip, tipB, rootB].map(([y, z]) => [ry + y, rz + z]), x, x + 70).color(rotor));
  }
}
add('rear-curtain', blk(-legX + 300, 1000, 1700, legX - 300, 1040, 3000).color(tracks));

// ---- Power pack on the roof: engine hood, radiator grille, stack, tank ----
add('engine-hood', prismY([[-2300, 3600], [-200, 3600], [-200, 4500], [-450, 4750], [-2300, 4750]], -900, 900).color(paint));
for (let i = 0; i < 7; i++) add(`grille-${i}`, blk(-2310, -800 + i * 240, 3800, -2290, -700 + i * 240, 4600).color(tracks));
add('exhaust-stack', rod(80, 4750, 5600).translate(-700, 600, 0).color(exhaust));
add('exhaust-cap', turned([[0, 5600], [110, 5600], [90, 5680], [0, 5680]]).translate(-700, 600, 0).color(exhaust));
add('air-cleaner', rod(170, 4750, 5150).translate(-1500, 600, 0).color(steel));
add('fuel-tank', blk(400, -900, 3600, 1800, -100, 4100).color(steel));
add('hydraulic-tank', blk(400, 100, 3600, 1600, 900, 4250).color(paint));

// ---- Operator cab on the right leg, with glazing, ladder and handrail ----
const cx = legX + 300;
add('cab-floor', blk(cx - 150, -1100, 2700, cx + 1500, 900, 2800).color(paint));
add('cab-bracket', prismY([[legX + 150, 1800], [legX + 150, 2700], [cx + 1100, 2700]], -600, 600).color(paint));
add('cab-shell', prismY([[cx + 50, 2800], [cx + 1450, 2800], [cx + 1450, 3700], [cx + 1300, 4800], [cx + 50, 4800]], -650, 750).color(paint));
add('cab-roof', blk(cx, -720, 4800, cx + 1520, 820, 4900).color(paint));
add('cab-windscreen', prismY([[cx + 1455, 3200], [cx + 1475, 3200], [cx + 1475, 3700], [cx + 1325, 4720], [cx + 1305, 4720], [cx + 1455, 3700]], -600, 700).color(glass));
add('cab-door-glass', blk(cx + 200, -670, 3300, cx + 1250, -650, 4650).color(glass));
add('cab-side-glass', blk(cx + 200, 750, 3300, cx + 1250, 770, 4650).color(glass));
add('beacon', turned([[0, 4900], [60, 4900], [55, 5030], [0, 5060]]).translate(cx + 1300, 700, 0).color('#f08c00'));
for (const s of [-1, 1]) add(`cab-mirror-${s}`, blk(cx + 1500, s * 850 - 40, 4200, cx + 1540, s * 850 + 40, 4450).color(tracks));
for (let i = 0; i < 7; i++) add(`ladder-rung-${i}`, blk(cx + 300, -1060, 900 + i * 280, cx + 700, -1020, 930 + i * 280).color(steel));
for (const x of [cx + 300, cx + 680]) add(`ladder-rail-${x}`, blk(x, -1080, 800, x + 20, -1000, 2800).color(steel));
add('cab-handrail', blk(cx, -1060, 3700, cx + 1500, -1020, 3740).color(paint));
for (const x of [cx, cx + 750, cx + 1460]) add(`cab-handrail-post-${x}`, blk(x, -1060, 2800, x + 40, -1020, 3700).color(paint));

return p.model();
