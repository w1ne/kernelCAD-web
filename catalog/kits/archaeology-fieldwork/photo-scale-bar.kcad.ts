// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "photo-scale-bar",
  license: 'CC0-1.0',
  title: "Photo scale bar",
  description: "Segmented rectangular scale bar with raised end stops for site photography. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "photo scale bar", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c4b07a", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("photo-scale-bar");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("bar-body", b(0, 0, 0, 420, 52, 18, 0, 0, 0));
p.part("marker-0", b(-180, 0, 18, 28, 52, 12, 0, 0, 0));
p.part("marker-1", b(-120, 0, 18, 28, 52, 12, 0, 0, 0));
p.part("marker-2", b(-60, 0, 18, 28, 52, 12, 0, 0, 0));
p.part("marker-3", b(0, 0, 18, 28, 52, 12, 0, 0, 0));
p.part("marker-4", b(60, 0, 18, 28, 52, 12, 0, 0, 0));
p.part("marker-5", b(120, 0, 18, 28, 52, 12, 0, 0, 0));
p.part("marker-6", b(180, 0, 18, 28, 52, 12, 0, 0, 0));
p.part("end-stop-0", b(-210, 0, 12, 18, 74, 24, 0, 0, 0));
p.part("end-stop-1", b(210, 0, 12, 18, 74, 24, 0, 0, 0));

return p.model();
