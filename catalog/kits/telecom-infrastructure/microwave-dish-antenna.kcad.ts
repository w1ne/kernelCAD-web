// SPDX-License-Identifier: CC0-1.0
// Microwave dish antenna: Compact parabolic-looking dish on an offset bracket with feed arm and rear mount with clearly separated telecom materials and visible component cues.

meta({
  name: "microwave-dish-antenna",
  license: 'CC0-1.0',
  title: "Microwave dish antenna",
  description: "Compact parabolic-looking dish on an offset bracket with feed arm and rear mount. Knobs: overall scale; aluminum reflector, galvanized steel, powder-coated steel.",
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
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
presets({
  fieldSite: {
    aluminum: '#aeb9b9',
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
  },
  highVisibility: {
    aluminum: '#d4dada',
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

const p = assembly("microwave-dish-antenna");
p.part("feed-arm", b(0, -270, 445, 55, 430, 55).color(galvanizedSteel));
p.part("feed", c(0, -475, 415, 130, 72, 8).color(galvanizedSteel));
p.part("mount-post", b(0, 120, 45, 80, 100, 500).color(galvanizedSteel));
p.part("base", b(0, 120, 0, 320, 280, 70).color(powderCoat));


p.part('reflector', ngon(360, 16).loft([ngon(324, 16)], { spacing: 22, ruled: true })
  .rotateX(90).translate(0, -20, 830).scale(scale).color(aluminum));

return p.model();
