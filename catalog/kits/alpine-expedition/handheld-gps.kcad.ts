// SPDX-License-Identifier: CC0-1.0
// Handheld GPS receiver: Outdoor GPS receiver with a raised screen, directional keypad, side keys and top antenna.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "handheld-gps",
  license: 'CC0-1.0',
  title: "Handheld GPS receiver",
  description: "Outdoor GPS receiver with a raised screen, directional keypad, side keys and top antenna. Knobs: overall scale plus polymer, glass and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "handheld gps receiver", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#53676b', { label: 'Engineering polymer' });
const glass = param('glass', '#5c9eaa', { label: 'Glass' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });

presets({
  stormWorn: { polymer: '#415053', glass: '#487b85', rubber: '#252c30' },
  highVisibility: { polymer: '#e79135', glass: '#5c9eaa' },
});
const baseZ = 0.0;
const p = assembly("handheld-gps");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("receiver-body", b(0, 0, 0, 190, 115, 360, 0, 0, 0).color(polymer));
p.part("screen-bezel", b(0, -64, 170, 150, 22, 125, 0, 0, 0).color(glass));
p.part("screen", b(0, -80, 175, 112, 12, 82, 0, 0, 0).color(glass));
p.part("key-0", c(-48, -83, 55, 28, 15, 8).color(rubber));
p.part("key-1", c(0, -83, 55, 28, 15, 8).color(rubber));
p.part("key-2", c(48, -83, 55, 28, 15, 8).color(rubber));
p.part("top-antenna", c(0, 25, 345, 190, 18, 8).color(polymer));
p.part("side-key-0", b(-105, 0, 150, 25, 68, 42, 0, 0, 0).color(rubber));
p.part("side-key-1", b(105, 0, 150, 25, 68, 42, 0, 0, 0).color(rubber));

return p.model();
