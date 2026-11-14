// SPDX-License-Identifier: CC0-1.0
// Liquid waste IBC tank: the 1000-litre intermediate bulk container a
// recovery site uses to hold waste oils, coolants and rinse water. What makes
// it an IBC rather than a crate: a translucent rounded HDPE bottle with
// moulded level marks, held in a galvanised tubular cage of welded verticals
// and horizontals, all sitting on a four-way pallet base; a big screw fill
// cap and vent on top; and a ball valve with a lever handle at the bottom of
// the front face, in a gap left in the cage. A hazard diamond and a waste
// label plate are wired to the cage.
// Generic visualization geometry at about real size (1200 x 1000 x 1160 mm),
// millimetres, Z up, valve on -Y.

meta({
  name: "liquid-waste-ibc-tank",
  license: 'CC0-1.0',
  title: "Liquid waste IBC tank",
  description: "1000-litre IBC tote at about real size: translucent rounded HDPE bottle with moulded level marks, galvanised tubular cage, four-way pallet base, screw fill cap and vent, bottom ball valve with lever handle, hazard diamond and waste label plate. Pallet choice (plastic, steel, timber). Material controls: bottle, cage, pallet, cap and valve. wasteOil, rinseWater and weathered presets.",
  tags: ['ibc', 'ibc tote', 'intermediate bulk container', 'liquid waste', 'waste oil', 'tank', 'containers', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bottle = param('bottle', '#e9e6d8', { label: 'Bottle (translucent HDPE)' });
const cage = param('cage', '#b9c0c2', { label: 'Tubular cage (galvanised steel)' });
const pallet = param('pallet', '#2b2d2f', { label: 'Pallet base' });
const fittings = param('fittings', '#2f5d9e', { label: 'Fill cap and valve' });
const palletType = param('palletType', 'plastic', { choices: ['plastic', 'steel', 'timber'], label: 'Pallet base' });

presets({
  wasteOil: { bottle: '#5a4a32', cage: '#b9c0c2', pallet: '#2b2d2f', fittings: '#1f1f1f' },
  rinseWater: { bottle: '#e9e6d8', cage: '#b9c0c2', pallet: '#2b2d2f', fittings: '#2f5d9e' },
  weathered: { bottle: '#c9bf9f', cage: '#8f8a7c', pallet: '#8a6d4a', fittings: '#8f4a2a' },
});

const p = assembly("liquid-waste-ibc-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const L = 1200;
const W = 1000;
const PH = 150;
const TOP = 1160;
const TR = 11;

// Pallet base: deck on three runners, or nine timber blocks.
if (palletType.value === 'timber') {
  add("pallet-deck", blk(0, 0, 122, L, W, 28).color(pallet));
  for (const x of [-520, 0, 520]) for (const y of [-420, 0, 420]) add(`pallet-block-${x}-${y}`, blk(x, y, 22, 150, 150, 100).color(pallet));
  for (const y of [-420, 0, 420]) add(`pallet-runner-${y}`, blk(0, y, 0, L, 150, 22).color(pallet));
} else {
  add("pallet-deck", blk(0, 0, 100, L, W, 50).color(pallet));
  for (const x of [-520, 0, 520]) for (const y of [-420, 0, 420]) add(`pallet-foot-${x}-${y}`, blk(x, y, 20, 160, 160, 80).color(pallet));
  for (const x of [-520, 0, 520]) add(`pallet-skid-${x}`, blk(x, 0, 0, 160, W, 20).color(pallet));
  if (palletType.value === 'steel') for (const y of [-500, 500]) add(`pallet-edge-${y}`, blk(0, y, 90, L, 12, 60).color(cage));
}

// Rounded HDPE bottle with a shallow domed shoulder.
const BL = 1120;
const BW = 920;
add("bottle-body", extrudeRoundedRect(BL, BW, 110, 860).translate(0, 0, PH).color(bottle));
add("bottle-shoulder", extrudeRoundedRect(BL - 40, BW - 40, 140, 100).translate(0, 0, PH + 860).color(bottle));
add("bottle-top", extrudeRoundedRect(BL - 180, BW - 180, 160, 30).translate(0, 0, PH + 960).color(bottle));
// Moulded level marks on the front, every 100 litres.
for (let i = 1; i <= 9; i++) add(`level-mark-${i}`, blk(-380, -BW / 2 - 3, PH + i * 92, i % 5 === 0 ? 120 : 60, 6, 8).color(pallet));

// Fill cap with grip ribs, and the vent plug.
add("fill-neck", cylinder(40, 120, 20).translate(0, 0, PH + 990).color(bottle));
add("fill-cap", cylinder(60, 150, 24).translate(0, 0, PH + 1030).color(fittings));
for (let i = 0; i < 8; i++) add(`cap-rib-${i}`, blk(0, 0, PH + 1030, 316, 14, 54).rotateZ(i * 22.5).color(fittings));
add("vent-plug", cylinder(40, 40, 12).translate(260, 200, PH + 990).color(fittings));

// Galvanised cage: corner posts, verticals, horizontals and a top frame.
const CX = L / 2 - 20;
const CY = W / 2 - 20;
const Z0 = PH;
const ZT = TOP;
const vert = (name: string, x: number, y: number, z0: number) => add(name, cylinder(ZT - z0, TR, 8).translate(x, y, z0).color(cage));
const alongX = (name: string, y: number, z: number, x0: number, x1: number) => add(name, cylinder(x1 - x0, TR, 8).rotateY(90).translate(x0, y, z).color(cage));
const alongY = (name: string, x: number, z: number, y0: number, y1: number) => add(name, cylinder(y1 - y0, TR, 8).rotateX(-90).translate(x, y0, z).color(cage));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(`corner-post-${sx}-${sy}`, blk(sx * CX, sy * CY, Z0 - 40, 40, 40, ZT - Z0 + 40).color(cage));
// Front verticals stop above the valve gap; back and sides run full height.
for (const x of [-400, -200, 200, 400]) vert(`vert-f-${x}`, x, -CY, Z0);
for (const x of [-120, 120]) vert(`vert-f-${x}`, x, -CY, Z0 + 330);
for (const x of [-400, -200, 0, 200, 400]) vert(`vert-b-${x}`, x, CY, Z0);
for (const y of [-280, -90, 90, 280]) {
  vert(`vert-l-${y}`, -CX, y, Z0);
  vert(`vert-r-${y}`, CX, y, Z0);
}
for (const z of [Z0 + 330, Z0 + 600, Z0 + 860]) {
  alongX(`horiz-f-${z}`, -CY, z, -CX, CX);
  alongX(`horiz-b-${z}`, CY, z, -CX, CX);
  alongY(`horiz-l-${z}`, -CX, z, -CY, CY);
  alongY(`horiz-r-${z}`, CX, z, -CY, CY);
}
alongX("horiz-f-low", -CY, Z0 + 40, -CX, -230);
alongX("horiz-f-low-r", -CY, Z0 + 40, 230, CX);
// Top frame with two cross tubes either side of the fill cap.
add("top-frame", blk(0, 0, ZT - 30, L - 20, W - 20, 30).subtract(blk(0, 0, ZT - 60, L - 100, W - 100, 90)).color(cage));
for (const x of [-260, 260]) alongY(`top-cross-${x}`, x, ZT - 15, -CY, CY);

// Bottom outlet: spigot, ball valve body and lever handle, in the cage gap.
const VZ = PH + 110;
add("outlet-boss", cylinder(40, 80, 16).rotateX(90).translate(0, -BW / 2 + 10, VZ).color(bottle));
add("valve-body", cylinder(90, 62, 16).rotateX(90).translate(0, -BW / 2 - 30, VZ).color(fittings));
add("valve-ball", sphere(70).translate(0, -BW / 2 - 70, VZ).color(fittings));
add("valve-stem", cylinder(70, 12, 8).translate(0, -BW / 2 - 70, VZ + 50).color(cage));
add("valve-lever", blk(80, -BW / 2 - 70, VZ + 110, 220, 28, 16).color(fittings));
add("outlet-cap", cylinder(40, 50, 16).rotateX(90).translate(0, -BW / 2 - 120, VZ).color(fittings));

// Hazard diamond and a waste label plate wired to the front cage.
add("hazard-diamond-border", box(180, 4, 180, true).rotateY(45).translate(300, -CY - 18, PH + 790).color('#f2f0ea'));
add("hazard-diamond", box(160, 4, 160, true).rotateY(45).translate(300, -CY - 22, PH + 790).color('#d9622b'));
add("label-plate", blk(-300, -CY - 18, PH + 640, 300, 4, 200).color('#f2f0ea'));
add("label-band", blk(-300, -CY - 21, PH + 790, 300, 4, 40).color(fittings));
for (const [z, w] of [[PH + 720, 220], [PH + 690, 180], [PH + 660, 200]]) add(`label-line-${z}`, blk(-300, -CY - 21, z, w, 3, 10).color(pallet));

return p.model();
