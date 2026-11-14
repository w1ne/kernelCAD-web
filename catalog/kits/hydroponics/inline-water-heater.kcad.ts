// SPDX-License-Identifier: CC0-1.0
// Inline water heater: the electric flow-through heater that keeps nutrient
// solution in the root zone at temperature on its way back to the crop.
// What makes it an inline heater: a vertical stainless pressure vessel with a
// domed bottom and drain valve, lagged in an insulated jacket with banding
// straps, a terminal head on top with the thermostat dial, pilot lamps and
// cable gland, and the solution piped through it, low inlet with ball valve
// and union, high outlet with flow switch, thermometer and pressure relief
// valve, all on a four-leg floor stand.
// Generic visualization geometry at about real size (vessel about 240 mm
// diameter, 3 to 12 kW), millimetres, Z up, flow from -X to +X, front -Y.

meta({
  name: "inline-water-heater",
  license: 'CC0-1.0',
  title: "Inline water heater",
  description: "Electric inline nutrient-solution heater at about real size: vertical stainless vessel with domed bottom and drain valve, insulated jacket with banding straps and rating plate, terminal head with thermostat dial, pilot lamps and cable, low inlet with ball valve and union, high outlet with flow switch, thermometer and pressure relief valve, on a four-leg floor stand. Material controls: jacket, vessel, pipework, terminal head, plus a 3, 6 or 12 kW rating that sets the vessel height. greyJacket, whiteService, stainless and weathered presets.",
  tags: ['heater', 'water heater', 'inline heater', 'immersion heater', 'nutrient heating', 'root zone temperature', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const jacket = param('jacket', '#6f7c82', { label: 'Insulated jacket (painted cladding)' });
const vessel = param('vessel', '#c9ced1', { label: 'Vessel and stand (stainless steel)' });
const pipe = param('pipework', '#9aa3a8', { label: 'Pipework (PVC-U)' });
const head = param('terminalHead', '#e7e3d6', { label: 'Terminal head (polymer)' });
const rating = param('rating', '6 kW', { choices: ['3 kW', '6 kW', '12 kW'], label: 'Heater rating' });

presets({
  greyJacket: { jacket: '#6f7c82', vessel: '#c9ced1', pipework: '#9aa3a8', terminalHead: '#e7e3d6' },
  whiteService: { jacket: '#eceae2', vessel: '#b7bdc0', pipework: '#5a6066', terminalHead: '#c0392b' },
  stainless: { jacket: '#d7dbdd', vessel: '#e6e8e8', pipework: '#c9ced1', terminalHead: '#3b3f42' },
  weathered: { jacket: '#7d7a6e', vessel: '#a4a49a', pipework: '#a6a28e', terminalHead: '#c8bfa4' },
});

const p = assembly("inline-water-heater");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 20) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const H = rating.value === '3 kW' ? 450 : rating.value === '12 kW' ? 850 : 650; // vessel barrel height
const Z0 = 320; // bottom of the barrel
const ZT = Z0 + H; // top of the barrel
const ZI = Z0 + 80; // inlet centre line
const ZO = ZT - 90; // outlet centre line

// Floor stand: base plate, four splayed legs, cradle ring.
add("base-plate", blk(0, 0, 0, 480, 480, 16).color(vessel));
for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
  add(`leg-${sx}${sy}`, rod([sx * 190, sy * 190, 16], [sx * 92, sy * 92, Z0 - 20], 14).color(vessel));
  add(`leg-foot-${sx}${sy}`, cylZ(sx * 190, sy * 190, 10, 12, 26, 10).color('#5a6066'));
}
add("cradle-ring", cylZ(0, 0, Z0 - 40, 30, 128, 20).subtract(cylZ(0, 0, Z0 - 50, 50, 100, 20)).color(vessel));

// Vessel: domed bottom with drain valve, barrel under the jacket, collar.
add("vessel", turned([[0, Z0 - 60], [60, Z0 - 50], [108, Z0 - 22], [120, Z0], [120, ZT], [0, ZT]]).color(vessel));
add("drain-valve", cylZ(0, 0, Z0 - 110, 52, 18, 10).color('#c9a43a'));
add("drain-handle", blk(30, 0, Z0 - 100, 60, 12, 12).color('#c0392b'));
add("jacket", cylZ(0, 0, Z0 + 30, H - 70, 142, 20).color(jacket));
for (const z of [Z0 + 110, ZT - 160]) add(`strap-${z}`, cylZ(0, 0, z, 22, 146, 20).color('#c9ced1'));
add("rating-plate", blk(-30, -141, Z0 + H / 2 - 30, 110, 4, 70).color('#e6e8e8'));
add("warning-label", blk(-30, -142, Z0 + H / 2 + 60, 80, 4, 40).color('#e3b52c'));

// Terminal head: housing, lid, thermostat dial, pilot lamps, cable gland.
add("head", cylZ(0, 0, ZT, 140, 136, 20).color(head));
add("head-lid", turned([[0, ZT + 140], [146, ZT + 140], [146, ZT + 156], [110, ZT + 176], [0, ZT + 180]]).color(head));
add("lid-screw", cylZ(0, 0, ZT + 176, 12, 18, 8).color('#5a6066'));
add("dial-bezel", cylY(0, -132, ZT + 70, 18, 46, 18).color('#3b3f42'));
add("dial", cylY(0, -150, ZT + 70, 10, 38, 18).color('#f2f2ec'));
add("dial-pointer", box(8, 6, 36, true).rotateY(-35).translate(-8, -162, ZT + 80).color('#c0392b'));
add("lamp-power", cylY(-86, -102, ZT + 105, 16, 12, 10).color('#4f9a3a'));
add("lamp-heat", cylY(86, -102, ZT + 105, 16, 12, 10).color('#e8862b'));
add("cable-gland", cylX(132, 0, ZT + 70, 34, 18, 10).color('#3b3f42'));
add("cable-a", rod([166, 0, ZT + 70], [260, 30, ZT + 140], 9).color('#22262a'));
add("cable-b", rod([260, 30, ZT + 140], [300, 60, ZT + 380], 9).color('#22262a'));

// Inlet (low, -X): flange, ball valve with lever, union, pipe into the vessel.
add("inlet-pipe", cylX(-450, 0, ZI, 330, 26, 14).color(pipe));
add("inlet-flange", cylX(-470, 0, ZI, 24, 50, 14).color(pipe));
add("inlet-valve", cylX(-400, 0, ZI, 70, 40, 14).color('#3b3f42'));
add("inlet-valve-lever", blk(-365, -40, ZI + 40, 24, 110, 14).color('#2f6fa8'));
add("inlet-union", cylX(-260, 0, ZI, 50, 40, 6).color(pipe));
add("inlet-boss", cylX(-160, 0, ZI, 30, 36, 14).color(vessel));

// Outlet (high, +X): boss, thermometer tee, flow switch, relief valve, union.
add("outlet-boss", cylX(130, 0, ZO, 30, 36, 14).color(vessel));
add("outlet-pipe", cylX(120, 0, ZO, 340, 26, 14).color(pipe));
add("outlet-union", cylX(380, 0, ZO, 50, 40, 6).color(pipe));
add("outlet-flange", cylX(460, 0, ZO, 24, 50, 14).color(pipe));
add("thermo-stem", cylZ(200, 0, ZO, 70, 10, 8).color('#c9a43a'));
add("thermo-case", cylY(200, -4, ZO + 110, 20, 44, 16).color('#3b3f42'));
add("thermo-face", cylY(200, -24, ZO + 110, 4, 38, 16).color('#f2f2ec'));
add("thermo-needle", box(5, 3, 30, true).rotateY(50).translate(208, -30, ZO + 118).color('#c0392b'));
add("flow-switch", blk(290, 0, ZO + 18, 70, 64, 72).color('#2f6fa8'));
add("flow-switch-gland", cylZ(290, 0, ZO + 90, 24, 12, 8).color('#3b3f42'));
add("relief-tee", cylZ(352, 0, ZO, 60, 16, 10).color(pipe));
add("relief-valve", turned([[0, 0], [26, 0], [26, 50], [16, 66], [16, 90], [0, 90]], 12).translate(352, 0, ZO + 60).color('#c9a43a'));
add("relief-lever", blk(352, -20, ZO + 150, 16, 60, 10).color('#c0392b'));
add("relief-outlet", cylY(352, -22, ZO + 90, 50, 12, 10).color('#c9a43a'));
add("flow-arrow", blk(260, -27, ZO - 6, 80, 4, 12).color('#f2f2ec'));

return p.model();
