// SPDX-License-Identifier: CC0-1.0
// Audio mixing console: the front-of-house sound desk at the back of the
// stalls, where the sound operator mixes the show.
// What makes it a mixing desk rather than a lighting desk: long rows of
// identical channel strips, each a column of rotary gain/EQ knobs over a
// long-throw fader in a slot; a master section with a wider pair of faders;
// a tilted meter bridge with a touchscreen and LED level meters; a padded
// arm rest along the front edge; timber end cheeks; a gooseneck desk lamp;
// and a flight-case rack base below holding stage-box and effects units.
// Generic visualization geometry at about real size (about 1.25 m wide, 0.8 m
// deep, 1.15 m to the lamp), millimetres, Z up, operator side on -Y,
// standing on z = 0.

meta({
  name: "audio-mixing-console",
  license: 'CC0-1.0',
  title: "Audio mixing console",
  description: "Front-of-house audio mixing desk at about real size: sloped work surface with sixteen channel strips (rotary EQ knobs over long-throw faders in slots), a master section with wide faders, tilted meter bridge with touchscreen and LED level meters, padded arm rest, timber end cheeks, gooseneck desk lamp, on a flight-case rack base with stage-box and effects units. Material controls: console chassis, timber end cheeks, fader caps and knobs, screen and meter glass, flight-case shell. houseShow, touring and studio presets.",
  tags: ['mixing console', 'sound desk', 'audio mixer', 'front of house', 'FOH', 'faders', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const chassis = param('chassis', '#2c3035', { label: 'Console chassis and work surface' });
const timber = param('timber', '#7a4a2b', { label: 'Timber end cheeks' });
const polymer = param('polymer', '#d9dcde', { label: 'Fader caps and knobs' });
const glass = param('glass', '#3fa7c9', { label: 'Touchscreen and meter glass' });
const flightCase = param('flightCase', '#1d2023', { label: 'Flight-case rack base' });

presets({
  houseShow: { chassis: '#2c3035', timber: '#7a4a2b', polymer: '#d9dcde', glass: '#3fa7c9', flightCase: '#1d2023' },
  touring: { chassis: '#1f2225', timber: '#23272a', polymer: '#f0b532', glass: '#4fc6a0', flightCase: '#3a4a57' },
  studio: { chassis: '#8f969b', timber: '#a8743f', polymer: '#2a2d30', glass: '#7ad0f0', flightCase: '#2b2e31' },
});

const ALU = '#b8c0c4';
const SLOT = '#121416';
const LED_G = '#45c45a';
const LED_A = '#f2a531';
const LED_R = '#e2392f';
const KNOB_COLS = ['#d64a3a', '#e2b33b', '#4d9fd6', '#5cb36a'];

const p = assembly("audio-mixing-console");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1180;
const CASE_H = 640;
// Work surface: front lip (y = -330, z = 760) rising to the back (y = 220, z = 850).
const LIP: [number, number] = [-330, CASE_H + 120];
const BACK: [number, number] = [220, CASE_H + 210];
const SLOPE = (Math.atan2(BACK[1] - LIP[1], BACK[0] - LIP[0]) * 180) / Math.PI;
const MID_Y = (LIP[0] + BACK[0]) / 2;
const MID_Z = (LIP[1] + BACK[1]) / 2;
// Place a shape built standing on z = 0 onto the work surface at (x, v along the slope).
const onDesk = (shape: Shape, x: number, v: number) => shape.translate(x, v, 0).rotateX(SLOPE).translate(0, MID_Y, MID_Z);

// Flight-case rack base: shell, aluminium edge extrusions, ball corners, handles.
add("case-shell", box(1100, 620, CASE_H - 30, true).translate(0, 20, 30 + (CASE_H - 30) / 2).color(flightCase));
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    add(`case-edge-${sx}-${sy}`, box(30, 30, CASE_H - 30, true).translate(sx * 545, 20 + sy * 305, 30 + (CASE_H - 30) / 2).color(ALU));
    add(`case-foot-${sx}-${sy}`, cylinder(30, 34, 10).translate(sx * 480, 20 + sy * 240, 0).color(SLOT));
  }
  add(`case-handle-${sx}`, box(14, 160, 40, true).translate(sx * 558, 20, 480).color(ALU));
}
add("case-top-rim", box(1110, 630, 20, true).translate(0, 20, CASE_H - 10).color(ALU));
// Rack bay in the front with three units: stage-box, effects unit, power conditioner.
add("rack-bay", box(900, 30, 440, true).translate(0, -282, 300).color(SLOT));
for (const sx of [-1, 1]) add(`rack-rail-${sx}`, box(36, 34, 440, true).translate(sx * 432, -286, 300).color(ALU));
const units: [number, number, string][] = [[440, 130, 'stage-box'], [300, 90, 'effects'], [180, 90, 'power']];
for (const [z, h, name] of units) {
  add(`unit-${name}`, box(860, 20, h - 8, true).translate(0, -300, z).color(chassis));
  for (let k = 0; k < 6; k++) add(`unit-${name}-led-${k}`, box(26, 8, 14, true).translate(-300 + k * 50, -312, z + h / 4).color(k % 3 === 2 ? LED_A : LED_G));
}
add("stage-box-sockets", box(360, 10, 46, true).translate(200, -314, 440).color(ALU));

// Console tub with sloped work surface and padded arm rest.
add("tub", profileYZ([[-340, CASE_H], [260, CASE_H], [260, BACK[1] + 20], BACK, LIP, [-340, LIP[1] - 30]], W - 60).color(chassis));
add("arm-rest", cylinder(W - 60, 40, 12).rotateY(90).scale([1, 1.1, 0.8]).translate(-(W - 60) / 2, -360, LIP[1] - 18).color(flightCase));
for (const sx of [-1, 1])
  add(`end-cheek-${sx}`, profileYZ([[-400, CASE_H], [270, CASE_H], [270, CASE_H + 330], [200, CASE_H + 350], [-400, LIP[1] + 40]], 30).translate(sx * (W / 2 - 15), 0, 0).color(timber));

// Channel strips: two banks of eight, master section in the middle.
const STRIP = 54;
const bankX = (bank: number, k: number) => bank * (175 + (7 - k) * STRIP);
for (const bank of [-1, 1]) {
  for (let k = 0; k < 8; k++) {
    const x = bankX(bank, k);
    const id = `${bank > 0 ? 'r' : 'l'}${k}`;
    add(`fader-slot-${id}`, onDesk(box(8, 200, 3, true), x, -180).color(SLOT));
    add(`fader-cap-${id}`, onDesk(box(34, 22, 26, true).translate(0, 0, 13), x, -190 + ((k * 37) % 90)).color(polymer));
    for (let j = 0; j < 4; j++)
      add(`knob-${id}-${j}`, onDesk(cylinder(22, 13, 10), x, -10 + j * 50).color(j === 0 ? KNOB_COLS[k % 4] : polymer));
    add(`mute-${id}`, onDesk(box(28, 18, 10, true).translate(0, 0, 5), x, -55).color(k % 3 === 0 ? LED_R : chassis));
  }
}
// Master section: wide stereo faders, big rotary and a talkback button.
add("master-panel", onDesk(box(240, 520, 6, true), 0, 0).color(flightCase));
for (const sx of [-1, 1]) {
  add(`master-slot-${sx}`, onDesk(box(10, 220, 3, true).translate(0, 0, 6), sx * 40, -170).color(SLOT));
  add(`master-cap-${sx}`, onDesk(box(46, 26, 30, true).translate(0, 0, 21), sx * 40, -120).color(LED_R));
}
add("master-knob", onDesk(cylinder(36, 32, 16).translate(0, 0, 6), 0, 60).color(polymer));
add("talkback", onDesk(box(60, 30, 16, true).translate(0, 0, 14), 0, 150).color(LED_A));

// Meter bridge: upstand with a tilted touchscreen and LED level meter bars.
add("meter-bridge", box(W - 60, 90, 170, true).translate(0, 215, BACK[1] + 85).color(chassis));
add("screen-bezel", box(520, 20, 300, true).rotateX(-14).translate(0, 190, BACK[1] + 280).color(flightCase));
add("touchscreen", box(480, 8, 260, true).rotateX(-14).translate(0, 177, BACK[1] + 282).color(glass));
add("screen-stand", box(120, 60, 120, true).translate(0, 230, BACK[1] + 200).color(chassis));
for (const bank of [-1, 1]) {
  for (let k = 0; k < 8; k++) {
    const x = bankX(bank, k);
    const lvl = 50 + ((k * 53) % 70);
    add(`meter-${bank}-${k}`, box(16, 8, lvl, true).translate(x, 168, BACK[1] + 40 + lvl / 2).color(lvl > 105 ? LED_A : LED_G));
    if (lvl > 112) add(`meter-peak-${bank}-${k}`, box(16, 8, 12, true).translate(x, 168, BACK[1] + 52 + lvl).color(LED_R));
  }
}

// Gooseneck desk lamp from the left end of the meter bridge.
const LX = -W / 2 + 90;
const LY = 220;
const LZ = BACK[1] + 170;
const neck = [[0, 0], [0, 110], [-40, 200], [-110, 240]];
add("lamp-socket", cylinder(24, 22, 12).translate(LX, LY, LZ).color(ALU));
for (let k = 0; k < neck.length - 1; k++) {
  const [y0, z0] = neck[k];
  const [y1, z1] = neck[k + 1];
  const len = Math.hypot(y1 - y0, z1 - z0);
  const a = (Math.atan2(-(y1 - y0), z1 - z0) * 180) / Math.PI;
  add(`lamp-neck-${k}`, cylinder(len, 7, 8).rotateX(a).translate(LX, LY + y0, LZ + 24 + z0).color(SLOT));
  add(`lamp-joint-${k}`, sphere(9).translate(LX, LY + y1, LZ + 24 + z1).color(SLOT));
}
// Shade points down and forward at the work surface.
add("lamp-head", cylinder(70, 20, 12).rotateX(150).translate(LX, LY - 110, LZ + 264).color(SLOT));
add("lamp-lens", cylinder(6, 18, 12).rotateX(150).translate(LX, LY - 145, LZ + 203).color(LED_A));

return p.model();
