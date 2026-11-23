// SPDX-License-Identifier: CC0-1.0
// Wall mast stand-off bracket: one hot-dip galvanized weldment (wall plate, two gusseted arms and end
// saddles) that holds a mast pipe off a wall with stainless U-bolts. The mast pipe in the clamps,
// the U-bolts around it and the gussets under the arms make it read as a mast bracket, not a panel.

meta({
  name: "wall-mast-bracket",
  license: 'CC0-1.0',
  title: "Wall mast stand-off bracket",
  description: "Galvanized wall stand-off bracket: a wall plate on four anchor bolts, two gusseted arms and end saddles that clamp a mast pipe with stainless U-bolts and nuts, and polymer pipe end caps. Knobs: overall scale; galvanized steel, stainless steel, polymer caps.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Bracket and mast (galvanized steel)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'U-bolts, nuts and anchors (stainless steel)' });
const polymer = param('polymer', '#22292d', { label: 'Pipe end caps (polymer)' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    stainlessSteel: '#d0d9d6',
    polymer: '#2f3a33',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    stainlessSteel: '#e4e9e6',
    polymer: '#e8c21a',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);
// Hex nut or bolt head with its axis along Y, from y0 toward the wall (+Y) over h.
const hexY = (x: number, y0: number, z: number, h: number, r: number) => cylinder(h, r, 6).rotateX(90).translate(x, y0 + h, z).scale(scale);

const T = 12;        // wall plate thickness; the wall face is y = 0, the bracket projects to -Y
const ARM = 380;     // arm length from the wall face
const S = 12;        // end saddle plate thickness
const MR = 38;       // mast pipe radius (76 mm OD)
const MY = -(ARM + S + MR); // mast axis, touching the saddle face
const ROD = 10;      // U-bolt rod diameter
const ARMS: Array<[string, number]> = [['lower', 220], ['upper', 600]];

// U-bolt seen from above, wrapped round the far side of the mast; the legs pass the saddle and end in nuts.
const uBolt = (z: number) => {
  const N = 8;
  const legEnd = -ARM + 10;
  const ro = MR + ROD, ri = MR;
  let pb = path().moveTo(ro, legEnd).lineTo(ro, MY);
  for (let i = 1; i <= N; i++) {
    const a = -(Math.PI * i) / N;
    pb = pb.lineTo(ro * Math.cos(a), MY + ro * Math.sin(a));
  }
  pb = pb.lineTo(-ro, legEnd).lineTo(-ri, legEnd).lineTo(-ri, MY);
  for (let i = N - 1; i >= 0; i--) {
    const a = -(Math.PI * i) / N;
    pb = pb.lineTo(ri * Math.cos(a), MY + ri * Math.sin(a));
  }
  return pb.lineTo(ri, legEnd).close().extrude(ROD).translate(0, 0, z - ROD / 2).scale(scale);
};
// Triangular gusset under an arm, in the YZ plane, 10 mm thick.
const gusset = (zTop: number) =>
  path().moveTo(-zTop, -T).lineTo(-(zTop - 160), -T).lineTo(-zTop, -250).close()
    .extrude(10).rotateY(90).translate(-5, 0, 0).scale(scale);

const p = assembly("wall-mast-bracket");
p.part("backplate", b(0, -T / 2, 0, 300, T, 760).color(galvanizedSteel));
let k = 0;
for (const x of [-110, 110]) {
  for (const z of [50, 710]) p.part(`anchor-bolt-${k++}`, hexY(x, -T - 10, z, 10, 14).color(stainlessSteel));
}
for (const [id, zc] of ARMS) {
  p.part(`arm-${id}`, b(0, -T - (ARM - T) / 2, zc - 30, 60, ARM - T, 60).color(galvanizedSteel));
  p.part(`gusset-${id}`, gusset(zc - 30).color(galvanizedSteel));
  p.part(`saddle-${id}`, b(0, -ARM - S / 2, zc - 60, 140, S, 120).color(galvanizedSteel));
  for (const [j, dz] of [-35, 35].entries()) {
    p.part(`u-bolt-${id}-${j}`, uBolt(zc + dz).color(stainlessSteel));
    for (const [n, x] of [-(MR + ROD / 2), MR + ROD / 2].entries()) {
      p.part(`nut-${id}-${j}-${n}`, hexY(x, -ARM, zc + dz, 9, 10).color(stainlessSteel));
    }
  }
}
p.part("mast", c(0, MY, 60, 990, MR, 12).color(galvanizedSteel));
p.part("mast-cap-top", c(0, MY, 1050, 14, MR + 3, 12).color(polymer));
p.part("mast-cap-bottom", c(0, MY, 46, 14, MR + 3, 12).color(polymer));

return p.model();
