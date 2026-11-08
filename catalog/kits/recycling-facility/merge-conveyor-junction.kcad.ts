// SPDX-License-Identifier: CC0-1.0
// Merge conveyor junction: where a side feeder belt joins the main sort
// line. What makes it a merge rather than two belts: the feeder comes in at
// 45 degrees and sits higher, its head pulley discharges through a hooded
// transfer chute onto the main belt, a deflector plate on the main belt
// turns the incoming stream into line, and skirtboards hold the combined
// stream together downstream. The two streams differ in colour so the merge
// reads at a glance.
// Generic visualization geometry at about real size (main belt 6 m, feeder
// 4 m at 45 degrees), millimetres, Z up, main belt runs toward +Y.

meta({
  name: "merge-conveyor-junction",
  license: 'CC0-1.0',
  title: "Merge conveyor junction",
  description: "Belt conveyor merge junction at about real size: a raised 45-degree side feeder discharges through a hooded transfer chute onto the main belt, with a deflector plate, downstream skirtboards, both head and tail pulleys, legs and a feeder drive; two differently coloured streams combine. Material controls: frame paint, belt rubber, chute steel, guards; with or without material. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "conveyor", "merge", "junction", "transfer chute", "deflector", "skirtboard", "belt conveyor", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3d7a4a', { label: 'Frames and legs (paint)' });
const belt = param('belt', '#2b2f31', { label: 'Belt rubber' });
const chute = param('chute', '#b9c1c4', { label: 'Transfer chute and deflector (steel)' });
const guard = param('guard', '#f0b429', { label: 'Guards and safety trim' });
const load = param('load', 'streams', { choices: ['streams', 'empty'], label: 'Material on belts' });

presets({
  plant: { frame: '#3d7a4a', belt: '#2b2f31', chute: '#b9c1c4', guard: '#f0b429' },
  weathered: { frame: '#5b6553', belt: '#3a3836', chute: '#8e9290', guard: '#a8893f' },
  stainless: { frame: '#c6cbcd', belt: '#30363a', chute: '#e0e4e5', guard: '#2f5d9a' },
  highVisibility: { frame: '#2a6fb5', belt: '#1f2224', chute: '#c9ced1', guard: '#f2d21b' },
});

const p = assembly("merge-conveyor-junction");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const RP = 150;
// One flat belt conveyor laid along local +Y from 0 to len, belt top at zb.
// `place` moves each part into the junction; legs stop at `legEnd`.
const conveyor = (pre: string, len: number, w: number, zb: number, legs: number[], place: (s: Shape) => Shape) => {
  const fx = w / 2 + 60;
  const put = (name: string, s: Shape) => add(`${pre}-${name}`, place(s));
  put("belt-top", blk(0, len / 2, zb - 20, w, len, 20).color(belt));
  put("belt-return", blk(0, len / 2, zb - 2 * RP - 20, w, len, 20).color(belt));
  for (const y of [0, len]) {
    put(`pulley-${y}`, alongX(-w / 2, w, RP, y, zb - RP, 16).color(belt));
    put(`shaft-${y}`, alongX(-fx - 60, 2 * fx + 120, 35, y, zb - RP).color(chute));
  }
  for (const s of [-1, 1]) {
    put(`stringer-${s}`, blk(s * fx, len / 2, zb - 280, 90, len + 150, 200).color(frame));
    for (const y of legs) put(`leg-${s}-${y}`, blk(s * fx, y, 0, 90, 90, zb - 280).color(frame));
  }
  for (const y of legs) put(`tie-${y}`, blk(0, y, 200, 2 * fx, 70, 70).color(frame));
};

// Main line along +Y, belt top 900.
const ZM = 900, WM = 1200, LM = 6000;
conveyor("main", LM, WM, ZM, [300, 3000, 5700], (s) => s);

// Side feeder: raised, at 45 degrees, head pulley over the main belt.
const ZF = ZM + 450, WF = 800, LF = 4000, ANG = -45;
const HX = -250, HY = 2300; // feeder head pulley over the main belt
const r = (ANG * Math.PI) / 180;
const placeF = (s: Shape) => s.rotateZ(ANG).translate(HX + LF * Math.sin(r), HY - LF * Math.cos(r), 0);
conveyor("feeder", LF, WF, ZF, [500, 2400], placeF);
const fx = WF / 2 + 60;
for (const s of [-1, 1]) add(`feeder-guard-${s}`, placeF(blk(s * (fx + 20), LF / 2, ZF - 20, 20, LF - 600, 140)).color(guard));
add("feeder-gearbox", placeF(blk(fx + 200, LF, ZF - 420, 240, 280, 240)).color(frame));
add("feeder-motor", placeF(alongX(fx + 320, 380, 110, LF, ZF - 300, 14)).color('#5a6266'));

// Hooded transfer chute over the feeder head, with its drop spout to the main belt.
add("hood", placeF(blk(0, LF + 250, ZF - 40, WF + 300, 700, 520).subtract(blk(0, LF + 150, ZF - 80, WF + 160, 700, 470))).color(chute));
add("hood-roof-stripe", placeF(blk(0, LF + 250, ZF + 480, WF + 320, 720, 30)).color(guard));
add("drop-spout", blk(-60, HY + 300, ZM + 110, 800, 700, ZF - ZM - 150).subtract(blk(-60, HY + 300, ZM + 80, 680, 580, ZF - ZM)).color(chute));

// Deflector on the main belt: turns the incoming stream into line.
add("deflector", box(1100, 24, 220, true).rotateZ(-38).translate(260, HY + 400, ZM + 110).color(chute));
add("deflector-rubber", box(1100, 30, 50, true).rotateZ(-38).translate(260, HY + 400, ZM + 25).color(belt));
add("deflector-arm", blk(WM / 2 + 150, HY + 750, ZM - 60, 60, 60, 400).color(frame));

// Skirtboards hold the combined stream downstream of the merge.
for (const s of [-1, 1]) {
  add(`skirt-${s}`, blk(s * (WM / 2 - 40), HY + 1900, ZM, 20, 2400, 220).color(chute));
  add(`skirt-rubber-${s}`, blk(s * (WM / 2 - 40), HY + 1900, ZM - 2, 34, 2400, 50).color(belt));
}
add("main-tail-guard", blk(0, -260, ZM - 520, WM + 260, 30, 520).color(guard));

// Two streams: blue paper on the main line, amber plastics on the feeder, mixed after the merge.
if (load.value !== 'empty') {
  for (let i = 0; i < 6; i++) add(`main-item-${i}`, box(280, 220, 24, true).rotateZ(i * 41).translate(-260 + (i % 3) * 260, 300 + Math.floor(i / 3) * 700, ZM + 12).color('#5c8fc4'));
  for (let i = 0; i < 5; i++) add(`feed-item-${i}`, placeF(cylinder(240, 50, 8).rotateY(90).rotateZ(i * 67).translate(-200 + (i % 2) * 200, 700 + i * 600, ZF + 50)).color('#e2a12f'));
  for (let i = 0; i < 8; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = -300 + col * 300, y = HY + 1300 + row * 800 + col * 120;
    if (i % 2) add(`mixed-item-${i}`, cylinder(240, 50, 8).rotateY(90).rotateZ(i * 53).translate(x - 100, y, ZM + 50).color('#e2a12f'));
    else add(`mixed-item-${i}`, box(280, 220, 24, true).rotateZ(i * 37).translate(x, y, ZM + 12).color('#5c8fc4'));
  }
}

return p.model();
