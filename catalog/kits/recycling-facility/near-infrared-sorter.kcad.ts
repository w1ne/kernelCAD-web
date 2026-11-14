// SPDX-License-Identifier: CC0-1.0
// Near-infrared sorter: the belt-type NIR unit that picks one polymer (or
// paper grade) out of a mixed stream. What makes it that machine rather than
// an arch over a belt: a vibratory feeder spreading material onto a fast,
// wide acceleration belt; the sensor hood cantilevered over the head pulley
// with its scan window and halogen lamp bars; the air-valve ejector bar just
// past the head pulley; and the separation hood behind it, where a splitter
// blade divides the blown-over fraction from the drop fraction, both visible
// through the hood's inspection opening. A control cabinet with HMI and a
// signal tower stands on the operator side.
// Generic visualization geometry at about real size (6.9 m long, 2.9 m tall),
// millimetres, Z up, operator side on -Y.

meta({
  name: "near-infrared-sorter",
  license: 'CC0-1.0',
  title: "Near-infrared sorter",
  description: "Belt-type near-infrared (NIR) optical sorter at about real size: vibratory feeder onto a 2 m acceleration belt carrying mixed flakes and bottles, sensor hood over the head pulley with scan window and lamp bars, air-valve ejector bar, separation hood with splitter blade and two output fractions, control cabinet with HMI and signal tower. Stream set to PET bottles, HDPE or paper. Material controls: sensor housing, frame, belt and brand accent. plant, weathered, graphite and highVisibility presets.",
  tags: ["recycling", "nir", "near infrared", "optical sorter", "air jet", "ejector", "acceleration belt", "plastics", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#e4e7e7', { label: 'Sensor and separation hood (powder coat)' });
const frame = param('frame', '#3d4f63', { label: 'Belt frame (paint)' });
const belt = param('belt', '#24272a', { label: 'Acceleration belt (rubber)' });
const accent = param('accent', '#2f8f4e', { label: 'Brand accent stripe' });
const stream = param('stream', 'pet', { choices: ['pet', 'hdpe', 'paper'], label: 'Material stream' });

presets({
  plant: { housing: '#e4e7e7', frame: '#3d4f63', belt: '#24272a', accent: '#2f8f4e' },
  weathered: { housing: '#b9b6ac', frame: '#4d5652', belt: '#2c2a28', accent: '#5f7d58' },
  graphite: { housing: '#4a4f54', frame: '#2b2f33', belt: '#1c1d1e', accent: '#e07a2a' },
  highVisibility: { housing: '#f2f2ee', frame: '#e0a526', belt: '#1c1d1e', accent: '#2f6bb5' },
});

const p = assembly("near-infrared-sorter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rodY = (x: number, z: number, y0: number, y1: number, r: number, seg = 12) => cylinder(y1 - y0, r, seg).rotateX(-90).translate(x, y0, z);
const side = (s: number) => (s < 0 ? 'f' : 'b');

const palettes: Record<string, string[]> = {
  pet: ['#a9d3e0', '#3f8f5a', '#8a5a2b', '#e9e6dc', '#5aa0c8'],
  hdpe: ['#f2f2ee', '#2f6fb5', '#d9a132', '#c84a3a', '#5a9a48'],
  paper: ['#c9b089', '#e8e2d0', '#7a8fa8', '#b85b4a', '#d8cfa8'],
};
const pal = palettes[stream.value] ?? palettes.pet;

// Acceleration belt along X; head pulley at +X.
const TZ = 1100, BW = 2000, X0 = -2500, X1 = 1500;
add("belt", blk((X0 + X1) / 2, 0, TZ - 14, X1 - X0, BW, 14).color(belt));
add("head-pulley", rodY(X1, TZ - 160, -BW / 2 + 20, BW / 2 - 20, 160, 16).color('#5d6366'));
add("tail-pulley", rodY(X0, TZ - 140, -BW / 2 + 20, BW / 2 - 20, 140, 14).color('#5d6366'));
for (const s of [-1, 1]) {
  add(`stringer-${side(s)}`, blk((X0 + X1) / 2, s * (BW / 2 + 50), TZ - 280, X1 - X0 + 200, 80, 240).color(frame));
  add(`drive-guard-${side(s)}`, blk(X1, s * (BW / 2 + 110), TZ - 320, 420, 40, 320).color(frame));
  for (const x of [X0 + 200, -500, X1 - 300]) {
    add(`leg-${side(s)}-${x + 3000}`, blk(x, s * (BW / 2 + 50), 0, 100, 100, TZ - 280).color(frame));
    add(`foot-${side(s)}-${x + 3000}`, blk(x, s * (BW / 2 + 50), 0, 220, 220, 16).color(frame));
  }
}
add("drive-motor", rodY(X1, TZ - 160, -BW / 2 - 560, -BW / 2 - 130, 170, 14).color(accent));
add("drive-gearbox", blk(X1, -BW / 2 - 200, TZ - 360, 360, 160, 400).color('#5d6366'));

// Mixed stream spread thin across the belt.
let seed = stream.value === 'pet' ? 11 : stream.value === 'hdpe' ? 29 : 47;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let k = 0; k < 34; k++) {
  const x = X0 + 500 + rnd() * (X1 - X0 - 700), y = (rnd() - 0.5) * (BW - 260);
  const bottle = stream.value !== 'paper' && k % 3 === 0;
  const piece = bottle
    ? rodY(0, 45, -120, 120, 45, 8).rotateZ(rnd() * 180)
    : blk(0, 0, 0, 120 + rnd() * 140, 80 + rnd() * 120, 10).rotateZ(rnd() * 180);
  add(`item-${k}`, piece.translate(x, y, TZ).color(pal[k % pal.length]));
}

// Vibratory feeder over the tail end.
add("feeder-tray", box(1300, BW - 100, 30, true).rotateY(16).translate(X0 - 350, 0, 1640).color('#b6bec1'));
for (const s of [-1, 1]) add(`feeder-wall-${side(s)}`, box(1300, 24, 260, true).rotateY(16).translate(X0 - 350, s * (BW / 2 - 50), 1770).color('#b6bec1'));
add("feeder-drive", blk(X0 - 500, 0, 1320, 500, 700, 260).color(frame));
for (const s of [-1, 1]) {
  add(`feeder-post-${side(s)}`, blk(X0 - 800, s * (BW / 2 - 150), 0, 120, 120, 1720).color(frame));
  add(`feeder-spring-${side(s)}`, cylinder(220, 70, 10).translate(X0 - 800, s * (BW / 2 - 150), 1720).color('#c8322a'));
}

// Sensor hood cantilevered over the head end on two side towers.
const HD = 2500;
add("sensor-hood", profileXZ([[200, 2000], [1950, 2000], [1950, 2560], [1550, 2900], [600, 2900], [200, 2560]], HD).color(housing));
add("scan-window", blk(1075, 0, 1985, 900, HD - 200, 20).color('#1c2a33'));
for (const x of [380, 1770]) add(`lamp-bar-${x}`, rodY(x, 1950, -HD / 2 + 80, HD / 2 - 80, 55, 10).color('#ffd98a'));
add("accent-stripe-front", blk(1075, -HD / 2 - 6, 2600, 1500, 12, 90).color(accent));
add("name-plate", blk(1075, -HD / 2 - 8, 2350, 700, 14, 150).color('#2b2f33'));
add("hood-vent", blk(1075, 0, 2900, 700, 900, 60).color('#9aa1a4'));
for (const s of [-1, 1]) {
  add(`hood-tower-${side(s)}`, blk(1075, s * (HD / 2 + 110), 0, 360, 220, 2560).color(housing));
  add(`tower-plinth-${side(s)}`, blk(1075, s * (HD / 2 + 110), 0, 500, 360, 30).color(frame));
  add(`tower-stripe-${side(s)}`, blk(1075, s * (HD / 2 + 110) - 116, 2100, 360, 12, 90).color(accent));
}

// Air-valve ejector bar just past the head pulley, fed from a receiver.
add("valve-block", blk(X1 + 330, 0, TZ - 280, 180, BW, 200).color('#2b2f33'));
add("nozzle-bar", blk(X1 + 280, 0, TZ - 90, 60, BW - 60, 40).color('#9aa1a4'));
add("air-receiver", cylinder(1300, 260, 14).translate(X1 + 900, -HD / 2 - 650, 0).color('#2f5d9a'));
add("air-line", rodY(X1 + 900, 1350, -HD / 2 - 650, -BW / 2 + 40, 24, 8).color('#2f5d9a'));
add("air-drop", cylinder(1350 - TZ + 260, 24, 8).translate(X1 + 900, -BW / 2 + 40, TZ - 260).color('#2f5d9a'));

// Separation hood: hollow, open toward the belt, splitter inside seen through the front opening.
const SX0 = X1 + 420, SX1 = 4400, SH = 1980;
add("separation-hood", blk((SX0 + SX1) / 2, 0, 0, SX1 - SX0, HD, SH)
  .subtract(blk((SX0 + SX1) / 2, 0, 30, SX1 - SX0 - 40, HD - 40, SH - 60))
  .subtract(blk(SX0, 0, TZ - 420, 120, BW, 900))
  .subtract(blk((SX0 + SX1) / 2 + 80, -HD / 2, 120, SX1 - SX0 - 520, 80, 1600)).color(housing));
add("hood-stripe", blk((SX0 + SX1) / 2, -HD / 2 - 6, SH - 200, SX1 - SX0, 12, 90).color(accent));
add("splitter-blade", box(24, HD - 80, 1250, true).rotateY(-28).translate(3150, 0, 640).color('#c9ccce'));
add("splitter-adjuster", rodY(2850, 1220, -HD / 2 + 20, HD / 2 - 20, 30, 8).color('#5d6366'));
add("drop-fraction", sphere(520).scale([1.2, 1.6, 0.55]).translate(2450, 0, 0).subtract(blk(2450, 0, -700, 2000, 2400, 700)).color(pal[2]));
add("eject-fraction", sphere(520).scale([1.0, 1.6, 0.55]).translate(3850, 0, 0).subtract(blk(3850, 0, -700, 2000, 2400, 700)).color(pal[0]));
add("eject-sign", blk(3850, -HD / 2 - 8, 1820, 300, 12, 100).color('#2f9a4f'));
add("drop-sign", blk(2450, -HD / 2 - 8, 1820, 300, 12, 100).color('#c8322a'));

// Control cabinet with HMI and a signal tower on the operator side.
const CX = -900, CY = -HD / 2 - 500;
add("control-cabinet", blk(CX, CY, 0, 1000, 450, 2000).color(housing));
add("cabinet-plinth", blk(CX, CY, 0, 1020, 470, 100).color('#2b2f33'));
add("door-seam", blk(CX, CY - 228, 120, 10, 8, 1840).color('#9aa1a4'));
add("hmi-screen", blk(CX - 240, CY - 232, 1250, 380, 16, 290).color('#1c2a33'));
add("hmi-bezel", blk(CX - 240, CY - 228, 1220, 440, 10, 350).color('#2b2f33'));
add("estop", cylinder(30, 45, 10).rotateX(90).translate(CX + 260, CY - 225, 1400).color('#c8322a'));
add("cabinet-stripe", blk(CX, CY - 230, 1900, 1000, 10, 60).color(accent));
add("tower-pole", cylinder(260, 20, 8).translate(CX + 350, CY, 2000).color('#5d6366'));
['#2f9a4f', '#f0ae32', '#c8322a'].forEach((c, i) => add(`signal-${i}`, cylinder(100, 45, 10).translate(CX + 350, CY, 2260 + i * 100).color(c)));

return p.model();
