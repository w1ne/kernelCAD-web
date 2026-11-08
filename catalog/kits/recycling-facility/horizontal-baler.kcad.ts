// SPDX-License-Identifier: CC0-1.0
// Horizontal baler: the closed-door horizontal baler that a supermarket
// back dock or small MRF uses for cardboard and film. What makes it that
// machine rather than a vertical baler or a two-ram baler: material drops
// through a top hopper into a long horizontal chamber, a single main ram
// drives it toward the far end against a hinged bale door, and the bale is
// hand-tied through slots in the door and pushed out by the same ram once
// the door swings open. Here the door is open and a tied cardboard bale is
// half out onto a roller table; the hopper has a hinged safety lid, the
// main cylinder sits in a long rear housing and the power pack and control
// panel stand beside it.
// Generic visualization geometry at about real size (7.6 m long, 2.5 m
// wide, 2.7 m high), millimetres, Z up, bale door toward -X.

meta({
  name: "horizontal-baler",
  license: 'CC0-1.0',
  title: "Horizontal baler",
  description: "Closed-door horizontal baler at about real size: long ribbed baling chamber with a top feed hopper and hinged safety lid, single main ram cylinder in a rear housing, bale door with tie slots swung open on heavy hinges with its locking wheel, a wire-tied cardboard bale half pushed out onto a roller table, wire coil stand, power pack and control panel. Material controls: machine paint, hydraulics and hardware, door and hinge steel, bale material. plant, weathered, filmBales and highVisibility presets; door open or closed.",
  tags: ["recycling", "horizontal baler", "closed-door baler", "baler", "bale", "cardboard bale", "hydraulic ram", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machinePaint = param('machinePaint', '#e0a526', { label: 'Machine body (paint)' });
const hydraulics = param('hydraulics', '#c9ced1', { label: 'Hydraulics and hardware (steel)' });
const doorSteel = param('doorSteel', '#3c454c', { label: 'Bale door and hinges (steel)' });
const bale = param('bale', '#b08550', { label: 'Bale material' });
const door = param('door', 'open', { choices: ['open', 'closed'], label: 'Bale door' });

presets({
  plant: { machinePaint: '#e0a526', hydraulics: '#c9ced1', doorSteel: '#3c454c', bale: '#b08550' },
  weathered: { machinePaint: '#a88a45', hydraulics: '#8f928d', doorSteel: '#4a4642', bale: '#8f7754' },
  filmBales: { machinePaint: '#2b67ad', hydraulics: '#c9ced1', doorSteel: '#2f3438', bale: '#d9dfe2' },
  highVisibility: { machinePaint: '#e3742b', hydraulics: '#d0d5d3', doorSteel: '#2f3438', bale: '#c49b5b' },
});

const p = assembly("horizontal-baler");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const dark = '#23282c';
const isOpen = door.value === 'open';

// Baling chamber: door end at x -1800, cylinder end at x 1800.
const X0 = -1800, X1 = 1800, D = 1500, H = 1500, ZB = 150;
const BW = 1100, BH = 1000, BZ = ZB + 150; // bale channel cross-section
add("base-skid", blk(0, 0, 0, X1 - X0 + 200, D + 200, ZB).color(dark));
add("chamber", blk(0, 0, ZB, X1 - X0, D, H - ZB).subtract(blk(X0, 0, BZ, 200, BW, BH)).color(machinePaint));
add("channel-mouth", blk(X0 + 20, 0, BZ, 40, BW, BH).color(dark));
for (const x of [-1300, -700, -100, 500, 1100]) {
  add(`chamber-rib-f-${x}`, blk(x, -D / 2 - 40, ZB, 110, 80, H - ZB).color(machinePaint));
  add(`chamber-hoop-${x}`, blk(x, 0, H, 110, D + 160, 80).color(machinePaint));
}

// Top feed hopper with a hinged safety lid swung back.
const XH = 500, HH = 900;
const outer = rectPath(700, 650).loft([rectPath(900, 850)], { spacing: HH, ruled: true });
const inner = rectPath(660, 610).loft([rectPath(860, 810)], { spacing: HH + 20, ruled: true });
add("feed-hopper", outer.subtract(inner).translate(XH, 0, H).color(machinePaint));
add("hopper-rim", blk(XH, 0, H + HH - 50, 1860, 1760, 50).subtract(blk(XH, 0, H + HH - 70, 1700, 1600, 90)).color(dark));
const lidHinge = (s: Shape) => s.translate(0, -850, -(H + HH)).rotateX(-110).translate(0, 850, H + HH);
add("safety-lid", lidHinge(blk(XH, 0, H + HH, 1800, 1700, 40)).color(machinePaint));
add("lid-mesh-window", lidHinge(blk(XH, 0, H + HH - 10, 1200, 1100, 10)).color(dark));
add("hopper-cardboard", box(900, 700, 120, true).rotateZ(20).rotateY(-8).translate(XH - 100, -100, H + 500).color(bale));
add("hopper-cardboard-2", box(700, 500, 120, true).rotateZ(-35).rotateY(10).translate(XH + 200, 150, H + 620).color('#c49b5b'));

// Main cylinder in a long rear housing.
add("cylinder-housing", blk(X1 + 1100, 0, ZB, 2200, 1000, 800).subtract(blk(X1 + 1100, -520, 400, 1800, 160, 400)).color(machinePaint));
add("main-cylinder", cylinder(2100, 220, 16).rotateY(90).translate(X1 + 50, 0, 700).color(hydraulics));
add("main-cylinder-cap", cylinder(100, 280, 16).rotateY(90).translate(X1 + 2150, 0, 700).color(dark));
add("housing-end", blk(X1 + 2250, 0, ZB, 100, 1200, 1100).color(machinePaint));

// Bale door hinged on the +Y side of the mouth; open, it swings back along -X.
const HY = BW / 2 + 200; // hinge line y
const doorSwing = (s: Shape) => (isOpen ? s.translate(-X0, -HY, 0).rotateZ(-100).translate(X0, HY, 0) : s);
const DT = 160, DW = BW + 420, DH = BH + 300;
add("bale-door", doorSwing(blk(X0 - DT / 2, HY - DW / 2, ZB + 20, DT, DW, DH)).color(doorSteel));
for (let i = 0; i < 4; i++) for (const [f, dx] of [['out', -DT - 3], ['in', 3]] as [string, number][]) {
  add(`tie-slot-${f}-${i}`, doorSwing(blk(X0 + dx, HY - 400 - i * 240, ZB + 180, 8, 40, DH - 320)).color(dark));
}
for (const z of [ZB + 220, ZB + DH - 220]) add(`door-hinge-${z < 800 ? 'lo' : 'hi'}`, cylinder(200, 60, 10).translate(X0 - DT / 2, HY, z - 100).color(doorSteel));
add("lock-wheel", doorSwing(cylinder(40, 220, 14).rotateY(-90).translate(X0 - DT, HY - DW + 300, ZB + DH / 2)).color('#c23a2f'));
add("lock-wheel-hub", doorSwing(cylinder(80, 50, 10).rotateY(-90).translate(X0 - DT, HY - DW + 300, ZB + DH / 2)).color(hydraulics));
add("door-keeper", blk(X0 - 60, -BW / 2 - 260, ZB + 300, 120, 160, DH - 400).color(doorSteel));

// Wire-tied bale half pushed out onto a roller table (in the chamber when closed).
const bx = isOpen ? X0 - 500 : X0 + 700;
const BL = 1300;
add("bale", blk(bx, 0, BZ, BL, BW - 40, BH - 40).color(bale));
for (let i = 0; i < 4; i++) {
  const y = -BW / 2 + 260 + i * 200;
  add(`bale-wire-top-${i}`, blk(bx, y, BZ + BH - 40, BL, 14, 10).color(hydraulics));
  add(`bale-wire-end-${i}`, blk(bx - BL / 2 - 4, y, BZ, 10, 14, BH - 40).color(hydraulics));
}
add("bale-side-strip", blk(bx, -BW / 2 + 18, BZ + 300, BL - 200, 6, 60).color('#d9d4c3'));
add("bale-side-strip-2", blk(bx + 100, -BW / 2 + 18, BZ + 600, BL - 400, 6, 40).color('#2f6db0'));
const TX0 = X0 - 100, TX1 = X0 - 1900;
for (const s of [-1, 1]) add(`table-rail-${s < 0 ? 'f' : 'b'}`, blk((TX0 + TX1) / 2, s * 560, 0, TX0 - TX1, 80, BZ).color(machinePaint));
for (let i = 0; i < 7; i++) add(`table-roller-${i}`, cylinder(1100, 40, 10).rotateX(90).translate(TX0 - 120 - i * 260, 550, BZ - 40).color(hydraulics));

// Tie-wire coil stand beside the door, power pack and control panel at the back.
add("coil-stand", blk(X0 - 600, BW / 2 + 900, 0, 120, 120, 1100).color(machinePaint));
add("wire-coil", cylinder(160, 320, 16).subtract(cylinder(180, 220, 16).translate(0, 0, -10)).rotateX(90).translate(X0 - 600, BW / 2 + 820, 1000).color(hydraulics));
add("power-pack", blk(X1 + 900, D / 2 + 500, 0, 1200, 700, 800).color(machinePaint));
add("motor", cylinder(560, 190, 14).rotateY(90).translate(X1 + 520, D / 2 + 500, 990).color(hydraulics));
add("oil-filter", cylinder(250, 70, 10).translate(X1 + 1300, D / 2 + 380, 800).color('#c23a2f'));
add("control-panel", blk(-400, -D / 2 - 140, 700, 600, 200, 700).color('#d7dadc'));
add("control-face", blk(-400, -D / 2 - 242, 760, 500, 6, 560).color(dark));
add("e-stop", cylinder(30, 45, 10).rotateX(90).translate(-560, -D / 2 - 245, 1250).color('#d43a2f'));
add("cycle-button", cylinder(30, 30, 10).rotateX(90).translate(-400, -D / 2 - 245, 1250).color('#3fa64a'));
add("bale-full-lamp", cylinder(30, 30, 10).rotateX(90).translate(-260, -D / 2 - 245, 1250).color('#f2c230'));

return p.model();
