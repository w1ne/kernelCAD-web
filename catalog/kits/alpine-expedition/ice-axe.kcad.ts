// SPDX-License-Identifier: CC0-1.0
// Mountaineering ice axe: Classic alpine axe with a long shaft, curved pick, adze and pointed lower spike.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "ice-axe",
  license: 'CC0-1.0',
  title: "Mountaineering ice axe",
  description: "Classic alpine axe with a long shaft, curved pick, adze and pointed lower spike. Knobs: overall scale plus aluminium, steel, rubber and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "mountaineering ice axe", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const steel = param('steel', '#69747a', { label: 'Steel' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });
const webbing = param('webbing', '#d7a43e', { label: 'Polyamide webbing' });

presets({
  stormWorn: { aluminium: '#8e9697', steel: '#525a5f', rubber: '#252c30', webbing: '#a88030' },
  highVisibility: { webbing: '#f1c64e', aluminium: '#b6c0c2' },
});
const baseZ = 0;
const p = assembly("ice-axe");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const xzProfile = (points: [number, number][], depth: number) => {
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(depth).rotateX(90).translate(0, -depth / 2, 0).scale(scale);
};

p.part("shaft", c(0, 0, 0, 820, 18, 8).color(aluminium));
p.part("pick", xzProfile([[-205, 785], [-170, 815], [-125, 832], [-72, 824], [-20, 804], [45, 785], [112, 774], [190, 767], [183, 742], [100, 748], [24, 763], [-40, 786], [-92, 794], [-145, 782], [-180, 755]], 34).color(steel));
p.part("pick-tip", xzProfile([[-205, 785], [-170, 815], [-160, 780], [-178, 750]], 38).color(steel));
p.part("adze", xzProfile([[42, 802], [228, 816], [266, 790], [244, 748], [76, 758]], 42).color(steel));
p.part("lower-spike", xzProfile([[-20, 190], [20, 190], [11, 40], [0, 0], [-11, 40]], 34).color(steel));
p.part("rubber-grip", c(0, 0, 10, 245, 32, 8).color(rubber));
p.part("leash-strap-side-left", b(-35, 70, 160, 12, 12, 150, 0, 0, 0).color(webbing));
p.part("leash-strap-side-right", b(35, 70, 160, 12, 12, 150, 0, 0, 0).color(webbing));
p.part("leash-strap-top", b(0, 70, 298, 82, 12, 12, 0, 0, 0).color(webbing));
p.part("leash-strap-bottom", b(0, 70, 160, 82, 12, 12, 0, 0, 0).color(webbing));

return p.model();
