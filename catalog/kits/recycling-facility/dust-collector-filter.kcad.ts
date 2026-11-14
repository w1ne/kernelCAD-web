// SPDX-License-Identifier: CC0-1.0
// Dust collector filter: the pulse-jet cartridge collector that cleans the
// extraction air from shredders and balers. What makes it that machine
// rather than a box with canisters: a tall filter housing standing on braced
// legs over a pyramid dust hopper, a rotary airlock and drop sleeve into a
// dust drum, a round dirty-air inlet into the hopper shoulder, a clean-air
// plenum on top with the compressed-air header and its row of diaphragm
// valves, a marked explosion-relief panel on the face, an access ladder to
// a railed roof, and an exhaust fan with a tall discharge stack beside it.
// Generic visualization geometry at about real size (one module 2 m square,
// 7.3 m to the stack top), millimetres, Z up, ladder and vent panel on -Y.

meta({
  name: "dust-collector-filter",
  license: 'CC0-1.0',
  title: "Dust collector filter",
  description: "Pulse-jet cartridge dust collector at about real size: filter housing on braced legs over a pyramid hopper, rotary airlock with drop sleeve into a dust drum, round dirty-air inlet, clean-air plenum with compressed-air header and diaphragm valves, explosion-relief panel, access ladder and railed roof, exhaust fan with discharge stack. One or two filter modules. Material controls: housing, structure, ductwork and safety accent. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "dust collector", "baghouse", "cartridge filter", "pulse jet", "extraction", "air pollution control", "fan", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 5400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#d8d6cc', { label: 'Filter housing (powder coat)' });
const structure = param('structure', '#3d4f63', { label: 'Legs, bracing and ladder (paint)' });
const ductwork = param('ductwork', '#a8b0b3', { label: 'Ductwork and stack (galvanised)' });
const accent = param('accent', '#e0a526', { label: 'Safety accent (vent panel, rails)' });
const modules = param('modules', 'one', { choices: ['one', 'two'], label: 'Filter modules' });

presets({
  plant: { housing: '#d8d6cc', structure: '#3d4f63', ductwork: '#a8b0b3', accent: '#e0a526' },
  weathered: { housing: '#b4b0a2', structure: '#4d5652', ductwork: '#8e9592', accent: '#b8913c' },
  stainless: { housing: '#c4c9cb', structure: '#5d6366', ductwork: '#b8bec0', accent: '#d9692c' },
  highVisibility: { housing: '#f2f2ee', structure: '#2f5d9a', ductwork: '#c9cfd1', accent: '#f5d000' },
});

const p = assembly("dust-collector-filter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rodX = (x0: number, x1: number, y: number, z: number, r: number, seg = 12) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, y, z);
const rodY = (x: number, y0: number, y1: number, z: number, r: number, seg = 12) => cylinder(y1 - y0, r, seg).rotateX(-90).translate(x, y0, z);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const hopper = (top: number, bottom: number, z0: number, z1: number) => rect(bottom, bottom).loft([rect(top, top)], {
  planes: [z0, z1].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});

const S = 2000, HZ = 2700, BH = 3000, PH = 700;
const n = modules.value === 'two' ? 2 : 1;
const xs = n === 2 ? [-S / 2 - 30, S / 2 + 30] : [0];
const X0 = xs[0] - S / 2, X1 = xs[n - 1] + S / 2;

xs.forEach((x, i) => {
  // Hopper, airlock, drop sleeve and drum under each module.
  add(`hopper-${i}`, hopper(S, 420, 1250, HZ).translate(x, 0, 0).color(housing));
  add(`airlock-flange-${i}`, blk(x, 0, 1170, 460, 460, 80).color(structure));
  add(`airlock-${i}`, rodX(x - 260, x + 260, 0, 950, 230, 14).color(structure));
  add(`airlock-motor-${i}`, rodX(x + 260, x + 620, 0, 950, 130, 12).color(accent));
  add(`drop-sleeve-${i}`, cylinder(240, 170, 12).translate(x, 0, 480).color('#2a2c2e'));
  add(`dust-drum-${i}`, cylinder(470, 290, 16).translate(x, 0, 10).color('#2f5d9a'));
  add(`drum-dolly-${i}`, blk(x, 0, 0, 640, 640, 10).color('#2a2c2e'));
  // Filter housing with access doors and seams.
  add(`housing-${i}`, blk(x, 0, HZ, S, S, BH).color(housing));
  for (const k of [0, 1]) {
    add(`cartridge-door-${i}-${k}`, blk(x - S / 4 + k * (S / 2), -S / 2 - 15, HZ + 300, S / 2 - 160, 30, 1500).color(housing));
    add(`door-handle-${i}-${k}`, blk(x - S / 4 + k * (S / 2) + 280, -S / 2 - 40, HZ + 1000, 40, 30, 220).color('#2b2f33'));
  }
  add(`vent-panel-${i}`, blk(x, -S / 2 - 15, HZ + 2020, S - 400, 30, 800).color(accent));
  add(`vent-panel-face-${i}`, blk(x, -S / 2 - 34, HZ + 2120, S - 640, 10, 600).color('#c8322a'));
  // Clean-air plenum and pulse-jet header with diaphragm valves.
  add(`plenum-${i}`, blk(x, 0, HZ + BH, S + 60, S + 60, PH).color(housing));
  add(`pulse-header-${i}`, rodX(x - S / 2 + 100, x + S / 2 - 100, -S / 2 - 220, HZ + BH + 350, 110, 14).color('#2f5d9a'));
  for (let k = 0; k < 4; k++) {
    const vx = x - S / 2 + 300 + k * ((S - 600) / 3);
    add(`diaphragm-valve-${i}-${k}`, cylinder(180, 90, 12).translate(vx, -S / 2 - 220, HZ + BH + 460).color('#2b2f33'));
    add(`blowpipe-${i}-${k}`, rodY(vx, -S / 2 - 220, -S / 2 + 20, HZ + BH + 520, 32, 8).color('#9aa1a4'));
  }
});

// Braced legs on base plates.
for (const lx of [X0 + 60, X1 - 60]) for (const ly of [-S / 2 + 60, S / 2 - 60]) {
  add(`leg-${lx > 0 ? 'r' : 'l'}-${ly > 0 ? 'b' : 'f'}`, blk(lx, ly, 0, 160, 160, HZ).color(structure));
  add(`base-plate-${lx > 0 ? 'r' : 'l'}-${ly > 0 ? 'b' : 'f'}`, blk(lx, ly, 0, 320, 320, 20).color(structure));
}
const braceLen = Math.hypot(X1 - X0 - 120, 1700), braceAng = (Math.atan2(1700, X1 - X0 - 120) * 180) / Math.PI;
for (const ly of [-S / 2 + 60, S / 2 - 60]) for (const s of [-1, 1]) {
  add(`brace-x-${ly > 0 ? 'b' : 'f'}-${s > 0 ? 'a' : 'b'}`, box(braceLen, 60, 60, true).rotateY(s * braceAng).translate((X0 + X1) / 2, ly, 1300).color(structure));
}
for (const lx of [X0 + 60, X1 - 60]) for (const s of [-1, 1]) {
  add(`brace-y-${lx > 0 ? 'r' : 'l'}-${s > 0 ? 'a' : 'b'}`, box(60, Math.hypot(S - 120, 1700), 60, true).rotateX(s * (Math.atan2(1700, S - 120) * 180) / Math.PI).translate(lx, 0, 1300).color(structure));
}

// Dirty-air inlet into the hopper shoulder from -X.
add("inlet-duct", rodX(X0 - 1600, X0 + 60, 0, 2350, 300, 14).color(ductwork));
add("inlet-flange", rodX(X0 - 40, X0 + 60, 0, 2350, 360, 14).color(ductwork));
add("inlet-elbow", sphere(305).translate(X0 - 1600, 0, 2350).color(ductwork));
add("inlet-riser", cylinder(2900, 300, 14).translate(X0 - 1600, 0, 2350).color(ductwork));
add("blast-gate", rodX(X0 - 900, X0 - 820, 0, 2350, 340, 14).color(accent));

// Railed roof and access ladder on -Y.
const RZ = HZ + BH + PH, LY = -S / 2 - 450, LX = X0 + 450;
for (const s of [-1, 1]) add(`ladder-rail-${s > 0 ? 'r' : 'l'}`, blk(LX + s * 230, LY, 0, 50, 50, RZ + 1050).color(structure));
for (let k = 1; k * 300 < RZ; k++) add(`rung-${k}`, rodX(LX - 230, LX + 230, LY, k * 300, 16, 6).color(structure));
for (let k = 0; k < 6; k++) add(`cage-hoop-${k}`, torus(380, 18, 16).subtract(blk(0, 400, -100, 900, 800, 200)).translate(LX, LY - 30, 2600 + k * 700).color(structure));
add("ladder-standoff", blk(LX, (LY - S / 2) / 2, RZ - 200, 400, 450, 60).color(structure));
add("roof-railing-front", blk((X0 + X1) / 2, -S / 2 + 20, RZ + 1000, X1 - X0, 50, 50).color(accent));
add("roof-railing-back", blk((X0 + X1) / 2, S / 2 - 20, RZ + 1000, X1 - X0, 50, 50).color(accent));
add("roof-railing-side", blk(X1 - 20, 0, RZ + 1000, 50, S, 50).color(accent));
add("roof-railing-mid", blk((X0 + X1) / 2, -S / 2 + 20, RZ + 500, X1 - X0, 40, 40).color(accent));
for (const x of [X0 + 600, (X0 + X1) / 2, X1 - 20]) for (const y of [-S / 2 + 20, S / 2 - 20]) {
  add(`railing-post-${Math.round(x + 4000)}-${y > 0 ? 'b' : 'f'}`, blk(x, y, RZ, 50, 50, 1050).color(accent));
}

// Clean-air outlet to the exhaust fan and stack on +X.
const FX = X1 + 1200;
add("outlet-duct", rodX(X1, FX, 0, RZ - 350, 300, 14).color(ductwork));
add("outlet-elbow", sphere(305).translate(FX, 0, RZ - 350).color(ductwork));
add("outlet-drop", cylinder(RZ - 350 - 1550, 300, 14).translate(FX, 0, 1550).color(ductwork));
add("fan-skid", blk(FX, 0, 0, 1400, 1500, 150).color('#2b2f33'));
add("fan-scroll", rodY(FX, -350, 350, 1050, 720, 18).color(structure));
add("fan-motor", rodY(FX, -950, -350, 1050, 270, 14).color(accent));
add("fan-outlet", blk(FX + 450, 0, 1200, 600, 600, 700).color(structure));
add("stack", cylinder(RZ + 900 - 1900, 320, 14).translate(FX + 450, 0, 1900).color(ductwork));
add("stack-sample-port", rodY(FX + 450, -420, -300, 4200, 50, 8).color('#2b2f33'));
add("stack-cap", cylinder(80, 380, 14).translate(FX + 450, 0, RZ + 900).color(ductwork));

// Control panel with pressure gauge on the front leg.
add("control-panel", blk(X1 - 400, -S / 2 - 200, 1200, 600, 260, 800).color('#d8dad6'));
add("magnehelic-gauge", cylinder(30, 90, 12).rotateX(90).translate(X1 - 550, -S / 2 - 330, 1700).color('#f2f2ee'));
add("panel-lamp", cylinder(30, 40, 8).rotateX(90).translate(X1 - 250, -S / 2 - 330, 1750).color('#2f9a4f'));

return p.model();
