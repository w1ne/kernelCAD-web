// SPDX-License-Identifier: CC0-1.0
// Stage manager console: the prompt desk in the wings where the stage
// manager follows the script and calls every cue of the show.
// What makes it a prompt desk rather than a lectern: a sloped desk that holds
// the open prompt script in its binder; a cue-light panel of paired standby /
// go switches with red and green lamps; a hood carrying two show-relay
// monitors and a red-digit show clock; a hooded blue gooseneck work light so
// the desk stays dark from the audience; a comms headset hung on a side hook;
// a side cable trunk feeding the desk; and four casters.
// Generic visualization geometry at about real size (1.2 m wide, 0.7 m deep,
// 1.55 m tall), millimetres, Z up, operator side facing -Y, standing on z = 0.

meta({
  name: "stage-manager-console",
  license: 'CC0-1.0',
  title: "Stage manager console",
  description: "Theatre stage manager's prompt desk at about real size: castored carcass with a sloped desk holding the open prompt script, a cue-light panel of standby and go switches with red and green lamps, a hood with two show-relay monitors and a red-digit show clock, a blue gooseneck work light, a comms headset on a side hook and a side cable trunk. Material controls: painted carcass, desk top, monitor screens, cue lamps and work light. houseShow, touring and woodDesk presets.",
  tags: ['stage manager', 'prompt desk', 'prompt corner', 'cue lights', 'calling desk', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const carcass = param('carcass', '#1f2225', { label: 'Painted carcass' });
const desk = param('desk', '#5b5f63', { label: 'Desk top and panels' });
const screens = param('screens', '#4a7fa8', { label: 'Monitor screens' });
const lamps = param('lamps', '#3d7bff', { label: 'Work light and cue lamps' });

presets({
  houseShow: { carcass: '#1f2225', desk: '#5b5f63', screens: '#4a7fa8', lamps: '#3d7bff' },
  touring: { carcass: '#141618', desk: '#2f3337', screens: '#3d6d58', lamps: '#2fd0ff' },
  woodDesk: { carcass: '#5a3b26', desk: '#8a6a4c', screens: '#5b7f9a', lamps: '#4f6fff' },
});

const PAPER = '#efece2';
const BINDER = '#2c4f8c';
const RED = '#e2332a';
const GREEN = '#36c25a';
const RUBBER = '#141618';
const METAL = '#9aa2a6';

const p = assembly("stage-manager-console");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1200;
const Z0 = 110; // casters lift the carcass
// Sloped desk from the front lip (y = -350, z = 930) back to y = 130, z = 1050.
const LIP: [number, number] = [-350, Z0 + 820];
const TOP: [number, number] = [130, Z0 + 940];
const SLOPE = (Math.atan2(TOP[1] - LIP[1], TOP[0] - LIP[0]) * 180) / Math.PI;
const MID_Y = (LIP[0] + TOP[0]) / 2;
const MID_Z = (LIP[1] + TOP[1]) / 2;
const onDesk = (shape: Shape, x: number, v: number) => shape.translate(x, v, 0).rotateX(SLOPE).translate(0, MID_Y, MID_Z);
const L = Math.hypot(TOP[0] - LIP[0], TOP[1] - LIP[1]);

// Carcass with a recessed kick plinth and knee-free front.
add("carcass", profileYZ([[-330, Z0], [350, Z0], [350, Z0 + 940], TOP, LIP, [-330, Z0 + 780]], W).color(carcass));
add("desk-top", onDesk(box(W + 30, L + 30, 24, true).translate(0, 0, 12), 0, 0).color(desk));
add("desk-lip", box(W + 30, 30, 50, true).translate(0, LIP[0] - 15, LIP[1] - 5).color(desk));
add("kick", box(W - 60, 640, 30, true).translate(0, 0, Z0 - 15).color(RUBBER));
for (const sx of [-1, 1]) add(`front-panel-${sx}`, box(520, 10, 600, true).translate(sx * 290, -336, Z0 + 380).color(desk));

// Open prompt script in its binder, on the left of the desk.
add("binder", onDesk(box(560, 330, 14, true).translate(0, 0, 31), -260, 0).color(BINDER));
for (const sx of [-1, 1]) add(`page-${sx}`, onDesk(box(260, 300, 10, true).translate(0, 0, 43).rotateY(sx * -4), -260 + sx * 135, 0).color(PAPER));
for (let k = 0; k < 6; k++) add(`script-line-${k}`, onDesk(box(200, 6, 2, true).translate(0, 0, 49), -395, 110 - k * 40).color(RUBBER));
add("pencil", onDesk(cylinder(170, 5, 6).rotateY(90).translate(-85, 0, 46), -260, -150).color('#e8b52c'));

// Cue-light panel on the right: six cues, each a standby (red) and go (green) lamp plus switch.
add("cue-panel", onDesk(box(420, 330, 20, true).translate(0, 0, 34), 330, 0).color(carcass));
for (let i = 0; i < 6; i++) {
  const x = 330 - 175 + i * 70;
  add(`standby-${i}`, onDesk(cylinder(12, 13, 12).translate(0, 0, 44), x, 110).color(RED));
  add(`go-${i}`, onDesk(cylinder(12, 13, 12).translate(0, 0, 44), x, 60).color(GREEN));
  add(`cue-switch-${i}`, onDesk(box(18, 36, 22, true).rotateX(-20).translate(0, 0, 54), x, -10).color(METAL));
  add(`cue-label-${i}`, onDesk(box(50, 30, 2, true).translate(0, 0, 45), x, -90).color(PAPER));
}

// Hood with two show-relay monitors and the show clock.
const HZ = Z0 + 940;
add("hood-back", box(W, 40, 470, true).translate(0, 330, HZ + 235).color(carcass));
for (const sx of [-1, 1]) add(`hood-cheek-${sx}`, box(30, 220, 470, true).translate(sx * (W / 2 - 15), 240, HZ + 235).color(carcass));
add("hood-roof", box(W, 260, 30, true).translate(0, 230, HZ + 485).color(carcass));
for (const sx of [-1, 1]) {
  add(`monitor-${sx}`, box(480, 40, 300, true).rotateX(-8).translate(sx * 280, 280, HZ + 210).color(RUBBER));
  add(`screen-${sx}`, box(440, 6, 250, true).rotateX(-8).translate(sx * 280, 258, HZ + 213).color(screens));
}
add("clock", box(260, 70, 90, true).translate(0, 190, HZ + 545).color(RUBBER));
for (let d = 0; d < 4; d++) add(`clock-digit-${d}`, box(36, 4, 56, true).translate(-90 + d * 60, 154, HZ + 545).color(RED));

// Blue gooseneck work light rising from the desk shelf between hood cheeks.
const GX = 0;
add("lamp-base", cylinder(20, 50, 16).translate(GX, 180, HZ).color(RUBBER));
add("gooseneck-1", cylinder(220, 8, 8).rotateX(25).translate(GX, 180, HZ + 20).color(METAL));
add("gooseneck-2", cylinder(200, 8, 8).rotateX(70).translate(GX, 180 - 93, HZ + 220).color(METAL));
add("lamp-shade", path().moveTo(0, 0).lineTo(46, 0).lineTo(30, 70).lineTo(0, 70).close().revolve().rotateX(-60).translate(GX, -162, HZ + 252).color(RUBBER));
add("lamp-lens", cylinder(4, 42, 16).rotateX(-60).translate(GX, -162, HZ + 252).color(lamps));

// Comms headset on a hook on the left cheek.
const HX = -W / 2 - 40;
add("hook", box(80, 20, 20, true).translate(-W / 2 - 40, -120, Z0 + 760).color(METAL));
add("headband", torus(85, 7, 18).rotateY(90).subtract(box(40, 300, 200, true).translate(0, 0, -100)).translate(HX - 20, -120, Z0 + 700).color(RUBBER));
for (const sy of [-1, 1]) add(`earcup-${sy}`, cylinder(30, 42, 16).rotateY(-90).translate(HX, -120 + sy * 85, Z0 + 680).color(RUBBER));
add("boom-mic", cylinder(140, 5, 6).rotateX(60).translate(HX - 30, -205, Z0 + 680).color(RUBBER));

// Side cable trunk on the right cheek, cable dropping to the floor.
add("cable-trunk", box(70, 120, 700, true).translate(W / 2 + 35, 250, Z0 + 350).color(desk));
add("cable-drop", torus(90, 18, 16).rotateX(90).subtract(box(400, 60, 400, true).translate(200, 0, 0)).subtract(box(400, 60, 400, true).translate(0, 0, 200)).translate(W / 2 + 125, 250, Z0).color(RUBBER));
add("cable-run", cylinder(220, 18, 12).rotateY(90).translate(W / 2 + 125, 250, Z0 - 90).color(RUBBER));

// Four casters.
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) {
    add(`caster-fork-${sx}-${sy}`, box(50, 60, 50, true).translate(sx * (W / 2 - 80), sy * 260, Z0 - 25).color(METAL));
    add(`caster-wheel-${sx}-${sy}`, cylinder(30, 40, 16).rotateY(90).translate(sx * (W / 2 - 80) - 15, sy * 260 + 15, 40).color(RUBBER));
  }

return p.model();
