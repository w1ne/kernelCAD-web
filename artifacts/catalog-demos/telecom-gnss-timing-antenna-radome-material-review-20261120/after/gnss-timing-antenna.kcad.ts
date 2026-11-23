// SPDX-License-Identifier: CC0-1.0
// GNSS timing antenna: a pole-mounted bullet antenna that feeds a GPS-disciplined clock. The
// patch element sits under one white polymer radome, because the antenna needs an open view of
// the sky and any metal above it would block the satellite signal. A dark polymer base skirt and
// threaded bush carry the radome on a galvanized mast pipe; the coax drop leaves through a side
// gland. The pipe stands on a powder-coated base plate held by four galvanized bolts.

meta({
  name: "gnss-timing-antenna",
  license: 'CC0-1.0',
  title: "GNSS timing antenna",
  description: "Pole-mounted GNSS timing antenna: a white polymer radome on a dark polymer base skirt and threaded bush, with no metal above the antenna element, on a galvanized mast pipe with a side coax gland and drop, standing on a powder-coated base plate with four galvanized bolts. Knobs: overall scale; polymer radome, galvanized steel, dark polymer and cable jacket, powder-coated steel plate.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const radome = param('radome', '#eceee9', { label: 'Radome (UV-stabilised polymer)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
const polymer = param('polymer', '#22282b', { label: 'Dark polymer base and cable jacket' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel base plate' });
presets({
  fieldSite: {
    radome: '#d9dcd2',
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
    powderCoat: '#52756b',
  },
  highVisibility: {
    radome: '#f4f4f0',
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
    powderCoat: '#e0aa18',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).translate(x, y, z).scale(scale);
// Turned profile [[radius, z], ...] about the Z axis.
const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve().scale(scale);
};

const ZP = 12; // top of the base plate
const ZM = ZP + 320; // top of the mast pipe
const ZB = ZM + 26; // top of the threaded bush

const p = assembly("gnss-timing-antenna");
p.part("base", b(0, 0, 0, 180, 180, ZP).color(powderCoat));
for (const [i, [x, y]] of ([[-65, -65], [65, -65], [65, 65], [-65, 65]] as const).entries()) {
  p.part(`bolt-${i}`, c(x, y, ZP, 8, 9, 6).color(galvanizedSteel));
}
p.part("pole", c(0, 0, ZP, ZM - ZP, 24).color(galvanizedSteel));
p.part("bush", c(0, 0, ZM, ZB - ZM, 30).color(polymer));
p.part("base-skirt", turned([[0, ZB], [70, ZB], [76, ZB + 6], [76, ZB + 16], [0, ZB + 16]]).color(polymer));
// One polymer radome over the patch element: no metal above it.
p.part("radome", turned([
  [0, ZB + 16], [74, ZB + 16], [74, ZB + 46], [66, ZB + 74], [50, ZB + 92], [26, ZB + 101], [0, ZB + 103],
]).color(radome));
// Coax drop: a side gland on the pipe and a jacketed cable down to the plate.
p.part("cable-gland", cylinder(26, 11, 8).rotateY(90).translate(24, 0, 110).scale(scale).color(polymer));
p.part("cable-run", cylinder(56, 6, 8).rotateY(90).translate(50, 0, 110).scale(scale).color(polymer));
p.part("cable-drop", c(106, 0, ZP, 104, 6, 8).color(polymer));

return p.model();
