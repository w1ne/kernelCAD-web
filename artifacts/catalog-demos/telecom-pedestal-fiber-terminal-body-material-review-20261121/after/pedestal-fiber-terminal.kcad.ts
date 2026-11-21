// SPDX-License-Identifier: CC0-1.0
// Pedestal fiber terminal: a slim above-ground fiber access pedestal on a concrete pad. One painted
// steel body is bolted to the pad through a base flange with stainless anchor bolts; a removable
// painted cover with a gable roof slides down over the top of the body. The front service door sits in
// a dark gasket seam on stainless hinges and closes with a penta-head lock, louvre vents on both sides
// let the splice space breathe, and two HDPE ducts rise through the pad into the body.

meta({
  name: "pedestal-fiber-terminal",
  license: 'CC0-1.0',
  title: "Pedestal fiber terminal",
  description: "Slim fiber access pedestal on a concrete pad: one powder-coated steel body on a bolted base flange with stainless anchor bolts, a removable powder-coated gable cover that slides over the body top, a front service door in a polymer gasket seam with stainless hinges and a penta-head lock, polymer louvre vents and two HDPE ducts that rise through the pad. Knobs: overall scale; powder-coated steel, concrete, stainless steel, polymer.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#4f6e57', { label: 'Body, cover, door and base flange (powder-coated steel)' });
const concrete = param('concrete', '#a9a69d', { label: 'Mounting pad (concrete)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Hinges, lock and anchor bolts (stainless steel)' });
const polymer = param('polymer', '#1d2326', { label: 'Door seal, vents and ducts (polymer)' });
presets({
  fieldSite: {
    powderCoat: '#8a8f7a',
    concrete: '#9b968a',
    stainlessSteel: '#c8d0cf',
    polymer: '#2b2f2c',
  },
  highVisibility: {
    powderCoat: '#e0aa18',
    concrete: '#b8b5ad',
    stainlessSteel: '#e4e9e6',
    polymer: '#1b1f22',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).translate(x, y, z).scale(scale);
// Cylinder with its axis along Y, from y0 toward the viewer (-Y) over h.
const cY = (x: number, y0: number, z: number, h: number, r: number) => cylinder(h, r, 12).rotateX(90).translate(x, y0, z).scale(scale);
const profile = (pts: Array<[number, number]>) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [u, v] of pts.slice(1)) pb = pb.lineTo(u, v);
  return pb.close();
};

const PAD = 80;           // concrete pad top
const FLANGE = 20;        // base flange thickness
const W = 300;            // body width (x)
const D = 240;            // body depth (y)
const BODY0 = PAD + FLANGE;
const BODY1 = 740;        // body top, hidden under the cover
const FRONT = -D / 2;     // body front face (y)
const COVER_W = W + 16;   // cover skirt fits over the body
const COVER_D = D + 16;
const SKIRT0 = 690;
const SKIRT1 = 800;
// Gable roof seen from the side (x, z), extruded front to back.
const roof = profile([[-COVER_W / 2, 0], [COVER_W / 2, 0], [COVER_W / 2, 8], [0, 50], [-COVER_W / 2, 8]])
  .extrude(COVER_D).rotateX(90).translate(0, COVER_D / 2, SKIRT1).scale(scale);

const DOOR_W = 220;
const DOOR0 = 180;
const DOOR_H = 460;
const SEAL = 1;           // gasket seam stands 1 mm proud of the body
const DOOR_T = 4;

const p = assembly("pedestal-fiber-terminal");
p.part("pad", b(0, 0, 0, 520, 440, PAD).color(concrete));
for (const [i, x] of [-100, 100].entries()) p.part(`duct-${i}`, c(x, 0, 0, 260, 25, 16).color(polymer));
p.part("base-flange", b(0, 0, PAD, W + 60, D + 60, FLANGE).color(powderCoat));
for (const [i, [x, y]] of ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as Array<[number, number]>).entries()) {
  p.part(`anchor-bolt-${i}`, c(x * (W / 2 + 15), y * (D / 2 + 15), BODY0, 14, 8).color(stainlessSteel));
}
p.part("body", b(0, 0, BODY0, W, D, BODY1 - BODY0).color(powderCoat));
p.part("cover-skirt", b(0, 0, SKIRT0, COVER_W, COVER_D, SKIRT1 - SKIRT0).color(powderCoat));
p.part("cover-roof", roof.color(powderCoat));
p.part("door-seal", b(0, FRONT - SEAL / 2, DOOR0 - 6, DOOR_W + 12, SEAL, DOOR_H + 12).color(polymer));
p.part("door", b(0, FRONT - SEAL - DOOR_T / 2, DOOR0, DOOR_W, DOOR_T, DOOR_H).color(powderCoat));
for (const [i, z] of [DOOR0 + 40, DOOR0 + DOOR_H - 90].entries()) {
  p.part(`hinge-${i}`, c(-DOOR_W / 2 - 3, FRONT - SEAL - 5, z, 50, 5).color(stainlessSteel));
}
p.part("lock", cY(DOOR_W / 2 - 30, FRONT - SEAL - DOOR_T, DOOR0 + DOOR_H / 2, 8, 11).color(stainlessSteel));
for (const [side, sx] of [['left', -1], ['right', 1]] as Array<[string, number]>) {
  for (let s = 0; s < 4; s++) p.part(`vent-${side}-${s}`, b(sx * (W / 2 + 0.5), 0, 590 + s * 22, 1, 150, 9).color(polymer));
}

return p.model();
