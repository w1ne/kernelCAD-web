// SPDX-License-Identifier: CC0-1.0
// Baler wire tier: the automatic tying unit that sits on the discharge
// channel of a horizontal baler and wraps each bale in steel wire before it
// leaves. What makes it that unit rather than a gantry: a portal frame
// straddling the bale channel, a row of twister (knotter) heads along the
// top beam with their drive shaft and gearmotor, a needle carriage under the
// channel whose curved needles rise through slots in the channel floor, the
// bale itself passing through with finished wire bands, wire coils on
// payoff cages beside the frame feeding wire up through guide pulleys, and
// a guarded operator station.
// Generic visualization geometry at about real size (frame 2.4 m wide,
// 3.2 m tall, 1.1 m bale), millimetres, Z up, bale travels toward -X.

meta({
  name: "baler-wire-tier",
  license: 'CC0-1.0',
  title: "Baler wire tier",
  description: "Automatic baler wire tier at about real size: portal frame straddling the bale channel, five twister heads on the top beam with drive shaft and gearmotor, needle carriage with curved needles rising through the channel floor, a bale passing through with wire bands, wire coils on payoff cages with guide pulleys, and an operator station. Material controls: frame paint, wire and machined steel, bale material and guard yellow. plant, weathered, plasticBale and highVisibility presets.",
  tags: ["recycling", "baler", "wire tier", "auto-tie", "knotter", "twister", "baling wire", "horizontal baler", "bale", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#566d6d', { label: 'Tier frame (paint)' });
const wire = param('wire', '#c4c9cb', { label: 'Wire, needles and shafts (steel)' });
const bale = param('bale', '#b8895a', { label: 'Bale material' });
const guard = param('guard', '#f0c419', { label: 'Guards and payoff cages (yellow)' });
const needles = param('needles', 'raised', { choices: ['raised', 'parked'], label: 'Needles' });

presets({
  plant: { frame: '#566d6d', wire: '#c4c9cb', bale: '#b8895a', guard: '#f0c419' },
  weathered: { frame: '#4f5a58', wire: '#9ea4a4', bale: '#9c7a55', guard: '#c9a640' },
  plasticBale: { frame: '#2f5d9a', wire: '#d0d4d6', bale: '#5f9ec4', guard: '#f0c419' },
  highVisibility: { frame: '#d9d9d4', wire: '#c4c9cb', bale: '#b8895a', guard: '#e2672a' },
});

const p = assembly("baler-wire-tier");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const dark = '#2b2f33';

const BW = 1100, BH = 1100, CZ = 700; // bale width, height, channel floor
const FY = 1200, FT = 3200; // portal half-width, top of frame
const ys = [-400, -200, 0, 200, 400]; // tie positions across the bale

// Bale channel on a base, with tie slots in its floor.
add("channel-base", blk(0, 0, 0, 3400, BW + 300, 300).color(frame));
add("channel-floor", blk(0, 0, CZ - 80, 3400, BW + 200, 80).subtract(blk(0, 0, CZ - 100, 120, BW - 120, 120)).color(frame));
for (const y of [-BW / 2 - 70, BW / 2 + 70]) add(`channel-wall-${y > 0 ? 'b' : 'f'}`, blk(-600, y, CZ - 80, 2200, 40, 600).color(frame));
for (const x of [-1400, 1400]) for (const y of [-BW / 2 - 40, BW / 2 + 40]) {
  add(`channel-leg-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 300, 160, 160, CZ - 380).color(frame));
}

// The bale in the channel with finished wire bands on its leaving half.
add("bale", blk(-700, 0, CZ, 2600, BW, BH).color(bale));
for (let k = 0; k < 5; k++) add(`bale-layer-${k}`, blk(-700 - (k % 2) * 30, 0, CZ + 150 + k * 190, 2612, BW + 12, 20).color('#9c7448'));
for (const x of [-1800, -1200]) for (const y of ys) {
  add(`band-${x}-${y + 400}`, blk(x, y, CZ - 6, 10, 10, BH + 12).color(wire));
  add(`band-top-${x}-${y + 400}`, blk(x, y, CZ + BH, 16, 50, 12).color(wire));
}
for (const y of ys) add(`band-front-${y + 400}`, blk(-1500, y, CZ + BH - 4, 600, 16, 14).color(wire));
for (const y of ys) add(`new-wire-${y + 400}`, blk(80, y, CZ, 10, 10, BH + 160).color(wire));

// Portal frame straddling the channel.
for (const y of [-FY, FY]) {
  add(`portal-post-${y > 0 ? 'b' : 'f'}`, blk(0, y, 0, 260, 260, FT).color(frame));
  add(`post-foot-${y > 0 ? 'b' : 'f'}`, blk(0, y, 0, 420, 420, 30).color(dark));
  add(`post-brace-${y > 0 ? 'b' : 'f'}`, box(140, 120, 1100, true).rotateY(-35).translate(420, y, 520).color(frame));
}
add("top-beam", blk(0, 0, FT - 340, 380, 2 * FY + 260, 340).color(frame));

// Twister heads hanging from the top beam, with drive shaft and gearmotor.
const TZ = CZ + BH + 220;
for (const y of ys) {
  add(`twister-housing-${y + 400}`, blk(0, y, TZ, 300, 150, FT - 340 - TZ).color(guard));
  add(`twister-hook-${y + 400}`, cylinder(90, 40, 10).translate(0, y, TZ - 90).color(wire));
  add(`twister-gear-${y + 400}`, cylinder(40, 110, 14).rotateY(90).translate(-190, y, TZ + 260).color(dark));
}
add("drive-shaft", cylinder(2 * FY + 400, 40, 10).rotateX(90).translate(-200, FY + 200, FT - 180).color(wire));
add("gearmotor", blk(-200, FY + 380, FT - 400, 360, 360, 380).color('#3d4f63'));
add("gearmotor-body", cylinder(420, 150, 14).rotateX(90).translate(-200, FY + 980, FT - 210).color('#3d4f63'));
add("gearmotor-fan", cylinder(50, 160, 14).rotateX(90).translate(-200, FY + 1030, FT - 210).color(dark));

// Needle carriage under the channel; curved needles rise through the slot.
const up = needles.value === 'raised';
const NR = 1400, NX = 1400, NZ = TZ - NR; // needle arc radius and its lower end
add("needle-carriage", blk(NX, 0, 300, 300, BW + 200, 200).color(frame));
add("carriage-cylinder", cylinder(500, 90, 12).rotateY(90).translate(NX + 150, 0, 400).color(dark));
add("carriage-rod", cylinder(400, 35, 8).rotateY(90).translate(NX + 650, 0, 400).color(wire));
for (const y of ys) {
  // Quarter arc from the carriage up and over to the twister hook.
  let n = torus(NR, 18, 16).rotateX(90).subtract(blk(-NR - 50, 0, -NR - 50, NR + 50, 100, 2 * NR + 100)).subtract(blk(0, 0, -NR - 50, 2 * NR + 100, 100, NR + 50))
    .translate(0, y, NZ);
  if (!up) n = n.translate(0, 0, -1300).subtract(blk(0, y, -2000, 4000, 100, 2050));
  add(`needle-${y + 400}`, n.color(wire));
}

// Wire coils on payoff cages beside the frame (-Y side), with guide pulleys.
for (const [k, x] of [[0, -900], [1, 500]] as const) {
  const PY = -FY - 900;
  add(`payoff-base-${k}`, blk(x, PY, 0, 900, 900, 60).color(guard));
  for (const dx of [-400, 400]) for (const dy of [-400, 400]) add(`cage-post-${k}-${dx + 400}-${dy + 400}`, blk(x + dx, PY + dy, 60, 50, 50, 1000).color(guard));
  add(`cage-ring-${k}`, blk(x, PY, 1060, 900, 900, 50).subtract(blk(x, PY, 1050, 800, 800, 70)).color(guard));
  add(`wire-coil-${k}`, cylinder(520, 380, 20).subtract(cylinder(540, 230, 20).translate(0, 0, -10)).translate(x, PY, 80).color(wire));
  add(`coil-core-${k}`, cylinder(900, 40, 10).translate(x, PY, 60).color(dark));
  add(`guide-pulley-${k}`, cylinder(40, 120, 14).rotateY(90).translate(x - 20, -FY - 160, FT - 120).color(wire));
  add(`pulley-arm-${k}`, blk(x, -FY - 80, FT - 160, 60, 200, 60).color(frame));
  const dy = PY + 300 - (-FY - 160), dz = 600 - (FT - 120);
  add(`payoff-wire-${k}`, box(10, 10, Math.hypot(dy, dz), true).rotateX(-(Math.atan2(dy, dz) * 180) / Math.PI).translate(x, (PY + 300 - FY - 160) / 2, (600 + FT - 120) / 2).color(wire));
}

// Operator station with a guarded control panel at the +X end.
add("station-pedestal", blk(1500, -FY - 200, 0, 300, 300, 1000).color(frame));
add("control-panel", box(500, 160, 400, true).rotateX(20).translate(1500, -FY - 250, 1180).color('#d9d9d4'));
add("panel-screen", box(300, 10, 180, true).rotateX(20).translate(1500, -FY - 335, 1230).color('#3f6e8a'));
add("estop", cylinder(30, 45, 10).rotateX(110).translate(1650, -FY - 340, 1060).color('#d62f2a'));
add("safety-fence", blk(1900, 0, 0, 40, 2 * FY + 200, 1400).subtract(blk(1880, 0, 200, 80, 2 * FY - 100, 1000)).color(guard));
for (let k = 0; k < 9; k++) add(`fence-bar-${k}`, blk(1900, -FY + 150 + k * 280, 200, 20, 20, 1000).color(guard));
add("beacon", cylinder(180, 60, 10).translate(0, -FY, FT).color('#f08a24'));

return p.model();
