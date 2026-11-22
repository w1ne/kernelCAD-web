// SPDX-License-Identifier: CC0-1.0
// Dust-suppression mist cannon: the towable fog cannon parked by tipping
// floors, crushers and demolition piles. A big axial fan inside a short
// barrel blows air through a ring of fine nozzles on the muzzle, throwing a
// cone of water mist 30-50 m to knock dust out of the air. What makes it
// that machine rather than a fan: the barrel raised on a yoke over a
// slewing turntable, the nozzle ring at the muzzle, the spray fanning out of it,
// and the generator canopy, pump and hose inlet on a single-axle trailer
// with drawbar and jockey wheel. Generic visualization geometry at about
// real size (3.5 m long, 2 m wide, 3 m high), millimetres, Z up, barrel
// aimed toward -Y and up.

meta({
  name: "dust-suppression-mist-cannon",
  license: 'CC0-1.0',
  title: "Dust-suppression mist cannon",
  description: "Towable dust-suppression mist cannon at about real size: hollow fan barrel with axial fan blades and a nozzle ring at the muzzle, raised on a yoke and trunnions over a slewing turntable and tilted up, fine spray jets fanning out of the nozzle ring, single-axle trailer with mudguards, drawbar, jockey wheel and stabiliser legs, generator canopy with louvres, water pump and hose inlet. Material controls: body paint, fan barrel, tyres, water mist. site, weathered, rental and highVisibility presets.",
  tags: ["recycling", "dust suppression", "mist cannon", "fog cannon", "dust control", "water spray", "trailer", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#f2c230', { label: 'Body and trailer (paint)' });
const barrel = param('barrel', '#d7dadc', { label: 'Fan barrel' });
const tyres = param('tyres', '#25292c', { label: 'Tyres (rubber)' });
const mist = param('mist', '#d6ecf5', { label: 'Water mist' });

presets({
  site: { body: '#f2c230', barrel: '#d7dadc', tyres: '#25292c', mist: '#d6ecf5' },
  weathered: { body: '#b89a45', barrel: '#9ea2a0', tyres: '#34363a', mist: '#c7d6dc' },
  rental: { body: '#2f6f9e', barrel: '#e7e3d6', tyres: '#25292c', mist: '#d6ecf5' },
  highVisibility: { body: '#e3742b', barrel: '#2f3438', tyres: '#1f2326', mist: '#e4f4fb' },
});

const p = assembly("dust-suppression-mist-cannon");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const dark = '#23282c';
const steel = '#a9b1b5';

// Trailer chassis on one axle; drawbar toward +Y.
const ZC = 620, CL = 2400, CW = 1500;
add("chassis", blk(0, 0, ZC, CW, CL, 160).color(body));
add("deck-plate", blk(0, 0, ZC + 160, CW - 60, CL - 60, 20).color('#8c9196'));
add("axle", cylinder(CW + 300, 50, 10).rotateY(90).translate(-(CW + 300) / 2, 0, 380).color(dark));
for (const s of [-1, 1]) {
  const x = s * (CW / 2 + 180);
  add(`tyre-${s < 0 ? 'l' : 'r'}`, cylinder(220, 380, 18).rotateY(90).translate(x - 110, 0, 380).color(tyres));
  add(`rim-${s < 0 ? 'l' : 'r'}`, cylinder(230, 210, 12).rotateY(90).translate(x - 115, 0, 380).color(steel));
  add(`mudguard-${s < 0 ? 'l' : 'r'}`, cylinder(260, 450, 16).rotateY(90).translate(x - 130, 0, 380).subtract(cylinder(280, 420, 16).rotateY(90).translate(x - 140, 0, 380)).subtract(blk(x, 0, -200, 400, 1000, 580)).color(body));
}
add("drawbar", box(120, 1500, 100, true).rotateX(-6).translate(0, CL / 2 + 650, ZC + 20).color(body));
add("hitch-eye", torus(80, 25, 12).rotateY(90).translate(0, CL / 2 + 1420, ZC - 60).color(dark));
add("jockey-post", cylinder(560, 50, 10).translate(0, CL / 2 + 900, 180).color(steel));
add("jockey-wheel", cylinder(80, 110, 14).rotateY(90).translate(-40, CL / 2 + 900, 115).color(tyres));
for (const [x, y] of [[-CW / 2 + 60, -CL / 2 + 100], [CW / 2 - 60, -CL / 2 + 100]]) {
  add(`stabiliser-${x < 0 ? 'l' : 'r'}`, blk(x, y, 40, 80, 80, ZC - 40).color(steel));
  add(`stabiliser-pad-${x < 0 ? 'l' : 'r'}`, blk(x, y, 0, 220, 220, 40).color(dark));
}

// Generator canopy, pump and hose inlet on the rear (+Y) half of the deck.
const ZD = ZC + 180;
add("generator-canopy", blk(0, 650, ZD, CW - 100, 1000, 900).color(body));
add("canopy-roof", blk(0, 650, ZD + 900, CW - 60, 1060, 50).color(dark));
for (let i = 0; i < 6; i++) add(`louvre-${i}`, blk(-(CW - 100) / 2 - 5, 650, ZD + 200 + i * 100, 10, 700, 40).color(dark));
add("exhaust", cylinder(300, 40, 10).translate(400, 900, ZD + 950).color(steel));
add("control-panel", blk(300, 650 - 505, ZD + 350, 500, 10, 380).color('#d7dadc'));
add("water-pump", cylinder(360, 150, 14).rotateY(90).translate(-CW / 2 - 100, -200, ZD + 180).color('#c23b2f'));
add("hose-inlet", cylinder(250, 55, 10).rotateY(90).translate(-CW / 2 - 330, -200, ZD + 180).color(dark));
add("hose-coupling", cylinder(60, 80, 12).rotateY(90).translate(-CW / 2 - 380, -200, ZD + 180).color('#c6a23a'));

// Slewing turntable, yoke and tilted barrel at the front (-Y) half.
const YT = -500, ZT = ZD + 1150, R = 520, BL = 1500, TILT = 58, SLEW = 50;
add("slew-ring", cylinder(140, 520, 20).translate(0, YT, ZD).rotateZ(0).color(dark));
add("turntable", cylinder(80, 480, 20).translate(0, YT, ZD + 140).color(body));
const head = (s: Shape) => s.rotateZ(SLEW).translate(0, YT, ZT);
for (const s of [-1, 1]) {
  add(`yoke-arm-${s < 0 ? 'l' : 'r'}`, head(blk(s * (R + 110), 0, -ZT + ZD + 220, 100, 260, ZT - ZD - 220)).color(body));
  add(`trunnion-${s < 0 ? 'l' : 'r'}`, head(cylinder(160, 70, 12).rotateY(90).translate(s > 0 ? R + 10 : -R - 170, 0, 0)).color(steel));
}
add("yoke-base", head(blk(0, 0, -ZT + ZD + 220, 2 * R + 320, 300, 120)).color(body));
add("tilt-ram", head(cylinder(900, 55, 10).rotateX(-28).translate(R + 110, 80, -ZT + ZD + 340)).color(steel));
const aim = (s: Shape) => head(s.translate(0, 0, -BL * 0.45).rotateX(TILT));
add("barrel", aim(cylinder(BL, R, 24).subtract(cylinder(BL + 20, R - 40, 24).translate(0, 0, -10))).color(barrel));
add("barrel-flange", aim(torus(R, 30, 24).translate(0, 0, 40)).color(body));
add("fan-hub", aim(cylinder(260, 140, 14).translate(0, 0, 300)).color(dark));
add("fan-nose", aim(sphere(140).scale([1, 1, 0.8]).translate(0, 0, 560)).color(dark));
for (let k = 0; k < 7; k++) add(`fan-blade-${k}`, aim(box(R - 150, 180, 20, true).rotateX(28).translate((R - 150) / 2 + 120, 0, 0).rotateZ((k * 360) / 7).translate(0, 0, 440)).color(steel));
add("guard-cross-a", aim(box(2 * R - 60, 25, 25, true).translate(0, 0, BL - 40)).color(dark));
add("guard-cross-b", aim(box(25, 2 * R - 60, 25, true).translate(0, 0, BL - 40)).color(dark));
add("nozzle-ring", aim(torus(R + 40, 35, 24).translate(0, 0, BL + 20)).color(steel));
for (let k = 0; k < 12; k++) {
  const a = (k * 2 * Math.PI) / 12;
  add(`nozzle-${k}`, aim(cylinder(60, 18, 8).translate((R + 40) * Math.cos(a), (R + 40) * Math.sin(a), BL + 30)).color('#c6a23a'));
}

// Mist: fine jets fanning out of every nozzle at uneven lengths, plus a
// looser inner spray carried by the fan air.
for (let k = 0; k < 12; k++) {
  const a = (k * 2 * Math.PI) / 12;
  const len = 900 + ((k * 7) % 5) * 120;
  const jet = cylinder(len, 12, 6).rotateX(-11).rotateZ((a * 180) / Math.PI - 90);
  add(`mist-jet-${k}`, aim(jet.translate((R + 40) * Math.cos(a), (R + 40) * Math.sin(a), BL + 60)).color(mist));
}
for (let k = 0; k < 8; k++) {
  const a = (k * 2 * Math.PI) / 8 + 0.4;
  const jet = cylinder(700 + (k % 3) * 150, 10, 6).rotateX(-6).rotateZ((a * 180) / Math.PI - 90);
  add(`mist-inner-${k}`, aim(jet.translate(260 * Math.cos(a), 260 * Math.sin(a), BL + 60)).color(mist));
}

return p.model();
