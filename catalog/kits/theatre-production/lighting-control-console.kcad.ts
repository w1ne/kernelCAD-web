// SPDX-License-Identifier: CC0-1.0
// Lighting control console: the theatre lighting desk on the production table
// in the stalls, where the board operator runs the cue stack.
// What makes it a lighting desk rather than a sound desk: few faders but a row
// of playback faders each with its own GO/flash buttons, a big lit GO button,
// two large tilted touchscreens in hooded bezels, four attribute encoder
// wheels under the screens, a calculator-style command keypad, a trackball,
// grey side handles, and two gooseneck desk lamps; it sits on a black
// production table rather than a rack.
// Generic visualization geometry at about real size (about 1.1 m wide desk on
// a 1.4 m table, 1.25 m to the lamp tops), millimetres, Z up, operator side on
// -Y, standing on z = 0.

meta({
  name: "lighting-control-console",
  license: 'CC0-1.0',
  title: "Lighting control console",
  description: "Theatre lighting desk on a production table at about real size: sloped control surface with a row of playback faders and their flash buttons, big lit GO button, two tilted touchscreens in hooded bezels, four attribute encoder wheels, command keypad, trackball, side carry handles and two gooseneck desk lamps. Material controls: console housing, playback keys and fader caps, touchscreen glass, production-table top, table legs. houseShow, touring and blackout presets.",
  tags: ['lighting console', 'lighting desk', 'light board', 'cue stack', 'GO button', 'encoder', 'production table', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const housing = param('housing', '#34383d', { label: 'Console housing' });
const keys = param('keys', '#e3e6e8', { label: 'Playback keys and fader caps' });
const glass = param('glass', '#3b78c2', { label: 'Touchscreen glass' });
const tableTop = param('tableTop', '#1b1d1f', { label: 'Production-table top (black masking)' });
const legs = param('legs', '#8d969b', { label: 'Table legs (steel)' });

presets({
  houseShow: { housing: '#34383d', keys: '#e3e6e8', glass: '#3b78c2', tableTop: '#1b1d1f', legs: '#8d969b' },
  touring: { housing: '#1f2124', keys: '#f0a830', glass: '#e0553b', tableTop: '#2a2c2f', legs: '#25282b' },
  blackout: { housing: '#141618', keys: '#5e8fd0', glass: '#2f4a6b', tableTop: '#0f1011', legs: '#3a3e42' },
});

const SLOT = '#101214';
const GO = '#36c25a';
const PAUSE = '#e2392f';
const LED_A = '#f2a531';

const p = assembly("lighting-control-console");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

// Production table: black top, apron and four steel legs with cross rails.
const TZ = 740;
add("table-top", box(1400, 800, 30, true).translate(0, 60, TZ - 15).color(tableTop));
add("table-skirt", box(1400, 8, 300, true).translate(0, -344, TZ - 180).color(tableTop));
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    add(`leg-${sx}-${sy}`, cylinder(TZ - 50, 18, 10).translate(sx * 650, 60 + sy * 350, 20).color(legs));
    add(`foot-${sx}-${sy}`, cylinder(20, 28, 10).translate(sx * 650, 60 + sy * 350, 0).color(SLOT));
  }
  add(`side-rail-${sx}`, cylinder(700, 12, 8).rotateX(90).translate(sx * 650, 410, 160).color(legs));
}
add("back-rail", cylinder(1300, 12, 8).rotateY(90).translate(-650, 410, 160).color(legs));

// Console body on the table: sloped front deck, raised screen hood at the back.
const W = 1100;
const LIP: [number, number] = [-280, TZ + 70];
const BACK: [number, number] = [120, TZ + 150];
const SLOPE = (Math.atan2(BACK[1] - LIP[1], BACK[0] - LIP[0]) * 180) / Math.PI;
const MID_Y = (LIP[0] + BACK[0]) / 2;
const MID_Z = (LIP[1] + BACK[1]) / 2;
const onDesk = (shape: Shape, x: number, v: number) => shape.translate(x, v, 0).rotateX(SLOPE).translate(0, MID_Y, MID_Z);

add("body", profileYZ([[-300, TZ], [400, TZ], [400, TZ + 160], BACK, LIP, [-300, TZ + 55]], W).color(housing));
// Screen hood: sloped back panel holding two touchscreens, with a sun-hood lip.
// Screen face runs from (y 130, z +190) up to (y 290, z +520), about 26 deg back from vertical.
add("screen-wing", profileYZ([[130, TZ + 150], [420, TZ + 160], [420, TZ + 330], [340, TZ + 520], [290, TZ + 520], [130, TZ + 190]], W - 40).color(housing));
for (const sx of [-1, 1]) {
  add(`touchscreen-${sx}`, box(470, 10, 270, true).rotateX(-26).translate(sx * 260, 203, TZ + 358).color(glass));
  add(`screen-hood-${sx}`, box(500, 90, 14, true).rotateX(8).translate(sx * 260, 252, TZ + 527).color(housing));
}
// Grey carry handles on each end.
for (const sx of [-1, 1]) {
  add(`handle-${sx}`, cylinder(360, 16, 8).rotateX(90).translate(sx * (W / 2 + 26), 120, TZ + 150).color(legs));
  for (const y of [-240, 120]) add(`handle-post-${sx}-${y}`, box(40, 24, 24, true).translate(sx * (W / 2 + 13), y, TZ + 150).color(legs));
}

// Playback faders along the front with two buttons above each.
for (let k = 0; k < 10; k++) {
  const x = -480 + k * 58;
  add(`pb-slot-${k}`, onDesk(box(8, 130, 3, true), x, -120).color(SLOT));
  add(`pb-cap-${k}`, onDesk(box(30, 20, 22, true).translate(0, 0, 11), x, -170 + ((k * 41) % 100)).color(keys));
  add(`pb-flash-${k}`, onDesk(box(42, 30, 12, true).translate(0, 0, 6), x, -20).color(keys));
  add(`pb-go-${k}`, onDesk(box(42, 30, 12, true).translate(0, 0, 6), x, 25).color(k < 3 ? LED_A : housing));
}
// Main cue-stack: big GO and pause buttons on the right.
add("go-button", onDesk(box(120, 70, 22, true).translate(0, 0, 11), 340, -130).color(GO));
add("pause-button", onDesk(box(120, 50, 18, true).translate(0, 0, 9), 340, -50).color(PAUSE));
add("master-slot", onDesk(box(10, 130, 3, true), 470, -120).color(SLOT));
add("master-cap", onDesk(box(40, 24, 28, true).translate(0, 0, 14), 470, -70).color(PAUSE));
// Command keypad: 4 x 5 grid of keys.
for (let r = 0; r < 4; r++)
  for (let c = 0; c < 5; c++)
    add(`key-${r}-${c}`, onDesk(box(34, 30, 12, true).translate(0, 0, 6), 95 + c * 40, -150 + r * 40).color(r === 3 && c === 4 ? LED_A : keys));
// Trackball and attribute encoder wheels just under the screens.
add("trackball-well", onDesk(cylinder(8, 52, 16), 200, 120).color(SLOT));
add("trackball", onDesk(sphere(42).translate(0, 0, 10), 200, 120).color(keys));
for (let k = 0; k < 4; k++) {
  const x = -470 + k * 150;
  add(`encoder-${k}`, onDesk(cylinder(30, 38, 14), x, 125).color(SLOT));
  add(`encoder-grip-${k}`, onDesk(cylinder(6, 40, 14).translate(0, 0, 20), x, 125).color(legs));
}

// Two gooseneck desk lamps at the back corners, heads pointing at the deck.
const neck = [[0, 0], [0, 140], [-50, 240], [-140, 290]];
for (const sx of [-1, 1]) {
  const LX = sx * (W / 2 - 50);
  const LY = 360;
  const LZ = TZ + 300;
  add(`lamp-socket-${sx}`, cylinder(24, 22, 12).translate(LX, LY, LZ - 24).color(legs));
  for (let k = 0; k < neck.length - 1; k++) {
    const [y0, z0] = neck[k];
    const [y1, z1] = neck[k + 1];
    const len = Math.hypot(y1 - y0, z1 - z0);
    const a = (Math.atan2(-(y1 - y0), z1 - z0) * 180) / Math.PI;
    add(`lamp-neck-${sx}-${k}`, cylinder(len, 7, 8).rotateX(a).translate(LX, LY + y0, LZ + z0).color(SLOT));
    add(`lamp-joint-${sx}-${k}`, sphere(9).translate(LX, LY + y1, LZ + z1).color(SLOT));
  }
  add(`lamp-head-${sx}`, cylinder(70, 20, 12).rotateX(150).translate(LX, LY - 140, LZ + 290).color(SLOT));
  add(`lamp-lens-${sx}`, cylinder(6, 18, 12).rotateX(150).translate(LX, LY - 175, LZ + 229).color(LED_A));
}

return p.model();
