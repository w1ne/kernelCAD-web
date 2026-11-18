// SPDX-License-Identifier: CC0-1.0
// Stacker reclaimer, the rail-mounted bucket-wheel machine that builds the
// long ore stockpiles in a stockyard and digs them back out again. What
// makes one: a long lattice boom carrying a conveyor, with a bucket wheel
// on the side of its tip; the boom is pinned to a slewing superstructure
// and luffed up and down by hydraulic cylinders, held by stays from an
// A-frame mast and balanced by a concrete counterweight on a short rear
// boom. The superstructure turns on a slewing ring on a portal that rides
// on rail bogies. Around it: the machinery house, the operator cab hung
// on the boom, a walkway along the boom, the yard conveyor alongside the
// rails with the trailing tripper, and the ore stockpile it works.
// The mode choice luffs the boom down into the pile to reclaim or up to
// stack (with ore falling off the boom tip); the slew choice turns the
// boom onto the pile or parks it along the rails.
// Millimetres, Z up, rails along X, stockpile on the +Y side.
meta({
  name: "stacker-reclaimer-boom",
  license: 'CC0-1.0',
  title: "Stacker reclaimer boom",
  description: "Rail-mounted bucket-wheel stacker reclaimer at about real size: four rail bogies with sixteen wheels, portal, slewing ring and superstructure with machinery house; 28 m lattice boom with conveyor belt, ore load and walkway; bucket wheel with ten toothed buckets, spokes and drive on the boom tip; luffing cylinders, A-frame mast with stays to the boom and to a rear counterweight boom; operator cab on the boom; yard conveyor alongside the rails with a trailing tripper; and a stockpile with half-cone ends. Mode choice (reclaim, stack) luffs the boom; slew choice (onPile, parked). Material controls: machine paint, frame steel, belt rubber and stockpile. weathered, coalYard and bauxiteYard presets.",
  tags: ['mining', 'stockyard', 'stacker reclaimer', 'bucket wheel', 'stockpile', 'bulk handling', 'materials handling'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'port', 'scene'],
  triangleBudget: 5500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const mode = param('mode', 'reclaim', { choices: ['reclaim', 'stack'], label: 'Operating mode' });
const slewing = param('slewing', 'onPile', { choices: ['onPile', 'parked'], label: 'Boom slew' });
const machinePaint = param('machinePaint', '#e1a620', { label: 'Machine paint' });
const frameSteel = param('frameSteel', '#4a5862', { label: 'Frame steel' });
const beltRubber = param('beltRubber', '#26292b', { label: 'Belt rubber' });
const stockpile = param('stockpile', '#8a4f36', { label: 'Stockpile ore' });
presets({
  weathered: { machinePaint: '#b08f4c', frameSteel: '#5f5b55', beltRubber: '#33312e', stockpile: '#7a5644' },
  coalYard: { machinePaint: '#e9e9e4', frameSteel: '#2f5f8e', beltRubber: '#222527', stockpile: '#1e1e20' },
  bauxiteYard: { machinePaint: '#d8661c', frameSteel: '#3b4248', beltRubber: '#25282a', stockpile: '#b0603a' },
});

const p = assembly("stacker-reclaimer-boom");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Closed (y, z) outline extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};

const concrete = '#a39e94', glass = '#2d4655', rail = '#e8c21e', chrome = '#c9cdd0';
const stacking = mode.value === 'stack';
const SLEW = slewing.value === 'onPile' ? 30 : 0; // degrees, boom towards +Y
const LUFF = stacking ? 8 : -6; // degrees, boom tip up
const LB = 28000; // boom pivot to wheel centre
const P = [2500, 0, 7500]; // boom pivot on the superstructure
const H = 1100; // boom half depth and half width
const RW = 3200; // bucket wheel radius
const YW = -H - 900; // bucket wheel plane, on the -Y side of the boom tip
const cl = Math.cos((LUFF * Math.PI) / 180), sl = Math.sin((LUFF * Math.PI) / 180);
// Boom frame (x along the boom from the pivot) -> superstructure frame.
const bm = (s) => s.rotateY(-LUFF).translate(P[0], P[1], P[2]);
const bmPt = (x, y, z) => [P[0] + x * cl - z * sl, P[1] + y, P[2] + x * sl + z * cl];
// Superstructure frame -> world (slews about the machine centre).
const sw = (s) => s.rotateZ(SLEW);

// ---- Rails and bogies ----
const RY = 3500;
for (const [k, s] of [-1, 1].entries()) {
  add(`rail-beam-${k}`, blk(-13000, s * RY - 450, 0, 13000, s * RY + 450, 300).color(concrete));
  add(`rail-${k}`, blk(-13000, s * RY - 60, 300, 13000, s * RY + 60, 450).color(frameSteel));
  for (const [j, x] of [-3200, 3200].entries()) {
    for (const [m, dx] of [-1100, -370, 370, 1100].entries()) add(`wheel-${k}-${j}-${m}`, latheY([[380, s * RY - 100], [380, s * RY + 100]], x + dx, 830, 10).color(frameSteel));
    add(`bogie-${k}-${j}`, blk(x - 1500, s * RY - 320, 900, x + 1500, s * RY + 320, 1500).color(machinePaint));
    add(`bogie-beam-${k}-${j}`, blk(x - 900, s * RY - 250, 1500, x + 900, s * RY + 250, 1800).color(frameSteel));
  }
  add(`portal-girder-${k}`, blk(-4800, s * RY - 450, 1800, 4800, s * RY + 450, 2700).color(machinePaint));
}
add('portal-deck', blk(-3800, -RY - 450, 2700, 3800, RY + 450, 3300).color(machinePaint));
add('slew-ring', rod(2800, 3300, 3650, 24).color(frameSteel));
add('turntable', rod(3100, 3650, 4200, 24).color(machinePaint));

// ---- Superstructure (slews) ----
add('deck', sw(blk(-9500, -2300, 4200, 4200, 2300, 4800)).color(machinePaint));
add('machinery-house', sw(blk(-6800, -2000, 4800, -2600, 2000, 7300)).color(machinePaint));
add('house-roof', sw(blk(-6950, -2150, 7300, -2450, 2150, 7450)).color(frameSteel));
for (let i = 0; i < 4; i++) add(`house-louvre-${i}`, sw(blk(-6200 + i * 900, -2015, 5600, -5600 + i * 900, -2000, 6800)).color(frameSteel));
// A-frame mast and stays.
const apex = [-1200, 0, 17500];
for (const [k, s] of [-1, 1].entries()) {
  add(`mast-front-${k}`, sw(tube([1600, s * 1900, 4800], apex, 300, 8)).color(machinePaint));
  add(`mast-rear-${k}`, sw(tube([-2400, s * 1900, 4800], apex, 300, 8)).color(machinePaint));
  add(`boom-stay-${k}`, sw(tube(apex, bmPt(17000, s * H, H), 90, 6)).color(frameSteel));
}
add('mast-head', sw(blk(apex[0] - 500, -500, apex[2] - 600, apex[0] + 500, 500, apex[2] + 300)).color(frameSteel));
add('rear-stay', sw(tube(apex, [-10500, 0, 8400], 110, 6)).color(frameSteel));
// Rear counterweight boom.
add('counter-boom', sw(blk(-10500, -800, 6200, -2000, 800, 7400)).color(machinePaint));
add('counterweight', sw(blk(-12200, -2000, 5000, -9600, 2000, 8400)).color(concrete));
add('boom-pivot-pin', sw(latheY([[300, -1600], [300, 1600]], P[0], P[2], 12)).color(chrome));
for (const [k, s] of [-1, 1].entries()) add(`pivot-cheek-${k}`, sw(blk(P[0] - 900, s * 1400 - 150, 4800, P[0] + 900, s * 1400 + 150, P[2] + 300)).color(machinePaint));
// Luffing cylinders from the deck up to the boom underside.
for (const [k, s] of [-1, 1].entries()) {
  const top = bmPt(6500, s * 900, -H);
  const mid = [(4200 + top[0]) / 2, s * 900, (4800 + top[2]) / 2];
  add(`luff-barrel-${k}`, sw(tube([4000, s * 900, 4800], mid, 260, 10)).color(machinePaint));
  add(`luff-rod-${k}`, sw(tube(mid, top, 150, 10)).color(chrome));
}

// ---- Lattice boom (boom frame, then slewed) ----
const B = (name, shape, colour) => add(name, sw(bm(shape)).color(colour));
for (const [k, [y, z]] of [[-H, -H], [H, -H], [-H, H], [H, H]].entries()) B(`chord-${k}`, tube([0, y, z], [LB - 1200, y, z], 150, 6), machinePaint);
const bay = 2400;
for (let x = 0, i = 0; x + bay <= LB - 1200; x += bay, i++) {
  for (const [k, y] of [-H, H].entries()) {
    B(`vertical-${i}-${k}`, tube([x + bay, y, -H], [x + bay, y, H], 80, 6), machinePaint);
    B(`diagonal-${i}-${k}`, i % 2 ? tube([x, y, -H], [x + bay, y, H], 70, 6) : tube([x, y, H], [x + bay, y, -H], 70, 6), machinePaint);
  }
  B(`cross-tie-${i}`, tube([x + bay, -H, H], [x + bay, H, H], 70, 6), machinePaint);
}
B('boom-head', blk(LB - 1500, -H - 100, -H - 100, LB + 300, H + 100, H + 100), machinePaint);
B('boom-belt', blk(0, -650, H + 150, LB - 1200, 650, H + 190), beltRubber);
B('boom-ore', prismX([[-450, H + 190], [450, H + 190], [200, H + 400], [-200, H + 400]], 400, LB - 1600), stockpile);
for (let x = 1200, i = 0; x < LB - 1200; x += 2400, i++) B(`belt-idler-${i}`, latheY([[70, -700], [70, 700]], x, H + 80, 8), frameSteel);
B('walkway', blk(0, H + 150, H - 40, LB - 1500, H + 900, H), frameSteel);
B('walkway-rail', tube([0, H + 880, H + 1000], [LB - 1500, H + 880, H + 1000], 30, 6), rail);
for (let x = 0, i = 0; x <= LB - 1500; x += 3000, i++) B(`walkway-post-${i}`, blk(x - 25, H + 855, H, x + 25, H + 905, H + 1000), rail);
// Operator cab hung on the -Y side near the pivot.
B('cab', blk(3000, -H - 2100, -1600, 5200, -H - 300, 800), machinePaint);
B('cab-window', blk(5200, -H - 2000, -900, 5220, -H - 400, 600), glass);
B('cab-side-window', blk(3200, -H - 2120, -900, 5000, -H - 2100, 600), glass);
B('cab-roof', blk(2900, -H - 2200, 800, 5300, -H - 200, 950), frameSteel);

// ---- Bucket wheel ----
const XW = LB;
B('wheel-rim', latheY([[RW - 300, YW - 400], [RW - 300, YW + 400]], XW, 0, 20).subtract(latheY([[RW - 700, YW - 500], [RW - 700, YW + 500]], XW, 0, 20)), machinePaint);
B('wheel-hub', latheY([[600, YW - 450], [600, YW + 450]], XW, 0, 12), frameSteel);
B('wheel-shaft', latheY([[260, YW + 450], [260, -H + 100]], XW, 0, 10), chrome);
for (let i = 0; i < 6; i++) B(`wheel-spoke-${i}`, blk(-180, YW - 200, 500, 180, YW + 200, RW - 650).rotateY(i * 60 + 15).translate(XW, 0, 0), machinePaint);
for (let i = 0; i < 10; i++) {
  const bucket = blk(-550, YW - 450, RW - 350, 550, YW + 450, RW + 350)
    .union(blk(350, YW - 450, RW + 350, 550, YW + 450, RW + 550));
  B(`bucket-${i}`, bucket.rotateY(i * 36).translate(XW, 0, 0), frameSteel);
  for (const [m, dy] of [-300, 0, 300].entries()) B(`bucket-tooth-${i}-${m}`, blk(550, YW + dy - 60, RW + 380, 760, YW + dy + 60, RW + 520).rotateY(i * 36).translate(XW, 0, 0), chrome);
}
B('wheel-gearbox', blk(XW - 900, -H - 100, -900, XW + 900, -H + 400, 900), frameSteel);
B('wheel-motor', latheY([[350, -H + 400], [350, H + 200]], XW - 1200, -400, 12), '#3d6f9a');
B('wheel-chute', blk(XW - 2200, -H - 300, H - 200, XW - 600, H + 300, H + 1100), machinePaint);

// ---- Stockpile with half-cone ends ----
const YR = 19000, HW = 9000, HP = 8000, PX0 = 6000, PX1 = 34000;
add('stockpile', prismX([[YR - HW, 0], [YR + HW, 0], [YR, HP]], PX0, PX1).color(stockpile));
add('pile-end-west', lathe([[HW, 0], [60, HP]], 16).translate(PX0, YR, 0).subtract(blk(PX0, YR - HW - 100, -10, PX0 + HW + 100, YR + HW + 100, HP + 10)).color(stockpile));
add('pile-end-east', lathe([[HW, 0], [60, HP]], 16).translate(PX1, YR, 0).subtract(blk(PX1 - HW - 100, YR - HW - 100, -10, PX1, YR + HW + 100, HP + 10)).color(stockpile));
if (stacking) {
  const tip = bmPt(LB - 300, 0, H + 300);
  add('ore-stream', sw(lathe([[900, 3200], [350, tip[2]]], 9).translate(tip[0] + 400, 0, 0)).color(stockpile));
}

// ---- Yard conveyor and trailing tripper on the -Y side ----
const YY = -6800, ZY = 1500;
add('yard-belt', blk(-15000, YY - 600, ZY - 20, 15000, YY + 600, ZY).color(beltRubber));
add('yard-ore', prismX([[YY - 400, ZY], [YY + 400, ZY], [YY + 180, ZY + 220], [YY - 180, ZY + 220]], -15000, -7000).color(stockpile));
for (const [k, s] of [-1, 1].entries()) {
  add(`yard-stringer-${k}`, blk(-15000, YY + s * 800 - 80, ZY - 450, 15000, YY + s * 800 + 80, ZY - 200).color(frameSteel));
  for (let x = -14000, i = 0; x <= 14000; x += 4000, i++) add(`yard-leg-${k}-${i}`, blk(x - 70, YY + s * 800 - 70, 0, x + 70, YY + s * 800 + 70, ZY - 450).color(frameSteel));
}
// The tripper lifts the yard belt up a ramp to a head chute that feeds the machine.
const TA = 14, TX0 = -11000, TL = 9000;
const tc = Math.cos((TA * Math.PI) / 180), ts = Math.sin((TA * Math.PI) / 180);
const tripper = (s) => s.rotateY(-TA).translate(TX0, 0, ZY + 100);
add('tripper-frame', tripper(blk(0, YY - 900, -700, TL, YY + 900, -100)).color(machinePaint));
add('tripper-belt', tripper(blk(0, YY - 600, -60, TL, YY + 600, 0)).color(beltRubber));
const [hx, hz] = [TX0 + TL * tc, ZY + 100 + TL * ts];
add('tripper-head', blk(hx - 700, YY - 1000, hz - 900, hx + 900, YY + 1000, hz + 700).color(machinePaint));
add('tripper-chute', blk(hx + 200, YY + 600, hz - 1600, hx + 900, -RY - 600, hz - 600).color(machinePaint));
for (const [k, x] of [TX0 + 3000, hx].entries()) {
  for (const [m, s] of [-1, 1].entries()) add(`tripper-leg-${k}-${m}`, blk(x - 120, YY + s * 1000 - 120, 0, x + 120, YY + s * 1000 + 120, ZY + 100 + (x - TX0) * ts / tc - 700).color(machinePaint));
}

return p.model();
