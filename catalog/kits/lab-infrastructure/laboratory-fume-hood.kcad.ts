// SPDX-License-Identifier: CC0-1.0
// Bench-mounted laboratory fume hood on a base cabinet.
// What makes it a fume hood rather than a cupboard: a tall open-fronted
// chamber between thick side posts with a sloped header, a vertical rising
// glass sash with a pull bar, an aerofoil sill across the front of the dished
// epoxy worktop, a slotted rear baffle, an airflow monitor and gas cocks on
// the posts, and a round exhaust collar on the roof. Generic visualization
// geometry at real size (1.5 m wide, 2.4 m to the roof), millimetres, Z up,
// user stands on the -Y side, plinth on z = 0.
meta({
  name: 'laboratory-fume-hood',
  license: 'CC0-1.0',
  title: 'Laboratory fume hood',
  description: 'Bench-mounted fume hood: open chamber between side posts with a sloped header, rising glass sash with pull bar, aerofoil sill on a dished epoxy worktop, slotted rear baffle, airflow monitor, gas cocks, three-door base cabinet and round exhaust collar. Material controls: enamel shell, epoxy worktop, sash glass, stainless baffle and sash frame, polymer controls. Closed, working or raised sash; cleanroom, high-visibility and teaching-lab presets.',
  tags: ['fume hood', 'fume cupboard', 'sash', 'exhaust', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const sash = param('sash', 'working', { choices: ['closed', 'working', 'raised'], label: 'Sash position' });
const enamel = param('enamel', '#c9dedc', { label: 'Shell and cabinet enamel' });
const epoxy = param('epoxy', '#2b3135', { label: 'Epoxy worktop and plinth' });
const glass = param('glass', '#55b7ca', { label: 'Sash safety glass' });
const stainless = param('stainless', '#b8c7ca', { label: 'Baffle, sash frame and collar stainless' });
const polymer = param('polymer', '#e5a331', { label: 'Monitor, valve and pull polymer' });
presets({
  cleanroom: { enamel: '#e7f0ed', epoxy: '#dfe5e3', glass: '#8bd4dc', stainless: '#d0d9d8', polymer: '#23a5a2' },
  highVisibility: { enamel: '#f0f2e8', epoxy: '#1b1f22', glass: '#44d3e2', stainless: '#6f8488', polymer: '#ffe000' },
  teachingLab: { enamel: '#e9e2cf', epoxy: '#3c4a3f', glass: '#7cc3c9', stainless: '#a9b2b3', polymer: '#c8402c' },
});

const p = assembly('laboratory-fume-hood');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Solid from a (y, z) side profile, `t` thick and centred on x = 0.
const sideProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Round bar from p0 to p1.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const W = 1500;
const D = 850;
const FRONT = -D / 2;
const ZT = 900;
const TOP = 2400;
const POST = 110;
const IN_W = W - 2 * POST;

// Base cabinet: dark recessed plinth, carcass, three doors with pulls.
add('plinth', box(W - 60, D - 120, 90, true).translate(0, 30, 45).color(epoxy));
add('base-carcass', box(W - 20, D - 40, 780, true).translate(0, 0, 480).color(enamel));
const DW = (W - 40) / 3;
for (let i = 0; i < 3; i += 1) {
  const x = -W / 2 + 20 + DW / 2 + i * DW;
  add(`door-${i}`, box(DW - 8, 18, 700, true).translate(x, FRONT + 11, 460).color(enamel));
  const px = x + (i === 2 ? -1 : 1) * (DW / 2 - 50);
  add(`door-pull-${i}`, rod([px, FRONT - 20, 700], [px, FRONT - 20, 540], 9, 8).color(polymer));
  add(`pull-post-${i}`, box(14, 22, 170, true).translate(px, FRONT - 9, 620).color(stainless));
}

// Dished epoxy worktop with a raised marine edge and a cup sink.
add('worktop', box(W + 20, D + 20, 30, true).translate(0, -5, ZT - 15).color(epoxy));
add('marine-edge-front', box(IN_W, 26, 14, true).translate(0, FRONT + 10, ZT + 7).color(epoxy));
add('cup-sink', turned([[0, 0], [70, 0], [70, 8], [55, 8], [40, 3], [0, 3]]).translate(IN_W / 2 - 140, 260, ZT).color(stainless));

// Side posts with the sloped front edge, rear wall, roof and sloped header.
for (const s of [-1, 1]) {
  add(`side-post-${s}`, sideProfile([[FRONT, ZT], [D / 2, ZT], [D / 2, TOP], [FRONT + 125, TOP], [FRONT, TOP - 170]], POST).translate(s * (W / 2 - POST / 2), 0, 0).color(enamel));
}
add('rear-wall', box(IN_W, 40, TOP - ZT, true).translate(0, D / 2 - 20, (TOP + ZT) / 2).color(enamel));
add('roof', box(IN_W, D - 200, 40, true).translate(0, 100, TOP - 20).color(enamel));
add('header', sideProfile([[FRONT, TOP - 240], [FRONT + 225, TOP - 240], [FRONT + 225, TOP], [FRONT + 125, TOP], [FRONT, TOP - 170]], IN_W).color(enamel));
add('header-label', sideProfile([[FRONT - 2, TOP - 225], [FRONT - 2, TOP - 185], [FRONT + 50, TOP - 115], [FRONT + 50, TOP - 155]], 520).color(polymer));

// Aerofoil sill across the front of the work surface.
add('aerofoil-sill', sideProfile([[FRONT - 30, ZT + 12], [FRONT - 18, ZT + 32], [FRONT + 10, ZT + 42], [FRONT + 60, ZT + 38], [FRONT + 85, ZT + 28], [FRONT + 60, ZT + 22], [FRONT + 5, ZT + 16]], IN_W).color(stainless));

// Slotted stainless rear baffle with dark exhaust slots and a light lens under the roof.
add('rear-baffle', box(IN_W - 20, 20, 1220, true).translate(0, D / 2 - 70, ZT + 20 + 610).color(stainless));
for (const z of [ZT + 60, ZT + 640, ZT + 1190]) {
  add(`baffle-slot-${z}`, box(IN_W - 120, 6, 36, true).translate(0, D / 2 - 82, z).color(epoxy));
}
add('light-lens', box(IN_W - 300, 160, 20, true).translate(0, 60, TOP - 50).color(glass));

// Rising sash: stainless frame, glass pane, pull bar on stand-offs.
const SH = 760;
const ZB = ZT + 60 + { closed: 0, working: 450, raised: 650 }[sash.value];
const SY = FRONT + 45;
add('sash-bottom-rail', box(IN_W - 10, 36, 60, true).translate(0, SY, ZB + 30).color(stainless));
add('sash-top-rail', box(IN_W - 10, 30, 40, true).translate(0, SY, ZB + SH - 20).color(stainless));
for (const s of [-1, 1]) {
  add(`sash-stile-${s}`, box(40, 30, SH, true).translate(s * (IN_W / 2 - 25), SY, ZB + SH / 2).color(stainless));
  add(`pull-standoff-${s}`, rod([s * (IN_W / 2 - 160), SY - 18, ZB + 30], [s * (IN_W / 2 - 160), SY - 60, ZB + 30], 8, 8).color(stainless));
}
add('sash-glass', box(IN_W - 80, 8, SH - 100, true).translate(0, SY, ZB + 60 + (SH - 100) / 2).color(glass));
add('sash-pull-bar', rod([-(IN_W / 2 - 130), SY - 60, ZB + 30], [IN_W / 2 - 130, SY - 60, ZB + 30], 15, 10).color(polymer));

// Airflow monitor and duplex outlet on the right post, gas cocks on the left post.
const RX = W / 2 - POST / 2;
add('airflow-monitor', box(84, 24, 150, true).translate(RX, FRONT - 12, 1650).color(polymer));
add('monitor-screen', box(60, 6, 54, true).translate(RX, FRONT - 26, 1685).color(glass));
add('monitor-alarm', turned([[0, 0], [9, 0], [9, 6], [0, 8]]).rotateX(90).translate(RX, FRONT - 24, 1610).color(epoxy));
add('outlet-plate', box(76, 10, 120, true).translate(RX, FRONT - 5, 1150).color(polymer));
for (const z of [1125, 1175]) add(`outlet-face-${z}`, box(40, 6, 30, true).translate(RX, FRONT - 12, z).color(enamel));
for (const z of [1080, 1260]) {
  add(`gas-cock-${z}`, turned([[0, 0], [16, 0], [16, 50], [10, 56], [0, 56]]).rotateX(90).translate(-RX, FRONT, z).color(stainless));
  add(`gas-barb-${z}`, rod([-RX, FRONT - 56, z], [-RX, FRONT - 100, z], 6, 8).color(stainless));
  add(`gas-handle-${z}`, box(18, 14, 70, true).translate(-RX, FRONT - 40, z + 30).color(polymer));
}

// Round exhaust collar on the roof, with a dark throat.
add('exhaust-collar', turned([[0, 0], [175, 0], [175, 20], [150, 20], [150, 220], [165, 220], [165, 240], [0, 240]]).translate(0, 80, TOP).color(stainless));
add('collar-throat', turned([[0, 240], [138, 240], [138, 243], [0, 243]]).translate(0, 80, TOP).color(epoxy));

return p.model();
