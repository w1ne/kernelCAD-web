// SPDX-License-Identifier: CC0-1.0
// Hydroponic controller console: the floor-standing fertigation control desk
// that runs dosing, irrigation valves and climate for a growing range.
// What makes it a controller console: the classic sloped-desk profile, a
// touchscreen HMI and a row of selector switches and an emergency stop on
// the sloped desk, an upright panel above with pH, EC and temperature
// readouts and alarm lamps, a stack light on the roof, and a two-door
// cabinet below with vent louvres and handles, on a plinth.
// Generic visualization geometry at about real size (about 0.9 m wide,
// 1.5 m tall), millimetres, Z up, front toward -Y.

meta({
  name: "hydroponic-controller-console",
  license: 'CC0-1.0',
  title: "Hydroponic controller console",
  description: "Floor-standing fertigation controller console at about real size: sloped-desk cabinet with touchscreen HMI, selector switches, push buttons and emergency stop on the desk, an upright panel with pH, EC and temperature readouts and alarm lamps, roof stack light, and a two-door lower cabinet with vent louvres and handles on a plinth. Material controls: cabinet, desk fascia, screens, plinth and trim, plus a stack light on or off. controlGrey, growGreen, darkRoom and weathered presets.",
  tags: ['controller', 'control console', 'fertigation controller', 'hmi', 'touchscreen', 'irrigation control', 'climate control', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#d9dcd6', { label: 'Cabinet (powder-coated steel)' });
const fascia = param('fascia', '#3b4a52', { label: 'Desk fascia (anodised panel)' });
const glass = param('screens', '#1f3a4a', { label: 'Screens (instrument glass)' });
const trim = param('plinth', '#2f5d3a', { label: 'Plinth and trim' });
const stack = param('stackLight', 'on', { choices: ['on', 'off'], label: 'Stack light' });

presets({
  controlGrey: { cabinet: '#d9dcd6', fascia: '#3b4a52', screens: '#1f3a4a', plinth: '#2f5d3a' },
  growGreen: { cabinet: '#e9ece4', fascia: '#2f5d3a', screens: '#163028', plinth: '#3b3f42' },
  darkRoom: { cabinet: '#3b3f42', fascia: '#22262a', screens: '#2a4a5c', plinth: '#c0392b' },
  weathered: { cabinet: '#c4c0b2', fascia: '#55605f', screens: '#3a4a4a', plinth: '#5f6b4a' },
});

const p = assembly("hydroponic-controller-console");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
// A (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 900;
// Desk surface from (y -320, z 960) up to (y 60, z 1150).
const SLOPE = (Math.atan2(1150 - 960, 60 + 320) * 180) / Math.PI;
const DY = (60 - 320) / 2;
const DZ = (1150 + 960) / 2;
// Parts built flat on z = 0 (v along the slope, toward +Y), set onto the desk.
const onDesk = (s: Shape) => s.rotateX(SLOPE).translate(0, DY, DZ);

add("plinth", blk(0, 0, 0, W + 40, 560, 100).color(trim));
add("cabinet", profileYZ([[-260, 100], [260, 100], [260, 1500], [60, 1500], [60, 1150], [-320, 960], [-320, 915], [-260, 895]], W).color(cabinet));
add("roof-trim", blk(0, 160, 1500, W + 20, 220, 16).color(trim));
add("desk-edge", blk(0, -322, 912, W + 10, 14, 52).color(trim));

// Sloped desk: fascia, touchscreen HMI, selectors, push buttons, e-stop.
add("desk-fascia", onDesk(blk(0, 0, 0, W - 60, 400, 6)).color(fascia));
add("hmi-bezel", onDesk(blk(-130, 30, 6, 420, 280, 14)).color('#22262a'));
add("hmi-screen", onDesk(blk(-130, 30, 20, 380, 240, 3)).color(glass));
add("hmi-trend", onDesk(blk(-200, 60, 23, 180, 8, 2)).color('#7fd07a'));
add("hmi-trend-b", onDesk(blk(-110, 20, 23, 140, 8, 2)).color('#e8b923'));
add("hmi-tile-a", onDesk(blk(-40, 100, 23, 120, 50, 2)).color('#2f6fa8'));
for (let k = 0; k < 3; k++) {
  add(`selector-${k}`, onDesk(cylZ(160 + k * 90, 90, 6, 20, 26, 12)).color('#22262a'));
  add(`selector-${k}-handle`, onDesk(blk(160 + k * 90, 90, 26, 14, 44, 18)).color('#e6e8e8'));
  add(`selector-${k}-tag`, onDesk(blk(160 + k * 90, 140, 6, 70, 22, 2)).color('#f2f2ec'));
}
add("button-start", onDesk(cylZ(180, -40, 6, 22, 20, 12)).color('#4f9a3a'));
add("button-stop", onDesk(cylZ(260, -40, 6, 22, 20, 12)).color('#c0392b'));
add("estop-ring", onDesk(cylZ(360, -60, 6, 10, 52, 16)).color('#e3b52c'));
add("estop", onDesk(cylZ(360, -60, 16, 30, 22, 12).union(cylZ(360, -60, 46, 22, 40, 16))).color('#c0392b'));
add("key-switch", onDesk(cylZ(180, -130, 6, 14, 18, 10)).color('#c9ced1'));

// Upright panel: three digital readouts with labels, alarm lamps, door lock.
const readouts: [string, string][] = [['ph', '#e8862b'], ['ec', '#7fd07a'], ['temp', '#5fb6e0']];
for (const [i, [id, col]] of readouts.entries()) {
  const x = -260 + i * 220;
  add(`${id}-bezel`, blk(x, 55, 1300, 180, 10, 110).color('#22262a'));
  add(`${id}-display`, blk(x, 49, 1320, 150, 4, 70).color(glass));
  add(`${id}-digits`, blk(x + 10, 46, 1335, 110, 2, 40).color(col));
  add(`${id}-label`, blk(x, 58, 1250, 120, 4, 26).color('#f2f2ec'));
}
for (const [i, col] of ['#c0392b', '#e8b923', '#4f9a3a'].entries()) {
  add(`alarm-lamp-${i}`, cylY(-280 + i * 80, 60, 1200, 22, 20, 12).color(col));
}
add("panel-lock", cylY(360, 60, 1440, 14, 16, 10).color('#c9ced1'));
add("brand-plate", blk(300, 57, 1200, 160, 6, 40).color(trim));

// Lower cabinet: two doors with handles, vent louvres, hinges, cable gland.
for (const sx of [-1, 1]) {
  const x = sx * (W / 4 + 5);
  add(`door-${sx > 0 ? 'r' : 'l'}`, blk(x, -264, 150, W / 2 - 40, 8, 700).color(cabinet));
  add(`handle-${sx > 0 ? 'r' : 'l'}`, blk(sx * 50, -276, 440, 24, 18, 160).color('#3b3f42'));
  for (let k = 0; k < 5; k++) add(`louvre-${sx > 0 ? 'r' : 'l'}-${k}`, blk(x + sx * 30, -270, 200 + k * 34, 240, 6, 12).color('#3b3f42'));
  for (const z of [220, 760]) add(`hinge-${sx > 0 ? 'r' : 'l'}-${z}`, blk(sx * (W / 2 - 22), -270, z, 16, 14, 70).color('#3b3f42'));
}
add("door-label", blk(-W / 4 - 5, -270, 640, 160, 4, 60).color('#e3b52c'));
add("cable-gland", cylZ(-300, 200, 1500, 40, 30, 12).color('#3b3f42'));
add("cable", cylZ(-300, 200, 1540, 260, 16, 8).color('#22262a'));

// Stack light on the roof: base, green / amber / red tiers, cap.
if (stack.value === 'on') {
  add("stack-base", cylZ(330, 160, 1516, 40, 34, 14).color('#3b3f42'));
  add("stack-mast", cylZ(330, 160, 1556, 80, 14, 10).color('#c9ced1'));
  for (const [i, col] of ['#4f9a3a', '#e8b923', '#c0392b'].entries()) {
    add(`stack-tier-${i}`, cylZ(330, 160, 1640 + i * 72, 66, 36, 14).color(col));
  }
  add("stack-cap", cylZ(330, 160, 1856, 16, 36, 14).color('#3b3f42'));
}

return p.model();
