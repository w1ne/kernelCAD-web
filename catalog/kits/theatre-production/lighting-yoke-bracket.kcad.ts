// SPDX-License-Identifier: CC0-1.0
// Lighting yoke bracket: a luminaire yoke set up as a floor mount, its
// crossbar bolted to a cast-iron base and a fixture trunnion ring held
// between the arms.
// What makes it a yoke rather than a U of boxes: one flat-bar U with radiused
// bends and rounded arm tips, adjustment slots and a centre bolt through the
// crossbar, pivot hubs with T-handle yoke locks on the outside of each arm,
// and a trunnion ring on short stubs that tilts on the pivot axis.
// Generic visualization geometry at about real size (0.5 m between arms,
// 0.55 m to the pivots), millimetres, Z up, crossbar face toward -Y,
// standing on z = 0.

meta({
  name: "lighting-yoke-bracket",
  license: 'CC0-1.0',
  title: "Lighting yoke bracket",
  description: "Luminaire yoke on a floor base at about real size: one flat-bar U with radiused bends and rounded arm tips, adjustment slots and a centre bolt through the crossbar, cast-iron floor base with boss, pivot hubs with T-handle yoke locks, and a fixture trunnion ring on stubs tilted on the pivot axis. Material controls: yoke, floor base, trunnion ring, yoke locks. houseShow, touring and whiteBox presets.",
  tags: ['lighting yoke', 'yoke bracket', 'luminaire yoke', 'floor mount', 'theatre lighting', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const yoke = param('yoke', '#2c3136', { label: 'Yoke' });
const baseIron = param('baseIron', '#4a4f53', { label: 'Floor base' });
const ring = param('ring', '#b9c1c5', { label: 'Trunnion ring' });
const locks = param('locks', '#d23a2a', { label: 'Yoke locks' });

presets({
  houseShow: { yoke: '#2c3136', baseIron: '#4a4f53', ring: '#b9c1c5', locks: '#d23a2a' },
  touring: { yoke: '#e0a520', baseIron: '#2a2e31', ring: '#d6dbdd', locks: '#1d2022' },
  whiteBox: { yoke: '#e8e8e4', baseIron: '#9aa0a3', ring: '#3a3f43', locks: '#2f6fb0' },
});

const BOLT = '#8d969b';

const p = assembly("lighting-yoke-bracket");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// (x, z) outline extruded `t` thick and centred on y = 0.
const profileXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const PZ = 540; // pivot height
const XO = 240; // arm outer face
const XI = 190; // arm inner face
const ZB = 60; // crossbar underside
const ZT = 110; // crossbar top
const T = 14; // flat-bar thickness

const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n: number) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return pts;
};
const RC = 70; // outer bend radius
const CX = XO - RC;
const CZ = ZB + RC;
const tip = (XO - XI) / 2;
const uOutline = [
  ...arc(-CX, CZ, RC, 180, 270, 4),
  ...arc(CX, CZ, RC, 270, 360, 4),
  ...arc(XI + tip, PZ, tip, 0, 180, 6),
  ...arc(CX, CZ, CZ - ZT, 0, -90, 3),
  ...arc(-CX, CZ, CZ - ZT, 270, 180, 3),
  ...arc(-XI - tip, PZ, tip, 0, 180, 6),
];

let u = profileXZ(uOutline, T);
for (const x of [-110, 110]) u = u.subtract(box(70, 40, 16, true).translate(x, 0, (ZB + ZT) / 2));
u = u.subtract(alongY(40, 10, 12).translate(0, 20, (ZB + ZT) / 2));
add("yoke", u.color(yoke));

// Cast-iron floor base with a boss under the crossbar; centre bolt.
add("floor-base", cylinder(24, 220, 32).color(baseIron));
add("base-boss", cylinder(ZB - 24, 46, 20).translate(0, 0, 24).color(baseIron));
add("centre-bolt", alongY(12, 20, 6).translate(0, -T / 2, (ZB + ZT) / 2).color(BOLT));
add("centre-washer", alongY(3, 28, 16).translate(0, -T / 2, (ZB + ZT) / 2).color(BOLT));

// Pivot hubs and T-handle yoke locks on the outside of each arm.
for (const [s, sg] of [["left", -1], ["right", 1]] as [string, number][]) {
  const from = (x0: number, len: number) => (sg > 0 ? x0 : -x0 - len);
  add(`hub-${s}`, alongX(16, 40, 20).translate(from(XO, 16), 0, PZ).color(yoke));
  add(`lock-stem-${s}`, alongX(46, 10, 10).translate(from(XO + 16, 46), 0, PZ).color(BOLT));
  add(`lock-handle-${s}`, cylinder(130, 13, 12).translate(sg * (XO + 70), 0, PZ - 65).color(locks));
  add(`lock-tip-top-${s}`, sphere(15).translate(sg * (XO + 70), 0, PZ + 65).color(locks));
  add(`lock-tip-bottom-${s}`, sphere(15).translate(sg * (XO + 70), 0, PZ - 65).color(locks));
  add(`trunnion-stub-${s}`, alongX(24, 16, 12).translate(from(XI - 22, 24), 0, PZ).color(BOLT));
}

// Fixture trunnion ring facing -Y, tipped up on the pivot axis.
const RR = 172;
add("trunnion-ring", torus(RR, 14, 28).rotateX(90).rotateX(-20).translate(0, 0, PZ).color(ring));
for (const [s, sg] of [["left", -1], ["right", 1]] as [string, number][])
  add(`ring-lug-${s}`, box(30, 34, 50, true).translate(sg * (RR + 6), 0, PZ).color(ring));

return p.model();
