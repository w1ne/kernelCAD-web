// SPDX-License-Identifier: CC0-1.0
// Hand soil auger: Manual soil auger with a T-handle, straight shaft and open helical-look cutting blades. Low-poly field visualization geometry in millimetres, Z-up; visible zones use stainless steel, timber.

meta({
  name: "hand-auger",
  license: 'CC0-1.0',
  title: "Hand soil auger",
  description: "Manual soil auger with a T-handle, straight shaft and open helical-look cutting blades. Material controls: stainless steel, timber. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "hand soil auger", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
presets({
  fieldReady: { stainlessSteel: '#c7cdcf', timber: '#a27850' },
  weathered: { stainlessSteel: '#7a8588', timber: '#705a45' },
});
const baseZ = 0;
const p = assembly("hand-auger");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("shaft", c(0, 0, 0, 740, 20, 8).color(stainlessSteel));
p.part("t-handle", hx(0, 0, 720, 230, 24, 8).color(timber));
p.part("cutting-flight-0", b(0, 0, 100, 138, 92, 16, 0, 0, 0).color(stainlessSteel));
p.part("cutting-flight-1", b(0, 0, 180, 138, 92, 16, 0, 0, 22).color(stainlessSteel));
p.part("cutting-flight-2", b(0, 0, 260, 138, 92, 16, 0, 0, 44).color(stainlessSteel));
p.part("cutting-flight-3", b(0, 0, 340, 138, 92, 16, 0, 0, 66).color(stainlessSteel));
p.part("cutting-tip", c(0, 0, 0, 120, 28, 8).color(stainlessSteel));

return p.model();
