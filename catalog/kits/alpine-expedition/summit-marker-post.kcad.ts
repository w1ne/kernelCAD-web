// SPDX-License-Identifier: CC0-1.0
// Summit marker post: Trail summit marker with a broad base, upright post, direction plaque and small cap.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "summit-marker-post",
  license: 'CC0-1.0',
  title: "Summit marker post",
  description: "Trail summit marker with a broad base, upright post, direction plaque and small cap. Knobs: overall scale plus steel, aluminium and polyester material colors.",
  tags: ["alpine expedition", "mountaineering", "summit marker post", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#69747a', { label: 'Steel' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const polyester = param('polyester', '#bd7547', { label: 'Polyester fabric' });

presets({
  stormWorn: { steel: '#525a5f', aluminium: '#8e9697', polyester: '#935b37' },
  highVisibility: { polyester: '#e79135', steel: '#69747a' },
});
const baseZ = 0.0;
const p = assembly("summit-marker-post");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("base-plate", b(0, 0, 0, 440, 360, 64, 0, 0, 0).color(aluminium));
p.part("marker-post", c(0, 0, 64, 1240, 38, 8).color(steel));
p.part("direction-plaque", b(0, -35, 970, 530, 60, 220, 0, 0, 0).color(polyester));
p.part("arrow-board", b(0, -75, 1010, 230, 26, 70, 0, 0, 0).color(polyester));
p.part("post-cap", c(0, 0, 1304, 48, 48, 8).color(steel));

return p.model();
