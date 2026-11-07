// CNC plasma cutting gantry, the machine that cuts hull plates and brackets
// out of flat steel on the panel line. What makes it one: a box-beam bridge
// spanning a slat cutting table on two driven end carriages that run along
// floor rails; a torch carriage on the bridge carries a Z lifter and a long
// plasma torch pointing straight down at the plate; drag chains feed power,
// gas and control cables to both axes; a downdraft table with sawtooth slats,
// a plate with part outlines and an operator console at one end.
// Millimetres, Z up, ground origin, rails along X, bridge along Y.
meta({
  name: "plasma-cutting-gantry-head",
  license: 'CC0-1.0',
  title: "CNC plasma cutting gantry",
  description: "CNC plasma cutting gantry at about real size: box-beam bridge on two driven end carriages with servo motors and rail wheels running on raised floor rails, a torch carriage with Z lifter and long plasma torch pointing down at a steel plate, drag chains along the rail and the bridge, a downdraft slat table with sawtooth slats, a fume extraction duct, a plate with cut-part outlines and an operator console with an angled screen. Material controls: gantry paint, machined steel, cutting table, cable carriers; fresh-coat, weathered-yard and blue-machine presets.",
  tags: ["shipyard", "shipbuilding", "plasma cutting", "CNC", "gantry", "plate cutting", "panel line", "hull fabrication", "CC0"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const gantryPaint = param('gantryPaint', '#e07a26', { label: 'Gantry paint' });
const machinedSteel = param('machinedSteel', '#a8b0b4', { label: 'Rails and machined steel' });
const cuttingTable = param('cuttingTable', '#4d5458', { label: 'Cutting table and plate' });
const cableCarrier = param('cableCarrier', '#26292c', { label: 'Cable carriers and torch body' });

presets({
  'fresh-coat': { gantryPaint: '#f08a30', machinedSteel: '#c2c9cc', cuttingTable: '#596165', cableCarrier: '#2c3033' },
  'weathered-yard': { gantryPaint: '#b5642c', machinedSteel: '#8a8f90', cuttingTable: '#5d5048', cableCarrier: '#2a2a2a' },
  'blue-machine': { gantryPaint: '#2f62a6', cableCarrier: '#e0a51f' },
});

const p = assembly("plasma-cutting-gantry-head");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Closed (y, z) profile extruded along X from x0 to x1.
const side = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};
// Closed (x, z) profile extruded along Y from y0 to y1.
const front = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};

const kerf = '#1b1d1f', screen = '#3a6e8c';
const railY = 2150, railZ = 560;
const gx = 400; // gantry position along the rails
const beamZ0 = 1250, beamZ1 = 1650;

// ---- Floor rails on stands ----
for (const s of [-1, 1]) {
  const y = s * railY;
  add(`rail-beam-${s}`, blk(-3000, y - 120, 380, 3000, y + 120, 520).color(gantryPaint));
  add(`rail-${s}`, side([[y - 30, 520], [y + 30, 520], [y + 30, 545], [y + 45, 545], [y + 45, railZ], [y - 45, railZ], [y - 45, 545], [y - 30, 545]], -3000, 3000).color(machinedSteel));
  add(`gear-rack-${s}`, blk(-3000, y + s * 125, 440, 3000, y + s * 165, 520).color(machinedSteel));
  for (const x of [-2700, -1350, 0, 1350, 2700]) {
    add(`rail-stand-${s}-${x}`, blk(x - 70, y - 70, 0, x + 70, y + 70, 380).color(gantryPaint));
    add(`rail-stand-foot-${s}-${x}`, blk(x - 160, y - 160, 0, x + 160, y + 160, 25).color(gantryPaint));
  }
}

// ---- Downdraft slat table with plate and cut-part outlines ----
add('table-frame', blk(-2700, -1750, 0, 2700, 1750, 520).color(cuttingTable));
add('table-hopper', front([[-2600, 80], [2600, 80], [2600, 500], [-2600, 500]], -1700, 1700).color('#383d40'));
for (let x = -2550; x <= 2550; x += 150) {
  add(`slat-${x}`, blk(x - 4, -1700, 520, x + 4, 1700, 600).color(machinedSteel));
}
add('plate', blk(-2400, -1500, 600, 1900, 1400, 620).color(cuttingTable));
const outline = (n, x0, y0, x1, y1) => {
  add(`${n}-a`, blk(x0, y0, 620, x1, y0 + 8, 622).color(kerf));
  add(`${n}-b`, blk(x0, y1 - 8, 620, x1, y1, 622).color(kerf));
  add(`${n}-c`, blk(x0, y0, 620, x0 + 8, y1, 622).color(kerf));
  add(`${n}-d`, blk(x1 - 8, y0, 620, x1, y1, 622).color(kerf));
};
outline('cut-bracket-1', -2200, -1300, -1300, -500);
outline('cut-bracket-2', -2200, -300, -1300, 500);
outline('cut-floor-plate', -1100, -1300, 300, 300);
add('cut-lightening-hole', rod(220, 620, 623, 12).translate(-400, -500, 0).color(kerf));
add('duct-riser', blk(2700, -400, 100, 2950, 400, 450).color(gantryPaint));
add('extraction-duct', rod(220, 0, 1600, 10).rotateY(90).translate(2950, 0, 275).color(machinedSteel));
add('extraction-fan', blk(4550, -450, 0, 5250, 450, 900).color(gantryPaint));
add('extraction-fan-motor', rod(200, 900, 1250, 10).translate(4900, 0, 0).color(cableCarrier));

// ---- Gantry: end carriages, servo drives, box-beam bridge ----
for (const s of [-1, 1]) {
  const y = s * railY;
  add(`end-carriage-${s}`, front([[gx - 600, railZ + 60], [gx + 600, railZ + 60], [gx + 450, beamZ0], [gx - 450, beamZ0]], y - 170, y + 170).color(gantryPaint));
  add(`end-carriage-skirt-${s}`, blk(gx - 650, y - 190, railZ - 60, gx + 650, y + 190, railZ + 80).color(gantryPaint));
  for (const x of [gx - 450, gx + 450]) add(`rail-wheel-${s}-${x}`, rod(85, -40, 40, 12).rotateX(90).translate(x, y, railZ + 60).color(machinedSteel));
  add(`servo-motor-${s}`, rod(90, 0, 320, 12).translate(gx + 200, y + s * 230, railZ + 140).color(cableCarrier));
  add(`servo-gearhead-${s}`, blk(gx + 110, y + s * 230 - 90, railZ - 40, gx + 290, y + s * 230 + 90, railZ + 140).color(machinedSteel));
}
add('bridge-beam', side([[-railY - 200, beamZ0], [railY + 200, beamZ0], [railY + 200, beamZ1], [-railY - 200, beamZ1]], gx - 200, gx + 200).color(gantryPaint));
add('bridge-linear-rail-top', blk(gx - 220, -railY, beamZ1 - 120, gx - 200, railY, beamZ1 - 80).color(machinedSteel));
add('bridge-linear-rail-bottom', blk(gx - 220, -railY, beamZ0 + 80, gx - 200, railY, beamZ0 + 120).color(machinedSteel));
add('bridge-rack', blk(gx - 230, -railY, beamZ0 + 190, gx - 200, railY, beamZ0 + 220).color(machinedSteel));

// ---- Torch carriage, Z lifter and plasma torch ----
const ty = 500, tx = gx - 230;
add('torch-carriage-plate', blk(tx - 40, ty - 230, beamZ0 - 20, tx, ty + 230, beamZ1 + 20).color(gantryPaint));
add('torch-y-motor', rod(70, 0, 260, 10).translate(tx - 120, ty + 140, beamZ1 + 20).color(cableCarrier));
add('lifter-column', blk(tx - 160, ty - 90, 980, tx - 40, ty + 90, beamZ1 + 160).color(machinedSteel));
add('lifter-motor', rod(60, beamZ1 + 160, beamZ1 + 400, 10).translate(tx - 100, ty, 0).color(cableCarrier));
add('lifter-slide', blk(tx - 230, ty - 70, 900, tx - 160, ty + 70, 1250).color(gantryPaint));
add('torch-holder', blk(tx - 330, ty - 70, 980, tx - 230, ty + 70, 1120).color(gantryPaint));
add('torch-body', lathe([[30, 680], [42, 720], [48, 900], [48, 1260]], 10).translate(tx - 280, ty, 0).color(cableCarrier));
add('torch-shield-cup', lathe([[16, 640], [30, 680]], 10).translate(tx - 280, ty, 0).color('#c7a46a'));
add('torch-lead', rod(22, 1260, 1700, 6).translate(tx - 280, ty, 0).color(cableCarrier));
add('arc-glow', rod(10, 622, 640, 6).translate(tx - 280, ty, 0).color('#9fd8ff'));

// ---- Drag chains: along the +Y rail and along the bridge ----
const cy = railY + 380, run = (gx - 300 + 2800) / 14;
add('rail-chain-tray', blk(-3000, cy - 110, 300, 3000, cy + 110, 330).color(machinedSteel));
for (let i = 0; i < 14; i++) add(`rail-chain-link-${i}`, blk(-2800 + i * run, cy - 80, 330, -2800 + (i + 0.85) * run, cy + 80, 400).color(cableCarrier));
for (let i = 0; i <= 6; i++) {
  const t = (i * Math.PI) / 6, x = -2800 - 162 * Math.sin(t), z = 527 - 162 * Math.cos(t);
  add(`rail-chain-bend-${i}`, blk(x - 45, cy - 80, z - 35, x + 45, cy + 80, z + 35).color(cableCarrier));
}
add('rail-chain-upper-run', blk(-2800, cy - 80, 655, gx - 300, cy + 80, 725).color(cableCarrier));
add('rail-chain-bracket', blk(gx - 320, railY + 170, 650, gx - 200, cy, 760).color(gantryPaint));
add('bridge-chain-tray', blk(gx - 60, -railY, beamZ1, gx + 140, railY, beamZ1 + 30).color(machinedSteel));
add('bridge-chain-run', blk(gx - 30, -1900, beamZ1 + 30, gx + 110, ty, beamZ1 + 100).color(cableCarrier));
add('bridge-chain-top', blk(gx - 30, -1900, beamZ1 + 250, gx + 110, ty + 100, beamZ1 + 320).color(cableCarrier));
add('bridge-chain-bend', blk(gx - 30, -2050, beamZ1 + 30, gx + 110, -1900, beamZ1 + 320).color(cableCarrier));

// ---- Operator console on the -Y end carriage ----
const oy = -railY - 420;
add('console-post', blk(gx + 450, oy - 60, railZ + 80, gx + 570, oy + 60, 1350).color(gantryPaint));
add('console-arm', blk(gx + 450, oy, 1230, gx + 570, -railY - 170, 1330).color(gantryPaint));
add('console-box', blk(gx + 300, oy - 260, 1350, gx + 720, oy + 140, 1500).color(gantryPaint));
add('console-screen-housing', blk(gx + 330, oy - 260, 1500, gx + 690, oy - 230, 1800).color(cableCarrier));
add('console-screen', blk(gx + 350, oy - 268, 1520, gx + 670, oy - 260, 1780).color(screen));
add('console-estop', rod(30, 1500, 1540, 8).translate(gx + 640, oy + 60, 0).color('#d1352a'));

return p.model();
