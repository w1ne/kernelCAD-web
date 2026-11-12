// SPDX-License-Identifier: CC0-1.0
// Optical sorter arch: the open portal-frame scanner that retrofits over an
// existing picking belt. What makes it that arch rather than a gantry: two
// legs carrying a hooded sensor head across the belt, with a dark detector
// slot flanked by two angled lamp housings that light the scan line; cable
// tray, isolator and junction box on the legs and a beacon on top; and,
// downstream, the air-knife bar under the head pulley firing the picked
// fraction over a splitter wall into the far concrete bunker while the rest
// drops into the near one. An optional second head scans further upstream.
// Generic visualization geometry at about real size (2.6 m wide, 2.9 m tall
// arch over a 1.4 m belt), millimetres, Z up, belt running toward +Y.

meta({
  name: "optical-sorter-arch",
  license: 'CC0-1.0',
  title: "Optical sorter arch",
  description: "Open portal-frame optical sorter arch at about real size over a 1.4 m picking belt carrying mixed material: hooded sensor head with detector slot and two angled lamp housings, legs with cable tray, isolator and junction box, beacon on top, air-knife bar under the head pulley, splitter wall between a drop bunker and an eject bunker with their heaps. One or two scanning heads. Material controls: arch paint, lamp diffusers, belt and support frame. plant, weathered, galvanised and highVisibility presets.",
  tags: ["recycling", "optical sorter", "sensor arch", "scanner", "air knife", "splitter", "bunker", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const arch = param('arch', '#2f6bb5', { label: 'Arch and sensor head (paint)' });
const lamp = param('lamp', '#ffd98a', { label: 'Lamp diffusers' });
const belt = param('belt', '#24272a', { label: 'Picking belt (rubber)' });
const frame = param('frame', '#6c7376', { label: 'Belt frame and air bar' });
const heads = param('heads', 'single', { choices: ['single', 'dual'], label: 'Scanning heads' });

presets({
  plant: { arch: '#2f6bb5', lamp: '#ffd98a', belt: '#24272a', frame: '#6c7376' },
  weathered: { arch: '#4f6478', lamp: '#d9c08a', belt: '#2c2a28', frame: '#5c5650' },
  galvanised: { arch: '#b6bec1', lamp: '#f2f2ee', belt: '#2a2c2e', frame: '#8e9294' },
  highVisibility: { arch: '#e0a526', lamp: '#fff2b0', belt: '#1c1d1e', frame: '#2f6b8f' },
});

const p = assembly("optical-sorter-arch");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rodX = (y: number, z: number, x0: number, x1: number, r: number, seg = 12) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, y, z);
const side = (s: number) => (s < 0 ? 'l' : 'r');

// Picking belt along Y, head pulley at +Y.
const TZ = 900, BW = 1400, Y0 = -3200, Y1 = 900;
add("belt", blk(0, (Y0 + Y1) / 2, TZ - 14, BW, Y1 - Y0, 14).color(belt));
add("head-pulley", rodX(Y1, TZ - 150, -BW / 2 + 20, BW / 2 - 20, 150, 16).color(frame));
add("tail-pulley", rodX(Y0, TZ - 130, -BW / 2 + 20, BW / 2 - 20, 130, 14).color(frame));
for (const s of [-1, 1]) {
  add(`stringer-${side(s)}`, blk(s * (BW / 2 + 50), (Y0 + Y1) / 2, TZ - 260, 80, Y1 - Y0 + 200, 220).color(frame));
  add(`skirt-${side(s)}`, blk(s * (BW / 2 - 10), (Y0 + Y1) / 2 - 600, TZ, 20, Y1 - Y0 - 1400, 160).color(frame));
  for (const y of [Y0 + 200, -1200, Y1 - 200]) add(`belt-leg-${side(s)}-${y + 4000}`, blk(s * (BW / 2 + 50), y, 0, 90, 90, TZ - 260).color(frame));
}
add("drive-motor", rodX(Y1, TZ - 150, BW / 2 + 100, BW / 2 + 520, 160, 12).color(arch));

// Mixed material on the belt.
let seed = 23;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const mix = ['#a9d3e0', '#3f8f5a', '#e9e6dc', '#c9b089', '#c84a3a', '#2f6fb5'];
for (let k = 0; k < 26; k++) {
  const piece = k % 4 === 0
    ? cylinder(220, 45, 8).rotateY(90).translate(-110, 0, 45).rotateZ(rnd() * 180)
    : blk(0, 0, 0, 120 + rnd() * 160, 90 + rnd() * 120, 12).rotateZ(rnd() * 180);
  add(`item-${k}`, piece.translate((rnd() - 0.5) * (BW - 300), Y0 + 400 + rnd() * (Y1 - Y0 - 600), TZ).color(mix[k % mix.length]));
}

// Portal arch with hooded sensor head.
const AW = 2600, HZ = 2050;
const head = (y: number, n: string) => {
  add(`${n}-hood`, profileYZ([[-420, HZ], [420, HZ], [420, HZ + 380], [180, HZ + 620], [-180, HZ + 620], [-420, HZ + 380]], AW).translate(0, y, 0).color(arch));
  add(`${n}-detector-slot`, blk(0, y, HZ - 16, AW - 600, 160, 16).color('#14202a'));
  for (const s of [-1, 1]) {
    add(`${n}-lamp-housing-${s < 0 ? 'f' : 'b'}`, box(AW - 500, 200, 140, true).rotateX(s * 32).translate(0, y + s * 300, HZ - 40).color(arch));
    add(`${n}-lamp-lens-${s < 0 ? 'f' : 'b'}`, box(AW - 560, 150, 10, true).rotateX(s * 32).translate(0, y + s * 262, HZ - 110).color(lamp));
    add(`${n}-leg-${side(s)}`, extrudeRoundedRect(300, HZ + 380, 40, 260, { axis: 'y' }).translate(s * (AW / 2 - 150), y - 130, (HZ + 380) / 2).color(arch));
    add(`${n}-base-plate-${side(s)}`, blk(s * (AW / 2 - 150), y, 0, 520, 480, 30).color(frame));
  }
  add(`${n}-name-band`, blk(0, y - 424, HZ + 200, 1200, 10, 120).color('#f2f2ee'));
};
head(-400, 'head');
if (heads.value === 'dual') head(-2000, 'upstream-head');

// Services on the arch: cable tray, isolator, junction box, beacon.
const LX = -AW / 2 + 150;
add("cable-tray-leg", blk(LX - 190, -400, 300, 60, 200, HZ - 200).color('#9aa1a4'));
add("cable-tray-top", blk(0, -150, HZ + 620, AW - 600, 200, 50).color('#9aa1a4'));
add("isolator", blk(LX, -560, 1300, 220, 120, 300).color('#f0c419'));
add("isolator-handle", blk(LX, -630, 1430, 60, 30, 120).color('#c8322a'));
add("junction-box", blk(-LX, -560, 1500, 300, 120, 400).color('#d8dcdd'));
add("beacon-base", cylinder(60, 70, 10).translate(AW / 2 - 400, -400, HZ + 620).color('#2b2f33'));
add("beacon", cylinder(160, 60, 10).translate(AW / 2 - 400, -400, HZ + 680).color('#f0ae32'));

// Air-knife bar under the trajectory and the two bunkers beyond.
add("air-knife", blk(0, Y1 + 260, TZ - 220, BW, 120, 120).color('#2b2f33'));
add("air-manifold", rodX(Y1 + 260, TZ - 300, -BW / 2 - 200, BW / 2 + 200, 60, 12).color('#2f5d9a'));
for (const s of [-1, 1]) add(`knife-stand-${side(s)}`, blk(s * (BW / 2 + 200), Y1 + 260, 0, 100, 100, TZ - 300).color(frame));
const BZ = 1200, B0 = Y1 + 450, BS = Y1 + 1500, B1 = Y1 + 2800;
for (const s of [-1, 1]) add(`bunker-side-${side(s)}`, blk(s * (BW / 2 + 400), (B0 + B1) / 2, 0, 250, B1 - B0, s < 0 ? 560 : BZ).color('#a8a59c'));
add("bunker-back", blk(0, B1 - 125, 0, BW + 1050, 250, BZ).color('#a8a59c'));
add("splitter-wall", blk(0, BS, 0, BW + 550, 200, 760).color('#a8a59c'));
add("splitter-blade", box(BW + 500, 16, 500, true).rotateX(-20).translate(0, BS - 60, 990).color('#c9ccce'));
add("drop-heap", sphere(560).scale([1.15, 0.85, 1.25]).translate(0, (B0 + BS) / 2, 0).subtract(blk(0, (B0 + BS) / 2, -800, 1600, 1400, 800)).color('#8a7f6a'));
add("eject-heap", sphere(560).scale([1.15, 1.0, 1.35]).translate(0, (BS + B1) / 2 - 100, 0).subtract(blk(0, (BS + B1) / 2, -800, 1600, 1600, 800)).color('#5aa0c8'));
add("eject-sign", blk(BW / 2 + 400, (BS + B1) / 2, BZ, 260, 300, 160).color('#2f9a4f'));

return p.model();
