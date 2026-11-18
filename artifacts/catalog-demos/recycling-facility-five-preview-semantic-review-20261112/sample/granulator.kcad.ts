// SPDX-License-Identifier: CC0-1.0
// Granulator: the high-speed plastics granulator that cuts sorted plastic
// parts, purgings and bottles into regrind flakes small enough to pass a
// screen. What makes it that machine rather than a shredder: one fast open
// rotor carrying long knife blades against a bed knife in a round cutting
// chamber; a tall feed hopper with a rubber flap curtain that hinges back on
// the chamber split line for knife changes (shown open here); a heavy
// flywheel pulley and V-belt drive from a side motor; and a regrind bin
// pulled out from under the screen.
// Generic visualization geometry at about real size (2.3 m wide, 2.2 m
// deep, 1.9 m high), millimetres, Z up, bin toward -Y.

meta({
  name: "granulator",
  license: 'CC0-1.0',
  title: "Granulator",
  description: "Plastics granulator at about real size: open knife rotor and bed knife in a round cutting chamber, tall feed hopper with rubber flap curtain hinged back for service (or closed), exposed flywheel pulley with V-belts and guard down to a side motor, leg stand, control box and a regrind bin of flakes pulled out underneath. Material controls: machine paint, knives and rotor, drive, regrind plastic. plant, weathered, cream and highVisibility presets; chamber open or closed.",
  tags: ["recycling", "granulator", "plastic granulator", "regrind", "knife rotor", "size reduction", "plastics recycling", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', '#2b67ad', { label: 'Machine body (paint)' });
const knives = param('knives', '#c3c9cc', { label: 'Rotor and knives (steel)' });
const drive = param('drive', '#3a3f44', { label: 'Flywheel, belts and motor' });
const regrind = param('regrind', '#3fa66b', { label: 'Regrind plastic flakes' });
const chamber = param('chamber', 'open', { choices: ['open', 'closed'], label: 'Cutting chamber' });

presets({
  plant: { paint: '#2b67ad', knives: '#c3c9cc', drive: '#3a3f44', regrind: '#3fa66b' },
  weathered: { paint: '#4f6377', knives: '#8f918c', drive: '#3d3a36', regrind: '#8a8f6a' },
  cream: { paint: '#e7e1cf', knives: '#b9c0c3', drive: '#2f6a4c', regrind: '#d84b3a' },
  highVisibility: { paint: '#e3742b', knives: '#cdd3d6', drive: '#2f3438', regrind: '#2f8fd6' },
});

const p = assembly("granulator");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const ZC = 1050, R = 420, CW = 900; // chamber axis height, radius, width
const isOpen = chamber.value === 'open';
// Hopper hinges on the back edge of the chamber split line.
const hinge = (s: Shape) => (isOpen ? s.translate(0, -R, -ZC).rotateX(-105).translate(0, R, ZC) : s);

// Leg stand with side panels around the screen cradle.
for (const [x, y] of [[-420, -420], [420, -420], [-420, 420], [420, 420]]) add(`leg-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 120, 120, ZC - 200).color(paint));
for (const s of [-1, 1]) add(`side-panel-${s < 0 ? 'l' : 'r'}`, blk(s * 450, 0, 300, 60, 960, ZC - 500).color(paint));
add("back-panel", blk(0, 450, 300, 960, 60, ZC - 500).color(paint));
add("bin-rail", blk(0, -300, 120, 960, 40, 40).color(paint));

// Lower chamber: a round bowl with closed ends, split at the axis.
const bowl = cylinder(CW, R, 18).rotateY(90).translate(-CW / 2, 0, ZC)
  .subtract(blk(0, 0, ZC, CW + 20, 2 * R + 20, R + 20))
  .subtract(cylinder(CW - 80, R - 40, 18).rotateY(90).translate(-(CW - 80) / 2, 0, ZC));
add("chamber-bowl", bowl.color(paint));
add("split-flange", blk(0, 0, ZC - 30, CW + 60, 2 * R + 60, 30).subtract(blk(0, 0, ZC - 40, CW - 80, 2 * R - 80, 50)).color(paint));
add("bed-knife", blk(0, -R + 50, ZC - 70, CW - 90, 40, 40).color(knives));

// Open rotor with three long knives, on a shaft running out to the flywheel.
add("rotor", cylinder(CW - 100, 250, 12).rotateY(90).translate(-(CW - 100) / 2, 0, ZC).color(knives));
for (let k = 0; k < 3; k++) {
  add(`knife-${k}`, profileYZ([[-20, 230], [30, 230], [36, 370], [6, 360]], CW - 120).rotateX(k * 120 + 25).translate(0, 0, ZC).color(knives));
}
add("shaft", cylinder(CW + 600, 60, 10).rotateY(90).translate(-(CW + 600) / 2 - 200, 0, ZC).color(knives));
for (const s of [-1, 1]) add(`bearing-${s < 0 ? 'l' : 'r'}`, blk(s * (CW / 2 + 90), 0, ZC - 200, 140, 260, 330).color(drive));

// Feed hopper: upper half-chamber plus a tall funnel with a flap curtain.
const hood = cylinder(CW, R, 18).rotateY(90).translate(-CW / 2, 0, ZC)
  .subtract(blk(0, 0, ZC - R - 10, CW + 20, 2 * R + 20, R + 10))
  .subtract(cylinder(CW - 80, R - 40, 18).rotateY(90).translate(-(CW - 80) / 2, 0, ZC))
  .subtract(blk(0, 0, ZC + 100, CW - 80, 2 * R - 120, R));
add("upper-hood", hinge(hood).color(paint));
const funnelOut: [number, number][] = [[-R + 20, ZC + 300], [R - 20, ZC + 300], [R + 60, ZC + 1050], [-R - 260, ZC + 1050]];
const funnelIn: [number, number][] = [[-R + 70, ZC + 250], [R - 70, ZC + 250], [R + 10, ZC + 1100], [-R - 210, ZC + 1100]];
add("feed-hopper", hinge(profileYZ(funnelOut, CW).subtract(profileYZ(funnelIn, CW - 80))).color(paint));
add("hopper-lip", hinge(blk(0, -R - 120, ZC + 1050, CW + 40, 300, 40).subtract(blk(0, -R - 120, ZC + 1040, CW - 80, 200, 60))).color(drive));
for (let i = 0; i < 7; i++) add(`flap-${i}`, hinge(blk(-360 + i * 120, -R - 170, ZC + 760, 110, 12, 280)).color('#1d2023'));
add("hopper-handle", hinge(blk(0, -R - 280, ZC + 900, 400, 40, 40)).color(knives));

// Flywheel pulley and V-belt drive down to a side motor on the -X end.
const XF = -CW / 2 - 240;
add("flywheel", cylinder(130, 400, 20).rotateY(90).translate(XF - 65, 0, ZC).color(drive));
add("flywheel-hub", cylinder(170, 110, 12).rotateY(90).translate(XF - 85, 0, ZC).color(knives));
for (let k = 0; k < 4; k++) add(`flywheel-spoke-${k}`, blk(0, 0, -20, 12, 620, 40).rotateX(k * 45).translate(XF - 70, 0, ZC).color(knives));
const ZM = 380;
for (const [i, dx] of [[0, -40], [1, 0], [2, 40]] as [number, number][]) {
  const len = Math.hypot(ZC - ZM, 260), ang = Math.atan2(260, ZC - ZM) * 180 / Math.PI;
  for (const s of [-1, 1]) add(`v-belt-${i}-${s < 0 ? 'f' : 'b'}`, blk(0, 0, 0, 22, 22, len).rotateX(-s * ang).translate(XF + dx, s * 140, ZM).color('#1d2023'));
}
add("motor-pulley", cylinder(130, 140, 12).rotateY(90).translate(XF - 65, 0, ZM).color(drive));
add("motor", cylinder(560, 210, 14).rotateY(90).translate(XF + 70, 0, ZM).color(drive));
add("motor-cowl", cylinder(60, 220, 14).rotateY(90).translate(XF + 630, 0, ZM).color('#20262b'));
add("motor-base", blk(XF + 350, 0, 0, 640, 520, ZM - 210).color(paint));
add("belt-guard", profileYZ([[-280, ZM - 160], [280, ZM - 160], [300, ZC - 380], [-300, ZC - 380]], 20).translate(XF - 160, 0, 0).color('#f0ae32'));

// Control box on a post with a mushroom e-stop.
add("control-post", blk(700, -560, 0, 80, 80, 1300).color(paint));
add("control-box", blk(700, -560, 1300, 360, 220, 420).color('#d7dadc'));
add("control-face", blk(700, -673, 1360, 280, 6, 300).color('#20262b'));
add("e-stop", cylinder(30, 40, 10).rotateX(90).translate(700, -676, 1520).color('#d43a2f'));
add("start-button", cylinder(30, 24, 10).rotateX(90).translate(620, -676, 1430).color('#3fa64a'));

// Regrind bin pulled out on castors, heaped with flakes.
const YB = -620;
add("regrind-bin", blk(0, YB, 80, 720, 560, 520).subtract(blk(0, YB, 120, 660, 500, 520)).color(drive));
add("regrind-heap", sphere(300).scale([1.15, 0.85, 0.5]).translate(0, YB, 560).subtract(blk(0, YB, 0, 900, 900, 520)).color(regrind));
add("bin-handle", blk(0, YB - 300, 480, 360, 30, 30).color(knives));
for (const [x, y] of [[-300, YB - 220], [300, YB - 220], [-300, YB + 220], [300, YB + 220]]) add(`castor-${x < 0 ? 'l' : 'r'}-${y < YB ? 'f' : 'b'}`, cylinder(40, 38, 10).rotateY(90).translate(x - 20, y, 36).subtract(blk(x, y, -60, 120, 120, 60)).color('#1d2023'));
for (let i = 0; i < 10; i++) add(`flake-${i}`, box(40, 26, 8, true).rotateZ(i * 53).translate(-260 + i * 58, YB - 330 - 20 * Math.sin(i * 1.7), 4).color(regrind));

return p.model();
