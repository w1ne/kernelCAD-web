// SPDX-License-Identifier: CC0-1.0
// Curtain track carrier: the four-wheel trolley that runs inside a traveller
// track and carries a curtain, shown in use on a short track section hung
// from a batten, with one more carrier waiting at the open end.
// What makes it a track carrier rather than a box on wheels: two pairs of
// nylon wheels either side of a centre plate that ride the track's inturned
// lips, a stem down through the slot to a swivel eye and a hook, and the
// pleated drape hanging from the hooks.
// Generic visualization geometry at about real size (1.2 m track section,
// 1.4 m to the batten), millimetres, Z up, drape face toward -Y, the drape
// hem standing on z = 0.

meta({
  name: "curtain-track-carrier",
  license: 'CC0-1.0',
  title: "Curtain track carrier",
  description: "Traveller-track carriers at about real size, shown on a 1.2 m track section hung from a batten: four nylon wheels either side of a centre plate, stem through the track slot, swivel eye and hook, a pleated drape with header webbing hanging from six carriers, a spare carrier at the open track end, hanger clamps and a rubber end stop. Material controls: track, carrier wheels, hooks and clamps, drape. houseShow, touring and blackMasking presets.",
  tags: ['curtain track', 'track carrier', 'traveller track', 'curtain runner', 'drape', 'theatre rigging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const track = param('track', '#26292c', { label: 'Track and batten' });
const carrier = param('carrier', '#eceae2', { label: 'Carrier wheels and plate' });
const hardware = param('hardware', '#a8b0b4', { label: 'Hooks, eyes and clamps' });
const drape = param('drape', '#8e1f26', { label: 'Drape' });

presets({
  houseShow: { track: '#26292c', carrier: '#eceae2', hardware: '#a8b0b4', drape: '#8e1f26' },
  touring: { track: '#b9c0c3', carrier: '#2b2f32', hardware: '#e0b13c', drape: '#1d3f6e' },
  blackMasking: { track: '#1b1d1f', carrier: '#d8d6cf', hardware: '#6c757a', drape: '#232427' },
});

const RUBBER = '#141516';
const WEBBING = '#e9e3d2';

const p = assembly("curtain-track-carrier");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 10) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const L = 1200; // track section
const ZT = 1180; // track underside
const ZP = ZT + 230; // batten centre

// Box track with inturned lips and a slot along the underside.
const channel = [[-25, 55], [25, 55], [25, 0], [7, 0], [7, 5], [21, 5], [21, 51], [-21, 51], [-21, 5], [-7, 5], [-7, 0], [-25, 0]];
add("track", profileYZ(channel, L).translate(0, 0, ZT).color(track));
add("batten", alongX(L + 240, 24).translate(-L / 2 - 120, 0, ZP).color(track));
for (const [s, x] of [["left", -380], ["right", 380]] as [string, number][]) {
  add(`hanger-strap-${s}`, box(36, 10, ZP - ZT - 55, true).translate(x, 0, (ZP + ZT + 55) / 2).color(hardware));
  add(`hanger-clamp-${s}`, alongX(44, 34, 12).translate(x - 22, 0, ZP).color(hardware));
  add(`hanger-bolt-${s}`, alongY(70, 7, 8).translate(x, 35, ZP + 40).color(hardware));
}
add("end-stop", box(36, 56, 62, true).translate(L / 2 + 18, 0, ZT + 28).color(hardware));
add("end-bumper", box(16, 40, 40, true).translate(L / 2 - 8, 0, ZT + 28).color(RUBBER));

// Carrier: centre plate, two wheels each side, stem, swivel eye, hook.
const carrierAt = (id: string, x: number) => {
  add(`plate-${id}`, box(58, 8, 34, true).translate(x, 0, ZT + 22).color(carrier));
  for (const dx of [-20, 20]) {
    const k = dx < 0 ? 'a' : 'b';
    add(`wheel-${id}-${k}-back`, alongY(12, 14).translate(x + dx, 20, ZT + 19).color(carrier));
    add(`wheel-${id}-${k}-front`, alongY(12, 14).translate(x + dx, -8, ZT + 19).color(carrier));
  }
  add(`stem-${id}`, cylinder(50, 5, 10).translate(x, 0, ZT - 35).color(hardware));
  add(`eye-${id}`, torus(13, 4, 10).rotateX(90).translate(x, 0, ZT - 48).color(hardware));
  add(`hook-${id}`, torus(14, 3.5, 10).rotateY(90).translate(x, 0, ZT - 72).color(hardware));
};

// Pleated drape: a zigzag fabric outline extruded down to the hem.
const N = 22;
const X0 = -L / 2 + 60;
const STEP = (L - 120) / N;
const zig = (dy: number) => {
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push([X0 + i * STEP, (i % 2 === 0 ? -30 : 30) + dy]);
  return pts;
};
const sheet = (front: number, back: number) => [...zig(front), ...zig(back).reverse()];
const HEM = ZT - 90; // top of the drape
add("drape", extrudePolygon(sheet(0, 6), HEM).color(drape));
add("header-webbing", extrudePolygon(sheet(-2, 8), 70).translate(0, 0, HEM - 70).color(WEBBING));

for (let c = 0; c < 6; c++) carrierAt(`${c + 1}`, X0 + (4 * c + 1.5) * STEP);
carrierAt("spare", -L / 2 - 90);

return p.model();
