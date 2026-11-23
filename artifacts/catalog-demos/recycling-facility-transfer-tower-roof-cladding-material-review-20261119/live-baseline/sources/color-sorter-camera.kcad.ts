// SPDX-License-Identifier: CC0-1.0
// Color-sorter camera: the sealed line-scan camera module that goes inside an
// optical sorter, shown on its service stand above a section of the sorting
// chute it watches. What makes it that module rather than a box on legs: a
// long rounded aluminium housing tilted down toward the scan line, a row of
// lens barrels with glass windows, two angled LED light bars either side of
// the scan line, an air-purge rail with nozzles keeping the windows clean,
// cable glands with cables to a junction box, and below it the inclined
// stainless chute with flakes sliding past a white background tile toward
// the ejector bar.
// Generic visualization geometry at about real size (1.9 m wide, 1.5 m tall),
// millimetres, Z up, lenses and lights facing -Y.

meta({
  name: "color-sorter-camera",
  license: 'CC0-1.0',
  title: "Color-sorter camera",
  description: "Line-scan colour-sorter camera module on its service stand at about real size: long rounded aluminium housing tilted toward the scan line, three or four lens barrels with glass windows, two angled LED light bars, air-purge rail with nozzles, cable glands with cables to a junction box, clamp brackets on two uprights, and the inclined stainless chute below with flakes sliding past a white background tile to the ejector bar. Material controls: camera housing, lens glass, LED diffusers and stand brackets. plant, weathered, blackAnodised and highVisibility presets.",
  tags: ["recycling", "camera", "line scan", "colour sorter", "color sorter", "optical sorter", "led light bar", "chute", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#c9ccce', { label: 'Camera housing (anodised aluminium)' });
const lens = param('lens', '#1c2a33', { label: 'Lens windows (glass)' });
const ledBar = param('ledBar', '#f4f7ff', { label: 'LED diffusers' });
const bracket = param('bracket', '#2f6bb5', { label: 'Stand and brackets (paint)' });
const lenses = param('lenses', 'three', { choices: ['three', 'four'], label: 'Lens count' });

presets({
  plant: { housing: '#c9ccce', lens: '#1c2a33', ledBar: '#f4f7ff', bracket: '#2f6bb5' },
  weathered: { housing: '#9a9d9e', lens: '#2a3a40', ledBar: '#e6e2d0', bracket: '#4f6478' },
  blackAnodised: { housing: '#2b2f33', lens: '#14202a', ledBar: '#ffe9b0', bracket: '#8a9196' },
  highVisibility: { housing: '#e4e7e7', lens: '#1c2a33', ledBar: '#ffffff', bracket: '#e0a526' },
});

const p = assembly("color-sorter-camera");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rodX = (y: number, z: number, x0: number, x1: number, r: number, seg = 12) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const side = (s: number) => (s < 0 ? 'l' : 'r');

// Camera head: built about its own axis, then tilted 30 degrees toward -Y and lifted.
const HL = 1500, HZ = 1250, TILT = 30;
const mount = (s: Shape) => s.rotateX(-TILT).translate(0, 0, HZ);
add("camera-housing", mount(extrudeRoundedRect(240, 200, 50, HL, { axis: 'y' }).rotateZ(-90).translate(-HL / 2, 0, 0)).color(housing));
for (const s of [-1, 1]) {
  add(`end-cap-${side(s)}`, mount(blk(s * (HL / 2 + 20), 0, -110, 40, 260, 220)).color('#3a3d40'));
  add(`clamp-${side(s)}`, mount(blk(s * (HL / 2 - 120), 0, 100, 120, 160, 70)).color(bracket));
}
add("label-band", mount(blk(0, -122, 20, 600, 8, 60)).color(bracket));
add("status-led", mount(cylinder(8, 14, 8).rotateX(90).translate(380, -122, 50)).color('#2f9a4f'));
const nLens = lenses.value === 'four' ? 4 : 3;
for (let k = 0; k < nLens; k++) {
  const x = -HL / 2 + (HL * (k + 0.5)) / nLens;
  add(`lens-barrel-${k}`, mount(cylinder(110, 60, 14).translate(x, 0, -210)).color('#3a3d40'));
  add(`lens-window-${k}`, mount(cylinder(10, 48, 14).translate(x, 0, -216)).color(lens));
  add(`purge-nozzle-${k}`, mount(rod([x + 80, -90, -150], [x + 30, -40, -205], 10, 6)).color('#9aa1a4'));
}
add("purge-rail", mount(rodX(-90, -150, -HL / 2 + 40, HL / 2 - 40, 16, 8)).color('#9aa1a4'));

// LED light bars either side of the scan line, angled in.
const SY = -330, SZ = 560;
for (const s of [-1, 1]) {
  const y = SY + s * 330, z = 980;
  const ang = s < 0 ? -55 : 55;
  add(`led-bar-${s < 0 ? 'f' : 'b'}`, box(HL - 100, 110, 70, true).rotateX(ang).translate(0, y, z).color(housing));
  add(`led-diffuser-${s < 0 ? 'f' : 'b'}`, box(HL - 160, 80, 8, true).rotateX(ang).translate(0, y - s * 30, z - 25).color(ledBar));
  for (const x of [-1, 1]) add(`led-arm-${s < 0 ? 'f' : 'b'}-${side(x)}`, blk(x * (HL / 2 - 30), y, z, 40, 40, HZ - z - 60).color(bracket));
}

// Stand: two uprights with a top beam and a bottom tie.
const UX = HL / 2 + 140;
for (const s of [-1, 1]) {
  add(`upright-${side(s)}`, blk(s * UX, 0, 0, 100, 100, HZ + 160).color(bracket));
  add(`foot-${side(s)}`, blk(s * UX, -150, 0, 160, 700, 20).color(bracket));
  add(`arm-${side(s)}`, blk(s * (UX - 60), 0, HZ + 100, 180, 100, 60).color(bracket));
}
add("top-beam", blk(0, 0, HZ + 160, 2 * UX + 100, 100, 80).color(bracket));
add("bottom-tie", blk(0, 0, 100, 2 * UX, 80, 80).color(bracket));

// Junction box on the right upright and cables from the glands.
add("junction-box", blk(UX, -110, 650, 220, 120, 300).color('#d8dcdd'));
for (const [i, dy] of [[0, -40], [1, 40]] as const) {
  add(`cable-gland-${i}`, mount(rodX(dy, -60, HL / 2 + 40, HL / 2 + 80, 18, 8)).color('#3a3d40'));
  add(`cable-${i}`, rod([HL / 2 + 80, dy * 0.8, HZ - 40], [UX - 40, -110 + dy, 950], 10, 6).color('#24272a'));
}

// Chute section under the camera with flakes passing the background tile.
const CA = 40;
add("chute-plate", box(HL + 100, 900, 14, true).rotateX(CA).translate(0, SY + 40, SZ).color('#b6bec1'));
for (const s of [-1, 1]) add(`chute-cheek-${side(s)}`, box(14, 900, 160, true).rotateX(CA).translate(s * (HL / 2 + 50), SY + 40, SZ + 60).color('#b6bec1'));
for (const s of [-1, 1]) add(`chute-leg-${side(s)}-b`, blk(s * (HL / 2 + 50), SY + 330, 0, 60, 60, SZ + 240).color(bracket));
add("background-tile", box(HL - 100, 20, 260, true).rotateX(CA).translate(0, SY + 360, SZ + 380).color('#f2f2ee'));
add("ejector-bar", blk(0, SY - 400, 180, HL - 200, 120, 100).color('#2b2f33'));
for (const s of [-1, 1]) add(`ejector-leg-${side(s)}`, blk(s * (HL / 2 - 140), SY - 400, 0, 60, 60, 180).color(bracket));
let seed = 31;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const flakes = ['#a9d3e0', '#3f8f5a', '#e9e6dc', '#8a5a2b', '#2f6fb5', '#c84a3a'];
for (let k = 0; k < 16; k++) {
  const t = rnd();
  const y = SY + 40 + (t - 0.5) * 760 * Math.cos((CA * Math.PI) / 180);
  const z = SZ + 14 + (t - 0.5) * 760 * Math.sin((CA * Math.PI) / 180);
  add(`flake-${k}`, blk(0, 0, 0, 50 + rnd() * 40, 40 + rnd() * 30, 8).rotateZ(rnd() * 180).rotateX(CA)
    .translate((rnd() - 0.5) * (HL - 100), y, z).color(flakes[k % flakes.length]));
}

return p.model();
