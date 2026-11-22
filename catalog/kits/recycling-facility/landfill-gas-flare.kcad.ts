// SPDX-License-Identifier: CC0-1.0
// Landfill gas flare: the enclosed ground flare that destroys methane pulled
// from a landfill's gas wells. What makes it an enclosed flare rather than a
// tank: a tall insulated cylindrical shell with a dark heat-stained
// refractory lip at the open top, a windbox at its foot ringed with louvred
// combustion-air dampers, sight glasses and thermocouple conduits up the
// side, sample ports reached by a caged ladder and rest platform, and in
// front a green gas booster skid (condensate knock-out pot, one or two
// blowers, slam-shut valve) feeding the burner through a yellow gas main,
// with a control kiosk alongside.
// Generic visualization geometry at about real size (1.8 m shell, 7.2 m
// tall), millimetres, Z up, booster skid on the -Y side.

meta({
  name: "landfill-gas-flare",
  license: 'CC0-1.0',
  title: "Landfill gas flare",
  description: "Enclosed landfill gas ground flare at about real size: 7.2 m insulated cylindrical shell with heat-stained refractory top, windbox with louvred combustion-air dampers, sight glasses, thermocouple conduits, sample-port platform with caged ladder, and a booster skid with knock-out pot, one or two blowers, slam-shut valve and control kiosk. Material controls: flare shell, booster skid, gas main and refractory. utility, weathered and highVisibility presets.",
  tags: ["landfill gas", "enclosed flare", "ground flare", "methane", "gas booster", "blower skid", "recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shell = param('shell', '#c4c7c2', { label: 'Flare shell (insulated cladding)' });
const skid = param('skid', '#3d6e4f', { label: 'Booster skid (blowers, pot, kiosk)' });
const gasMain = param('gasMain', '#e2b01d', { label: 'Gas main (yellow)' });
const refractory = param('refractory', '#4a3a30', { label: 'Refractory lip and heat staining' });
const blowers = param('blowers', 'duty-standby', { choices: ['single', 'duty-standby'], label: 'Booster blowers' });

presets({
  utility: { shell: '#c4c7c2', skid: '#3d6e4f', gasMain: '#e2b01d', refractory: '#4a3a30' },
  weathered: { shell: '#a9a69c', skid: '#4b5e4f', gasMain: '#bf9a33', refractory: '#3a2e28' },
  highVisibility: { shell: '#e7e5df', skid: '#c8562a', gasMain: '#f0c419', refractory: '#55443a' },
});

const p = assembly("landfill-gas-flare");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const tube = (x: number, y: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).translate(x, y, z);
const tubeX = (x0: number, x1: number, y: number, z: number, r: number) => cylinder(x1 - x0, r, 10).rotateY(90).translate(x0, y, z);
const tubeY = (y0: number, y1: number, x: number, z: number, r: number) => cylinder(y1 - y0, r, 10).rotateX(-90).translate(x, y0, z);

const FY = 500; // flare centre
const PAD = 150;
const R = 900;
const WB = 1500; // windbox top
const TOP = 7200;

// Pad and windbox.
add("pad", blk(0, 0, 0, 3400, 3600, PAD).color('#9a9b94'));
add("windbox", tube(0, FY, PAD, WB - PAD, R + 60, 16).color(skid));
add("windbox-band", tube(0, FY, WB - 60, 60, R + 90, 16).color('#2f3336'));
// Louvred combustion-air dampers around the windbox, facing the camera side.
for (const [i, a] of [[0, -90], [1, -135], [2, 180], [3, -45]] as const) {
  const panel = [blk(0, -R - 70, 300, 640, 30, 960).color('#2f3336')];
  for (let k = 0; k < 6; k++) panel.push(box(600, 70, 14, true).rotateX(-35).translate(0, -R - 100, 380 + k * 140).color('#8a9094'));
  panel.forEach((s, k) => add(`damper-${i}-${k}`, s.rotateZ(a + 90).translate(0, FY, 0)));
}

// Insulated shell with cladding seams, refractory lip at the open top.
add("shell", tube(0, FY, WB, TOP - WB - 300, R, 16).color(shell));
for (let k = 0; k < 4; k++) add(`seam-${k}`, tube(0, FY, WB + 1200 + k * 1200, 30, R + 12, 16).color('#9ea29d'));
add("refractory-lip", tube(0, FY, TOP - 300, 300, R + 20, 16).color(refractory));
add("lip-inner", tube(0, FY, TOP - 280, 290, R - 140, 16).color('#1d1a18'));
// Sight glasses and thermocouple conduits on the camera side.
for (const [i, z] of [[0, 2300], [1, 3800]] as const) {
  add(`sight-boss-${i}`, cylinder(120, 90, 10).rotateX(90).translate(-120, FY - R + 20, z).color('#5d6366'));
  add(`sight-glass-${i}`, cylinder(10, 60, 10).rotateX(90).translate(-120, FY - R - 98, z).color('#ffb347'));
}
for (const [i, a, h] of [[0, -110, 5200], [1, -120, 3900], [2, -130, 2600]] as const) {
  const r = (a * Math.PI) / 180;
  add(`tc-conduit-${i}`, tube((R + 30) * Math.cos(r), FY + (R + 30) * Math.sin(r), WB, h, 18, 6).color('#5d6366'));
  add(`tc-head-${i}`, blk((R + 50) * Math.cos(r), FY + (R + 50) * Math.sin(r), WB + h, 90, 90, 90).color('#5d6366'));
}

// Sample-port platform on the -X side with caged ladder.
const PZ = 5400;
add("platform", blk(-R - 350, FY, PZ, 700, 1300, 40).color('#6d716e'));
add("platform-bracket", extrudePolygon([[0, 0], [600, 0], [0, -500]], 30).rotateX(90).translate(0, 15, 0).translate(-R - 600, FY, PZ).color('#6d716e'));
add("platform-rail-x", blk(-R - 690, FY, PZ + 40, 30, 1300, 1000).subtract(blk(-R - 690, FY, PZ + 90, 60, 1240, 900)).color(gasMain));
for (const [i, y] of [[0, FY - 635], [1, FY + 635]] as const) add(`platform-rail-${i}`, blk(-R - 350, y, PZ + 40, 700, 30, 1000).subtract(blk(-R - 350, y, PZ + 90, 640, 60, 900)).color(gasMain));
add("sample-port", cylinder(160, 50, 8).rotateY(-90).translate(-R + 20, FY - 300, PZ + 900).color('#5d6366'));
const LX = -R - 540;
const LY = FY + 380;
for (const [i, dy] of [[0, -200], [1, 200]] as const) add(`ladder-rail-${i}`, blk(LX, LY + dy, PAD, 30, 30, PZ - PAD + 1100).color(shell));
for (let k = 0; k < 17; k++) add(`ladder-rung-${k}`, blk(LX, LY, PAD + 300 + k * 300, 20, 400, 20).color(shell));
for (let k = 0; k < 8; k++) add(`cage-hoop-${k}`, blk(LX - 200, LY, 2400 + k * 400, 30, 440, 30).color(shell));
for (const [i, dy] of [[0, -210], [1, 210]] as const) add(`cage-bar-${i}`, blk(LX - 200, LY + dy, 2400, 30, 30, PZ - 2400).color(shell));

// Booster skid in front: knock-out pot -> blower(s) -> slam-shut valve -> burner.
const SY = -1100;
const GZ = 800;
add("skid-base", blk(-200, SY, PAD, 2400, 900, 120).color('#3a3d40'));
add("ko-pot", tube(-1050, SY, PAD + 120, 1250, 260, 14).color(skid));
add("ko-pot-head", sphere(260).scale([1, 1, 0.45]).translate(-1050, SY, PAD + 1370).color(skid));
add("ko-level-glass", blk(-1050, SY - 268, PAD + 400, 50, 8, 500).color('#c4dbe0'));
add("well-field-main", tubeX(-1700, -1050, SY, PAD + 1100, 90).color(gasMain));
add("suction-header", tubeX(-1050, 500, SY + 250, GZ + 380, 75).color(gasMain));
add("ko-outlet", tubeY(SY, SY + 250, -1050, GZ + 380, 75).color(gasMain));
const blowerXs = blowers.value === 'single' ? [-450] : [-500, 50];
blowerXs.forEach((x, i) => {
  add(`blower-pedestal-${i}`, blk(x, SY, PAD + 120, 360, 360, GZ - 320 - PAD - 120).color('#3a3d40'));
  add(`blower-volute-${i}`, cylinder(240, 320, 16).rotateX(90).translate(x, SY + 100, GZ).color(skid));
  add(`blower-motor-${i}`, cylinder(400, 180, 12).rotateX(90).translate(x, SY - 140, GZ).color('#4b5257'));
  add(`blower-fan-cowl-${i}`, cylinder(70, 160, 12).rotateX(90).translate(x, SY - 540, GZ).color('#2b2e30'));
  add(`blower-suction-${i}`, tube(x, SY + 250, GZ + 300, 80, 60, 10).color(gasMain));
  add(`blower-discharge-${i}`, tubeX(x, 650, SY - 20, GZ + 300, 65).color(gasMain));
  add(`blower-riser-${i}`, tube(x, SY - 20, GZ + 280, 40, 65, 10).color(gasMain));
});
add("slam-shut-valve", blk(650, SY - 20, GZ + 200, 220, 220, 200).color('#c8322a'));
add("slam-shut-actuator", tube(650, SY - 20, GZ + 400, 260, 90, 10).color('#c8322a'));
add("burner-main", tubeY(SY - 20, FY - R, 760, GZ + 300, 80).color(gasMain));
add("burner-drop", tube(760, FY - R - 40, GZ - 200, 540, 80, 10).color(gasMain));
add("main-support", blk(760, -500, PAD, 140, 140, GZ + 300 - 80 - PAD).color('#3a3d40'));

// Control kiosk with lamps and a mimic panel on its -Y door.
add("kiosk", blk(1300, -1200, PAD, 700, 500, 1800).color(skid));
add("kiosk-roof", blk(1300, -1200, PAD + 1800, 800, 620, 60).color('#2f3336'));
add("kiosk-door-seam", blk(1300, -1453, PAD + 100, 6, 6, 1600).color('#1d2a24'));
add("kiosk-hmi", blk(1170, -1455, PAD + 1150, 200, 6, 150).color('#3fa7d6'));
for (const [n, x, c] of [['run', 1420, '#3cdc5a'], ['flame', 1490, '#ffb020'], ['fault', 1560, '#4a1612']] as const) {
  add(`kiosk-lamp-${n}`, cylinder(12, 24, 10).rotateX(90).translate(x, -1450, PAD + 1450).color(c));
}
add("kiosk-sign", blk(1300, -1455, PAD + 1550, 500, 6, 140).color('#f0c419'));

return p.model();
