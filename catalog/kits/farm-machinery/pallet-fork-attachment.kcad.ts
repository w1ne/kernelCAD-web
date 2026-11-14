// SPDX-License-Identifier: CC0-1.0
// Pallet-fork attachment: the quick-attach fork frame a loader tractor picks
// up to move pallets. What makes it one rather than a box: an open carriage of
// top and bottom fork bars between two uprights, quick-attach hooks and latch
// plates on the back, a welded brick guard above, and two forged L-shaped
// tines hooked over the top bar, each with a tapered blade, a lock pin and a
// heel, slid apart to the chosen spread. Generic visualization geometry at
// real size (1.22 m carriage, 1.22 m / 48 in tines), millimetres, Z up, tines
// pointing -Y, tine blades on z = 0.
meta({
  name: "pallet-fork-attachment",
  license: 'CC0-1.0',
  title: "Tractor pallet-fork attachment",
  description: "Quick-attach pallet-fork frame at real size: 1.22 m carriage with top and bottom fork bars between uprights, quick-attach hooks and latch plates with pull handles on the back, a welded brick guard, and two forged L-shaped tines with tapered blades, hook heels and lock pins. Tine spread and tine length are editable. Material controls: frame paint, forged tine steel and zinc hardware; yardOrange, loaderYellow and weathered presets.",
  tags: ['pallet forks', 'fork frame', 'quick attach', 'loader attachment', 'tines', 'brick guard', 'farm machinery', 'agriculture', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 3000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const spread = param('tineSpread', '640', { choices: ['400', '640', '900'], label: 'Tine spread, centre to centre (mm)' });
const tineLength = param('tineLength', '48 in', { choices: ['42 in', '48 in'], label: 'Tine length' });
const framePaint = param('framePaint', '#3d7a3a', { label: 'Frame paint' });
const tineForged = param('tineForged', '#2c2f31', { label: 'Forged tine steel' });
const hardwareZinc = param('hardwareZinc', '#c9c4a2', { label: 'Pins, latches and handles' });
presets({
  yardOrange: { framePaint: '#d9661f', tineForged: '#2a2a2a' },
  loaderYellow: { framePaint: '#e3b21d', tineForged: '#33302b', hardwareZinc: '#b9bdc0' },
  weathered: { framePaint: '#56684c', tineForged: '#5a4a3c', hardwareZinc: '#8d8a78' },
});

const p = assembly('pallet-fork-attachment');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Plate across X (thickness t, centred on x = 0) from a side profile in [y, z] points.
const sidePlate = (pts, t) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const CW = 1220;                    // carriage width
const L = tineLength.value === '42 in' ? 1070 : 1220;
const half = Number(spread.value) / 2;

// Carriage: top and bottom fork bars between two uprights.
add('top-fork-bar', box(CW, 70, 110, true).translate(0, 35, 585).color(framePaint));
add('bottom-fork-bar', box(CW, 60, 80, true).translate(0, 40, 140).color(framePaint));
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  add(`upright-${k}`, sidePlate([[0, 90], [140, 90], [160, 660], [0, 680]], 24).translate(s * (CW / 2 - 12), 0, 0).color(framePaint));
  // Quick-attach top hook and bottom latch plate on the back face.
  for (const xh of [s * 380, s * 560]) {
    add(`qa-hook-${k}-${Math.abs(xh)}`, sidePlate([[70, 520], [170, 560], [230, 700], [190, 730], [140, 640], [70, 620]], 22).translate(xh, 0, 0).color(framePaint));
  }
  add(`latch-plate-${k}`, sidePlate([[70, 100], [200, 100], [200, 260], [70, 300]], 30).translate(s * 470, 0, 0).color(framePaint));
  add(`latch-pin-${k}`, rod([s * 470, 140, 140], [s * 470, 140, 30], 20, 8).color(hardwareZinc));
  add(`latch-handle-${k}`, rod([s * 470, 140, 300], [s * 340, 210, 380], 14, 6).color(hardwareZinc));
  add(`latch-spring-${k}`, rod([s * 470, 140, 160], [s * 470, 140, 290], 28, 8).color(hardwareZinc));
}
add('back-brace', rod([-CW / 2 + 30, 80, 180], [CW / 2 - 30, 80, 560], 22, 6).color(framePaint));

// Brick guard: welded tube frame above the top bar.
const GH = 1180;
for (const s of [-1, 1]) add(`guard-post-${s < 0 ? 'left' : 'right'}`, rod([s * (CW / 2 - 30), 40, 640], [s * (CW / 2 - 30), 40, GH], 28, 8).color(framePaint));
add('guard-top-rail', rod([-CW / 2 + 2, 40, GH], [CW / 2 - 2, 40, GH], 30, 8).color(framePaint));
add('guard-mid-rail', rod([-CW / 2 + 30, 40, 910], [CW / 2 - 30, 40, 910], 18, 6).color(framePaint));
for (let i = 1; i < 7; i++) {
  const x = -CW / 2 + 30 + i * ((CW - 60) / 7);
  add(`guard-bar-${i}`, rod([x, 40, 640], [x, 40, GH], 12, 6).color(framePaint));
}

// Forged L tines hooked over the top bar, blades tapering to a chisel tip.
const tine = [[0, 0], [-L, 0], [-L, 14], [-L + 300, 40], [-140, 50], [-60, 90], [-50, 600], [-40, 700], [100, 700], [100, 645], [10, 645], [10, 120], [0, 60]];
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  const x = s * half;
  add(`tine-${k}`, sidePlate(tine, 100).translate(x, 0, 0).color(tineForged));
  add(`tine-heel-${k}`, sidePlate([[0, 120], [20, 120], [20, 200], [0, 200]], 100).translate(x, 0, 0).color(tineForged));
  add(`tine-lock-pin-${k}`, rod([x, 40, 700], [x, 40, 770], 14, 6).color(hardwareZinc));
  add(`tine-lock-ring-${k}`, rod([x - 30, 40, 760], [x + 30, 40, 760], 8, 4).color(hardwareZinc));
}

return p.model();
