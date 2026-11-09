// SPDX-License-Identifier: CC0-1.0
// Picking booth module: the enclosed, air-conditioned sorting cabin that a
// materials recovery facility lifts onto steel legs over its sort line, so
// pickers work in clean air above the sort bunkers. What makes it a picking
// booth rather than a site cabin: the belt runs straight through it at
// waist height, entering and leaving through strip-curtain openings in the
// end walls; the long side has a continuous window band; the floor carries
// drop chutes down into colour-coded bins below; and the roof carries the
// HVAC unit and dust extraction duct. A steel stair with handrails climbs to
// the door landing.
// Generic visualization geometry at about real size (6 m cabin, 9.6 m belt,
// 5.9 m high), millimetres, Z up, belt runs along +Y, window side toward -X.

meta({
  name: "picking-booth-module",
  license: 'CC0-1.0',
  title: "Picking booth module",
  description: "Elevated, enclosed MRF picking cabin at about real size: sandwich-panel cabin on steel legs with a window band, a sort belt running through strip-curtain openings, floor drop chutes into colour-coded bins, roof HVAC unit and extraction duct, beacon, and a steel stair with handrails to the door landing. Material controls: cladding panels, steel structure, window glass, handrails and safety trim; mixed or paper load. mrfWhite, plantBlue, weathered and highVisibility presets.",
  tags: ['picking booth', 'picking cabin', 'sort cabin', 'sorting station', 'hand sorting', 'belt conveyor', 'mezzanine', 'MRF', 'recycling', 'materials recovery', 'waste management', 'sorting', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cladding = param('cladding', '#e4e6e2', { label: 'Cabin cladding panels' });
const steel = param('steel', '#3a78a8', { label: 'Legs, frame and conveyor (paint)' });
const glass = param('glass', '#8fb8cc', { label: 'Window glass' });
const safety = param('safety', '#f0b429', { label: 'Handrails and safety trim' });
const load = param('load', 'mixed', { choices: ['mixed', 'paper', 'empty'], label: 'Material on belt' });

presets({
  mrfWhite: { cladding: '#e4e6e2', steel: '#3a78a8', glass: '#8fb8cc', safety: '#f0b429' },
  plantBlue: { cladding: '#2f5d9a', steel: '#6f777c', glass: '#a9cbd9', safety: '#f2d21b' },
  weathered: { cladding: '#b9b4a6', steel: '#566673', glass: '#7d939b', safety: '#a8893f' },
  highVisibility: { cladding: '#e9eaea', steel: '#3d7a4a', glass: '#8fb8cc', safety: '#f2d21b' },
});

const p = assembly("picking-booth-module");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const funnel = (wTop: number, wBot: number, zBot: number, zTop: number) => rect(wBot, wBot).loft([rect(wTop, wTop)], {
  planes: [zBot, zTop].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});
// Bar from (y0, z0) to (y1, z1) in the YZ plane at x, cross-section w x t.
const rodYZ = (x: number, y0: number, z0: number, y1: number, z1: number, w: number, t: number) => {
  const len = Math.hypot(y1 - y0, z1 - z0);
  return box(w, len, t, true).rotateX((Math.atan2(z1 - z0, y1 - y0) * 180) / Math.PI).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};

const CW = 3600, CL = 6000, ZF = 2650, CH = 2800, ZB = ZF + 900, BL = 9600, BW = 1000;
const ZR = ZF + CH;

// Support legs, ring beams and floor.
for (const x of [-CW / 2 + 100, CW / 2 - 100]) for (const y of [-CL / 2 + 100, 0, CL / 2 - 100]) {
  add(`leg-${x}-${y}`, blk(x, y, 20, 200, 200, ZF - 170).color(steel));
  add(`leg-plate-${x}-${y}`, blk(x, y, 0, 360, 360, 20).color(steel));
}
for (const x of [-CW / 2 + 100, CW / 2 - 100]) add(`ring-beam-${x}`, blk(x, 0, ZF - 300, 200, CL, 300).color(steel));
for (const y of [-CL / 2 + 100, CL / 2 - 100]) add(`cross-beam-${y}`, blk(0, y, ZF - 300, CW, 200, 300).color(steel));
add("floor", blk(0, 0, ZF - 150, CW + 100, CL + 100, 150).color('#6f777c'));

// Cabin: back wall, end walls with strip-curtain belt openings, window wall, roof.
add("wall-back", blk(CW / 2 - 40, 0, ZF, 80, CL, CH).color(cladding));
for (const s of [-1, 1]) {
  add(`wall-end-${s}`, blk(0, s * (CL / 2 - 40), ZF, CW, 80, CH)
    .subtract(blk(0, s * (CL / 2 - 40), ZB - 250, BW + 300, 200, 750)).color(cladding));
  for (let k = 0; k < 7; k++) add(`curtain-${s}-${k}`, blk(-BW / 2 - 60 + k * 190, s * (CL / 2 - 40), ZB + 40, 170, 10, 440).color('#9c8f5a'));
}
add("wall-front-low", blk(-CW / 2 + 40, 0, ZF, 80, CL, 850).color(cladding));
add("wall-front-high", blk(-CW / 2 + 40, 0, ZF + 2150, 80, CL, CH - 2150).color(cladding));
add("window-band", blk(-CW / 2 + 60, 600, ZF + 850, 30, CL - 1200, 1300).color(glass));
for (let k = 0; k <= 4; k++) add(`mullion-${k}`, blk(-CW / 2 + 30, -2400 + 1200 * k + 600, ZF + 850, 70, 80, 1300).color(steel));
add("door", blk(-CW / 2 + 30, -CL / 2 + 650, ZF, 60, 900, 2100).color(steel));
add("door-window", blk(-CW / 2 + 5, -CL / 2 + 650, ZF + 1200, 20, 500, 600).color(glass));
add("door-handle", blk(-CW / 2 - 10, -CL / 2 + 950, ZF + 1000, 40, 140, 30).color('#c3c8cb'));
add("roof", blk(0, 0, ZR, CW + 300, CL + 300, 150).color(cladding));
add("roof-trim", blk(0, 0, ZR + 100, CW + 340, CL + 340, 120).subtract(blk(0, 0, ZR + 90, CW + 140, CL + 140, 200)).color(steel));
add("sign", blk(-CW / 2 - 10, 600, ZF + 2300, 20, 2000, 360).color('#2f6db5'));
for (let i = 0; i < 3; i++) add(`sign-text-${i}`, blk(-CW / 2 - 24, 600 - 500 + i * 450, ZF + 2420, 8, 340, 120).color('#f4f1e8'));

// Roof HVAC unit, extraction duct and beacon.
add("hvac-unit", blk(800, 1200, ZR + 150, 1400, 1800, 700).color('#c9ced1'));
for (const y of [750, 1650]) add(`hvac-fan-${y}`, cylZ(800, y, ZR + 850, 30, 380, 18).color('#3a3f42'));
add("duct-rise", cylZ(-600, -1600, ZR + 150, 900, 300, 14).color('#b9c1c4'));
add("duct-run", cylX(-600, -1600, ZR + 1050, 1800, 300, 14).color('#b9c1c4'));
add("duct-cap", cylZ(-600, -1600, ZR + 1050, 80, 380, 14).color('#8e9599'));
add("beacon-base", cylZ(-CW / 2 + 300, CL / 2 - 300, ZR + 150, 60, 110).color('#3a3f42'));
add("beacon", cylZ(-CW / 2 + 300, CL / 2 - 300, ZR + 210, 180, 90).color('#f29a1d'));

// Sort belt running straight through the cabin, with its outboard legs.
add("belt-top", blk(0, 0, ZB - 30, BW, BL, 30).color('#2b2f31'));
for (const s of [-1, 1]) {
  add(`stringer-${s}`, blk(s * (BW / 2 + 60), 0, ZB - 260, 120, BL, 220).color(steel));
  add(`skirt-${s}`, blk(s * (BW / 2 + 15), 0, ZB - 30, 30, BL - 600, 120).color('#b9c1c4'));
  add(`pulley-${s}`, cylX(-BW / 2, s * BL / 2, ZB - 140, BW, 140, 16).color('#2b2f31'));
  for (const x of [-1, 1]) add(`belt-leg-${s}-${x}`, blk(x * (BW / 2 + 60), s * (BL / 2 - 300), 20, 120, 120, ZB - 280).color(steel));
  add(`belt-leg-brace-${s}`, blk(0, s * (BL / 2 - 300), 900, BW + 240, 80, 80).color(steel));
}
add("feed-hopper", funnel(1700, 1000, ZB + 100, ZB + 900).translate(0, -BL / 2 + 600, 0)
  .subtract(funnel(1580, 880, ZB + 60, ZB + 960).translate(0, -BL / 2 + 600, 0)).color('#b9c1c4'));
add("drive-motor", cylX(BW / 2 + 140, BL / 2, ZB - 140, 420, 120).color('#5a6266'));
add("drive-gearbox", blk(BW / 2 + 260, BL / 2, ZB - 300, 240, 300, 320).color(steel));

// Drop chutes through the floor into colour-coded bins.
const bins = ['#2f6db5', '#e2b31f', '#3d8a4f', '#c8202a'];
let n = 0;
for (const x of [-1, 1]) for (const y of [-1500, 1500]) {
  const bx = x * 1050;
  add(`chute-${n}`, funnel(700, 480, ZF - 1000, ZF - 300).translate(bx, y, 0).color('#b9c1c4'));
  add(`chute-hatch-${n}`, blk(bx, y, ZF, 620, 620, 10).color('#1d2224'));
  add(`bin-${n}`, blk(bx, y, 60, 1100, 1100, 1300).color(bins[n]));
  add(`bin-rim-${n}`, blk(bx, y, 1360, 1160, 1160, 60).color(bins[n]));
  add(`bin-label-${n}`, blk(bx, y - 560, 700, 500, 10, 260).color('#f4f1e8'));
  for (const wx of [-1, 1]) add(`bin-castor-${n}-${wx}`, blk(bx + wx * 420, y - 420, 0, 90, 90, 60).color('#1d2224'));
  n++;
}

// Door landing and stair with handrails, climbing along -X toward the door.
const LX = -CW / 2 - 650, LY = -CL / 2 + 650, YS = LY + 600 + 13 * 270;
add("landing", blk(LX, LY, ZF - 150, 1200, 1200, 150).color(steel));
for (const y of [LY - 500, LY + 500]) add(`landing-post-${y}`, blk(LX - 500, y, 20, 120, 120, ZF - 170).color(steel));
for (let i = 0; i < 13; i++) {
  add(`tread-${i}`, blk(LX, LY + 600 + i * 270 + 135, ZF - 190 * (i + 1) - 40, 900, 260, 40).color('#6f777c'));
}
for (const s of [-1, 1]) {
  add(`stringer-stair-${s}`, rodYZ(LX + s * 470, YS - 60, 170, LY + 600, ZF - 120, 40, 260).color(steel));
  add(`stringer-foot-${s}`, blk(LX + s * 470, YS - 90, 0, 120, 260, 40).color(steel));
  add(`handrail-${s}`, rodYZ(LX + s * 470, YS, 1000, LY + 600, ZF + 1000, 50, 50).color(safety));
  for (const k of [0, 1]) add(`rail-post-${s}-${k}`, blk(LX + s * 470, k ? YS - 150 : LY + 700, k ? 20 : ZF - 200, 50, 50, k ? 1030 : 1220).color(safety));
}
add("landing-rail", blk(LX - 600, LY, ZF + 1000, 50, 1200, 50).color(safety));
add("landing-rail-end", blk(LX, LY - 600, ZF + 1000, 1200, 50, 50).color(safety));
for (const [k, y] of [LY - 575, LY + 575].entries()) add(`landing-rail-post-${k}`, blk(LX - 575, y, ZF, 50, 50, 1050).color(safety));
add("landing-toe", blk(LX - 590, LY, ZF, 20, 1200, 150).color(safety));

// The stream on the belt.
if (load.value !== 'empty') {
  const paper = load.value === 'paper';
  const items = paper ? ['#d9d2bf', '#c49a6c', '#e8e4da', '#b58a5a'] : ['#c49a6c', '#5c8fc4', '#e2e6e8', '#3d8a4f', '#d9d2bf', '#c8202a'];
  for (let i = 0; i < 18; i++) {
    const row = Math.floor(i / 2), col = i % 2;
    const x = -220 + col * 440 + ((row * 137) % 120) - 60;
    const y = -BL / 2 + 600 + row * 1000 + ((col * 251) % 300);
    const kind = paper ? 0 : (i * 5) % 3;
    const color = items[(i * 7) % items.length];
    if (kind === 0) add(`item-${i}`, box(280, 220, 20, true).rotateZ((i * 37) % 180).translate(x, y, ZB + 10).color(color));
    else if (kind === 1) add(`item-${i}`, cylinder(240, 45, 8).rotateY(90).rotateZ((i * 53) % 180).translate(x, y, ZB + 45).color(color));
    else add(`item-${i}`, cylinder(120, 35, 8).translate(x, y, ZB).color(color));
  }
}

return p.model();
