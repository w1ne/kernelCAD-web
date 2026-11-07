// SPDX-License-Identifier: CC0-1.0
// Photo scale bar: Segmented rectangular scale bar with raised end stops for site photography. Low-poly field visualization geometry in millimetres, Z-up; visible zones use molded polymer, painted steel.

meta({
  name: "photo-scale-bar",
  license: 'CC0-1.0',
  title: "Photo scale bar",
  description: "Segmented rectangular scale bar with raised end stops for site photography. Material controls: molded polymer, painted steel. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "photo scale bar", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#d2d8ce', { label: 'Molded polymer' });
const paintedSteel = param('paintedSteel', '#607b83', { label: 'Painted steel' });
presets({
  fieldReady: { polymer: '#e6e9df', paintedSteel: '#e5a536' },
  weathered: { polymer: '#8d9890', paintedSteel: '#56686c' },
});
const baseZ = 0;
const p = assembly("photo-scale-bar");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};

p.part("bar-body", b(0, 0, 0, 420, 52, 18, 0, 0, 0).color(polymer));
p.part("marker-0", b(-180, 0, 18, 28, 52, 12, 0, 0, 0).color(paintedSteel));
p.part("marker-1", b(-120, 0, 18, 28, 52, 12, 0, 0, 0).color(paintedSteel));
p.part("marker-2", b(-60, 0, 18, 28, 52, 12, 0, 0, 0).color(paintedSteel));
p.part("marker-3", b(0, 0, 18, 28, 52, 12, 0, 0, 0).color(paintedSteel));
p.part("marker-4", b(60, 0, 18, 28, 52, 12, 0, 0, 0).color(paintedSteel));
p.part("marker-5", b(120, 0, 18, 28, 52, 12, 0, 0, 0).color(paintedSteel));
p.part("marker-6", b(180, 0, 18, 28, 52, 12, 0, 0, 0).color(paintedSteel));
p.part("end-stop-0", b(-210, 0, 12, 18, 74, 24, 0, 0, 0).color(polymer));
p.part("end-stop-1", b(210, 0, 12, 18, 74, 24, 0, 0, 0).color(polymer));

return p.model();
