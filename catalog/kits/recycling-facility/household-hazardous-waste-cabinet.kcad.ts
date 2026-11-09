// SPDX-License-Identifier: CC0-1.0
// Household hazardous-waste cabinet: the steel safety store at a recycling
// centre where staff shelve the paint, solvents, garden chemicals and
// cleaners the public hands in, kept apart and contained until a licensed
// carrier collects them.
// What makes it a hazardous-waste store: a tall double-door steel cabinet
// on a plinth, one door swung open to show perforated shelves that double
// as drip trays, stocked with paint tins, solvent cans and chemical
// bottles; a bunded sump at the base; louvred vents top and bottom; a
// flame-arrested vent stub on the roof; a hazard diamond and a warning
// panel on the closed door; and a lever handle with a padlock hasp.
// Generic visualization geometry at about real size (1.4 m wide, 0.9 m
// deep, 2.0 m high), millimetres, Z up, doors facing -Y.

meta({
  name: "household-hazardous-waste-cabinet",
  license: 'CC0-1.0',
  title: "Household hazardous-waste cabinet",
  description: "Double-door steel hazardous-waste safety cabinet at about real size: one door open showing perforated drip-tray shelves stocked with paint tins, solvent cans and chemical bottles, bunded base sump, louvred vents, roof vent stub, hazard diamond, warning panel, lever handle and padlock hasp. Material controls: cabinet paint, shelves and sump, stored containers and warning labels. flammableYellow, corrosiveWhite, toxicRed and weathered presets.",
  tags: ['hazardous waste', 'HHW', 'safety cabinet', 'flammable store', 'COSHH cabinet', 'chemical storage', 'paint', 'solvent', 'household recycling centre', 'recycling', 'waste management', 'reception', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinetPaint = param('cabinetPaint', '#e8b820', { label: 'Cabinet body and doors (powder-coated steel)' });
const shelfSteel = param('shelfSteel', '#8f969a', { label: 'Shelves and sump (galvanised steel)' });
const containers = param('containers', '#3f6fb0', { label: 'Stored tins and bottles (mixed plastic and tinplate)' });
const label = param('label', '#c0392b', { label: 'Hazard labels (warning red)' });

presets({
  flammableYellow: { cabinetPaint: '#e8b820', shelfSteel: '#8f969a', containers: '#3f6fb0', label: '#c0392b' },
  corrosiveWhite: { cabinetPaint: '#e6e8e6', shelfSteel: '#9aa1a4', containers: '#2e9a63', label: '#1d2023' },
  toxicRed: { cabinetPaint: '#b8322a', shelfSteel: '#8f969a', containers: '#e6e2d6', label: '#f2c230' },
  weathered: { cabinetPaint: '#b8973a', shelfSteel: '#6f706a', containers: '#556b85', label: '#8a3a2a' },
});

const p = assembly("household-hazardous-waste-cabinet");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(-90).translate(x, y, z);

const W = 1200, D = 600, H = 1900, Z0 = 100, T = 30;

// Plinth and the body: a shell open at the front.
add("plinth", blk(0, 0, 0, W + 40, D + 40, Z0).color('#2f3437'));
add("body", blk(0, 0, Z0, W, D, H).subtract(blk(0, -T, Z0 + T, W - 2 * T, D, H - 2 * T)).color(cabinetPaint));
add("roof-lip", blk(0, 0, Z0 + H, W + 30, D + 30, 25).color(cabinetPaint));
add("roof-vent", cylZ(W / 2 - 200, D / 4, Z0 + H + 25, 120, 40).color(shelfSteel));
add("roof-vent-cap", cylZ(W / 2 - 200, D / 4, Z0 + H + 145, 30, 70).color('#2f3437'));
for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
  add(`side-louvre-${sx}-${i}`, blk(sx * (W / 2 + 4), 0, Z0 + H - 300 + i * 50, 8, 280, 18).color('#2f3437'));
  add(`low-louvre-${sx}-${i}`, blk(sx * (W / 2 + 4), 0, Z0 + 120 + i * 50, 8, 280, 18).color('#2f3437'));
}

// Bunded sump at the base and three drip-tray shelves.
add("sump", blk(0, 0, Z0 + T, W - 2 * T, D - 2 * T, 150).subtract(blk(0, 0, Z0 + T + 20, W - 2 * T - 30, D - 2 * T - 30, 200)).color(shelfSteel));
add("sump-grid", blk(0, 0, Z0 + T + 140, W - 2 * T - 30, D - 2 * T - 30, 8).color('#5d6366'));
const shelves = [Z0 + 600, Z0 + 1050, Z0 + 1500];
for (const z of shelves) {
  add(`shelf-${z}`, blk(0, 0, z, W - 2 * T, D - 2 * T, 40).subtract(blk(0, 0, z + 15, W - 2 * T - 30, D - 2 * T - 30, 60)).color(shelfSteel));
}

// Stored containers on the shelves.
const tin = (n: string, x: number, y: number, z: number, r: number, h: number, c: string) => {
  add(`${n}-body`, cylZ(x, y, z, h, r, 14).color(c));
  add(`${n}-lid`, cylZ(x, y, z + h, 10, r - 6, 14).color('#c3c8cb'));
};
const bottle = (n: string, x: number, y: number, z: number, w: number, h: number, c: string) => {
  add(`${n}-body`, blk(x, y, z, w, w * 0.7, h).color(c));
  add(`${n}-neck`, cylZ(x + w * 0.2, y, z + h, 50, 22, 8).color(c));
  add(`${n}-cap`, cylZ(x + w * 0.2, y, z + h + 50, 25, 26, 8).color(label));
};
// Bottom shelf (on the sump grid): drums of solvent and big containers.
tin("solvent-drum-a", -380, 0, Z0 + T + 148, 150, 330, containers);
tin("solvent-drum-b", -60, 40, Z0 + T + 148, 150, 330, '#7e8487');
bottle("jerrycan", 300, -20, Z0 + T + 148, 260, 300, label);
// Shelf 1: paint tins.
for (let i = 0; i < 5; i++) tin(`paint-${i}`, -440 + i * 210, -60 + (i % 2) * 120, shelves[0] + 15, 85, 190, i % 2 ? '#c3c8cb' : containers);
// Shelf 2: chemical bottles.
const bc = ['#e6e2d6', containers, '#2e9a63', '#e6e2d6', label, containers];
bc.forEach((c, i) => bottle(`bottle-${i}`, -460 + i * 175, -40 + (i % 2) * 90, shelves[1] + 15, 120, 260 - (i % 3) * 40, c));
// Shelf 3: aerosol cans and small tins.
for (let i = 0; i < 7; i++) tin(`aerosol-${i}`, -470 + i * 155, -60 + (i % 2) * 90, shelves[2] + 15, 34, 200, i % 3 ? containers : '#c3c8cb');
for (let i = 0; i < 3; i++) tin(`small-tin-${i}`, -380 + i * 280, 130, shelves[2] + 15, 60, 110, '#7e8487');

// Doors: the right one closed, the left one swung open.
const DW = W / 2 - 10, DH = H - 20;
add("door-right", blk(DW / 2 + 5, -D / 2 - 12, Z0 + 10, DW, 24, DH).color(cabinetPaint));
add("door-right-rib", blk(DW / 2 + 5, -D / 2 - 28, Z0 + 10 + DH / 2 - 20, DW - 60, 8, 40).color(cabinetPaint));
// Left door hinged on its outer (-X) edge, swung right back so its door shelf faces out.
const HX = -W / 2, HY = -D / 2 - 12;
const doorL = (s: Shape) => s.translate(-HX, -HY, 0).rotateZ(-155).translate(HX, HY, 0);
add("door-left", doorL(blk(HX + DW / 2, HY, Z0 + 10, DW, 24, DH)).color(cabinetPaint));
for (const z of [Z0 + 200, Z0 + DH - 200]) add(`hinge-${z}`, cylZ(HX - 10, HY, z, 120, 16, 8).color('#2f3437'));

// Hazard diamond, warning panel, handle and hasp on the closed door.
const FY = -D / 2 - 26;
add("hazard-diamond", box(300, 4, 300, true).rotateY(45).translate(DW / 2 + 5, FY, Z0 + 1450).color(label));
add("hazard-diamond-inner", box(250, 4, 250, true).rotateY(45).translate(DW / 2 + 5, FY - 3, Z0 + 1450).color('#f2f2ec'));
add("hazard-flame", cylY(DW / 2 + 5, FY - 8, Z0 + 1440, 4, 60, 10).color('#1d2023'));
add("hazard-flame-tip", box(70, 4, 70, true).rotateY(45).translate(DW / 2 + 5, FY - 8, Z0 + 1500).color('#1d2023'));
add("warning-panel", blk(DW / 2 + 5, FY, Z0 + 650, 420, 4, 300).color('#f2f2ec'));
add("warning-header", blk(DW / 2 + 5, FY - 3, Z0 + 860, 420, 4, 90).color(label));
for (let i = 0; i < 3; i++) add(`warning-text-${i}`, blk(DW / 2 + 5, FY - 3, Z0 + 690 + i * 50, 340 - i * 60, 3, 22).color('#1d2023'));
add("handle-plate", blk(70, FY, Z0 + 950, 60, 10, 220).color('#2f3437'));
add("handle-lever", blk(70, FY - 30, Z0 + 1020, 50, 40, 160).color('#2f3437'));
add("padlock-body", blk(70, FY - 30, Z0 + 880, 60, 30, 60).color('#c9a640'));
add("padlock-shackle", cylZ(70, FY - 30, Z0 + 940, 30, 18, 8).color('#c3c8cb'));
add("earth-tag", blk(W / 2 - 40, -D / 2 - 6, Z0 + 40, 50, 10, 40).color('#2e9a63'));

return p.model();
