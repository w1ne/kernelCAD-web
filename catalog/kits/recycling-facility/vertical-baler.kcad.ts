// SPDX-License-Identifier: CC0-1.0
// Vertical down-stroke baler, the upright press that sits at the back of a
// supermarket or MRF and squeezes cardboard and film into strapped bales.
// What makes it one: a tall ribbed press chamber with the hydraulic main
// cylinder standing on its crosshead; an upper feed opening closed by a
// sliding mesh safety gate, with the platen and loose cardboard visible
// through it; a heavy lower bale door with hinges, a wheel latch and
// vertical tie slots; a side power pack and control box; and a finished,
// wire-tied bale on a pallet beside it. Millimetres, Z up, floor origin,
// the doors face -Y.
meta({
  name: "vertical-baler",
  license: 'CC0-1.0',
  title: "Vertical baler",
  description: "Vertical down-stroke cardboard baler at about real size: ribbed press chamber with corner posts, crosshead with standing main cylinder and hoses, upper feed opening with sliding mesh safety gate showing the platen and loose cardboard, hinged lower bale door with wheel latch and tie slots, side hydraulic power pack and control box, finished wire-tied bale on a pallet. Material controls: chamber paint, safety gate and trim, hydraulics, bale cardboard; weathered, highVisibility and red-baler presets.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "baler", "cardboard", "hydraulic press", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chamber = param('chamber', '#2a5d8f', { label: 'Press chamber paint' });
const gate = param('gate', '#f2b51c', { label: 'Safety gate and trim' });
const hydraulics = param('hydraulics', '#a9aeb2', { label: 'Cylinder and hydraulics' });
const bale = param('bale', '#b98a55', { label: 'Cardboard bale' });
presets({
  weathered: { chamber: '#4b5c69', gate: '#c9993a', hydraulics: '#85817a', bale: '#9c7a55' },
  highVisibility: { chamber: '#d77632', gate: '#ffd044' },
  redBaler: { chamber: '#b2302b', gate: '#2f3338', bale: '#c49a64' },
});

const p = assembly("vertical-baler");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

const dark = '#1f2326', wire = '#c9ccce', pallet = '#a77c4a';

// ---- Base skid, press chamber, corner posts and ribs ----
add('base-skid', blk(-980, -620, 0, 980, 620, 150).color(chamber));
add('chamber-body', blk(-900, -520, 150, 900, 560, 2600).color(chamber));
for (const x of [-900, 900]) for (const y of [-560, 560]) add(`corner-post-${x}-${y}`, blk(x - 70, y - 70, 150, x + 70, y + 70, 2650).color(chamber));
for (const s of [-1, 1]) for (const y of [-200, 200]) add(`side-rib-${s}-${y}`, blk(s * 900 - 25, y - 40, 200, s * 900 + 25, y + 40, 2550).color(chamber));
for (const z of [900, 1700]) add(`back-band-${z}`, blk(-880, 560, z, 880, 600, z + 100).color(chamber));

// ---- Crosshead with the main cylinder, hoses and lifting eyes ----
add('crosshead', blk(-1000, -620, 2650, 1000, 640, 2900).color(chamber));
add('cylinder-barrel', rod(170, 2900, 3650).color(hydraulics));
add('cylinder-cap', turned([[0, 3650], [210, 3650], [210, 3730], [120, 3780], [0, 3780]]).color(hydraulics));
add('cylinder-gland', ring(170, 240, 2900, 2980).color(hydraulics));
for (const s of [-1, 1]) {
  add(`hose-${s}`, blk(s * 180, -25, 3000 + (s > 0 ? 0 : 500), s * 330, 25, 3050 + (s > 0 ? 0 : 500)).color(dark));
  add(`hose-drop-${s}`, blk(s * 300, -25, 2900, s * 340, 25, 3050 + (s > 0 ? 0 : 500)).color(dark));
  add(`lifting-eye-${s}`, ring(35, 70, -12, 12).rotateX(90).translate(s * 800, 0, 2960).color(hydraulics));
}

// ---- Upper feed opening: dark mouth, platen and loose cardboard behind a mesh gate ----
add('feed-mouth', blk(-760, -540, 1520, 760, -500, 2450).color(dark));
add('platen', blk(-740, -530, 2280, 740, -480, 2420).color(hydraulics));
for (let i = 0; i < 5; i++) {
  const x = -620 + i * 300;
  add(`loose-board-${i}`, blk(x - 140, -545, 1520, x + 130, -505, 1700 + (i % 2) * 120).rotateY(i % 2 ? 6 : -5).color(bale));
}
add('gate-frame-top', blk(-800, -600, 2380, 800, -540, 2460).color(gate));
add('gate-frame-bottom', blk(-800, -600, 1780, 800, -540, 1860).color(gate));
for (const x of [-800, 760]) add(`gate-stile-${x}`, blk(x, -600, 1780, x + 40, -540, 2460).color(gate));
for (let i = 0; i < 13; i++) add(`gate-bar-${i}`, blk(-720 + i * 120, -590, 1860, -700 + i * 120, -570, 2380).color(gate));
add('gate-cross', blk(-760, -595, 2110, 760, -575, 2130).color(gate));
add('gate-handle', blk(-120, -650, 1800, 120, -600, 1840).color(dark));
for (const x of [-860, 820]) add(`gate-track-${x}`, blk(x, -600, 1500, x + 40, -540, 3050).color(chamber));
add('opening-sill', blk(-900, -620, 1440, 900, -520, 1520).color(gate));

// ---- Lower bale door: stiffened panel, hinges, wheel latch and tie slots ----
add('bale-door', blk(-860, -590, 180, 860, -520, 1420).color(chamber));
for (const z of [420, 800, 1180]) add(`door-stiffener-${z}`, blk(-840, -630, z, 840, -590, z + 60).color(chamber));
for (const x of [-540, -180, 180, 540]) add(`tie-slot-${x}`, blk(x - 18, -632, 200, x + 18, -625, 1400).color(dark));
for (const z of [300, 1200]) {
  add(`hinge-${z}`, rod(45, z, z + 140).translate(-900, -610, 0).color(hydraulics));
  add(`hinge-leaf-${z}`, blk(-900, -620, z + 20, -760, -595, z + 120).color(chamber));
}
add('latch-wheel', ring(150, 190, -18, 18).rotateX(90).translate(640, -660, 860).color(gate));
add('latch-hub', rod(55, 0, 60).rotateX(90).translate(640, -630, 860).color(hydraulics));
for (const a of [0, 60, 120]) add(`latch-spoke-${a}`, blk(-170, -660, -10, 170, -650, 10).rotateY(a).translate(640, 0, 860).color(gate));
add('warning-strip', blk(-860, -600, 150, 860, -580, 180).color(gate));

// ---- Side power pack and control box (+X) ----
add('oil-tank', blk(980, -300, 150, 1380, 400, 750).color(chamber));
add('pump-motor', rod(150, 750, 1150).translate(1180, 50, 0).color(hydraulics));
add('motor-cowl', turned([[0, 1150], [150, 1150], [110, 1220], [0, 1220]]).translate(1180, 50, 0).color(dark));
add('filler-cap', rod(40, 750, 800).translate(1080, 300, 0).color(dark));
add('power-hose', blk(1160, 380, 750, 1200, 420, 2800).color(dark));
add('power-hose-top', blk(330, 380, 2760, 1200, 420, 2800).color(dark));
add('control-box', blk(940, -560, 1100, 1240, -300, 1600).color('#d9dcde'));
add('button-start', rod(26, 0, 25).rotateX(90).translate(1040, -560, 1350).color('#2e9b46'));
add('button-stop', rod(26, 0, 25).rotateX(90).translate(1140, -560, 1350).color('#d0302a'));
add('key-switch', rod(22, 0, 20).rotateX(90).translate(1090, -560, 1480).color(dark));

// ---- Finished bale on a pallet, tied with five wires ----
const bx = -1950;
for (const y of [-500, 0, 500]) add(`pallet-runner-${y}`, blk(bx - 600, y - 50, 0, bx + 600, y + 50, 100).color(pallet));
for (let i = 0; i < 7; i++) add(`pallet-slat-${i}`, blk(bx - 600 + i * 190, -600, 100, bx - 500 + i * 190, 600, 130).color(pallet));
add('bale-block', blk(bx - 560, -380, 130, bx + 560, 380, 880).color(bale));
for (let i = 0; i < 6; i++) add(`bale-layer-${i}`, blk(bx - 565, -385, 200 + i * 115, bx + 565, 385, 212 + i * 115).color('#8f6a40'));
for (const x of [-420, -210, 0, 210, 420]) {
  add(`bale-wire-top-${x}`, blk(bx + x - 8, -390, 880, bx + x + 8, 390, 890).color(wire));
  add(`bale-wire-front-${x}`, blk(bx + x - 8, -392, 130, bx + x + 8, -385, 890).color(wire));
}

return p.model();
