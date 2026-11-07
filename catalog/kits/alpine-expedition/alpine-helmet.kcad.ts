// SPDX-License-Identifier: CC0-1.0
// Alpine climbing helmet: Faceted climbing helmet with a rounded dome, short visor, padded rim and visible chin straps.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "alpine-helmet",
  license: 'CC0-1.0',
  title: "Alpine climbing helmet",
  description: "Faceted climbing helmet with a rounded dome, short visor, padded rim and visible chin straps. Knobs: overall scale plus polycarbonate, foam and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "alpine climbing helmet", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polycarbonate = param('polycarbonate', '#d47b3e', { label: 'Polycarbonate' });
const foam = param('foam', '#d1c1a3', { label: 'Foam' });
const webbing = param('webbing', '#d7a43e', { label: 'Polyamide webbing' });

presets({
  stormWorn: { polycarbonate: '#a56030', foam: '#a3977f', webbing: '#a88030' },
  highVisibility: { webbing: '#f1c64e' },
});
const baseZ = 0.0;
const p = assembly("alpine-helmet");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};

const helmetShell = () => path()
  .moveTo(0, 0).lineTo(148, 0).lineTo(174, 18).lineTo(166, 48)
  .lineTo(145, 82).lineTo(112, 119).lineTo(72, 148)
  .lineTo(34, 165).lineTo(0, 170).close()
  .revolve().translate(0, 0, 60).scale(scale);
const helmetLiner = () => cylinder(18, 132, 12)
  .subtract(cylinder(20, 116, 12).translate(0, 0, -1)).translate(0, 0, 40).scale(scale);
const helmetStrap = (side: number) => {
  const points: [number, number][] = [[side * 112, 66], [side * 96, 62], [side * 18, 0], [side * 4, 6]];
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(14).rotateX(90).translate(0, -133, 0).scale(scale);
}

p.part("helmet-shell", helmetShell().color(polycarbonate));
p.part("helmet-liner", helmetLiner().color(foam));
p.part("ear-pad-left", b(-124, -35, 30, 38, 65, 32, 0, 0, 0).color(polycarbonate));
p.part("ear-pad-right", b(124, -35, 30, 38, 65, 32, 0, 0, 0).color(polycarbonate));
p.part("front-brim", b(0, -145, 58, 160, 34, 10, 0, 0, 0).color(polycarbonate));
p.part("chin-strap-0", helmetStrap(-1).color(webbing));
p.part("chin-strap-1", helmetStrap(1).color(webbing));
p.part("chin-buckle", b(0, -110, 22, 34, 14, 12, 0, 0, 0).color(polycarbonate));

return p.model();
