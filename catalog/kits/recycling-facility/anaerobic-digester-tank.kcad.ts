// SPDX-License-Identifier: CC0-1.0
// Anaerobic digester tank: the round, insulated tank where food and garden
// waste is broken down by bacteria into biogas. What makes it that tank
// rather than a silo: a squat clad wall on a concrete ring foundation, a
// green double-membrane gas dome for a roof, side-entry mixers poking
// through the wall, a yellow gas main taking biogas off the dome edge, a
// heat-exchanger skid with flow and return pipes, a caged access ladder to
// a roof-edge platform and a sight glass.
// Generic visualization geometry at about real size (12 m diameter, 10.3 m
// high), millimetres, Z up, ladder and skid face the -X/-Y camera side.

meta({
  name: "anaerobic-digester-tank",
  license: 'CC0-1.0',
  title: "Anaerobic digester tank",
  description: "Biogas digester at about real size: clad tank wall on a concrete ring foundation, double-membrane gas dome roof, three side-entry mixers, yellow gas main off the dome, heat-exchanger skid with flow and return pipes, caged ladder to a roof platform and sight glass. Material controls: wall cladding, gas membrane, steelwork and gas pipework. plant, weathered, white-dome and highVisibility presets.",
  tags: ["recycling", "anaerobic digester", "biogas", "digester tank", "gas membrane", "double membrane roof", "organics", "food waste", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cladding = param('cladding', '#7f8f7e', { label: 'Wall cladding (profiled sheet)' });
const membrane = param('membrane', '#4f7a4c', { label: 'Gas membrane roof' });
const steelwork = param('steelwork', '#9aa2a4', { label: 'Ladder, platform and skid steel' });
const pipework = param('pipework', '#e2b22a', { label: 'Gas pipework' });

presets({
  plant: { cladding: '#7f8f7e', membrane: '#4f7a4c', steelwork: '#9aa2a4', pipework: '#e2b22a' },
  weathered: { cladding: '#6f7469', membrane: '#55664f', steelwork: '#7d7a72', pipework: '#b8973f' },
  whiteDome: { cladding: '#b9bdb8', membrane: '#e6e8e3', steelwork: '#8d969a', pipework: '#e2b22a' },
  highVisibility: { cladding: '#2a6fb5', membrane: '#3c8f57', steelwork: '#c9ced1', pipework: '#f2d21b' },
});

const p = assembly("anaerobic-digester-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Horizontal bar from (x, y, z) running radially outward at azimuth az (deg).
const radial = (r0: number, len: number, rad: number, z: number, az: number, seg = 12) =>
  cylinder(len, rad, seg).rotateY(90).translate(r0, 0, z).rotateZ(az);

const R = 6000, ZW = 300, HW = 7000, ZTOP = ZW + HW;
const concrete = '#a7a39b';

// Concrete ring foundation and clad tank wall with stiffening bands.
add("foundation", cylinder(ZW, R + 400, 24).color(concrete));
add("wall", cylinder(HW, R, 24).translate(0, 0, ZW).color(cladding));
for (const z of [ZW + 1800, ZW + 4200, ZTOP - 250]) add(`band-${z}`, cylinder(120, R + 40, 24).translate(0, 0, z).color(steelwork));

// Double-membrane gas dome on a clamping ring.
add("dome-ring", cylinder(260, R + 120, 24).translate(0, 0, ZTOP - 60).color(steelwork));
add("dome", turned([[0, ZTOP + 150], [R + 40, ZTOP + 150], [R - 300, ZTOP + 1100], [R - 1300, ZTOP + 2100], [R - 3000, ZTOP + 2800], [0, ZTOP + 3050]]).color(membrane));
add("dome-vent", cylinder(400, 260, 12).translate(0, 0, ZTOP + 2950).color(steelwork));

// Side-entry mixers: motor and gearbox outside, shaft through the wall.
for (const az of [205, 245, 300]) {
  add(`mixer-flange-${az}`, radial(R - 50, 260, 380, 1500, az).color(steelwork));
  add(`mixer-gearbox-${az}`, radial(R + 200, 450, 300, 1500, az).color('#3d4448'));
  add(`mixer-motor-${az}`, radial(R + 650, 700, 240, 1500, az).color('#2f5d9a'));
}

// Gas main off the dome edge, down the wall to ground level.
const GA = 235;
add("gas-offtake", radial(R - 200, 900, 110, ZTOP + 300, GA).color(pipework));
const gx = (R + 700) * Math.cos((GA * Math.PI) / 180), gy = (R + 700) * Math.sin((GA * Math.PI) / 180);
add("gas-riser", cylinder(ZTOP - 600, 110, 12).translate(gx, gy, 700).color(pipework));
add("gas-elbow", sphere(150).translate(gx, gy, ZTOP + 300).color(pipework));
add("gas-run", radial(R + 700, 2600, 110, 700, GA).color(pipework));
add("condensate-pot", cylinder(700, 260, 12).translate(gx, gy, 0).color(steelwork));
for (const d of [R + 1600, R + 2900]) add(`gas-support-${d}`, blk(d * Math.cos((GA * Math.PI) / 180), d * Math.sin((GA * Math.PI) / 180), 0, 160, 160, 600).color(steelwork));
add("pressure-relief", cylinder(700, 180, 12).translate(-1800, -3800, ZTOP + 2200).color(pipework));

// Heat-exchanger skid on -X with flow and return pipes into the wall.
const SX = -R - 2600;
add("skid-base", blk(SX, -1200, 0, 2400, 3200, 250).color(steelwork));
for (const y of [-1900, -500]) add(`heat-exchanger-${y}`, cylinder(2000, 320, 14).rotateY(90).translate(SX - 1000, y, 900).color('#c6cbcd'));
for (const y of [-1900, -500]) for (const x of [SX - 700, SX + 700]) add(`hx-saddle-${y}-${x}`, blk(x, y, 250, 200, 500, 450).color(steelwork));
add("skid-pump", cylinder(500, 220, 12).translate(SX + 600, 200, 250).color('#2f5d9a'));
add("skid-panel", blk(SX - 900, 200, 250, 500, 300, 1500).color('#d8dad6'));
for (const [y, z] of [[-1900, 1600], [-500, 2000]]) {
  add(`hx-riser-${y}`, cylinder(z - 1200, 90, 10).translate(SX + 1000, y, 1200).color('#c6cbcd'));
  add(`hx-line-${y}`, cylinder(1950, 90, 10).rotateY(90).translate(SX + 1000, y, z).color('#c6cbcd'));
}

// Caged ladder on -Y up to a roof-edge platform with handrail.
const LY = -R - 250;
for (const s of [-1, 1]) add(`ladder-rail-${s}`, blk(s * 250, LY, ZW, 60, 60, HW + 1100).color(steelwork));
for (let z = ZW + 300; z < ZTOP; z += 450) add(`rung-${z}`, cylinder(500, 18, 6).rotateY(90).translate(-250, LY, z).color(steelwork));
for (let z = ZW + 2400; z < ZTOP + 1000; z += 900) {
  add(`hoop-front-${z}`, blk(0, LY - 700, z, 760, 40, 50).color(steelwork));
  for (const s of [-1, 1]) add(`hoop-side-${z}-${s}`, blk(s * 380, LY - 360, z, 40, 700, 50).color(steelwork));
}
for (const x of [-380, 0, 380]) add(`cage-bar-${x}`, blk(x, x === 0 ? LY - 700 : LY - 360, ZW + 2400, 40, 40, HW - 1300).color(steelwork));
add("platform", blk(0, LY + 50, ZTOP, 1800, 900, 80).color(steelwork));
for (const x of [-880, 880]) add(`platform-post-${x}`, blk(x, LY - 380, ZTOP, 50, 50, 1100).color('#f0b429'));
add("platform-rail", blk(0, LY - 380, ZTOP + 1050, 1800, 50, 50).color('#f0b429'));
add("platform-midrail", blk(0, LY - 380, ZTOP + 550, 1800, 40, 40).color('#f0b429'));

// Sight glass and a manway near the ground on the camera side.
add("sight-glass", radial(R - 20, 200, 220, 2800, 255, 12).color('#3a4a55'));
add("manway", radial(R - 20, 180, 450, 1100, 268, 14).color(steelwork));

return p.model();
