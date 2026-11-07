// SPDX-License-Identifier: CC0-1.0
// Monopole antenna mast: Freestanding tapered-looking monopole with base flange, access rung strip and top mounting plate with clearly separated telecom materials and visible component cues.

meta({
  name: "monopole-mast",
  license: 'CC0-1.0',
  title: "Monopole antenna mast",
  description: "Freestanding tapered-looking monopole with base flange, access rung strip and top mounting plate. Knobs: overall scale; galvanized steel, powder-coated steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    powderCoat: '#e0aa18',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const ngon = (r: number, s: number) => {
  let profile = path().moveTo(r, 0);
  for (let i = 1; i < s; i++) {
    const a = 2 * Math.PI * i / s;
    profile = profile.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return profile.close();
};

const p = assembly("monopole-mast");
p.part("base", c(0, 0, 0, 50, 240, 8).color(powderCoat));
p.part("access-strip", b(85, 0, 450, 18, 22, 800).color(galvanizedSteel));
p.part("top-plate", c(0, 0, 2050, 30, 130, 8).color(powderCoat));


p.part('tapered-shaft', ngon(46, 12).loft([ngon(34, 12)], {
  planes: [
    { plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, 1950] as [number, number, number] },
  ],
  ruled: true,
}).translate(0, 0, 50).scale(scale).color(galvanizedSteel));

return p.model();
