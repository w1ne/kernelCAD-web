// SPDX-License-Identifier: CC0-1.0
// Eddy-current separator: the machine that throws aluminium and copper out
// of a mixed stream. A vibratory pan feeds a single layer of material onto
// a short fast belt. The head pulley is a shell spinning around a
// high-speed magnetic rotor, which induces eddy currents in non-ferrous
// metal so cans leap off in a long arc and clear an adjustable splitter
// into the metals chute, while plastics, paper and glass just drop off the
// end into the residue chute. What makes it that machine rather than a
// plain conveyor: the feeder pan, the oversized rotor head with its own
// drive motor, the knife-edge splitter and the two chutes, with cans
// visibly in flight. Generic visualization geometry at about real size
// (6.3 m long, 2.4 m wide, 1.7 m high), millimetres, Z up, belt along X.

meta({
  name: "eddy-current-separator",
  license: 'CC0-1.0',
  title: "Eddy-current separator",
  description: "Eddy-current separator at about real size: spring-mounted vibratory feeder pan with twin vibrator motors, short fast belt over a tail pulley, magnetic rotor head drum with its own drive motor, knife-edge splitter, residue and metals chutes over collection bins, aluminium cans in flight over the splitter and mixed residue on the belt, rear guard wall and control cabinet. Material controls: machine frame, belt, magnetic rotor, recovered metal. plant, weathered, copper and highVisibility presets.",
  tags: ["recycling", "eddy-current separator", "ECS", "non-ferrous", "aluminium recovery", "magnetic rotor", "metal separation", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6f9e', { label: 'Machine frame (paint)' });
const belt = param('belt', '#2a2e31', { label: 'Belt (rubber)' });
const rotor = param('rotor', '#c23b2f', { label: 'Magnetic rotor shell' });
const metal = param('metal', '#c9d0d4', { label: 'Recovered metal (cans)' });

presets({
  plant: { frame: '#2f6f9e', belt: '#2a2e31', rotor: '#c23b2f', metal: '#c9d0d4' },
  weathered: { frame: '#58645e', belt: '#3a3b38', rotor: '#8a4b3c', metal: '#a7aaa5' },
  copper: { frame: '#e7e3d6', belt: '#2a2e31', rotor: '#2c5d8a', metal: '#c77b45' },
  highVisibility: { frame: '#e3742b', belt: '#1f2326', rotor: '#2f3438', metal: '#e0e5e8' },
});

const p = assembly("eddy-current-separator");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const dark = '#23282c';
const steel = '#a9b1b5';

// Belt along X: tail pulley at -X, magnetic head drum at +X.
const BW = 1500, XT = -1500, XH = 1500, ZP = 950, RP = 150, RH = 210;
const ZB = ZP + RP; // belt top
add("tail-pulley", cylinder(BW, RP, 16).rotateX(90).translate(XT, BW / 2, ZP).color(steel));
add("head-shell", cylinder(BW, RH, 18).rotateX(90).translate(XH, BW / 2, ZP + RP - RH).color(rotor));
for (const s of [-1, 1]) add(`rotor-cap-${s < 0 ? 'f' : 'b'}`, cylinder(40, RH - 40, 18).rotateX(90).translate(XH, s * (BW / 2 + 40) + 20, ZP + RP - RH).color(dark));
add("belt-top", blk(0, 0, ZB - 15, XH - XT, BW - 40, 15).color(belt));
add("belt-return", blk(0, 0, ZP - RP - 30, XH - XT - 200, BW - 40, 15).color(belt));

// Side frames with skirt boards, on four legs.
for (const s of [-1, 1]) {
  const y = s * (BW / 2 + 40);
  add(`side-frame-${s < 0 ? 'f' : 'b'}`, profileXZ([[XT - 120, ZP - 220], [XH - 260, ZP - 220], [XH - 260, ZB - 40], [XT - 120, ZB - 40]], 50).translate(0, y, 0).color(frame));
  add(`skirt-${s < 0 ? 'f' : 'b'}`, blk(-200, s * (BW / 2 - 40), ZB, 2400, 20, 90).color(dark));
  for (const x of [XT + 150, XH - 400]) {
    add(`leg-${s < 0 ? 'f' : 'b'}-${x}`, blk(x, y, 0, 140, 140, ZP - 220).color(frame));
    add(`foot-${s < 0 ? 'f' : 'b'}-${x}`, blk(x, y, 0, 260, 260, 25).color(frame));
  }
}
add("cross-brace", blk(XT + 150, 0, 300, 120, BW + 80, 120).color(frame));

// Rotor drive motor and belt guard on the +Y side of the head.
add("rotor-motor", cylinder(500, 190, 14).rotateX(90).translate(XH - 500, BW / 2 + 650, ZP - 380).color(frame));
add("motor-base", blk(XH - 500, BW / 2 + 400, 0, 500, 500, ZP - 570).color(frame));
add("drive-guard", profileXZ([[XH - 700, ZP - 420], [XH - 300, ZP - 420], [XH + 220, ZP - 160], [XH + 220, ZP + 200], [XH - 200, ZP + 200]], 80).translate(0, BW / 2 + 140, 0).color('#f2c230'));

// Vibratory feeder pan on coil springs over a base frame.
const XF0 = -2900, XF1 = XT + 100, ZF = 1260;
add("feeder-base", blk((XF0 + XF1) / 2, 0, 0, XF1 - XF0 - 200, BW, 900).subtract(blk((XF0 + XF1) / 2, -BW / 2, 150, XF1 - XF0 - 500, 400, 600)).color(frame));
for (const x of [XF0 + 250, XF1 - 350]) for (const s of [-1, 1]) add(`spring-${x}-${s < 0 ? 'f' : 'b'}`, cylinder(ZF - 900, 70, 10).translate(x, s * (BW / 2 - 150), 900).color('#e0b12c'));
add("feeder-pan", profileXZ([[XF0, ZF], [XF1, ZF + 30], [XF1, ZF + 70], [XF0 + 60, ZF + 260], [XF0, ZF + 260]], BW).subtract(blk((XF0 + XF1) / 2 + 60, 0, ZF + 60, XF1 - XF0, BW - 80, 400)).color(steel));
for (const s of [-1, 1]) add(`vibrator-${s < 0 ? 'f' : 'b'}`, cylinder(320, 140, 12).rotateX(90).translate(XF0 + 800, s * (BW / 2 + 160) + 160, ZF + 120).color(dark));

// Knife-edge splitter and the two chutes over bins.
const XS = XH + 640;
add("splitter", profileXZ([[XS - 30, 640], [XS + 30, 640], [XS + 10, 1000], [XS - 10, 1000]], BW + 60).color(steel));
add("splitter-pivot", cylinder(BW + 160, 40, 10).rotateX(90).translate(XS, BW / 2 + 80, 650).color(dark));
const chute = (x0: number, x1: number, top: number) => profileXZ([[x0, top], [x1, top], [x1 - 80, top - 260], [x0 + 80, top - 260]], BW + 40)
  .subtract(profileXZ([[x0 + 40, top + 10], [x1 - 40, top + 10], [x1 - 110, top - 270], [x0 + 110, top - 270]], BW - 40));
add("residue-chute", chute(XH - 220, XS - 30, 650).color(frame));
add("metals-chute", chute(XS + 30, XS + 1000, 650).color(frame));
const bin = (x: number, w: number, c: string, n: string) => add(n, blk(x, 0, 0, w, BW + 100, 390).subtract(blk(x, 0, 60, w - 80, BW + 20, 400)).color(c));
bin((XH - 220 + XS) / 2, XS - XH + 160, '#4b8c3a', "residue-bin");
bin(XS + 515, 1000, '#8a9196', "metals-bin");

// Rear guard wall behind the throw zone.
add("rear-guard", profileXZ([[XH - 300, 400], [XS + 1050, 400], [XS + 1050, 1700], [XH - 300, 1700]], 40).translate(0, BW / 2 + 70, 0).color(frame));
add("rear-guard-post", blk(XS + 1050, BW / 2 + 70, 0, 100, 100, 1700).color(frame));

// Material: mixed residue on the belt, cans riding and leaping off the rotor.
const junk: [number, number, number, number][] = [[-1100, -300, 220, 20], [-700, 350, 160, -35], [-300, -100, 200, 60], [200, 400, 180, 15], [600, -350, 240, -50], [1000, 150, 170, 30]];
junk.forEach(([x, y, w, a], i) => add(`residue-${i}`, box(w, w * 0.6, 30, true).rotateZ(a).translate(x, y, ZB + 15).color(['#3d7fbf', '#d8cfb6', '#4a9a52'][i % 3])));
const can = () => cylinder(120, 33, 10).translate(0, 0, -60);
for (let i = 0; i < 5; i++) add(`can-belt-${i}`, can().rotateX(90).rotateZ(i * 37).translate(-900 + i * 450, -500 + (i % 3) * 450, ZB + 33).color(metal));
for (let i = 0; i < 7; i++) {
  const t = (i + 1) / 8;
  const x = XH + 150 + t * 1200;
  const z = ZB + 80 + 420 * t - 900 * t * t;
  add(`can-flight-${i}`, can().rotateY(i * 55).rotateX(30 + i * 20).translate(x, -450 + (i % 3) * 420, z).color(metal));
}
for (let i = 0; i < 6; i++) add(`can-bin-${i}`, can().rotateX(90).rotateZ(i * 60).translate(XS + 300 + (i % 3) * 220, -400 + i * 160, 100).color(metal));
add("residue-heap", sphere(420).scale([1.1, 1.6, 0.5]).translate((XH - 220 + XS) / 2, 0, 60).subtract(blk((XH - 220 + XS) / 2, 0, -400, 1400, 1600, 460)).color('#8f8a7a'));

// Control cabinet back-left with a beacon.
add("control-cabinet", blk(-2600, BW / 2 + 500, 0, 700, 400, 1800).color('#d7dadc'));
add("control-face", blk(-2600, BW / 2 + 297, 800, 560, 6, 700).color(dark));
add("e-stop", cylinder(30, 45, 10).rotateX(90).translate(-2800, BW / 2 + 294, 1400).color('#d43a2f'));
add("beacon", cylinder(160, 60, 10).translate(-2600, BW / 2 + 500, 1800).color('#f2a430'));

return p.model();
