// SPDX-License-Identifier: CC0-1.0
// Alpine pack cover: Draped rain cover for a tall expedition pack with a rolled hem and side tension straps.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "alpine-pack-cover",
  license: 'CC0-1.0',
  title: "Alpine pack cover",
  description: "Draped rain cover for a tall expedition pack with a rolled hem and side tension straps. Knobs: overall scale plus nylon, polyester and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "alpine pack cover", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const polyester = param('polyester', '#bd7547', { label: 'Polyester fabric' });
const webbing = param('webbing', '#d7a43e', { label: 'Polyamide webbing' });

presets({
  stormWorn: { nylon: '#3b574d', polyester: '#935b37', webbing: '#a88030' },
  highVisibility: { nylon: '#e79135', polyester: '#f1c64e' },
});
const baseZ = 30.0;
const p = assembly("alpine-pack-cover");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("cover-dome", b(0, 0, 30, 650, 450, 780, 0, 0, 0).color(nylon));
p.part("front-apron", b(0, -238, 70, 625, 28, 570, -8, 0, 0).color(polyester));
p.part("side-strap-0", b(-325, 0, 180, 26, 500, 40, 0, 0, 0).color(webbing));
p.part("side-strap-1", b(325, 0, 180, 26, 500, 40, 0, 0, 0).color(webbing));
p.part("hem-band", b(0, 0, 40, 690, 490, 36, 0, 0, 0).color(webbing));
p.part("cord-lock", c(0, -270, 72, 54, 28, 8).color(webbing));

return p.model();
