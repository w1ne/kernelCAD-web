// SPDX-License-Identifier: CC0-1.0
// Rooftop microwave dish: Medium rooftop microwave dish with upright post, offset arm and compact feed horn with clearly separated telecom materials and visible component cues.

meta({
  name: "rooftop-microwave-dish",
  license: 'CC0-1.0',
  title: "Rooftop microwave dish",
  description: "Medium rooftop microwave dish with upright post, offset arm and compact feed horn. Knobs: overall scale; aluminum reflector, galvanized steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const aluminum = param('aluminum', '#c2cacc', { label: 'Aluminum reflector' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
presets({
  fieldSite: {
    aluminum: '#aeb9b9',
    galvanizedSteel: '#8f9b9b',
  },
  highVisibility: {
    aluminum: '#d4dada',
    galvanizedSteel: '#3a4b51',
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

const p = assembly("rooftop-microwave-dish");
p.part("arm", b(0, -240, 710, 45, 400, 45).color(galvanizedSteel));
p.part("feed-horn", c(0, -430, 690, 115, 68, 8).color(galvanizedSteel));
p.part("post", c(0, 80, 0, 720, 45, 8).color(galvanizedSteel));
p.part("foot", b(0, 80, 25, 280, 260, 50).color(galvanizedSteel));


p.part('reflector', ngon(310, 16).loft([ngon(274, 16)], { spacing: 22, ruled: true })
  .rotateX(90).translate(0, -20, 1100).scale(scale).color(aluminum));

return p.model();
