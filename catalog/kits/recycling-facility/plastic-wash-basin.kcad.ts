// SPDX-License-Identifier: CC0-1.0
// Plastic wash basin: the float-sink tank of a plastics wash line. Shredded
// PET sinks while PP/PE flakes float, so the tank separates them by density.
// What makes it that machine rather than a water trough: a long V-bottomed
// tank full of water with flakes on the surface, a row of paddle drums across
// the top pushing the floating fraction toward the outlet, a screw trough in
// the bottom of the V carrying the sinking fraction out, an inclined
// dewatering screw lifting the floats out at the far end, and a feed chute at
// the near end.
// Generic visualization geometry at about real size (8 m long, 1.6 m wide,
// 3.6 m to the dewatering screw), millimetres, Z up, flow runs -X to +X with
// paddle drives on the -Y side facing the camera.

meta({
  name: "plastic-wash-basin",
  license: 'CC0-1.0',
  title: "Plastic wash basin",
  description: "Float-sink separation tank at about real size: long V-bottom stainless tank on legs, wash water with floating flakes, four paddle drums with drive motors along the top, bottom screw trough for the sinking fraction, inclined dewatering screw with motor and discharge chute at the outlet end, and an inclined feed chute at the inlet. Material controls: stainless tank, frame paint, paddles and wash water. plant, weathered, petLine and highVisibility presets.",
  tags: ["recycling", "plastics", "float sink tank", "wash line", "pet", "flakes", "dewatering screw", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#c2c9cb', { label: 'Tank, screws and chutes (stainless)' });
const frame = param('frame', '#2f5d8a', { label: 'Legs and drive motors (paint)' });
const paddles = param('paddles', '#e0a526', { label: 'Paddle drums (HDPE)' });
const water = param('water', '#4f8a96', { label: 'Wash water' });

presets({
  plant: { tank: '#c2c9cb', frame: '#2f5d8a', paddles: '#e0a526', water: '#4f8a96' },
  weathered: { tank: '#a4a8a3', frame: '#4b5860', paddles: '#b48a3d', water: '#6c7d6a' },
  petLine: { tank: '#d3d8da', frame: '#3a3f44', paddles: '#2f7fc1', water: '#6fa8b8' },
  highVisibility: { tank: '#e3e6e6', frame: '#d4572a', paddles: '#f2d21b', water: '#3f8fb0' },
});

const p = assembly("plastic-wash-basin");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// A (y, z) cross-section extruded along X over length t, centred on x = 0.
const profileYZ = (pts: number[][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// An (x, z) side profile extruded along Y over width t, centred on y = 0.
const profileXZ = (pts: number[][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const L = 6000, ZTOP = 2400, ZW = 2250, W = 800;

// V-bottom tank shell (hollow) with end plates, water and floating flakes.
add("tank-shell", profileYZ([[-W, ZTOP], [-W + 40, ZTOP], [-W + 40, 1210], [-130, 560], [130, 560], [W - 40, 1210], [W - 40, ZTOP], [W, ZTOP], [W, 1200], [150, 500], [-150, 500], [-W, 1200]], L).color(tank));
for (const s of [-1, 1]) add(`end-plate-${s}`, profileYZ([[-W, ZTOP], [W, ZTOP], [W, 1200], [150, 500], [-150, 500], [-W, 1200]], 40).translate(s * (L / 2 - 20), 0, 0).color(tank));
add("water", profileYZ([[-W + 40, ZW], [W - 40, ZW], [W - 40, 1210], [130, 560], [-130, 560], [-W + 40, 1210]], L - 80).color(water));
add("top-flange", blk(0, -W - 30, ZTOP - 80, L, 60, 80).color(tank));
add("top-flange-back", blk(0, W + 30, ZTOP - 80, L, 60, 80).color(tank));
const flakes = [[-2300, -300], [-1900, 250], [-1500, -100], [-700, 380], [-350, -420], [200, 120], [650, -260], [1100, 330], [1600, -50], [2100, 260], [2450, -380]];
flakes.forEach(([x, y], k) => add(`flake-${k}`, blk(x, y, ZW, 260, 180, 14).rotateZ(k * 37).color(k % 3 === 0 ? '#e8e4d8' : k % 3 === 1 ? '#3f7fbf' : '#d9d2c0')));

// Legs: four pairs under the V, with ties.
for (const x of [-2700, -900, 900, 2700]) {
  for (const s of [-1, 1]) {
    add(`leg-${x}-${s}`, blk(x, s * (W - 80), 0, 140, 140, 1250).color(frame));
    add(`foot-${x}-${s}`, blk(x, s * (W - 80), 0, 260, 260, 20).color(tank));
  }
  add(`tie-${x}`, blk(x, 0, 1100, 120, 2 * W - 20, 120).color(frame));
}

// Bottom screw trough for the sinking fraction, out through the +X end plate.
add("sink-screw-trough", cylinder(L + 700, 170, 14).rotateY(90).translate(-L / 2, 0, 400).color(tank));
add("sink-screw-motor", cylinder(450, 140, 14).rotateY(-90).translate(-L / 2, 0, 400).color(frame));
add("sink-discharge", blk(L / 2 + 550, 0, 0, 380, 380, 230).color(tank));

// Paddle drums across the top: shaft, four blades, drive motor on -Y.
for (const x of [-2100, -700, 700, 2100]) {
  add(`paddle-shaft-${x}`, cylinder(2 * W + 160, 55, 10).rotateX(90).translate(x, W + 80, ZTOP + 80).color(tank));
  for (let k = 0; k < 4; k++) add(`paddle-${x}-${k}`, box(560, 2 * W - 160, 24, true).rotateY(k * 45).translate(x, 0, ZTOP + 80).color(paddles));
  for (const s of [-1, 1]) add(`bearing-${x}-${s}`, blk(x, s * (W + 40), ZTOP, 180, 120, 140).color(frame));
  add(`paddle-gearbox-${x}`, blk(x, -W - 220, ZTOP - 60, 260, 200, 280).color(frame));
  add(`paddle-motor-${x}`, cylinder(340, 110, 14).rotateY(90).translate(x + 130, -W - 220, ZTOP + 80).color(frame));
}

// Inclined dewatering screw lifting the floating fraction out at +X.
const SX = L / 2 - 300, SZ = 1700, SA = 35, SL = 3000;
const ca = Math.cos((SA * Math.PI) / 180), sa = Math.sin((SA * Math.PI) / 180);
add("dewater-screw", cylinder(SL, 210, 16).rotateY(90 - SA).translate(SX, 0, SZ).color(tank));
add("dewater-motor", cylinder(500, 150, 14).rotateY(90 - SA).translate(SX + SL * ca, 0, SZ + SL * sa).color(frame));
add("dewater-discharge", blk(SX + SL * ca - 150, 0, SZ + SL * sa - 700, 360, 360, 500).color(tank));
add("dewater-chute", profileXZ([[SX + SL * ca - 330, SZ + SL * sa - 700], [SX + SL * ca + 600, SZ + SL * sa - 1500], [SX + SL * ca + 600, SZ + SL * sa - 1620], [SX + SL * ca - 330, SZ + SL * sa - 820]], 340).color(tank));
add("dewater-leg", blk(SX + SL * ca - 150, 0, 0, 160, 160, SZ + SL * sa - 700).color(frame));
add("dewater-leg-foot", blk(SX + SL * ca - 150, 0, 0, 300, 300, 20).color(tank));

// Inclined feed chute dropping shredded flake in at -X.
add("feed-chute", profileXZ([[-L / 2 - 1400, ZTOP + 900], [-L / 2 + 500, ZTOP + 200], [-L / 2 + 500, ZTOP + 80], [-L / 2 - 1400, ZTOP + 780]], 700).color(tank));
for (const s of [-1, 1]) add(`feed-chute-side-${s}`, profileXZ([[-L / 2 - 1400, ZTOP + 900], [-L / 2 + 500, ZTOP + 200], [-L / 2 + 500, ZTOP + 380], [-L / 2 - 1400, ZTOP + 1080]], 24).translate(0, s * 360, 0).color(tank));
add("feed-stand", blk(-L / 2 - 1200, 0, 0, 140, 140, ZTOP + 760).color(frame));
add("feed-stand-foot", blk(-L / 2 - 1200, 0, 0, 280, 280, 20).color(tank));

return p.model();
