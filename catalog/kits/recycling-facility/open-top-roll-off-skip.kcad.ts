// SPDX-License-Identifier: CC0-1.0
// Open-top roll-off skip: the long steel container a hook-lift lorry winches
// onto its bed and drops at a recycling site.
// What makes it a roll-off rather than a builder's skip: a long open body on
// two longitudinal floor rails with rollers at the rear, a sloped nose with an
// A-frame and hook bar at the front for the lorry's hook, vertical side posts
// and a heavy top rail stiffening the walls, and a full-height rear door on
// hinges with over-centre locking bars. It can be shown empty or holding a
// heap of scrap.
// Generic visualization geometry at about real size (5 m long, 2.3 m wide,
// 1.65 m tall), millimetres, Z up, hook end toward -X, rails on z = 0.

meta({
  name: "open-top-roll-off-skip",
  license: 'CC0-1.0',
  title: "Open-top roll-off skip",
  description: "Hook-lift roll-off container at about real size: long open steel body on two floor rails with rear rollers, sloped nose with A-frame and hook bar, vertical side posts and top rail, full-height rear door with hinges and locking bars, optional scrap load. Material controls: body paint, rails and A-frame, door hardware, load. municipalGreen, weathered and highVisibility presets.",
  tags: ["roll-off container", "roll off", "hook lift", "skip", "dumpster", "open top", "recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f6e3a', { label: 'Body (painted steel)' });
const rails = param('rails', '#2b2e31', { label: 'Rails, rollers and A-frame' });
const hardware = param('hardware', '#a8b4b6', { label: 'Hinges, lock bars and hook bar (galvanised)' });
const scrap = param('scrap', '#8a5a3a', { label: 'Scrap load (rusty steel)' });
const load = param('load', 'scrap', { choices: ['scrap', 'empty'], label: 'Load' });

presets({
  municipalGreen: { body: '#2f6e3a', rails: '#2b2e31', hardware: '#a8b4b6', scrap: '#8a5a3a' },
  weathered: { body: '#5a6e74', rails: '#3a3632', hardware: '#8e9692', scrap: '#7a4a2e' },
  highVisibility: { body: '#d77632', rails: '#26292b', hardware: '#c4ccd0', scrap: '#6f7a80' },
});

const p = assembly("open-top-roll-off-skip");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Extrude an (x, z) side outline across Y, centred on y = cy.
const sideXZ = (pts: [number, number][], t: number, cy = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, cy + t / 2, 0);

const L = 5000;
const W = 2300;
const FZ = 230;
const TOP = 1650;

// Body: open tub with a sloped nose, walls 40 mm thick.
const outer: [number, number][] = [[-2250, FZ], [L / 2, FZ], [L / 2, TOP], [-L / 2, TOP], [-L / 2, 760]];
const inner: [number, number][] = [[-2210, FZ + 40], [L / 2 - 40, FZ + 40], [L / 2 - 40, TOP + 50], [-L / 2 + 40, TOP + 50], [-L / 2 + 40, 790]];
add("body", sideXZ(outer, W).subtract(sideXZ(inner, W - 80)).color(body));

// Stiffeners: heavy top rail and vertical posts on both long sides.
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'f' : 'b';
  add(`top-rail-${tag}`, blk(0, s * (W / 2 + 40), TOP - 120, L, 80, 120).color(body));
  for (let k = 0; k < 6; k++) {
    const x = -1900 + k * 760;
    add(`post-${tag}-${k}`, blk(x, s * (W / 2 + 35), FZ, 90, 70, TOP - FZ - 120).color(body));
  }
}

// Floor rails with rear rollers, and cross-members between them.
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'f' : 'b';
  add(`rail-${tag}`, blk(-100, s * 560, 20, L - 200, 140, FZ - 20).color(rails));
  add(`roller-${tag}`, cylinder(200, 110, 16).rotateX(90).translate(L / 2 - 120, s * 560 + 100, 110).color(rails));
  add(`roller-hub-${tag}`, cylinder(220, 40, 10).rotateX(90).translate(L / 2 - 120, s * 560 + 110, 110).color(hardware));
}
for (let k = 0; k < 5; k++) add(`cross-member-${k}`, blk(-1800 + k * 900, 0, 80, 100, W - 200, FZ - 80).color(rails));

// A-frame and hook bar on the nose.
for (const s of [-1, 1]) {
  add(`a-frame-${s < 0 ? 'f' : 'b'}`, sideXZ([[-2200, FZ], [-2480, 760], [-2480, 1500], [-2620, 1500], [-2800, 900], [-2800, FZ + 60]], 60, s * 260).color(rails));
}
add("hook-bar", cylinder(640, 45, 12).rotateX(90).translate(-2650, 320, 1400).color(hardware));
add("a-frame-gusset", blk(-2640, 0, FZ + 60, 300, 580, 40).color(rails));

// Rear door: full-height panel with hinges on one side and two lock bars.
add("rear-door", blk(L / 2 + 30, 0, FZ + 20, 60, W - 40, TOP - FZ - 40).color(body));
for (const z of [450, 1050, 1500]) add(`hinge-${z}`, cylinder(160, 40, 12).translate(L / 2 + 50, W / 2 - 10, z - 80).color(hardware));
for (const y of [-500, 300]) {
  add(`lock-bar-${y}`, cylinder(TOP - FZ - 60, 22, 10).translate(L / 2 + 85, y, FZ + 30).color(hardware));
  add(`lock-handle-${y}`, blk(L / 2 + 130, y - 90, 900, 40, 180, 40).color(hardware));
  add(`lock-keeper-${y}`, blk(L / 2 + 90, y, FZ - 20, 80, 80, 60).color(rails));
}

// Optional load: a heap of scrap showing over the rim.
if (load.value === 'scrap') {
  add("scrap-bed", blk(0, 0, 1000, L - 200, W - 120, 380).color(scrap));
  const pieces: [number, number, number, number, number][] = [
    [-1600, -400, 15, 0, 1400], [-700, 300, -20, 8, 1100], [200, -200, 30, -6, 1600],
    [1100, 450, -10, 12, 900], [1800, -350, 25, -10, 1200], [-1100, 600, 5, -14, 800],
  ];
  pieces.forEach(([x, y, rz, ry, len], i) => {
    add(`scrap-beam-${i}`, box(len, 140, 120, true).rotateY(ry).rotateZ(rz).translate(x, y, 1420).color(i % 2 ? scrap : hardware));
  });
  add("scrap-mound-0", box(1800, 1400, 500, true).rotateY(8).rotateZ(12).translate(-900, 100, 1300).color(scrap));
  add("scrap-mound-1", box(1500, 1200, 420, true).rotateY(-10).rotateZ(-8).translate(1300, -150, 1280).color(scrap));
  add("scrap-drum", cylinder(800, 290, 14).rotateX(70).translate(600, 250, 1450).color(rails));
}

return p.model();
