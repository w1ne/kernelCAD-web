// SPDX-License-Identifier: CC0-1.0
// Climbing nut tool: Long tapered nut-removal pick with a finger opening, grip scales and a narrow hook tip.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "nut-tool",
  license: 'CC0-1.0',
  title: "Climbing nut tool",
  description: "Long tapered nut-removal pick with a finger opening, grip scales and a narrow hook tip. Knobs: overall scale plus steel, aluminium and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "climbing nut tool", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#69747a', { label: 'Steel' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });

presets({
  stormWorn: { steel: '#525a5f', aluminium: '#8e9697', rubber: '#252c30' },
  highVisibility: { steel: '#525a5f', aluminium: '#b6c0c2' },
});
const baseZ = -2.1562050477282355;
const p = assembly("nut-tool");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("tool-shaft", b(0, 0, 0, 70, 70, 470, 0, -5, 0).color(aluminium));
p.part("hook-tip", b(0, 0, 435, 210, 55, 34, 0, 16, 0).color(steel));
p.part("finger-loop", ring(0, 0, 560, 32, 76, 20, 10, "y").color(steel));
p.part("grip-scale-0", b(-38, -42, 90, 40, 20, 220, 0, 0, 0).color(rubber));
p.part("grip-scale-1", b(38, -42, 90, 40, 20, 220, 0, 0, 0).color(rubber));

return p.model();
