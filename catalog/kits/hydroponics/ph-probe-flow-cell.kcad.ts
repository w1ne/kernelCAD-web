// SPDX-License-Identifier: CC0-1.0
// pH probe flow cell: the bench-top probe holder a sample stream runs through
// so pH (and ORP / temperature) electrodes stay wet and read live solution.
// What makes it a pH flow cell: a clear rectangular acrylic chamber on two
// pedestals with hose barbs at both ends, electrodes pushed in from the top
// through threaded bosses and tilted about 15 degrees (a pH bulb must never
// sit horizontal, or the bubble in the fill drifts onto the glass), each
// electrode with its coloured identification band and cable taken back
// through a cable comb, clear sample hoses, and a KCl storage-solution bottle
// and calibration cup on the base plate for the weekly calibration.
// Generic visualization geometry at about real size (chamber 300 x 70 mm),
// millimetres, Z up, front -Y.

meta({
  name: "ph-probe-flow-cell",
  license: 'CC0-1.0',
  title: "pH probe flow cell",
  description: "Bench-top electrode flow cell at about real size: clear acrylic chamber on pedestals with hose barbs and clear sample hoses, pH, ORP and temperature electrodes tilted 15 degrees in threaded top bosses with colour bands and cables through a cable comb, front identification labels, KCl storage bottle and calibration cup on a base plate with rubber feet. Material controls: flow chamber, base plate, fittings, electrode bodies, plus a probe set choice (pH only, pH + ORP, pH + ORP + temperature). clearGrey, blackPanel, labBlue and weathered presets.",
  tags: ['ph probe', 'ph sensor', 'orp', 'electrode', 'flow cell', 'probe holder', 'nutrient monitoring', 'fertigation', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chamber = param('flowChamber', '#bfe0e8', { label: 'Flow chamber (clear acrylic)' });
const base = param('basePlate', '#d8d6cf', { label: 'Base plate and pedestals (polypropylene)' });
const fittings = param('fittings', '#4a535a', { label: 'Bosses, end caps and barbs (PVC)' });
const electrode = param('electrodes', '#2a2d30', { label: 'Electrode bodies (epoxy)' });
const probeSet = param('probeSet', 'pH + ORP + temperature', { choices: ['pH only', 'pH + ORP', 'pH + ORP + temperature'], label: 'Probe set' });

presets({
  clearGrey: { flowChamber: '#bfe0e8', basePlate: '#d8d6cf', fittings: '#4a535a', electrodes: '#2a2d30' },
  blackPanel: { flowChamber: '#c9e6ec', basePlate: '#30353a', fittings: '#8d969c', electrodes: '#1d2023' },
  labBlue: { flowChamber: '#d4ecf1', basePlate: '#f1f0eb', fittings: '#2f6fa8', electrodes: '#3a3f44' },
  weathered: { flowChamber: '#a8bdb6', basePlate: '#bdb6a3', fittings: '#6c6b62', electrodes: '#3f3d38' },
});

const p = assembly("ph-probe-flow-cell");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 14) => {
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
const arc = (name: string, a: [number, number, number], b: [number, number, number], lift: number, r: number, n: number, col: string) => {
  const pt = (u: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + Math.sin(Math.PI * u) * lift,
  ];
  for (let k = 0; k < n; k++) add(`${name}-${k}`, rod(pt(k / n), pt((k + 1) / n), r).color(col));
};

// Base plate on rubber feet, two pedestals, cable comb at the back.
for (const [x, y] of [[-190, -90], [190, -90], [-190, 110], [190, 110]]) add(`foot-${x}-${y}`, cylZ(x, y, 0, 6, 12, 10).color('#22262a'));
add("base-plate", blk(0, 10, 6, 420, 230, 16).color(base));
for (const x of [-110, 110]) {
  add(`pedestal-${x}`, blk(x, 20, 22, 44, 64, 98).color(base));
  add(`saddle-${x}`, blk(x, 20, 112, 60, 84, 8).color(fittings));
}
add("cable-comb-post", blk(0, 105, 22, 30, 16, 300).color(base));
add("cable-comb", blk(0, 105, 300, 200, 20, 22).color(fittings));

// Chamber: clear block with end caps, threaded top bosses.
const CY = 20, ZB = 120, ZT = 200;
add("chamber", blk(0, CY, ZB, 300, 70, ZT - ZB).color(chamber));
for (const s of [-1, 1]) {
  add(`end-cap-${s}`, blk(s * 160, CY, ZB - 4, 20, 78, ZT - ZB + 8).color(fittings));
  for (const dz of [10, 74]) add(`end-bolt-${s}-${dz}`, cylX(s > 0 ? 170 : -174, CY - 30, ZB + dz - 4, 4, 5, 6).color('#c9ced1'));
  add(`barb-${s}`, cylX(s > 0 ? 170 : -212, CY, 160, 42, 8, 10).color(fittings));
  add(`barb-ridge-${s}`, cylX(s > 0 ? 196 : -200, CY, 160, 6, 10, 10).color(fittings));
}
add("flow-arrow", blk(0, CY - 36, 132, 120, 1.5, 6).color('#2f6fa8'));
add("flow-arrow-head", box(16, 1.5, 16, true).rotateY(45).translate(56, CY - 36, 135).color('#2f6fa8'));

// Sample hoses: in from the left, out to the right, both down past the base.
arc("hose-in", [-212, CY, 160], [-260, CY - 60, 20], 30, 9, 4, '#cfe3e8');
arc("hose-out", [212, CY, 160], [270, CY - 70, 20], 30, 9, 4, '#cfe3e8');

// Electrodes, tilted 15 degrees back toward +Y so their fronts face the camera.
type Probe = { name: string; band: string; label: string; tip: boolean };
const all: Probe[] = [
  { name: 'ph', band: '#2f6fa8', label: '#2f6fa8', tip: true },
  { name: 'orp', band: '#e3b52c', label: '#e3b52c', tip: true },
  { name: 'temp', band: '#c9ced1', label: '#c0392b', tip: false },
];
const fitted = probeSet.value === 'pH only' ? all.slice(0, 1) : probeSet.value === 'pH + ORP' ? all.slice(0, 2) : all;
const xs = fitted.length === 1 ? [0] : fitted.length === 2 ? [-55, 55] : [-90, 0, 90];
const TILT = 15;
fitted.forEach((pr, i) => {
  const x = xs[i];
  const placed = (s: Shape) => s.rotateX(-TILT).translate(x, CY, ZT);
  add(`${pr.name}-boss`, cylZ(x, CY, ZT, 16, 20, 6).color(fittings));
  add(`${pr.name}-nut`, placed(cylZ(0, 0, 14, 14, 15, 6)).color(fittings));
  add(`${pr.name}-body`, placed(cylZ(0, 0, 28, 120, pr.tip ? 6 : 4, 12)).color(pr.tip ? electrode : '#c9ced1'));
  add(`${pr.name}-head`, placed(turned([[0, 0], [8, 0], [8, 34], [5, 46], [0, 46]], 12).translate(0, 0, 146)).color(electrode));
  add(`${pr.name}-band`, placed(cylZ(0, 0, 156, 10, 8.4, 12)).color(pr.band));
  // Cable from the head top, back to the comb and down behind the base.
  const top: [number, number, number] = [x, CY + Math.sin((TILT * Math.PI) / 180) * 192, ZT + Math.cos((TILT * Math.PI) / 180) * 192];
  arc(`${pr.name}-cable`, top, [x * 0.3, 105, 322], 50, 3.2, 4, '#1e2124');
  add(`${pr.name}-cable-drop`, rod([x * 0.3, 112, 322], [x * 0.3 + 30, 150, 30], 3.2).color('#1e2124'));
  add(`${pr.name}-label`, blk(x, CY - 36, 176, 48, 1.5, 16).color(pr.label));
  add(`${pr.name}-label-text`, blk(x, CY - 37, 182, 26, 1, 5).color('#f2f2ec'));
});

// Calibration kit on the base: KCl storage bottle and a calibration cup.
add("kcl-bottle", turned([[0, 0], [22, 0], [22, 70], [10, 84], [8, 92], [0, 92]], 14).translate(-150, -60, 22).color('#8a5a2b'));
add("kcl-cap", cylZ(-150, -60, 110, 14, 10, 12).color('#f2f2ec'));
add("kcl-label", blk(-150, -82.5, 40, 30, 1, 28).color('#f2f2ec'));
add("cal-cup", turned([[0, 0], [24, 0], [27, 56], [24, 56], [21, 4], [0, 4]], 16).translate(150, -60, 22).color('#e9eae6'));
add("cal-solution", turned([[0, 4], [20.5, 4], [23.4, 50], [0, 50]], 16).translate(150, -60, 22).color('#e57a6c'));
add("cup-ring", cylZ(150, -60, 22, 6, 30, 16).subtract(cylZ(150, -60, 20, 10, 25, 16)).color(fittings));

return p.model();
