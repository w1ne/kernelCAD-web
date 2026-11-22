// SPDX-License-Identifier: CC0-1.0
// Nutrient reservoir tank: the mixed-solution tank at the heart of a
// recirculating hydroponic system, where returning solution is topped up,
// dosed and pumped back out to the crop.
// What makes it a nutrient reservoir: a rotomoulded rectangular poly tank
// with moulded stiffening ribs and rounded corners on a timber pallet, a
// big screw-top manway lid plus a dosing hatch, a level sight tube with
// graduation marks up the front corner, a ball-valve drain at the bottom,
// a submersible pump outlet with a check valve rising out of the lid to the
// supply header, a return pipe dropping in, a float switch cable and an
// EC/pH probe lead hanging into the solution.
// Generic visualization geometry at about real size (1.35 m long, 1.0 m
// deep, 1.45 m high), millimetres, Z up, sight tube and drain facing -Y.

meta({
  name: "nutrient-reservoir-tank",
  license: 'CC0-1.0',
  title: "Nutrient reservoir tank",
  description: "Recirculating nutrient reservoir at about real size: ribbed rotomoulded poly tank with rounded corners on a timber pallet, screw-top manway and dosing hatch, graduated level sight tube, ball-valve drain, submersible pump outlet with check valve to a supply header, return pipe, float switch and EC/pH probe leads. Material controls: tank shell, lids, plumbing and pallet. lightproofBlack, greenhouseBlue, foodGradeWhite and weathered presets.",
  tags: ['nutrient reservoir', 'nutrient tank', 'solution tank', 'recirculating', 'poly tank', 'sight tube', 'hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shell = param('shell', '#26292b', { label: 'Tank shell (rotomoulded polyethylene)' });
const lid = param('lid', '#2f6fa8', { label: 'Manway and hatch lids' });
const plumbing = param('plumbing', '#8a9399', { label: 'Pump and return plumbing (PVC)' });
const pallet = param('pallet', '#b48a58', { label: 'Pallet (timber)' });

presets({
  lightproofBlack: { shell: '#26292b', lid: '#2f6fa8', plumbing: '#8a9399', pallet: '#b48a58' },
  greenhouseBlue: { shell: '#2b5f8f', lid: '#1d2023', plumbing: '#e6e7e1', pallet: '#b48a58' },
  foodGradeWhite: { shell: '#e9e8e1', lid: '#3b8a3b', plumbing: '#5d6366', pallet: '#c9a978' },
  weathered: { shell: '#45494a', lid: '#4f6a80', plumbing: '#a29f93', pallet: '#857a66' },
});

const p = assembly("nutrient-reservoir-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(-90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
// Rounded-corner plan outline, extruded up Z.
const rounded = (w: number, d: number, r: number, n = 3) => {
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= n; k++) {
      const a = ((a0 + (90 * k) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};

const TW = 1250, TD = 900, ZP = 140, TH = 1050; // tank plan, pallet height, tank height
const ZT = ZP + TH;

// Timber pallet: deck boards on three stringers.
for (const y of [-380, 0, 380]) add(`stringer-${y}`, blk(0, y, 0, 1300, 100, 100).color(pallet));
for (let i = 0; i < 7; i++) add(`deck-board-${i}`, blk(-560 + i * 186.7, 0, 100, 140, 1000, 22).color(pallet));
add("pallet-gap-shadow", blk(0, 0, 18, 1200, 900, 4).color('#3a3226'));

// Tank body with moulded ribs and a domed shoulder.
add("tank-body", extrudePolygon(rounded(TW, TD, 140), TH - 60).translate(0, 0, ZP).color(shell));
add("tank-shoulder", extrudePolygon(rounded(TW - 60, TD - 60, 120), 60).translate(0, 0, ZT - 60).color(shell));
for (const z of [ZP + 260, ZP + 560, ZP + 860]) add(`rib-${z}`, extrudePolygon(rounded(TW + 30, TD + 30, 150), 50).translate(0, 0, z).color(shell));
for (const x of [-300, 300]) add(`rib-vertical-${x}`, blk(x, -TD / 2 - 12, ZP + 40, 70, 30, TH - 160).color(shell));

// Screw-top manway and a smaller dosing hatch.
add("manway-neck", cylZ(-220, 40, ZT, 50, 260, 24).color(shell));
add("manway-lid", cylZ(-220, 40, ZT + 50, 50, 290, 24).color(lid));
for (let i = 0; i < 12; i++) {
  const a = (i * 2 * Math.PI) / 12;
  add(`lid-grip-${i}`, blk(-220 + 292 * Math.cos(a), 40 + 292 * Math.sin(a), ZT + 55, 24, 24, 40).rotateZ(0).color(lid));
}
add("dosing-hatch", blk(330, -240, ZT, 280, 220, 40).color(lid));
add("dosing-hatch-hinge", cylX(190, -130, ZT + 40, 280, 12, 8).color('#5d6366'));

// Level sight tube with graduation marks on the front-left corner.
const SX = -TW / 2 + 150, SY = -TD / 2 - 60;
add("sight-tube", cylZ(SX, SY, ZP + 60, TH - 160, 16).color('#cfe6ee'));
add("sight-level", cylZ(SX, SY, ZP + 60, TH * 0.62, 18).color('#5fa86a'));
for (const z of [ZP + 60, ZT - 100]) add(`sight-bracket-${z}`, blk(SX, SY + 30, z - 20, 50, 60, 40).color(plumbing));
for (let i = 0; i < 9; i++) add(`graduation-${i}`, blk(SX + 50, -TD / 2 - 6, ZP + 120 + i * 100, i % 2 === 0 ? 90 : 50, 8, 14).color('#f2f2ec'));

// Ball-valve drain at the bottom front.
add("drain-spigot", cylY(250, -TD / 2 - 160, ZP + 90, 160, 34).color(plumbing));
add("drain-valve", blk(250, -TD / 2 - 140, ZP + 50, 110, 90, 80).color(plumbing));
add("drain-handle", blk(250, -TD / 2 - 140, ZP + 130, 30, 170, 18).translate(0, -40, 0).color('#c0392b'));

// Pump outlet with check valve up to the supply header, return pipe dropping in.
add("pump-outlet", cylZ(250, 160, ZT, 380, 30).color(plumbing));
add("check-valve", cylZ(250, 160, ZT + 160, 110, 50).color('#1d2023'));
add("supply-elbow", cylX(250, 160, ZT + 380, 500, 30).color(plumbing));
add("supply-union", cylX(520, 160, ZT + 380, 60, 44).color('#c9a640'));
add("return-pipe", cylZ(-TW / 2 + 160, 300, ZT, 520, 40).color(plumbing));
add("return-bend", cylX(-TW / 2 - 250, 300, ZT + 520, 410, 40).color(plumbing));

// Float switch and EC/pH probe leads with their junction box.
add("cable-gland-plate", blk(60, -230, ZT, 120, 120, 20).color('#5d6366'));
add("float-cable", cylinder(380, 6, 6).rotateY(-28).translate(40, -230, ZT + 20).color('#1d2023'));
add("probe-cable", cylinder(420, 6, 6).rotateY(-18).translate(80, -230, ZT + 20).color('#c0392b'));
add("junction-box", blk(-80, -TD / 2 - 20, ZT + 300, 200, 80, 240).color('#e6e7e1'));
add("junction-post", blk(-80, -TD / 2 + 30, ZT, 40, 40, 560).color('#5d6366'));
add("junction-lamp", cylY(-120, -TD / 2 - 64, ZT + 460, 8, 22).color('#5fa86a'));
add("junction-lamp-2", cylY(-40, -TD / 2 - 64, ZT + 460, 8, 22).color('#c0392b'));

return p.model();
