// SPDX-License-Identifier: CC0-1.0
// Circulation pump skid: the packaged end-suction centrifugal pump set that
// recirculates nutrient solution from the return tank back to the growing
// system, on a galvanised base frame with its valves piped up.
// What makes it a pump skid: a finned TEFC motor with fan cowl and terminal
// box, a yellow coupling guard, the bearing frame and the volute casing with
// an axial suction flange and a top discharge, then a check valve, a gate
// valve with handwheel and a pressure gauge up the discharge riser into a
// header, all on a channel base frame with a drip tray.
// Generic visualization geometry at about real size (frame about 1.8 m long,
// 5.5 kW class), millimetres, Z up, suction toward -X, front toward -Y.

meta({
  name: "circulation-pump-skid",
  license: 'CC0-1.0',
  title: "Circulation pump skid",
  description: "Nutrient recirculation pump skid at about real size: end-suction centrifugal pump with finned TEFC motor, fan cowl and terminal box, coupling guard, bearing frame and volute with axial suction and top discharge, isolation valve and flanges on the suction, check valve, gate valve with handwheel and pressure gauge on the discharge riser into a header, on a galvanised channel frame with drip tray. Material controls: motor, pump casing, pipework, base frame, plus a single or duty/standby pump choice. industrialBlue, redCasing, stainless and weathered presets.",
  tags: ['pump', 'centrifugal pump', 'end suction pump', 'pump skid', 'circulation', 'recirculation', 'nutrient solution', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const motor = param('motor', '#3a78a8', { label: 'Motor (painted steel)' });
const casing = param('casing', '#b23a32', { label: 'Pump casing (cast iron)' });
const pipe = param('pipework', '#8f989e', { label: 'Pipework (PVC-U)' });
const frame = param('frame', '#a9b0b3', { label: 'Base frame (galvanised steel)' });
const pumps = param('pumps', 'single', { choices: ['single', 'duty + standby'], label: 'Pumps' });

presets({
  industrialBlue: { motor: '#3a78a8', casing: '#b23a32', pipework: '#8f989e', frame: '#a9b0b3' },
  redCasing: { motor: '#b23a32', casing: '#b23a32', pipework: '#5a6066', frame: '#7d868b' },
  stainless: { motor: '#c9ced1', casing: '#d7dbdd', pipework: '#e6e8e4', frame: '#9ba3a7' },
  weathered: { motor: '#4f6a80', casing: '#7d4a3e', pipework: '#a6a28e', frame: '#8b8a80' },
});

const p = assembly("circulation-pump-skid");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);

const dual = pumps.value === 'duty + standby';
const trains = dual ? [-330, 330] : [0];
const FW = dual ? 1260 : 600; // frame width (Y)
const ZB = 130; // top of the drip tray
const ZA = ZB + 300; // shaft centre line
const XV = -330; // volute centre plane
const ZD = 1350; // discharge header height

// Base frame: two channels, cross members, drip tray.
for (const sy of [-1, 1]) add(`channel-${sy > 0 ? 'b' : 'f'}`, blk(-50, sy * (FW / 2 - 40), 0, 1800, 80, 120).color(frame));
for (const x of [-900, -330, 250, 800]) add(`cross-${x}`, blk(x, 0, 20, 80, FW - 160, 100).color(frame));
add("drip-tray", blk(-50, 0, 120, 1780, FW - 40, 10).color(frame));
add("drain-plug", cylY(-900, -FW / 2, 60, 30, 20, 10).color('#5a6066'));

for (const [i, y] of trains.entries()) {
  const t = trains.length > 1 ? `pump-${i === 0 ? 'a' : 'b'}` : 'pump';
  // Motor: body with cooling fins, feet, fan cowl and terminal box.
  add(`${t}-motor-feet`, blk(400, y, ZB, 420, 300, 120).color(motor));
  add(`${t}-motor-body`, cylX(170, y, ZA, 480, 165, 20).color(motor));
  for (let k = 0; k < 7; k++) {
    add(`${t}-fin-${k}`, box(460, 14, 40, true).translate(0, 0, 180).rotateX(-90 + k * 30).translate(410, y, ZA).color(motor));
  }
  add(`${t}-flange-end`, cylX(150, y, ZA, 30, 180, 20).color(motor));
  add(`${t}-fan-cowl`, cylX(650, y, ZA, 150, 175, 20).color('#2a2d30'));
  add(`${t}-cowl-grille`, cylX(800, y, ZA, 8, 140, 20).color('#5a6066'));
  add(`${t}-terminal-box`, blk(380, y - 30, ZA + 165, 160, 150, 110).color(motor));
  add(`${t}-gland`, cylY(380, y - 105, ZA + 210, 30, 18, 10).color('#2a2d30'));
  add(`${t}-rating-plate`, blk(330, y - 168, ZA - 20, 110, 4, 60).color('#d9dcde'));
  // Coupling guard (half-round, safety yellow) and bearing frame.
  add(`${t}-guard`, cylX(-60, y, ZA, 210, 110, 14).subtract(blk(40, y, ZA - 200, 260, 260, 150)).color('#e8b923'));
  add(`${t}-guard-base`, blk(40, y, ZB, 220, 220, ZA - ZB - 50).color('#e8b923'));
  add(`${t}-bearing-frame`, cylX(-250, y, ZA, 190, 85, 16).color(casing));
  add(`${t}-bearing-foot`, blk(-150, y, ZB, 120, 200, ZA - ZB - 60).color(casing));
  // Volute: scroll casing, axial suction and tangential top discharge.
  add(`${t}-volute`, cylX(XV - 80, y, ZA, 160, 230, 24).color(casing));
  add(`${t}-volute-scroll`, cylX(XV - 70, y + 60, ZA + 50, 140, 210, 20).color(casing));
  add(`${t}-volute-foot`, blk(XV, y, ZB, 140, 260, ZA - ZB - 200).color(casing));
  add(`${t}-suction-neck`, cylX(XV - 220, y, ZA, 140, 75, 16).color(casing));
  add(`${t}-suction-flange`, cylX(XV - 240, y, ZA, 24, 110, 16).color(casing));
  add(`${t}-discharge-neck`, cylZ(XV, y + 120, ZA + 180, 130, 62, 16).color(casing));
  add(`${t}-discharge-flange`, cylZ(XV, y + 120, ZA + 300, 24, 95, 16).color(casing));
  // Suction line: butterfly valve with lever, pipe to the inlet flange.
  add(`${t}-suction-pipe`, cylX(-900, y, ZA, XV - 240 - -900, 75, 16).color(pipe));
  add(`${t}-butterfly`, cylX(-720, y, ZA, 60, 115, 16).color('#2a2d30'));
  add(`${t}-butterfly-lever`, blk(-690, y - 40, ZA + 115, 30, 200, 20).color('#c0392b'));
  add(`${t}-inlet-flange`, cylX(-930, y, ZA, 30, 115, 16).color(pipe));
  // Discharge riser: check valve, gate valve with handwheel, gauge.
  const RX = XV;
  const RY = y + 120;
  add(`${t}-riser`, cylZ(RX, RY, ZA + 324, ZD - ZA - 324, 62, 16).color(pipe));
  add(`${t}-check-valve`, cylZ(RX, RY, ZA + 340, 150, 90, 16).color('#2a2d30'));
  add(`${t}-check-cover`, blk(RX, RY - 90, ZA + 380, 90, 20, 70).color('#5a6066'));
  add(`${t}-gate-body`, cylZ(RX, RY, ZA + 540, 130, 85, 16).color('#2a2d30'));
  add(`${t}-gate-bonnet`, cylY(RX, RY - 80, ZA + 605, 130, 40, 12).color('#2a2d30'));
  add(`${t}-gate-stem`, cylY(RX, RY - 210, ZA + 605, 100, 10, 8).color('#c9ccce'));
  add(`${t}-handwheel`, cylY(RX, RY - 300, ZA + 605, 14, 110, 20).subtract(cylY(RX, RY - 290, ZA + 605, 40, 92, 20)).color('#c0392b'));
  for (let k = 0; k < 3; k++) add(`${t}-handwheel-spoke-${k}`, box(200, 10, 12, true).rotateY(k * 60).translate(RX, RY - 307, ZA + 605).color('#c0392b'));
  add(`${t}-gauge-tee`, cylY(RX, RY - 55, ZA + 790, 60, 9, 8).color('#c9a43a'));
  add(`${t}-gauge-case`, cylY(RX, RY - 115, ZA + 790, 30, 60, 18).color('#2a2d30'));
  add(`${t}-gauge-face`, cylY(RX, RY - 145, ZA + 790, 4, 52, 18).color('#f2f2ec'));
  add(`${t}-gauge-needle`, box(6, 3, 44, true).rotateY(40).translate(RX + 12, RY - 151, ZA + 800).color('#c0392b'));
}

// Discharge header: from the riser(s) along +X to the system flange.
const HY = 120; // riser line of the single pump, middle of the dual tie
if (dual) add("header-tie", cylY(XV, 330 + 120, ZD, 660, 70, 16).color(pipe));
for (const y of trains) add(`header-elbow-${y}`, cylZ(XV, y + 120, ZD - 20, 90, 72, 16).color(pipe));
add("header", cylX(XV, HY, ZD + 10, 1150 - 20, 70, 16).color(pipe));
add("header-flange", cylX(800, HY, ZD + 10, 30, 110, 16).color(pipe));
add("header-support", blk(700, HY, ZB, 70, 70, ZD - 70 - ZB).color(frame));
add("header-saddle", blk(700, HY, ZD - 80, 160, 90, 20).color(frame));
add("flow-arrow", blk(450, HY - 72, ZD - 10, 160, 4, 40).color('#f2f2ec'));

// Local isolator on a post at the back corner.
add("isolator-post", blk(825, FW / 2 - 60, ZB, 50, 50, 1050).color(frame));
add("isolator-box", blk(825, FW / 2 - 105, 900, 180, 90, 220).color('#e8b923'));
add("isolator-switch", cylY(825, FW / 2 - 150, 1010, 24, 45, 12).color('#c0392b'));

return p.model();
