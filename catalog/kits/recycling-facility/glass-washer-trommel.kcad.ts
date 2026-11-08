// SPDX-License-Identifier: CC0-1.0
// Glass washer trommel: the slowly turning, slightly inclined screen drum
// that tumbles crushed cullet under water sprays to wash off labels, sugar
// and grit before optical sorting. What makes it that machine rather than a
// pipe on a table: a long perforated drum banded by two riding tyres that
// sit on trunnion rollers, a girth gear driven by a geared motor, a spray
// header with drop nozzles running along the top, a feed chute into the
// high end and a discharge chute of wet green cullet at the low end, and a
// tapering sump under the drum draining to a pump.
// Generic visualization geometry at about real size (6.4 m long), millimetres,
// Z up, drum axis along X falling toward +X, motor on -Y.

meta({
  name: "glass-washer-trommel",
  license: 'CC0-1.0',
  title: "Glass washer trommel",
  description: "Cullet washing trommel at about real size: inclined perforated drum with two riding tyres on trunnion rollers, girth gear and geared drive motor, spray header with drop nozzles and a back splash screen, feed chute at the high end, discharge chute with wet cullet at the low end, tapering sump with drain to a pump, and a base frame. Material controls: drum, frame, water pipework and sump. plant, stainless, weathered and highVisibility presets.",
  tags: ["recycling", "trommel", "washer", "glass", "cullet", "spray", "drum", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const drum = param('drum', '#b6bec1', { label: 'Screen drum (stainless)' });
const frame = param('frame', '#4a7980', { label: 'Base frame (paint)' });
const pipework = param('pipework', '#2f5d9a', { label: 'Water pipework (paint)' });
const sump = param('sump', '#6c7376', { label: 'Sump and chutes' });

presets({
  plant: { drum: '#b6bec1', frame: '#4a7980', pipework: '#2f5d9a', sump: '#6c7376' },
  stainless: { drum: '#d0d4d6', frame: '#a8b0b3', pipework: '#c9ccce', sump: '#b6bec1' },
  weathered: { drum: '#8e9294', frame: '#5b6a62', pipework: '#4f6478', sump: '#5c5650' },
  highVisibility: { drum: '#c4c9cb', frame: '#e0a526', pipework: '#2f6b8f', sump: '#3a3d40' },
});

const p = assembly("glass-washer-trommel");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const plane = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rodX = (x0: number, x1: number, r: number, seg: number) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, 0, 0);
const tag = (x: number) => (x < 0 ? `m${Math.round(-x)}` : `p${Math.round(x)}`);

// Drum group: built along X about the origin, then tilted 3 degrees and lifted.
const R = 800, DL = 5000, TILT = 3, ZC = 1500;
const T = (TILT * Math.PI) / 180;
const onAxis = (s: Shape) => s.rotateY(TILT).translate(0, 0, ZC);
const axisZ = (x: number) => ZC - x * Math.tan(T);
add("drum-shell", onAxis(rodX(-DL / 2, DL / 2, R, 20)).color(drum));
for (let k = 0; k < 9; k++) add(`screen-band-${k}`, onAxis(rodX(-1700 + k * 400, -1640 + k * 400, R + 12, 20)).color('#5d6366'));
for (const x of [-DL / 2, DL / 2 - 40]) add(`end-ring-${tag(x)}`, onAxis(rodX(x, x + 40, R + 40, 20)).color(drum));
const TX = 1900;
for (const x of [-TX, TX]) add(`riding-tyre-${tag(x)}`, onAxis(rodX(x - 110, x + 110, R + 90, 24)).color('#3a3d40'));
add("girth-gear", onAxis(rodX(-TX + 360, -TX + 460, R + 130, 32)).color('#5d6366'));
for (let k = 0; k < 8; k++) add(`gear-tooth-${k}`, onAxis(blk(-TX + 410, 0, -15, 100, 40, 30).translate(0, 0, R + 135).rotateX(k * 45)).color('#5d6366'));
add("feed-mouth", onAxis(rodX(-DL / 2 - 120, -DL / 2, R - 220, 18)).color('#2c2f31'));

// Trunnion rollers under each tyre, on bearing blocks.
const RR = 220, a = (35 * Math.PI) / 180;
for (const x of [-TX, TX]) {
  const zc = axisZ(x);
  for (const s of [-1, 1]) {
    const y = s * (R + 90 + RR) * Math.sin(a), z = zc - (R + 90 + RR) * Math.cos(a);
    const t = `${tag(x)}-${s < 0 ? 'f' : 'b'}`;
    add(`roller-${t}`, rodX(x - 130, x + 130, RR, 16).translate(0, y, z).color('#5d6366'));
    for (const e of [-1, 1]) add(`roller-bearing-${t}-${e < 0 ? 'a' : 'b'}`, blk(x + e * 190, y, z - 180, 110, 220, 260).color('#2c2f31'));
    add(`roller-pedestal-${t}`, blk(x, y, 360, 520, 300, z - 180 - 360).color(frame));
  }
}

// Geared drive motor beside the girth gear on -Y, pinion meshing at the side.
const GX = -TX + 410, gz = axisZ(GX), PY = -(R + 130 + 120);
add("pinion", rodX(GX - 60, GX + 60, 120, 14).translate(0, PY, gz).color('#5d6366'));
add("pinion-shaft", rodX(GX - 160, GX + 440, 45, 10).translate(0, PY, gz).color('#a8b4b6'));
add("gearbox", blk(GX + 600, PY, gz - 210, 360, 300, 420).color(frame));
add("drive-motor", rodX(GX + 780, GX + 1350, 170, 16).translate(0, PY, gz).color('#2f6b4f'));
add("motor-fan-cover", rodX(GX + 1350, GX + 1420, 150, 16).translate(0, PY, gz).color('#1c1d1e'));
add("drive-plate", blk(GX + 900, PY, gz - 250, 1200, 340, 40).color(frame));
for (const x of [GX + 360, GX + 1440]) for (const y of [PY - 130, PY + 130]) add(`drive-leg-${tag(x)}-${y < PY ? 'f' : 'b'}`, blk(x, y, 0, 80, 80, gz - 250).color(frame));
add("drive-brace", blk(GX + 900, PY - 130, 500, 1080, 60, 60).color(frame));
add("gear-guard", blk(GX, PY, gz + 150, 360, 320, 30).color('#f0c419'));

// Spray header along the top with drop nozzles, and a back splash screen.
const SZ = ZC + R + 420, HX = 2700;
add("spray-header", rodX(-HX, HX, 60, 12).translate(0, -120, SZ).color(pipework));
for (let k = 0; k < 9; k++) {
  const x = -1800 + k * 450, nz = axisZ(x) + R + 40;
  add(`spray-drop-${k}`, cylinder(SZ - nz - 50, 18, 8).translate(x, -120, nz + 50).color(pipework));
  add(`spray-nozzle-${k}`, cylinder(50, 34, 8).translate(x, -120, nz).color('#c9ccce'));
}
for (const x of [-HX, HX]) add(`header-post-${tag(x)}`, blk(x, -120, 360, 120, 120, SZ - 360 + 60).color(frame));
add("water-supply", cylinder(SZ, 60, 12).translate(HX + 200, -120, 0).color(pipework));
add("supply-elbow", rodX(HX, HX + 260, 60, 12).translate(0, -120, SZ).color(pipework));
add("supply-valve", rodX(HX + 130, HX + 270, 100, 12).translate(0, -120, 1200).color('#c8322a'));
add("supply-handwheel", cylinder(20, 140, 12).rotateX(90).translate(HX + 200, -250, 1200).color('#c8322a'));
add("splash-screen", blk(0, R + 260, ZC - 200, 5200, 20, R + 900).color(sump));
for (const x of [-2550, 2550]) add(`splash-post-${tag(x)}`, blk(x, R + 290, 0, 100, 40, ZC - 200).color(frame));

// Tapering sump trough under the screen section, with the wash water in it.
const sumpOuter = rect(3200, 1700).loft([rect(2400, 500)], { planes: [plane(1000), plane(380)], ruled: true });
const sumpInner = rect(3140, 1640).loft([rect(2340, 440)], { planes: [plane(1060), plane(420)], ruled: true });
add("sump-hopper", sumpOuter.subtract(sumpInner).color(sump));
add("sump-rim", blk(0, 0, 1000, 3300, 1800, 40).subtract(blk(0, 0, 990, 3100, 1600, 60)).color(sump));
add("wash-water", blk(0, 0, 880, 3020, 1440, 20).color('#4f7f95'));
for (const x of [-1100, 1100]) add(`sump-beam-${tag(x)}`, blk(x, 0, 300, 160, 1680, 80).color(frame));
add("sump-drain", cylinder(380, 80, 12).translate(-600, 0, 0).color(pipework));
add("drain-run", rodX(-600, 1500, 80, 12).translate(0, 0, 120).color(pipework));
add("pump-body", rodX(1500, 1900, 160, 14).translate(0, 400, 220).color(pipework));
add("pump-suction", rodX(1460, 1560, 80, 12).translate(0, 0, 120).color(pipework));
add("pump-riser", blk(1520, 200, 60, 120, 400, 120).color(pipework));
add("pump-motor", rodX(1900, 2300, 140, 14).translate(0, 400, 220).color('#2f6b4f'));
add("pump-base", blk(1900, 400, 0, 900, 400, 60).color(frame));

// Base frame: two long rails on feet.
for (const s of [-1, 1]) {
  add(`base-rail-${s < 0 ? 'f' : 'b'}`, blk(0, s * 760, 300, 5600, 160, 60).color(frame));
  for (const x of [-2700, -900, 900, 2700]) add(`base-leg-${tag(x)}-${s < 0 ? 'f' : 'b'}`, blk(x, s * 760, 0, 160, 160, 300).color(frame));
}
for (const x of [-2700, 2700]) add(`base-cross-${tag(x)}`, blk(x, 0, 300, 160, 1680, 60).color(frame));

// Inclined open troughs: feed into the high end, wet cullet out of the low end.
const trough = (x0: number, z0: number, x1: number, z1: number, w: number) =>
  profileXZ([[x0, z0], [x1, z1], [x1, z1 + 400], [x0, z0 + 400]], w)
    .subtract(profileXZ([[x0 - 10, z0 + 30], [x1 + 10, z1 + 30], [x1 + 10, z1 + 700], [x0 - 10, z0 + 700]], w - 60));
const load = (x0: number, z0: number, x1: number, z1: number, w: number) => profileXZ([[x0, z0 + 28], [x1, z1 + 28], [x1, z1 + 150], [x0, z0 + 150]], w);
const fz = axisZ(-DL / 2);
add("feed-chute", trough(-3500, fz + 900, -2250, fz - 100, 700).color(sump));
add("feed-cullet", load(-3480, fz + 884, -2270, fz - 84, 620).color('#3f7a4a'));
for (const s of [-1, 1]) add(`feed-leg-${s < 0 ? 'f' : 'b'}`, blk(-3420, s * 300, 0, 100, 100, fz + 820).color(frame));
const dz = axisZ(DL / 2);
add("discharge-chute", trough(DL / 2 - 100, dz - 250, 3700, 500, 1000).color(sump));
add("wet-cullet", load(DL / 2 - 80, dz - 266, 3680, 516, 920).color('#3f7a4a'));
for (const s of [-1, 1]) add(`discharge-leg-${s < 0 ? 'f' : 'b'}`, blk(3500, s * 420, 0, 100, 100, 540).color(frame));
add("cullet-pile", sphere(500).scale([1.2, 1.4, 0.6]).translate(4350, 0, 0).subtract(blk(4350, 0, -400, 1400, 1600, 400)).color('#3f7a4a'));

return p.model();
