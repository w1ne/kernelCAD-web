// SPDX-License-Identifier: CC0-1.0
// Compost trommel screen: the tracked mobile screen that sieves finished
// compost into fine product and woody oversize. What makes it a trommel
// rather than a conveyor: a long rotating mesh drum (hoops, longitudinal
// bars and two riding rings) carried in portal frames on a crawler chassis,
// a wide feed hopper with grizzly bars at the rear end over the engine
// canopy, a fines conveyor swung out to the -X side and an oversize
// conveyor running out of the front of the drum, each tipping onto its own
// heap. Heaps and the hopper load switch off for an idle machine.
// Generic visualization geometry at about real size (drum 1.7 m diameter
// by 4.4 m, about 11 m long with conveyors out), millimetres, Z up,
// oversize end toward -Y.

meta({
  name: "compost-trommel-screen",
  license: 'CC0-1.0',
  title: "Compost trommel screen",
  description: "Tracked mobile compost trommel at about real size: 1.7 m mesh drum with hoops, bars and riding rings in portal frames, crawler tracks with sprockets, rear feed hopper with grizzly bars over the engine canopy, side fines conveyor and front oversize conveyor each tipping onto a heap. Working or idle. Material controls: machine body, screen drum, belts and tracks, compost. green, yellow and blue presets.",
  tags: ["trommel", "trommel screen", "compost screen", "mobile screen", "tracked", "screening", "compost", "recycling", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f7d4a', { label: 'Machine body (paint)' });
const drum = param('drum', '#a9b0b2', { label: 'Screen drum (steel)' });
const belt = param('belt', '#2a2c2e', { label: 'Belts and tracks (rubber)' });
const compost = param('compost', '#4a3524', { label: 'Compost' });
const load = param('load', 'working', { choices: ['working', 'idle'], label: 'Load' });

presets({
  green: { body: '#2f7d4a', drum: '#a9b0b2', belt: '#2a2c2e', compost: '#4a3524' },
  yellow: { body: '#e0a526', drum: '#9aa1a3', belt: '#262829', compost: '#3f2c1f' },
  blue: { body: '#2b5c9e', drum: '#b4babc', belt: '#2a2c2e', compost: '#56402c' },
});

const p = assembly("compost-trommel-screen");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const working = load.value === 'working';

// Crawler tracks: stadium outline with a flat ground run, sprocket and idler.
const TL = 1700; // half length between wheel centres
const TR = 330;
const track: [number, number][] = [];
for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 8; track.push([TL + TR * Math.cos(a), TR + TR * Math.sin(a)]); }
for (let k = 0; k <= 8; k++) { const a = Math.PI / 2 + (k * Math.PI) / 8; track.push([-TL + TR * Math.cos(a), TR + TR * Math.sin(a)]); }
for (const [i, x] of [[0, -1000], [1, 1000]] as const) {
  add(`track-${i}`, profileYZ(track, 420).translate(x, 0, 0).color(belt));
  const face = x - 216;
  for (const [n, y] of [['sprocket', TL], ['idler', -TL]] as const) add(`${n}-${i}`, cylinder(20, 250, 12).rotateY(-90).translate(x < 0 ? face : x + 216 + 20, y, TR).color('#6d716e'));
  add(`track-frame-${i}`, blk(x, 0, 220, x < 0 ? 440 : 440, 2 * TL - 200, 200).color('#3a3d40'));
}

// Chassis.
add("chassis", blk(0, 200, 660, 1700, 6200, 280).color(body));
add("chassis-rub-strip", blk(-852, 200, 720, 6, 6200, 60).color('#1d1f20'));

// Screen drum: dark mesh core, steel hoops, bars and riding rings, along Y.
const DZ = 2000;
const DR = 850;
const DY0 = -2600;
const DL = 4400;
const alongY = (r: number, len: number, y0: number, n = 16) => cylinder(len, r, n).rotateX(-90).translate(0, y0, DZ);
add("drum-mesh", alongY(DR - 20, DL, DY0).color('#3b3f41'));
for (let k = 0; k <= 6; k++) add(`drum-hoop-${k}`, alongY(DR + 5, 50, DY0 + 150 + k * ((DL - 350) / 6)).color(drum));
for (const [i, y] of [[0, DY0 + 500], [1, DY0 + DL - 650]] as const) add(`riding-ring-${i}`, alongY(DR + 40, 160, y).color(drum));
for (let k = 0; k < 8; k++) {
  const a = (k * 360) / 8 + 22.5;
  add(`drum-bar-${k}`, box(60, DL, 40, true).translate(0, 0, DR - 5).rotateY(a).translate(0, DY0 + DL / 2, DZ).color(drum));
}
// Portal frames carrying the drum, with trunnion rollers under the riding rings.
for (const [i, y] of [[0, DY0 + 580], [1, DY0 + DL - 570]] as const) {
  for (const [s, x] of [['l', -1000], ['r', 1000]] as const) add(`portal-post-${i}-${s}`, blk(x, y, 800, 180, 220, 2350).color(body));
  add(`portal-beam-${i}`, blk(0, y, 3050, 2180, 220, 200).color(body));
  for (const [s, x] of [['l', -520], ['r', 520]] as const) add(`trunnion-${i}-${s}`, cylinder(200, 170, 10).rotateX(-90).translate(x, y - 100, DZ - DR - 60).color('#5d6366'));
}
add("drum-drive-motor", cylinder(300, 160, 10).rotateY(-90).translate(-1090, DY0 + DL - 570, 2600).color('#3a3d40'));

// Fines hopper under the drum and the side fines conveyor out to -X.
add("fines-hopper", rectPath(900, 2000).loft(rectPath(500, 1600), { planes: [{ plane: 'XY', origin: [0, -400, 1100] }, { plane: 'XY', origin: [0, -400, 950] }], ruled: true }).color(body));
const conveyorX = (len: number, ang: number, w: number) => [box(len, w, 50, true).translate(-len / 2, 0, 0), box(len, 60, 160, true).translate(-len / 2, -w / 2 - 30, 40), box(len, 60, 160, true).translate(-len / 2, w / 2 + 30, 40)].map((s) => s.rotateY(ang));
const FA = 22;
const FL = 4200;
conveyorX(FL, FA, 800).forEach((s, k) => add(`fines-conveyor-${k}`, s.translate(-300, -400, 1000).color(k === 0 ? belt : body)));
const finesTip: [number, number] = [-300 - FL * Math.cos((FA * Math.PI) / 180), 1000 + FL * Math.sin((FA * Math.PI) / 180)];
add("fines-leg", blk(finesTip[0] + 600, -400, 0, 120, 120, finesTip[1] - 300).color('#3a3d40'));
add("fines-head-drum", cylinder(900, 140, 10).rotateX(-90).translate(finesTip[0], -850, finesTip[1]).color('#6d716e'));

// Oversize conveyor out of the front of the drum toward -Y.
const OA = 20;
const OL = 3600;
const OY0 = DY0 + 200;
const oz = 1350;
for (const [k, s] of [
  [0, box(700, OL, 50, true)],
  [1, box(60, OL, 160, true).translate(-380, 0, 40)],
  [2, box(60, OL, 160, true).translate(380, 0, 40)],
] as const) add(`overs-conveyor-${k}`, s.translate(0, -OL / 2, 0).rotateX(-OA).translate(0, OY0, oz).color(k === 0 ? belt : body));
const oTip: [number, number] = [OY0 - OL * Math.cos((OA * Math.PI) / 180), oz + OL * Math.sin((OA * Math.PI) / 180)];
add("overs-leg", blk(0, oTip[0] + 500, 0, 120, 120, oTip[1] - 200).color('#3a3d40'));
add("overs-head-drum", cylinder(800, 140, 10).rotateY(90).translate(-400, oTip[0], oTip[1]).color('#6d716e'));

// Rear engine canopy and feed hopper with grizzly bars.
const HY = 2500;
add("engine-canopy", blk(0, HY, 800, 1700, 1400, 900).color(body));
for (let k = 0; k < 6; k++) add(`canopy-louvre-${k}`, blk(-852, HY - 450 + k * 180, 1050, 6, 110, 400).color('#1d1f20'));
add("exhaust", cylinder(700, 60, 8).translate(500, HY + 400, 1700).color('#3a3d40'));
add("feed-hopper", rectPath(1500, 900).loft(rectPath(550, 450), { planes: [{ plane: 'XY', origin: [0, HY, 3100] }, { plane: 'XY', origin: [0, HY, 1800] }], ruled: true })
  .subtract(rectPath(1440, 840).loft(rectPath(490, 390), { planes: [{ plane: 'XY', origin: [0, HY, 3110] }, { plane: 'XY', origin: [0, HY, 1860] }], ruled: true })).color(body));
for (let k = 0; k < 7; k++) add(`grizzly-bar-${k}`, blk(-1200 + k * 400, HY, 3080, 60, 1800, 60).color(drum));
add("feed-chute", blk(0, HY - 950, 1700, 900, 500, 400).color(body));
if (working) {
  add("hopper-load", sphere(700).scale([1.8, 1.1, 0.5]).translate(0, HY, 2900).color(compost));
  add("fines-heap", sphere(1100).scale([1.3, 1.5, 0.75]).translate(finesTip[0] - 200, -400, 0).subtract(blk(finesTip[0] - 200, -400, -1000, 4000, 4000, 1000)).color(compost));
  add("overs-heap", sphere(900).scale([1.4, 1.3, 0.8]).translate(0, oTip[0] - 200, 0).subtract(blk(0, oTip[0] - 200, -1000, 4000, 4000, 1000)).color('#7a5a36'));
}

return p.model();
