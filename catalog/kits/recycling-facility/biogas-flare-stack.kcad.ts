// SPDX-License-Identifier: CC0-1.0
// Biogas flare stack: the open "candlestick" flare that burns off surplus
// biogas from an anaerobic digester when the engines can't take it. What
// makes it a flare rather than a chimney: a slim stack topped by a wider
// heat-stained windshield and burner tip with a pilot line running up the
// side, fed at its foot by a yellow gas train on a skid (condensate
// knock-out pot, booster blower, flame arrestor and isolation valve), a
// propane pilot bottle and an ignition panel with run/fault lamps. The
// flame can be lit or idle.
// Generic visualization geometry at about real size (4.6 m tall stack,
// 2.6 m pad), millimetres, Z up, gas train on the -Y side.

meta({
  name: "biogas-flare-stack",
  license: 'CC0-1.0',
  title: "Biogas flare stack",
  description: "Open candlestick biogas flare at about real size: slim stack with heat-stained windshield, burner tip and pilot line, cage ladder, fed by a yellow gas train skid with condensate knock-out pot, booster blower, flame arrestor and isolation valve, plus propane pilot bottle and ignition panel. Lit or idle flame. Material controls: stack, gas pipework, skid equipment and flame. digester, weathered and stainless presets.",
  tags: ["biogas", "flare", "flare stack", "candlestick flare", "anaerobic digestion", "gas train", "recycling", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stack = param('stack', '#9a9d98', { label: 'Stack (heat-resistant aluminium paint)' });
const gasPipe = param('gasPipe', '#e2b01d', { label: 'Gas pipework (yellow)' });
const skid = param('skid', '#2f5d8a', { label: 'Skid equipment (blower, pot, panel)' });
const flame = param('flame', '#ff8a1e', { label: 'Flame' });
const state = param('state', 'lit', { choices: ['lit', 'idle'], label: 'Flare state' });

presets({
  digester: { stack: '#9a9d98', gasPipe: '#e2b01d', skid: '#2f5d8a', flame: '#ff8a1e' },
  weathered: { stack: '#7d7a72', gasPipe: '#c49a2a', skid: '#3f5566', flame: '#ff7a24' },
  stainless: { stack: '#c4ccce', gasPipe: '#e8c21f', skid: '#6b7378', flame: '#ffa22e' },
});

const p = assembly("biogas-flare-stack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const tube = (x: number, y: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).translate(x, y, z);
const tubeX = (x0: number, x1: number, y: number, z: number, r: number) => cylinder(x1 - x0, r, 10).rotateY(90).translate(x0, y, z);
const tubeY = (y0: number, y1: number, x: number, z: number, r: number) => cylinder(y1 - y0, r, 10).rotateX(-90).translate(x, y0, z);

const SX = 300; // stack centre
const SY = 350;
const PAD = 150;
const TOP = 4600;
const lit = state.value === 'lit';

// Concrete pad and stack foundation.
add("pad", blk(0, 0, 0, 2600, 1900, PAD).color('#9a9b94'));
add("stack-base-plate", tube(SX, SY, PAD, 30, 260, 8).color(stack));
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 4;
  add(`gusset-${k}`, extrudePolygon([[0, 0], [150, 0], [0, 420]], 16).rotateX(90).translate(0, 8, 0).rotateZ((a * 180) / Math.PI).translate(SX + 110 * Math.cos(a), SY + 110 * Math.sin(a), PAD + 30).color(stack));
}

// Stack, windshield and burner tip.
add("stack", tube(SX, SY, PAD + 30, TOP - 700 - PAD - 30, 110, 14).color(stack));
add("stack-flange", tube(SX, SY, 2200, 40, 150, 14).color(stack));
add("windshield-cone", tube(SX, SY, TOP - 700, 120, 150, 14).color(stack));
add("windshield", tube(SX, SY, TOP - 580, 520, 210, 14).color('#5a4a3c'));
add("tip-rim", tube(SX, SY, TOP - 60, 60, 222, 14).color('#3a3230'));
add("pilot-line", tube(SX - 125, SY - 30, 900, TOP - 900 - 40, 14, 6).color(gasPipe));
add("pilot-nozzle", tube(SX - 125, SY - 30, TOP - 40, 120, 22, 6).color('#3a3230'));
add("igniter-box", blk(SX - 175, SY - 30, 820, 100, 120, 160).color(skid));
if (lit) {
  add("flame-outer", sphere(260).scale([1, 1, 2.6]).translate(SX, SY, TOP + 560).color(flame));
  add("flame-core", sphere(150).scale([1, 1, 2.4]).translate(SX - 30, SY - 30, TOP + 360).color('#ffd23a'));
}

// Cage ladder up the -X side to a rest platform under the windshield.
const LX = SX - 260;
for (const [i, y] of [[0, SY - 200], [1, SY + 200]] as const) add(`ladder-rail-${i}`, blk(LX, y, PAD, 30, 30, 3600).color(stack));
for (let k = 0; k < 11; k++) add(`ladder-rung-${k}`, blk(LX, SY, PAD + 300 + k * 300, 20, 400, 20).color(stack));
for (let k = 0; k < 4; k++) add(`cage-hoop-${k}`, blk(LX - 200, SY, 2300 + k * 400, 30, 420, 30).color(stack));
for (const [i, y] of [[0, SY - 200], [1, SY + 200]] as const) add(`cage-bar-${i}`, blk(LX - 200, y, 2300, 30, 30, 1450).color(stack));
add("platform", blk(SX - 100, SY, 3740, 700, 700, 40).color('#6d716e'));
add("platform-rail", blk(SX - 440, SY, 3780, 30, 700, 900).subtract(blk(SX - 440, SY, 3830, 60, 640, 800)).color(gasPipe));

// Gas train skid on the -Y side: knock-out pot -> blower -> arrestor -> valve -> stack.
const GZ = 900; // header centreline height
add("skid", blk(-250, -450, PAD, 1900, 700, 120).color('#3a3d40'));
// Condensate knock-out pot with dished head and drain.
add("ko-pot", tube(-900, -450, PAD + 120, 1150, 230, 14).color(skid));
add("ko-pot-head", sphere(230).scale([1, 1, 0.45]).translate(-900, -450, PAD + 1270).color(skid));
add("ko-drain", tube(-900, -700, PAD + 120, 260, 30, 6).color(gasPipe));
add("ko-sight-glass", blk(-900, -682, PAD + 500, 50, 8, 380).color('#c4dbe0'));
add("inlet-pipe", tubeY(-450, 900, -900, GZ + 400, 70).color(gasPipe));
// Booster blower: volute casing, outlet stub and motor.
add("blower-volute", cylinder(220, 300, 16).rotateX(90).translate(-300, -340, GZ).color(skid));
add("blower-motor", cylinder(380, 170, 12).rotateX(90).translate(-300, -560, GZ).color('#4b5257'));
add("blower-motor-fan", cylinder(60, 150, 12).rotateX(90).translate(-300, -620, GZ).color('#2b2e30'));
add("blower-pedestal", blk(-300, -450, PAD + 120, 320, 300, GZ - 300 - PAD - 120).color('#3a3d40'));
add("pot-to-blower", tubeX(-900, -300, -450, GZ + 260, 70).color(gasPipe));
add("blower-riser", tube(-300, -450, GZ + 120, 140, 70, 10).color(gasPipe));
// Flame arrestor with flanged ends, then the header to the stack.
add("header", tubeX(-300, SX, -450, GZ, 70).color(gasPipe));
add("arrestor", tubeX(50, 330, -450, GZ, 150).color('#8a9094'));
for (const [i, x] of [[0, 30], [1, 330]] as const) add(`arrestor-flange-${i}`, tubeX(x, x + 24, -450, GZ, 180).color(gasPipe));
add("valve-body", blk(SX, -450, GZ - 90, 180, 180, 180).color('#3a3d40'));
add("valve-stem", tube(SX, -450, GZ + 90, 220, 18, 6).color('#3a3d40'));
add("handwheel", torus(110, 14, 14).translate(SX, -450, GZ + 310).color('#c8322a'));
add("stack-inlet", tubeY(-450, SY, SX, GZ, 70).color(gasPipe));
add("pipe-support", blk(SX, -80, PAD, 120, 120, GZ - 70 - PAD).color('#3a3d40'));

// Propane pilot bottle chained to a post.
add("pilot-bottle", tube(1050, -60, PAD, 950, 150, 14).color('#e9e6dc'));
add("pilot-bottle-dome", sphere(150).scale([1, 1, 0.6]).translate(1050, -60, PAD + 950).color('#e9e6dc'));
add("pilot-regulator", tube(1050, -60, PAD + 1030, 120, 40, 8).color('#7c8285'));
add("pilot-hose", tubeX(SX - 125, 1050, -60, PAD + 1100, 12).color('#1d1f20'));
add("pilot-hose-run", tubeY(-60, SY - 30, SX - 125, PAD + 1100, 12).color('#1d1f20'));

// Ignition / control panel on posts at the front, lamps facing -Y.
add("panel-post", blk(750, -820, PAD, 80, 80, 1300).color('#3a3d40'));
add("panel", blk(750, -830, PAD + 1150, 560, 220, 700).color(skid));
add("panel-door-seam", blk(750, -942, PAD + 1180, 6, 6, 640).color('#1d2a38'));
const lamps = [['run', 600, lit ? '#3cdc5a' : '#1f4a2a'], ['fault', 680, lit ? '#4a1612' : '#ff3b2e'], ['pilot', 820, '#ffb020']] as const;
for (const [n, x, c] of lamps) add(`panel-lamp-${n}`, cylinder(14, 26, 10).rotateX(90).translate(x, -941, PAD + 1700).color(c));
add("panel-label", blk(750, -943, PAD + 1450, 380, 4, 120).color('#f0c419'));
add("panel-roof", box(680, 340, 30, true).rotateX(-10).translate(750, -840, PAD + 1880).color('#3a3d40'));

return p.model();
