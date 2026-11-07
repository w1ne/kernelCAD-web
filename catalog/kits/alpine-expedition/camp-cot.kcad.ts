// SPDX-License-Identifier: CC0-1.0
// Backcountry camp cot: Portable sleeping cot with a fabric deck, folding end frames, feet and side rails.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "camp-cot",
  license: 'CC0-1.0',
  title: "Backcountry camp cot",
  description: "Portable sleeping cot with a fabric deck, folding end frames, feet and side rails. Knobs: overall scale plus polyester and aluminium material colors.",
  tags: ["alpine expedition", "mountaineering", "backcountry camp cot", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polyester = param('polyester', '#bd7547', { label: 'Polyester fabric' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });

presets({
  stormWorn: { polyester: '#935b37', aluminium: '#8e9697' },
  highVisibility: { polyester: '#e79135', aluminium: '#b6c0c2' },
});
const baseZ = 0.3705292542263692;
const p = assembly("camp-cot");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale);

p.part("cot-deck", b(0, 0, 310, 720, 1980, 48, 0, 0, 0).color(polyester));
p.part("left-side-rail", hx(0, -325, 285, 2060, 22, 8).color(aluminium));
p.part("right-side-rail", hx(0, 325, 285, 2060, 22, 8).color(aluminium));
p.part("leg-0", b(-810, -300, 0, 35, 35, 310, 0, -14, 0).color(polyester));
p.part("leg-1", b(-810, 300, 0, 35, 35, 310, 0, 14, 0).color(polyester));
p.part("leg-2", b(810, -300, 0, 35, 35, 310, 0, 14, 0).color(polyester));
p.part("leg-3", b(810, 300, 0, 35, 35, 310, 0, -14, 0).color(polyester));
p.part("end-crossbar-0", hy(-810, 0, 275, 710, 16, 8).color(aluminium));
p.part("end-crossbar-1", hy(810, 0, 275, 710, 16, 8).color(aluminium));

return p.model();
