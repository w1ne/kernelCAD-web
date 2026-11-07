// SPDX-License-Identifier: CC0-1.0
// Avalanche probe: Collapsible avalanche probe with joined tube segments, a grip cap and tapered tip.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "avalanche-probe",
  license: 'CC0-1.0',
  title: "Avalanche probe",
  description: "Collapsible avalanche probe with joined tube segments, a grip cap and tapered tip. Knobs: overall scale plus aluminium, steel and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "avalanche probe", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const steel = param('steel', '#69747a', { label: 'Steel' });
const webbing = param('webbing', '#d7a43e', { label: 'Polyamide webbing' });

presets({
  stormWorn: { aluminium: '#8e9697', steel: '#525a5f', webbing: '#a88030' },
  highVisibility: { webbing: '#f1c64e', aluminium: '#b6c0c2' },
});
const baseZ = 0;
const p = assembly("avalanche-probe");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("probe-shaft", c(0, 0, 0, 1750, 20, 8).color(aluminium));
p.part("handle-cap", c(0, 0, 1730, 90, 34, 8).color(aluminium));
p.part("probe-tip", c(0, 0, 0, 150, 30, 8).color(steel));
p.part("segment-collar-0", b(0, 0, 250, 42, 42, 22, 0, 0, 0).color(aluminium));
p.part("segment-collar-1", b(0, 0, 485, 42, 42, 22, 0, 0, 0).color(aluminium));
p.part("segment-collar-2", b(0, 0, 720, 42, 42, 22, 0, 0, 0).color(aluminium));
p.part("segment-collar-3", b(0, 0, 955, 42, 42, 22, 0, 0, 0).color(aluminium));
p.part("segment-collar-4", b(0, 0, 1190, 42, 42, 22, 0, 0, 0).color(aluminium));
p.part("segment-collar-5", b(0, 0, 1425, 42, 42, 22, 0, 0, 0).color(aluminium));
p.part("depth-mark-band", b(0, 0, 960, 32, 32, 24, 0, 0, 0).color(webbing));

return p.model();
