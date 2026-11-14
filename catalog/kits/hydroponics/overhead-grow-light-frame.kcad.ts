// SPDX-License-Identifier: CC0-1.0
// Overhead grow light frame: a freestanding steel gantry that hangs a
// multi-bar LED fixture over a grow bench, so the light height can be
// wound up as the crop grows.
// What makes it a grow-light frame: four square-tube legs on foot plates,
// top rails and purlins, a "spider" LED fixture of parallel aluminium
// bars (finned tops, coloured diode strips underneath) joined by two
// cross-rails with a driver box on top, hung by four ratchet ropes; and
// under it a grow bench with a flood tray of lettuce heads.
// Generic visualization geometry at about real size (1.8 x 1.3 m, 2.2 m
// tall), millimetres, Z up, front -Y.

meta({
  name: "overhead-grow-light-frame",
  license: 'CC0-1.0',
  title: "Overhead grow light frame",
  description: "Freestanding grow-light gantry at about real size: square-tube legs and rails, a multi-bar LED fixture with finned aluminium bars, diode strips, cross-rails and driver box hung on ratchet ropes, over a grow bench with a flood tray of lettuce. Material controls: frame steel, LED housing, diode glow and crop, plus bar count (6 or 8). fullSpectrum, redBlue, weathered and highVisibility presets.",
  tags: ['grow light', 'LED fixture', 'light frame', 'gantry', 'horticultural lighting', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frameSteel', '#e6e7e3', { label: 'Frame (white powder-coated steel)' });
const housing = param('ledHousing', '#3b3f44', { label: 'LED bars and driver (anodised aluminium)' });
const glow = param('diodeGlow', '#f3e6d0', { label: 'Diode strips (light colour)' });
const crop = param('crop', '#6fae3f', { label: 'Lettuce crop' });
const bars = param('barCount', '8', { choices: ['8', '6'], label: 'LED bars' });

presets({
  fullSpectrum: { frameSteel: '#e6e7e3', ledHousing: '#3b3f44', diodeGlow: '#f3e6d0', crop: '#6fae3f' },
  redBlue: { frameSteel: '#d9dbd8', ledHousing: '#2a2d31', diodeGlow: '#d14fb6', crop: '#8a3f5e' },
  weathered: { frameSteel: '#a9aba3', ledHousing: '#55595c', diodeGlow: '#d8ccb4', crop: '#7d9a4a' },
  highVisibility: { frameSteel: '#e87832', ledHousing: '#2d3034', diodeGlow: '#fff4c2', crop: '#79c043' },
});

const p = assembly("overhead-grow-light-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const turned = (pts: [number, number][], seg = 10) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

// Gantry: legs on foot plates, top rails along X, purlins along Y, knee braces.
const LX = 900, LY = 650, TOP = 2200;
for (const x of [-LX, LX]) for (const y of [-LY, LY]) {
  add(`foot-${x}-${y}`, blk(x, y, 0, 140, 140, 10).color(frame));
  add(`leg-${x}-${y}`, blk(x, y, 10, 50, 50, TOP - 10).color(frame));
  add(`brace-${x}-${y}`, box(30, 30, 300, true).rotateY(Math.sign(x) * 45).translate(x - Math.sign(x) * 110, y, TOP - 100).color(frame));
}
for (const y of [-LY, LY]) add(`rail-${y}`, blk(0, y, TOP, 2 * LX + 50, 50, 50).color(frame));
for (const x of [-LX, -300, 300, LX]) add(`purlin-${x}`, blk(x, 0, TOP + 50, 40, 2 * LY + 50, 40).color(frame));

// Spider LED fixture: parallel bars along Y with finned tops and diode strips.
const n = Number(bars.value), FZ = 1650, BL = 1100, pitch = 1500 / n;
for (let k = 0; k < n; k++) {
  const x = -((n - 1) * pitch) / 2 + k * pitch;
  add(`bar-${k}`, extrudeRoundedRect(70, 28, 8, BL, { axis: 'y' }).translate(x, -BL / 2, FZ + 14).color(housing));
  add(`fins-${k}`, blk(x, 0, FZ + 28, 40, BL - 40, 14).color('#5b6066'));
  add(`diodes-${k}`, blk(x, 0, FZ - 10, 80, BL - 20, 12).color(glow));
}
for (const y of [-380, 380]) add(`cross-rail-${y}`, blk(0, y, FZ + 42, 1560, 40, 24).color(housing));
add("driver", extrudeRoundedRect(260, 60, 10, 160, { axis: 'y' }).translate(0, -80, FZ + 96).color(housing));
add("driver-label", blk(0, -84, FZ + 80, 120, 4, 30).color(glow));
add("driver-cord", cylZ(130, 0, FZ + 66, TOP - FZ - 66, 5, 6).color('#1e2023'));
// Ratchet hangers: rope, ratchet body, hook on the purlin.
for (const x of [-300, 300]) for (const y of [-380, 380]) {
  add(`rope-${x}-${y}`, cylZ(x, y, FZ + 54, TOP + 50 - FZ - 54, 3, 4).color('#24262a'));
  add(`ratchet-${x}-${y}`, blk(x, y, FZ + 260, 26, 44, 70).color('#24262a'));
}

// Grow bench with a flood tray of lettuce heads under the light.
const BZ = 760;
for (const x of [-700, 700]) for (const y of [-450, 450]) add(`bench-leg-${x}-${y}`, blk(x, y, 0, 40, 40, BZ).color('#8f969a'));
add("bench-frame", blk(0, 0, BZ - 60, 1500, 960, 60).color('#8f969a'));
add("flood-tray", blk(0, 0, BZ, 1600, 1060, 25).color('#2b2d30'));
for (const y of [-525, 525]) add(`tray-lip-${y}`, blk(0, y, BZ + 25, 1600, 20, 45).color('#2b2d30'));
for (const x of [-795, 795]) add(`tray-end-${x}`, blk(x, 0, BZ + 25, 20, 1060, 45).color('#2b2d30'));
add("raft", blk(0, 0, BZ + 25, 1560, 1020, 40).color('#eceae2'));
const head: [number, number][] = [[0, 0], [60, 10], [95, 45], [90, 80], [55, 110], [0, 120]];
for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
  add(`lettuce-${i}-${j}`, turned(head).translate(-600 + i * 300, -320 + j * 320, BZ + 60).color(crop));
}

return p.model();
