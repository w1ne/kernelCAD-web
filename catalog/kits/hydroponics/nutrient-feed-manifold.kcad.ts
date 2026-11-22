// SPDX-License-Identifier: CC0-1.0
// Nutrient feed manifold: the wall of valves where a fertigation system
// splits mixed nutrient solution into separate grow zones, each with its
// own shut-off and a flow meter so the grower can balance the zones.
// What makes it a feed manifold: a grey PVC header on a galvanised strut
// frame, fed by a floor riser with a check valve and read by a pressure
// gauge on the far end; below the header a row of zone drops, each with a
// true-union ball valve and red lever, a clear rotameter showing the
// solution and its float, a hose barb and a supply hose running out
// along the floor, with a coloured zone tag on the header above.
// Generic visualization geometry at about real size (2.2 m frame, header
// at 1.1 m), millimetres, Z up, front -Y.

meta({
  name: "nutrient-feed-manifold",
  license: 'CC0-1.0',
  title: "Nutrient feed manifold",
  description: "Fertigation zone manifold at about real size: grey PVC header on a galvanised strut frame, floor supply riser with check valve, pressure gauge, and a row of zone drops each with a true-union ball valve, clear rotameter flow meter with float, hose barb, floor hose and zone tag. Material controls: strut frame, header PVC, valve handles and zone hoses, plus zone count (3, 5 or 7). schedule80, whitePvc, weathered and highVisibility presets.",
  tags: ['nutrient manifold', 'fertigation', 'zone valves', 'ball valve', 'rotameter', 'flow meter', 'pressure gauge', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('strutFrame', '#a7aeb1', { label: 'Strut frame (galvanised steel)' });
const pipe = param('headerPvc', '#7f878c', { label: 'Header and drops (PVC)' });
const handle = param('valveHandles', '#d23a2c', { label: 'Valve handles' });
const hose = param('zoneHoses', '#2f5d3a', { label: 'Zone hoses' });
const zones = param('zones', '5', { choices: ['3', '5', '7'], label: 'Zones' });

presets({
  schedule80: { strutFrame: '#a7aeb1', headerPvc: '#7f878c', valveHandles: '#d23a2c', zoneHoses: '#2f5d3a' },
  whitePvc: { strutFrame: '#b8bec0', headerPvc: '#ecedea', valveHandles: '#2f6fa8', zoneHoses: '#1f2225' },
  weathered: { strutFrame: '#828680', headerPvc: '#6c7172', valveHandles: '#9a4a3c', zoneHoses: '#3d4a3a' },
  highVisibility: { strutFrame: '#e87832', headerPvc: '#8a9196', valveHandles: '#f2c84b', zoneHoses: '#2a6fb0' },
});

const p = assembly("nutrient-feed-manifold");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);

const FX = 1000, HZ = 1100, HY = -120, SX = -1150;
const tags = ['#3f8f4a', '#2f6fa8', '#e0a32a', '#8e4fa0', '#d0582c', '#3a9a9a', '#b8423c'];

// Galvanised strut frame: uprights on foot plates, two cross struts.
for (const x of [-FX, FX]) {
  add(`foot-${x}`, blk(x, 0, 0, 200, 260, 10).color(frame));
  add(`upright-${x}`, blk(x, 0, 10, 42, 42, 1450).color(frame));
}
for (const z of [HZ - 21, 700]) add(`strut-${z}`, blk(0, -10, z, 2 * FX + 42, 42, 42).color(frame));

// Header with pipe clamps, end cap and pressure gauge.
add("header", cylX(SX, HY, HZ, FX + 60 - SX, 36, 14).color(pipe));
add("header-cap", cylX(FX + 60, HY, HZ, 30, 42, 14).color(pipe));
for (const x of [-860, -300, 300, 860]) add(`clamp-${x}`, blk(x, HY + 30, HZ - 44, 30, 120, 88).color(frame));
add("gauge-stem", cylZ(FX - 30, HY, HZ + 30, 70, 8, 6).color('#c49a3c'));
add("gauge-case", cylY(FX - 30, HY + 10, HZ + 150, 26, 58, 18).color('#2a2c2e'));
add("gauge-face", cylY(FX - 30, HY - 16, HZ + 150, 3, 50, 18).color('#eef0ec'));
add("gauge-needle", box(6, 3, 40, true).translate(0, 0, 14).rotateY(35).translate(FX - 30, HY - 21, HZ + 150).color('#c0392b'));

// Supply riser from the floor at the left, with check valve and elbow.
add("riser-flange", cylZ(SX, HY, 0, 20, 80, 14).color(pipe));
add("riser", cylZ(SX, HY, 20, HZ - 20, 40, 14).color(pipe));
add("riser-elbow", blk(SX, HY, HZ - 45, 100, 100, 90).color(pipe));
add("check-valve", cylZ(SX, HY, 460, 160, 58, 14).color(pipe));
add("check-valve-cap", blk(SX, HY - 40, 510, 70, 50, 60).color('#2a2c2e'));
add("riser-valve", blk(SX, HY, 760, 90, 100, 90).color(pipe));
add("riser-valve-lever", blk(SX, HY - 90, 850, 26, 160, 14).color(handle));

// Zone drops: ball valve, rotameter, hose barb, hose out along the floor.
const n = Number(zones.value);
for (let i = 0; i < n; i++) {
  const x = -780 + (i * 1560) / (n - 1);
  add(`tee-${i}`, blk(x, HY, HZ - 50, 70, 76, 80).color(pipe));
  add(`tag-${i}`, blk(x, HY - 40, HZ + 50, 90, 6, 60).color(tags[i]));
  add(`drop-${i}`, cylZ(x, HY, 860, HZ - 910, 20, 10).color(pipe));
  // True-union ball valve.
  add(`union-top-${i}`, cylZ(x, HY, 960, 24, 34, 10).color(pipe));
  add(`valve-body-${i}`, cylZ(x, HY, 900, 60, 30, 10).color(pipe));
  add(`union-bottom-${i}`, cylZ(x, HY, 876, 24, 34, 10).color(pipe));
  add(`valve-stem-${i}`, cylY(x, HY - 28, 930, 22, 8, 6).color(pipe));
  add(`valve-lever-${i}`, blk(x, HY - 60, 920, 120, 14, 22).color(handle));
  // Rotameter: clear tube full of solution, float, top and bottom fittings.
  add(`meter-top-${i}`, blk(x, HY, 800, 64, 64, 60).color('#2a2c2e'));
  add(`meter-tube-${i}`, cylZ(x, HY, 580, 220, 24, 12).color('#b9ddd0'));
  add(`meter-float-${i}`, cylZ(x, HY, 620 + (i % 3) * 50, 24, 20, 10).color('#c0392b'));
  add(`meter-scale-${i}`, blk(x + 30, HY - 18, 600, 6, 4, 180).color('#2a2c2e'));
  add(`meter-bottom-${i}`, blk(x, HY, 520, 64, 64, 60).color('#2a2c2e'));
  add(`barb-${i}`, cylZ(x, HY, 470, 50, 14, 8).color('#c49a3c'));
  add(`hose-down-${i}`, cylZ(x, HY, 60, 410, 16, 8).color(hose));
  add(`hose-bend-${i}`, blk(x, HY - 20, 0, 32, 72, 60).color(hose));
  add(`hose-out-${i}`, cylY(x, HY - 56, 16, 600, 16, 8).color(hose));
}

return p.model();
