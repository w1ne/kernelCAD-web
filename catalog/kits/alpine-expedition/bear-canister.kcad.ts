// SPDX-License-Identifier: CC0-1.0
// Bear-resistant food canister: Wide screw-top food canister with a ribbed body, locking lid and side hand grips.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "bear-canister",
  license: 'CC0-1.0',
  title: "Bear-resistant food canister",
  description: "Wide screw-top food canister with a ribbed body, locking lid and side hand grips. Knobs: overall scale plus polymer, stainlessSteel and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "bear-resistant food canister", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#53676b', { label: 'Engineering polymer' });
const stainlessSteel = param('stainlessSteel', '#c0c7c7', { label: 'Stainless steel' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });

presets({
  stormWorn: { polymer: '#415053', stainlessSteel: '#969b9b', rubber: '#252c30' },
  highVisibility: { polymer: '#e79135', stainlessSteel: '#c0c7c7' },
});
const baseZ = 0;
const p = assembly("bear-canister");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("canister-body", c(0, 0, 0, 380, 190, 12).color(polymer));
p.part("locking-lid", c(0, 0, 370, 80, 205, 12).color(polymer));
p.part("rib-0", b(0, 0, 65, 396, 28, 22, 0, 0, 0).color(stainlessSteel));
p.part("rib-1", b(0, 0, 135, 396, 28, 22, 0, 0, 0).color(stainlessSteel));
p.part("rib-2", b(0, 0, 205, 396, 28, 22, 0, 0, 0).color(stainlessSteel));
p.part("rib-3", b(0, 0, 275, 396, 28, 22, 0, 0, 0).color(stainlessSteel));
p.part("hand-grip-0", b(-180, 0, 205, 55, 80, 76, 0, 0, 0).color(rubber));
p.part("hand-grip-1", b(180, 0, 205, 55, 80, 76, 0, 0, 0).color(rubber));
p.part("lid-tab", b(0, -190, 410, 82, 32, 38, 0, 0, 0).color(stainlessSteel));

return p.model();
