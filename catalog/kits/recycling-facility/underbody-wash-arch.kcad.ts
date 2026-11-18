// SPDX-License-Identifier: CC0-1.0
// Underbody wash arch: the drive-through wheel-and-chassis wash at the
// facility exit that stops collection trucks tracking mud and litter onto
// the public road. What makes it that wash rather than a gate: a
// galvanised portal frame straddling the lane with spray risers down both
// legs, a header pipe across the top, a floor spray bar set in a grated
// drain trench under the lane, fans of water from every nozzle, kerbs that
// guide the wheels, and a pump skid with a control box and go/stop light
// beside the lane.
// Generic visualization geometry at about real size (4.2 m clear lane,
// 4.6 m high), millimetres, Z up, trucks drive along X, side facing -Y.

meta({
  name: "underbody-wash-arch",
  license: 'CC0-1.0',
  title: "Underbody wash arch",
  description: "Drive-through truck underbody and wheel wash at about real size: galvanised portal frame over the lane with spray risers on both legs and a header pipe, floor spray bar in a grated drain trench, water fans from the nozzles, wheel-guide kerbs, pump skid with a control box and a go/stop light. Material controls: concrete pad, frame steel, spray pipework and water. site, weathered, painted and winter presets.",
  tags: ["recycling", "wheel wash", "truck wash", "underbody wash", "spray arch", "mud control", "site exit", "materials recovery", "waste management", "site equipment", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#8f918a', { label: 'Pad, kerbs and trench (concrete)' });
const frame = param('frame', '#b9c0c2', { label: 'Portal frame (galvanised steel)' });
const pipework = param('pipework', '#2f5d9a', { label: 'Spray pipework and pump' });
const water = param('water', '#9fcbe6', { label: 'Water spray' });
const spraying = param('spraying', 'on', { choices: ['on', 'off'], label: 'Spray' });

presets({
  site: { concrete: '#8f918a', frame: '#b9c0c2', pipework: '#2f5d9a', water: '#9fcbe6' },
  weathered: { concrete: '#7a7466', frame: '#8c8a80', pipework: '#4d5f6c', water: '#9ab0a8' },
  painted: { concrete: '#8f918a', frame: '#f0c419', pipework: '#2b2f33', water: '#9fcbe6' },
  winter: { concrete: '#a7aaa5', frame: '#c4c9cb', pipework: '#c8322a', water: '#e6f1f6' },
});

const p = assembly("underbody-wash-arch");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
// Flat fans of spray: thin triangular wedges from the nozzle tip.
const fanY = (x: number, y: number, z: number, dir: number, len: number, spread: number) =>
  extrudePolygon([[0, 0], [spread, dir * len], [-spread, dir * len]], 20).translate(x, y, z - 10);
const fanZ = (x: number, y: number, z: number, dir: number, len: number, spread: number, lean = 0) =>
  extrudePolygon([[0, 0], [spread + lean, dir * len], [-spread + lean, dir * len]], 20).rotateX(90).translate(x, y + 10, z);

const LANE = 4200, HL = LANE / 2, PAD = 7000, ZP = 150, ZH = 4600; // lane width, pad length, pad top, header height
const LEG = HL + 250;

// Concrete pad, wheel-guide kerbs and the grated drain trench across the lane.
add("pad", blk(0, 0, 0, PAD, LANE + 1600, ZP).color(concrete));
for (const s of [-1, 1]) add(`kerb-${s > 0 ? 'b' : 'f'}`, blk(0, s * (HL + 80), ZP, PAD - 400, 220, 180).color(concrete));
add("trench-edge", blk(0, 0, ZP, 1300, LANE, 10).subtract(blk(0, 0, ZP - 5, 1100, LANE - 200, 20)).color('#6b6e68'));
for (let k = 0; k < 11; k++) add(`grate-bar-${k}`, blk(-500 + k * 100, 0, ZP, 30, LANE - 200, 8).color('#3a3f44'));
for (const x of [-350, 350]) add(`floor-spray-bar-${x}`, cylinder(LANE - 300, 40, 10).rotateX(90).translate(x, HL - 150, ZP + 60).color(pipework));

// Galvanised portal frame with knee braces.
for (const s of [-1, 1]) {
  const y = s * LEG;
  add(`leg-${s > 0 ? 'b' : 'f'}`, blk(0, y, ZP, 260, 260, ZH - ZP).color(frame));
  add(`base-plate-${s > 0 ? 'b' : 'f'}`, blk(0, y, ZP, 500, 500, 30).color(frame));
  add(`knee-brace-${s > 0 ? 'b' : 'f'}`, rod([0, y - s * 120, ZH - 900], [0, y - s * 800, ZH - 150], 50).color(frame));
}
add("header-beam", blk(0, 0, ZH, 300, 2 * LEG + 260, 360).color(frame));
add("header-sign", blk(-160, 0, ZH + 20, 12, 2200, 300).color('#1f6b3a'));
add("header-sign-text", blk(-170, 0, ZH + 130, 12, 1500, 80).color('#f2f2ee'));

// Spray risers down both legs and the header pipe across the top.
const nozzleZ = [500, 1100, 1700, 2400];
for (const s of [-1, 1]) {
  const y = s * (LEG - 180);
  add(`riser-${s > 0 ? 'b' : 'f'}`, cylinder(ZH - 200 - 300, 45, 10).translate(-200, y, 300).color(pipework));
  for (const z of nozzleZ) add(`nozzle-${s > 0 ? 'b' : 'f'}-${z}`, rod([-200, y, z], [-200, y - s * 140, z], 30, 8).color(pipework));
}
add("header-pipe", cylinder(2 * (LEG - 180), 45, 10).rotateX(90).translate(-200, LEG - 180, ZH - 200).color(pipework));
for (const y of [-1400, 0, 1400]) add(`header-nozzle-${y}`, rod([-200, y, ZH - 200], [-200, y, ZH - 360], 30, 8).color(pipework));

// Water fans from every nozzle when the wash is running.
if (spraying.value === 'on') {
  for (const s of [-1, 1]) {
    for (const z of nozzleZ) add(`fan-${s > 0 ? 'b' : 'f'}-${z}`, fanY(-200, s * (LEG - 320), z, -s, 900, 260).color(water));
  }
  for (const y of [-1400, 0, 1400]) add(`fan-top-${y}`, fanZ(-200, y, ZH - 360, -1, 1000, 380).color(water));
  for (const x of [-350, 350]) for (const y of [-1200, 0, 1200]) add(`fan-floor-${x}-${y}`, fanZ(x, y, ZP + 100, 1, 700, 200, x > 0 ? 200 : -200).color(water));
}

// Pump skid, control box and go/stop light beside the lane.
const SX = -2300, SY = -(HL + 900);
add("pump-skid", blk(SX, SY, ZP, 1400, 800, 120).color('#3a3f44'));
add("pump-motor", cylinder(600, 180, 14).rotateY(90).translate(SX - 600, SY, ZP + 320).color(pipework));
add("pump-volute", cylinder(220, 260, 14).rotateY(90).translate(SX + 20, SY, ZP + 320).color(pipework));
add("pump-discharge", rod([SX + 130, SY, ZP + 580], [SX + 130, SY, ZP + 900], 70).color(pipework));
add("feed-pipe", rod([SX + 130, SY, ZP + 900], [-200, SY, ZP + 900], 60).color(pipework));
add("feed-pipe-riser", rod([-200, SY, ZP + 900], [-200, -(LEG - 180), ZP + 900], 60).color(pipework));
add("control-box", blk(SX + 400, SY - 150, ZP + 120, 500, 300, 900).color('#d9d9d4'));
add("control-door-handle", blk(SX + 550, SY - 305, ZP + 600, 30, 20, 160).color('#3a3f44'));
add("signal-post", cylinder(2700, 50, 10).translate(1600, -(LEG + 250), ZP).color('#3a3f44'));
add("signal-head", blk(1600, -(LEG + 250), ZP + 2700, 280, 220, 640).color('#1f2224'));
add("signal-green", cylinder(20, 85, 12).rotateY(-90).translate(1460, -(LEG + 250), ZP + 2860).color('#3aa65a'));
add("signal-red-lens", cylinder(20, 85, 12).rotateY(-90).translate(1460, -(LEG + 250), ZP + 3180).color('#c8322a'));

return p.model();
