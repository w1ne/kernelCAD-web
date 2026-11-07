// SPDX-License-Identifier: CC0-1.0
// Archaeologist trowel: Short-handled pointed excavation trowel with a broad blade and raised ferrule. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, stainless steel.

meta({
  name: "archaeologist-trowel",
  license: 'CC0-1.0',
  title: "Archaeologist trowel",
  description: "Short-handled pointed excavation trowel with a broad blade and raised ferrule. Material controls: timber, stainless steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "archaeologist trowel", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
presets({
  fieldReady: { timber: '#a27850', stainlessSteel: '#c7cdcf' },
  weathered: { timber: '#705a45', stainlessSteel: '#7a8588' },
});
const baseZ = -10;
const p = assembly("archaeologist-trowel");
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("handle", hx(-190, 0, 28, 170, 28, 8).color(timber));
p.part("handle-cap", hx(-275, 0, 28, 28, 30, 8).color(timber));
p.part("ferrule", hx(-82, 0, 28, 70, 38, 8).color(stainlessSteel));
p.part("blade", path().moveTo(-58, -26).lineTo(-30, -76).lineTo(125, -76).lineTo(274, 0).lineTo(125, 76).lineTo(-30, 76).lineTo(-58, 26).close().extrude(18).translate(0, 0, 3).scale(scale).color(stainlessSteel));

return p.model();
