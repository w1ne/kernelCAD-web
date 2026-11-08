// SPDX-License-Identifier: CC0-1.0
// Magnetic drum separator: pulls steel cans and tramp iron out of a mixed
// stream. What makes it a drum magnet rather than a roller: a vibratory
// feeder pan on spring mounts drops the stream onto the top of a
// stainless drum whose -X end plate shows the red stationary magnet sector
// sweeping from the top round the front to the bottom. Non-ferrous material
// flies forward down the front chute into a skip; steel is carried round
// under the drum, past an adjustable splitter plate, and drops into the
// ferrous bin under the stand. Gearmotor and chain guard drive the drum
// from behind.
// Generic visualization geometry at about real size (1.2 m wide drum,
// 900 mm diameter, 2.6 m tall stand), millimetres, Z up, discharge on -Y.

meta({
  name: "magnetic-drum-separator",
  license: 'CC0-1.0',
  title: "Magnetic drum separator",
  description: "Magnetic drum separator at about real size: vibratory feeder pan on spring mounts, 900 mm stainless drum with the red stationary magnet sector marked on its end plate, gearmotor and chain guard, adjustable splitter plate, front non-ferrous chute into a skip and a ferrous bin of steel cans under the stand. Loaded or empty feed. Material controls: frame, drum, magnet marking and steel scrap. blue, yellow and green presets.",
  tags: ["magnet", "magnetic separator", "drum magnet", "ferrous separation", "steel cans", "vibratory feeder", "recycling", "materials recovery", "waste management", "metals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2a63a8', { label: 'Frame and chutes (paint)' });
const drum = param('drum', '#b5bdc0', { label: 'Drum shell (stainless)' });
const magnet = param('magnet', '#d23a2c', { label: 'Magnet sector marking' });
const scrap = param('scrap', '#8d9396', { label: 'Steel scrap (cans)' });
const feed = param('feed', 'loaded', { choices: ['loaded', 'empty'], label: 'Feed' });

presets({
  blue: { frame: '#2a63a8', drum: '#b5bdc0', magnet: '#d23a2c', scrap: '#8d9396' },
  yellow: { frame: '#e3b51e', drum: '#aeb5b8', magnet: '#c42f24', scrap: '#7f8588' },
  green: { frame: '#3d7a52', drum: '#c0c6c8', magnet: '#e04b2a', scrap: '#9a9d98' },
});

const p = assembly("magnetic-drum-separator");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const loaded = feed.value === 'loaded';

const DZ = 1900; // drum axis height
const DR = 450;
const DW = 1200;
const LEG = 1300;

// Stand: four legs, rails and feeder legs at the back.
for (const [s, x] of [['l', -750], ['r', 750]] as const) {
  for (const [f, y] of [['f', -550], ['b', 550]] as const) add(`leg-${s}${f}`, blk(x, y, 0, 120, 120, LEG + 200).color(frame));
  add(`rail-${s}`, blk(x, 600, LEG + 200, 120, 2600, 140).color(frame));
  add(`feeder-leg-${s}`, blk(x, 1800, 0, 120, 120, LEG + 200).color(frame));
}
add("bearing-r", blk(DW / 2 + 60, 0, LEG + 340, 120, 220, DZ - LEG - 340).color('#3a3d40'));
add("bearing-l", blk(-DW / 2 - 60, 160, LEG + 340, 120, 160, DZ - LEG - 340 + 60).color('#3a3d40'));
add("cross-brace", blk(0, 1800, 400, 1500, 80, 80).color(frame));

// Drum: shell, end plates, hub and the magnet sector on the -X end plate.
add("drum-shell", cylinder(DW, DR, 20).rotateY(90).translate(-DW / 2, 0, DZ).color(drum));
for (let k = 1; k < 4; k++) add(`drum-cleat-${k}`, cylinder(DW, DR + 8, 20).rotateY(90).translate(-DW / 2, 0, DZ).intersect(blk(-DW / 2 + k * 300, 0, DZ - DR - 20, 30, 2 * DR + 40, 2 * DR + 40)).color('#8a9195'));
add("end-plate", cylinder(14, DR + 10, 20).rotateY(-90).translate(-DW / 2, 0, DZ).color('#6d7579'));
const sector: [number, number][] = [[0, 0]];
for (let k = 0; k <= 12; k++) { const a = ((80 + (k * 180) / 12) * Math.PI) / 180; sector.push([(DR - 15) * Math.cos(a), (DR - 15) * Math.sin(a)]); }
add("magnet-sector", profileYZ(sector, 6).translate(-DW / 2 - 17, 0, DZ).color(magnet));
add("magnet-hub", cylinder(60, 90, 12).rotateY(-90).translate(-DW / 2 - 14, 0, DZ).color('#3a3d40'));

// Drive: gearmotor behind the drum with a chain guard up to the shaft.
add("chain-guard", blk(-DW / 2 - 60, 420, DZ - 120, 70, 520, 240).color('#e3b51e'));
add("gearbox", blk(-DW / 2 - 140, 640, LEG + 340, 260, 260, 300).color('#3a3d40'));
add("motor", cylinder(420, 140, 12).rotateY(90).translate(-DW / 2 - 140, 640, LEG + 490).color('#4b5257'));

// Vibratory feeder pan on spring mounts at the back, feeding the drum top.
const PZ = DZ + DR + 80;
const PY0 = 350;
const PY1 = 2100;
add("pan-floor", blk(0, (PY0 + PY1) / 2, PZ, DW, PY1 - PY0, 30).color(frame));
for (const [s, x] of [['l', -DW / 2 - 15], ['r', DW / 2 + 15]] as const) add(`pan-wall-${s}`, blk(x, (PY0 + PY1) / 2 + 100, PZ, 30, PY1 - PY0 - 200, 300).color(frame));
add("pan-back", blk(0, PY1 - 15, PZ, DW + 60, 30, 300).color(frame));
add("pan-lip", box(DW, 220, 20, true).rotateX(25).translate(0, PY0 - 80, PZ - 30).color(frame));
add("vibrator-drive", blk(0, 1500, PZ - 360, 600, 400, 300).color('#3a3d40'));
for (const [s, x] of [['l', -DW / 2 + 60], ['r', DW / 2 - 60]] as const) {
  for (const [f, y] of [['f', 900], ['b', 1800]] as const) add(`spring-${s}${f}`, cylinder(PZ - LEG - 340, 55, 10).translate(x, y, LEG + 340).color('#d8d4c4'));
}

// Splitter plate under the drum and the ferrous chute behind it.
add("splitter", box(DW, 600, 20, true).rotateX(70).translate(0, -40, DZ - DR - 330).color('#6d7579'));
add("splitter-handle", cylinder(200, 20, 8).rotateY(-90).translate(-DW / 2, -40, DZ - DR - 330).color(magnet));
add("ferrous-chute", profileYZ([[0, 0], [550, 0], [550, 650], [-20, 900], [-20, 700]], DW).translate(0, 0, LEG - 250).color(frame));

// Front non-ferrous chute down into a skip.
add("nonferrous-chute", box(DW, 1300, 30, true).rotateX(35).translate(0, -1000, 1150).color(frame));
for (const [s, x] of [['l', -DW / 2 - 15], ['r', DW / 2 + 15]] as const) add(`chute-cheek-${s}`, profileYZ([[-450, 1800], [-1530, 1050], [-1530, 760], [-450, 1500]], 30).translate(x, 0, 0).color(frame));
const SK = -1900;
add("skip", blk(0, SK, 0, 1500, 900, 700).subtract(blk(0, SK, 60, 1400, 800, 700)).color('#3e4a3f'));

// Ferrous bin under the stand.
add("ferrous-bin", blk(0, 250, 0, 1200, 700, 500).subtract(blk(0, 250, 50, 1100, 600, 500)).color('#5d6366'));

if (loaded) {
  // Steel cans in the ferrous bin and on the pan; mixed non-ferrous in the skip.
  for (let k = 0; k < 12; k++) {
    const x = -450 + (k % 6) * 180;
    const y = 120 + Math.floor(k / 6) * 240;
    add(`bin-can-${k}`, cylinder(110, 36, 8).rotateY(k % 3 === 0 ? 90 : 0).translate(x, y, k % 3 === 0 ? 420 : 380).color(scrap));
  }
  add("bin-fill", blk(0, 250, 50, 1100, 600, 330).color('#6d7377'));
  for (let k = 0; k < 10; k++) add(`pan-can-${k}`, cylinder(110, 36, 8).rotateX(90).translate(-480 + (k % 5) * 240, 700 + Math.floor(k / 5) * 600 + (k % 2) * 160, PZ + 66).color(k % 3 === 0 ? '#c2412f' : scrap));
  for (let k = 0; k < 6; k++) add(`pan-flake-${k}`, blk(-400 + k * 160, 1000 + (k % 3) * 250, PZ + 30, 120, 90, 20).color(['#3fa7d6', '#e9e6dc', '#4bb85a'][k % 3]));
  add("skip-fill", blk(0, SK, 60, 1400, 800, 520).color('#a89d82'));
  for (let k = 0; k < 8; k++) add(`skip-item-${k}`, box(140, 110, 40, true).rotateZ(k * 23).translate(-550 + k * 150, SK - 200 + (k % 3) * 180, 600).color(['#3fa7d6', '#e9e6dc', '#4bb85a', '#c9b48a'][k % 4]));
}

return p.model();
