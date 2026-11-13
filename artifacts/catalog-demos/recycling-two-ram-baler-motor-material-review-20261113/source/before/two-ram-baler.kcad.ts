// SPDX-License-Identifier: CC0-1.0
// Two-ram baler: the heavy MRF baler that presses sorted paper, cardboard,
// plastics or cans into dense wire-tied bales. What makes it a two-ram
// baler rather than a single-ram channel baler: a main ram drives material
// along a closed chamber against a fixed wall, then a second, cross-mounted
// ejection ram pushes the finished bale out sideways through a side door.
// Around that: a tall feed hopper fed by an inclined belt conveyor, the
// long main cylinder housing at the back, an automatic wire tier gantry
// over the exit, a roller discharge table with a tied bale on it, a
// power pack on the cylinder housing and a control cabinet.
// Generic visualization geometry at about real size (10 m long, 8 m deep
// including the infeed belt, 3.7 m high), millimetres, Z up, bale exit
// toward -Y.

meta({
  name: "two-ram-baler",
  license: 'CC0-1.0',
  title: "Two-ram baler",
  description: "Two-ram MRF baler at about real size: ribbed baling chamber, tall feed hopper fed by an inclined belt conveyor, long main cylinder housing at the rear, cross-mounted ejection cylinder pushing a finished bale out of a side door, automatic wire tier gantry with spool over the exit, roller discharge table with a wire-tied bale, power pack on the cylinder housing and control cabinet. Material controls: machine paint, hydraulics, tie wire and rollers, bale material. plant, weathered, plasticBales and highVisibility presets.",
  tags: ["recycling", "two-ram baler", "baler", "bale", "wire tier", "hydraulic press", "cardboard bale", "materials recovery", "MRF", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machinePaint = param('machinePaint', '#2c8a57', { label: 'Machine body (paint)' });
const hydraulics = param('hydraulics', '#c9ced1', { label: 'Hydraulic cylinders (steel)' });
const tieWire = param('tieWire', '#8d969b', { label: 'Tie wire, rollers and gantry' });
const bale = param('bale', '#b08550', { label: 'Bale material' });

presets({
  plant: { machinePaint: '#2c8a57', hydraulics: '#c9ced1', tieWire: '#8d969b', bale: '#b08550' },
  weathered: { machinePaint: '#56664f', hydraulics: '#8f928d', tieWire: '#6f716b', bale: '#8f7754' },
  plasticBales: { machinePaint: '#2b67ad', hydraulics: '#c9ced1', tieWire: '#9aa2a7', bale: '#6aa0c8' },
  highVisibility: { machinePaint: '#e3742b', hydraulics: '#d0d5d3', tieWire: '#2f3438', bale: '#c49b5b' },
});

const p = assembly("two-ram-baler");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const dark = '#23282c';

// Baling chamber from the ejection end (x -1600) to the cylinder end (x 2600).
const X0 = -1600, X1 = 2600, D = 1600, H = 1750;
const XE = -900; // ejection station centre
add("base-skid", blk((X0 + X1) / 2, 0, 0, X1 - X0 + 200, D + 200, 150).color(dark));
add("chamber", blk((X0 + X1) / 2, 0, 150, X1 - X0, D, H - 150)
  .subtract(blk(XE, -D / 2, 300, 1220, 400, 840)).color(machinePaint));
for (const x of [-200, 400, 1000, 1600, 2200]) add(`chamber-rib-${x}`, blk(x, -D / 2 - 40, 150, 110, 80, H - 150).color(machinePaint));
for (const x of [-1550, -250]) add(`door-post-${x < -1000 ? 'l' : 'r'}`, blk(x, -D / 2 - 50, 150, 100, 100, H - 150).color(machinePaint));
add("door-lintel", blk(XE, -D / 2 - 50, 1180, 1400, 100, 160).color(machinePaint));
add("ejection-mouth", blk(XE, -D / 2 + 10, 300, 1200, 20, 840).color(dark));

// Ejection cylinder mounted across the chamber on the +Y side.
add("eject-cylinder-frame", blk(XE, D / 2 + 700, 150, 700, 1400, 200).color(machinePaint));
add("eject-cylinder", cylinder(1500, 170, 14).rotateX(-90).translate(XE, D / 2, 720).color(hydraulics));
add("eject-cylinder-cap", cylinder(90, 220, 14).rotateX(-90).translate(XE, D / 2 + 1500, 720).color(dark));
add("eject-end-plate", blk(XE, D / 2 + 1620, 150, 700, 120, 1150).color(machinePaint));

// Tall feed hopper over the main ram stroke, open at the top.
const XH = 900, HZ = H, HH = 1450;
const outer = rectPath(800, 700).loft([rectPath(1150, 1100)], { spacing: HH, ruled: true });
const inner = rectPath(760, 660).loft([rectPath(1110, 1060)], { spacing: HH + 20, ruled: true });
add("feed-hopper", outer.subtract(inner).translate(XH, 0, HZ).color(machinePaint));
add("hopper-rim", blk(XH, 0, HZ + HH - 60, 2380, 2280, 60).subtract(blk(XH, 0, HZ + HH - 80, 2220, 2120, 100)).color(dark));
add("hopper-fill", sphere(700).scale([1.4, 1.3, 0.45]).translate(XH, 0, HZ + 1050).color(bale));
add("level-sensor", blk(XH - 1050, -1000, HZ + HH, 140, 140, 120).color('#f2c230'));

// Inclined infeed belt conveyor arriving at the hopper from +Y.
const Y0 = 6200, Z0 = 350, Y1 = 900, Z1 = HZ + HH + 150;
const L = Math.hypot(Y0 - Y1, Z1 - Z0), ANG = Math.atan2(Z1 - Z0, Y0 - Y1) * 180 / Math.PI;
const onBelt = (s: Shape) => s.rotateX(-ANG).translate(XH, Y1, Z1);
add("infeed-belt", onBelt(blk(0, L / 2, -40, 1100, L, 40)).color('#2b2f33'));
for (const s of [-1, 1]) add(`infeed-skirt-${s < 0 ? 'l' : 'r'}`, onBelt(blk(s * 600, L / 2, -110, 80, L, 220)).color(machinePaint));
for (let i = 0; i < 8; i++) add(`infeed-cleat-${i}`, onBelt(blk(0, 300 + i * L / 8, 0, 1080, 40, 40)).color(dark));
for (let i = 0; i < 4; i++) add(`infeed-paper-${i}`, onBelt(box(420, 340, 70, true).rotateZ(i * 37).translate(-250 + (i % 2) * 420, 600 + i * 820, 35)).color(i % 2 ? '#d9d4c3' : bale));
for (const t of [0.35, 0.7]) {
  const y = Y1 + t * (Y0 - Y1), zt = Z1 - t * (Z1 - Z0) - 250;
  for (const s of [-1, 1]) add(`infeed-leg-${Math.round(t * 10)}-${s < 0 ? 'l' : 'r'}`, blk(XH + s * 520, y, 0, 120, 120, zt).color(machinePaint));
}

// Main cylinder housing running back from the chamber.
add("cylinder-housing", blk(X1 + 1500, 0, 150, 3000, 1100, 900).subtract(blk(X1 + 1500, -560, 450, 2600, 200, 500)).color(machinePaint));
add("main-cylinder", cylinder(2700, 260, 16).rotateY(90).translate(X1 + 150, 0, 900).color(hydraulics));
add("main-cylinder-cap", cylinder(120, 320, 16).rotateY(90).translate(X1 + 2850, 0, 900).color(dark));
add("housing-end", blk(X1 + 3050, 0, 150, 120, 1300, 1400).color(machinePaint));

// Power pack on the cylinder housing: tank, two motor-pump sets, filter.
const PZ = 1050;
add("oil-tank", blk(4300, 150, PZ, 1100, 800, 550).color(machinePaint));
for (const [i, y] of [[0, -100], [1, 400]] as [number, number][]) {
  add(`motor-${i}`, cylinder(600, 180, 14).rotateY(90).translate(3300, y, PZ + 330).color(hydraulics));
  add(`motor-cowl-${i}`, cylinder(50, 190, 14).rotateY(90).translate(3250, y, PZ + 330).color(dark));
}
add("return-filter", cylinder(300, 80, 10).translate(4600, -150, PZ + 550).color('#c23a2f'));
add("guard-rail", blk(4000, -500, PZ + 900, 2000, 40, 40).color('#f2c230'));
for (const x of [3000, 5000]) add(`guard-post-${x}`, blk(x, -500, PZ, 40, 40, 940).color('#f2c230'));

// Automatic wire tier gantry straddling the bale exit.
const YT = -D / 2 - 900;
for (const x of [XE - 900, XE + 900]) add(`tier-post-${x < XE ? 'l' : 'r'}`, blk(x, YT, 0, 160, 160, 2100).color(tieWire));
add("tier-beam", blk(XE, YT, 2100, 1960, 260, 240).color(tieWire));
add("tier-head", blk(XE, YT, 1600, 1500, 200, 500).color(machinePaint));
for (let i = 0; i < 5; i++) add(`tier-needle-${i}`, blk(XE - 480 + i * 240, YT, 1250, 40, 60, 350).color(hydraulics));
add("wire-spool", cylinder(200, 300, 16).rotateX(90).translate(XE + 500, YT + 100, 2640).color(tieWire));
add("wire-spool-core", cylinder(220, 90, 10).rotateX(90).translate(XE + 500, YT + 110, 2640).color(dark));

// Roller discharge table with the finished wire-tied bale.
const YR0 = -D / 2 - 200, YR1 = -D / 2 - 2400;
for (const x of [XE - 650, XE + 650]) add(`table-rail-${x < XE ? 'l' : 'r'}`, blk(x, (YR0 + YR1) / 2, 0, 80, YR0 - YR1, 300).color(tieWire));
for (let i = 0; i < 9; i++) add(`table-roller-${i}`, cylinder(1220, 45, 10).rotateY(90).translate(XE - 610, YR0 - 120 - i * 250, 300).color(hydraulics));
const BY = -D / 2 - 1250, BW = 1150, BD = 780, BH = 800;
add("tied-bale", blk(XE, BY, 345, BW, BD, BH).color(bale));
for (let i = 0; i < 5; i++) {
  const x = XE - 460 + i * 230;
  add(`bale-wire-front-${i}`, blk(x, BY - BD / 2 - 4, 345, 14, 10, BH).color(tieWire));
  add(`bale-wire-top-${i}`, blk(x, BY, 345 + BH, 14, BD, 10).color(tieWire));
}
add("bale-label", blk(XE + 300, BY - BD / 2 - 6, 750, 220, 6, 150).color('#f2f2ee'));
for (let i = 0; i < 4; i++) add(`bale-strip-${i}`, blk(XE - 200 + i * 60, BY - BD / 2 - 3, 420 + i * 90, 300, 6, 30).color(i % 2 ? '#d9d4c3' : '#2f6db0'));

// Control cabinet back-left, clear of the view.
add("control-cabinet", blk(X0 - 500, 700, 0, 600, 500, 1900).color('#d7dadc'));
add("control-face", blk(X0 - 500, 446, 900, 460, 6, 700).color(dark));
add("beacon", cylinder(160, 70, 10).translate(X0 - 500, 700, 1900).color('#f2a03a'));

return p.model();
