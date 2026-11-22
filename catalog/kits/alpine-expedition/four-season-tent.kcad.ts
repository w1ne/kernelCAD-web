// SPDX-License-Identifier: CC0-1.0
// Four-season mountain tent: Compact storm shelter with a low profile, reinforced fly, front entrance and corner stakes.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "four-season-tent",
  license: 'CC0-1.0',
  title: "Four-season mountain tent",
  description: "Compact storm shelter with a low profile, reinforced fly, front entrance and corner stakes. Knobs: overall scale plus nylon, polyester and aluminium material colors.",
  tags: ["alpine expedition", "mountaineering", "four-season mountain tent", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const polyester = param('polyester', '#bd7547', { label: 'Polyester fabric' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });

presets({
  stormWorn: { nylon: '#3b574d', polyester: '#935b37', aluminium: '#8e9697' },
  highVisibility: { nylon: '#e79135', polyester: '#f1c64e' },
});
const baseZ = 0.0;
const p = assembly("four-season-tent");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

const pitchedTent = () => path()
  .moveTo(-610, 0).lineTo(0, 585).lineTo(610, 0).close()
  .extrude(1530).rotateX(90).translate(0, 765, 45).scale(scale);

p.part("tent-floor", b(0, 0, 0, 1550, 1880, 45, 0, 0, 0).color(polyester));
p.part("inner-body", pitchedTent().color(nylon));
p.part("left-fly", b(-320, 0, 300, 900, 1680, 24, 0, -40, 0).color(polyester));
p.part("right-fly", b(320, 0, 300, 900, 1680, 24, 0, 40, 0).color(polyester));
p.part("door-flap", b(0, -770, 80, 380, 26, 340, 0, 0, 0).color(polyester));
p.part("pole-left", b(0, 0, 45, 18, 18, 850, 0, -40, 0).color(aluminium));
p.part("pole-right", b(0, 0, 45, 18, 18, 850, 0, 40, 0).color(aluminium));
p.part("corner-stake-0", c(-820, -930, 0, 160, 16, 8).color(aluminium));
p.part("corner-stake-1", c(820, -930, 0, 160, 16, 8).color(aluminium));
p.part("corner-stake-2", c(-820, 930, 0, 160, 16, 8).color(aluminium));
p.part("corner-stake-3", c(820, 930, 0, 160, 16, 8).color(aluminium));

return p.model();
