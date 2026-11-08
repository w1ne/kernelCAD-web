// SPDX-License-Identifier: CC0-1.0
// Conveyor transfer chute: the steel box that drops material from the head
// of one conveyor onto another running at right angles. What makes it that
// chute rather than a cabinet: an inclined feed conveyor climbing in from -X
// to a head pulley with its drive motor and bearings outside the box, a
// head-hood that wraps over the pulley and falls as a lined drop chute with a
// curved spoon, bolted wear-liner plates, hinged inspection doors on the
// front, skirtboards guiding the load onto the receiving belt below, and a
// braced four-column support tower.
// Generic visualization geometry at about real size (6 m footprint, 3 m
// tall), millimetres, Z up, inspection doors on -Y.

meta({
  name: "conveyor-transfer-chute",
  license: 'CC0-1.0',
  title: "Conveyor transfer chute",
  description: "Conveyor transfer point at about real size: inclined feed conveyor to a head pulley with drive motor and bearings, head hood and lined drop chute with curved spoon, bolted wear liners, hinged inspection doors, skirtboards onto a receiving conveyor at right angles, load on both belts, braced four-column tower. Doors open or closed. Material controls: chute, structure, belts and inspection doors. plant, weathered and highVisibility presets.",
  tags: ["recycling", "conveyor", "transfer chute", "transfer point", "head pulley", "skirtboard", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chute = param('chute', '#5d7f8c', { label: 'Chute and hood (paint)' });
const structure = param('structure', '#e0a526', { label: 'Tower and stringers (paint)' });
const belts = param('belts', '#24272a', { label: 'Belts (rubber)' });
const doors = param('doors', '#d77632', { label: 'Inspection doors (paint)' });
const doorState = param('doorState', 'open', { choices: ['open', 'closed'], label: 'Inspection door' });

presets({
  plant: { chute: '#5d7f8c', structure: '#e0a526', belts: '#24272a', doors: '#d77632' },
  weathered: { chute: '#6e6a62', structure: '#8a7a52', belts: '#2c2a28', doors: '#9a5a36' },
  highVisibility: { chute: '#2f6b8f', structure: '#f0c419', belts: '#1c1d1e', doors: '#c8322a' },
});

const p = assembly("conveyor-transfer-chute");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const barXZ = (x0: number, z0: number, x1: number, z1: number, y: number, d: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, d, t, true).rotateY(-ang).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

// Head pulley on the feed conveyor; chute centred over the receiving belt.
const HX = 0, HZ = 2350, HR = 260;
const RX = 650; // receiving belt centreline (runs along Y)
const RZ = 820; // receiving belt top
const CW = 1000; // chute width in Y

// Inclined feed conveyor climbing from -X to the head pulley.
const FX0 = -3300, FZ0 = 1500;
const fz = (x: number) => FZ0 + ((x - FX0) * (HZ + HR - FZ0)) / (HX - FX0);
add("feed-belt", barXZ(FX0, fz(FX0) + 6, HX, HZ + HR + 6, 0, 800, 12).color(belts));
add("feed-load", barXZ(FX0 + 200, fz(FX0 + 200) + 60, HX - 500, fz(HX - 500) + 60, 0, 460, 100).color('#9a8b6a'));
for (const [k, x] of [-2900, -2300, -1700, -1100].entries()) add(`feed-bit-${k}`, box(180, 130, 50, true).rotateZ(k * 47).translate(x, (k % 2 ? -1 : 1) * 120, fz(x) + 125).color(['#3c7fc0', '#e8e4d6', '#b0402c', '#5aa04a'][k]));
for (const [s, sy] of [['f', -1], ['b', 1]] as const) {
  add(`feed-stringer-${s}`, barXZ(FX0, fz(FX0) - 120, HX - 300, fz(HX - 300) - 120, sy * 460, 60, 160).color(structure));
  for (const x of [-3000, -1700]) add(`feed-leg-${s}-${-x}`, blk(x, sy * 460, 0, 90, 90, fz(x) - 200).color(structure));
}
for (const x of [-3000, -1700]) add(`feed-leg-tie-${-x}`, blk(x, 0, 400, 70, 920, 70).color(structure));
for (let k = 0; k < 5; k++) {
  const x = -3100 + k * 560;
  add(`feed-idler-${k}`, cylinder(860, 50, 10).rotateX(90).translate(x, 430, fz(x) - 50).color('#5d6366'));
}

// Head pulley shaft and bearings outside the hood, drive on the back (+Y).
add("head-shaft", cylinder(1500, 70, 12).rotateX(90).translate(HX, 750, HZ).color('#5d6366'));
for (const [s, sy] of [['f', -1], ['b', 1]] as const) add(`bearing-${s}`, blk(HX, sy * 640, HZ - 120, 220, 120, 160).color('#3a3d40'));
add("drive-gearbox", blk(HX, 840, HZ - 260, 420, 220, 520).color(structure));
add("drive-motor", cylinder(560, 170, 14).rotateY(90).translate(HX - 760, 860, HZ - 120).color('#2c5ea8'));
add("motor-fan-cowl", cylinder(70, 176, 14).rotateY(90).translate(HX - 830, 860, HZ - 120).color('#2b2e30'));
add("drive-platform", blk(HX - 300, 840, HZ - 300, 1100, 300, 40).color(structure));

// Head hood wrapping the pulley, dropping as a chute with a curved spoon.
const outline: [number, number][] = [
  [HX - 420, HZ - 120], [HX - 420, HZ + 380], [HX + 200, HZ + 520], [RX + 450, HZ + 380],
  [RX + 450, 1700], [RX + 430, 1450], [RX + 380, 1250], [RX + 330, RZ + 260], [RX - 330, RZ + 260], [RX - 330, HZ - 300],
];
add("chute-body", profileXZ(outline, CW).color(chute));
// Flange bands round the hood and the chute.
for (const z of [HZ - 120, 1750]) add(`flange-${z}`, blk((HX - 420 + RX + 450) / 2, 0, z, RX + 450 - HX + 420 + 60, CW + 50, 50).color(structure));
// Bolted wear liner plates on the -Y face.
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const x = RX - 195 + c * 255, z = 1850 + r * 230;
    if (doorState.value === 'open' && c < 2 && r < 2) continue;
    add(`liner-${r}-${c}`, blk(x, -CW / 2 - 4, z, 240, 8, 210).color('#7b8488'));
    for (const [dx, dz] of [[-95, 25], [95, 25], [-95, 185], [95, 185]]) add(`liner-bolt-${r}-${c}-${dx < 0 ? 'l' : 'r'}${dz}`, blk(x + dx, -CW / 2 - 12, z + dz - 10, 22, 10, 22).color('#3a3d40'));
  }
}
// Inspection door on the front, hinged on its -X edge.
const DX = RX - 280, DW = 560, DZ = 1850, DH = 460;
if (doorState.value === 'open') {
  add("door-opening", blk(DX + DW / 2, -CW / 2 - 2, DZ, DW, 6, DH).color('#1c1d1e'));
  add("door-liner-glimpse", blk(DX + DW / 2 + 60, -CW / 2 - 4, DZ + 40, DW - 160, 6, 120).color('#6b6050'));
}
const swing = (s: Shape) => (doorState.value === 'open' ? s.translate(-DX, CW / 2, 0).rotateZ(-110).translate(DX, -CW / 2, 0) : s);
add("door-panel", swing(blk(DX + DW / 2, -CW / 2 - 25, DZ - 20, DW + 40, 20, DH + 40)).color(doors));
add("door-handle", swing(blk(DX + DW - 40, -CW / 2 - 50, DZ + DH / 2 - 60, 30, 30, 120)).color('#1c1d1e'));
add("door-wedge", swing(blk(DX + DW / 2, -CW / 2 - 45, DZ + DH - 60, 140, 20, 40)).color('#1c1d1e'));
for (const z of [DZ + 40, DZ + DH - 80]) add(`door-hinge-${z}`, cylinder(80, 18, 8).translate(DX - 10, -CW / 2 - 25, z).color('#3a3d40'));
// Upper hood inspection door, always closed.
add("hood-door", blk(HX + 250, -CW / 2 - 12, HZ - 60, 500, 16, 320).color(doors));
add("hood-door-handle", blk(HX + 440, -CW / 2 - 30, HZ + 60, 30, 20, 100).color('#1c1d1e'));

// Receiving conveyor along Y with skirtboards under the chute.
const RY0 = -2600, RY1 = 1800;
add("receive-belt", blk(RX, (RY0 + RY1) / 2, RZ - 12, 800, RY1 - RY0, 12).color(belts));
for (const [s, sx] of [['l', -1], ['r', 1]] as const) {
  add(`receive-stringer-${s}`, blk(RX + sx * 460, (RY0 + RY1) / 2, RZ - 180, 60, RY1 - RY0, 160).color(structure));
  add(`skirtboard-${s}`, blk(RX + sx * 330, -500, RZ, 30, 2400, 260).color(chute));
  add(`skirt-rubber-${s}`, blk(RX + sx * 330, -500, RZ, 40, 2400, 40).color('#1c1d1e'));
  for (const y of [RY0 + 200, RY1 - 200]) add(`receive-leg-${s}-${y < 0 ? 'f' : 'b'}`, blk(RX + sx * 460, y, 0, 90, 90, RZ - 180).color(structure));
}
add("skirt-cover", blk(RX, -1250, RZ + 260, 700, 900, 20).color(chute));
add("receive-load", blk(RX, -2150, RZ, 420, 900, 90).color('#9a8b6a'));
for (const [k, y] of [-1850, -2150, -2450].entries()) add(`receive-bit-${k}`, box(170, 120, 50, true).rotateZ(k * 53).translate(RX + (k - 1) * 90, y, RZ + 110).color(['#e8e4d6', '#3c7fc0', '#5aa04a'][k]));
for (const y of [1400, 700, -2300]) add(`receive-idler-${y < 0 ? 'm' : 'p'}${Math.abs(y)}`, cylinder(860, 50, 10).rotateY(90).translate(RX - 430, y, RZ - 62).color('#5d6366'));

// Braced four-column tower round the chute.
const TX0 = HX - 650, TX1 = RX + 700, TY = 780;
for (const [s, x, sy] of [['fl', TX0, -1], ['fr', TX1, -1], ['bl', TX0, 1], ['br', TX1, 1]] as const) {
  add(`tower-column-${s}`, blk(x, sy * TY, 0, 150, 150, HZ - 300).color(structure));
  add(`tower-base-${s}`, blk(x, sy * TY, 0, 300, 300, 20).color('#5d6366'));
}
for (const [s, sy] of [['f', -1], ['b', 1]] as const) {
  add(`tower-beam-${s}`, blk((TX0 + TX1) / 2, sy * TY, HZ - 420, TX1 - TX0, 120, 120).color(structure));
  add(`tower-brace-${s}`, barXZ(TX0 + 60, 200, TX1 - 60, 1500, sy * TY, 60, 60).color(structure));
}
for (const x of [TX0, TX1]) add(`tower-tie-${x === TX0 ? 'l' : 'r'}`, blk(x, 0, HZ - 420, 120, 2 * TY, 120).color(structure));
add("chute-hanger-l", blk(HX - 420 - 30, 0, HZ - 420, 60, CW + 100, 120).color(structure));

return p.model();
