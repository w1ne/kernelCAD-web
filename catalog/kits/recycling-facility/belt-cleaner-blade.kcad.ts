// SPDX-License-Identifier: CC0-1.0
// Belt cleaner blade: the scraper system at a conveyor head that peels
// sticky carry-back off the belt after it discharges. What makes it that
// part rather than a conveyor: a segmented urethane primary blade pressed
// against the face of the head pulley from a cross shaft, spring tensioner
// canisters on both ends holding it on, and a secondary cleaner of
// carbide-tipped blades on a second shaft under the return belt, all over a
// discharge chute catching what they scrape off.
// Generic visualization geometry at about real size (1 m belt, 1.9 m wide
// frame, 2 m high), millimetres, Z up, belt discharges toward -Y.

meta({
  name: "belt-cleaner-blade",
  license: 'CC0-1.0',
  title: "Belt cleaner blade",
  description: "Conveyor belt cleaner at a head pulley at about real size: segmented urethane primary blade on a cross shaft pressed against the pulley, spring tensioner canisters on both ends, secondary cleaner of carbide-tipped blades under the return belt, head pulley with drive, idlers and discharge chute. Material controls: conveyor frame, belt rubber, urethane blade and tensioner hardware. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "belt cleaner", "belt scraper", "primary cleaner", "secondary cleaner", "urethane blade", "carry-back", "head pulley", "conveyor", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3d6b8c', { label: 'Conveyor frame (paint)' });
const belt = param('belt', '#2b2f31', { label: 'Belt rubber' });
const blade = param('blade', '#e0782a', { label: 'Urethane blades' });
const hardware = param('hardware', '#c9ced1', { label: 'Shafts and tensioners' });

presets({
  plant: { frame: '#3d6b8c', belt: '#2b2f31', blade: '#e0782a', hardware: '#c9ced1' },
  weathered: { frame: '#5a5f5c', belt: '#3a3836', blade: '#b0703c', hardware: '#8f8c84' },
  stainless: { frame: '#c6cbcd', belt: '#30363a', blade: '#2f9a6a', hardware: '#e0e4e5' },
  highVisibility: { frame: '#f2d21b', belt: '#1f2224', blade: '#c8202a', hardware: '#d2d6d8' },
});

const p = assembly("belt-cleaner-blade");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const BW = 1000, ZP = 1500, RP = 400, FX = 760; // belt width, pulley axis, pulley radius, stringer x
const YE = 3200; // tail end of the shown frame

// Head pulley with belt wrap, shaft, pillow blocks and drive.
add("pulley", alongX(-650, 1300, RP, 0, ZP, 24).color('#5a6266'));
add("belt-wrap", alongX(-BW / 2, BW, RP + 18, 0, ZP, 24).color(belt));
add("shaft", alongX(-1000, 2000, 70, 0, ZP).color(hardware));
for (const s of [-1, 1]) add(`pillow-block-${s}`, blk(s * (FX + 40), 0, ZP - 140, 220, 320, 220).color('#5a6266'));
add("reducer", blk(FX + 400, 0, ZP - 300, 360, 520, 600).color('#3d4448'));
add("motor", cylinder(600, 190, 14).rotateX(-90).translate(FX + 400, 200, ZP - 120).color(frame));

// Carrying and return belt runs back toward +Y.
add("belt-top", blk(0, YE / 2, ZP + RP, BW, YE, 18).color(belt));
add("belt-return", blk(0, YE / 2, ZP - RP - 18, BW, YE, 18).color(belt));
for (const y of [1200, 2400]) add(`carry-idler-${y}`, alongX(-BW / 2 - 50, BW + 100, 70, y, ZP + RP - 70, 10).color(hardware));
add("return-idler", alongX(-BW / 2 - 50, BW + 100, 70, 2200, ZP - RP - 90, 10).color(hardware));

// Stringers, legs and cross members.
for (const s of [-1, 1]) {
  add(`stringer-${s}`, blk(s * FX, YE / 2 - 150, ZP - 320, 100, YE + 300, 180).color(frame));
  for (const y of [-200, YE - 150]) add(`leg-${s}-${y}`, blk(s * FX, y, 0, 120, 120, ZP - 320).color(frame));
  add(`brace-${s}`, blk(s * FX, YE / 2 - 150, 500, 80, YE - 50, 80).color(frame));
}

// Primary cleaner: cross shaft below the discharge, segmented urethane blade
// leaning up to the pulley face, spring tensioners at each end.
const SY = -720, SZ = 1050;
add("primary-shaft", alongX(-1000, 2000, 50, SY, SZ).color(hardware));
const bladeProfile = [[-760, 1010], [-680, 1010], [-330, 1275], [-355, 1335], [-430, 1305], [-790, 1080]];
for (let k = 0; k < 4; k++) add(`primary-blade-${k}`, profileYZ(bladeProfile, 235).translate(-375 + k * 250, 0, 0).color(blade));
add("blade-carrier", profileYZ([[-800, 990], [-660, 990], [-640, 1070], [-780, 1110]], BW + 60).color(hardware));
for (const s of [-1, 1]) {
  const x = s * 950;
  add(`tension-arm-${s}`, blk(x, SY, 650, 60, 90, SZ - 650 + 40).color(hardware));
  add(`tension-canister-${s}`, cylinder(900, 60, 12).rotateX(-90).translate(x, SY, 680).color(blade));
  add(`tension-rod-${s}`, cylinder(300, 20, 8).rotateX(-90).translate(x, SY + 900, 680).color(hardware));
  add(`tension-mount-${s}`, blk(x, SY + 1240, 560, 140, 120, 240).color(frame));
  add(`mount-post-${s}`, blk(x, SY + 1240, 0, 100, 100, 560).color(frame));
}

// Secondary cleaner under the return belt: carbide-tipped blades on springs.
const Y2 = 650, Z2 = ZP - RP - 260;
add("secondary-shaft", alongX(-FX, 2 * FX, 45, Y2, Z2).color(hardware));
for (let k = 0; k < 5; k++) {
  const x = -400 + k * 200;
  add(`secondary-arm-${k}`, box(140, 40, 220, true).rotateX(-20).translate(x, Y2 + 30, Z2 + 110).color(blade));
  add(`carbide-tip-${k}`, blk(x, Y2 + 70, ZP - RP - 40, 150, 30, 20).color('#4a4f52'));
}

// Discharge chute catching the scrapings.
add("chute", profileYZ([[-150, 950], [-1600, 250], [-1600, 210], [-150, 910]], BW + 300).color(frame));
for (const s of [-1, 1]) add(`chute-side-${s}`, profileYZ([[-150, 950], [-1600, 250], [-1600, 450], [-150, 1150]], 20).translate(s * (BW / 2 + 160), 0, 0).color(frame));
for (const s of [-1, 1]) add(`chute-leg-${s}`, blk(s * (BW / 2 + 100), -1500, 0, 80, 80, 260).color(frame));
for (let k = 0; k < 6; k++) {
  const y = -1250 + (k % 2) * 250;
  add(`carryback-${k}`, sphere(45 + (k % 3) * 15).translate(-300 + k * 120, y, 950 - ((-150 - y) / 1450) * 700 + 30).color('#6b5a44'));
}

return p.model();
