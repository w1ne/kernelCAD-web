// SPDX-License-Identifier: CC0-1.0
// Bale ejector: the discharge end of a horizontal channel baler, where
// finished bales leave the press and get pushed off to the side for the
// forklift. What makes it that station rather than a box: the outlet of the
// press channel squeezed by a tension yoke with two hydraulic cylinders, a
// powered roller table carrying a freshly tied bale, a side-eject pusher
// plate on a long hydraulic ram that shoves the bale sideways onto a
// gravity roller run with an end stop, a hydraulic power pack with tank and
// motor, a light curtain and a control panel.
// Generic visualization geometry at about real size (5.5 m wide, 5.6 m
// long, 2.7 m high), millimetres, Z up, bale travels toward -Y then -X.

meta({
  name: "bale-ejector",
  license: 'CC0-1.0',
  title: "Bale ejector",
  description: "Baler discharge station at about real size: press channel outlet with a tension yoke and two hydraulic cylinders, powered roller table carrying a tied bale, side-eject pusher plate on a long hydraulic ram, gravity roller run with end stop, hydraulic power pack, light-curtain posts and control panel. Material controls: frame paint, hydraulics, rollers and the bale. plant, weathered, stainless and highVisibility presets; cardboard, paper or plastic bale.",
  tags: ["recycling", "bale ejector", "baler discharge", "side eject", "roller table", "hydraulic ram", "horizontal baler", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2700,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#7a3f8c', { label: 'Frame and channel (paint)' });
const hydraulics = param('hydraulics', '#c9ced1', { label: 'Hydraulic rams and rods' });
const rollers = param('rollers', '#5a6266', { label: 'Rollers and table' });
const trim = param('trim', '#f0b429', { label: 'Pusher, guards and safety trim' });
const bale = param('bale', 'cardboard', { choices: ['cardboard', 'paper', 'plastic'], label: 'Bale' });

presets({
  plant: { frame: '#7a3f8c', hydraulics: '#c9ced1', rollers: '#5a6266', trim: '#f0b429' },
  weathered: { frame: '#5d5560', hydraulics: '#9a9890', rollers: '#4a4440', trim: '#a8893f' },
  stainless: { frame: '#c6cbcd', hydraulics: '#e0e4e5', rollers: '#6b7378', trim: '#2f5d9a' },
  highVisibility: { frame: '#2a6fb5', hydraulics: '#d2d6d8', rollers: '#3a3f42', trim: '#f2d21b' },
});

const p = assembly("bale-ejector");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const ram = (x0: number, y: number, z: number, len: number, r: number, dir: 1 | -1) =>
  cylinder(len, r, 14).rotateY(dir * 90).translate(x0, y, z);

const ZT = 800, BW = 1100, BH = 1100; // table top, bale width and height
const baleColor = bale.value === 'paper' ? '#e2ddcf' : bale.value === 'plastic' ? '#5c8fc4' : '#b88a55';

// Press channel outlet with ribbed walls.
add("channel", blk(0, 1700, ZT - 100, BW + 300, 2200, BH + 300).subtract(blk(0, 1700, ZT, BW, 2400, BH)).color(frame));
for (const y of [900, 1500, 2100, 2700]) add(`channel-rib-${y}`, blk(0, y, ZT - 140, BW + 380, 100, BH + 380).subtract(blk(0, y, ZT - 10, BW + 200, 120, BH + 10)).color(frame));
add("channel-base", blk(0, 1700, 0, BW + 300, 2200, ZT - 100).color(frame));
add("bale-in-channel", blk(0, 1600, ZT, BW - 10, 2000, BH - 10).color(baleColor));

// Tension yoke over the outlet with two vertical cylinders.
for (const s of [-1, 1]) add(`yoke-post-${s}`, blk(s * (BW / 2 + 260), 1000, 0, 180, 260, 2550).color(frame));
add("yoke-beam", blk(0, 1000, 2400, BW + 700, 300, 260).color(frame));
for (const s of [-1, 1]) {
  add(`tension-cyl-${s}`, cylinder(300, 110, 14).translate(s * 300, 1000, 2100).color(hydraulics));
  add(`tension-rod-${s}`, cylinder(200, 50, 10).translate(s * 300, 1000, ZT + BH + 150).color(hydraulics));
}
add("tension-plate", blk(0, 1000, ZT + BH + 150, BW + 200, 400, 60).color(trim));

// Powered roller table carrying the ejected bale toward -Y.
const TY0 = 500, TY1 = -1900;
for (const s of [-1, 1]) add(`table-rail-${s}`, blk(s * (BW / 2 + 120), (TY0 + TY1) / 2, ZT - 200, 80, TY0 - TY1, 180).color(frame));
for (let y = TY0 - 120; y > TY1; y -= 240) add(`roller-${y}`, cylinder(BW + 160, 60, 10).rotateY(90).translate(-(BW + 160) / 2, y, ZT - 60).color(rollers));
for (const y of [TY0 - 100, TY1 + 100]) for (const s of [-1, 1]) add(`table-leg-${y}-${s}`, blk(s * (BW / 2 + 120), y, 0, 100, 100, ZT - 200).color(frame));
add("table-drive", blk(BW / 2 + 260, -200, ZT - 380, 200, 300, 260).color(rollers));
add("bale", blk(0, -700, ZT, BW, 1500, BH).color(baleColor));
for (const y of [-1250, -900, -500, -150]) add(`bale-wire-${y}`, blk(0, y, ZT - 3, BW + 6, 14, BH + 6).color('#4a4f52'));

// Side-eject ram on +X pushing a plate toward -X.
add("pusher-plate", blk(BW / 2 + 60, -700, ZT + 50, 60, 1400, 900).color(trim));
for (const z of [ZT + 250, ZT + 750]) add(`pusher-rib-${z}`, blk(BW / 2 + 110, -700, z, 40, 1400, 80).color(trim));
add("eject-cylinder", ram(BW / 2 + 1290, -700, ZT + 500, 1500, 140, 1).color(hydraulics));
add("eject-rod", ram(BW / 2 + 90, -700, ZT + 500, 1200, 55, 1).color(hydraulics));
add("ram-bracket", blk(BW / 2 + 2850, -700, 0, 200, 500, ZT + 700).color(frame));
add("ram-guide", blk(BW / 2 + 1500, -700, ZT + 120, 3000, 200, 80).color(frame));
for (const x of [BW / 2 + 700, BW / 2 + 2000]) add(`guide-leg-${x}`, blk(x, -700, 0, 120, 160, ZT + 120).color(frame));

// Gravity roller run on -X with end stop.
const GX0 = -BW / 2 - 200, GX1 = -BW / 2 - 2200;
for (const y of [-1500, 100]) add(`gravity-rail-${y}`, blk((GX0 + GX1) / 2, y, ZT - 220, GX0 - GX1, 80, 160).color(frame));
for (let x = GX0 - 100; x > GX1; x -= 250) add(`gravity-roller-${x}`, cylinder(1700, 55, 10).rotateX(90).translate(x, 150, ZT - 80).color(rollers));
for (const x of [GX0 - 100, GX1 + 100]) for (const y of [-1500, 100]) add(`gravity-leg-${x}-${y}`, blk(x, y, 0, 90, 90, ZT - 220).color(frame));
add("end-stop", blk(GX1 - 60, -700, ZT - 220, 120, 1700, 600).color(trim));

// Hydraulic power pack, light curtain and control panel.
add("tank", blk(BW / 2 + 1500, 1500, 0, 1400, 900, 800).color(frame));
add("pump-motor", cylinder(600, 200, 14).rotateY(90).translate(BW / 2 + 1000, 1300, 1000).color('#3d4448'));
add("filter", cylinder(300, 90, 10).translate(BW / 2 + 1900, 1700, 800).color(hydraulics));
add("hose-a", cylinder(1900, 30, 6).rotateX(90).translate(BW / 2 + 1700, 1300, 900).color('#1f2224'));
for (const y of [-1800, 400]) add(`light-curtain-${y}`, blk(-BW / 2 - 2350, y, 0, 80, 80, 1800).color(trim));
add("control-panel", blk(BW / 2 + 400, 2400, 0, 600, 300, 1700).color('#d8dad6'));
add("panel-door", blk(BW / 2 + 400, 2245, 900, 520, 10, 700).color('#c4c6c2'));
add("e-stop", cylinder(60, 50, 10).rotateX(90).translate(BW / 2 + 400, 2240, 1450).color('#c8202a'));
add("beacon", cylinder(160, 70, 10).translate(BW / 2 + 400, 2400, 1700).color('#f28c1b'));

return p.model();
