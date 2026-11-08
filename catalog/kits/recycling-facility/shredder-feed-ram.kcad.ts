// SPDX-License-Identifier: CC0-1.0
// Shredder feed ram: the single-shaft shredder whose hydraulic pusher ram
// forces bulky waste (purgings, pallets, film bales, lumps) against a slow
// toothed rotor so it can't bridge or bounce in the hopper. What makes it
// that machine rather than a twin-shaft shredder: one long rotor studded
// with square cutter inserts across the bottom of a deep hopper, a
// horizontal ram block that slides along the hopper floor toward the rotor
// on a long hydraulic cylinder housed at the back, a counter-knife comb
// under the rotor, a screen basket and a belt carrying shreds away.
// Generic visualization geometry at about real size (5.4 m long, 2.6 m
// wide, 3.1 m high), millimetres, Z up, discharge belt toward -Y.

meta({
  name: "shredder-feed-ram",
  license: 'CC0-1.0',
  title: "Shredder feed ram",
  description: "Single-shaft shredder with hydraulic feed ram at about real size: flared hopper with a low near-side lip and inspection rail, waste chunks, toothed rotor with square cutter inserts and counter-knife comb, yellow ram block sliding along the hopper floor on a long cylinder in a rear housing, gearbox and motor on the rotor end, leg stand over a screen basket and a discharge belt with shreds, plus a control cabinet. Material controls: machine paint, ram block, rotor and cutters, shredded material. plant, weathered, purgings and highVisibility presets.",
  tags: ["recycling", "single-shaft shredder", "feed ram", "pusher ram", "hydraulic ram", "rotor", "size reduction", "plastics recycling", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machinePaint = param('machinePaint', '#3a78a8', { label: 'Machine body (paint)' });
const ram = param('ram', '#f2c230', { label: 'Feed ram block' });
const cutters = param('cutters', '#b9c0c3', { label: 'Rotor and cutters (steel)' });
const shreds = param('shreds', '#3f8fd0', { label: 'Shredded material' });

presets({
  plant: { machinePaint: '#3a78a8', ram: '#f2c230', cutters: '#b9c0c3', shreds: '#3f8fd0' },
  weathered: { machinePaint: '#56605a', ram: '#b89a45', cutters: '#8f918c', shreds: '#8a8f6a' },
  purgings: { machinePaint: '#e7e1cf', ram: '#2f6a4c', cutters: '#b9c0c3', shreds: '#d84b3a' },
  highVisibility: { machinePaint: '#e3742b', ram: '#2f3438', cutters: '#cdd3d6', shreds: '#2fa860' },
});

const p = assembly("shredder-feed-ram");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const dark = '#23282c';

// The rotor lies along Y at the +X end of the hopper floor; the ram pushes +X.
const ZF = 1500; // hopper floor height
const XR = 700, RR = 330, RW = 1600, ZR = ZF + 120; // rotor axis x, radius, width, height
const W = 1900;

// Leg stand and screen basket under the rotor.
for (const [x, y] of [[-1500, -900], [1100, -900], [-1500, 900], [1100, 900]]) {
  add(`leg-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 200, 200, ZF - 300).color(machinePaint));
  add(`foot-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 320, 320, 30).color(machinePaint));
}
add("machine-frame", blk(-200, 0, ZF - 300, 3000, W + 100, 300).subtract(blk(XR, 0, ZF - 320, 900, RW + 40, 340)).color(machinePaint));
add("screen-basket", cylinder(RW, RR + 80, 16).rotateX(90).translate(XR, RW / 2, ZR).subtract(blk(XR, 0, ZR, 1000, RW + 20, 600)).subtract(cylinder(RW + 20, RR + 40, 16).rotateX(90).translate(XR, RW / 2 + 10, ZR)).color(dark));

// Hopper: two side walls with a flared profile, a back wall leaning out
// over the ram housing and a tall front wall leaning out over the rotor.
const side: [number, number][] = [[-1400, ZF], [XR + RR + 120, ZF], [XR + RR + 420, ZF + 1100], [-1620, ZF + 1100]];
add("hopper-side-b", profileXZ(side, 60).translate(0, W / 2 + 30, 0).color(machinePaint));
// The near side wall is cut down to a low lip with an inspection rail, so
// the ram and rotor can be seen working.
add("hopper-side-f", profileXZ([[-1400, ZF], [XR + RR + 120, ZF], [XR + RR + 200, ZF + 300], [-1460, ZF + 300]], 60).translate(0, -W / 2 - 30, 0).color(machinePaint));
for (const x of [-1300, -300, 700]) add(`rail-post-${x}`, blk(x, -W / 2 - 30, ZF + 300, 50, 50, 800).color(ram));
add("rail-top", blk(-300, -W / 2 - 30, ZF + 1100, 2100, 50, 50).color(ram));
add("rail-mid", blk(-300, -W / 2 - 30, ZF + 700, 2100, 40, 40).color(ram));
add("hopper-front", profileXZ([[XR + RR + 60, ZF], [XR + RR + 120, ZF], [XR + RR + 420, ZF + 1100], [XR + RR + 360, ZF + 1100]], W + 120).color(machinePaint));
add("hopper-back", profileXZ([[-1400, ZF], [-1280, ZF], [-1500, ZF + 1100], [-1620, ZF + 1100]], W + 120).color(machinePaint));
add("hopper-floor", blk(-350, 0, ZF - 20, 2100, W, 40).color(dark));
add("hopper-rim", blk(XR + RR + 390, 0, ZF + 1100, 140, W + 120, 60).color(dark));

// Toothed rotor with square cutter inserts and a counter-knife comb.
add("rotor", cylinder(RW, RR, 16).rotateX(90).translate(XR, RW / 2, ZR).color(cutters));
for (let r = 0; r < 8; r++) for (let k = 0; k < 6; k++) {
  const a = k * 60 + r * 22;
  add(`cutter-${r}-${k}`, blk(0, 0, RR - 20, 70, 70, 80).rotateY(a).translate(XR, -RW / 2 + 100 + r * 200, ZR).color('#d9dde0'));
}
add("counter-knife", blk(XR + RR + 30, 0, ZR - 200, 80, RW, 300).color(dark));
for (let i = 0; i < 8; i++) add(`comb-tooth-${i}`, blk(XR + RR - 10, -RW / 2 + 100 + i * 200 + 100, ZR - 60, 60, 60, 120).color(dark));

// Ram block sliding along the floor, on a long cylinder from the rear housing.
const XRAM = -350;
add("ram-block", profileXZ([[XRAM - 500, ZF], [XRAM, ZF], [XRAM, ZF + 700], [XRAM - 200, ZF + 900], [XRAM - 500, ZF + 900]], W - 80).color(ram));
for (let i = 0; i < 4; i++) add(`ram-wear-plate-${i}`, blk(XRAM + 15, -W / 2 + 260 + i * 460, ZF + 60, 30, 340, 560).color(cutters));
add("ram-cylinder", cylinder(1500, 140, 14).rotateY(90).translate(-2500, 0, ZF + 400).color(cutters));
add("ram-rod", cylinder(800, 70, 10).rotateY(90).translate(-1100, 0, ZF + 400).color('#e3e6e8'));
add("ram-housing", blk(-2400, 0, ZF - 300, 1500, 1200, 1200).subtract(blk(-2400, -600, ZF + 100, 1300, 200, 600)).color(machinePaint));
add("ram-housing-cap", cylinder(100, 200, 14).rotateY(90).translate(-3240, 0, ZF + 400).color(dark));
for (const s of [-1, 1]) add(`housing-leg-${s < 0 ? 'f' : 'b'}`, blk(-2900, s * 450, 0, 160, 160, ZF - 300).color(machinePaint));

// Gearbox and motor driving the rotor from the +Y end.
add("bearing-block", blk(XR, RW / 2 + 180, ZR - 260, 500, 300, 520).color(machinePaint));
add("gearbox", blk(XR, RW / 2 + 520, ZR - 400, 700, 420, 700).color(dark));
add("motor", cylinder(800, 230, 14).rotateY(90).translate(XR - 1300, RW / 2 + 520, ZR - 50).color(machinePaint));
add("motor-cowl", cylinder(60, 240, 14).rotateY(90).translate(XR - 1360, RW / 2 + 520, ZR - 50).color(dark));

// Waste chunks waiting in front of the ram, against the rotor.
const chunks: [number, number, number, number, number, number][] = [[200, -500, 600, 400, 300, 25], [300, 300, 520, 360, 380, -30], [-100, 0, 500, 420, 280, 60], [420, -100, 380, 300, 260, 10]];
chunks.forEach(([x, y, w, d, h, a], i) => add(`chunk-${i}`, box(w, d, h, true).rotateZ(a).rotateY(i % 2 ? 18 : -14).translate(x, y, ZF + h / 2 + 40 + (i === 3 ? 300 : 0)).color(i % 2 ? '#2d6e3a' : '#8a8f92')));
add("pallet-piece", box(900, 120, 40, true).rotateZ(35).rotateY(-25).translate(150, 100, ZF + 750).color('#b58b50'));

// Discharge belt under the screen running out toward -Y with shreds.
const YB0 = 700, YB1 = -2400, ZB = 450;
for (const s of [-1, 1]) add(`belt-rail-${s < 0 ? 'l' : 'r'}`, blk(XR + s * 450, (YB0 + YB1) / 2, ZB - 150, 80, YB0 - YB1, 200).color(machinePaint));
add("discharge-belt", blk(XR, (YB0 + YB1) / 2, ZB, 820, YB0 - YB1, 30).color('#2b2f33'));
for (const y of [YB0 - 200, -800, YB1 + 200]) for (const s of [-1, 1]) add(`belt-leg-${Math.round(y)}-${s < 0 ? 'l' : 'r'}`, blk(XR + s * 450, y, 0, 80, 80, ZB - 150).color(machinePaint));
add("drum-head", cylinder(900, 90, 12).rotateY(90).translate(XR - 450, YB1, ZB - 60).color(cutters));
for (let i = 0; i < 14; i++) add(`shred-${i}`, box(90, 60, 18, true).rotateZ(i * 47).translate(XR - 300 + (i % 5) * 150, -300 - i * 140, ZB + 39).color(shreds));
add("shred-heap", sphere(450).scale([1.3, 1, 0.6]).translate(XR, YB1 - 450, 0).subtract(blk(XR, YB1 - 450, -400, 1400, 1100, 400)).color(shreds));

// Control cabinet back-left.
add("control-cabinet", blk(-2700, 1300, 0, 700, 450, 1900).color('#d7dadc'));
add("control-face", blk(-2700, 1072, 900, 560, 6, 700).color(dark));
add("e-stop", cylinder(30, 45, 10).rotateX(90).translate(-2900, 1069, 1450).color('#d43a2f'));

return p.model();
