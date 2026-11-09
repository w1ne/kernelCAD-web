// SPDX-License-Identifier: CC0-1.0
// Leachate sump tank: where the liquid that drains out of a landfill or
// a waste pile is pumped up from a buried sump and held before tankering
// or treatment. What makes it that tank: a vertical ribbed polyethylene
// tank with a shallow cone roof standing inside a low concrete bund, a
// round sump chamber in the bund floor with a grated cover and a pump
// riser, an external sight-tube level gauge, a pump control kiosk and a
// tanker draw-off point with a camlock coupling over a drip tray.
// Generic visualization geometry at about real size (3.6 m tank, 5.2 m
// high, 7.2 m bund), millimetres, Z up, gauge and kiosk face the camera.

meta({
  name: "leachate-sump-tank",
  license: 'CC0-1.0',
  title: "Leachate sump tank",
  description: "Leachate holding tank at about real size: vertical ribbed polyethylene tank with cone roof and manway inside a concrete bund, grated sump chamber with pump riser and discharge line into the roof, sight-tube level gauge, pump control kiosk and tanker draw-off with camlock and drip tray. Material controls: tank, bund concrete, pipework and fittings. plant, weathered, blackPoly and highVisibility presets.",
  tags: ["recycling", "landfill", "leachate", "sump", "holding tank", "bund", "pump", "wastewater", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#4a7a66', { label: 'Tank (polyethylene)' });
const bund = param('bund', '#aba79e', { label: 'Bund and sump (concrete)' });
const pipework = param('pipework', '#2f6fb5', { label: 'Pipework (HDPE)' });
const fittings = param('fittings', '#c9ced1', { label: 'Gratings, kiosk and fittings' });

presets({
  plant: { tank: '#4a7a66', bund: '#aba79e', pipework: '#2f6fb5', fittings: '#c9ced1' },
  weathered: { tank: '#4f5d55', bund: '#8f8b82', pipework: '#476d8f', fittings: '#9a9c97' },
  blackPoly: { tank: '#454b4f', bund: '#b5b1a8', pipework: '#d8742f', fittings: '#e2e4e1' },
  highVisibility: { tank: '#e5e3dc', bund: '#c4c0b6', pipework: '#f0b429', fittings: '#d4402a' },
});

const p = assembly("leachate-sump-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const dark = '#2a2e31';

const B = 7200, ZF = 200, R = 1800, TX = 600, TY = 600, ZT = ZF + 4400;

// Bund: floor slab and a low wall around it (open box).
add("bund", blk(0, 0, 0, B, B, 800).subtract(blk(0, 0, ZF, B - 400, B - 400, 800)).color(bund));
add("bund-step", blk(-B / 2 - 250, -1800, 0, 500, 900, 400).color(bund));

// Tank: ribbed wall, shallow cone roof, manway and vent.
add("tank-wall", cylinder(ZT - ZF, R, 24).translate(TX, TY, ZF).color(tank));
for (let z = ZF + 700; z < ZT; z += 900) add(`rib-${z}`, cylinder(110, R + 40, 24).translate(TX, TY, z).color(tank));
add("tank-roof", turned([[R + 30, ZT], [R + 30, ZT + 60], [300, ZT + 600], [0, ZT + 600], [0, ZT]]).translate(TX, TY, 0).color(tank));
add("roof-manway", cylinder(180, 320, 14).translate(TX - 700, TY - 500, ZT + 250).color(fittings));
add("roof-vent", turned([[90, ZT + 500], [90, ZT + 1000], [230, ZT + 1000], [0, ZT + 1150], [0, ZT + 500]]).translate(TX + 500, TY + 300, 0).color(pipework));
for (const a of [30, 150, 270]) add(`hold-down-${a}`, blk(TX + (R + 120) * Math.cos((a * Math.PI) / 180), TY + (R + 120) * Math.sin((a * Math.PI) / 180), ZF, 300, 300, 260).color(fittings));

// Sight-tube level gauge on the -Y face, with float marker and scale board.
const GX = TX - 600, GY = TY - R - 160;
add("gauge-tube", cylinder(ZT - ZF - 500, 45, 10).translate(GX, GY, ZF + 300).color('#dfe9ec'));
add("gauge-float", cylinder(260, 60, 10).translate(GX, GY, ZF + 2400).color('#d4402a'));
add("gauge-scale", blk(GX + 160, GY + 20, ZF + 400, 140, 30, ZT - ZF - 800).color('#f2f2ee'));
for (const z of [ZF + 300, ZT - 260]) add(`gauge-arm-${z}`, blk(GX, GY + 90, z, 90, 200, 90).color(fittings));

// Sump chamber in the -X/-Y corner: grated cover, pump riser and discharge to roof.
const SX = -2300, SY = -2300;
add("sump-chamber", cylinder(260, 700, 20).translate(SX, SY, ZF).color(bund));
add("sump-grating", cylinder(40, 640, 20).translate(SX, SY, ZF + 260).color(fittings));
for (const d of [-300, 0, 300]) add(`grating-bar-${d}`, blk(SX + d, SY, ZF + 300, 50, 1180, 20).color(dark));
add("pump-riser", cylinder(ZT + 300 - ZF - 300, 75, 10).translate(SX + 300, SY + 450, ZF + 300).color(pipework));
add("riser-bend", sphere(110).translate(SX + 300, SY + 450, ZT + 300).color(pipework));
const LR = Math.hypot(TX - 400 - SX - 300, TY - 400 - SY - 450), AR = (Math.atan2(TY - 400 - SY - 450, TX - 400 - SX - 300) * 180) / Math.PI;
add("roof-inlet", cylinder(LR, 75, 10).rotateY(90).rotateZ(AR).translate(SX + 300, SY + 450, ZT + 300).color(pipework));
add("pump-valve", blk(SX + 300, SY + 450, ZF + 900, 260, 260, 300).color(dark));
add("riser-stay", blk(SX + 300, SY + 450, ZF, 160, 160, 300).color(fittings));

// Pump control kiosk on -X outside the bund, cable duct over the wall.
add("kiosk-plinth", blk(-B / 2 - 700, 1200, 0, 900, 700, 200).color(bund));
add("kiosk", blk(-B / 2 - 700, 1200, 200, 800, 600, 1500).color(fittings));
add("kiosk-roof", blk(-B / 2 - 700, 1200, 1700, 900, 700, 60).color(dark));
add("kiosk-beacon", cylinder(160, 60, 10).translate(-B / 2 - 700, 1200, 1760).color('#f0b429'));
add("cable-duct", blk(-B / 2 + 100, 1200, 800, 900, 120, 120).color(dark));

// Tanker draw-off: pipe from the tank base over the bund to a camlock above a drip tray.
const DZ = 950;
add("draw-off-drop", cylinder(DZ - ZF, 70, 10).translate(TX - R - 150, TY - 300, ZF).color(pipework));
add("draw-off-run", cylinder(TX - R - 150 + B / 2 + 900, 70, 10).rotateY(-90).translate(TX - R - 150, TY - 300, DZ).color(pipework));
add("draw-off-valve", blk(-B / 2 - 400, TY - 300, DZ - 130, 260, 260, 260).color(dark));
add("camlock", cylinder(160, 95, 12).rotateY(-90).translate(-B / 2 - 900, TY - 300, DZ).color(fittings));
add("drip-tray", blk(-B / 2 - 900, TY - 300, 0, 1000, 800, 160).subtract(blk(-B / 2 - 900, TY - 300, 60, 900, 700, 160)).color(fittings));
add("draw-off-stand", blk(-B / 2 - 600, TY - 300, 160, 140, 140, DZ - 230).color(fittings));

return p.model();
