// SPDX-License-Identifier: CC0-1.0
// Folding measuring rule: Three linked flat rule sections with hinge blocks at their joints. Low-poly field visualization geometry in millimetres, Z-up; visible zones use timber, brass.

meta({
  name: "folding-rule",
  license: 'CC0-1.0',
  title: "Folding measuring rule",
  description: "Three linked flat rule sections with hinge blocks at their joints. Material controls: timber, brass. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "folding measuring rule", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#8b6848', { label: 'Timber' });
const brass = param('brass', '#b18b50', { label: 'Brass' });
presets({
  fieldReady: { timber: '#a27850', brass: '#c6a364' },
  weathered: { timber: '#705a45', brass: '#846a3e' },
});
const baseZ = 0;
const p = assembly("folding-rule");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("rule-left", b(-180, 0, 0, 360, 30, 22, 0, 0, -12).color(timber));
p.part("rule-center", b(180, 38, 0, 360, 30, 22, 0, 0, 0).color(timber));
p.part("rule-right", b(540, 0, 0, 360, 30, 22, 0, 0, 12).color(timber));
p.part("hinge-0", c(0, 0, 10, 42, 18, 8).color(brass));
p.part("hinge-1", c(360, 38, 10, 42, 18, 8).color(brass));

return p.model();
