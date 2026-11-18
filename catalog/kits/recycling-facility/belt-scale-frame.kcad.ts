// SPDX-License-Identifier: CC0-1.0
// Belt scale frame: an in-line belt weigher that totals how many tonnes
// pass along a conveyor. What makes it a belt scale rather than a plain
// conveyor section: two stainless weigh idlers sit on a floating weigh
// frame carried by load cells, flanked by precision-aligned approach and
// retreat idlers; a speed-sensor wheel rides the return belt; a cable runs
// to an integrator cabinet on a pedestal showing a live tonnage readout;
// and a calibration test chain hangs ready on its rack.
// Generic visualization geometry at about real size (5 m long, 2.6 m wide,
// belt top 1.15 m), millimetres, Z up, belt runs toward +Y.

meta({
  name: "belt-scale-frame",
  license: 'CC0-1.0',
  title: "Belt scale frame",
  description: "In-line conveyor belt weigher at about real size: troughed belt section with stainless weigh idlers on a floating frame and load cells, approach and retreat idlers, speed-sensor wheel on the return belt, integrator cabinet with tonnage display on a pedestal, conduit and calibration test-chain rack. Material controls: conveyor frame paint, belt rubber, weigh frame steel, instrument enclosure; mixed, glass or paper load or empty. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "belt scale", "belt weigher", "load cell", "weigh idler", "integrator", "conveyor", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3d7a4a', { label: 'Conveyor frame (paint)' });
const belt = param('belt', '#2b2f31', { label: 'Belt rubber' });
const weigh = param('weigh', '#c6ccce', { label: 'Weigh frame and idlers (stainless)' });
const enclosure = param('enclosure', '#e8e4da', { label: 'Integrator enclosure' });
const load = param('load', 'mixed', { choices: ['mixed', 'glass', 'paper', 'empty'], label: 'Material on belt' });

presets({
  plant: { frame: '#3d7a4a', belt: '#2b2f31', weigh: '#c6ccce', enclosure: '#e8e4da' },
  weathered: { frame: '#5b6553', belt: '#3a3836', weigh: '#9ea7a5', enclosure: '#c9c1ad' },
  stainless: { frame: '#c6cbcd', belt: '#30363a', weigh: '#e0e4e5', enclosure: '#2f5d9a' },
  highVisibility: { frame: '#2a6fb5', belt: '#1f2224', weigh: '#d6dbdd', enclosure: '#f2d21b' },
});

const p = assembly("belt-scale-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (x, z) cross-section extruded along Y from y0 to y1.
const alongY = (pts, y0: number, y1: number) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const L = 5000, ZB = 1150, FX = 640, T = 30;
const c = Math.cos((T * Math.PI) / 180), sn = Math.sin((T * Math.PI) / 180);
const half = 200, wing = 360;

// Troughed belt over the whole section, flat return run below.
add("belt-trough", alongY([
  [-half - wing * c, ZB + wing * sn], [-half, ZB], [half, ZB], [half + wing * c, ZB + wing * sn],
  [half + wing * c, ZB + wing * sn + 18], [half, ZB + 18], [-half, ZB + 18], [-half - wing * c, ZB + wing * sn + 18],
], 0, L).color(belt));
add("belt-return", blk(0, L / 2, ZB - 560, 1000, L, 18).color(belt));

// One troughing idler set: centre roll, two wing rolls, a cross member.
const idler = (pre: string, y: number, roll: Shape | string, base: Shape | string) => {
  add(`${pre}-centre`, alongX(-half, 2 * half, 60, y, ZB - 62).color(roll));
  for (const s of [-1, 1]) add(`${pre}-wing-${s}`, cylinder(wing, 60, 10).rotateY(s * (90 - T)).translate(s * half, y, ZB - 62).color(roll));
  add(`${pre}-base`, blk(0, y, ZB - 200, 2 * FX - 80, 70, 50).color(base));
  for (const s of [-1, 1]) add(`${pre}-bracket-${s}`, blk(s * (half + wing * c - 20), y, ZB - 200, 50, 60, 200 + wing * sn).color(base));
  // Fixed idlers stand on the stringers; weigh idlers sit on the floating rails instead.
  if (base !== weigh) for (const s of [-1, 1]) add(`${pre}-post-${s}`, blk(s * (FX - 40), y, ZB - 340, 60, 60, 140).color(base));
};
for (const y of [400, 1400]) idler(`approach-${y}`, y, '#a9b0b3', frame);
for (const y of [3600, 4600]) idler(`retreat-${y}`, y, '#a9b0b3', frame);
for (const y of [2100, 2900]) idler(`weigh-${y}`, y, weigh, weigh);
for (const y of [1000, 4000]) add(`return-idler-${y}`, alongX(-500, 1000, 55, y, ZB - 620).color('#a9b0b3'));

// Floating weigh frame: two stainless rails on four load cells over the stringers.
for (const s of [-1, 1]) {
  add(`weigh-rail-${s}`, blk(s * (FX - 100), 2500, ZB - 240, 80, 1100, 40).color(weigh));
  for (const y of [2050, 2950]) {
    add(`load-cell-${s}-${y}`, blk(s * (FX - 100), y, ZB - 330, 110, 110, 90).color('#2f6db5'));
    add(`cell-mount-${s}-${y}`, blk(s * (FX - 100), y, ZB - 350, 160, 160, 20).color(weigh));
  }
}
add("junction-box", blk(-FX - 130, 2500, ZB - 450, 160, 220, 220).color(enclosure));

// Stringers and legs.
for (const s of [-1, 1]) {
  add(`stringer-${s}`, blk(s * FX, L / 2, ZB - 520, 100, L + 200, 180).color(frame));
  for (const y of [200, 2500, 4800]) add(`leg-${s}-${y}`, blk(s * FX, y, 0, 110, 110, ZB - 520).color(frame));
}
for (const y of [200, 2500, 4800]) add(`tie-${y}`, blk(0, y, 260, 2 * FX, 80, 80).color(frame));

// Speed sensor: a small wheel riding the return belt on a swing arm.
add("speed-wheel", alongX(-120, 60, 110, 3300, ZB - 450, 14).color(weigh));
add("speed-arm", box(40, 500, 40, true).rotateX(-20).translate(-60, 3500, ZB - 380).color(frame));
add("speed-encoder", alongX(-260, 140, 60, 3300, ZB - 450, 10).color('#2f6db5'));

// Integrator cabinet on a pedestal off the -X side, facing the camera, with conduit.
const CX = -FX - 900, CY = 2500;
add("pedestal", blk(CX, CY, 0, 140, 140, 1050).color(frame));
add("pedestal-foot", blk(CX, CY, 0, 400, 400, 20).color(frame));
add("cabinet", blk(CX, CY, 1050, 500, 260, 640).color(enclosure));
add("cabinet-hood", blk(CX, CY - 30, 1690, 560, 320, 30).color(enclosure));
add("display", blk(CX, CY - 132, 1440, 360, 6, 160).color('#16261a'));
for (let k = 0; k < 4; k++) add(`display-digit-${k}`, blk(CX - 120 + k * 80, CY - 136, 1480, 50, 4, 80).color('#5bf07a'));
for (let k = 0; k < 4; k++) add(`key-${k}`, blk(CX - 150 + k * 100, CY - 134, 1300, 60, 6, 50).color(k === 0 ? '#c8202a' : '#5a6266'));
add("conduit-drop", blk(CX + 180, CY, 300, 40, 40, 760).color('#5a6266'));
add("conduit-run", blk((CX + 180 - FX - 130) / 2, CY, 300, -FX - 130 - CX - 180, 40, 40).color('#5a6266'));
add("conduit-rise", blk(-FX - 130, CY, 300, 40, 40, ZB - 750).color('#5a6266'));

// Calibration test chain: heavy roller chain coiled on a rack beside the cabinet.
add("chain-rack", blk(CX, CY + 650, 0, 500, 300, 50).color(frame));
for (const s of [-1, 1]) add(`chain-rack-post-${s}`, blk(CX + s * 220, CY + 650, 50, 50, 50, 600).color(frame));
add("chain-reel", alongX(CX - 200, 400, 220, CY + 650, 450, 16).color('#5a6266'));
add("chain-reel-hub", alongX(CX - 230, 460, 60, CY + 650, 450, 10).color(weigh));

// Material riding the belt.
if (load.value !== 'empty') {
  const loadColor = load.value === 'glass' ? '#4f8a6a' : load.value === 'paper' ? '#d9d2bf' : '#8a6f55';
  add("load", alongY([[-380, ZB + 120], [380, ZB + 120], [200, ZB + 280], [-150, ZB + 300]], 100, L - 100).color(loadColor));
  if (load.value === 'mixed') for (let k = 0; k < 6; k++) add(`lump-${k}`, box(170, 200, 120, true).rotateZ(31 * k).rotateX(11 * k).translate(-180 + (k % 3) * 180, 500 + k * 750, ZB + 270).color(k % 2 ? '#5c8fc4' : '#c8a23a'));
}

return p.model();
