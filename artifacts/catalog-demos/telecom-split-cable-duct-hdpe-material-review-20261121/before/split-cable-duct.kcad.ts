// SPDX-License-Identifier: CC0-1.0
// Split cable duct: Low split-duct cable cover with two channel shells and a bridging lid strip with clearly separated telecom materials and visible component cues.

meta({
  name: "split-cable-duct",
  license: 'CC0-1.0',
  title: "Split cable duct",
  description: "Low split-duct cable cover with two channel shells and a bridging lid strip. Knobs: overall scale; galvanized steel, powder-coated steel.",
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

const p = assembly("split-cable-duct");
p.part("base-a", b(-145, 0, 0, 260, 480, 50).color(powderCoat));
p.part("base-b", b(145, 0, 0, 260, 480, 50).color(powderCoat));
p.part("lid-a", b(-145, 0, 55, 260, 480, 45).color(powderCoat));
p.part("lid-b", b(145, 0, 55, 260, 480, 45).color(powderCoat));
p.part("center-join", b(0, 0, 55, 28, 500, 55).color(galvanizedSteel));

return p.model();
