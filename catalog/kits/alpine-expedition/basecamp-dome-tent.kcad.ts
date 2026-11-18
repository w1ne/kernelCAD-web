// SPDX-License-Identifier: CC0-1.0
// Basecamp dome tent: Spacious expedition dome with a raised groundsheet, faceted arched shell, vestibule and crossed support poles.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "basecamp-dome-tent",
  license: 'CC0-1.0',
  title: "Basecamp dome tent",
  description: "Spacious expedition dome with a raised groundsheet, faceted arched shell, vestibule and crossed support poles. Knobs: overall scale plus nylon, polyester and aluminium material colors.",
  tags: ["alpine expedition", "mountaineering", "basecamp dome tent", "low poly", "scene prop", "CC0"],
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
const p = assembly("basecamp-dome-tent");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};

const octagon = (rx: number, ry: number) => path()
  .moveTo(-rx * 0.72, -ry).lineTo(rx * 0.72, -ry)
  .lineTo(rx, -ry * 0.72).lineTo(rx, ry * 0.72)
  .lineTo(rx * 0.72, ry).lineTo(-rx * 0.72, ry)
  .lineTo(-rx, ry * 0.72).lineTo(-rx, -ry * 0.72).close();
const domeTent = () => {
  const sections = [[560, 700], [560, 700], [500, 620], [390, 500], [250, 340], [110, 165], [10, 15]];
  const heights = [50, 130, 360, 620, 920, 1120, 1180];
  const profiles = sections.map(([x, y]) => octagon(x, y));
  return profiles[0].loft(profiles.slice(1), {
    planes: heights.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  }).scale(scale);
};

p.part("groundsheet", b(0, 0, 0, 1600, 1900, 50, 0, 0, 0).color(polyester));
p.part("inner-tent", domeTent().color(nylon));
p.part("vestibule", b(0, -1010, 66, 760, 500, 20, 0, -10, 0).color(polyester));
const tentArch = (y: number) => {
  const points: [number, number][] = [[-520, 60], [-470, 390], [-340, 760], [0, 1220], [340, 760], [470, 390], [520, 60], [485, 60], [440, 380], [315, 735], [0, 1180], [-315, 735], [-440, 380], [-485, 60]];
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(24).rotateX(90).translate(0, y - 12, 0).scale(scale);
};
p.part("crossed-pole-left", tentArch(-320).color(aluminium));
p.part("crossed-pole-right", tentArch(320).color(aluminium));

return p.model();
