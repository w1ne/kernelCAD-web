// SPDX-License-Identifier: CC0-1.0
// Grease-trap tank: the horizontal interceptor that holds kitchen and
// food-waste wash water long enough for fats, oils and grease to float off
// before the water goes to sewer. What makes it a grease trap rather than
// a fuel tank: a ribbed polyethylene barrel with domed ends lying on
// concrete saddles, two tall manway risers with heavy lids for pump-out,
// an inlet tee high on one end and an outlet tee lower on the other, each
// with a capped cleanout, a vent stack and a sampling chamber downstream.
// Generic visualization geometry at about real size (4.6 m long, 1.8 m
// diameter), millimetres, Z up, length along X for the -X/-Y camera.

meta({
  name: "grease-trap-tank",
  license: 'CC0-1.0',
  title: "Grease-trap tank",
  description: "Horizontal grease interceptor at about real size: ribbed polyethylene barrel with domed ends on concrete saddles and slab, two manway risers with cast lids, inlet and outlet tees with capped cleanouts, vent stack with cowl and a downstream sampling chamber. Material controls: tank body, manway lids, pipework and concrete. plant, weathered, coatedSteel and highVisibility presets.",
  tags: ["recycling", "grease trap", "grease interceptor", "FOG", "food waste", "wastewater", "tank", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#4e7d55', { label: 'Tank body (polyethylene)' });
const lids = param('lids', '#3b3f42', { label: 'Manway lids (cast iron)' });
const pipework = param('pipework', '#d8742f', { label: 'Pipework (PVC)' });
const concrete = param('concrete', '#a7a39b', { label: 'Saddles and slab (concrete)' });

presets({
  plant: { tank: '#4e7d55', lids: '#3b3f42', pipework: '#d8742f', concrete: '#a7a39b' },
  weathered: { tank: '#5b6a55', lids: '#4a4540', pipework: '#a8704a', concrete: '#8f8b82' },
  coatedSteel: { tank: '#2f5d9a', lids: '#c9ced1', pipework: '#8f989c', concrete: '#b5b1a8' },
  highVisibility: { tank: '#e5e3dc', lids: '#d4402a', pipework: '#f0b429', concrete: '#c4c0b6' },
});

const p = assembly("grease-trap-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Horizontal pipe along X starting at x0.
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const R = 900, L = 4000, ZS = 200, ZA = ZS + 120 + R;

// Slab and three saddles with a curved cradle cut to the barrel.
add("slab", blk(0, 0, 0, L + 1400, 2400, ZS).color(concrete));
for (const x of [-1400, 0, 1400]) add(`saddle-${x}`, blk(x, 0, ZS, 300, 1900, 900).subtract(alongX(x - 200, 400, R + 10, 0, ZA, 24)).color(concrete));

// Barrel: turned along Z, laid along X; hoop ribs.
add("barrel", turned([[0, -L / 2 - 320], [R * 0.55, -L / 2 - 260], [R * 0.9, -L / 2 - 120], [R, -L / 2], [R, L / 2], [R * 0.9, L / 2 + 120], [R * 0.55, L / 2 + 260], [0, L / 2 + 320]]).rotateY(90).translate(0, 0, ZA).color(tank));
for (const x of [-1750, -700, 700, 1750]) add(`rib-${x}`, alongX(x - 60, 120, R + 45, 0, ZA, 24).color(tank));

// Two manway risers with cast lids and lifting keys.
const ZR = ZA + R + 500;
for (const x of [-1050, 1050]) {
  add(`riser-${x}`, cylinder(ZR - ZA, 380, 18).translate(x, 0, ZA).color(tank));
  add(`riser-collar-${x}`, cylinder(80, 430, 18).translate(x, 0, ZR - 80).color(tank));
  add(`lid-${x}`, cylinder(60, 420, 18).translate(x, 0, ZR).color(lids));
  add(`lid-boss-${x}`, cylinder(30, 150, 12).translate(x, 0, ZR + 60).color(lids));
  for (const s of [-1, 1]) add(`lift-key-${x}-${s}`, blk(x + s * 260, 0, ZR + 60, 80, 30, 40).color(lids));
}

// Inlet tee high on -X end, outlet tee lower on +X end, each with a cleanout riser.
const ZI = ZA + 450, ZO = ZA + 300, XE = L / 2 + 250;
add("inlet-pipe", alongX(-XE - 1000, 1050, 80, 0, ZI).color(pipework));
add("inlet-tee", cylinder(900, 90, 12).translate(-XE - 700, 0, ZI - 300).color(pipework));
add("inlet-cap", cylinder(60, 110, 12).translate(-XE - 700, 0, ZI + 600).color(lids));
add("outlet-pipe", alongX(XE - 50, 1050, 80, 0, ZO).color(pipework));
add("outlet-tee", cylinder(900, 90, 12).translate(XE + 700, 0, ZO - 300).color(pipework));
add("outlet-cap", cylinder(60, 110, 12).translate(XE + 700, 0, ZO + 600).color(lids));
for (const x of [-XE - 700, XE + 700]) add(`pipe-support-${x}`, blk(x, 0, ZS, 220, 220, (x < 0 ? ZI : ZO) - ZS - 300).color(concrete));

// Vent stack with a mushroom cowl, and a sampling chamber off the outlet.
add("vent-stack", cylinder(1700, 55, 10).translate(0, 450, ZA + R - 100).color(pipework));
add("vent-cowl", turned([[170, ZA + R + 1600], [0, ZA + R + 1760], [0, ZA + R + 1600]]).translate(0, 450, 0).color(lids));
add("sample-chamber", blk(XE + 700, -900, ZS, 600, 600, 700).color(concrete));
add("sample-cover", blk(XE + 700, -900, ZS + 700, 560, 560, 40).color(lids));
add("sample-branch", cylinder(560, 60, 10).rotateX(90).translate(XE + 700, 0, ZS + 450).color(pipework));
add("level-plate", blk(-300, -R - 10, ZA + 200, 600, 20, 280).color('#e8e6dc'));

return p.model();
