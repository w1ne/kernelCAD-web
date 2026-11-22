// SPDX-License-Identifier: CC0-1.0
// Dimmer rack: the rolling steel cabinet backstage that turns the lighting
// desk's DMX levels into mains power for each stage circuit.
// What makes it a dimmer rack rather than a cupboard: a front bay packed with
// rows of slide-in dimmer modules, each with its pull handle, twin circuit
// breaker toggles and a status LED; a control module at the top with a lit
// LCD and keypad; louvred vents above and below the bay for the fans; a top
// cable tray with fat feeder cables looping in; side lift handles; and four
// swivel casters so it can tour.
// Generic visualization geometry at about real size (0.8 m wide, 0.7 m deep,
// 1.85 m tall), millimetres, Z up, module bay facing -Y, standing on z = 0.

meta({
  name: "dimmer-rack",
  license: 'CC0-1.0',
  title: "Dimmer rack",
  description: "Rolling theatre dimmer rack at about real size: steel cabinet on four swivel casters with a front bay of slide-in dimmer modules (pull handle, twin breaker toggles and status LED on each), a control module with lit LCD and keypad, louvred fan vents, side lift handles and a top cable tray with looping feeder cables. Material controls: powder-coated cabinet, module faces, breaker toggles, LCD and LEDs. houseShow, touring and greyRack presets.",
  tags: ['dimmer rack', 'dimmer', 'lighting power', 'dmx', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 7000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const cabinet = param('cabinet', '#2b3136', { label: 'Powder-coated steel cabinet' });
const modules = param('modules', '#8d9599', { label: 'Dimmer module faces' });
const breakers = param('breakers', '#d9d4c7', { label: 'Breaker toggles and handles' });
const display = param('display', '#5fd6ff', { label: 'LCD and status LEDs' });

presets({
  houseShow: { cabinet: '#2b3136', modules: '#8d9599', breakers: '#d9d4c7', display: '#5fd6ff' },
  touring: { cabinet: '#1c1f22', modules: '#3e4448', breakers: '#e0a62f', display: '#7dff8a' },
  greyRack: { cabinet: '#b9bdb8', modules: '#6b7276', breakers: '#202325', display: '#ffb347' },
});

const RUBBER = '#151719';
const CABLE = '#1f2224';

const p = assembly("dimmer-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const W = 800;
const D = 700;
const Z0 = 150; // casters lift the cabinet
const H = 1650;
const FY = -D / 2;

// Cabinet shell with the module bay, control-module window and vents pocketed into the front.
let shell = box(W, D, H, true).translate(0, 0, Z0 + H / 2);
shell = shell.subtract(box(660, 80, 900, true).translate(0, FY, Z0 + 280 + 450));
shell = shell.subtract(box(660, 80, 200, true).translate(0, FY, Z0 + 1230 + 100));
for (const zc of [Z0 + 130, Z0 + 1520]) shell = shell.subtract(box(560, 60, 150, true).translate(0, FY, zc));
add("cabinet", shell.color(cabinet));
add("plinth", box(W + 20, D + 20, 30, true).translate(0, 0, Z0 + 15).color(RUBBER));

// Fan vents: louvre slats tipped down in each vent pocket.
for (const [name, zc] of [["low", Z0 + 130], ["high", Z0 + 1520]] as [string, number][])
  for (let k = 0; k < 5; k++) add(`louvre-${name}-${k}`, box(556, 34, 6, true).rotateX(-35).translate(0, FY + 12, zc - 56 + k * 28).color(cabinet));

// Dimmer modules: three rows of eight slide-in modules.
const MW = 78;
for (let row = 0; row < 3; row++) {
  const zb = Z0 + 290 + row * 296;
  for (let i = 0; i < 8; i++) {
    const x = -7 * MW / 2 + i * MW;
    add(`module-${row}-${i}`, box(MW - 6, 20, 284, true).translate(x, FY + 20, zb + 142).color(modules));
    add(`module-handle-${row}-${i}`, box(36, 22, 14, true).translate(x, FY + 2, zb + 30).color(breakers));
    for (const dz of [150, 205]) add(`breaker-${row}-${i}-${dz}`, box(30, 26, 40, true).translate(x, FY + 2, zb + dz).color(breakers));
    add(`led-${row}-${i}`, cylinder(10, 7, 8).rotateX(90).translate(x, FY + 10, zb + 255).color(display));
  }
}

// Control module: lit LCD, keypad and a DMX input socket.
const CZ = Z0 + 1230;
add("control-face", box(650, 20, 190, true).translate(0, FY + 20, CZ + 100).color(modules));
add("lcd-bezel", box(250, 16, 110, true).translate(-150, FY + 6, CZ + 110).color(RUBBER));
add("lcd", box(220, 8, 80, true).translate(-150, FY - 2, CZ + 110).color(display));
for (let r = 0; r < 3; r++)
  for (let c = 0; c < 4; c++) add(`key-${r}-${c}`, box(30, 14, 22, true).translate(60 + c * 42, FY + 4, CZ + 60 + r * 38).color(breakers));
add("dmx-socket", cylinder(16, 24, 14).rotateX(90).translate(260, FY + 8, CZ + 100).color(RUBBER));
add("dmx-socket-ring", torus(24, 4, 14).rotateX(90).translate(260, FY - 6, CZ + 100).color(breakers));

// Side lift handles on both cheeks.
for (const sx of [-1, 1]) {
  add(`handle-${sx}`, cylinder(360, 16, 10).translate(sx * (W / 2 + 50), 0, Z0 + 1180 - 180).color(breakers));
  for (const dz of [-150, 150]) add(`handle-post-${sx}-${dz}`, cylinder(50, 12, 8).rotateY(90).translate(sx > 0 ? W / 2 : -W / 2 - 50, 0, Z0 + 1180 + dz).color(breakers));
}

// Top cable tray with feeder cables looping in from behind.
const TZ = Z0 + H;
add("tray-floor", box(W - 60, 260, 12, true).translate(0, 150, TZ + 50).color(cabinet));
for (const sy of [20, 280]) add(`tray-lip-${sy}`, box(W - 60, 12, 80, true).translate(0, sy, TZ + 90).color(cabinet));
for (const sx of [-1, 1]) add(`tray-bracket-${sx}`, box(30, 260, 44, true).translate(sx * (W / 2 - 60), 150, TZ + 22).color(cabinet));
for (let k = 0; k < 3; k++) {
  const x = -220 + k * 220;
  add(`feeder-loop-${k}`, torus(130, 22, 18).rotateY(90).subtract(box(80, 400, 400, true).translate(0, 0, -200)).translate(x, 150, TZ + 70).color(CABLE));
  add(`feeder-gland-${k}`, cylinder(30, 34, 14).translate(x + 0, 20, TZ + 40).color(RUBBER));
}

// Four swivel casters: fork, wheel and top plate.
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) {
    const x = sx * (W / 2 - 90);
    const y = sy * (D / 2 - 90);
    add(`caster-plate-${sx}-${sy}`, box(110, 110, 12, true).translate(x, y, Z0 - 6).color(breakers));
    add(`caster-fork-${sx}-${sy}`, box(60, 70, 70, true).translate(x, y + 15, Z0 - 47).color(breakers));
    add(`caster-wheel-${sx}-${sy}`, cylinder(40, 50, 18).rotateY(90).translate(x - 20, y + 30, 50).color(RUBBER));
  }

return p.model();
