// SPDX-License-Identifier: CC0-1.0
// Front-load dumpster: the steel commercial bin a front-loader truck lifts
// over its cab with forks. What makes it a front-load bin rather than a
// skip or a wheelie bin: a steel body whose lower front is cut back at a
// slant, square fork pockets welded along both sides, two split plastic
// lids hinged at the back edge (one shown flipped open so the cavity shows),
// a reinforcing top rail, a drain plug and four swivel casters.
// Generic visualization geometry at about real size (3 yd: 1.85 m wide,
// 1.25 m deep, 1.3 m high), millimetres, Z up, front toward -Y.

meta({
  name: "front-load-dumpster-lid",
  license: 'CC0-1.0',
  title: "Front-load dumpster",
  description: "Front-load commercial dumpster at about real size: steel body with slanted lower front and reinforcing top rail, square fork pockets on both sides, two split plastic lids hinged at the back (one flipped open over the cavity), drain plug, stencilled panel and four swivel casters. Material controls: body (painted steel), lids (HDPE), fork pockets and rails, casters. municipal, weathered, cardboard and highVisibility presets.",
  tags: ["recycling", "dumpster", "front load", "commercial bin", "waste container", "containers", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f6b45', { label: 'Body (painted steel)' });
const lids = param('lids', '#24282b', { label: 'Lids (HDPE)' });
const pockets = param('pockets', '#3d4448', { label: 'Fork pockets and rails (steel)' });
const casters = param('casters', '#c9ced1', { label: 'Casters and drain (zinc/rubber)' });

presets({
  municipal: { body: '#2f6b45', lids: '#24282b', pockets: '#3d4448', casters: '#c9ced1' },
  weathered: { body: '#5d5a48', lids: '#3a3a36', pockets: '#6a4a36', casters: '#8f8a80' },
  cardboard: { body: '#2f5d9a', lids: '#2f5d9a', pockets: '#30363a', casters: '#c9ced1' },
  highVisibility: { body: '#d77632', lids: '#24282b', pockets: '#2b2e30', casters: '#e8e6dc' },
});

const p = assembly("front-load-dumpster-lid");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1850, ZB = 150, ZT = 1300, YB = 625, YF = -625, T = 6;

// Body: back vertical, lower front slanted back, top level. Hollowed from the top.
const outer = [[YB, ZB], [-380, ZB], [YF, ZB + 520], [YF, ZT], [YB, ZT]];
const inner = [[YB - T, ZB + T], [-380 + T, ZB + T], [YF + T, ZB + 520], [YF + T, ZT + 50], [YB - T, ZT + 50]];
add("body", profileYZ(outer, W).subtract(profileYZ(inner, W - 2 * T)).color(body));
add("top-rail-front", blk(0, YF - 25, ZT - 70, W + 40, 50, 70).color(pockets));
add("top-rail-back", blk(0, YB + 25, ZT - 70, W + 40, 50, 70).color(pockets));
for (const s of [-1, 1]) add(`top-rail-side-${s}`, blk(s * (W / 2 + 20), 0, ZT - 70, 40, YB - YF + 100, 70).color(pockets));
add("front-skirt", blk(0, YF - 15, ZB + 520, W - 40, 30, 60).color(pockets));

// Fork pockets: square tubes along Y on both sides, with gussets to the body.
for (const s of [-1, 1]) {
  const x = s * (W / 2 + 85);
  add(`fork-pocket-${s}`, blk(x, 20, 760, 170, 1150, 170).subtract(blk(x, 20, 790, 110, 1200, 110)).color(pockets));
  for (const y of [-350, 380]) add(`gusset-${s}-${y}`, blk(s * (W / 2 + 40), y, 640, 80, 30, 120).color(pockets));
}

// Ribs on the front and stencilled panel.
for (const x of [-560, 0, 560]) add(`front-rib-${x}`, blk(x, YF - 12, ZB + 560, 60, 24, ZT - ZB - 640).color(body));
add("stencil-panel", blk(-280, YF - 8, 900, 420, 16, 220).color('#e8e6dc'));
add("stencil-band", blk(-280, YF - 14, 960, 340, 8, 50).color(body));

// Lids: right lid closed, left lid flipped back about its hinge.
const LW = W / 2 - 20, LD = YB - YF + 40;
const lid = () => blk(0, -LD / 2, 0, LW, LD, 30).union(blk(0, -LD + 30, -60, LW, 30, 60)).union(blk(0, -LD / 2, 30, LW - 200, LD - 260, 25));
add("lid-closed", lid().translate(W / 4 + 5, YB + 20, ZT).color(lids));
add("lid-open", lid().rotateX(-112).translate(-W / 4 - 5, YB + 20, ZT + 15).color(lids));
for (const x of [-462, 462]) for (const d of [-260, 260]) add(`hinge-${x}-${d}`, cylinder(90, 22, 8).rotateY(90).translate(x + d - 45, YB + 30, ZT + 10).color(pockets));

// Tied refuse bags filling the open half up to the rim.
for (const [x, y, r, c] of [[-650, -250, 300, '#d9dcd6'], [-250, -330, 280, '#3a3f44'], [-500, 200, 320, '#4b79b8'], [-160, 230, 260, '#d9dcd6']] as [number, number, number, string][]) {
  add(`bag-${x}-${y}`, sphere(r).translate(x, y, ZT - r + 120).color(c));
  add(`bag-neck-${x}-${y}`, cylinder(90, 45, 8).translate(x, y, ZT + 110).color(c));
}

// Casters with swivel forks, and a drain plug low on the back.
for (const x of [-W / 2 + 160, W / 2 - 160]) for (const y of [YB - 150, -230]) {
  add(`caster-plate-${x}-${y}`, blk(x, y, ZB - 20, 160, 160, 20).color(casters));
  add(`caster-fork-${x}-${y}`, blk(x, y, 70, 70, 120, 60).color(casters));
  add(`caster-wheel-${x}-${y}`, cylinder(50, 65, 12).rotateY(90).translate(x - 25, y, 65).color('#2b2e30'));
}
add("drain-plug", cylinder(40, 45, 10).rotateX(-90).translate(500, YB, ZB + 90).color(casters));

return p.model();
