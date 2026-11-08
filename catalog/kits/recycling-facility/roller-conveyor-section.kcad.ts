// SPDX-License-Identifier: CC0-1.0
// Roller conveyor section: the chain-driven live-roller run that carries
// finished bales out of a baler to the forklift pick-up point. What makes
// it a bale roller conveyor rather than a belt: closely pitched heavy steel
// rollers between channel side frames, a chain-and-sprocket drive boxed in
// a guard along one side, flared entry guides, a photo-eye pair that stops
// the line when a bale arrives, and a bumper stop at the discharge end.
// A strapped bale rides on the rollers.
// Generic visualization geometry at about real size (4.6 m long, 1.7 m wide,
// roller top 0.55 m), millimetres, Z up, bales travel toward +Y.

meta({
  name: "roller-conveyor-section",
  license: 'CC0-1.0',
  title: "Roller conveyor section",
  description: "Chain-driven live-roller bale conveyor at about real size: heavy steel rollers between channel side frames, chain drive under a side guard with gearmotor, flared entry guides, photo-eye stop sensors, bumper end stop and braced legs, carrying a strapped bale. Material controls: frame paint, rollers, chain guard, bumper; cardboard, paper, plastic or metal bale or none. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "roller conveyor", "live roller", "bale conveyor", "chain drive", "bale", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3a78a8', { label: 'Side frames and legs (paint)' });
const rollers = param('rollers', '#aab2b5', { label: 'Rollers (steel)' });
const guard = param('guard', '#f0b429', { label: 'Chain guard and entry guides' });
const bumper = param('bumper', '#2b2f31', { label: 'Bumper and feet (rubber)' });
const bale = param('bale', 'cardboard', { choices: ['cardboard', 'paper', 'plastic', 'metal', 'none'], label: 'Bale on rollers' });

presets({
  plant: { frame: '#3a78a8', rollers: '#aab2b5', guard: '#f0b429', bumper: '#2b2f31' },
  weathered: { frame: '#566673', rollers: '#86857e', guard: '#a8893f', bumper: '#3a3836' },
  stainless: { frame: '#c6cbcd', rollers: '#e0e4e5', guard: '#2f5d9a', bumper: '#30363a' },
  highVisibility: { frame: '#3d7a4a', rollers: '#c9ced1', guard: '#f2d21b', bumper: '#1f2224' },
});

const p = assembly("roller-conveyor-section");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const L = 4400, W = 1300, R = 45, ZR = 500, FX = W / 2 + 50, PITCH = 160;

// Channel side frames: web plus top and bottom flanges, open toward the outside.
for (const s of [-1, 1]) {
  add(`frame-web-${s}`, blk(s * FX, L / 2, ZR - 140, 16, L, 200).color(frame));
  add(`frame-flange-top-${s}`, blk(s * (FX + 30), L / 2, ZR + 44, 76, L, 16).color(frame));
  add(`frame-flange-bot-${s}`, blk(s * (FX + 30), L / 2, ZR - 140, 76, L, 16).color(frame));
}

// Rollers with their axle stubs through the frames.
const NR = Math.floor((L - 200) / PITCH);
for (let k = 0; k <= NR; k++) {
  const y = 100 + k * PITCH;
  add(`roller-${k}`, alongX(-W / 2, W, R, y, ZR, 10).color(rollers));
}

// Legs with levelling feet, cross ties and diagonal braces.
for (const y of [250, L / 2, L - 250]) {
  for (const s of [-1, 1]) {
    add(`leg-${s}-${y}`, blk(s * FX, y, 60, 90, 90, ZR - 200).color(frame));
    add(`foot-${s}-${y}`, blk(s * FX, y, 0, 180, 180, 60).color(bumper));
  }
  add(`tie-${y}`, blk(0, y, 180, 2 * FX, 70, 70).color(frame));
}
for (const s of [-1, 1]) {
  add(`diag-${s}`, box(50, 1900, 50, true).rotateX(-8).translate(s * FX, L * 0.27, 230).color(frame));
  add(`diag-b-${s}`, box(50, 1900, 50, true).rotateX(8).translate(s * FX, L * 0.73, 230).color(frame));
}

// Chain drive along the -X side, boxed in a guard; gearmotor under the frame.
add("chain-guard", blk(-FX - 110, L / 2, ZR - 150, 120, L - 100, 200).color(guard));
add("chain-guard-cap", blk(-FX - 80, L / 2, ZR + 50, 180, L - 100, 12).color(guard));
for (let k = 0; k < 6; k++) add(`guard-slot-${k}`, blk(-FX - 172, 400 + k * 700, ZR - 90, 6, 360, 70).color('#1d2224'));
add("gearbox", blk(-FX - 150, L - 700, 120, 240, 300, 260).color(frame));
add("drive-motor", alongX(-FX - 650, 380, 110, L - 700, 250, 14).color('#5a6266'));
add("drive-sprocket-cover", alongX(-FX - 260, 60, 150, L - 700, 300, 14).color(guard));

// Flared entry guides at the tail end.
for (const s of [-1, 1]) {
  add(`guide-${s}`, blk(s * (W / 2 - 20), L / 2 + 300, ZR + 60, 40, L - 1400, 140).color(guard));
  add(`guide-flare-${s}`, box(40, 800, 140, true).rotateZ(s * 20).translate(s * (W / 2 + 117), 650, ZR + 130).color(guard));
}

// Bumper stop at the discharge end.
add("stop-beam", blk(0, L + 40, ZR - 60, 2 * FX + 100, 120, 260).color(frame));
for (const s of [-1, 1]) add(`stop-pad-${s}`, blk(s * 380, L - 40, ZR + 60, 260, 60, 160).color(bumper));
add("stop-stripe", blk(0, L + 102, ZR + 20, 2 * FX, 6, 70).color(guard));

// Photo-eye pair near the end stop.
for (const s of [-1, 1]) {
  add(`eye-post-${s}`, blk(s * (FX + 120), L - 500, 0, 60, 60, ZR + 450).color(frame));
  add(`eye-head-${s}`, blk(s * (FX + 70), L - 500, ZR + 300, 80, 90, 110).color(s < 0 ? '#2f6db5' : '#e2e6e8'));
  add(`eye-lens-${s}`, blk(s * (FX + 25), L - 500, ZR + 330, 12, 50, 50).color('#c8202a'));
}

// A strapped bale riding on the rollers.
if (bale.value !== 'none') {
  const tone = { cardboard: ['#b58a5a', '#c99f6a'], paper: ['#e8e4da', '#c9c3b3'], plastic: ['#5c8fc4', '#d9dfe3'], metal: ['#8f969a', '#b6bcbf'] }[bale.value];
  const BY = 2200, BW = 1100, BD = 1500, BH = 800, Z0 = ZR + R;
  add("bale", blk(0, BY, Z0, BW, BD, BH).color(tone[0]));
  for (let k = 0; k < 4; k++) add(`bale-layer-${k}`, blk(0, BY, Z0 + 90 + k * 180, BW + 16, BD + 16, 40).color(tone[1]));
  for (const x of [-350, 0, 350]) add(`strap-${x}`, blk(x, BY, Z0 - 4, 16, BD + 24, BH + 12).color('#2b2f31'));
}

return p.model();
