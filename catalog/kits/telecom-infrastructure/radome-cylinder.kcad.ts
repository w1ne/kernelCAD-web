// SPDX-License-Identifier: CC0-1.0
// Cylindrical antenna radome: a white fibreglass tube with a domed top that covers a
// vertical antenna. The radome must pass radio waves, so it is polymer, not steel. A
// stainless clamp band holds its base on a galvanized flange, on a narrow pipe foot and
// bolted base plate, with a black coax gland and drop at the foot.

meta({
  name: "radome-cylinder",
  license: 'CC0-1.0',
  title: "Cylindrical antenna radome",
  description: "Cylindrical antenna radome: a white fibreglass tube with a domed top over the antenna, held by a stainless clamp band on a galvanized flange, a narrow pipe foot and a bolted base plate, with a black coax gland and drop. No metal covers the radome above its base band. Material controls: fibreglass radome, galvanized steel, stainless steel, black polymer. Field-site and high-visibility presets.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const radome = param('radome', '#eeede6', { label: 'Radome (fibreglass)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Foot, flange and base plate (galvanized steel)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Clamp band (stainless steel)' });
const polymer = param('polymer', '#22292d', { label: 'Coax gland and cable (black polymer)' });
presets({
  fieldSite: {
    radome: '#d9dbd0',
    galvanizedSteel: '#8f9b9b',
    stainlessSteel: '#d0d9d6',
    polymer: '#263a37',
  },
  highVisibility: {
    radome: '#f4f4ef',
    galvanizedSteel: '#3a4b51',
    stainlessSteel: '#e4e9e6',
    polymer: '#e0aa18',
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
const ZF = ZP + 160; // top of the pipe foot
const ZR = ZF + 14; // top of the flange, bottom of the radome

const p = assembly("radome-cylinder");
p.part("base", b(0, 0, 0, 260, 260, ZP).color(galvanizedSteel));
for (const [i, [x, y]] of ([[-100, -100], [100, -100], [100, 100], [-100, 100]] as const).entries()) {
  p.part(`bolt-${i}`, c(x, y, ZP, 9, 11, 6).color(galvanizedSteel));
}
p.part("foot", c(0, 0, ZP, ZF - ZP, 50).color(galvanizedSteel));
p.part("flange", c(0, 0, ZF, ZR - ZF, 116, 16).color(galvanizedSteel));
// One fibreglass tube with a domed top: no metal over the antenna inside it.
p.part("radome", turned([
  [0, ZR], [108, ZR], [108, ZR + 960], [100, ZR + 1004], [80, ZR + 1036], [52, ZR + 1056], [0, ZR + 1064],
]).color(radome));
p.part("clamp-band", turned([[108, ZR + 4], [113, ZR + 4], [113, ZR + 36], [108, ZR + 36]]).color(stainlessSteel));
p.part("band-screw", b(0, -118, ZR + 8, 26, 12, 24).color(stainlessSteel));
// Coax exit: a side gland on the foot and a jacketed drop to the plate.
p.part("cable-gland", cylinder(30, 12, 8).rotateY(90).translate(50, 0, 120).scale(scale).color(polymer));
p.part("cable-run", cylinder(40, 7, 8).rotateY(90).translate(80, 0, 120).scale(scale).color(polymer));
p.part("cable-drop", c(120, 0, ZP, 115, 7, 8).color(polymer));

return p.model();
