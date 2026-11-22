// SPDX-License-Identifier: CC0-1.0
// Avalanche transceiver: Handheld avalanche beacon with a chamfered case, raised screen, three controls, speaker grille and belt clip.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "avalanche-transceiver",
  license: 'CC0-1.0',
  title: "Avalanche transceiver",
  description: "Handheld avalanche beacon with a chamfered case, raised screen, three controls, speaker grille and belt clip. Knobs: overall scale plus polymer, glass and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "avalanche transceiver", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#53676b', { label: 'Engineering polymer' });
const glass = param('glass', '#5c9eaa', { label: 'Glass' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });

presets({
  stormWorn: { polymer: '#415053', glass: '#487b85', rubber: '#252c30' },
  highVisibility: { polymer: '#e79135', glass: '#5c9eaa' },
});
const baseZ = 0.0;
const p = assembly("avalanche-transceiver");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

const beaconBody = () => path()
  .moveTo(-62, -155).lineTo(62, -155).lineTo(85, -132).lineTo(85, 132)
  .lineTo(62, 155).lineTo(-62, 155).lineTo(-85, 132).lineTo(-85, -132).close()
  .extrude(58).scale(scale);

p.part("beacon-body", beaconBody().color(polymer));
p.part("display-panel", b(0, -30, 58, 124, 104, 12, 0, 0, 0).color(glass));
p.part("screen", b(0, -30, 70, 96, 70, 3, 0, 0, 0).color(glass));
p.part("control-0", c(-52, 78, 58, 14, 14, 8).color(rubber));
p.part("control-1", c(0, 78, 58, 14, 14, 8).color(rubber));
p.part("control-2", c(52, 78, 58, 14, 14, 8).color(rubber));
p.part("belt-clip", b(0, 145, 42, 120, 30, 22, 0, 0, 0).color(polymer));
p.part("speaker-grille", b(0, 112, 58, 76, 28, 4, 0, 0, 0).color(rubber));

for (let i = 0; i < 5; i++) {
  p.part(`speaker-slot-${i}`, b(-24 + i * 12, 112, 62, 4, 18, 2, 0, 0, 0).color(rubber));
}

return p.model();
